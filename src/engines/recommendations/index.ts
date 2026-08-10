import type { Recommendation, RecommendationSource, TrainingContext } from '@/types/recommendations';
import { schedulingRecommender } from './scheduling';
import { volumeRecommender } from './volume';
import { deloadRecommender } from './deload';
import { performanceRecommender } from './performance';

export { buildTrainingContext } from './context';

const SOURCES: RecommendationSource[] = [
  schedulingRecommender,
  volumeRecommender,
  deloadRecommender,
  performanceRecommender,
];

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Run all recommendation sources against the context, deduplicate, and rank.
 * Pure function — deterministic for same input.
 */
export function generateRecommendations(ctx: TrainingContext): Recommendation[] {
  const all: Recommendation[] = [];

  for (const source of SOURCES) {
    const recs = source.evaluate(ctx);
    all.push(...recs);
  }

  const deduped = deduplicateRecommendations(all);
  return rankRecommendations(deduped);
}

/**
 * Remove redundant recommendations.
 * If a deload is recommended with high priority, suppress individual
 * exercise stagnation recommendations (deload subsumes them).
 */
function deduplicateRecommendations(recs: Recommendation[]): Recommendation[] {
  const hasHighDeload = recs.some(r => r.type === 'deload' && r.priority === 'high');

  if (hasHighDeload) {
    return recs.filter(r => {
      if (r.type === 'exercise' && r.title.includes('stagnated')) return false;
      return true;
    });
  }

  return recs;
}

function rankRecommendations(recs: Recommendation[]): Recommendation[] {
  return recs.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 1;
    const pb = PRIORITY_ORDER[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return b.confidence - a.confidence;
  });
}
