import type {
  ExerciseProgressionPoint,
  PerformanceTrendResult,
  StagnationResult,
  MetricDelta,
  SessionComparisonPoint,
  ExerciseProgressSummary,
  WorkoutExerciseDelta,
  LatestWorkoutComparison,
  SessionSetSnapshot,
} from '@/types/analytics';
import type { WorkoutInstance, WorkoutExerciseInstance } from '@/types/entities';

const SLOPE_THRESHOLD = 0.01;
const WEIGHT_SLOPE_THRESHOLD = 0.005;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function movingAverages(
  points: ExerciseProgressionPoint[],
  values: number[],
  window: number,
): { date: string; value: number }[] {
  const result: { date: string; value: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    const windowStart = Math.max(0, i - window + 1);
    const windowSlice = values.slice(windowStart, i + 1);
    const avg = windowSlice.reduce((a, b) => a + b, 0) / windowSlice.length;
    result.push({ date: points[i]!.date, value: round1(avg) });
  }
  return result;
}

function normalizedSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i]!;
    sumXY += i * values[i]!;
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const avg = sumY / n;
  return avg > 0 ? slope / avg : 0;
}

function rawSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i]!;
    sumXY += i * values[i]!;
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Trend uses peak e1RM, working weight, total reps, and volume.
 * Filling in later sets at the same load counts as improving.
 */
export function calculatePerformanceTrend(
  points: ExerciseProgressionPoint[],
  movingAvgWindow: number = 3,
): PerformanceTrendResult {
  const e1rms = points.map(p => p.estimated1RM);
  const volumes = points.map(p => p.volumeLoad);
  const e1rmAverages = movingAverages(points, e1rms, movingAvgWindow);
  const volumeAverages = movingAverages(points, volumes, movingAvgWindow);

  if (points.length < 2) {
    return {
      slope: 0,
      direction: 'stagnating',
      dataPoints: points.length,
      movingAverages: e1rmAverages,
      volumeMovingAverages: volumeAverages,
    };
  }

  const e1rmSlope = normalizedSlope(e1rms);
  const weightSlope = normalizedSlope(points.map(p => p.weight));
  const volumeSlope = normalizedSlope(volumes);
  const repsSlope = normalizedSlope(points.map(p => p.totalReps));
  const slope = rawSlope(e1rms);

  const intensityUp = e1rmSlope > SLOPE_THRESHOLD || weightSlope > WEIGHT_SLOPE_THRESHOLD;
  const volumeUp = volumeSlope > SLOPE_THRESHOLD || repsSlope > SLOPE_THRESHOLD;
  const intensityDown = e1rmSlope < -SLOPE_THRESHOLD && weightSlope < -WEIGHT_SLOPE_THRESHOLD;
  const volumeDown = volumeSlope < -SLOPE_THRESHOLD && repsSlope < -SLOPE_THRESHOLD;

  let direction: PerformanceTrendResult['direction'];
  if (intensityUp || volumeUp) {
    direction = 'improving';
  } else if (intensityDown && volumeDown) {
    direction = 'declining';
  } else {
    direction = 'stagnating';
  }

  return {
    slope: Math.round(slope * 100) / 100,
    direction,
    dataPoints: points.length,
    movingAverages: e1rmAverages,
    volumeMovingAverages: volumeAverages,
  };
}

export function hasSetMatchedProgress(
  current: SessionSetSnapshot[],
  previous: SessionSetSnapshot[],
): boolean {
  const n = Math.min(current.length, previous.length);
  for (let i = 0; i < n; i++) {
    const c = current[i]!;
    const p = previous[i]!;
    if (c.weight > p.weight) return true;
    if (c.weight >= p.weight && c.reps > p.reps) return true;
  }
  if (current.length > previous.length) {
    return current.slice(previous.length).some(s => s.weight > 0 && s.reps > 0);
  }
  return false;
}

/** True when the current session beats `baseline` on peak, volume, or any later set. */
export function sessionImproved(
  current: ExerciseProgressionPoint,
  baseline: ExerciseProgressionPoint,
): boolean {
  if (current.weight > baseline.weight) return true;
  if (current.estimated1RM > baseline.estimated1RM * 1.005) return true;
  if (current.volumeLoad > baseline.volumeLoad * 1.01) return true;
  if (current.totalReps > baseline.totalReps && current.avgWeight >= baseline.avgWeight * 0.99) {
    return true;
  }
  if (
    current.minReps > baseline.minReps
    && current.workingSets >= baseline.workingSets
    && current.avgWeight >= baseline.avgWeight * 0.99
  ) {
    return true;
  }
  return hasSetMatchedProgress(current.sets, baseline.sets);
}

/**
 * Stagnation: no new best on peak, volume, total reps, or set-matched performance.
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

  let best = points[0]!;
  let lastProgressIdx = 0;

  for (let i = 1; i < points.length; i++) {
    if (sessionImproved(points[i]!, best)) {
      best = points[i]!;
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

export function metricDelta(
  current: ExerciseProgressionPoint,
  previous: ExerciseProgressionPoint,
): MetricDelta {
  return {
    weight: round1(current.weight - previous.weight),
    reps: current.reps - previous.reps,
    estimated1RM: round1(current.estimated1RM - previous.estimated1RM),
    volumeLoad: Math.round(current.volumeLoad - previous.volumeLoad),
    totalReps: current.totalReps - previous.totalReps,
    avgReps: round1(current.avgReps - previous.avgReps),
    minReps: current.minReps - previous.minReps,
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
    totalReps: point.totalReps,
    avgReps: point.avgReps,
    minReps: point.minReps,
    workingSets: point.workingSets,
    sets: point.sets,
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

function progressMagnitude(delta: MetricDelta): number {
  return Math.max(
    Math.abs(delta.estimated1RM),
    Math.abs(delta.volumeLoad) / 100,
    Math.abs(delta.totalReps),
  );
}

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
    return progressMagnitude(b.vsPeriodStart) - progressMagnitude(a.vsPeriodStart);
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
