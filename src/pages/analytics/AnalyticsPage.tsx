import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '@/components/ui';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { TimePeriod, ExerciseProgressSummary, LatestWorkoutComparison } from '@/types/analytics';
import type { WeightUnit } from '@/types/enums';
import * as analyticsRepo from '@/db/repositories/analytics';
import {
  buildAllExerciseProgressions,
  calculateWeeklyVolume,
  calculateMuscleGroupVolume,
  calculateWeeklyFrequency,
  calculateWorkoutDurations,
  calculateRestAdherence,
  calculateAverageFrequency,
  summarizeAllExercises,
  getLatestWorkoutDeltas,
} from '@/engines/analytics';
import { getSettings } from '@/db/database';
import { formatVolume } from '@/utils/units';
import {
  TIME_PERIODS,
  chartColors,
  chartTooltipStyle,
  getDateRange,
  formatChartDate,
  formatDisplayDate,
} from './helpers';
import { ExerciseProgressRow, SessionDelta, formatMetricDelta, formatSetScheme } from './ProgressWidgets';

type AnalyticsTab = 'progress' | 'volume';

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<TimePeriod>('3m');
  const [tab, setTab] = useState<AnalyticsTab>('progress');
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<WeightUnit>('kg');

  const [summaries, setSummaries] = useState<ExerciseProgressSummary[]>([]);
  const [latestWorkout, setLatestWorkout] = useState<LatestWorkoutComparison | null>(null);
  const [weeklyVolumeData, setWeeklyVolumeData] = useState<{ weekStart: string; workingSets: number; totalVolume: number }[]>([]);
  const [muscleVolumeData, setMuscleVolumeData] = useState<{ muscleName: string; totalWeightedSets: number; directSets: number }[]>([]);
  const [frequencyData, setFrequencyData] = useState<{ weekStart: string; sessions: number }[]>([]);
  const [durationData, setDurationData] = useState<{ date: string; durationMinutes: number }[]>([]);
  const [restAdherence, setRestAdherence] = useState<{ prescribedAvg: number; actualAvg: number; adherencePercent: number; totalSetsWithRest: number } | null>(null);
  const [avgFrequency, setAvgFrequency] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    const dateRange = getDateRange(period);
    const settings = await getSettings();
    setUnits(settings.units);

    const instances = await analyticsRepo.getCompletedInstances(dateRange);
    if (instances.length === 0) {
      setSummaries([]);
      setLatestWorkout(null);
      setWeeklyVolumeData([]);
      setMuscleVolumeData([]);
      setFrequencyData([]);
      setDurationData([]);
      setRestAdherence(null);
      setAvgFrequency(0);
      setLoading(false);
      return;
    }

    const instanceIds = instances.map(i => i.id);
    const exerciseInstances = await analyticsRepo.getAllExerciseInstances(instanceIds);
    const eiIds = exerciseInstances.map(ei => ei.id);
    const sets = await analyticsRepo.getAllCompletedSets(eiIds);
    const exerciseNames = await analyticsRepo.getExerciseNames();

    const progressions = buildAllExerciseProgressions(sets, exerciseInstances, instances);
    setSummaries(summarizeAllExercises(progressions, exerciseNames));
    setLatestWorkout(getLatestWorkoutDeltas(instances, exerciseInstances, progressions, exerciseNames));

    const freq = calculateWeeklyFrequency(instances, dateRange, settings.weekStartDay);
    setFrequencyData(freq);
    setAvgFrequency(calculateAverageFrequency(instances, dateRange));
    setDurationData(calculateWorkoutDurations(instances, dateRange));
    setWeeklyVolumeData(calculateWeeklyVolume(sets, instances, exerciseInstances, dateRange, settings.weekStartDay));

    const exerciseMuscles = await analyticsRepo.getAllExerciseMuscles();
    const muscleNames = await analyticsRepo.getMuscleNames();
    setMuscleVolumeData(calculateMuscleGroupVolume(sets, exerciseInstances, exerciseMuscles, muscleNames));
    setRestAdherence(calculateRestAdherence(sets, exerciseInstances));

    setLoading(false);
  }, [period]);

  useEffect(() => { loadData(); }, [loadData]);

  const improvingCount = summaries.filter(s => s.trend.direction === 'improving').length;
  const avgWeeklyVolume = weeklyVolumeData.length > 0
    ? weeklyVolumeData.reduce((acc, w) => acc + w.totalVolume, 0) / weeklyVolumeData.length
    : 0;

  return (
    <div className="p-4 space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Progress</h1>
        <Button size="sm" variant="secondary" onClick={() => navigate('/analytics/records')}>
          PRs
        </Button>
      </div>

      <div className="flex gap-1 bg-surface-overlay rounded-lg p-1">
        {TIME_PERIODS.map(tp => (
          <button
            key={tp.value}
            onClick={() => setPeriod(tp.value)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors min-h-[44px] ${
              period === tp.value ? 'bg-brand text-white' : 'text-zinc-400'
            }`}
          >
            {tp.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1 bg-surface-overlay rounded-lg p-1">
        {([
          { value: 'progress', label: 'Exercises' },
          { value: 'volume', label: 'Volume' },
        ] as const).map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors min-h-[44px] ${
              tab === t.value ? 'bg-brand text-white' : 'text-zinc-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card><p className="text-zinc-400 text-sm">Loading progress...</p></Card>
      ) : summaries.length === 0 && frequencyData.length === 0 ? (
        <Card>
          <p className="text-zinc-400 text-sm">Complete some workouts to see progression, trends, and graphs here.</p>
        </Card>
      ) : tab === 'progress' ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <p className="text-2xl font-bold text-brand-light">{summaries.length}</p>
              <p className="text-xs text-zinc-400">Exercises</p>
            </Card>
            <Card>
              <p className="text-2xl font-bold text-green-400">{improvingCount}</p>
              <p className="text-xs text-zinc-400">Improving</p>
            </Card>
            <Card>
              <p className="text-2xl font-bold text-amber-400">{avgFrequency}</p>
              <p className="text-xs text-zinc-400">Sessions/week</p>
            </Card>
          </div>

          {latestWorkout && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Last workout</h2>
              <p className="text-xs text-zinc-500">
                {latestWorkout.workoutName} · {formatDisplayDate(latestWorkout.date)} vs previous session (all working sets)
              </p>
              <Card className="space-y-3">
                {latestWorkout.exercises.map(ex => (
                  <button
                    key={ex.exerciseId}
                    onClick={() => navigate(`/analytics/exercise/${ex.exerciseId}`)}
                    className="w-full text-left flex items-center justify-between gap-3 min-h-[44px]"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{ex.exerciseName}</p>
                      <p className="text-xs text-zinc-400 truncate">
                        {formatSetScheme(ex.current, units)}
                      </p>
                    </div>
                    {ex.vsPrevious ? (
                      <span className="text-xs shrink-0">
                        <SessionDelta delta={ex.vsPrevious} units={units} />
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500 shrink-0">First session</span>
                    )}
                  </button>
                ))}
              </Card>
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Exercise trends</h2>
            <p className="text-xs text-zinc-500">Tap an exercise for graphs over time</p>
            {summaries.length === 0 ? (
              <Card>
                <p className="text-zinc-400 text-sm">No exercise data in this period.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {summaries.map(summary => (
                  <Card key={summary.exerciseId}>
                    <ExerciseProgressRow
                      summary={summary}
                      units={units}
                      onClick={() => navigate(`/analytics/exercise/${summary.exerciseId}`)}
                    />
                    {summary.sessionCount > 1 && (
                      <p className="text-[11px] text-zinc-500 mt-2">
                        {summary.sessionCount} sessions · {formatMetricDelta(summary.vsPeriodStart, units)} this period
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <p className="text-2xl font-bold text-brand-light">{avgFrequency}</p>
              <p className="text-xs text-zinc-400">Sessions/week</p>
            </Card>
            <Card>
              <p className="text-2xl font-bold text-green-400">
                {avgWeeklyVolume > 0 ? formatVolume(avgWeeklyVolume, units) : '0'}
              </p>
              <p className="text-xs text-zinc-400">Avg vol/week</p>
            </Card>
            <Card>
              <p className="text-2xl font-bold text-amber-400">
                {restAdherence ? `${restAdherence.adherencePercent}%` : '—'}
              </p>
              <p className="text-xs text-zinc-400">Rest adherence</p>
            </Card>
          </div>

          {frequencyData.length > 0 && (
            <Card>
              <h3 className="text-sm text-zinc-400 mb-3">Sessions per Week</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={frequencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="weekStart" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#a1a1aa' }} />
                  <Bar dataKey="sessions" fill={chartColors.brand} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {weeklyVolumeData.length > 0 && (
            <Card>
              <h3 className="text-sm text-zinc-400 mb-3">Weekly Working Sets</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="weekStart" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#a1a1aa' }} />
                  <Bar dataKey="workingSets" fill={chartColors.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {muscleVolumeData.length > 0 && (
            <Card>
              <h3 className="text-sm text-zinc-400 mb-3">Volume by Muscle Group</h3>
              <ResponsiveContainer width="100%" height={Math.max(180, muscleVolumeData.length * 28)}>
                <BarChart data={muscleVolumeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis dataKey="muscleName" type="category" width={80} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                  <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#a1a1aa' }} />
                  <Bar dataKey="directSets" fill={chartColors.brand} stackId="a" name="Direct" />
                  <Bar dataKey="totalWeightedSets" fill={chartColors.cyan} name="Total (weighted)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {durationData.length > 0 && (
            <Card>
              <h3 className="text-sm text-zinc-400 mb-3">Workout Duration (min)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={durationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                  <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#a1a1aa' }} />
                  <Line type="monotone" dataKey="durationMinutes" stroke={chartColors.amber} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {restAdherence && restAdherence.totalSetsWithRest > 0 && (
            <Card>
              <h3 className="text-sm text-zinc-400 mb-2">Rest Adherence</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold">{restAdherence.prescribedAvg}s</p>
                  <p className="text-xs text-zinc-500">Prescribed avg</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{restAdherence.actualAvg}s</p>
                  <p className="text-xs text-zinc-500">Actual avg</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${
                    restAdherence.adherencePercent >= 80 ? 'text-green-400' :
                    restAdherence.adherencePercent >= 60 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {restAdherence.adherencePercent}%
                  </p>
                  <p className="text-xs text-zinc-500">Adherence</p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
