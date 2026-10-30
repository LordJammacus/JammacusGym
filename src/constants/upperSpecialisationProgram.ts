import type {
  WorkoutTemplate,
  TemplateExercise,
  SetTarget,
  Program,
  TrainingBlock,
  BlockWorkout,
  Note,
} from '@/types/entities';
import type { SetType, WorkoutGoal, BlockGoal, DayOfWeek } from '@/types/enums';

/**
 * 4-day high-intensity, low-volume upper specialisation.
 *
 * Mon A / Tue B / Thu C / Sat D, with rest on Wed, Fri, and Sun.
 * Working sets only. Warm-ups are mentioned in the session note and are not logged.
 * A 1–2 RIR target is stored as 2. A 0–1 RIR target is stored as 1.
 * "1–2 sets" is stored as 2, with a note to drop a set when recovery or a tendon says so.
 * Side plank is two logged sets (left, then right); reps are seconds.
 */

const PROGRAM_ID = 'prog-upper-specialisation';

const SESSION_RULES =
  'Working sets only. Do easy warm-up sets on the first heavy lift and do not log them. Lower the weight under control, use a full comfortable range, and do not bounce or force reps. Double progression: keep the dumbbell the same until every working set hits the top of the rep range at the listed RIR, then take the next jump and start again at the bottom of the range. If the jump is too big, add reps instead.';

type SetSpec = {
  type: SetType;
  repMin: number;
  repMax: number;
  rir: number;
};

type ExerciseSpec = {
  exerciseId: string;
  restSeconds: number;
  notes: string;
  sets: SetSpec[];
};

type TemplateSpec = {
  id: string;
  name: string;
  goal: WorkoutGoal;
  estimatedDurationMinutes: number;
  notes: string;
  dayOfWeek: DayOfWeek;
  exercises: ExerciseSpec[];
};

function sets(count: number, repMin: number, repMax: number, rir: number): SetSpec[] {
  return Array.from({ length: count }, () => ({ type: 'working', repMin, repMax, rir }));
}

const TEMPLATES: TemplateSpec[] = [
  {
    id: 'tmpl-upper-a',
    name: 'A · Chest, Shoulders and Abs',
    goal: 'hypertrophy',
    estimatedDurationMinutes: 30,
    notes: `${SESSION_RULES} Monday. Priorities are upper chest, lateral delts, and abs.`,
    dayOfWeek: 1,
    exercises: [
      {
        exerciseId: 'ex-db-incline-bench',
        restSeconds: 120,
        notes: 'Upper chest. Stable incline only. Leave 1–2 reps. This is the main strength lift today.',
        sets: sets(2, 6, 10, 2),
      },
      {
        exerciseId: 'ex-db-squeeze-press',
        restSeconds: 75,
        notes: 'Flat bench. Press the dumbbells together through the whole set. Leave 1 rep.',
        sets: sets(1, 10, 15, 1),
      },
      {
        exerciseId: 'ex-lateral-raise',
        restSeconds: 60,
        notes: 'Lateral delts. Strict raise, no swing. Leave 0–1 reps, and only take the last rep if it is pain-free.',
        sets: sets(2, 12, 20, 1),
      },
      {
        exerciseId: 'ex-db-rear-delt-raise',
        restSeconds: 60,
        notes: 'Rear delts. Hinge and raise. Do not brace your chest on the bench. Leave 1 rep.',
        sets: sets(1, 12, 20, 1),
      },
      {
        exerciseId: 'ex-weighted-db-crunch',
        restSeconds: 45,
        notes: 'Abs. Hold a dumbbell at the chest and curl the ribs toward the pelvis. Leave 1 rep.',
        sets: sets(2, 10, 15, 1),
      },
      {
        exerciseId: 'ex-reverse-crunch',
        restSeconds: 45,
        notes: 'Lower abs. Lift the hips, do not swing the legs. Leave 1 rep.',
        sets: sets(1, 12, 20, 1),
      },
    ],
  },
  {
    id: 'tmpl-upper-b',
    name: 'B · Lats and Biceps',
    goal: 'hypertrophy',
    estimatedDurationMinutes: 25,
    notes: `${SESSION_RULES} Tuesday. Priorities are lat width, strict pull-ups, and biceps that stay pain-free.`,
    dayOfWeek: 2,
    exercises: [
      {
        exerciseId: 'ex-pullup',
        restSeconds: 120,
        notes: 'Strict pull-ups. Comfortable grip, no swing, no added weight. Leave about 2 reps.',
        sets: sets(2, 5, 10, 2),
      },
      {
        exerciseId: 'ex-db-row',
        restSeconds: 90,
        notes: 'One arm at a time. Brace the free hand on a stable surface. Drive the elbow toward the hip. Leave 1–2 reps. Do not turn this into a chest-supported bench row.',
        sets: sets(2, 8, 12, 2),
      },
      {
        exerciseId: 'ex-hammer-curl',
        restSeconds: 75,
        notes: 'Biceps and brachialis. Two sets are programmed; drop to one or skip the exercise if the tendon hurts. No forced reps. Leave 2 reps. Note whether any pain is at the shoulder or the elbow.',
        sets: sets(2, 10, 15, 2),
      },
    ],
  },
  {
    id: 'tmpl-upper-c',
    name: 'C · Chest and Shoulders',
    goal: 'hypertrophy',
    estimatedDurationMinutes: 30,
    notes: `${SESSION_RULES} Thursday. Priorities are overall chest, shoulders, and lateral delts.`,
    dayOfWeek: 4,
    exercises: [
      {
        exerciseId: 'ex-db-bench',
        restSeconds: 120,
        notes: 'Flat dumbbell bench. Stable flat position only. Leave 1–2 reps.',
        sets: sets(2, 8, 12, 2),
      },
      {
        exerciseId: 'ex-db-shoulder-press',
        restSeconds: 120,
        notes: 'Seated or standing, whichever is stable. Control the bottom. Leave 1–2 reps.',
        sets: sets(2, 6, 10, 2),
      },
      {
        exerciseId: 'ex-lateral-raise',
        restSeconds: 60,
        notes: 'Lateral delts. Strict raise, no swing. Leave 0–1 reps, and only take the last rep if it is pain-free.',
        sets: sets(2, 12, 20, 1),
      },
      {
        exerciseId: 'ex-lateral-raise-partial',
        restSeconds: 60,
        notes: 'Optional top-half partials for lateral delts. Skip this if the shoulder is sore or painful. Leave 1 rep.',
        sets: sets(1, 15, 25, 1),
      },
    ],
  },
  {
    id: 'tmpl-upper-d',
    name: 'D · Back, Arms, Legs and Abs',
    goal: 'hypertrophy',
    estimatedDurationMinutes: 35,
    notes: `${SESSION_RULES} Saturday. Back and arms first. Legs stay at maintenance so they do not create the fatigue that buried the old PPL.`,
    dayOfWeek: 6,
    exercises: [
      {
        exerciseId: 'ex-db-row',
        restSeconds: 90,
        notes: 'One arm at a time. Brace the free hand on a stable surface. Drive the elbow toward the hip. Leave 1–2 reps.',
        sets: sets(2, 8, 12, 2),
      },
      {
        exerciseId: 'ex-db-curl',
        restSeconds: 75,
        notes: 'Biceps. One set. Skip it if the tendon hurts. No forced reps. Leave 2 reps. Note whether any pain is at the shoulder or the elbow.',
        sets: sets(1, 10, 15, 2),
      },
      {
        exerciseId: 'ex-goblet-squat',
        restSeconds: 90,
        notes: 'Quads and glutes. Heels down, comfortable depth. Leave 2 reps. This is maintenance, not a leg day.',
        sets: sets(2, 8, 12, 2),
      },
      {
        exerciseId: 'ex-db-rdl',
        restSeconds: 90,
        notes: 'Hamstrings and glutes. Soft knees, hips back. Two sets are programmed; stop after one if the legs are still sore. Leave 2 reps.',
        sets: sets(2, 8, 12, 2),
      },
      {
        exerciseId: 'ex-reverse-crunch',
        restSeconds: 45,
        notes: 'Abs. Lift the hips, do not swing the legs. Leave 1 rep.',
        sets: sets(2, 12, 20, 1),
      },
      {
        exerciseId: 'ex-side-plank',
        restSeconds: 30,
        notes: 'Obliques. Set 1 is the left side, set 2 is the right. Log the hold in seconds as reps. Stop with about 1 rep in reserve.',
        sets: sets(2, 30, 45, 1),
      },
    ],
  },
];

