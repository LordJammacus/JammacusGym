import type { Recommendation, RecommendationSource, TrainingContext } from '@/types/recommendations';
import { generateId } from '@/utils/ids';

/**
 * SchedulingRecommender: Should you train today? What workout?
 *
 * Signals:
 * - Days since last workout vs typical frequency
 * - Muscle group recovery time (days since trained)
 * - Program rotation (which workout is next)
 */
export const schedulingRecommender: RecommendationSource = {
  id: 'scheduling',
  name: 'Scheduling Recommender',
  evaluate(ctx: TrainingContext): Recommendation[] {
    const recs: Recommendation[] = [];
    const now = ctx.now;

    if (ctx.daysSinceLastWorkout === Infinity) {
      recs.push(makeRec(now, {
        priority: 'medium',
        title: 'Start your first workout',
        reasoning: 'No completed workouts found. Getting started is the most important step.',
        suggestedAction: 'Pick a workout template and start training.',
        confidence: 1,
        supportingData: {},
      }));
      return recs;
    }

    // Rest day recommendation: trained recently, frequency already high
    if (ctx.daysSinceLastWorkout === 0 && ctx.averageWeeklyFrequency >= 5) {
      recs.push(makeRec(now, {
        priority: 'low',
        title: 'Consider a rest day',
        reasoning: `You've already trained today and average ${ctx.averageWeeklyFrequency} sessions/week. Recovery is essential for progress.`,
        suggestedAction: 'Take today off or do light active recovery.',
        confidence: 0.6,
        supportingData: {
          daysSinceLastWorkout: ctx.daysSinceLastWorkout,
          averageWeeklyFrequency: ctx.averageWeeklyFrequency,
        },
      }));
    }

    // Overdue: haven't trained in a while relative to your frequency
    const expectedRestDays = ctx.averageWeeklyFrequency > 0
      ? Math.round(7 / ctx.averageWeeklyFrequency)
      : 3;

    if (ctx.daysSinceLastWorkout > expectedRestDays + 1) {
      const priority = ctx.daysSinceLastWorkout > expectedRestDays + 3 ? 'high' : 'medium';
      recs.push(makeRec(now, {
        priority,
        title: 'Time to train',
        reasoning: `It's been ${ctx.daysSinceLastWorkout} days since your last workout. You typically train every ${expectedRestDays} days.`,
        suggestedAction: ctx.currentProgram
          ? 'Continue your program rotation.'
          : 'Start a workout.',
        confidence: 0.8,
        supportingData: {
          daysSinceLastWorkout: ctx.daysSinceLastWorkout,
          expectedRestDays,
        },
      }));
    }

    // Available training day check
    const todayDow = new Date(now).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    if (ctx.availableTrainingDays.length > 0 && !ctx.availableTrainingDays.includes(todayDow)) {
      recs.push(makeRec(now, {
        priority: 'low',
        title: 'Rest day (not a training day)',
        reasoning: `Today is not one of your configured training days. Your next training day is ${getNextTrainingDayName(todayDow, ctx.availableTrainingDays)}.`,
        suggestedAction: 'Rest today. Use the time for recovery, mobility, or light activity.',
        confidence: 0.7,
        supportingData: { todayDow, availableTrainingDays: ctx.availableTrainingDays },
      }));
    }

    // Muscle group recovery hints — find most-rested primary muscles
    if (ctx.daysSinceMuscleGroupTrained.size > 0 && ctx.daysSinceLastWorkout >= 1) {
      const recoveredMuscles: { name: string; days: number }[] = [];
      for (const [muscleId, days] of ctx.daysSinceMuscleGroupTrained) {
        if (days >= 3) {
          const name = ctx.muscleNames.get(muscleId);
          if (name) recoveredMuscles.push({ name, days });
        }
      }

      if (recoveredMuscles.length > 0) {
        recoveredMuscles.sort((a, b) => b.days - a.days);
        const top3 = recoveredMuscles.slice(0, 3);
        recs.push(makeRec(now, {
          priority: 'low',
          title: 'Recovered muscle groups ready',
          reasoning: `${top3.map(m => `${m.name} (${m.days}d)`).join(', ')} have had time to recover.`,
          suggestedAction: `Consider training ${top3.map(m => m.name).join(', ')} next.`,
          confidence: 0.5,
          supportingData: { recoveredMuscles: top3 },
        }));
      }
    }

    return recs;
  },
};

function makeRec(
  now: string,
  data: Omit<Recommendation, 'id' | 'type' | 'createdAt'>,
): Recommendation {
  return { id: generateId(), type: 'schedule', createdAt: now, ...data };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getNextTrainingDayName(today: number, availableDays: number[]): string {
  for (let offset = 1; offset <= 7; offset++) {
    const day = (today + offset) % 7;
    if (availableDays.includes(day)) {
      return DAY_NAMES[day]!;
    }
  }
  return 'unknown';
}
