import { describe, it, expect } from 'vitest';
import { deloadRecommender } from '@/engines/recommendations/deload';
import { makeContext, makeTrend } from './helpers';

describe('DeloadRecommender', () => {
  it('recommends deload when >40% of exercises declining', () => {
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
    const ctx = makeContext({ exerciseTrends: trends, exerciseNames });
    const recs = deloadRecommender.evaluate(ctx);
    const deload = recs.find(r => r.title === 'Deload recommended');
    expect(deload).toBeDefined();
    expect(deload!.priority).toBe('high');
    expect(deload!.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('suggests moderate deload when >60% stagnating/declining', () => {
    const trends = new Map([
      ['ex-1', makeTrend('declining', -1)],
      ['ex-2', makeTrend('stagnating')],
      ['ex-3', makeTrend('stagnating')],
      ['ex-4', makeTrend('improving', 1)],
    ]);
    const ctx = makeContext({ exerciseTrends: trends });
    const recs = deloadRecommender.evaluate(ctx);
    const consider = recs.find(r => r.title === 'Consider a deload');
    expect(consider).toBeDefined();
    expect(consider!.priority).toBe('medium');
  });

  it('flags overreaching with high volume + declining', () => {
    const trends = new Map([
      ['ex-1', makeTrend('declining', -1)],
      ['ex-2', makeTrend('improving', 1)],
    ]);
    const ctx = makeContext({
      exerciseTrends: trends,
      rollingVolume: { window: 7, totalSets: 80, totalVolume: 50000, avgSetsPerDay: 11 },
    });
    const recs = deloadRecommender.evaluate(ctx);
    const over = recs.find(r => r.title === 'Possible overreaching');
    expect(over).toBeDefined();
  });

  it('returns empty when all exercises improving', () => {
    const trends = new Map([
      ['ex-1', makeTrend('improving', 2)],
      ['ex-2', makeTrend('improving', 1)],
      ['ex-3', makeTrend('improving', 0.5)],
    ]);
    const ctx = makeContext({ exerciseTrends: trends });
    const recs = deloadRecommender.evaluate(ctx);
    expect(recs).toHaveLength(0);
  });

  it('returns empty with insufficient data', () => {
    const ctx = makeContext({ exerciseTrends: new Map([['ex-1', makeTrend('declining')]]) });
    const recs = deloadRecommender.evaluate(ctx);
    expect(recs).toHaveLength(0);
  });
});
