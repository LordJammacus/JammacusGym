import { db } from './database';
import { MUSCLE_GROUPS } from '@/constants/muscles';
import { EXERCISES } from '@/constants/exercises';
import { STARTER_PROGRAM_ID, buildStarterProgramData } from '@/constants/starterProgram';
import type { Exercise, ExerciseMuscle } from '@/types/entities';

export async function seedDatabase(): Promise<void> {
  await seedCatalog();
  await seedStarterProgram();
}

async function seedCatalog(): Promise<void> {
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

/** Editable home PPL program for first-time users (and existing DBs that never got it). */
export async function seedStarterProgram(): Promise<void> {
  const existing = await db.programs.get(STARTER_PROGRAM_ID);
  if (existing) return;

  const data = buildStarterProgramData();

  await db.transaction(
    'rw',
    [
      db.workoutTemplates,
      db.templateExercises,
      db.setTargets,
      db.programs,
      db.trainingBlocks,
      db.blockWorkouts,
    ],
    async () => {
      // Don't steal the active slot if the user already has a program.
      const hasActive = (await db.programs.filter(p => p.isActive === true).count()) > 0;
      if (hasActive) {
        data.program.isActive = false;
      }

      await db.workoutTemplates.bulkPut(data.templates);
      await db.templateExercises.bulkPut(data.templateExercises);
      await db.setTargets.bulkPut(data.setTargets);
      await db.programs.put(data.program);
      await db.trainingBlocks.bulkPut(data.blocks);
      await db.blockWorkouts.bulkPut(data.blockWorkouts);
    },
  );
}
