import { describe, it, expect } from 'vitest';
import { calculateRestAdherence } from '@/engines/analytics/rest';
import type { CompletedSet, WorkoutExerciseInstance } from '@/types/entities';

describe('calculateRestAdherence', () => {
  it('calculates adherence percentage', () => {
    const exerciseInstances: WorkoutExerciseInstance[] = [
      makeEI('ei-1', 120),
    ];

    const sets: CompletedSet[] = [
      { ...makeSet('s1', 'ei-1'), actualRestSeconds: 120 },
      { ...makeSet('s2', 'ei-1'), actualRestSeconds: 130 },
      { ...makeSet('s3', 'ei-1'), actualRestSeconds: 110 },
    ];

    const result = calculateRestAdherence(sets, exerciseInstances);
    expect(result.prescribedAvg).toBe(120);
    expect(result.actualAvg).toBe(120);
    expect(result.adherencePercent).toBe(100);
    expect(result.totalSetsWithRest).toBe(3);
  });

  it('returns 100% adherence for no rest data', () => {
    const result = calculateRestAdherence([], []);
    expect(result.adherencePercent).toBe(100);
    expect(result.totalSetsWithRest).toBe(0);
  });

  it('handles large rest deviations', () => {
    const exerciseInstances: WorkoutExerciseInstance[] = [
      makeEI('ei-1', 120),
    ];

    const sets: CompletedSet[] = [
      { ...makeSet('s1', 'ei-1'), actualRestSeconds: 240 },
    ];

    const result = calculateRestAdherence(sets, exerciseInstances);
    expect(result.adherencePercent).toBe(0);
  });
});

function makeEI(id: string, restTarget: number): WorkoutExerciseInstance {
  return {
    id,
    workoutInstanceId: 'inst-1',
    exerciseId: 'ex-1',
    templateExerciseId: 'te-1',
    originalExerciseId: null,
    orderIndex: 0,
    supersetGroup: null,
    restSecondsTarget: restTarget,
    notes: '',
  };
}

function makeSet(id: string, weiId: string): CompletedSet {
  return {
    id,
    workoutExerciseInstanceId: weiId,
    orderIndex: 0,
    setType: 'working',
    targetWeight: 80,
    targetRepMin: 8,
    targetRepMax: 12,
    targetRir: 2,
    actualWeight: 80,
    actualReps: 10,
    actualRir: null,
    actualRestSeconds: null,
    isAdditional: false,
    completedAt: '2026-01-01T10:10:00.000Z',
    notes: '',
  };
}
