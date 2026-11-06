import type {
  WorkoutTemplate,
  TemplateExercise,
  SetTarget,
  Program,
  TrainingBlock,
  BlockWorkout,
  Note,
} from '@/types/entities';
import type { SetType, WorkoutGoal, BlockGoal } from '@/types/enums';

/**
 * 4-day commercial-gym split for a 90 kg bench in 16 weeks, plus lat, shoulder,
 * arm, and ab growth. Days rotate. They are not locked to a weekday.
 *
 * Working sets only. Warm-ups are mentioned on the bench notes and are not logged.
 * A 1–2 RIR target is stored as 2. A 0–1 RIR target is stored as 1.
 * Legs stay at maintenance. No squat, deadlift, or overhead press, so bench
 * recovery is not competing with another heavy compound.
 *
 * Rest: 180s heavy bench, 150s other hard compounds, 120s machine rows,
 * 90s leg curls, 75s direct arm work, 60s shoulders and abs, 30s side plank.
 */

export const JIMMY_GYM_REVISION = '1';
export const JIMMY_GYM_REVISION_NOTE_ID = 'note-jimmy-gym-revision';

const PROGRAM_ID = 'prog-jimmy-commercial';

const SESSION_RULES =
  'Working sets only. Do not log warm-ups. Lower the weight under control and stop at the listed RIR. Double progression: stay at the same load until every working set hits the top of the rep range, then take the next jump (2.5 kg on a barbell, the next pin or plate on a machine, the next dumbbell) and start again at the bottom of the range. If the jump is too big, add reps instead. Do not add sets.';

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
  exercises: ExerciseSpec[];
};

function sets(count: number, repMin: number, repMax: number, rir: number): SetSpec[] {
  return Array.from({ length: count }, () => ({ type: 'working', repMin, repMax, rir }));
}

const PULLUP_NOTE =
  'Strict pull-ups. Comfortable grip, no swing, no added weight yet. Leave about 2 reps. If you cannot get 4 strict reps, use the smallest foot assist that keeps you in range, or a slow lower from the top, and log those until strict reps reach the range.';

const ROW_NOTE =
  'Plate-loaded or pin-stack row. Chest on the pad if it has one. Drive the elbows toward the hips. Leave 2 reps.';

const CURL_NOTE =
  'Elbows stay at your sides. Leave 2 reps. Skip the exercise if the tendon hurts at the elbow or the front of the shoulder. No forced reps.';

const LATERAL_NOTE =
  'Dumbbells. Strict raise, no swing. Leave 0–1 reps, and only take the last rep if it is pain-free.';

const REAR_DELT_NOTE =
  'Pec deck facing the machine. Soft bend in the arms, lead with the elbows. Leave 1 rep. Do not turn it into a row.';

const KNEE_RAISE_NOTE =
  'Captain\'s chair, or hanging from the pull-up bar. Knees toward the chest and tilt the pelvis. Do not swing. Leave 1 rep. Use the chair if your grip is already tired.';

