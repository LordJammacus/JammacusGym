import { db } from './database';
import { MUSCLE_GROUPS } from '@/constants/muscles';
import { EXERCISES } from '@/constants/exercises';
import type { Exercise, ExerciseMuscle } from '@/types/entities';

export async function seedDatabase(): Promise<void> {
  const existingMuscles = await db.muscleGroups.count();
  if (existingMuscles > 0) return;

  const now = new Date().toISOString();

  await db.transaction('rw', [db.muscleGroups, db.exercises, db.exerciseMuscles], async () => {
    await db.muscleGroups.bulkPut(MUSCLE_GROUPS);

    const exercises: Exercise[] = [];
    const exerciseMuscles: ExerciseMuscle[] = [];

    for (const seed of EXERCISES) {
      exercises.push({
        id: seed.id,
        name: seed.name,
        category: seed.category,
        equipment: seed.equipment,
        movementPattern: seed.movementPattern,
        defaultRepRangeMin: seed.defaultRepRangeMin,
        defaultRepRangeMax: seed.defaultRepRangeMax,
        defaultRestSeconds: seed.defaultRestSeconds,
        notes: '',
        isCustom: false,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      for (const muscle of seed.muscles) {
        exerciseMuscles.push({
          id: `em-${seed.id}-${muscle.muscleGroupId}`,
          exerciseId: seed.id,
          muscleGroupId: muscle.muscleGroupId,
          role: muscle.role,
          contribution: muscle.contribution,
        });
      }
    }

    await db.exercises.bulkPut(exercises);
    await db.exerciseMuscles.bulkPut(exerciseMuscles);
  });
}
