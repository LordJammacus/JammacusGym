import { describe, it, expect } from 'vitest';
import { calculatePerformanceTrend, detectStagnation } from '@/engines/analytics/performance';
import type { ExerciseProgressionPoint } from '@/types/analytics';

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
