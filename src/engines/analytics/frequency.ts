import type { WorkoutInstance } from '@/types/entities';
import type { FrequencyPoint, WorkoutDurationPoint, DateRange } from '@/types/analytics';

export function calculateWeeklyFrequency(
  instances: WorkoutInstance[],
  dateRange: DateRange,
  weekStartDay: number = 1,
): FrequencyPoint[] {
  const weekBuckets = new Map<string, number>();

  for (const inst of instances) {
    if (inst.status !== 'completed') continue;
    if (inst.startedAt < dateRange.start || inst.startedAt > dateRange.end) continue;

    const date = new Date(inst.startedAt);
    const weekStart = getWeekStart(date, weekStartDay);
    const key = weekStart.toISOString().split('T')[0]!;
    weekBuckets.set(key, (weekBuckets.get(key) ?? 0) + 1);
  }

  return Array.from(weekBuckets.entries())
    .map(([weekStart, sessions]) => ({ weekStart, sessions }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export function calculateWorkoutDurations(
  instances: WorkoutInstance[],
  dateRange: DateRange,
): WorkoutDurationPoint[] {
  return instances
    .filter(inst =>
      inst.status === 'completed' &&
      inst.durationSeconds != null &&
      inst.startedAt >= dateRange.start &&
      inst.startedAt <= dateRange.end,
    )
    .map(inst => ({
      date: inst.startedAt.split('T')[0]!,
      durationMinutes: Math.round(inst.durationSeconds! / 60),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateAverageFrequency(
  instances: WorkoutInstance[],
  dateRange: DateRange,
): number {
  const completed = instances.filter(inst =>
    inst.status === 'completed' &&
    inst.startedAt >= dateRange.start &&
    inst.startedAt <= dateRange.end,
  );

  if (completed.length === 0) return 0;

  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  const weeks = Math.max(1, (end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.round((completed.length / weeks) * 10) / 10;
}

function getWeekStart(date: Date, weekStartDay: number): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - weekStartDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
