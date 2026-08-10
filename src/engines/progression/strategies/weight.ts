import type { ProgressionStrategy, ProgressionInput, ProgressionResult } from '../types';
import { cloneTargets, roundWeight, countConsecutiveSuccesses, countConsecutiveFailures } from '../utils';

/**
 * Linear weight progression: increase weight every N successful sessions.
 *
 * Success = all working sets completed at or above targetRepMin.
 * Rep range stays fixed; only weight moves.
 */
export const weightProgression: ProgressionStrategy = {
  calculateNextTargets(input: ProgressionInput): ProgressionResult {
    const { history, currentTargets, rule, settings } = input;
    const nextTargets = cloneTargets(currentTargets);

    if (history.length === 0) {
      return { nextTargets, reasoning: 'No history yet — using template targets.', action: 'maintain', confidence: 'low' };
    }

    const repMin = currentTargets[0]?.targetRepMin ?? 5;
    const increment = rule.weightIncrement || settings.weightIncrement;
    const requiredSuccess = rule.requiredConsecutiveSuccess || 1;

    const didSucceed = (session: ProgressionInput['history'][number]) =>
      session.length > 0 && session.every(s => s.actualReps >= repMin);

    const didFail = (session: ProgressionInput['history'][number]) =>
      session.length > 0 && session.some(s => s.actualReps < repMin);

    const consecutiveSuccesses = countConsecutiveSuccesses(history, didSucceed);
    const consecutiveFailures = countConsecutiveFailures(history, didFail);

    if (rule.deloadAfterFailures && rule.deloadPercentage && consecutiveFailures >= rule.deloadAfterFailures) {
      const lastWeight = history[0]![0]!.actualWeight;
      const deloadWeight = roundWeight(lastWeight * (1 - rule.deloadPercentage / 100), settings.weightIncrement);

      for (const t of nextTargets) {
        if (t.setType === 'working') t.targetWeight = deloadWeight;
      }

      return {
        nextTargets,
        reasoning: `Missed ${repMin}+ reps for ${consecutiveFailures} sessions. Deloading to ${deloadWeight}${settings.units}.`,
        action: 'deload',
        confidence: 'high',
      };
    }

    if (consecutiveSuccesses >= requiredSuccess) {
      const lastWeight = history[0]![0]?.actualWeight ?? currentTargets[0]?.targetWeight ?? 0;
      const newWeight = roundWeight(lastWeight + increment, settings.weightIncrement);

      for (const t of nextTargets) {
        if (t.setType === 'working') t.targetWeight = newWeight;
      }

      return {
        nextTargets,
        reasoning: `Completed ${repMin}+ reps on all sets. Weight up to ${newWeight}${settings.units}.`,
        action: 'increase',
        confidence: 'high',
      };
    }

    const lastWeight = history[0]![0]?.actualWeight ?? currentTargets[0]?.targetWeight ?? 0;
    for (const t of nextTargets) {
      if (t.setType === 'working') t.targetWeight = lastWeight;
    }

    return {
      nextTargets,
      reasoning: `Not all sets hit ${repMin} reps. Maintaining ${lastWeight}${settings.units}.`,
      action: 'maintain',
      confidence: 'high',
    };
  },
};
