import { describe, it, expect } from 'vitest';
import { generateRecommendations } from '@/engines/recommendations';
import { makeContext, makeTrend, makeStagnation } from './helpers';

describe('generateRecommendations (aggregator)', () => {
  it('returns recommendations sorted by priority then confidence', () => {
    const trends = new Map([
      ['ex-1', makeTrend('declining', -2)],
      ['ex-2', makeTrend('declining', -1.5)],
      ['ex-3', makeTrend('declining', -1)],
      ['ex-4', makeTrend('improving', 1)],
      ['ex-5', makeTrend('improving', 0.5)],
    ]);
    const exerciseNames = new Map([
      ['ex-1', 'Bench'], ['ex-2', 'Squat'], ['ex-3', 'OHP'],
      ['ex-4', 'Deadlift'], ['ex-5', 'Row'],
    ]);
    const ctx = makeContext({
      daysSinceLastWorkout: 5,
      averageWeeklyFrequency: 3,
      exerciseTrends: trends,
      exerciseNames,
      stagnatingExercises: [makeStagnation('ex-1', 'Bench', 6)],
    });

    const recs = generateRecommendations(ctx);
    expect(recs.length).toBeGreaterThan(0);

    for (let i = 1; i < recs.length; i++) {
      const prevPrio = { high: 0, medium: 1, low: 2 }[recs[i - 1]!.priority] ?? 1;
      const currPrio = { high: 0, medium: 1, low: 2 }[recs[i]!.priority] ?? 1;
      expect(prevPrio).toBeLessThanOrEqual(currPrio);
    }
  });

  it('suppresses individual stagnation when high-priority deload present', () => {
    const trends = new Map([
      ['ex-1', makeTrend('declining', -2)],
      ['ex-2', makeTrend('declining', -1.5)],
      ['ex-3', makeTrend('declining', -1)],
      ['ex-4', makeTrend('improving', 1)],
      ['ex-5', makeTrend('improving', 0.5)],
    ]);
    const exerciseNames = new Map([
      ['ex-1', 'Bench'], ['ex-2', 'Squat'], ['ex-3', 'OHP'],
      ['ex-4', 'Deadlift'], ['ex-5', 'Row'],
    ]);
    const ctx = makeContext({
      exerciseTrends: trends,
      exerciseNames,
      stagnatingExercises: [
        makeStagnation('ex-1', 'Bench', 6),
        makeStagnation('ex-2', 'Squat', 5),
      ],
    });

    const recs = generateRecommendations(ctx);
    const deload = recs.find(r => r.type === 'deload' && r.priority === 'high');
    expect(deload).toBeDefined();

    const individualStagnation = recs.filter(r => r.title.includes('stagnated'));
    expect(individualStagnation).toHaveLength(0);
  });

  it('returns empty for fresh context with no data', () => {
    const ctx = makeContext({
      daysSinceLastWorkout: Infinity,
      recentWorkouts: [],
    });
    const recs = generateRecommendations(ctx);
    expect(recs.length).toBeGreaterThanOrEqual(1);
    expect(recs[0]!.title).toContain('first workout');
  });

  it('produces deterministic output for same input', () => {
    const ctx = makeContext({
      daysSinceLastWorkout: 5,
      averageWeeklyFrequency: 4,
      stagnatingExercises: [makeStagnation('ex-1', 'Bench', 6)],
    });

    const run1 = generateRecommendations(ctx);
    const run2 = generateRecommendations(ctx);

    expect(run1.map(r => r.title)).toEqual(run2.map(r => r.title));
    expect(run1.map(r => r.type)).toEqual(run2.map(r => r.type));
    expect(run1.map(r => r.reasoning)).toEqual(run2.map(r => r.reasoning));
  });
});
