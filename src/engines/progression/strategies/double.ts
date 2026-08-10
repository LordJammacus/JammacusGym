import type { ProgressionStrategy, ProgressionInput, ProgressionResult } from '../types';
import { cloneTargets, roundWeight, countConsecutiveSuccesses, countConsecutiveFailures } from '../utils';

/**
 * Double progression: increase reps within a range, then bump weight and reset reps.
 *
 * Success = all working sets hit targetRepMax (or repThreshold if configured).
 * When success is sustained for `requiredConsecutiveSuccess` sessions:
 *   - Increase weight by weightIncrement
 *   - Reset reps to targetRepMin
 * Failure = any working set falls below targetRepMin for `deloadAfterFailures` sessions:
 *   - Deload weight by deloadPercentage
 */
export const doubleProgression: ProgressionStrategy = {
  calculateNextTargets(input: ProgressionInput): ProgressionResult {
    const { history, currentTargets, rule, settings } = input;
    const nextTargets = cloneTargets(currentTargets);

    if (history.length === 0) {
      return { nextTargets, reasoning: 'No history yet — using template targets.', action: 'maintain', confidence: 'low' };
    }

    const repCeiling = rule.repThreshold ?? currentTargets[0]?.targetRepMax ?? 12;
    const repFloor = currentTargets[0]?.targetRepMin ?? 8;
    const increment = rule.weightIncrement || settings.weightIncrement;
    const requiredSuccess = rule.requiredConsecutiveSuccess || 1;

    const didHitCeiling = (session: ProgressionInput['history'][number]) =>
      session.length > 0 && session.every(s => s.actualReps >= repCeiling);

    const didFail = (session: ProgressionInput['history'][number]) =>
      session.length > 0 && session.some(s => s.actualReps < repFloor);

    const consecutiveSuccesses = countConsecutiveSuccesses(history, didHitCeiling);
    const consecutiveFailures = countConsecutiveFailures(history, didFail);

    // Deload check
    if (rule.deloadAfterFailures && rule.deloadPercentage && consecutiveFailures >= rule.deloadAfterFailures) {
      const lastWeight = history[0]![0]!.actualWeight;
      const deloadWeight = roundWeight(lastWeight * (1 - rule.deloadPercentage / 100), settings.weightIncrement);

      for (const t of nextTargets) {
        if (t.setType === 'working') {
          t.targetWeight = deloadWeight;
        }
      }

      return {
        nextTargets,
        reasoning: `Failed to hit ${repFloor} reps for ${consecutiveFailures} consecutive sessions. Deloading to ${deloadWeight}${settings.units}.`,
        action: 'deload',
        confidence: 'high',
      };
    }

    // Weight increase check
    if (consecutiveSuccesses >= requiredSuccess) {
      const lastWeight = history[0]![0]?.actualWeight ?? currentTargets[0]?.targetWeight ?? 0;
      const newWeight = roundWeight(lastWeight + increment, settings.weightIncrement);

      for (const t of nextTargets) {
        if (t.setType === 'working') {
          t.targetWeight = newWeight;
          t.targetRepMin = repFloor;
          t.targetRepMax = repCeiling;
        }
      }

      const sessionWord = requiredSuccess > 1 ? `${consecutiveSuccesses} consecutive sessions` : 'last session';
      return {
        nextTargets,
        reasoning: `Hit ${repCeiling} reps on all sets for ${sessionWord}. Weight increased to ${newWeight}${settings.units}, reps reset to ${repFloor}-${repCeiling}.`,
        action: 'increase',
        confidence: 'high',
      };
    }

    // Maintain — carry forward last session's weight
    const lastWeight = history[0]![0]?.actualWeight ?? currentTargets[0]?.targetWeight ?? 0;
    for (const t of nextTargets) {
      if (t.setType === 'working') {
        t.targetWeight = lastWeight;
      }
    }

    const bestReps = Math.min(...history[0]!.map(s => s.actualReps));
    return {
      nextTargets,
      reasoning: `Lowest reps last session: ${bestReps}. Need ${repCeiling} on all sets${requiredSuccess > 1 ? ` for ${requiredSuccess} sessions` : ''} to increase weight.`,
      action: 'maintain',
      confidence: 'high',
    };
  },
};
