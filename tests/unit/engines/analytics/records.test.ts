import { describe, it, expect } from 'vitest';
import { detectPersonalRecords } from '@/engines/analytics/records';
import type { CompletedSet, WorkoutExerciseInstance } from '@/types/entities';
import type { PersonalRecord } from '@/types/analytics';

describe('detectPersonalRecords', () => {
  const exerciseInstances: WorkoutExerciseInstance[] = [
    makeEI('ei-1', 'ex-bench'),
    makeEI('ei-2', 'ex-squat'),
  ];

  it('detects weight PR with no existing records', () => {
    const sets: CompletedSet[] = [
      makeSet('s1', 'ei-1', 80, 10),
    ];

    const result = detectPersonalRecords(sets, exerciseInstances, [], 'inst-1');

    const weightPR = result.find(r => r.exerciseId === 'ex-bench' && r.type === 'weight');
    expect(weightPR).toBeDefined();
    expect(weightPR!.value).toBe(80);
  });

  it('detects rep PR', () => {
    const sets: CompletedSet[] = [
      makeSet('s1', 'ei-1', 80, 12),
    ];

    const result = detectPersonalRecords(sets, exerciseInstances, [], 'inst-1');
    const repPR = result.find(r => r.exerciseId === 'ex-bench' && r.type === 'reps');
    expect(repPR).toBeDefined();
    expect(repPR!.value).toBe(12);
  });

  it('detects estimated 1RM PR', () => {
    const sets: CompletedSet[] = [
      makeSet('s1', 'ei-1', 100, 5),
    ];

    const result = detectPersonalRecords(sets, exerciseInstances, [], 'inst-1');
    const e1rmPR = result.find(r => r.exerciseId === 'ex-bench' && r.type === 'estimated_1rm');
    expect(e1rmPR).toBeDefined();
    expect(e1rmPR!.value).toBeGreaterThan(100);
  });

  it('detects volume PR', () => {
    const sets: CompletedSet[] = [
      makeSet('s1', 'ei-1', 80, 10),
      makeSet('s2', 'ei-1', 80, 10),
      makeSet('s3', 'ei-1', 80, 10),
    ];

    const result = detectPersonalRecords(sets, exerciseInstances, [], 'inst-1');
    const volPR = result.find(r => r.exerciseId === 'ex-bench' && r.type === 'volume');
    expect(volPR).toBeDefined();
    expect(volPR!.value).toBe(2400);
  });

  it('detects reps-at-weight PR', () => {
    const sets: CompletedSet[] = [
      makeSet('s1', 'ei-1', 80, 10),
    ];

    const result = detectPersonalRecords(sets, exerciseInstances, [], 'inst-1');
    const rawPR = result.find(r => r.exerciseId === 'ex-bench' && r.type === 'reps_at_weight');
    expect(rawPR).toBeDefined();
    expect(rawPR!.value).toBe(10);
    expect(rawPR!.weight).toBe(80);
  });

  it('does not create PRs that do not exceed existing records', () => {
    const existing: PersonalRecord[] = [
      makePR('ex-bench', 'weight', 100),
      makePR('ex-bench', 'reps', 15),
    ];

    const sets: CompletedSet[] = [
      makeSet('s1', 'ei-1', 80, 10),
    ];

    const result = detectPersonalRecords(sets, exerciseInstances, existing, 'inst-1');
    const weightPR = result.find(r => r.exerciseId === 'ex-bench' && r.type === 'weight');
    const repPR = result.find(r => r.exerciseId === 'ex-bench' && r.type === 'reps');
    expect(weightPR).toBeUndefined();
    expect(repPR).toBeUndefined();
  });

  it('creates PRs that exceed existing records', () => {
    const existing: PersonalRecord[] = [
      makePR('ex-bench', 'weight', 75),
    ];

    const sets: CompletedSet[] = [
      makeSet('s1', 'ei-1', 80, 10),
    ];

    const result = detectPersonalRecords(sets, exerciseInstances, existing, 'inst-1');
    const weightPR = result.find(r => r.exerciseId === 'ex-bench' && r.type === 'weight');
    expect(weightPR).toBeDefined();
    expect(weightPR!.value).toBe(80);
  });

  it('excludes warmup sets from PR detection', () => {
    const sets: CompletedSet[] = [
      { ...makeSet('s1', 'ei-1', 200, 20), setType: 'warmup' },
      makeSet('s2', 'ei-1', 80, 10),
    ];

    const result = detectPersonalRecords(sets, exerciseInstances, [], 'inst-1');
    const weightPR = result.find(r => r.exerciseId === 'ex-bench' && r.type === 'weight');
    expect(weightPR!.value).toBe(80);
  });

  it('handles multiple exercises independently', () => {
    const sets: CompletedSet[] = [
      makeSet('s1', 'ei-1', 80, 10),
      makeSet('s2', 'ei-2', 120, 5),
    ];

    const result = detectPersonalRecords(sets, exerciseInstances, [], 'inst-1');
    const benchWeight = result.find(r => r.exerciseId === 'ex-bench' && r.type === 'weight');
    const squatWeight = result.find(r => r.exerciseId === 'ex-squat' && r.type === 'weight');
    expect(benchWeight!.value).toBe(80);
    expect(squatWeight!.value).toBe(120);
  });
});

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

function makePR(exerciseId: string, type: PersonalRecord['type'], value: number): PersonalRecord {
  return {
    id: `pr-${exerciseId}-${type}`,
    exerciseId,
    type,
    value,
    weight: type === 'weight' ? value : 80,
    reps: type === 'reps' ? value : 10,
    completedSetId: 'set-old',
    workoutInstanceId: 'inst-old',
    achievedAt: '2025-12-01T10:00:00.000Z',
    createdAt: '2025-12-01T10:00:00.000Z',
  };
}
