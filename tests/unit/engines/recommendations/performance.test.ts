import { describe, it, expect } from 'vitest';
import { performanceRecommender } from '@/engines/recommendations/performance';
import { makeContext, makeStagnation } from './helpers';

describe('PerformanceRecommender', () => {
  it('flags stagnating exercises', () => {
    const ctx = makeContext({
      stagnatingExercises: [makeStagnation('ex-1', 'Bench Press', 5)],
    });
    const recs = performanceRecommender.evaluate(ctx);
    expect(recs).toHaveLength(1);
    expect(recs[0]!.title).toContain('Bench Press');
    expect(recs[0]!.type).toBe('exercise');
    expect(recs[0]!.priority).toBe('medium');
  });

  it('flags severely stagnating exercises as high priority', () => {
    const ctx = makeContext({
      stagnatingExercises: [makeStagnation('ex-1', 'Squat', 10)],
    });
    const recs = performanceRecommender.evaluate(ctx);
    expect(recs[0]!.priority).toBe('high');
    expect(recs[0]!.confidence).toBe(0.8);
  });

  it('adds aggregate recommendation for 3+ stagnating', () => {
    const ctx = makeContext({
      stagnatingExercises: [
        makeStagnation('ex-1', 'Bench', 5),
        makeStagnation('ex-2', 'Squat', 6),
        makeStagnation('ex-3', 'OHP', 4),
      ],
    });
    const recs = performanceRecommender.evaluate(ctx);
    const aggregate = recs.find(r => r.title === 'Multiple exercises stagnating');
    expect(aggregate).toBeDefined();
    expect(aggregate!.priority).toBe('high');
  });

  it('returns empty when no stagnation', () => {
    const ctx = makeContext({ stagnatingExercises: [] });
    const recs = performanceRecommender.evaluate(ctx);
    expect(recs).toHaveLength(0);
  });
});