const TEMPLATES: TemplateSpec[] = [
  {
    id: 'tmpl-jimmy-d1',
    name: '(Jimmy) Day 1 · Heavy Bench',
    goal: 'strength',
    estimatedDurationMinutes: 40,
    notes: `${SESSION_RULES} Day 1. Heavy flat bench is the lift that moves the 90 kg single. Do this when shoulders and elbows feel ready, never the day after Day 3.`,
    exercises: [
      {
        exerciseId: 'ex-bb-bench',
        restSeconds: 180,
        notes:
          'Flat barbell bench, first exercise. From a 75 kg single start near 60 kg. From an 80 kg single start near 64 kg. Adjust so 4–6 reps leaves 2 in reserve. Warm-up, do not log: empty bar for 10, then about 50%, 70%, and 85% of the working weight for 5, 3, and 1. When all 4 sets hit 6, add 2.5 kg. No max attempts until week 16.',
        sets: sets(4, 4, 6, 2),
      },
      {
        exerciseId: 'ex-bb-incline-bench',
        restSeconds: 150,
        notes:
          'Upper chest, after the heavy bench so it does not pre-fatigue the main lift. Moderate load. Leave 2 reps. If the next heavy bench stalls, drop this before you drop any flat bench sets.',
        sets: sets(2, 8, 12, 2),
      },
      {
        exerciseId: 'ex-lateral-raise',
        restSeconds: 60,
        notes: LATERAL_NOTE,
        sets: sets(3, 12, 20, 1),
      },
      {
        exerciseId: 'ex-reverse-pec-deck',
        restSeconds: 60,
        notes: REAR_DELT_NOTE,
        sets: sets(2, 12, 20, 1),
      },
      {
        exerciseId: 'ex-cable-crunch',
        restSeconds: 60,
        notes: 'Abs. Kneel at the cable, curl the ribs toward the pelvis, and hold the squeeze. Leave 1 rep. Add load before you chase reps past 15.',
        sets: sets(2, 10, 15, 1),
      },
      {
        exerciseId: 'ex-knee-raise',
        restSeconds: 60,
        notes: KNEE_RAISE_NOTE,
        sets: sets(2, 8, 15, 1),
      },
    ],
  },
  {
    id: 'tmpl-jimmy-d2',
    name: '(Jimmy) Day 2 · Back and Arms',
    goal: 'hypertrophy',
    estimatedDurationMinutes: 35,
    notes: `${SESSION_RULES} Day 2. Lat width, arm size, and a little forearm work. Fine the day after heavy bench. Skip a curl if the tendon hurts.`,
    exercises: [
      {
        exerciseId: 'ex-pullup',
        restSeconds: 150,
        notes: PULLUP_NOTE,
        sets: sets(3, 4, 10, 2),
      },
      {
        exerciseId: 'ex-machine-row',
        restSeconds: 120,
        notes: ROW_NOTE,
        sets: sets(3, 8, 12, 2),
      },
      {
        exerciseId: 'ex-cable-curl',
        restSeconds: 75,
        notes: `Biceps. ${CURL_NOTE}`,
        sets: sets(2, 10, 15, 2),
      },
      {
        exerciseId: 'ex-hammer-curl',
        restSeconds: 75,
        notes: `Brachialis and the outer forearm. Neutral grip, no swing. ${CURL_NOTE}`,
        sets: sets(2, 10, 15, 2),
      },
      {
        exerciseId: 'ex-wrist-curl',
        restSeconds: 60,
        notes: 'Forearm flexors. Forearms braced on your thighs, full range, no bounce. Leave 1 rep. Skip it if the elbow is sore.',
        sets: sets(2, 15, 25, 1),
      },
    ],
  },
  {
    id: 'tmpl-jimmy-d3',
    name: '(Jimmy) Day 3 · Bench and Triceps',
    goal: 'hypertrophy',
    estimatedDurationMinutes: 32,
    notes: `${SESSION_RULES} Day 3. Second bench of the week, then cable triceps. Leave at least one full day after Day 1. This session stays shorter so the heavy bench can keep moving.`,
    exercises: [
      {
        exerciseId: 'ex-bb-bench',
        restSeconds: 150,
        notes:
          'Flat barbell bench, lighter than Day 1. Same warm-up pattern, not logged. Leave 2 reps in the 6–10 range. When all 3 sets hit 10, add 2.5 kg. Do not turn this into another heavy 4–6 day.',
        sets: sets(3, 6, 10, 2),
      },
      {
        exerciseId: 'ex-lateral-raise',
        restSeconds: 60,
        notes: LATERAL_NOTE,
        sets: sets(3, 12, 20, 1),
      },
      {
        exerciseId: 'ex-reverse-pec-deck',
        restSeconds: 60,
        notes: REAR_DELT_NOTE,
        sets: sets(2, 12, 20, 1),
      },
      {
        exerciseId: 'ex-overhead-ext',
        restSeconds: 75,
        notes:
          'Cable overhead extension, one arm or both. Upper arm fixed beside the head so the long head stretches. Leave 2 reps. Two sets, because Day 1 and this bench already load the triceps. If the elbow hurts, swap to a pushdown for the same reps or skip it.',
        sets: sets(2, 10, 15, 2),
      },
    ],
  },
  {
    id: 'tmpl-jimmy-d4',
    name: '(Jimmy) Day 4 · Back, Legs and Abs',
    goal: 'hypertrophy',
    estimatedDurationMinutes: 45,
    notes: `${SESSION_RULES} Day 4. Second back hit, maintenance legs, abs. Leave at least one day after Day 2. Do not add squats or deadlifts.`,
    exercises: [
      {
        exerciseId: 'ex-pullup',
        restSeconds: 150,
        notes: `Second pull-up exposure, two sets so the back recovers before Day 2. ${PULLUP_NOTE}`,
        sets: sets(2, 4, 10, 2),
      },
      {
        exerciseId: 'ex-machine-row',
        restSeconds: 120,
        notes: ROW_NOTE,
        sets: sets(3, 8, 12, 2),
      },
      {
        exerciseId: 'ex-cable-curl',
        restSeconds: 75,
        notes: `Second biceps hit of the week. ${CURL_NOTE} Drop this before you drop the Day 2 curls.`,
        sets: sets(2, 10, 15, 2),
      },
      {
        exerciseId: 'ex-leg-press',
        restSeconds: 150,
        notes:
          'Quads. Comfortable depth, knees tracking over the toes, no bounce at the bottom. Leave 2 reps. Three sets is maintenance, not a leg day.',
        sets: sets(3, 8, 12, 2),
      },
      {
        exerciseId: 'ex-leg-curl',
        restSeconds: 90,
        notes: 'Hamstrings, so the leg press is not the only leg work. Hips stay down. Leave 2 reps. Two sets only.',
        sets: sets(2, 10, 15, 2),
      },
      {
        exerciseId: 'ex-knee-raise',
        restSeconds: 60,
        notes: KNEE_RAISE_NOTE,
        sets: sets(2, 8, 15, 1),
      },
      {
        exerciseId: 'ex-side-plank',
        restSeconds: 30,
        notes: 'Obliques, low volume so the waist stays tight. Set 1 is the left side, set 2 is the right. Log the hold in seconds as reps. Stop with about 1 rep in reserve.',
        sets: sets(2, 30, 45, 1),
      },
    ],
  },
];

