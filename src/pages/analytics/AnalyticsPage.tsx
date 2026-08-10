import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '@/components/ui';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { TimePeriod, DateRange } from '@/types/analytics';
import * as analyticsRepo from '@/db/repositories/analytics';
import {
  buildExerciseProgression,
  calculateWeeklyVolume,
  calculateMuscleGroupVolume,
  calculateWeeklyFrequency,
  calculateWorkoutDurations,
  calculateRestAdherence,
  calculateAverageFrequency,
} from '@/engines/analytics';
import { getSettings } from '@/db/database';

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
];

function getDateRange(period: TimePeriod): DateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();

  switch (period) {
    case '1w': start.setDate(start.getDate() - 7); break;
    case '1m': start.setMonth(start.getMonth() - 1); break;
    case '3m': start.setMonth(start.getMonth() - 3); break;
    case '6m': start.setMonth(start.getMonth() - 6); break;
    case '1y': start.setFullYear(start.getFullYear() - 1); break;
    case 'all': start.setFullYear(2000); break;
  }
  start.setHours(0, 0, 0, 0);

  return { start: start.toISOString(), end: end.toISOString() };
}

const chartColors = {
  brand: '#6366f1',
  green: '#22c55e',
  amber: '#f59e0b',
  cyan: '#06b6d4',
  red: '#ef4444',
  zinc: '#71717a',
};

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<TimePeriod>('3m');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [progressionData, setProgressionData] = useState<{ date: string; weight: number; estimated1RM: number }[]>([]);
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

    const instances = await analyticsRepo.getCompletedInstances(dateRange);
    if (instances.length === 0) {
      setProgressionData([]);
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

    // Frequency
    const freq = calculateWeeklyFrequency(instances, dateRange, settings.weekStartDay);
    setFrequencyData(freq);
    setAvgFrequency(calculateAverageFrequency(instances, dateRange));

    // Duration
    setDurationData(calculateWorkoutDurations(instances, dateRange));

    // Weekly volume
    setWeeklyVolumeData(calculateWeeklyVolume(sets, instances, exerciseInstances, dateRange, settings.weekStartDay));

    // Muscle volume
    const exerciseMuscles = await analyticsRepo.getAllExerciseMuscles();
    const muscleNames = await analyticsRepo.getMuscleNames();
    setMuscleVolumeData(calculateMuscleGroupVolume(sets, exerciseInstances, exerciseMuscles, muscleNames));

    // Rest adherence
    setRestAdherence(calculateRestAdherence(sets, exerciseInstances));

    // Exercise progression
    if (selectedExercise) {
      const progression = buildExerciseProgression(sets, exerciseInstances, instances, selectedExercise);
      setProgressionData(progression.map(p => ({
        date: p.date,
        weight: p.weight,
        estimated1RM: p.estimated1RM,
      })));
    } else {
      setProgressionData([]);
    }

    setLoading(false);
  }, [period, selectedExercise]);

  useEffect(() => {
    const loadExercises = async () => {
      setExercises(await analyticsRepo.getActiveExerciseList());
    };
    loadExercises();
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const formatDate = (d: string) => {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length < 3) return d;
    return `${parts[1]}/${parts[2]}`;
  };

  return (
    <div className="p-4 space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <Button size="sm" variant="secondary" onClick={() => navigate('/analytics/records')}>
          PRs
        </Button>
      </div>

      {/* Time period selector */}
      <div className="flex gap-1 bg-surface-overlay rounded-lg p-1">
        {TIME_PERIODS.map(tp => (
          <button
            key={tp.value}
            onClick={() => setPeriod(tp.value)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              period === tp.value
                ? 'bg-brand text-white'
                : 'text-zinc-400'
            }`}
          >
            {tp.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card><p className="text-zinc-400 text-sm">Loading analytics...</p></Card>
      ) : (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <p className="text-2xl font-bold text-brand-light">{avgFrequency}</p>
              <p className="text-xs text-zinc-400">Sessions/week</p>
            </Card>
            <Card>
              <p className="text-2xl font-bold text-green-400">
                {weeklyVolumeData.length > 0
                  ? Math.round(weeklyVolumeData.reduce((acc, w) => acc + w.totalVolume, 0) / weeklyVolumeData.length / 1000 * 10) / 10
                  : 0}t
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

          {/* Workout frequency chart */}
          {frequencyData.length > 0 && (
            <Card>
              <h3 className="text-sm text-zinc-400 mb-3">Sessions per Week</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={frequencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="weekStart" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                    labelStyle={{ color: '#a1a1aa' }}
                  />
                  <Bar dataKey="sessions" fill={chartColors.brand} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Weekly volume chart */}
          {weeklyVolumeData.length > 0 && (
            <Card>
              <h3 className="text-sm text-zinc-400 mb-3">Weekly Working Sets</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="weekStart" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                    labelStyle={{ color: '#a1a1aa' }}
                  />
                  <Bar dataKey="workingSets" fill={chartColors.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Muscle group volume chart */}
          {muscleVolumeData.length > 0 && (
            <Card>
              <h3 className="text-sm text-zinc-400 mb-3">Volume by Muscle Group</h3>
              <ResponsiveContainer width="100%" height={Math.max(180, muscleVolumeData.length * 28)}>
                <BarChart data={muscleVolumeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis dataKey="muscleName" type="category" width={80} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                    labelStyle={{ color: '#a1a1aa' }}
                  />
                  <Bar dataKey="directSets" fill={chartColors.brand} stackId="a" name="Direct" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="totalWeightedSets" fill={chartColors.cyan} name="Total (weighted)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Workout duration chart */}
          {durationData.length > 0 && (
            <Card>
              <h3 className="text-sm text-zinc-400 mb-3">Workout Duration (min)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={durationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                    labelStyle={{ color: '#a1a1aa' }}
                  />
                  <Line type="monotone" dataKey="durationMinutes" stroke={chartColors.amber} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Rest adherence */}
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

          {/* Exercise-specific section */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Exercise Analysis</h2>
            <select
              className="w-full rounded-lg bg-surface-overlay border border-white/10 px-3 py-2.5 text-white text-sm"
              value={selectedExercise ?? ''}
              onChange={e => setSelectedExercise(e.target.value || null)}
            >
              <option value="">Select exercise...</option>
              {exercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>

            {selectedExercise && progressionData.length > 0 && (
              <>
                <Card>
                  <h3 className="text-sm text-zinc-400 mb-3">Weight Progression</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={progressionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                        labelStyle={{ color: '#a1a1aa' }}
                      />
                      <Line type="monotone" dataKey="weight" stroke={chartColors.brand} strokeWidth={2} dot={{ r: 3, fill: chartColors.brand }} name="Weight (kg)" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                <Card>
                  <h3 className="text-sm text-zinc-400 mb-3">Estimated 1RM</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={progressionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                        labelStyle={{ color: '#a1a1aa' }}
                      />
                      <Line type="monotone" dataKey="estimated1RM" stroke={chartColors.green} strokeWidth={2} dot={{ r: 3, fill: chartColors.green }} name="Est. 1RM (kg)" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </>
            )}

            {selectedExercise && progressionData.length === 0 && (
              <Card>
                <p className="text-zinc-400 text-sm">No workout data found for this exercise in the selected period.</p>
              </Card>
            )}
          </div>

          {/* Empty state */}
          {frequencyData.length === 0 && weeklyVolumeData.length === 0 && (
            <Card>
              <p className="text-zinc-400 text-sm">Complete some workouts to see analytics here.</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
