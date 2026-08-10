import { describe, it, expect } from 'vitest';
import { schedulingRecommender } from '@/engines/recommendations/scheduling';
import { makeContext } from './helpers';

describe('SchedulingRecommender', () => {
  it('suggests starting first workout when no history', () => {
    const ctx = makeContext({ daysSinceLastWorkout: Infinity, recentWorkouts: [] });
    const recs = schedulingRecommender.evaluate(ctx);
    expect(recs).toHaveLength(1);
    expect(recs[0]!.title).toContain('first workout');
    expect(recs[0]!.type).toBe('schedule');
  });

  it('suggests rest day when already trained today and high frequency', () => {
    const ctx = makeContext({ daysSinceLastWorkout: 0, averageWeeklyFrequency: 6 });
    const recs = schedulingRecommender.evaluate(ctx);
    const rest = recs.find(r => r.title.includes('rest day'));
    expect(rest).toBeDefined();
    expect(rest!.priority).toBe('low');
  });

  it('does not suggest rest day at normal frequency', () => {
    const ctx = makeContext({ daysSinceLastWorkout: 0, averageWeeklyFrequency: 3 });
    const recs = schedulingRecommender.evaluate(ctx);
    const rest = recs.find(r => r.title.includes('rest day'));
    expect(rest).toBeUndefined();
  });

  it('suggests training when overdue (medium)', () => {
    const ctx = makeContext({ daysSinceLastWorkout: 4, averageWeeklyFrequency: 3 });
    const recs = schedulingRecommender.evaluate(ctx);
    const train = recs.find(r => r.title === 'Time to train');
    expect(train).toBeDefined();
    expect(train!.priority).toBe('medium');
  });

  it('suggests training when very overdue (high)', () => {
    const ctx = makeContext({ daysSinceLastWorkout: 8, averageWeeklyFrequency: 3 });
    const recs = schedulingRecommender.evaluate(ctx);
    const train = recs.find(r => r.title === 'Time to train');
    expect(train).toBeDefined();
    expect(train!.priority).toBe('high');
  });

  it('suggests recovered muscle groups when muscles are rested', () => {
    const muscleNames = new Map([['m1', 'Chest'], ['m2', 'Back'], ['m3', 'Legs']]);
    const daysSinceMuscleGroupTrained = new Map([['m1', 5], ['m2', 4], ['m3', 1]]);
    const ctx = makeContext({ daysSinceLastWorkout: 1, muscleNames, daysSinceMuscleGroupTrained });
    const recs = schedulingRecommender.evaluate(ctx);
    const recovered = recs.find(r => r.title.includes('Recovered'));
    expect(recovered).toBeDefined();
    expect(recovered!.reasoning).toContain('Chest');
    expect(recovered!.reasoning).toContain('Back');
  });

  it('returns empty for typical rest day scenario', () => {
    const ctx = makeContext({ daysSinceLastWorkout: 1, averageWeeklyFrequency: 3 });
    const recs = schedulingRecommender.evaluate(ctx);
    const urgent = recs.filter(r => r.priority === 'high');
    expect(urgent).toHaveLength(0);
  });
});
