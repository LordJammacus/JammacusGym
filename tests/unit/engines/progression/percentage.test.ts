import { describe, it, expect, beforeEach } from 'vitest';
import { percentageProgression } from '@/engines/progression/strategies/percentage';
import { makeSettings, makeRule, makeTargets, makeSession, resetIds } from './helpers';

beforeEach(() => resetIds());

describe('percentageProgression', () => {
  const settings = makeSettings({ weightIncrement: 2.5 });
  const targets = makeTargets(3, { targetWeight: 100, targetRepMin: 5, targetRepMax: 5 });

  it('increases weight by percentage when successful', () => {
    const result = percentageProgression.calculateNextTargets({
      history: [makeSession(5, 100, 3)],
      currentTargets: targets,
      rule: makeRule({ strategy: 'percentage', weightIncrement: 5 }),
      settings,
    });
    expect(result.action).toBe('increase');
    expect(result.nextTargets[0]!.targetWeight).toBe(105);
  });

  it('rounds to nearest weight increment', () => {
    const result = percentageProgression.calculateNextTargets({
      history: [makeSession(5, 47.5, 3)],
      currentTargets: makeTargets(3, { targetWeight: 47.5, targetRepMin: 5, targetRepMax: 5 }),
      rule: makeRule({ strategy: 'percentage', weightIncrement: 3 }),
      settings,
    });
    expect(result.action).toBe('increase');
    expect(result.nextTargets[0]!.targetWeight! % 2.5).toBe(0);
  });

  it('uses minimum increment when percentage is too small', () => {
    const result = percentageProgression.calculateNextTargets({
      history: [makeSession(5, 20, 3)],
      currentTargets: makeTargets(3, { targetWeight: 20, targetRepMin: 5, targetRepMax: 5 }),
      rule: makeRule({ strategy: 'percentage', weightIncrement: 1 }),
      settings,
    });
    expect(result.action).toBe('increase');
    expect(result.nextTargets[0]!.targetWeight).toBeGreaterThanOrEqual(22.5);
  });
});
