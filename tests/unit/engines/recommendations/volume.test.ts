import { describe, it, expect } from 'vitest';
import { volumeRecommender } from '@/engines/recommendations/volume';
import { makeContext, makeVolume } from './helpers';

describe('VolumeRecommender', () => {
  it('flags low volume muscles', () => {
    const ctx = makeContext({
      muscleVolume: [
        makeVolume('Chest', 4),
        makeVolume('Back', 12),
        makeVolume('Legs', 3),
      ],
    });
    const recs = volumeRecommender.evaluate(ctx);
    const low = recs.find(r => r.title.includes('Low volume'));
    expect(low).toBeDefined();
    expect(low!.reasoning).toContain('Chest');
    expect(low!.reasoning).toContain('Legs');
    expect(low!.priority).toBe('medium');
  });

  it('flags excessive volume muscles', () => {
    const ctx = makeContext({
      muscleVolume: [
        makeVolume('Chest', 28),
        makeVolume('Back', 15),
      ],
    });
    const recs = volumeRecommender.evaluate(ctx);
    const high = recs.find(r => r.title.includes('Excessive'));
    expect(high).toBeDefined();
    expect(high!.reasoning).toContain('Chest');
    expect(high!.priority).toBe('high');
  });

  it('does not flag adequate volume', () => {
    const ctx = makeContext({
      muscleVolume: [
        makeVolume('Chest', 12),
        makeVolume('Back', 14),
        makeVolume('Legs', 16),
      ],
    });
    const recs = volumeRecommender.evaluate(ctx);
    expect(recs.filter(r => r.title.includes('volume'))).toHaveLength(0);
  });

  it('detects push/pull imbalance (push heavy)', () => {
    const ctx = makeContext({
      muscleVolume: [
        makeVolume('Chest', 16),
        makeVolume('Front Delt', 8),
        makeVolume('Triceps', 10),
        makeVolume('Back', 8),
        makeVolume('Biceps', 4),
      ],
    });
    const recs = volumeRecommender.evaluate(ctx);
    const imbalance = recs.find(r => r.title.includes('Push/pull'));
    expect(imbalance).toBeDefined();
  });

  it('detects pull/push imbalance (pull heavy)', () => {
    const ctx = makeContext({
      muscleVolume: [
        makeVolume('Back', 20),
        makeVolume('Lats', 10),
        makeVolume('Biceps', 8),
        makeVolume('Chest', 6),
        makeVolume('Triceps', 4),
      ],
    });
    const recs = volumeRecommender.evaluate(ctx);
    const imbalance = recs.find(r => r.title.includes('Pull/push'));
    expect(imbalance).toBeDefined();
  });

  it('returns empty for no data', () => {
    const ctx = makeContext({ muscleVolume: [] });
    const recs = volumeRecommender.evaluate(ctx);
    expect(recs).toHaveLength(0);
  });
});
