import { db } from '../database';
import type { CompletedSet, WorkoutInstance, WorkoutExerciseInstance, ExerciseMuscle } from '@/types/entities';
import type { DateRange } from '@/types/analytics';

/**
 * Completed workouts only. Abandoned sessions are history/UI-only and must never
 * be passed into analytics, progression, or recommendation engines.
 */
export async function getCompletedInstances(dateRange?: DateRange): Promise<WorkoutInstance[]> {
  let query = db.workoutInstances.where('status').equals('completed');
  if (dateRange) {
    const all = await query.toArray();
    return all.filter(i => i.startedAt >= dateRange.start && i.startedAt <= dateRange.end)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  }
  return query.sortBy('startedAt');
}

export async function getAllExerciseInstances(instanceIds: string[]): Promise<WorkoutExerciseInstance[]> {
  if (instanceIds.length === 0) return [];
  return db.workoutExerciseInstances
    .where('workoutInstanceId')
    .anyOf(instanceIds)
    .toArray();
}

export async function getAllCompletedSets(exerciseInstanceIds: string[]): Promise<CompletedSet[]> {
  if (exerciseInstanceIds.length === 0) return [];
  return db.completedSets
    .where('workoutExerciseInstanceId')
    .anyOf(exerciseInstanceIds)
    .toArray();
}

export async function getAllExerciseMuscles(): Promise<ExerciseMuscle[]> {
  return db.exerciseMuscles.toArray();
}

export async function getMuscleNames(): Promise<Map<string, string>> {
  const muscles = await db.muscleGroups.toArray();
  return new Map(muscles.map(m => [m.id, m.name]));
}

export async function getExerciseNames(): Promise<Map<string, string>> {
  const exercises = await db.exercises.toArray();
  return new Map(exercises.map(e => [e.id, e.name]));
}

export async function getActiveExerciseList(): Promise<{ id: string; name: string }[]> {
  const exercises = await db.exercises.filter(e => e.archivedAt === null).toArray();
  return exercises
    .map(e => ({ id: e.id, name: e.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
