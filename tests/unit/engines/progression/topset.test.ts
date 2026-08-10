import { describe, it, expect, beforeEach } from 'vitest';
import { topsetProgression } from '@/engines/progression/strategies/topset';
import { makeSettings, makeRule, makeTargets, makeCompletedSet, resetIds } from './helpers';

beforeEach(() => resetIds());

describe('topsetProgression', () => {
  const settings = makeSettings();
  const targets = makeTargets(4, { targetWeight: 100, targetRepMin: 5, targetRepMax: 5 });

  function makeTopSetSession(topReps: number, topWeight: number, backoffReps: number, backoffWeight: number) {
    return [
      makeCompletedSet({ orderIndex: 0, actualReps: topReps, actualWeight: topWeight }),
      makeCompletedSet({ orderIndex: 1, actualReps: backoffReps, actualWeight: backoffWeight }),
      makeCompletedSet({ orderIndex: 2, actualReps: backoffReps, actualWeight: backoffWeight }),
      makeCompletedSet({ orderIndex: 3, actualReps: backoffReps, actualWeight: backoffWeight }),
    ];
  }

  it('increases top set and adjusts backoffs when top set succeeds', () => {
    const result = topsetProgression.calculateNextTargets({
      history: [makeTopSetSession(5, 100, 8, 85)],
      currentTargets: targets,
      rule: makeRule({ strategy: 'topset_backoff', weightIncrement: 2.5 }),
      settings,
    });
    expect(result.action).toBe('increase');
    expect(result.nextTargets[0]!.targetWeight).toBe(102.5);
    expect(result.nextTargets[1]!.targetWeight).toBe(87.5);
  });

  it('maintains when top set misses reps', () => {
    const result = topsetProgression.calculateNextTargets({
      history: [makeTopSetSession(3, 100, 8, 85)],
      currentTargets: targets,
      rule: makeRule({ strategy: 'topset_backoff' }),
      settings,
    });
    expect(result.action).toBe('maintain');
  });

  it('deloads after consecutive top set failures', () => {
    const rule = makeRule({ strategy: 'topset_backoff', deloadAfterFailures: 2, deloadPercentage: 10 });
    const result = topsetProgression.calculateNextTargets({
      history: [
        makeTopSetSession(3, 100, 6, 85),
        makeTopSetSession(4, 100, 7, 85),
      ],
      currentTargets: targets,
      rule,
      settings,
    });
    expect(result.action).toBe('deload');
    expect(result.nextTargets[0]!.targetWeight).toBe(90);
  });
});
