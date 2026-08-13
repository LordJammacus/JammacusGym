import { db } from '../database';
import type { WorkoutTemplate, TemplateExercise, SetTarget } from '@/types/entities';

export async function getAllTemplates(): Promise<WorkoutTemplate[]> {
  return db.workoutTemplates.filter(t => t.archivedAt === null).toArray();
}

export async function getTemplate(id: string): Promise<WorkoutTemplate | undefined> {
  return db.workoutTemplates.get(id);
}

export async function createTemplate(template: WorkoutTemplate): Promise<void> {
  await db.workoutTemplates.put(template);
}

export async function updateTemplate(id: string, updates: Partial<WorkoutTemplate>): Promise<void> {
  await db.workoutTemplates.update(id, { ...updates, updatedAt: new Date().toISOString() });
}

export async function archiveTemplate(id: string): Promise<void> {
  await db.workoutTemplates.update(id, { archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}

export async function getTemplateExercises(workoutTemplateId: string): Promise<TemplateExercise[]> {
  return db.templateExercises
    .where('workoutTemplateId')
    .equals(workoutTemplateId)
    .sortBy('orderIndex');
}

export async function putTemplateExercise(te: TemplateExercise): Promise<void> {
  await db.templateExercises.put(te);
}

export async function getTemplateExercise(id: string): Promise<TemplateExercise | undefined> {
  return db.templateExercises.get(id);
}

export async function deleteTemplateExercise(id: string): Promise<void> {
  await db.transaction('rw', [db.templateExercises, db.setTargets], async () => {
    await db.setTargets.where('templateExerciseId').equals(id).delete();
    await db.templateExercises.delete(id);
  });
}

export async function reorderTemplateExercises(exercises: { id: string; orderIndex: number }[]): Promise<void> {
  await db.transaction('rw', db.templateExercises, async () => {
    for (const ex of exercises) {
      await db.templateExercises.update(ex.id, { orderIndex: ex.orderIndex });
    }
  });
}

export async function getSetTargets(templateExerciseId: string): Promise<SetTarget[]> {
  return db.setTargets
    .where('templateExerciseId')
    .equals(templateExerciseId)
    .sortBy('orderIndex');
}

export async function putSetTargets(targets: SetTarget[]): Promise<void> {
  await db.setTargets.bulkPut(targets);
}

export async function deleteSetTarget(id: string): Promise<void> {
  await db.setTargets.delete(id);
}

export async function replaceSetTargets(templateExerciseId: string, targets: SetTarget[]): Promise<void> {
  await db.transaction('rw', db.setTargets, async () => {
    await db.setTargets.where('templateExerciseId').equals(templateExerciseId).delete();
    await db.setTargets.bulkPut(targets);
  });
}
