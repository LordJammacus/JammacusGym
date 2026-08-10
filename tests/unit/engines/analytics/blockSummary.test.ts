import { describe, it, expect } from 'vitest';
import { generateBlockSummary, suggestNextBlock } from '@/engines/analytics/blockSummary';
import type { TrainingBlock, WorkoutInstance, WorkoutExerciseInstance, CompletedSet, ExerciseMuscle } from '@/types/entities';

function makeBlock(): TrainingBlock {
  return {
    id: 'block-1',
    programId: 'prog-1',
    name: 'Hypertrophy Block',
    orderIndex: 0,
    weekCount: 4,
    goal: 'hypertrophy',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeWorkout(id: string, date: string, templateName: string, blockId: string = 'block-1'): WorkoutInstance {
  return {
    id,
    workoutTemplateId: `tpl-${templateName}`,
    programId: 'prog-1',
    trainingBlockId: blockId,
    templateName,
    goal: 'hypertrophy',
    status: 'completed',
    startedAt: `${date}T10:00:00.000Z`,
    completedAt: `${date}T11:00:00.000Z`,
    durationSeconds: 3600,
    notes: '',
    createdAt: `${date}T10:00:00.000Z`,
  };
}

function makeEi(id: string, workoutId: string, exerciseId: string): WorkoutExerciseInstance {
  return {
    id,
    workoutInstanceId: workoutId,
    exerciseId,
    templateExerciseId: null,
    originalExerciseId: null,
    orderIndex: 0,
    supersetGroup: null,
    restSecondsTarget: 120,
    notes: '',
  };
}

function makeSet(eiId: string, weight: number, reps: number, idx: number = 0): CompletedSet {
  return {
    id: `set-${eiId}-${idx}`,
    workoutExerciseInstanceId: eiId,
    orderIndex: idx,
    setType: 'working',
    targetWeight: weight,
    targetRepMin: 8,
    targetRepMax: 12,
    targetRir: 2,
    actualWeight: weight,
    actualReps: reps,
    actualRir: 2,
    actualRestSeconds: 120,
    isAdditional: false,
    completedAt: '2026-01-01T10:05:00.000Z',
    notes: '',
  };
}

describe('generateBlockSummary', () => {
  it('generates correct totals for a simple block', () => {
    const block = makeBlock();
    const workouts = [
      makeWorkout('w1', '2026-01-01', 'Push'),
      makeWorkout('w2', '2026-01-03', 'Pull'),
      makeWorkout('w3', '2026-01-05', 'Legs'),
    ];
    const eis = [
      makeEi('ei1', 'w1', 'bench'),
      makeEi('ei2', 'w2', 'row'),
      makeEi('ei3', 'w3', 'squat'),
    ];
    const sets = [
      makeSet('ei1', 80, 10, 0), makeSet('ei1', 80, 10, 1), makeSet('ei1', 80, 10, 2),
      makeSet('ei2', 70, 10, 0), makeSet('ei2', 70, 10, 1), makeSet('ei2', 70, 10, 2),
      makeSet('ei3', 100, 8, 0), makeSet('ei3', 100, 8, 1), makeSet('ei3', 100, 8, 2),
    ];
    const exerciseMuscles: ExerciseMuscle[] = [
      { id: 'em1', exerciseId: 'bench', muscleGroupId: 'chest', role: 'primary', contribution: 1 },
      { id: 'em2', exerciseId: 'row', muscleGroupId: 'back', role: 'primary', contribution: 1 },
      { id: 'em3', exerciseId: 'squat', muscleGroupId: 'quads', role: 'primary', contribution: 1 },
    ];
    const exerciseNames = new Map([['bench', 'Bench Press'], ['row', 'Barbell Row'], ['squat', 'Squat']]);
    const muscleNames = new Map([['chest', 'Chest'], ['back', 'Back'], ['quads', 'Quads']]);

    const summary = generateBlockSummary(block, workouts, eis, sets, exerciseMuscles, exerciseNames, muscleNames);

    expect(summary.totalWorkouts).toBe(3);
    expect(summary.totalSets).toBe(9);
    expect(summary.totalVolume).toBeGreaterThan(0);
    expect(summary.muscleVolume.length).toBeGreaterThan(0);
  });

  it('only includes workouts belonging to the block', () => {
    const block = makeBlock();
    const workouts = [
      makeWorkout('w1', '2026-01-01', 'Push', 'block-1'),
      makeWorkout('w2', '2026-01-03', 'Pull', 'block-2'),
    ];
    const eis = [
      makeEi('ei1', 'w1', 'bench'),
      makeEi('ei2', 'w2', 'row'),
    ];
    const sets = [
      makeSet('ei1', 80, 10, 0),
      makeSet('ei2', 70, 10, 0),
    ];

    const summary = generateBlockSummary(block, workouts, eis, sets, [], new Map(), new Map());
    expect(summary.totalWorkouts).toBe(1);
    expect(summary.totalSets).toBe(1);
  });

  it('classifies exercises as improved, stagnated, or declined', () => {
    const block = makeBlock();
    const workouts = [
      makeWorkout('w1', '2026-01-01', 'Push'),
      makeWorkout('w2', '2026-01-08', 'Push'),
      makeWorkout('w3', '2026-01-15', 'Push'),
      makeWorkout('w4', '2026-01-22', 'Push'),
    ];

    const eis = [
      makeEi('ei1', 'w1', 'bench'), makeEi('ei2', 'w2', 'bench'),
      makeEi('ei3', 'w3', 'bench'), makeEi('ei4', 'w4', 'bench'),
    ];

    // Progressive overload: weight increases each session
    const sets = [
      makeSet('ei1', 80, 10, 0), makeSet('ei1', 80, 10, 1),
      makeSet('ei2', 85, 10, 0), makeSet('ei2', 85, 10, 1),
      makeSet('ei3', 90, 10, 0), makeSet('ei3', 90, 10, 1),
      makeSet('ei4', 95, 10, 0), makeSet('ei4', 95, 10, 1),
    ];

    const exerciseNames = new Map([['bench', 'Bench Press']]);

    const summary = generateBlockSummary(block, workouts, eis, sets, [], exerciseNames, new Map());
    expect(summary.exerciseSummaries.length).toBe(1);
    expect(summary.improved.length).toBe(1);
    expect(summary.improved[0]!.exerciseName).toBe('Bench Press');
    expect(summary.improved[0]!.change).toBeGreaterThan(0);
  });
});

describe('suggestNextBlock', () => {
  it('suggests deload for long blocks', () => {
    const block = makeBlock();
    const summary = generateBlockSummary(
      { ...block, weekCount: 8 },
      Array.from({ length: 20 }, (_, i) => makeWorkout(`w${i}`, `2026-01-${String(i + 1).padStart(2, '0')}`, 'Push')),
      [], [], [], new Map(), new Map(),
    );
    // Override durationWeeks for test
    const testSummary = { ...summary, durationWeeks: 8 };

    const suggestions = suggestNextBlock(testSummary);
    const deloadSuggestion = suggestions.find(s => s.title.toLowerCase().includes('deload'));
    expect(deloadSuggestion).toBeDefined();
  });

  it('suggests strength block after successful hypertrophy block', () => {
    const block = makeBlock();
    const summary = generateBlockSummary(block, [], [], [], [], new Map(), new Map());
    const testSummary = {
      ...summary,
      improved: [{ exerciseId: 'bench', exerciseName: 'Bench', sessions: 4, startingE1RM: 100, endingE1RM: 110, change: 10, changePercent: 10, direction: 'improved' as const }],
      stagnated: [],
      declined: [],
    };

    const suggestions = suggestNextBlock(testSummary);
    const strengthSuggestion = suggestions.find(s => s.title.toLowerCase().includes('strength'));
    expect(strengthSuggestion).toBeDefined();
  });

  it('suggests volume reduction when most exercises decline', () => {
    const block = makeBlock();
    const summary = generateBlockSummary(block, [], [], [], [], new Map(), new Map());
    const testSummary = {
      ...summary,
      totalWorkouts: 8,
      exerciseSummaries: Array.from({ length: 5 }, (_, i) => ({
        exerciseId: `ex${i}`, exerciseName: `Exercise ${i}`,
        sessions: 4, startingE1RM: 100, endingE1RM: 90, change: -10, changePercent: -10,
        direction: 'declined' as const,
      })),
      improved: [],
      stagnated: [],
      declined: Array.from({ length: 5 }, (_, i) => ({
        exerciseId: `ex${i}`, exerciseName: `Exercise ${i}`,
        sessions: 4, startingE1RM: 100, endingE1RM: 90, change: -10, changePercent: -10,
        direction: 'declined' as const,
      })),
    };

    const suggestions = suggestNextBlock(testSummary);
    const volumeSuggestion = suggestions.find(s => s.title.toLowerCase().includes('reducing volume'));
    expect(volumeSuggestion).toBeDefined();
  });
});