const BLOCK = {
  id: 'block-upper-spec',
  name: 'Specialisation',
  orderIndex: 0,
  weekCount: 8,
  goal: 'hypertrophy' as BlockGoal,
  notes:
    'Run A → B → C → D for 6–8 weeks: Monday, Tuesday, Thursday, Saturday. Add a set only where the weight is still going up and you are sleeping and recovering. Do not add leg volume. No weighted pull-ups yet. Skip curls that hurt. A pop, bruise, or sudden weakness needs an urgent clinical check.',
  templateIds: TEMPLATES.map(t => t.id),
};

export const UPPER_SPECIALISATION_PROGRAM_ID = PROGRAM_ID;

export function buildUpperSpecialisationProgramData(now = new Date().toISOString()): {
  templates: WorkoutTemplate[];
  templateExercises: TemplateExercise[];
  setTargets: SetTarget[];
  program: Program;
  blocks: TrainingBlock[];
  blockWorkouts: BlockWorkout[];
  notes: Note[];
} {
  const templates: WorkoutTemplate[] = [];
  const templateExercises: TemplateExercise[] = [];
  const setTargets: SetTarget[] = [];
  const notes: Note[] = [];

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

    notes.push({
      id: `note-${t.id}-session`,
      type: 'workout_template',
      targetId: t.id,
      content: t.notes,
      showNextTime: true,
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
        notes: ex.notes,
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
          targetRir: s.rir,
        });
      });
    });
  }

  const program: Program = {
    id: PROGRAM_ID,
    name: 'Upper Specialisation (4-Day)',
    description:
      'High-intensity, low-volume upper specialisation for dumbbells, a flat/incline bench, a pull-up bar, and a dip bar. Monday A, Tuesday B, Thursday C, Saturday D. Chest, lats, lateral delts, and biceps are the priorities. Legs are maintenance. The dip bar is available but unused so dips do not add shoulder or systemic fatigue. Set this program active when you want Today to follow it.',
    isActive: false,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };

  const blocks: TrainingBlock[] = [
    {
      id: BLOCK.id,
      programId: PROGRAM_ID,
      name: BLOCK.name,
      orderIndex: BLOCK.orderIndex,
      weekCount: BLOCK.weekCount,
      goal: BLOCK.goal,
      notes: BLOCK.notes,
      createdAt: now,
    },
  ];

  const blockWorkouts: BlockWorkout[] = TEMPLATES.map((t, i) => ({
    id: `${BLOCK.id}-bw${i}`,
    trainingBlockId: BLOCK.id,
    workoutTemplateId: t.id,
    orderIndex: i,
    dayOfWeek: t.dayOfWeek,
  }));

  return { templates, templateExercises, setTargets, program, blocks, blockWorkouts, notes };
}
