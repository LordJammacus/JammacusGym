import type {
  ExerciseProgressionPoint,
  PerformanceTrendResult,
  StagnationResult,
  MetricDelta,
  SessionComparisonPoint,
  ExerciseProgressSummary,
  WorkoutExerciseDelta,
  LatestWorkoutComparison,
} from '@/types/analytics';
import type { WorkoutInstance, WorkoutExerciseInstance } from '@/types/entities';

/**
 * Calculate performance trend using linear regression on estimated 1RM data.
 * Returns slope (positive = improving), direction label, and moving averages.
 */
export function calculatePerformanceTrend(
  points: ExerciseProgressionPoint[],
  movingAvgWindow: number = 3,
): PerformanceTrendResult {
  if (points.length < 2) {
    return {
      slope: 0,
      direction: 'stagnating',
      dataPoints: points.length,
      movingAverages: points.map(p => ({ date: p.date, value: p.estimated1RM })),
    };
  }

  const values = points.map(p => p.estimated1RM);

  // Linear regression on index -> estimated 1RM
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i]!;
    sumXY += i * values[i]!;
    sumXX += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  // Moving averages
  const movingAverages: { date: string; value: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    const windowStart = Math.max(0, i - movingAvgWindow + 1);
    const windowSlice = values.slice(windowStart, i + 1);
    const avg = windowSlice.reduce((a, b) => a + b, 0) / windowSlice.length;
    movingAverages.push({ date: points[i]!.date, value: Math.round(avg * 10) / 10 });
  }

  const avgValue = sumY / n;
  const normalizedSlope = avgValue > 0 ? slope / avgValue : 0;

  let direction: PerformanceTrendResult['direction'];
  if (normalizedSlope > 0.01) {
    direction = 'improving';
  } else if (normalizedSlope < -0.01) {
    direction = 'declining';
  } else {
    direction = 'stagnating';
  }

  return {
    slope: Math.round(slope * 100) / 100,
    direction,
    dataPoints: n,
    movingAverages,
  };
}

/**
 * Detect stagnation: exercise hasn't improved estimated 1RM over last N sessions.
 */
export function detectStagnation(
  points: ExerciseProgressionPoint[],
  exerciseId: string,
  exerciseName: string,
  minSessions: number = 4,
): StagnationResult {
  if (points.length < minSessions) {
    return {
      exerciseId,
      exerciseName,
      sessionsSinceProgress: 0,
      isStagnating: false,
      lastProgressDate: null,
    };
  }

  let lastProgressIdx = 0;
  let peak1RM = points[0]!.estimated1RM;

  for (let i = 1; i < points.length; i++) {
    if (points[i]!.estimated1RM > peak1RM * 1.005) {
      peak1RM = points[i]!.estimated1RM;
      lastProgressIdx = i;
    }
  }

  const sessionsSinceProgress = points.length - 1 - lastProgressIdx;

  return {
    exerciseId,
    exerciseName,
    sessionsSinceProgress,
    isStagnating: sessionsSinceProgress >= minSessions,
    lastProgressDate: points[lastProgressIdx]!.date,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function metricDelta(
  current: ExerciseProgressionPoint,
  previous: ExerciseProgressionPoint,
): MetricDelta {
  return {
    weight: round1(current.weight - previous.weight),
    reps: current.reps - previous.reps,
    estimated1RM: round1(current.estimated1RM - previous.estimated1RM),
    volumeLoad: Math.round(current.volumeLoad - previous.volumeLoad),
  };
}

/** One row per session with deltas vs the previous session of the same exercise. */
export function compareSessions(points: ExerciseProgressionPoint[]): SessionComparisonPoint[] {
  return points.map((point, i) => ({
    date: point.date,
    weight: point.weight,
    reps: point.reps,
    estimated1RM: point.estimated1RM,
    volumeLoad: point.volumeLoad,
    vsPrevious: i > 0 ? metricDelta(point, points[i - 1]!) : null,
  }));
}

export function summarizeExerciseProgress(
  points: ExerciseProgressionPoint[],
  exerciseId: string,
  exerciseName: string,
): ExerciseProgressSummary | null {
  if (points.length === 0) return null;

  const latest = points[points.length - 1]!;
  const first = points[0]!;
  const previous = points.length > 1 ? points[points.length - 2]! : null;

  return {
    exerciseId,
    exerciseName,
    sessionCount: points.length,
    latest,
    previous,
    first,
    vsPrevious: previous ? metricDelta(latest, previous) : null,
    vsPeriodStart: metricDelta(latest, first),
    trend: calculatePerformanceTrend(points),
    stagnation: detectStagnation(points, exerciseId, exerciseName),
  };
}

const TREND_ORDER: Record<PerformanceTrendResult['direction'], number> = {
  improving: 0,
  stagnating: 1,
  declining: 2,
};

export function summarizeAllExercises(
  progressions: Map<string, ExerciseProgressionPoint[]>,
  exerciseNames: Map<string, string>,
): ExerciseProgressSummary[] {
  const summaries: ExerciseProgressSummary[] = [];
  for (const [exerciseId, points] of progressions) {
    const summary = summarizeExerciseProgress(
      points,
      exerciseId,
      exerciseNames.get(exerciseId) ?? 'Unknown',
    );
    if (summary) summaries.push(summary);
  }

  return summaries.sort((a, b) => {
    const dir = TREND_ORDER[a.trend.direction] - TREND_ORDER[b.trend.direction];
    if (dir !== 0) return dir;
    return b.vsPeriodStart.estimated1RM - a.vsPeriodStart.estimated1RM;
  });
}

/**
 * Workout-to-workout view: each exercise from the most recent session
 * compared with the previous time that exercise was trained.
 */
export function getLatestWorkoutDeltas(
  instances: WorkoutInstance[],
  exerciseInstances: WorkoutExerciseInstance[],
  progressions: Map<string, ExerciseProgressionPoint[]>,
  exerciseNames: Map<string, string>,
): LatestWorkoutComparison | null {
  if (instances.length === 0) return null;

  const latest = instances[instances.length - 1]!;
  const latestExerciseIds = exerciseInstances
    .filter(ei => ei.workoutInstanceId === latest.id)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(ei => ei.exerciseId);

  const seen = new Set<string>();
  const exercises: WorkoutExerciseDelta[] = [];

  for (const exerciseId of latestExerciseIds) {
    if (seen.has(exerciseId)) continue;
    seen.add(exerciseId);

    const points = progressions.get(exerciseId);
    if (!points || points.length === 0) continue;

    const current = points[points.length - 1]!;
    const previous = points.length > 1 ? points[points.length - 2]! : null;

    exercises.push({
      exerciseId,
      exerciseName: exerciseNames.get(exerciseId) ?? 'Unknown',
      current,
      previous,
      vsPrevious: previous ? metricDelta(current, previous) : null,
    });
  }

  if (exercises.length === 0) return null;

  return {
    workoutName: latest.templateName,
    date: latest.startedAt.split('T')[0]!,
    exercises,
  };
}
