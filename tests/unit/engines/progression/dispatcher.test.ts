import { describe, it, expect, beforeEach } from 'vitest';
import { calculateProgression } from '@/engines/progression';
import { makeSettings, makeRule, makeTargets, makeSession, makeTarget, makeCompletedSet, resetIds } from './helpers';

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

  it('uses working-set rep range, not warmup sets', () => {
    const settings = makeSettings({ units: 'lb', weightIncrement: 5 });
    const targets = [
      makeTarget({ orderIndex: 0, setType: 'warmup', targetWeight: 0, targetRepMin: 3, targetRepMax: 3 }),
      makeTarget({ orderIndex: 1, setType: 'warmup', targetWeight: 0, targetRepMin: 3, targetRepMax: 5 }),
      makeTarget({ orderIndex: 2, setType: 'working', targetWeight: 0, targetRepMin: 6, targetRepMax: 12 }),
      makeTarget({ orderIndex: 3, setType: 'working', targetWeight: 0, targetRepMin: 6, targetRepMax: 12 }),
      makeTarget({ orderIndex: 4, setType: 'working', targetWeight: 0, targetRepMin: 6, targetRepMax: 12 }),
      makeTarget({ orderIndex: 5, setType: 'working', targetWeight: 0, targetRepMin: 6, targetRepMax: 12 }),
    ];

    const lastSession = [
      makeCompletedSet({ orderIndex: 0, setType: 'warmup', actualReps: 3, actualWeight: 0, targetRepMin: 3, targetRepMax: 3 }),
      makeCompletedSet({ orderIndex: 1, setType: 'warmup', actualReps: 3, actualWeight: 0, targetRepMin: 3, targetRepMax: 5 }),
      makeCompletedSet({ orderIndex: 2, setType: 'working', actualReps: 8, actualWeight: 0, targetRepMin: 6, targetRepMax: 12 }),
      makeCompletedSet({ orderIndex: 3, setType: 'working', actualReps: 9, actualWeight: 0, targetRepMin: 6, targetRepMax: 12 }),
      makeCompletedSet({ orderIndex: 4, setType: 'working', actualReps: 8, actualWeight: 0, targetRepMin: 6, targetRepMax: 12 }),
      makeCompletedSet({ orderIndex: 5, setType: 'working', actualReps: 10, actualWeight: 0, targetRepMin: 6, targetRepMax: 12 }),
    ];

    const result = calculateProgression({
      history: [lastSession],
      currentTargets: targets,
      rule: makeRule({ strategy: 'double', weightIncrement: 5 }),
      settings,
    });

    expect(result.action).toBe('maintain');
    expect(result.reasoning).toMatch(/8/);
    expect(result.reasoning).not.toMatch(/3-3/);
    expect(result.nextTargets[0]!.targetRepMin).toBe(3);
    expect(result.nextTargets[0]!.targetRepMax).toBe(3);
    expect(result.nextTargets[2]!.targetRepMin).toBe(6);
    expect(result.nextTargets[2]!.targetRepMax).toBe(12);
  });

  it('increases from working-set ceiling and does not copy warmup 3-3 onto working sets', () => {
    const settings = makeSettings({ units: 'lb', weightIncrement: 5 });
    const targets = [
      makeTarget({ orderIndex: 0, setType: 'warmup', targetWeight: 0, targetRepMin: 3, targetRepMax: 3 }),
      makeTarget({ orderIndex: 1, setType: 'working', targetWeight: 0, targetRepMin: 6, targetRepMax: 12 }),
      makeTarget({ orderIndex: 2, setType: 'working', targetWeight: 0, targetRepMin: 6, targetRepMax: 12 }),
    ];
    const lastSession = [
      makeCompletedSet({ orderIndex: 0, setType: 'warmup', actualReps: 3, actualWeight: 0, targetRepMin: 3, targetRepMax: 3 }),
      makeCompletedSet({ orderIndex: 1, setType: 'working', actualReps: 12, actualWeight: 0, targetRepMin: 6, targetRepMax: 12 }),
      makeCompletedSet({ orderIndex: 2, setType: 'working', actualReps: 12, actualWeight: 0, targetRepMin: 6, targetRepMax: 12 }),
    ];

    const result = calculateProgression({
      history: [lastSession],
      currentTargets: targets,
      rule: makeRule({ strategy: 'double', weightIncrement: 5 }),
      settings,
    });

    expect(result.action).toBe('increase');
    expect(result.nextTargets[1]!.targetWeight).toBe(5);
    expect(result.nextTargets[1]!.targetRepMin).toBe(6);
    expect(result.nextTargets[1]!.targetRepMax).toBe(12);
    expect(result.reasoning).toMatch(/6-12/);
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
