import type { Recommendation, RecommendationSource, TrainingContext } from '@/types/recommendations';
import { generateId } from '@/utils/ids';

// Evidence-based weekly set ranges for muscles trained as a primary target.
const VOLUME_THRESHOLDS = {
  low: 6,
  adequate: 10,
  high: 20,
  excessive: 25,
} as const;

/**
 * VolumeRecommender: Is muscle-group weekly volume appropriate?
 *
 * Uses whole primary-target sets over the last 7 days (from TrainingContext.muscleVolume).
 */
export const volumeRecommender: RecommendationSource = {
  id: 'volume',
  name: 'Volume Recommender',
  evaluate(ctx: TrainingContext): Recommendation[] {
    const recs: Recommendation[] = [];
    const now = ctx.now;

    if (ctx.muscleVolume.length === 0) return recs;

    const lowVolumeMuscles: { name: string; sets: number }[] = [];
    const highVolumeMuscles: { name: string; sets: number }[] = [];

    for (const entry of ctx.muscleVolume) {
      // Prefer integer primary sets; ignore secondary-only spillover (0 direct).
      const weeklySets = Math.round(entry.directSets);
      if (weeklySets < 1) continue;

      if (weeklySets < VOLUME_THRESHOLDS.low) {
        lowVolumeMuscles.push({ name: entry.muscleName, sets: weeklySets });
      } else if (weeklySets > VOLUME_THRESHOLDS.excessive) {
        highVolumeMuscles.push({ name: entry.muscleName, sets: weeklySets });
      }
    }

    if (lowVolumeMuscles.length > 0) {
      lowVolumeMuscles.sort((a, b) => a.sets - b.sets);
      const muscles = lowVolumeMuscles.slice(0, 4);
      recs.push({
        id: generateId(),
        type: 'volume',
        priority: 'medium',
        title: 'Low volume detected',
        reasoning: `${muscles.map(m => `${m.name} (${m.sets} ${m.sets === 1 ? 'set' : 'sets'})`).join(', ')} ${muscles.length === 1 ? 'is' : 'are'} below the minimum effective volume of ${VOLUME_THRESHOLDS.low} sets/week.`,
        suggestedAction: 'Add more sets for these muscle groups or include additional exercises targeting them.',
        confidence: 0.7,
        supportingData: { lowVolumeMuscles: muscles, threshold: VOLUME_THRESHOLDS.low },
        createdAt: now,
      });
    }

    if (highVolumeMuscles.length > 0) {
      highVolumeMuscles.sort((a, b) => b.sets - a.sets);
      const muscles = highVolumeMuscles.slice(0, 4);
      recs.push({
        id: generateId(),
        type: 'volume',
        priority: 'high',
        title: 'Excessive volume detected',
        reasoning: `${muscles.map(m => `${m.name} (${m.sets} sets)`).join(', ')} exceed ${VOLUME_THRESHOLDS.excessive} sets/week. This may impair recovery.`,
        suggestedAction: 'Consider reducing sets for these muscle groups to allow adequate recovery.',
        confidence: 0.75,
        supportingData: { highVolumeMuscles: muscles, threshold: VOLUME_THRESHOLDS.excessive },
        createdAt: now,
      });
    }

    // Imbalance detection: push/pull ratio (whole primary sets)
    const pushVolume = ctx.muscleVolume
      .filter(m => isPushMuscle(m.muscleName))
      .reduce((sum, m) => sum + Math.round(m.directSets), 0);
    const pullVolume = ctx.muscleVolume
      .filter(m => isPullMuscle(m.muscleName))
      .reduce((sum, m) => sum + Math.round(m.directSets), 0);

    if (pushVolume > 0 && pullVolume > 0) {
      const ratio = pushVolume / pullVolume;
      if (ratio > 1.8) {
        recs.push({
          id: generateId(),
          type: 'volume',
          priority: 'medium',
          title: 'Push/pull imbalance',
          reasoning: `Push volume (${pushVolume} sets) significantly exceeds pull volume (${pullVolume} sets). Ratio: ${ratio.toFixed(1)}:1.`,
          suggestedAction: 'Add more pulling exercises (rows, pull-ups) to balance your training.',
          confidence: 0.65,
          supportingData: { pushVolume, pullVolume, ratio: Math.round(ratio * 10) / 10 },
          createdAt: now,
        });
      } else if (ratio < 0.55) {
        recs.push({
          id: generateId(),
          type: 'volume',
          priority: 'medium',
          title: 'Pull/push imbalance',
          reasoning: `Pull volume (${pullVolume} sets) significantly exceeds push volume (${pushVolume} sets). Ratio: ${(1 / ratio).toFixed(1)}:1.`,
          suggestedAction: 'Add more pushing exercises (bench, overhead press) to balance your training.',
          confidence: 0.65,
          supportingData: { pushVolume, pullVolume, ratio: Math.round(ratio * 10) / 10 },
          createdAt: now,
        });
      }
    }

    return recs;
  },
};

function isPushMuscle(name: string): boolean {
  const push = ['chest', 'front delt', 'triceps', 'anterior deltoid', 'pectorals'];
  return push.some(p => name.toLowerCase().includes(p));
}

function isPullMuscle(name: string): boolean {
  const pull = ['back', 'lats', 'biceps', 'rear delt', 'posterior deltoid', 'rhomboids', 'traps'];
  return pull.some(p => name.toLowerCase().includes(p));
}
