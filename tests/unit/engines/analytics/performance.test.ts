import { describe, it, expect } from 'vitest';
import {
  calculatePerformanceTrend,
  detectStagnation,
  compareSessions,
  summarizeExerciseProgress,
  summarizeAllExercises,
  getLatestWorkoutDeltas,
  sessionImproved,
  hasSetMatchedProgress,
} from '@/engines/analytics/performance';
import type { ExerciseProgressionPoint, SessionSetSnapshot } from '@/types/analytics';
import type { WorkoutInstance, WorkoutExerciseInstance } from '@/types/entities';

function pt(
  date: string,
  weight: number,
  reps: number,
  estimated1RM: number,
  volumeLoad: number,
  extras: Partial<ExerciseProgressionPoint> = {},
): ExerciseProgressionPoint {
  const sets = extras.sets ?? [{ orderIndex: 0, weight, reps }];
  const totalReps = extras.totalReps ?? sets.reduce((a, s) => a + s.reps, 0);
  const workingSets = extras.workingSets ?? sets.length;
  return {
    date,
    weight,
    reps,
    estimated1RM,
    volumeLoad,
    totalReps,
    workingSets,
    avgReps: extras.avgReps ?? (workingSets > 0 ? Math.round((totalReps / workingSets) * 10) / 10 : 0),
    minReps: extras.minReps ?? (sets.length > 0 ? Math.min(...sets.map(s => s.reps)) : reps),
    avgWeight: extras.avgWeight ?? weight,
    sets,
  };
}

function setsAt(weight: number, reps: number[]): SessionSetSnapshot[] {
  return reps.map((r, i) => ({ orderIndex: i, weight, reps: r }));
}

describe('calculatePerformanceTrend', () => {
  it('detects improving trend', () => {
    const points = [
      pt('2026-01-01', 80, 10, 106.7, 2400),
      pt('2026-01-08', 82.5, 10, 110, 2475),
      pt('2026-01-15', 85, 10, 113.3, 2550),
      pt('2026-01-22', 87.5, 10, 116.7, 2625),
    ];

    const result = calculatePerformanceTrend(points);
    expect(result.direction).toBe('improving');
    expect(result.slope).toBeGreaterThan(0);
    expect(result.dataPoints).toBe(4);
  });

  it('detects declining trend', () => {
    const points = [
      pt('2026-01-01', 90, 10, 120, 2700),
      pt('2026-01-08', 87.5, 10, 116.7, 2625),
      pt('2026-01-15', 85, 9, 110.5, 2295),
      pt('2026-01-22', 82.5, 8, 104.5, 1980),
    ];

    const result = calculatePerformanceTrend(points);
    expect(result.direction).toBe('declining');
    expect(result.slope).toBeLessThan(0);
  });

  it('detects stagnation', () => {
    const points = [
      pt('2026-01-01', 80, 10, 106.7, 2400),
      pt('2026-01-08', 80, 10, 106.7, 2400),
      pt('2026-01-15', 80, 10, 106.7, 2400),
      pt('2026-01-22', 80, 10, 106.7, 2400),
    ];

    const result = calculatePerformanceTrend(points);
    expect(result.direction).toBe('stagnating');
    expect(result.slope).toBe(0);
  });

  it('treats later-set rep gains as improving even when the best set is unchanged', () => {
    const points = [
      pt('2026-01-01', 80, 12, 112, 3360, {
        sets: setsAt(80, [12, 11, 10, 9]),
        totalReps: 42,
        volumeLoad: 3360,
      }),
      pt('2026-01-08', 80, 12, 112, 3440, {
        sets: setsAt(80, [12, 12, 10, 9]),
        totalReps: 43,
        volumeLoad: 3440,
      }),
      pt('2026-01-15', 80, 12, 112, 3600, {
        sets: setsAt(80, [12, 12, 11, 10]),
        totalReps: 45,
        volumeLoad: 3600,
      }),
      pt('2026-01-22', 80, 12, 112, 3840, {
        sets: setsAt(80, [12, 12, 12, 12]),
        totalReps: 48,
        volumeLoad: 3840,
      }),
    ];

    const result = calculatePerformanceTrend(points);
    expect(result.direction).toBe('improving');
  });

  it('treats a weight increase as improving when reps and volume drop', () => {
    const points = [
      pt('2026-01-01', 80, 12, 112, 3840, { totalReps: 48, sets: setsAt(80, [12, 12, 12, 12]) }),
      pt('2026-01-08', 82.5, 8, 104.5, 2640, { totalReps: 32, sets: setsAt(82.5, [8, 8, 8, 8]) }),
    ];

    const result = calculatePerformanceTrend(points);
    expect(result.direction).toBe('improving');
  });

  it('handles single data point', () => {
    const points = [
      pt('2026-01-01', 80, 10, 106.7, 2400),
    ];

    const result = calculatePerformanceTrend(points);
    expect(result.direction).toBe('stagnating');
    expect(result.dataPoints).toBe(1);
  });

  it('calculates moving averages', () => {
    const points = [
      pt('2026-01-01', 80, 10, 100, 2400),
      pt('2026-01-08', 80, 10, 110, 2400),
      pt('2026-01-15', 80, 10, 105, 2400),
    ];

    const result = calculatePerformanceTrend(points, 2);
    expect(result.movingAverages).toHaveLength(3);
    expect(result.movingAverages[0]!.value).toBe(100);
    expect(result.movingAverages[1]!.value).toBe(105);
    expect(result.movingAverages[2]!.value).toBe(107.5);
    expect(result.volumeMovingAverages).toHaveLength(3);
    expect(result.volumeMovingAverages[0]!.value).toBe(2400);
  });
});

