import type {
  WorkoutTemplate,
  TemplateExercise,
  SetTarget,
  Program,
  TrainingBlock,
  BlockWorkout,
} from '@/types/entities';
import type { SetType, WorkoutGoal, BlockGoal } from '@/types/enums';

/**
 * Home PPL starter (dumbbells + pull-up bar + dip bar).
 *
 * Cycle: 6wk hypertrophy → 4wk strength → 1wk deload → repeat.
 * Run PPL twice per week (6 sessions). Legs stay lean on purpose —
 * high leg volume was wiping out recovery for push/pull.
 *
 * When a block ends: reorder that block to the top on the program page
 * (Today always uses the first block's rotation).
 */

const PROGRAM_ID = 'prog-starter-home-ppl';

type SetSpec = {
  type: SetType;
  repMin: number;
  repMax: number;
  rir?: number | null;
};

type ExerciseSpec = {
  exerciseId: string;
  restSeconds: number;
  notes?: string;
  sets: SetSpec[];
};

type TemplateSpec = {
  id: string;
  name: string;
  goal: WorkoutGoal;
  estimatedDurationMinutes: number;
  notes: string;
  exercises: ExerciseSpec[];
};

function wu(repMin: number, repMax: number): SetSpec {
  return { type: 'warmup', repMin, repMax, rir: null };
}

function work(repMin: number, repMax: number, rir = 2): SetSpec {
  return { type: 'working', repMin, repMax, rir };
}

function nWork(count: number, repMin: number, repMax: number, rir = 2): SetSpec[] {
  return Array.from({ length: count }, () => work(repMin, repMax, rir));
}

