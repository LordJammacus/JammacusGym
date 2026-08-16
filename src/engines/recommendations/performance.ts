import type { Recommendation, RecommendationSource, TrainingContext } from '@/types/recommendations';
import { generateId } from '@/utils/ids';

/**
 * PerformanceRecommender: Are exercises stagnating?
 *
 * Uses stagnation detection results from the analytics engine.
 * Suggests exercise variations, rep range changes, or technique focus.
 */
export const performanceRecommender: RecommendationSource = {
  id: 'performance',
  name: 'Performance Recommender',
  evaluate(ctx: TrainingContext): Recommendation[] {
    const recs: Recommendation[] = [];
    const now = ctx.now;

    if (ctx.stagnatingExercises.length === 0) return recs;

    for (const stag of ctx.stagnatingExercises) {
      const severity = stag.sessionsSinceProgress >= 8 ? 'high' : 'medium';
      const sessions = stag.sessionsSinceProgress;

      let suggestion: string;
      if (sessions >= 8) {
        suggestion = `Consider replacing ${stag.exerciseName} with a variation, changing rep ranges, or addressing technique.`;
      } else {
        suggestion = `Try adjusting rep ranges, adding a pause variation, or changing tempo for ${stag.exerciseName}.`;
      }

      recs.push({
        id: generateId(),
        type: 'exercise',
        priority: severity,
        title: `${stag.exerciseName} has stagnated`,
        reasoning: `No improvement in load, reps, or volume over the last ${sessions} sessions${stag.lastProgressDate ? ` (since ${stag.lastProgressDate})` : ''}.`,
        suggestedAction: suggestion,
        confidence: sessions >= 8 ? 0.8 : 0.65,
        supportingData: {
          exerciseId: stag.exerciseId,
          sessionsSinceProgress: sessions,
          lastProgressDate: stag.lastProgressDate,
        },
        createdAt: now,
      });
    }

    // Aggregate: if many exercises stagnating, suggest program change
    if (ctx.stagnatingExercises.length >= 3) {
      recs.push({
        id: generateId(),
        type: 'exercise',
        priority: 'high',
        title: 'Multiple exercises stagnating',
        reasoning: `${ctx.stagnatingExercises.length} exercises haven't improved recently. This may indicate a need for broader programming changes.`,
        suggestedAction: 'Consider starting a new training block with different exercise selection, rep ranges, or periodization approach.',
        confidence: 0.7,
        supportingData: {
          count: ctx.stagnatingExercises.length,
          exercises: ctx.stagnatingExercises.map(s => s.exerciseName).slice(0, 5),
        },
        createdAt: now,
      });
    }

    return recs;
  },
};