describe('sessionImproved', () => {
  it('counts an extra rep on a later set as progress', () => {
    const previous = pt('2026-01-01', 80, 12, 112, 3360, {
      sets: setsAt(80, [12, 11, 10, 9]),
      totalReps: 42,
    });
    const current = pt('2026-01-08', 80, 12, 112, 3440, {
      sets: setsAt(80, [12, 12, 10, 9]),
      totalReps: 43,
    });
    expect(sessionImproved(current, previous)).toBe(true);
  });

  it('does not count an identical session as progress', () => {
    const previous = pt('2026-01-01', 80, 12, 112, 3360, {
      sets: setsAt(80, [12, 11, 10, 9]),
      totalReps: 42,
    });
    const current = pt('2026-01-08', 80, 12, 112, 3360, {
      sets: setsAt(80, [12, 11, 10, 9]),
      totalReps: 42,
    });
    expect(sessionImproved(current, previous)).toBe(false);
  });
});

describe('hasSetMatchedProgress', () => {
  it('detects a rep added to set 3', () => {
    expect(hasSetMatchedProgress(
      setsAt(80, [12, 11, 11, 9]),
      setsAt(80, [12, 11, 10, 9]),
    )).toBe(true);
  });

  it('detects an extra working set', () => {
    expect(hasSetMatchedProgress(
      setsAt(80, [12, 11, 10, 9]),
      setsAt(80, [12, 11, 10]),
    )).toBe(true);
  });

  it('returns false when every set is equal or worse', () => {
    expect(hasSetMatchedProgress(
      setsAt(80, [12, 10, 10, 8]),
      setsAt(80, [12, 11, 10, 9]),
    )).toBe(false);
  });
});

describe('detectStagnation', () => {
  it('detects stagnation when no improvement over N sessions', () => {
    const points = [
      pt('2026-01-01', 80, 10, 106.7, 2400),
      pt('2026-01-08', 80, 10, 106.7, 2400),
      pt('2026-01-15', 80, 9, 104, 2160),
      pt('2026-01-22', 80, 10, 106.7, 2400),
      pt('2026-01-29', 80, 10, 106.7, 2400),
    ];

    const result = detectStagnation(points, 'ex-1', 'Bench Press', 4);
    expect(result.isStagnating).toBe(true);
    expect(result.sessionsSinceProgress).toBe(4);
  });

  it('does not flag stagnation with recent progress', () => {
    const points = [
      pt('2026-01-01', 80, 10, 106.7, 2400),
      pt('2026-01-08', 80, 10, 106.7, 2400),
      pt('2026-01-15', 80, 10, 106.7, 2400),
      pt('2026-01-22', 85, 10, 113.3, 2550),
    ];

    const result = detectStagnation(points, 'ex-1', 'Bench Press', 4);
    expect(result.isStagnating).toBe(false);
    expect(result.sessionsSinceProgress).toBe(0);
  });

  it('does not flag stagnation when later sets improve', () => {
    const points = [
      pt('2026-01-01', 80, 12, 112, 3360, { sets: setsAt(80, [12, 11, 10, 9]), totalReps: 42 }),
      pt('2026-01-08', 80, 12, 112, 3360, { sets: setsAt(80, [12, 11, 10, 9]), totalReps: 42 }),
      pt('2026-01-15', 80, 12, 112, 3360, { sets: setsAt(80, [12, 11, 10, 9]), totalReps: 42 }),
      pt('2026-01-22', 80, 12, 112, 3440, { sets: setsAt(80, [12, 12, 10, 9]), totalReps: 43 }),
    ];

    const result = detectStagnation(points, 'ex-1', 'Bench Press', 4);
    expect(result.isStagnating).toBe(false);
    expect(result.sessionsSinceProgress).toBe(0);
  });

  it('returns not stagnating for insufficient data', () => {
    const points = [
      pt('2026-01-01', 80, 10, 106.7, 2400),
    ];

    const result = detectStagnation(points, 'ex-1', 'Bench Press', 4);
    expect(result.isStagnating).toBe(false);
  });
});

describe('compareSessions', () => {
  it('returns null deltas for the first session', () => {
    const points = [
      pt('2026-01-01', 80, 10, 106.7, 2400),
    ];
    const result = compareSessions(points);
    expect(result).toHaveLength(1);
    expect(result[0]!.vsPrevious).toBeNull();
  });

  it('computes workout-to-workout deltas including total reps', () => {
    const points = [
      pt('2026-01-01', 80, 8, 101.3, 1920),
      pt('2026-01-08', 82.5, 10, 110, 2475),
    ];
    const result = compareSessions(points);
    expect(result[1]!.vsPrevious).toEqual({
      weight: 2.5,
      reps: 2,
      estimated1RM: 8.7,
      volumeLoad: 555,
      totalReps: 2,
      avgReps: 2,
      minReps: 2,
    });
  });
});

describe('summarizeExerciseProgress', () => {
  it('returns null for empty history', () => {
    expect(summarizeExerciseProgress([], 'ex-1', 'Bench')).toBeNull();
  });

  it('summarises last session vs previous and period start', () => {
    const points = [
      pt('2026-01-01', 80, 10, 106.7, 2400),
      pt('2026-01-08', 82.5, 10, 110, 2475),
      pt('2026-01-15', 85, 10, 113.3, 2550),
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
        pt('2026-01-01', 20, 12, 28, 720),
        pt('2026-01-08', 20, 12, 28, 720),
      ]],
      ['ex-up', [
        pt('2026-01-01', 80, 8, 101.3, 1920),
        pt('2026-01-08', 90, 8, 114, 2160),
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
        pt('2026-01-01', 80, 8, 101.3, 1920),
        pt('2026-01-08', 82.5, 8, 104.5, 1980),
      ]],
      ['ex-ohp', [
        pt('2026-01-08', 40, 10, 53.3, 1200),
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
