import { describe, it, expect, beforeEach } from 'vitest';
import { doubleProgression } from '@/engines/progression/strategies/double';
import { makeSettings, makeRule, makeTargets, makeSession, resetIds } from './helpers';

beforeEach(() => resetIds());

describe('doubleProgression', () => {
  const settings = makeSettings();
  const targets = makeTargets(3, { targetWeight: 60, targetRepMin: 8, targetRepMax: 12 });

  it('maintains targets when no history', () => {
    const result = doubleProgression.calculateNextTargets({
      history: [],
      currentTargets: targets,
      rule: makeRule({ strategy: 'double' }),
      settings,
    });
    expect(result.action).toBe('maintain');
    expect(result.confidence).toBe('low');
  });

  it('increases weight when all sets hit repMax', () => {
    const history = [makeSession(12, 60, 3)];
    const result = doubleProgression.calculateNextTargets({
      history,
      currentTargets: targets,
      rule: makeRule({ strategy: 'double', weightIncrement: 2.5 }),
      settings,
    });
    expect(result.action).toBe('increase');
    expect(result.nextTargets[0]!.targetWeight).toBe(62.5);
  });

  it('maintains weight when not all sets hit repMax', () => {
    const history = [makeSession(10, 60, 3)];
    const result = doubleProgression.calculateNextTargets({
      history,
      currentTargets: targets,
      rule: makeRule({ strategy: 'double' }),
      settings,
    });
    expect(result.action).toBe('maintain');
    expect(result.nextTargets[0]!.targetWeight).toBe(60);
  });

  it('requires consecutive successes when configured', () => {
    const rule = makeRule({ strategy: 'double', requiredConsecutiveSuccess: 2 });
    const oneSuccess = [makeSession(12, 60), makeSession(10, 60)];
    const r1 = doubleProgression.calculateNextTargets({
      history: oneSuccess,
      currentTargets: targets,
      rule,
      settings,
    });
    expect(r1.action).toBe('maintain');

    const twoSuccesses = [makeSession(12, 60), makeSession(12, 60)];
    const r2 = doubleProgression.calculateNextTargets({
      history: twoSuccesses,
      currentTargets: targets,
      rule,
      settings,
    });
    expect(r2.action).toBe('increase');
  });

  it('deloads after consecutive failures', () => {
    const rule = makeRule({ strategy: 'double', deloadAfterFailures: 3, deloadPercentage: 10 });
    const history = [
      makeSession(6, 60),
      makeSession(7, 60),
      makeSession(5, 60),
    ];
    const result = doubleProgression.calculateNextTargets({
      history,
      currentTargets: targets,
      rule,
      settings,
    });
    expect(result.action).toBe('deload');
    expect(result.nextTargets[0]!.targetWeight).toBe(55);
  });

  it('uses repThreshold as ceiling when configured', () => {
    const rule = makeRule({ strategy: 'double', repThreshold: 10, weightIncrement: 5 });
    const history = [makeSession(10, 60, 3)];
    const result = doubleProgression.calculateNextTargets({
      history,
      currentTargets: targets,
      rule,
      settings,
    });
    expect(result.action).toBe('increase');
    expect(result.nextTargets[0]!.targetWeight).toBe(65);
  });

  it('rounds weight to nearest increment', () => {
    const rule = makeRule({ strategy: 'double', weightIncrement: 2.5 });
    const history = [makeSession(12, 61, 3)];
    const result = doubleProgression.calculateNextTargets({
      history,
      currentTargets: targets,
      rule,
      settings,
    });
    expect(result.action).toBe('increase');
    expect(result.nextTargets[0]!.targetWeight! % 2.5).toBe(0);
  });
});
