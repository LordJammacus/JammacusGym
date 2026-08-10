import { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '@/components/ui';
import { RecommendationCard } from '@/components/recommendations/RecommendationCard';
import { useRecommendations } from '@/hooks/useRecommendations';
import type { DateRange } from '@/types/analytics';
import type { MuscleRecoveryEstimate, WorkoutSequenceInsight, BlockSummary, NextBlockSuggestion, FatigueSnapshot } from '@/engines/analytics';
import {
  estimateMuscleRecovery,
  detectWorkoutSequenceInsights,
  generateBlockSummary,
  suggestNextBlock,
  buildFatigueTimeline,
} from '@/engines/analytics';
import * as analyticsRepo from '@/db/repositories/analytics';
import { getRecoveryLogs } from '@/db/repositories/body';
import { getActiveProgram, getBlocksForProgram } from '@/db/repositories/programs';
import {
  LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

type Section = 'recommendations' | 'recovery' | 'blocks' | 'insights';

export function TrainingManagerPage() {
  const { recommendations, loading: recsLoading, refresh, respond } = useRecommendations();
  const [section, setSection] = useState<Section>('recommendations');
  const [muscleRecovery, setMuscleRecovery] = useState<MuscleRecoveryEstimate[]>([]);
  const [sequenceInsights, setSequenceInsights] = useState<WorkoutSequenceInsight[]>([]);
  const [blockSummary, setBlockSummary] = useState<BlockSummary | null>(null);
  const [blockSuggestions, setBlockSuggestions] = useState<NextBlockSuggestion[]>([]);
  const [fatigueData, setFatigueData] = useState<FatigueSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const now = Date.now();
    const range: DateRange = {
      start: new Date(now - 56 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    };

    const [instances, exerciseMuscles, muscleNames, exerciseNames, program, logs] = await Promise.all([
      analyticsRepo.getCompletedInstances(range),
      analyticsRepo.getAllExerciseMuscles(),
      analyticsRepo.getMuscleNames(),
      analyticsRepo.getExerciseNames(),
      getActiveProgram(),
      getRecoveryLogs({
        start: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      }),
    ]);

    const instanceIds = instances.map(i => i.id);
    const eis = await analyticsRepo.getAllExerciseInstances(instanceIds);
    const eiIds = eis.map(ei => ei.id);
    const sets = await analyticsRepo.getAllCompletedSets(eiIds);

    // Muscle recovery estimation
    setMuscleRecovery(estimateMuscleRecovery(instances, eis, sets, exerciseMuscles, muscleNames, now));

    // Workout sequence insights
    setSequenceInsights(detectWorkoutSequenceInsights(instances, eis, sets));

    // Fatigue timeline
    setFatigueData(buildFatigueTimeline(logs));

    // Block summary
    if (program) {
      const blocks = await getBlocksForProgram(program.id);
      const currentBlock = blocks[0];
      if (currentBlock) {
        const summary = generateBlockSummary(
          currentBlock, instances, eis, sets, exerciseMuscles, exerciseNames, muscleNames,
        );
        setBlockSummary(summary);
        setBlockSuggestions(suggestNextBlock(summary));
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const sections: { key: Section; label: string }[] = [
    { key: 'recommendations', label: 'Recs' },
    { key: 'recovery', label: 'Recovery' },
    { key: 'blocks', label: 'Block' },
    { key: 'insights', label: 'Insights' },
  ];

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Training Manager</h1>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={recsLoading}>
          {recsLoading ? 'Analysing...' : 'Refresh'}
        </Button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-surface-overlay rounded-lg p-1">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              section === s.key ? 'bg-brand text-white' : 'text-zinc-400'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'recommendations' && (
        <RecommendationsSection
          recommendations={recommendations}
          loading={recsLoading}
          respond={respond}
        />
      )}

      {section === 'recovery' && (
        <RecoverySection
          muscleRecovery={muscleRecovery}
          fatigueData={fatigueData}
          loading={loading}
        />
      )}

      {section === 'blocks' && (
        <BlockSection
          summary={blockSummary}
          suggestions={blockSuggestions}
          loading={loading}
        />
      )}

      {section === 'insights' && (
        <InsightsSection
          insights={sequenceInsights}
          loading={loading}
        />
      )}
    </div>
  );
}

// --- Recommendations Section ---

function RecommendationsSection({
  recommendations,
  loading,
  respond,
}: {
  recommendations: ReturnType<typeof useRecommendations>['recommendations'];
  loading: boolean;
  respond: ReturnType<typeof useRecommendations>['respond'];
}) {
  if (loading && recommendations.length === 0) {
    return <Card><p className="text-zinc-400 text-sm">Analysing your training data...</p></Card>;
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <p className="text-zinc-400 text-sm">
          No recommendations right now. Keep training and check back later.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">
        {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}
      </p>
      {recommendations.map(rec => (
        <RecommendationCard key={rec.id} recommendation={rec} onRespond={respond} />
      ))}
    </div>
  );
}

// --- Recovery / Muscle Recovery Section ---

function RecoverySection({
  muscleRecovery,
  fatigueData,
  loading,
}: {
  muscleRecovery: MuscleRecoveryEstimate[];
  fatigueData: FatigueSnapshot[];
  loading: boolean;
}) {
  const formatDate = (d: string) => {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length < 3) return d;
    return `${parts[1]}/${parts[2]}`;
  };

  if (loading) {
    return <Card><p className="text-zinc-400 text-sm">Loading recovery data...</p></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Fatigue trend mini chart */}
      {fatigueData.length > 1 && (
        <Card>
          <h3 className="text-sm text-zinc-400 mb-3">Fatigue Trend</h3>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={fatigueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: '#71717a' }} />
              <YAxis domain={[1, 5]} tick={{ fontSize: 10, fill: '#71717a' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Line type="monotone" dataKey="compositeScore" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Muscle recovery status */}
      {muscleRecovery.length > 0 ? (
        <Card className="space-y-3">
          <h3 className="text-sm text-zinc-400">Muscle Group Recovery</h3>
          <div className="space-y-2">
            {muscleRecovery.map(m => (
              <div key={m.muscleGroupId} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white truncate">{m.muscleName}</span>
                    <span className="text-xs text-zinc-500 ml-2 whitespace-nowrap">
                      {m.daysSinceTrained}d ago · {m.lastVolume} sets
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-overlay overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        m.recoveryPercent >= 100 ? 'bg-green-500'
                        : m.recoveryPercent >= 70 ? 'bg-amber-500'
                        : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, m.recoveryPercent)}%` }}
                    />
                  </div>
                </div>
                <span className={`text-sm font-medium min-w-[40px] text-right ${
                  m.recoveryPercent >= 100 ? 'text-green-400'
                  : m.recoveryPercent >= 70 ? 'text-amber-400'
                  : 'text-red-400'
                }`}>
                  {m.recoveryPercent}%
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            Estimated based on days since trained and volume applied. Higher volume = longer recovery estimate.
          </p>
        </Card>
      ) : (
        <Card>
          <p className="text-zinc-400 text-sm">Complete some workouts to see muscle recovery estimates.</p>
        </Card>
      )}
    </div>
  );
}

// --- Block Summary Section ---

function BlockSection({
  summary,
  suggestions,
  loading,
}: {
  summary: BlockSummary | null;
  suggestions: NextBlockSuggestion[];
  loading: boolean;
}) {
  if (loading) {
    return <Card><p className="text-zinc-400 text-sm">Loading block data...</p></Card>;
  }

  if (!summary) {
    return (
      <Card>
        <p className="text-zinc-400 text-sm">
          Set up a program with training blocks to see block analysis here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Block overview stats */}
      <Card className="space-y-3">
        <h3 className="text-sm text-zinc-400">Current Block: {summary.block.name}</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-white">{summary.totalWorkouts}</p>
            <p className="text-xs text-zinc-500">Workouts</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{summary.totalSets}</p>
            <p className="text-xs text-zinc-500">Working sets</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">
              {Math.round(summary.totalVolume / 1000 * 10) / 10}t
            </p>
            <p className="text-xs text-zinc-500">Total volume</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-white">{summary.durationWeeks}w</p>
            <p className="text-xs text-zinc-500">Duration</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{summary.avgWorkoutsPerWeek}</p>
            <p className="text-xs text-zinc-500">Sessions/week</p>
          </div>
        </div>
      </Card>

      {/* Exercise performance summary */}
      {summary.exerciseSummaries.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm text-zinc-400">Exercise Performance</h3>
          {summary.improved.length > 0 && (
            <div>
              <p className="text-xs text-green-400 uppercase tracking-wide mb-1">
                Improved ({summary.improved.length})
              </p>
              {summary.improved.slice(0, 5).map(e => (
                <div key={e.exerciseId} className="flex justify-between py-1">
                  <span className="text-sm text-white truncate">{e.exerciseName}</span>
                  <span className="text-sm text-green-400 ml-2">+{e.changePercent}%</span>
                </div>
              ))}
            </div>
          )}
          {summary.stagnated.length > 0 && (
            <div>
              <p className="text-xs text-amber-400 uppercase tracking-wide mb-1">
                Stagnated ({summary.stagnated.length})
              </p>
              {summary.stagnated.slice(0, 3).map(e => (
                <div key={e.exerciseId} className="flex justify-between py-1">
                  <span className="text-sm text-white truncate">{e.exerciseName}</span>
                  <span className="text-sm text-amber-400 ml-2">{e.changePercent > 0 ? '+' : ''}{e.changePercent}%</span>
                </div>
              ))}
            </div>
          )}
          {summary.declined.length > 0 && (
            <div>
              <p className="text-xs text-red-400 uppercase tracking-wide mb-1">
                Declined ({summary.declined.length})
              </p>
              {summary.declined.slice(0, 3).map(e => (
                <div key={e.exerciseId} className="flex justify-between py-1">
                  <span className="text-sm text-white truncate">{e.exerciseName}</span>
                  <span className="text-sm text-red-400 ml-2">{e.changePercent}%</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Volume distribution */}
      {summary.topMuscleGroups.length > 0 && (
        <Card className="space-y-2">
          <h3 className="text-sm text-zinc-400">Volume Distribution</h3>
          <div className="space-y-1.5">
            {summary.topMuscleGroups.map(m => (
              <div key={m.name} className="flex items-center justify-between">
                <span className="text-sm text-white">{m.name}</span>
                <span className="text-sm text-zinc-400">{m.sets} sets</span>
              </div>
            ))}
          </div>
          {summary.weakMuscleGroups.length > 0 && (
            <>
              <div className="border-t border-white/5 pt-2 mt-2">
                <p className="text-xs text-zinc-500 mb-1">Lowest volume</p>
                {summary.weakMuscleGroups.map(m => (
                  <div key={m.name} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">{m.name}</span>
                    <span className="text-sm text-zinc-500">{m.sets} sets</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Next block suggestions */}
      {suggestions.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm text-zinc-400">Next Block Suggestions</h3>
          {suggestions.map((s, i) => (
            <div key={i} className="border-l-2 border-brand pl-3 space-y-1">
              <p className="text-sm font-medium text-white">{s.title}</p>
              <p className="text-xs text-zinc-400">{s.reasoning}</p>
              <p className="text-xs text-brand-light">{s.suggestedAction}</p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// --- Workout Sequence Insights Section ---

function InsightsSection({
  insights,
  loading,
}: {
  insights: WorkoutSequenceInsight[];
  loading: boolean;
}) {
  if (loading) {
    return <Card><p className="text-zinc-400 text-sm">Loading insights...</p></Card>;
  }

  if (insights.length === 0) {
    return (
      <Card>
        <p className="text-zinc-400 text-sm">
          Complete more workouts to discover performance patterns between sessions.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">Workout Sequence Patterns</p>
      {insights.map((insight, i) => (
        <Card key={i} className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${
              insight.avgPerformanceChange < 0 ? 'text-red-400' : 'text-green-400'
            }`}>
              {insight.avgPerformanceChange > 0 ? '+' : ''}{insight.avgPerformanceChange}%
            </span>
            <span className="text-xs text-zinc-500">
              {insight.precedingWorkoutName} → {insight.followingWorkoutName}
            </span>
          </div>
          <p className="text-sm text-zinc-300">{insight.summary}</p>
          <p className="text-xs text-zinc-500">{insight.occurrences} occurrences</p>
        </Card>
      ))}
      <p className="text-xs text-zinc-500">
        Patterns based on volume load comparison. Data-informed observations, not prescriptions.
      </p>
    </div>
  );
}
