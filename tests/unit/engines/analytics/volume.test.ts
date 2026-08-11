import { describe, it, expect } from 'vitest';
import {
  calculateMuscleGroupVolume,
  calculateTotalVolume,
  calculateWeeklyVolume,
} from '@/engines/analytics/volume';
import { buildExerciseProgression } from '@/engines/analytics/intensity';
import type {
  CompletedSet,
  ExerciseMuscle,
  WorkoutExerciseInstance,
  WorkoutInstance,
} from '@/types/entities';
import type { DateRange } from '@/types/analytics';

describe('calculateMuscleGroupVolume', () => {
  it('calculates direct and indirect sets with contribution weights', () => {
    const exerciseInstances: WorkoutExerciseInstance[] = [
      makeEI('ei-1', 'ex-bench'),
    ];

    const sets: CompletedSet[] = [
      makeSet('s1', 'ei-1', 80, 10, 'working'),
      makeSet('s2', 'ei-1', 80, 9, 'working'),
      makeSet('s3', 'ei-1', 80, 8, 'working'),
    ];

    const exerciseMuscles: ExerciseMuscle[] = [
      { id: 'em-1', exerciseId: 'ex-bench', muscleGroupId: 'mg-chest', role: 'primary', contribution: 1.0 },
      { id: 'em-2', exerciseId: 'ex-bench', muscleGroupId: 'mg-tricep', role: 'secondary', contribution: 0.3 },
      { id: 'em-3', exerciseId: 'ex-bench', muscleGroupId: 'mg-front-delt', role: 'secondary', contribution: 0.3 },
    ];

    const muscleNames = new Map([
      ['mg-chest', 'Chest'],
      ['mg-tricep', 'Triceps'],
      ['mg-front-delt', 'Front Delts'],
    ]);

    const result = calculateMuscleGroupVolume(sets, exerciseInstances, exerciseMuscles, muscleNames);

    const chest = result.find(r => r.muscleName === 'Chest');
    expect(chest).toBeDefined();
    expect(chest!.directSets).toBe(3);
    expect(chest!.indirectSets).toBe(0);

    const tricep = result.find(r => r.muscleName === 'Triceps');
    expect(tricep).toBeDefined();
    expect(tricep!.directSets).toBe(0);
    expect(tricep!.indirectSets).toBe(0.9);
  });

  it('excludes warmup sets from volume', () => {
    const exerciseInstances: WorkoutExerciseInstance[] = [
      makeEI('ei-1', 'ex-1'),
    ];

    const sets: CompletedSet[] = [
      makeSet('s1', 'ei-1', 40, 10, 'warmup'),
      makeSet('s2', 'ei-1', 80, 10, 'working'),
    ];

    const exerciseMuscles: ExerciseMuscle[] = [
      { id: 'em-1', exerciseId: 'ex-1', muscleGroupId: 'mg-1', role: 'primary', contribution: 1.0 },
    ];

    const muscleNames = new Map([['mg-1', 'Test Muscle']]);

    const result = calculateMuscleGroupVolume(sets, exerciseInstances, exerciseMuscles, muscleNames);
    expect(result).toHaveLength(1);
    expect(result[0]!.directSets).toBe(1);
  });
});

describe('calculateTotalVolume', () => {
  it('sums weight * reps excluding warmup', () => {
    const sets: CompletedSet[] = [
      makeSet('s1', 'ei-1', 40, 10, 'warmup'),
      makeSet('s2', 'ei-1', 80, 10, 'working'),
      makeSet('s3', 'ei-1', 80, 8, 'working'),
    ];

    const result = calculateTotalVolume(sets);
    expect(result).toBe(80 * 10 + 80 * 8);
  });
});

describe('abandoned workouts stay out of analytics', () => {
  const range: DateRange = {
    start: '2026-01-01T00:00:00.000Z',
    end: '2026-01-31T23:59:59.999Z',
  };

  it('calculateWeeklyVolume ignores sets from abandoned sessions', () => {
    const instances: WorkoutInstance[] = [
      makeInstance('done', '2026-01-06', 'completed'),
      makeInstance('quit', '2026-01-07', 'abandoned'),
    ];
    const exerciseInstances: WorkoutExerciseInstance[] = [
      { ...makeEI('ei-done', 'ex-1'), workoutInstanceId: 'done' },
      { ...makeEI('ei-quit', 'ex-1'), workoutInstanceId: 'quit' },
    ];
    const sets: CompletedSet[] = [
      makeSet('s-done', 'ei-done', 100, 10),
      makeSet('s-quit', 'ei-quit', 200, 10),
    ];

    const result = calculateWeeklyVolume(sets, instances, exerciseInstances, range);
    expect(result).toHaveLength(1);
    expect(result[0]!.totalVolume).toBe(1000);
    expect(result[0]!.workingSets).toBe(1);
  });

  it('buildExerciseProgression ignores abandoned sessions', () => {
    const instances: WorkoutInstance[] = [
      makeInstance('done', '2026-01-06', 'completed'),
      makeInstance('quit', '2026-01-07', 'abandoned'),
    ];
    const exerciseInstances: WorkoutExerciseInstance[] = [
      { ...makeEI('ei-done', 'ex-1'), workoutInstanceId: 'done' },
      { ...makeEI('ei-quit', 'ex-1'), workoutInstanceId: 'quit' },
    ];
    const sets: CompletedSet[] = [
      makeSet('s-done', 'ei-done', 100, 10),
      makeSet('s-quit', 'ei-quit', 250, 5),
    ];

    const points = buildExerciseProgression(sets, exerciseInstances, instances, 'ex-1');
    expect(points).toHaveLength(1);
    expect(points[0]!.weight).toBe(100);
  });
});

function makeInstance(id: string, date: string, status: WorkoutInstance['status']): WorkoutInstance {
  return {
    id,
    workoutTemplateId: 'wt-1',
    programId: null,
    trainingBlockId: null,
    templateName: 'Test',
    goal: 'hypertrophy',
    status,
    startedAt: `${date}T10:00:00.000Z`,
    completedAt: `${date}T11:00:00.000Z`,
    durationSeconds: 3600,
    notes: '',
    createdAt: `${date}T10:00:00.000Z`,
  };
}

function makeEI(id: string, exerciseId: string): WorkoutExerciseInstance {
  return {
    id,
    workoutInstanceId: 'inst-1',
    exerciseId,
    templateExerciseId: 'te-1',
    originalExerciseId: null,
    orderIndex: 0,
    supersetGroup: null,
    restSecondsTarget: 120,
    notes: '',
  };
}

function makeSet(id: string, weiId: string, weight: number, reps: number, setType: CompletedSet['setType'] = 'working'): CompletedSet {
  return {
    id,
    workoutExerciseInstanceId: weiId,
    orderIndex: 0,
    setType,
    targetWeight: weight,
    targetRepMin: 8,
    targetRepMax: 12,
    targetRir: 2,
    actualWeight: weight,
    actualReps: reps,
    actualRir: null,
    actualRestSeconds: null,
    isAdditional: false,
    completedAt: '2026-01-01T10:10:00.000Z',
    notes: '',
  };
}
