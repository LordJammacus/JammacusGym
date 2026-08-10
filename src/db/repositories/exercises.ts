import { db } from '../database';
import type { Exercise, ExerciseMuscle, MuscleGroup } from '@/types/entities';

export async function getAllExercises(): Promise<Exercise[]> {
  return db.exercises.where('archivedAt').equals('').or('archivedAt').equals(null as unknown as string).toArray()
    .then(() => db.exercises.filter(e => e.archivedAt === null).toArray());
}

export async function getActiveExercises(): Promise<Exercise[]> {
  return db.exercises.filter(e => e.archivedAt === null).toArray();
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
  return db.exercises.get(id);
}

export async function createExercise(exercise: Exercise): Promise<void> {
  await db.exercises.put(exercise);
}

export async function updateExercise(id: string, updates: Partial<Exercise>): Promise<void> {
  await db.exercises.update(id, { ...updates, updatedAt: new Date().toISOString() });
}

export async function archiveExercise(id: string): Promise<void> {
  await db.exercises.update(id, { archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}

export async function getMusclesForExercise(exerciseId: string): Promise<ExerciseMuscle[]> {
  return db.exerciseMuscles.where('exerciseId').equals(exerciseId).toArray();
}

export async function setMusclesForExercise(exerciseId: string, muscles: ExerciseMuscle[]): Promise<void> {
  await db.transaction('rw', db.exerciseMuscles, async () => {
    await db.exerciseMuscles.where('exerciseId').equals(exerciseId).delete();
    await db.exerciseMuscles.bulkPut(muscles);
  });
}

export async function getAllMuscleGroups(): Promise<MuscleGroup[]> {
  return db.muscleGroups.orderBy('sortOrder').toArray();
}

export async function searchExercises(query: string): Promise<Exercise[]> {
  const lower = query.toLowerCase();
  return db.exercises.filter(e => e.archivedAt === null && e.name.toLowerCase().includes(lower)).toArray();
}
