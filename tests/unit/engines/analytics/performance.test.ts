import { describe, it, expect } from 'vitest';
import {
  calculatePerformanceTrend,
  detectStagnation,
  compareSessions,
  summarizeExerciseProgress,
  summarizeAllExercises,
  getLatestWorkoutDeltas,
} from '@/engines/analytics/performance';
import type { ExerciseProgressionPoint } from '@/types/analytics';
import type { WorkoutInstance, WorkoutExerciseInstance } from '@/types/entities';

describe('calculatePerformanceTrend', () => {
  it('detects improving trend', () => {
    const points: ExerciseProgressionPoint[] = [
      { date: '2026-01-01', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
      { date: '2026-01-08', weight: 82.5, reps: 10, estimated1RM: 110, volumeLoad: 2475 },
      { date: '2026-01-15', weight: 85, reps: 10, estimated1RM: 113.3, volumeLoad: 2550 },
      { date: '2026-01-22', weight: 87.5, reps: 10, estimated1RM: 116.7, volumeLoad: 2625 },
    ];

    const result = calculatePerformanceTrend(points);
    expect(result.direction).toBe('improving');
    expect(result.slope).toBeGreaterThan(0);
    expect(result.dataPoints).toBe(4);
  });

  it('detects declining trend', () => {
    const points: ExerciseProgressionPoint[] = [
      { date: '2026-01-01', weight: 90, reps: 10, estimated1RM: 120, volumeLoad: 2700 },
      { date: '2026-01-08', weight: 87.5, reps: 10, estimated1RM: 116.7, volumeLoad: 2625 },
      { date: '2026-01-15', weight: 85, reps: 9, estimated1RM: 110.5, volumeLoad: 2295 },
      { date: '2026-01-22', weight: 82.5, reps: 8, estimated1RM: 104.5, volumeLoad: 1980 },
    ];

    const result = calculatePerformanceTrend(points);
    expect(result.direction).toBe('declining');
    expect(result.slope).toBeLessThan(0);
  });

  it('detects stagnation', () => {
    const points: ExerciseProgressionPoint[] = [
      { date: '2026-01-01', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
      { date: '2026-01-08', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
      { date: '2026-01-15', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
      { date: '2026-01-22', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
    ];

    const result = calculatePerformanceTrend(points);
    expect(result.direction).toBe('stagnating');
    expect(result.slope).toBe(0);
  });

  it('handles single data point', () => {
    const points: ExerciseProgressionPoint[] = [
      { date: '2026-01-01', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
    ];

    const result = calculatePerformanceTrend(points);
    expect(result.direction).toBe('stagnating');
    expect(result.dataPoints).toBe(1);
  });

  it('calculates moving averages', () => {
    const points: ExerciseProgressionPoint[] = [
      { date: '2026-01-01', weight: 80, reps: 10, estimated1RM: 100, volumeLoad: 2400 },
      { date: '2026-01-08', weight: 80, reps: 10, estimated1RM: 110, volumeLoad: 2400 },
      { date: '2026-01-15', weight: 80, reps: 10, estimated1RM: 105, volumeLoad: 2400 },
    ];

    const result = calculatePerformanceTrend(points, 2);
    expect(result.movingAverages).toHaveLength(3);
    expect(result.movingAverages[0]!.value).toBe(100);
    expect(result.movingAverages[1]!.value).toBe(105);
    expect(result.movingAverages[2]!.value).toBe(107.5);
  });
});

describe('detectStagnation', () => {
  it('detects stagnation when no improvement over N sessions', () => {
    const points: ExerciseProgressionPoint[] = [
      { date: '2026-01-01', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
      { date: '2026-01-08', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
      { date: '2026-01-15', weight: 80, reps: 9, estimated1RM: 104, volumeLoad: 2160 },
      { date: '2026-01-22', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
      { date: '2026-01-29', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
    ];

    const result = detectStagnation(points, 'ex-1', 'Bench Press', 4);
    expect(result.isStagnating).toBe(true);
    expect(result.sessionsSinceProgress).toBe(4);
  });

  it('does not flag stagnation with recent progress', () => {
    const points: ExerciseProgressionPoint[] = [
      { date: '2026-01-01', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
      { date: '2026-01-08', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
      { date: '2026-01-15', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
      { date: '2026-01-22', weight: 85, reps: 10, estimated1RM: 113.3, volumeLoad: 2550 },
    ];

    const result = detectStagnation(points, 'ex-1', 'Bench Press', 4);
    expect(result.isStagnating).toBe(false);
    expect(result.sessionsSinceProgress).toBe(0);
  });

  it('returns not stagnating for insufficient data', () => {
    const points: ExerciseProgressionPoint[] = [
      { date: '2026-01-01', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
    ];

    const result = detectStagnation(points, 'ex-1', 'Bench Press', 4);
    expect(result.isStagnating).toBe(false);
  });
});

describe('compareSessions', () => {
  it('returns null deltas for the first session', () => {
    const points: ExerciseProgressionPoint[] = [
      { date: '2026-01-01', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
    ];
    const result = compareSessions(points);
    expect(result).toHaveLength(1);
    expect(result[0]!.vsPrevious).toBeNull();
  });

  it('computes workout-to-workout deltas', () => {
    const points: ExerciseProgressionPoint[] = [
      { date: '2026-01-01', weight: 80, reps: 8, estimated1RM: 101.3, volumeLoad: 1920 },
      { date: '2026-01-08', weight: 82.5, reps: 10, estimated1RM: 110, volumeLoad: 2475 },
    ];
    const result = compareSessions(points);
    expect(result[1]!.vsPrevious).toEqual({
      weight: 2.5,
      reps: 2,
      estimated1RM: 8.7,
      volumeLoad: 555,
    });
  });
});

describe('summarizeExerciseProgress', () => {
  it('returns null for empty history', () => {
    expect(summarizeExerciseProgress([], 'ex-1', 'Bench')).toBeNull();
  });

  it('summarises last session vs previous and period start', () => {
    const points: ExerciseProgressionPoint[] = [
      { date: '2026-01-01', weight: 80, reps: 10, estimated1RM: 106.7, volumeLoad: 2400 },
      { date: '2026-01-08', weight: 82.5, reps: 10, estimated1RM: 110, volumeLoad: 2475 },
      { date: '2026-01-15', weight: 85, reps: 10, estimated1RM: 113.3, volumeLoad: 2550 },
    ];

    const result = summarizeExerciseProgress(points, 'ex-1', 'Bench Press');
    expect(result).not.toBeNull();
    expect(result!.sessionCount).toBe(3);
    expect(result!.latest.weight).toBe(85);
    expect(result!.vsPrevious!.weight).toBe(2.5);
    expect(result!.vsPeriodStart.weight).toBe(5);
    expect(result!.trend.direction).toBe('improving');
  });
});

describe('summarizeAllExercises', () => {
  it('ranks improving exercises first', () => {
    const progressions = new Map<string, ExerciseProgressionPoint[]>([
      ['ex-stall', [
        { date: '2026-01-01', weight: 20, reps: 12, estimated1RM: 28, volumeLoad: 720 },
        { date: '2026-01-08', weight: 20, reps: 12, estimated1RM: 28, volumeLoad: 720 },
      ]],
      ['ex-up', [
        { date: '2026-01-01', weight: 80, reps: 8, estimated1RM: 101.3, volumeLoad: 1920 },
        { date: '2026-01-08', weight: 90, reps: 8, estimated1RM: 114, volumeLoad: 2160 },
      ]],
    ]);
    const names = new Map([['ex-stall', 'Curl'], ['ex-up', 'Squat']]);
    const result = summarizeAllExercises(progressions, names);
    expect(result[0]!.exerciseId).toBe('ex-up');
    expect(result[1]!.exerciseId).toBe('ex-stall');
  });
});

describe('getLatestWorkoutDeltas', () => {
  it('compares each exercise in the latest workout with its previous session', () => {
    const instances: WorkoutInstance[] = [
      makeInstance('inst-1', '2026-01-01', 'Push A'),
      makeInstance('inst-2', '2026-01-08', 'Push B'),
    ];
    const exerciseInstances: WorkoutExerciseInstance[] = [
      makeEI('ei-1', 'inst-1', 'ex-bench', 0),
      makeEI('ei-2', 'inst-2', 'ex-bench', 0),
      makeEI('ei-3', 'inst-2', 'ex-ohp', 1),
    ];
    const progressions = new Map<string, ExerciseProgressionPoint[]>([
      ['ex-bench', [
        { date: '2026-01-01', weight: 80, reps: 8, estimated1RM: 101.3, volumeLoad: 1920 },
        { date: '2026-01-08', weight: 82.5, reps: 8, estimated1RM: 104.5, volumeLoad: 1980 },
      ]],
      ['ex-ohp', [
        { date: '2026-01-08', weight: 40, reps: 10, estimated1RM: 53.3, volumeLoad: 1200 },
      ]],
    ]);
    const names = new Map([['ex-bench', 'Bench'], ['ex-ohp', 'OHP']]);

    const result = getLatestWorkoutDeltas(instances, exerciseInstances, progressions, names);
    expect(result).not.toBeNull();
    expect(result!.workoutName).toBe('Push B');
    expect(result!.exercises).toHaveLength(2);
    expect(result!.exercises[0]!.vsPrevious!.weight).toBe(2.5);
    expect(result!.exercises[1]!.vsPrevious).toBeNull();
  });
});

function makeInstance(id: string, date: string, name: string): WorkoutInstance {
  return {
    id,
    workoutTemplateId: 'wt-1',
    programId: null,
    trainingBlockId: null,
    templateName: name,
    goal: 'hypertrophy',
    status: 'completed',
    startedAt: `${date}T10:00:00.000Z`,
    completedAt: `${date}T11:00:00.000Z`,
    durationSeconds: 3600,
    notes: '',
    createdAt: `${date}T10:00:00.000Z`,
  };
}

function makeEI(id: string, workoutInstanceId: string, exerciseId: string, orderIndex: number): WorkoutExerciseInstance {
  return {
    id,
    workoutInstanceId,
    exerciseId,
    templateExerciseId: 'te-1',
    originalExerciseId: null,
    orderIndex,
    supersetGroup: null,
    restSecondsTarget: 120,
    notes: '',
  };
}
