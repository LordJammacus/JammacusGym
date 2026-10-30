import { db } from './database';
import { MUSCLE_GROUPS } from '@/constants/muscles';
import { EXERCISES } from '@/constants/exercises';
import { STARTER_PROGRAM_ID, buildStarterProgramData } from '@/constants/starterProgram';
import {
  UPPER_SPECIALISATION_PROGRAM_ID,
  UPPER_SPEC_REVISION,
  UPPER_SPEC_REVISION_NOTE_ID,
  buildUpperSpecialisationProgramData,
} from '@/constants/upperSpecialisationProgram';
import type { Exercise, ExerciseMuscle, SetTarget, TemplateExercise } from '@/types/entities';

export async function seedDatabase(): Promise<void> {
  await seedCatalog();
  await ensureMissingCatalogExercises();
  await seedStarterProgram();
  await seedUpperSpecialisationProgram();
  await patchStarterPushShoulderPress();
  await patchStarterPushDipsToKickbacks();
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

/** Insert catalog exercises added after the user's database was first created. */
export async function ensureMissingCatalogExercises(): Promise<void> {
  const now = new Date().toISOString();
  const present = new Set((await db.exercises.toArray()).map(exercise => exercise.id));
  const missing = EXERCISES.filter(seed => !present.has(seed.id));
  if (missing.length === 0) return;

  await db.transaction('rw', [db.exercises, db.exerciseMuscles], async () => {
    for (const seed of missing) {
      await db.exercises.put({
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
      await db.exerciseMuscles.bulkPut(
        seed.muscles.map(muscle => ({
          id: `em-${seed.id}-${muscle.muscleGroupId}`,
          exerciseId: seed.id,
          muscleGroupId: muscle.muscleGroupId,
          role: muscle.role,
          contribution: muscle.contribution,
        })),
      );
    }
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

/** 4-day upper specialisation. Leaves an existing active program alone. */
export async function seedUpperSpecialisationProgram(): Promise<void> {
  const existing = await db.programs.get(UPPER_SPECIALISATION_PROGRAM_ID);
  const data = buildUpperSpecialisationProgramData();

  if (!existing) {
    await writeUpperSpecialisationProgram(data, false);
    return;
  }

  const revision = await db.notes.get(UPPER_SPEC_REVISION_NOTE_ID);
  if (revision?.content === UPPER_SPEC_REVISION) return;

  await writeUpperSpecialisationProgram(data, true);
}

async function writeUpperSpecialisationProgram(
  data: ReturnType<typeof buildUpperSpecialisationProgramData>,
  preserveExistingProgram: boolean,
): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.workoutTemplates,
      db.templateExercises,
      db.setTargets,
      db.programs,
      db.trainingBlocks,
      db.blockWorkouts,
      db.notes,
    ],
    async () => {
      const templateIds = data.templates.map(template => template.id);
      const oldExercises = await db.templateExercises.where('workoutTemplateId').anyOf(templateIds).toArray();
      if (oldExercises.length > 0) {
        await db.setTargets.where('templateExerciseId').anyOf(oldExercises.map(exercise => exercise.id)).delete();
        await db.templateExercises.bulkDelete(oldExercises.map(exercise => exercise.id));
      }

      await db.workoutTemplates.bulkPut(data.templates);
      await db.templateExercises.bulkPut(data.templateExercises);
      await db.setTargets.bulkPut(data.setTargets);
      await db.trainingBlocks.bulkPut(data.blocks);
      await db.blockWorkouts.bulkPut(data.blockWorkouts);
      await db.notes.bulkPut(data.notes);

      if (!preserveExistingProgram) {
        const hasActive = (await db.programs.filter(program => program.isActive === true).count()) > 0;
        await db.programs.put({ ...data.program, isActive: hasActive ? false : data.program.isActive });
        return;
      }

      await db.programs.update(UPPER_SPECIALISATION_PROGRAM_ID, {
        description: data.program.description,
        updatedAt: data.program.updatedAt,
      });
    },
  );
}

const PUSH_SHOULDER_PRESS_PATCH: Array<{
  templateId: string;
  estimatedDurationMinutes: number;
  restSeconds: number;
  notes: string;
  sets: Array<{ repMin: number; repMax: number; rir: number }>;
}> = [
  {
    templateId: 'tmpl-push-hypertrophy',
    estimatedDurationMinutes: 65,
    restSeconds: 120,
    notes: 'Seated or standing. Control the bottom; no bounce. Shoulders are already warm from incline.',
    sets: [
      { repMin: 8, repMax: 12, rir: 2 },
      { repMin: 8, repMax: 12, rir: 2 },
      { repMin: 8, repMax: 12, rir: 2 },
    ],
  },
  {
    templateId: 'tmpl-push-strength',
    estimatedDurationMinutes: 60,
    restSeconds: 150,
    notes: 'Same 3 hard sets as hypertrophy, heavier. Stop one shy of a grind.',
    sets: [
      { repMin: 5, repMax: 8, rir: 1 },
      { repMin: 5, repMax: 8, rir: 1 },
      { repMin: 5, repMax: 8, rir: 1 },
    ],
  },
  {
    templateId: 'tmpl-push-deload',
    estimatedDurationMinutes: 40,
    restSeconds: 90,
    notes: 'Keep the groove; stay well short of failure.',
    sets: [
      { repMin: 8, repMax: 10, rir: 4 },
      { repMin: 8, repMax: 10, rir: 4 },
    ],
  },
];

/** Inserts DB shoulder press into existing starter push templates (idempotent). */
export async function patchStarterPushShoulderPress(): Promise<void> {
  const program = await db.programs.get(STARTER_PROGRAM_ID);
  if (!program) return;

  await db.transaction(
    'rw',
    [db.workoutTemplates, db.templateExercises, db.setTargets],
    async () => {
      for (const spec of PUSH_SHOULDER_PRESS_PATCH) {
        const tes = await db.templateExercises
          .where('workoutTemplateId')
          .equals(spec.templateId)
          .sortBy('orderIndex');
        if (tes.length === 0) continue;
        if (tes.some(te => te.exerciseId === 'ex-db-shoulder-press')) continue;

        const incline = tes.find(te => te.exerciseId === 'ex-db-incline-bench');
        const lat = tes.find(te => te.exerciseId === 'ex-lateral-raise');
        const insertOrder = incline
          ? incline.orderIndex + 1
          : lat
            ? lat.orderIndex
            : tes.length;

        for (const te of tes) {
          if (te.orderIndex >= insertOrder) {
            await db.templateExercises.update(te.id, { orderIndex: te.orderIndex + 1 });
          }
        }

        const teId = `${spec.templateId}-te-ex-db-shoulder-press`;
        const exercise: TemplateExercise = {
          id: teId,
          workoutTemplateId: spec.templateId,
          exerciseId: 'ex-db-shoulder-press',
          orderIndex: insertOrder,
          supersetGroup: null,
          restSeconds: spec.restSeconds,
          notes: spec.notes,
          progressionRuleId: null,
        };
        const targets: SetTarget[] = spec.sets.map((s, i) => ({
          id: `${teId}-s${i}`,
          templateExerciseId: teId,
          orderIndex: i,
          setType: 'working',
          targetWeight: null,
          targetRepMin: s.repMin,
          targetRepMax: s.repMax,
          targetRir: s.rir,
        }));

        await db.templateExercises.put(exercise);
        await db.setTargets.bulkPut(targets);
        await db.workoutTemplates.update(spec.templateId, {
          estimatedDurationMinutes: spec.estimatedDurationMinutes,
          updatedAt: new Date().toISOString(),
        });
      }
    },
  );
}

const PUSH_DIP_TO_KICKBACK_PATCH: Array<{
  templateId: string;
  restSeconds: number;
  notes: string;
  sets: Array<{ repMin: number; repMax: number; rir: number }>;
}> = [
  {
    templateId: 'tmpl-push-hypertrophy',
    restSeconds: 60,
    notes:
      'Elbow pinned to your side. Full lockout, no swing. Light enough that the last reps still look like kickbacks.',
    sets: [
      { repMin: 10, repMax: 15, rir: 1 },
      { repMin: 10, repMax: 15, rir: 1 },
      { repMin: 10, repMax: 15, rir: 1 },
    ],
  },
  {
    templateId: 'tmpl-push-strength',
    restSeconds: 60,
    notes: 'Isolation finisher. Strict elbow position; do not chase heavy DBs.',
    sets: [
      { repMin: 10, repMax: 15, rir: 2 },
      { repMin: 10, repMax: 15, rir: 2 },
      { repMin: 10, repMax: 15, rir: 2 },
    ],
  },
  {
    templateId: 'tmpl-push-deload',
    restSeconds: 45,
    notes: '',
    sets: [
      { repMin: 10, repMax: 15, rir: 4 },
      { repMin: 10, repMax: 15, rir: 4 },
    ],
  },
];

/** Replaces dips with kickbacks on existing starter push templates (idempotent). */
export async function patchStarterPushDipsToKickbacks(): Promise<void> {
  const program = await db.programs.get(STARTER_PROGRAM_ID);
  if (!program) return;

  await ensureCatalogExercise('ex-kickback');

  await db.transaction('rw', [db.templateExercises, db.setTargets, db.workoutTemplates], async () => {
    for (const spec of PUSH_DIP_TO_KICKBACK_PATCH) {
      const tes = await db.templateExercises.where('workoutTemplateId').equals(spec.templateId).toArray();
      const dip = tes.find(te => te.exerciseId === 'ex-dips');
      if (!dip) continue;

      await db.templateExercises.update(dip.id, {
        exerciseId: 'ex-kickback',
        restSeconds: spec.restSeconds,
        notes: spec.notes,
      });

      const targets = await db.setTargets.where('templateExerciseId').equals(dip.id).sortBy('orderIndex');
      const working = targets.filter(t => t.setType === 'working');
      for (let i = 0; i < working.length; i++) {
        const setSpec = spec.sets[Math.min(i, spec.sets.length - 1)]!;
        await db.setTargets.update(working[i]!.id, {
          targetRepMin: setSpec.repMin,
          targetRepMax: setSpec.repMax,
          targetRir: setSpec.rir,
        });
      }

      await db.workoutTemplates.update(spec.templateId, { updatedAt: new Date().toISOString() });
    }
  });
}

async function ensureCatalogExercise(exerciseId: string): Promise<void> {
  const existing = await db.exercises.get(exerciseId);
  if (existing) return;

  const seed = EXERCISES.find(e => e.id === exerciseId);
  if (!seed) return;

  const now = new Date().toISOString();
  await db.exercises.put({
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
  await db.exerciseMuscles.bulkPut(
    seed.muscles.map(muscle => ({
      id: `em-${seed.id}-${muscle.muscleGroupId}`,
      exerciseId: seed.id,
      muscleGroupId: muscle.muscleGroupId,
      role: muscle.role,
      contribution: muscle.contribution,
    })),
  );
}

