import type { ExerciseProgressionPoint } from '@/types/analytics';
import type { PerformanceTrendResult, StagnationResult } from '@/types/analytics';

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
