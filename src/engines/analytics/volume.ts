import type { CompletedSet, ExerciseMuscle, WorkoutInstance, WorkoutExerciseInstance } from '@/types/entities';
import type { MuscleVolumeEntry, WeeklyVolumePoint, RollingVolumeResult, DateRange } from '@/types/analytics';
import { completedWorkoutsOnly } from './completedOnly';

export function calculateMuscleGroupVolume(
  sets: CompletedSet[],
  exerciseInstances: WorkoutExerciseInstance[],
  exerciseMuscles: ExerciseMuscle[],
  muscleNames: Map<string, string>,
): MuscleVolumeEntry[] {
  const volumeMap = new Map<string, { direct: number; indirect: number }>();

  const eiMap = new Map<string, string>();
  for (const ei of exerciseInstances) {
    eiMap.set(ei.id, ei.exerciseId);
  }

  for (const set of sets) {
    if (set.setType === 'warmup') continue;

    const exerciseId = eiMap.get(set.workoutExerciseInstanceId);
    if (!exerciseId) continue;

    const muscles = exerciseMuscles.filter(em => em.exerciseId === exerciseId);
    for (const muscle of muscles) {
      const existing = volumeMap.get(muscle.muscleGroupId) ?? { direct: 0, indirect: 0 };
      if (muscle.role === 'primary') {
        existing.direct += muscle.contribution;
      } else {
        existing.indirect += muscle.contribution;
      }
      volumeMap.set(muscle.muscleGroupId, existing);
    }
  }

  return Array.from(volumeMap.entries()).map(([muscleGroupId, vol]) => ({
    muscleGroupId,
    muscleName: muscleNames.get(muscleGroupId) ?? 'Unknown',
    directSets: Math.round(vol.direct * 10) / 10,
    indirectSets: Math.round(vol.indirect * 10) / 10,
    totalWeightedSets: Math.round((vol.direct + vol.indirect) * 10) / 10,
  })).sort((a, b) => b.totalWeightedSets - a.totalWeightedSets);
}

export function calculateWeeklyVolume(
  sets: CompletedSet[],
  instances: WorkoutInstance[],
  exerciseInstances: WorkoutExerciseInstance[],
  dateRange: DateRange,
  weekStartDay: number = 1,
): WeeklyVolumePoint[] {
  const eiToInstance = new Map<string, string>();
  for (const ei of exerciseInstances) {
    eiToInstance.set(ei.id, ei.workoutInstanceId);
  }

  const instanceDates = new Map<string, string>();
  for (const inst of completedWorkoutsOnly(instances)) {
    instanceDates.set(inst.id, inst.startedAt);
  }

  const weekBuckets = new Map<string, { totalSets: number; workingSets: number; totalVolume: number }>();

  for (const set of sets) {
    const instanceId = eiToInstance.get(set.workoutExerciseInstanceId);
    if (!instanceId) continue;
    const dateStr = instanceDates.get(instanceId);
    if (!dateStr) continue;

    const date = new Date(dateStr);
    if (date.toISOString() < dateRange.start || date.toISOString() > dateRange.end) continue;

    const weekStart = getWeekStart(date, weekStartDay);
    const key = weekStart.toISOString().split('T')[0]!;

    const bucket = weekBuckets.get(key) ?? { totalSets: 0, workingSets: 0, totalVolume: 0 };
    bucket.totalSets++;
    if (set.setType !== 'warmup') {
      bucket.workingSets++;
      bucket.totalVolume += set.actualWeight * set.actualReps;
    }
    weekBuckets.set(key, bucket);
  }

  return Array.from(weekBuckets.entries())
    .map(([weekStart, data]) => ({ weekStart, ...data }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export function calculateRollingVolume(
  sets: CompletedSet[],
  exerciseInstances: WorkoutExerciseInstance[],
  instances: WorkoutInstance[],
  window: 7 | 14 | 28,
): RollingVolumeResult {
  const now = new Date();
  const cutoff = new Date(now.getTime() - window * 24 * 60 * 60 * 1000).toISOString();

  const eiToInstance = new Map<string, string>();
  for (const ei of exerciseInstances) {
    eiToInstance.set(ei.id, ei.workoutInstanceId);
  }

  const instanceDates = new Map<string, string>();
  for (const inst of completedWorkoutsOnly(instances)) {
    instanceDates.set(inst.id, inst.startedAt);
  }

  let totalSets = 0;
  let totalVolume = 0;

  for (const set of sets) {
    if (set.setType === 'warmup') continue;
    const instanceId = eiToInstance.get(set.workoutExerciseInstanceId);
    if (!instanceId) continue;
    const dateStr = instanceDates.get(instanceId);
    if (!dateStr || dateStr < cutoff) continue;

    totalSets++;
    totalVolume += set.actualWeight * set.actualReps;
  }

  return {
    window,
    totalSets,
    totalVolume: Math.round(totalVolume),
    avgSetsPerDay: Math.round((totalSets / window) * 10) / 10,
  };
}

export function calculateTotalVolume(sets: CompletedSet[]): number {
  return sets
    .filter(s => s.setType !== 'warmup')
    .reduce((acc, s) => acc + s.actualWeight * s.actualReps, 0);
}

function getWeekStart(date: Date, weekStartDay: number): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - weekStartDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
