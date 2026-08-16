import type { TrainingContext } from '@/types/recommendations';
import type { PerformanceTrendResult, MuscleVolumeEntry, StagnationResult } from '@/types/analytics';

/**
 * Creates a minimal TrainingContext with sensible defaults.
 * Override any field via the partial.
 */
export function makeContext(overrides: Partial<TrainingContext> = {}): TrainingContext {
  return {
    recentWorkouts: [],
    allSets: [],
    exerciseInstances: [],
    exerciseMuscles: [],
    muscleNames: new Map(),
    exerciseNames: new Map(),
    muscleVolume: [],
    rollingVolume: { window: 7, totalSets: 0, totalVolume: 0, avgSetsPerDay: 0 },
    exerciseTrends: new Map(),
    stagnatingExercises: [],
    currentProgram: null,
    currentBlock: null,
    blockWorkouts: [],
    daysSinceLastWorkout: 1,
    daysSinceMuscleGroupTrained: new Map(),
    averageWeeklyFrequency: 3,
    recoveryLogs: [],
    recentFatigueScore: null,
    availableTrainingDays: [1, 2, 3, 4, 5, 6],
    now: '2026-08-10T12:00:00.000Z',
    ...overrides,
  };
}

export function makeTrend(
  direction: PerformanceTrendResult['direction'],
  slope = 0,
): PerformanceTrendResult {
  return { slope, direction, dataPoints: 8, movingAverages: [], volumeMovingAverages: [] };
}

export function makeVolume(
  muscleName: string,
  totalWeightedSets: number,
  muscleGroupId = muscleName.toLowerCase(),
): MuscleVolumeEntry {
  return {
    muscleGroupId,
    muscleName,
    directSets: totalWeightedSets,
    indirectSets: 0,
    totalWeightedSets,
  };
}

export function makeStagnation(
  exerciseId: string,
  exerciseName: string,
  sessions: number,
): StagnationResult {
  return {
    exerciseId,
    exerciseName,
    sessionsSinceProgress: sessions,
    isStagnating: sessions >= 4,
    lastProgressDate: '2026-06-01',
  };
}
