import type { WorkoutInstance } from '@/types/entities';

/** Abandoned, paused, and in-progress workouts are history-only — never feed analytics/engines. */
export function completedWorkoutsOnly<T extends Pick<WorkoutInstance, 'status'>>(
  workouts: T[],
): T[] {
  return workouts.filter(w => w.status === 'completed');
}

export function completedWorkoutIdSet(
  workouts: Pick<WorkoutInstance, 'id' | 'status'>[],
): Set<string> {
  return new Set(completedWorkoutsOnly(workouts).map(w => w.id));
}
