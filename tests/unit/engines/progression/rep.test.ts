import { describe, it, expect, beforeEach } from 'vitest';
import { repProgression } from '@/engines/progression/strategies/rep';
import { makeSettings, makeRule, makeTargets, makeSession, resetIds } from './helpers';

beforeEach(() => resetIds());

describe('repProgression', () => {
  const settings = makeSettings();
  const targets = makeTargets(3, { targetWeight: 50, targetRepMin: 8, targetRepMax: 10 });

  it('increases rep target when all sets hit targetRepMax', () => {
    const result = repProgression.calculateNextTargets({
      history: [makeSession(10, 50, 3)],
      currentTargets: targets,
      rule: makeRule({ strategy: 'rep', repThreshold: 15 }),
      settings,
    });
    expect(result.action).toBe('increase');
    expect(result.nextTargets[0]!.targetRepMax).toBe(11);
  });

  it('maintains when not all sets hit repMax', () => {
    const result = repProgression.calculateNextTargets({
      history: [makeSession(9, 50, 3)],
      currentTargets: targets,
      rule: makeRule({ strategy: 'rep' }),
      settings,
    });
    expect(result.action).toBe('maintain');
  });

  it('caps at repThreshold ceiling', () => {
    const highTargets = makeTargets(3, { targetWeight: 50, targetRepMin: 19, targetRepMax: 20 });
    const result = repProgression.calculateNextTargets({
      history: [makeSession(20, 50, 3)],
      currentTargets: highTargets,
      rule: makeRule({ strategy: 'rep', repThreshold: 20 }),
      settings,
    });
    expect(result.action).toBe('maintain');
    expect(result.nextTargets[0]!.targetRepMax).toBe(20);
  });
});
