import type { ProgressionStrategy, ProgressionInput, ProgressionResult } from '../types';
import { cloneTargets, roundWeight } from '../utils';

/**
 * Percentage-based progression: weight increases by a fixed percentage each session
 * (or every N successful sessions).
 *
 * The increment is interpreted as a percentage (e.g. weightIncrement=2.5 means 2.5% increase).
 * Falls back to absolute increment if percentage would result in < 1 unit change.
 */
export const percentageProgression: ProgressionStrategy = {
  calculateNextTargets(input: ProgressionInput): ProgressionResult {
    const { history, currentTargets, rule, settings } = input;
    const nextTargets = cloneTargets(currentTargets);

    if (history.length === 0) {
      return { nextTargets, reasoning: 'No history yet — using template targets.', action: 'maintain', confidence: 'low' };
    }

    const lastSession = history[0]!;
    const repMin = currentTargets[0]?.targetRepMin ?? 5;
    const requiredSuccess = rule.requiredConsecutiveSuccess || 1;
    const pct = rule.weightIncrement || 2.5;

    const didSucceed = (session: ProgressionInput['history'][number]) =>
      session.length > 0 && session.every(s => s.actualReps >= repMin);

    let consecutiveSuccesses = 0;
    for (const session of history) {
      if (didSucceed(session)) consecutiveSuccesses++;
      else break;
    }

    const lastWeight = lastSession[0]?.actualWeight ?? currentTargets[0]?.targetWeight ?? 0;

    if (consecutiveSuccesses >= requiredSuccess && lastWeight > 0) {
      const rawIncrease = lastWeight * (pct / 100);
      const minIncrement = settings.weightIncrement;
      const actualIncrease = Math.max(rawIncrease, minIncrement);
      const newWeight = roundWeight(lastWeight + actualIncrease, minIncrement);

      for (const t of nextTargets) {
        if (t.setType === 'working') t.targetWeight = newWeight;
      }

      return {
        nextTargets,
        reasoning: `Completed target reps. Weight up ${pct}% to ${newWeight}${settings.units}.`,
        action: 'increase',
        confidence: 'high',
      };
    }

    for (const t of nextTargets) {
      if (t.setType === 'working') t.targetWeight = lastWeight;
    }

    // Deload
    const didFail = (session: ProgressionInput['history'][number]) =>
      session.length > 0 && session.some(s => s.actualReps < repMin);

    let consecutiveFailures = 0;
    for (const session of history) {
      if (didFail(session)) consecutiveFailures++;
      else break;
    }

    if (rule.deloadAfterFailures && rule.deloadPercentage && consecutiveFailures >= rule.deloadAfterFailures) {
      const deloadWeight = roundWeight(lastWeight * (1 - rule.deloadPercentage / 100), settings.weightIncrement);
      for (const t of nextTargets) {
        if (t.setType === 'working') t.targetWeight = deloadWeight;
      }
      return {
        nextTargets,
        reasoning: `Failed for ${consecutiveFailures} sessions. Deloading to ${deloadWeight}${settings.units}.`,
        action: 'deload',
        confidence: 'high',
      };
    }

    return {
      nextTargets,
      reasoning: `Not all sets hit ${repMin} reps. Maintaining ${lastWeight}${settings.units}.`,
      action: 'maintain',
      confidence: 'high',
    };
  },
};
