import { describe, it, expect, beforeEach } from 'vitest';
import { rirProgression } from '@/engines/progression/strategies/rir';
import { makeSettings, makeRule, makeTargets, makeSessionWithRir, resetIds } from './helpers';

beforeEach(() => resetIds());

describe('rirProgression', () => {
  const settings = makeSettings({ defaultRir: 2 });
  const targets = makeTargets(3, { targetWeight: 80, targetRir: 2, targetRepMin: 8, targetRepMax: 12 });

  it('increases weight when average RIR is well above target', () => {
    const result = rirProgression.calculateNextTargets({
      history: [makeSessionWithRir(10, 80, 4, 3)],
      currentTargets: targets,
      rule: makeRule({ strategy: 'rir', weightIncrement: 2.5 }),
      settings,
    });
    expect(result.action).toBe('increase');
    expect(result.nextTargets[0]!.targetWeight).toBe(82.5);
  });

  it('maintains when RIR is on target', () => {
    const result = rirProgression.calculateNextTargets({
      history: [makeSessionWithRir(10, 80, 2, 3)],
      currentTargets: targets,
      rule: makeRule({ strategy: 'rir' }),
      settings,
    });
    expect(result.action).toBe('maintain');
  });

  it('maintains when RIR data missing — low confidence', () => {
    const noRirSession = [
      { ...makeSessionWithRir(10, 80, 0, 1)[0]!, actualRir: null },
    ];
    const result = rirProgression.calculateNextTargets({
      history: [noRirSession],
      currentTargets: targets,
      rule: makeRule({ strategy: 'rir' }),
      settings,
    });
    expect(result.action).toBe('maintain');
    expect(result.confidence).toBe('low');
  });

  it('deloads after sustained low RIR', () => {
    const rule = makeRule({ strategy: 'rir', deloadAfterFailures: 2, deloadPercentage: 10 });
    const result = rirProgression.calculateNextTargets({
      history: [
        makeSessionWithRir(8, 80, 0, 3),
        makeSessionWithRir(7, 80, 0, 3),
      ],
      currentTargets: targets,
      rule,
      settings,
    });
    expect(result.action).toBe('deload');
    expect(result.nextTargets[0]!.targetWeight).toBe(72.5);
  });
});
