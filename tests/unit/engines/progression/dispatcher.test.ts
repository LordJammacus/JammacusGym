import { describe, it, expect, beforeEach } from 'vitest';
import { calculateProgression } from '@/engines/progression';
import { makeSettings, makeRule, makeTargets, makeSession, resetIds } from './helpers';

beforeEach(() => resetIds());

describe('calculateProgression (dispatcher)', () => {
  const settings = makeSettings();
  const targets = makeTargets(3, { targetWeight: 60, targetRepMin: 8, targetRepMax: 12 });

  it('routes to correct strategy based on rule.strategy', () => {
    const strategies = ['double', 'weight', 'rep', 'rir', 'percentage', 'topset_backoff', 'manual'] as const;

    for (const strategy of strategies) {
      const result = calculateProgression({
        history: [],
        currentTargets: targets,
        rule: makeRule({ strategy }),
        settings,
      });
      expect(result).toBeDefined();
      expect(result.nextTargets).toHaveLength(3);
      expect(result.action).toBeDefined();
      expect(result.reasoning).toBeDefined();
    }
  });

  it('manual strategy preserves template targets', () => {
    const result = calculateProgression({
      history: [makeSession(10, 70, 3)],
      currentTargets: targets,
      rule: makeRule({ strategy: 'manual' }),
      settings,
    });
    expect(result.action).toBe('manual');
    expect(result.nextTargets[0]!.targetWeight).toBe(70);
  });
});
