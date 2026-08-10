import { describe, it, expect, beforeEach } from 'vitest';
import { weightProgression } from '@/engines/progression/strategies/weight';
import { makeSettings, makeRule, makeTargets, makeSession, resetIds } from './helpers';

beforeEach(() => resetIds());

describe('weightProgression', () => {
  const settings = makeSettings();
  const targets = makeTargets(3, { targetWeight: 100, targetRepMin: 5, targetRepMax: 5 });

  it('increases weight when all sets hit repMin', () => {
    const result = weightProgression.calculateNextTargets({
      history: [makeSession(5, 100, 3)],
      currentTargets: targets,
      rule: makeRule({ strategy: 'weight', weightIncrement: 2.5 }),
      settings,
    });
    expect(result.action).toBe('increase');
    expect(result.nextTargets[0]!.targetWeight).toBe(102.5);
  });

  it('maintains when any set misses repMin', () => {
    const session = [
      ...makeSession(5, 100, 2),
      ...makeSession(3, 100, 1),
    ].map((s, i) => ({ ...s, orderIndex: i }));

    const result = weightProgression.calculateNextTargets({
      history: [session],
      currentTargets: targets,
      rule: makeRule({ strategy: 'weight' }),
      settings,
    });
    expect(result.action).toBe('maintain');
  });

  it('deloads after repeated failures', () => {
    const rule = makeRule({ strategy: 'weight', deloadAfterFailures: 2, deloadPercentage: 10 });
    const result = weightProgression.calculateNextTargets({
      history: [makeSession(3, 100), makeSession(4, 100)],
      currentTargets: targets,
      rule,
      settings,
    });
    expect(result.action).toBe('deload');
    expect(result.nextTargets[0]!.targetWeight).toBe(90);
  });
});
