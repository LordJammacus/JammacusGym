import type { CompletedSet, SetTarget, ProgressionRule, UserSettings } from '@/types/entities';
import type { ProgressionStrategy } from '@/types/enums';

let idCounter = 0;
const nextId = () => `test-${++idCounter}`;

export function resetIds() {
  idCounter = 0;
}

export function makeSettings(overrides?: Partial<UserSettings>): UserSettings {
  return {
    id: 'default',
    units: 'kg',
    weekStartDay: 1,
    defaultRestSeconds: 120,
    restTimerAdjustSeconds: 15,
    defaultRir: 2,
    defaultProgressionStrategy: 'double',
    theme: 'dark',
    weightIncrement: 2.5,
    availableTrainingDays: [1, 2, 3, 4, 5, 6],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeRule(overrides?: Partial<ProgressionRule>): ProgressionRule {
  return {
    id: nextId(),
    name: 'Test Rule',
    strategy: 'double' as ProgressionStrategy,
    weightIncrement: 2.5,
    repThreshold: null,
    requiredConsecutiveSuccess: 1,
    deloadPercentage: 10,
    deloadAfterFailures: 3,
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeTarget(overrides?: Partial<SetTarget>): SetTarget {
  return {
    id: nextId(),
    templateExerciseId: 'te-1',
    orderIndex: 0,
    setType: 'working',
    targetWeight: 60,
    targetRepMin: 8,
    targetRepMax: 12,
    targetRir: 2,
    ...overrides,
  };
}

export function makeTargets(count: number, overrides?: Partial<SetTarget>): SetTarget[] {
  return Array.from({ length: count }, (_, i) =>
    makeTarget({ orderIndex: i, ...overrides }),
  );
}

export function makeCompletedSet(overrides?: Partial<CompletedSet>): CompletedSet {
  return {
    id: nextId(),
    workoutExerciseInstanceId: 'wei-1',
    orderIndex: 0,
    setType: 'working',
    targetWeight: 60,
    targetRepMin: 8,
    targetRepMax: 12,
    targetRir: 2,
    actualWeight: 60,
    actualReps: 10,
    actualRir: null,
    actualRestSeconds: null,
    isAdditional: false,
    completedAt: '2026-01-01T00:00:00.000Z',
    notes: '',
    ...overrides,
  };
}

export function makeSession(reps: number, weight: number, setCount = 3): CompletedSet[] {
  return Array.from({ length: setCount }, (_, i) =>
    makeCompletedSet({
      orderIndex: i,
      actualWeight: weight,
      actualReps: reps,
      targetWeight: weight,
    }),
  );
}

export function makeSessionWithRir(reps: number, weight: number, rir: number, setCount = 3): CompletedSet[] {
  return Array.from({ length: setCount }, (_, i) =>
    makeCompletedSet({
      orderIndex: i,
      actualWeight: weight,
      actualReps: reps,
      actualRir: rir,
      targetWeight: weight,
    }),
  );
}
