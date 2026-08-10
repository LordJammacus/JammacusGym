import type { ProgressionStrategy, ProgressionInput, ProgressionResult } from '../types';
import { cloneTargets, countConsecutiveFailures } from '../utils';

/**
 * Rep progression: weight stays fixed, target reps increase each successful session.
 *
 * When repThreshold is reached, progression holds at that rep count (pair with
 * manual weight increase or switch strategy).
 */
export const repProgression: ProgressionStrategy = {
  calculateNextTargets(input: ProgressionInput): ProgressionResult {
    const { history, currentTargets, rule, settings } = input;
    const nextTargets = cloneTargets(currentTargets);

    if (history.length === 0) {
      return { nextTargets, reasoning: 'No history yet — using template targets.', action: 'maintain', confidence: 'low' };
    }

    const lastSession = history[0]!;
    const repMin = currentTargets[0]?.targetRepMin ?? 8;
    const repCeiling = rule.repThreshold ?? 20;

    const allHitTarget = lastSession.every(s => s.actualReps >= (currentTargets[0]?.targetRepMax ?? repMin));

    if (allHitTarget) {
      const currentMax = currentTargets[0]?.targetRepMax ?? repMin;
      const newRepMax = Math.min(currentMax + 1, repCeiling);
      const newRepMin = Math.min(repMin + 1, newRepMax);

      if (newRepMax > currentMax) {
        for (const t of nextTargets) {
          if (t.setType === 'working') {
            t.targetRepMin = newRepMin;
            t.targetRepMax = newRepMax;
            t.targetWeight = lastSession[0]?.actualWeight ?? t.targetWeight;
          }
        }
        return {
          nextTargets,
          reasoning: `All sets completed at ${currentMax} reps. Target reps increased to ${newRepMin}-${newRepMax}.`,
          action: 'increase',
          confidence: 'high',
        };
      }

      for (const t of nextTargets) {
        if (t.setType === 'working') t.targetWeight = lastSession[0]?.actualWeight ?? t.targetWeight;
      }
      return {
        nextTargets,
        reasoning: `At rep ceiling (${repCeiling}). Consider increasing weight.`,
        action: 'maintain',
        confidence: 'medium',
      };
    }

    // Deload check
    const didFail = (session: ProgressionInput['history'][number]) =>
      session.length > 0 && session.some(s => s.actualReps < repMin);
    const consecutiveFailures = countConsecutiveFailures(history, didFail);

    if (rule.deloadAfterFailures && rule.deloadPercentage && consecutiveFailures >= rule.deloadAfterFailures) {
      const lastWeight = lastSession[0]!.actualWeight;
      const deloadWeight = Math.round((lastWeight * (1 - rule.deloadPercentage / 100)) / settings.weightIncrement) * settings.weightIncrement;
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

    const lastWeight = lastSession[0]?.actualWeight ?? currentTargets[0]?.targetWeight ?? 0;
    for (const t of nextTargets) {
      if (t.setType === 'working') t.targetWeight = lastWeight;
    }

    return {
      nextTargets,
      reasoning: `Didn't complete all sets at target reps. Maintaining current targets.`,
      action: 'maintain',
      confidence: 'high',
    };
  },
};