const TEMPLATES: TemplateSpec[] = [
  // ── Hypertrophy ──────────────────────────────────────────────
  {
    id: 'tmpl-push-hypertrophy',
    name: 'Push (Hypertrophy)',
    goal: 'hypertrophy',
    estimatedDurationMinutes: 55,
    notes: 'Leave 1–2 reps in reserve on working sets. Longer last-set stretch on laterals/dips is fine.',
    exercises: [
      {
        exerciseId: 'ex-db-bench',
        restSeconds: 120,
        notes: '3 light warm-ups, then hard working sets in the 8–12 range.',
        sets: [wu(8, 10), wu(5, 6), wu(3, 4), ...nWork(3, 8, 12)],
      },
      {
        exerciseId: 'ex-db-incline-bench',
        restSeconds: 120,
        sets: nWork(3, 8, 12),
      },
      {
        exerciseId: 'ex-lateral-raise',
        restSeconds: 60,
        notes: 'Controlled tempo; slight lean is fine. Stop at form breakdown.',
        sets: nWork(3, 12, 20, 1),
      },
      {
        exerciseId: 'ex-dips',
        restSeconds: 90,
        notes: 'Slight forward lean for chest+tris. Add weight only if 12 reps are easy.',
        sets: nWork(3, 8, 12),
      },
    ],
  },
  {
    id: 'tmpl-pull-hypertrophy',
    name: 'Pull (Hypertrophy)',
    goal: 'hypertrophy',
    estimatedDurationMinutes: 55,
    notes: 'Full ROM pull-ups. Rows: pause briefly at the top.',
    exercises: [
      {
        exerciseId: 'ex-pullup',
        restSeconds: 150,
        notes: 'Warm-up 1 slow, warm-up 2 snappier, then working sets.',
        sets: [wu(3, 3), wu(3, 5), ...nWork(4, 6, 12)],
      },
      {
        exerciseId: 'ex-db-row',
        restSeconds: 90,
        notes: 'Chest braced on bench if preferred. Per-arm sets.',
        sets: nWork(4, 8, 12),
      },
      {
        exerciseId: 'ex-reverse-fly',
        restSeconds: 60,
        notes: 'Chest-supported on an incline bench. Soft elbows, rear-delt focus.',
        sets: nWork(3, 12, 20, 1),
      },
      {
        exerciseId: 'ex-db-curl',
        restSeconds: 75,
        sets: nWork(3, 8, 12),
      },
      {
        exerciseId: 'ex-hammer-curl',
        restSeconds: 60,
        sets: nWork(2, 12, 20, 1),
      },
    ],
  },
  {
    id: 'tmpl-legs-hypertrophy',
    name: 'Legs (Hypertrophy)',
    goal: 'hypertrophy',
    estimatedDurationMinutes: 35,
    notes: 'Kept short on purpose so legs do not trash the next push/pull. Quality over junk volume.',
    exercises: [
      {
        exerciseId: 'ex-goblet-squat',
        restSeconds: 120,
        notes: 'Deep, controlled. Heels planted. This is the main quad stimulus.',
        sets: [wu(8, 10), ...nWork(3, 8, 12)],
      },
      {
        exerciseId: 'ex-db-rdl',
        restSeconds: 120,
        notes: 'Soft knees, push hips back, feel hamstrings. Do not chase ego weight.',
        sets: nWork(3, 8, 12),
      },
    ],
  },

  // ── Strength ─────────────────────────────────────────────────
  {
    id: 'tmpl-push-strength',
    name: 'Push (Strength)',
    goal: 'strength',
    estimatedDurationMinutes: 50,
    notes: 'Heavier loads, longer rests. Hit the low end of the rep range with solid form.',
    exercises: [
      {
        exerciseId: 'ex-db-bench',
        restSeconds: 180,
        notes: 'Warm up thoroughly. Working sets aim for 4–6 hard reps.',
        sets: [wu(8, 10), wu(5, 5), wu(3, 3), ...nWork(4, 4, 6, 1)],
      },
      {
        exerciseId: 'ex-db-incline-bench',
        restSeconds: 150,
        sets: nWork(3, 5, 8, 1),
      },
      {
        exerciseId: 'ex-lateral-raise',
        restSeconds: 60,
        notes: 'Keep some shoulder volume without frying recovery.',
        sets: nWork(3, 10, 15, 2),
      },
      {
        exerciseId: 'ex-dips',
        restSeconds: 150,
        notes: 'More upright for triceps/lockout strength. Add a backpack/weight if bodyweight is easy.',
        sets: nWork(3, 5, 8, 1),
      },
    ],
  },
  {
    id: 'tmpl-pull-strength',
    name: 'Pull (Strength)',
    goal: 'strength',
    estimatedDurationMinutes: 50,
    notes: 'Pull-ups and rows are the priority. Arms stay maintenance volume.',
    exercises: [
      {
        exerciseId: 'ex-pullup',
        restSeconds: 180,
        notes: 'Add weight or slower eccentrics once bodyweight 6+ is easy.',
        sets: [wu(3, 3), wu(2, 3), ...nWork(4, 4, 6, 1)],
      },
      {
        exerciseId: 'ex-db-row',
        restSeconds: 150,
        sets: nWork(4, 5, 8, 1),
      },
      {
        exerciseId: 'ex-reverse-fly',
        restSeconds: 60,
        notes: 'Chest-supported. Maintenance only in the strength block.',
        sets: nWork(2, 12, 15, 2),
      },
      {
        exerciseId: 'ex-db-curl',
        restSeconds: 90,
        sets: nWork(2, 6, 10, 2),
      },
    ],
  },
  {
    id: 'tmpl-legs-strength',
    name: 'Legs (Strength)',
    goal: 'strength',
    estimatedDurationMinutes: 30,
    notes: 'Two hard compounds. Stop before form collapses — legs recover slower when push/pull are also demanding.',
    exercises: [
      {
        exerciseId: 'ex-goblet-squat',
        restSeconds: 180,
        notes: 'Heaviest dumbbell you can control for 5–8 deep reps.',
        sets: [wu(6, 8), ...nWork(3, 5, 8, 1)],
      },
      {
        exerciseId: 'ex-db-rdl',
        restSeconds: 150,
        sets: nWork(3, 5, 8, 1),
      },
    ],
  },

  // ── Deload ───────────────────────────────────────────────────
  {
    id: 'tmpl-push-deload',
    name: 'Push (Deload)',
    goal: 'recovery',
    estimatedDurationMinutes: 35,
    notes: 'About half the usual hard sets. Stop well short of failure (~3–4 RIR).',
    exercises: [
      {
        exerciseId: 'ex-db-bench',
        restSeconds: 90,
        sets: [wu(6, 8), ...nWork(2, 8, 10, 4)],
      },
      {
        exerciseId: 'ex-db-incline-bench',
        restSeconds: 90,
        sets: nWork(2, 8, 10, 4),
      },
      {
        exerciseId: 'ex-lateral-raise',
        restSeconds: 45,
        sets: nWork(2, 12, 15, 4),
      },
      {
        exerciseId: 'ex-dips',
        restSeconds: 75,
        sets: nWork(2, 6, 10, 4),
      },
    ],
  },
  {
    id: 'tmpl-pull-deload',
    name: 'Pull (Deload)',
    goal: 'recovery',
    estimatedDurationMinutes: 35,
    notes: 'Easy pull week. Smooth reps only — no grinding.',
    exercises: [
      {
        exerciseId: 'ex-pullup',
        restSeconds: 120,
        sets: [wu(2, 3), ...nWork(2, 5, 8, 4)],
      },
      {
        exerciseId: 'ex-db-row',
        restSeconds: 75,
        sets: nWork(2, 8, 10, 4),
      },
      {
        exerciseId: 'ex-reverse-fly',
        restSeconds: 45,
        sets: nWork(2, 12, 15, 4),
      },
      {
        exerciseId: 'ex-db-curl',
        restSeconds: 60,
        sets: nWork(2, 8, 12, 4),
      },
    ],
  },
  {
    id: 'tmpl-legs-deload',
    name: 'Legs (Deload)',
    goal: 'recovery',
    estimatedDurationMinutes: 20,
    notes: 'Light technique work. Should feel fresher afterward, not cooked.',
    exercises: [
      {
        exerciseId: 'ex-goblet-squat',
        restSeconds: 90,
        sets: nWork(2, 8, 10, 4),
      },
      {
        exerciseId: 'ex-db-rdl',
        restSeconds: 90,
        sets: nWork(2, 8, 10, 4),
      },
    ],
  },
];

