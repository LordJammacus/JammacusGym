import type { Recommendation, RecommendationSource, TrainingContext } from '@/types/recommendations';
import { generateId } from '@/utils/ids';

/**
 * DeloadRecommender: Should you deload?
 *
 * Signals:
 * - Multiple exercises declining simultaneously
 * - High training volume + declining performance = accumulated fatigue
 * - Extended period without a deload (heuristic: ~6-8 weeks continuous)
 */
export const deloadRecommender: RecommendationSource = {
  id: 'deload',
  name: 'Deload Recommender',
  evaluate(ctx: TrainingContext): Recommendation[] {
    const recs: Recommendation[] = [];
    const now = ctx.now;

    if (ctx.exerciseTrends.size < 2) return recs;

    let decliningCount = 0;
    let stagnatingCount = 0;
    const decliningExercises: string[] = [];

    for (const [exerciseId, trend] of ctx.exerciseTrends) {
      if (trend.direction === 'declining') {
        decliningCount++;
        const name = ctx.exerciseNames.get(exerciseId) ?? 'Unknown';
        decliningExercises.push(name);
      } else if (trend.direction === 'stagnating') {
        stagnatingCount++;
      }
    }

    const totalTracked = ctx.exerciseTrends.size;
    const decliningRatio = decliningCount / totalTracked;
    const troubleRatio = (decliningCount + stagnatingCount) / totalTracked;

    // Strong deload signal: >40% of exercises declining
    if (decliningRatio >= 0.4 && decliningCount >= 2) {
      recs.push({
        id: generateId(),
        type: 'deload',
        priority: 'high',
        title: 'Deload recommended',
        reasoning: `${decliningCount} of ${totalTracked} tracked exercises are declining (${decliningExercises.slice(0, 3).join(', ')}). This pattern typically indicates accumulated fatigue.`,
        suggestedAction: 'Take a deload week: reduce volume by 40-50% and intensity by 10-15%. Maintain movement patterns.',
        confidence: 0.85,
        supportingData: {
          decliningCount,
          totalTracked,
          decliningExercises: decliningExercises.slice(0, 5),
        },
        createdAt: now,
      });
      return recs;
    }

    // Moderate signal: >60% declining or stagnating
    if (troubleRatio >= 0.6 && (decliningCount + stagnatingCount) >= 3) {
      recs.push({
        id: generateId(),
        type: 'deload',
        priority: 'medium',
        title: 'Consider a deload',
        reasoning: `${decliningCount + stagnatingCount} of ${totalTracked} exercises are declining or stagnating. Progress may benefit from reduced training stress.`,
        suggestedAction: 'Consider a lighter week with reduced volume. Focus on technique and recovery.',
        confidence: 0.65,
        supportingData: {
          decliningCount,
          stagnatingCount,
          totalTracked,
        },
        createdAt: now,
      });
    }

    // High volume + any declining = possible overreaching
    if (ctx.rollingVolume.avgSetsPerDay > 8 && decliningCount >= 1) {
      recs.push({
        id: generateId(),
        type: 'deload',
        priority: 'medium',
        title: 'Possible overreaching',
        reasoning: `High training density (${ctx.rollingVolume.avgSetsPerDay} sets/day over 7 days) combined with declining performance in ${decliningCount} exercise(s).`,
        suggestedAction: 'Reduce training volume for 3-5 days to manage fatigue accumulation.',
        confidence: 0.6,
        supportingData: {
          avgSetsPerDay: ctx.rollingVolume.avgSetsPerDay,
          decliningCount,
        },
        createdAt: now,
      });
    }

    // Fatigue-based signal: high self-reported fatigue + performance issues
    if (ctx.recentFatigueScore != null && ctx.recentFatigueScore >= 3.5) {
      const hasPerformanceIssues = decliningCount >= 1 || stagnatingCount >= 2;
      if (hasPerformanceIssues) {
        recs.push({
          id: generateId(),
          type: 'deload',
          priority: 'high',
          title: 'High fatigue with declining performance',
          reasoning: `Your recent fatigue score (${ctx.recentFatigueScore.toFixed(1)}/5) is elevated alongside ${decliningCount} declining and ${stagnatingCount} stagnating exercise(s). Data suggests accumulated fatigue is impacting output.`,
          suggestedAction: 'Prioritise recovery. Consider a deload week or 2-3 rest days before resuming full training.',
          confidence: 0.8,
          supportingData: {
            recentFatigueScore: ctx.recentFatigueScore,
            decliningCount,
            stagnatingCount,
          },
          createdAt: now,
        });
      } else {
        recs.push({
          id: generateId(),
          type: 'deload',
          priority: 'medium',
          title: 'Elevated fatigue reported',
          reasoning: `Your recent fatigue score (${ctx.recentFatigueScore.toFixed(1)}/5) is elevated. Performance hasn't declined yet, but monitoring is recommended.`,
          suggestedAction: 'Consider lighter sessions or an extra rest day this week.',
          confidence: 0.55,
          supportingData: { recentFatigueScore: ctx.recentFatigueScore },
          createdAt: now,
        });
      }
    }

    return recs;
  },
};
