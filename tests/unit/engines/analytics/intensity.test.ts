import { describe, it, expect } from 'vitest';
import { estimateOneRepMax, buildExerciseProgression, buildAllExerciseProgressions } from '@/engines/analytics/intensity';
import type { CompletedSet, WorkoutExerciseInstance, WorkoutInstance } from '@/types/entities';

describe('estimateOneRepMax', () => {
  it('returns weight for 1 rep', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it('estimates correctly for typical values (Epley)', () => {
    // 100kg x 10 reps = 100 * (1 + 10/30) = 100 * 1.333 = 133.3
    expect(estimateOneRepMax(100, 10)).toBe(133.3);
  });

  it('returns 0 for invalid inputs', () => {
    expect(estimateOneRepMax(0, 10)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
    expect(estimateOneRepMax(-10, 5)).toBe(0);
  });

  it('caps at 30 reps', () => {
    const at30 = estimateOneRepMax(100, 30);
    const at50 = estimateOneRepMax(100, 50);
    expect(at50).toBe(at30);
  });
});

describe('buildExerciseProgression', () => {
  it('builds progression points from workout data', () => {
    const exerciseId = 'ex-1';

    const instances: WorkoutInstance[] = [
      makeInstance('inst-1', '2026-01-01'),
      makeInstance('inst-2', '2026-01-08'),
    ];

    const exerciseInstances: WorkoutExerciseInstance[] = [
      makeEI('ei-1', 'inst-1', exerciseId),
      makeEI('ei-2', 'inst-2', exerciseId),
    ];

    const sets: CompletedSet[] = [
      makeSet('s1', 'ei-1', 80, 10, 0),
      makeSet('s2', 'ei-1', 80, 8, 1),
      makeSet('s3', 'ei-2', 82.5, 10, 0),
      makeSet('s4', 'ei-2', 82.5, 9, 1),
    ];

    const result = buildExerciseProgression(sets, exerciseInstances, instances, exerciseId);

    expect(result).toHaveLength(2);
    expect(result[0]!.date).toBe('2026-01-01');
    expect(result[0]!.weight).toBe(80);
    expect(result[0]!.reps).toBe(10);
    expect(result[0]!.totalReps).toBe(18);
    expect(result[0]!.minReps).toBe(8);
    expect(result[0]!.workingSets).toBe(2);
    expect(result[0]!.sets.map(s => s.reps)).toEqual([10, 8]);
    expect(result[0]!.estimated1RM).toBeGreaterThan(100);
    expect(result[1]!.weight).toBe(82.5);
    expect(result[1]!.totalReps).toBe(19);
    expect(result[1]!.estimated1RM).toBeGreaterThan(result[0]!.estimated1RM);
  });

  it('captures later-set progress when the best set is unchanged', () => {
    const exerciseId = 'ex-1';
    const instances: WorkoutInstance[] = [
      makeInstance('inst-1', '2026-01-01'),
      makeInstance('inst-2', '2026-01-08'),
    ];
    const exerciseInstances: WorkoutExerciseInstance[] = [
      makeEI('ei-1', 'inst-1', exerciseId),
      makeEI('ei-2', 'inst-2', exerciseId),
    ];
    const sets: CompletedSet[] = [
      makeSet('s1', 'ei-1', 80, 12, 0),
      makeSet('s2', 'ei-1', 80, 11, 1),
      makeSet('s3', 'ei-1', 80, 10, 2),
      makeSet('s4', 'ei-1', 80, 9, 3),
      makeSet('s5', 'ei-2', 80, 12, 0),
      makeSet('s6', 'ei-2', 80, 12, 1),
      makeSet('s7', 'ei-2', 80, 10, 2),
      makeSet('s8', 'ei-2', 80, 9, 3),
    ];

    const result = buildExerciseProgression(sets, exerciseInstances, instances, exerciseId);
    expect(result[0]!.reps).toBe(12);
    expect(result[1]!.reps).toBe(12);
    expect(result[0]!.estimated1RM).toBe(result[1]!.estimated1RM);
    expect(result[1]!.totalReps).toBe(result[0]!.totalReps + 1);
    expect(result[1]!.volumeLoad).toBeGreaterThan(result[0]!.volumeLoad);
    expect(result[1]!.sets[1]!.reps).toBe(12);
  });

  it('excludes warmup sets from best set selection', () => {
    const exerciseId = 'ex-1';
    const instances: WorkoutInstance[] = [makeInstance('inst-1', '2026-01-01')];
    const exerciseInstances: WorkoutExerciseInstance[] = [makeEI('ei-1', 'inst-1', exerciseId)];

    const sets: CompletedSet[] = [
      { ...makeSet('s1', 'ei-1', 40, 10), setType: 'warmup' },
      makeSet('s2', 'ei-1', 80, 8),
    ];

    const result = buildExerciseProgression(sets, exerciseInstances, instances, exerciseId);
    expect(result).toHaveLength(1);
    expect(result[0]!.weight).toBe(80);
  });

  it('returns empty for no matching exercise', () => {
    const result = buildExerciseProgression([], [], [], 'nonexistent');
    expect(result).toHaveLength(0);
  });
});

describe('buildAllExerciseProgressions', () => {
  it('builds timelines for every trained exercise', () => {
    const instances: WorkoutInstance[] = [makeInstance('inst-1', '2026-01-01')];
    const exerciseInstances: WorkoutExerciseInstance[] = [
      makeEI('ei-1', 'inst-1', 'ex-1'),
      makeEI('ei-2', 'inst-1', 'ex-2'),
    ];
    const sets: CompletedSet[] = [
      makeSet('s1', 'ei-1', 80, 10),
      makeSet('s2', 'ei-2', 40, 12),
    ];

    const result = buildAllExerciseProgressions(sets, exerciseInstances, instances);
    expect(result.size).toBe(2);
    expect(result.get('ex-1')?.[0]?.weight).toBe(80);
    expect(result.get('ex-2')?.[0]?.weight).toBe(40);
  });
});

function makeInstance(id: string, date: string): WorkoutInstance {
  return {
    id,
    workoutTemplateId: 'wt-1',
    programId: null,
    trainingBlockId: null,
    templateName: 'Test',
    goal: 'hypertrophy',
    status: 'completed',
    startedAt: `${date}T10:00:00.000Z`,
    completedAt: `${date}T11:00:00.000Z`,
    durationSeconds: 3600,
    notes: '',
    createdAt: `${date}T10:00:00.000Z`,
  };
}

function makeEI(id: string, workoutInstanceId: string, exerciseId: string): WorkoutExerciseInstance {
  return {
    id,
    workoutInstanceId,
    exerciseId,
    templateExerciseId: 'te-1',
    originalExerciseId: null,
    orderIndex: 0,
    supersetGroup: null,
    restSecondsTarget: 120,
    notes: '',
  };
}

function makeSet(id: string, weiId: string, weight: number, reps: number, orderIndex = 0): CompletedSet {
  return {
    id,
    workoutExerciseInstanceId: weiId,
    orderIndex,
    setType: 'working',
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