type BlockSpec = {
  id: string;
  name: string;
  orderIndex: number;
  weekCount: number;
  goal: BlockGoal;
  notes: string;
  templateIds: string[];
};

const BLOCKS: BlockSpec[] = [
  {
    id: 'block-starter-hypertrophy',
    name: 'Hypertrophy',
    orderIndex: 0,
    weekCount: 6,
    goal: 'hypertrophy',
    notes:
      'Build muscle and work capacity. Run Push → Pull → Legs twice weekly. After 6 weeks, move Strength to the top of the block list.',
    templateIds: [
      'tmpl-push-hypertrophy',
      'tmpl-pull-hypertrophy',
      'tmpl-legs-hypertrophy',
    ],
  },
  {
    id: 'block-starter-strength',
    name: 'Strength',
    orderIndex: 1,
    weekCount: 4,
    goal: 'strength',
    notes:
      'Convert hypertrophy into heavier top-end strength on the same movement patterns. After 4 weeks, move Deload to the top.',
    templateIds: [
      'tmpl-push-strength',
      'tmpl-pull-strength',
      'tmpl-legs-strength',
    ],
  },
  {
    id: 'block-starter-deload',
    name: 'Deload',
    orderIndex: 2,
    weekCount: 1,
    goal: 'deload',
    notes:
      'One easy week to shed fatigue, then put Hypertrophy back on top and repeat the cycle. Progress load or reps when you restart.',
    templateIds: [
      'tmpl-push-deload',
      'tmpl-pull-deload',
      'tmpl-legs-deload',
    ],
  },
];

export const STARTER_PROGRAM_ID = PROGRAM_ID;

export function buildStarterProgramData(now = new Date().toISOString()): {
  templates: WorkoutTemplate[];
  templateExercises: TemplateExercise[];
  setTargets: SetTarget[];
  program: Program;
  blocks: TrainingBlock[];
  blockWorkouts: BlockWorkout[];
} {
  const templates: WorkoutTemplate[] = [];
  const templateExercises: TemplateExercise[] = [];
  const setTargets: SetTarget[] = [];

  for (const t of TEMPLATES) {
    templates.push({
      id: t.id,
      name: t.name,
      goal: t.goal,
      estimatedDurationMinutes: t.estimatedDurationMinutes,
      notes: t.notes,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });

    t.exercises.forEach((ex, exIndex) => {
      const teId = `${t.id}-te${exIndex}`;
      templateExercises.push({
        id: teId,
        workoutTemplateId: t.id,
        exerciseId: ex.exerciseId,
        orderIndex: exIndex,
        supersetGroup: null,
        restSeconds: ex.restSeconds,
        notes: ex.notes ?? '',
        progressionRuleId: null,
      });

      ex.sets.forEach((s, setIndex) => {
        setTargets.push({
          id: `${teId}-s${setIndex}`,
          templateExerciseId: teId,
          orderIndex: setIndex,
          setType: s.type,
          targetWeight: null,
          targetRepMin: s.repMin,
          targetRepMax: s.repMax,
          targetRir: s.rir ?? null,
        });
      });
    });
  }

  const program: Program = {
    id: PROGRAM_ID,
    name: 'Home PPL (DB / Bar)',
    description:
      'Dumbbells + pull-up bar + dip bar. Block periodization: 6 weeks hypertrophy, 4 weeks strength, 1 week deload. Train PPL twice per week. Legs are intentionally low-volume so they do not crush push/pull performance. Edit any workout to match your weights and preferences.',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };

  const blocks: TrainingBlock[] = BLOCKS.map(b => ({
    id: b.id,
    programId: PROGRAM_ID,
    name: b.name,
    orderIndex: b.orderIndex,
    weekCount: b.weekCount,
    goal: b.goal,
    notes: b.notes,
    createdAt: now,
  }));

  const blockWorkouts: BlockWorkout[] = [];
  for (const b of BLOCKS) {
    b.templateIds.forEach((templateId, i) => {
      blockWorkouts.push({
        id: `${b.id}-bw${i}`,
        trainingBlockId: b.id,
        workoutTemplateId: templateId,
        orderIndex: i,
        dayOfWeek: null,
      });
    });
  }

  return { templates, templateExercises, setTargets, program, blocks, blockWorkouts };
}
