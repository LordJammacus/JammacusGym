import { describe, it, expect } from 'vitest';
import { estimateOneRepMax, buildExerciseProgression } from '@/engines/analytics/intensity';
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
      makeSet('s1', 'ei-1', 80, 10),
      makeSet('s2', 'ei-1', 80, 8),
      makeSet('s3', 'ei-2', 82.5, 10),
      makeSet('s4', 'ei-2', 82.5, 9),
    ];

    const result = buildExerciseProgression(sets, exerciseInstances, instances, exerciseId);

    expect(result).toHaveLength(2);
    expect(result[0]!.date).toBe('2026-01-01');
    expect(result[0]!.weight).toBe(80);
    expect(result[0]!.estimated1RM).toBeGreaterThan(100);
    expect(result[1]!.weight).toBe(82.5);
    expect(result[1]!.estimated1RM).toBeGreaterThan(result[0]!.estimated1RM);
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

function makeSet(id: string, weiId: string, weight: number, reps: number): CompletedSet {
  return {
    id,
    workoutExerciseInstanceId: weiId,
    orderIndex: 0,
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
