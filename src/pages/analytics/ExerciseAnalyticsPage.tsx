import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui';
import {
  LineChart, Line, BarChart, Bar, Legend,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import type { TimePeriod, ExerciseProgressSummary, SessionComparisonPoint } from '@/types/analytics';
import type { WeightUnit } from '@/types/enums';
import * as analyticsRepo from '@/db/repositories/analytics';
import {
  buildExerciseProgression,
  summarizeExerciseProgress,
  compareSessions,
} from '@/engines/analytics';
import { getSettings } from '@/db/database';
import { formatVolume, formatWeight } from '@/utils/units';
import {
  TIME_PERIODS,
  chartColors,
  chartTooltipStyle,
  getDateRange,
  formatChartDate,
  formatDisplayDate,
  formatDelta,
  deltaClass,
} from './helpers';
import { DeltaText, TrendBadge } from './ProgressWidgets';

export function ExerciseAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<TimePeriod>('3m');
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<WeightUnit>('kg');
  const [name, setName] = useState('Exercise');
  const [summary, setSummary] = useState<ExerciseProgressSummary | null>(null);
  const [sessions, setSessions] = useState<SessionComparisonPoint[]>([]);
  const [chartData, setChartData] = useState<{
    date: string;
    weight: number;
    reps: number;
    estimated1RM: number;
    movingAvg: number;
    volumeLoad: number;
    e1rmDelta: number | null;
  }[]>([]);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const dateRange = getDateRange(period);
    const settings = await getSettings();
    setUnits(settings.units);

    const names = await analyticsRepo.getExerciseNames();
    setName(names.get(id) ?? 'Exercise');

    const instances = await analyticsRepo.getCompletedInstances(dateRange);
    const instanceIds = instances.map(i => i.id);
    const exerciseInstances = await analyticsRepo.getAllExerciseInstances(instanceIds);
    const eiIds = exerciseInstances.map(ei => ei.id);
    const sets = await analyticsRepo.getAllCompletedSets(eiIds);

    const points = buildExerciseProgression(sets, exerciseInstances, instances, id);
    const nextSummary = summarizeExerciseProgress(points, id, names.get(id) ?? 'Exercise');
    const compared = compareSessions(points);
    const trend = nextSummary?.trend;

    setSummary(nextSummary);
    setSessions([...compared].reverse());
    setChartData(points.map((p, i) => ({
      date: p.date,
      weight: p.weight,
      reps: p.reps,
      estimated1RM: p.estimated1RM,
      movingAvg: trend?.movingAverages[i]?.value ?? p.estimated1RM,
      volumeLoad: p.volumeLoad,
      e1rmDelta: compared[i]?.vsPrevious?.estimated1RM ?? null,
    })));

    setLoading(false);
  }, [id, period]);

  useEffect(() => { loadData(); }, [loadData]);

  const deltaBars = chartData.filter(d => d.e1rmDelta !== null);

  return (
    <div className="p-4 space-y-5 pb-24">
      <button onClick={() => navigate('/analytics')} className="text-brand-light text-sm">
        ← Progress
      </button>

      <h1 className="text-2xl font-bold">{name}</h1>

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

      {loading ? (
        <Card><p className="text-zinc-400 text-sm">Loading...</p></Card>
      ) : !summary ? (
        <Card>
          <p className="text-zinc-400 text-sm">No workout data for this exercise in the selected period.</p>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <TrendBadge direction={summary.trend.direction} />
            <span className="text-xs text-zinc-500">{summary.sessionCount} sessions</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-xs text-zinc-400">Latest</p>
              <p className="text-lg font-bold">{formatWeight(summary.latest.weight, units)} × {summary.latest.reps}</p>
              {summary.vsPrevious && (
                <p className="text-xs mt-1">
                  <DeltaText value={summary.vsPrevious.weight} suffix={units} />
                  <span className="text-zinc-600"> vs last</span>
                </p>
              )}
            </Card>
            <Card>
              <p className="text-xs text-zinc-400">Est. 1RM</p>
              <p className="text-lg font-bold">{formatWeight(summary.latest.estimated1RM, units)}</p>
              {summary.sessionCount > 1 && (
                <p className="text-xs mt-1">
                  <DeltaText value={summary.vsPeriodStart.estimated1RM} suffix={units} />
                  <span className="text-zinc-600"> this period</span>
                </p>
              )}
            </Card>
          </div>

          {chartData.length > 1 && (
            <>
              <Card>
                <h3 className="text-sm text-zinc-400 mb-3">Weight</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: '#71717a' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#a1a1aa' }} />
                    <Line type="monotone" dataKey="weight" stroke={chartColors.brand} strokeWidth={2} dot={{ r: 3, fill: chartColors.brand }} name={`Weight (${units})`} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <h3 className="text-sm text-zinc-400 mb-3">Reps (best set)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: '#71717a' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#a1a1aa' }} />
                    <Line type="monotone" dataKey="reps" stroke={chartColors.cyan} strokeWidth={2} dot={{ r: 3, fill: chartColors.cyan }} name="Reps" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <h3 className="text-sm text-zinc-400 mb-3">Estimated 1RM</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: '#71717a' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#a1a1aa' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="estimated1RM" stroke={chartColors.green} strokeWidth={2} dot={{ r: 3, fill: chartColors.green }} name={`e1RM (${units})`} />
                    <Line type="monotone" dataKey="movingAvg" stroke={chartColors.amber} strokeWidth={2} strokeDasharray="4 4" dot={false} name="3-session avg" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <h3 className="text-sm text-zinc-400 mb-3">Session volume</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: '#71717a' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#a1a1aa' }} />
                    <Bar dataKey="volumeLoad" fill={chartColors.brand} radius={[4, 4, 0, 0]} name={`Volume (${units})`} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {deltaBars.length > 0 && (
                <Card>
                  <h3 className="text-sm text-zinc-400 mb-3">e1RM change vs previous session</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={deltaBars}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#a1a1aa' }} />
                      <Bar dataKey="e1rmDelta" radius={[4, 4, 0, 0]} name={`Δ e1RM (${units})`}>
                        {deltaBars.map((d, i) => (
                          <Cell key={i} fill={(d.e1rmDelta ?? 0) >= 0 ? chartColors.green : chartColors.red} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </>
          )}

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Session log</h2>
            {sessions.map(session => (
              <Card key={session.date}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{formatDisplayDate(session.date)}</p>
                  {session.vsPrevious ? (
                    <span className={`text-xs ${deltaClass(session.vsPrevious.estimated1RM)}`}>
                      {formatDelta(session.vsPrevious.estimated1RM, ` ${units} e1RM`)}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">First</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                  <div>
                    <p className="text-sm font-semibold">{formatWeight(session.weight, units)}</p>
                    <p className="text-[10px] text-zinc-500">Weight</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{session.reps}</p>
                    <p className="text-[10px] text-zinc-500">Reps</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{formatVolume(session.volumeLoad, units)}</p>
                    <p className="text-[10px] text-zinc-500">Volume</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