const BLOCK = {
  id: 'block-jimmy-commercial',
  name: '16-Week Bench',
  orderIndex: 0,
  weekCount: 16,
  goal: 'strength' as BlockGoal,
  notes:
    'Run Day 1 → Day 2 → Day 3 → Day 4 for 16 weeks. A normal week is Day 1, Day 2, rest or easy cardio, Day 3, rest or easy cardio, Day 4, rest. The two bench days need a day off between them. Back days can sit next to a bench day. Keep cardio easy the day before Day 1. Add 2.5 kg on the heavy bench only when every set hits 6 reps. Do not test a max until week 16, and do not add a fifth lifting day. Add a set only on laterals or curls if you are sleeping and the bench is still going up.',
  templateIds: TEMPLATES.map(t => t.id),
};

export const JIMMY_COMMERCIAL_PROGRAM_ID = PROGRAM_ID;

export function buildCommercialGymProgramData(now = new Date().toISOString()): {
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
  const notes: Note[] = [
    {
      id: JIMMY_GYM_REVISION_NOTE_ID,
      type: 'general',
      targetId: PROGRAM_ID,
      content: JIMMY_GYM_REVISION,
      showNextTime: false,
      createdAt: now,
      updatedAt: now,
      archivedAt: now,
    },
  ];

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
    name: '(Jimmy) Commercial Gym',
    description:
      'Four commercial-gym days, rotated in order, with rest or cardio on the other days. Barbell bench twice a week to take a 75–80 kg single to 90 kg in 16 weeks. Pull-ups, machine rows, dumbbell laterals, reverse pec deck, cable arms, leg press, and knee raises cover the V-taper, arms, and abs. Legs stay at maintenance. No fifth lifting day. Set this program active when you want Today to follow it.',
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
    dayOfWeek: null,
  }));

  return { templates, templateExercises, setTargets, program, blocks, blockWorkouts, notes };
}
