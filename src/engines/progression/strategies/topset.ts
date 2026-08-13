import type { ProgressionStrategy, ProgressionInput, ProgressionResult } from '../types';
import { cloneTargets, roundWeight, countConsecutiveSuccesses, countConsecutiveFailures, isWorkingSetType } from '../utils';

/**
 * Top set + back-off: first set is the "top set" that progresses independently.
 * Remaining sets are back-off sets at a fixed percentage of the top set weight.
 *
 * Back-off percentage defaults to 85% of top set weight.
 */
const BACKOFF_PERCENTAGE = 0.85;

export const topsetProgression: ProgressionStrategy = {
  calculateNextTargets(input: ProgressionInput): ProgressionResult {
    const { history, currentTargets, rule, settings } = input;
    const nextTargets = cloneTargets(currentTargets);

    if (history.length === 0) {
      return { nextTargets, reasoning: 'No history yet — using template targets.', action: 'maintain', confidence: 'low' };
    }

    const topIdx = currentTargets.findIndex(t => isWorkingSetType(t.setType));
    const topTarget = topIdx >= 0 ? currentTargets[topIdx] : currentTargets[0];
    if (!topTarget) {
      return { nextTargets, reasoning: 'No targets configured.', action: 'maintain', confidence: 'low' };
    }

    const lastSession = history[0]!;
    const topSetResult = lastSession[0];
    if (!topSetResult) {
      return { nextTargets, reasoning: 'No sets logged in last session.', action: 'maintain', confidence: 'low' };
    }

    const repMin = topTarget.targetRepMin;
    const increment = rule.weightIncrement || settings.weightIncrement;
    const requiredSuccess = rule.requiredConsecutiveSuccess || 1;

    const didSucceedTopSet = (session: ProgressionInput['history'][number]) =>
      session.length > 0 && session[0]!.actualReps >= repMin;

    const didFail = (session: ProgressionInput['history'][number]) =>
      session.length > 0 && session[0]!.actualReps < repMin;

    const consecutiveSuccesses = countConsecutiveSuccesses(history, didSucceedTopSet);
    const consecutiveFailures = countConsecutiveFailures(history, didFail);

    // Deload
    if (rule.deloadAfterFailures && rule.deloadPercentage && consecutiveFailures >= rule.deloadAfterFailures) {
      const deloadTop = roundWeight(topSetResult.actualWeight * (1 - rule.deloadPercentage / 100), settings.weightIncrement);
      const deloadBackoff = roundWeight(deloadTop * BACKOFF_PERCENTAGE, settings.weightIncrement);

      nextTargets[topIdx >= 0 ? topIdx : 0]!.targetWeight = deloadTop;
      for (let i = 0; i < nextTargets.length; i++) {
        if (i === (topIdx >= 0 ? topIdx : 0)) continue;
        if (isWorkingSetType(nextTargets[i]!.setType)) {
          nextTargets[i]!.targetWeight = deloadBackoff;
        }
      }

      return {
        nextTargets,
        reasoning: `Top set failed for ${consecutiveFailures} sessions. Deloading to ${deloadTop}${settings.units}.`,
        action: 'deload',
        confidence: 'high',
      };
    }

    // Increase
    if (consecutiveSuccesses >= requiredSuccess) {
      const newTopWeight = roundWeight(topSetResult.actualWeight + increment, settings.weightIncrement);
      const backoffWeight = roundWeight(newTopWeight * BACKOFF_PERCENTAGE, settings.weightIncrement);

      nextTargets[topIdx >= 0 ? topIdx : 0]!.targetWeight = newTopWeight;
      for (let i = 0; i < nextTargets.length; i++) {
        if (i === (topIdx >= 0 ? topIdx : 0)) continue;
        if (isWorkingSetType(nextTargets[i]!.setType)) {
          nextTargets[i]!.targetWeight = backoffWeight;
        }
      }

      return {
        nextTargets,
        reasoning: `Top set hit ${topSetResult.actualReps} reps. Top set up to ${newTopWeight}${settings.units}, back-offs at ${backoffWeight}${settings.units}.`,
        action: 'increase',
        confidence: 'high',
      };
    }

    // Maintain
    const topWeight = topSetResult.actualWeight;
    const backoffWeight = roundWeight(topWeight * BACKOFF_PERCENTAGE, settings.weightIncrement);

    nextTargets[topIdx >= 0 ? topIdx : 0]!.targetWeight = topWeight;
    for (let i = 0; i < nextTargets.length; i++) {
      if (i === (topIdx >= 0 ? topIdx : 0)) continue;
      if (isWorkingSetType(nextTargets[i]!.setType)) {
        nextTargets[i]!.targetWeight = backoffWeight;
      }
    }

    return {
      nextTargets,
      reasoning: `Top set: ${topSetResult.actualReps} reps at ${topWeight}${settings.units}. Need ${repMin}+ reps to increase.`,
      action: 'maintain',
      confidence: 'high',
    };
  },
};
