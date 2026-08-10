import type { ProgressionStrategy, ProgressionInput, ProgressionResult } from '../types';
import { cloneTargets, roundWeight, countConsecutiveFailures } from '../utils';

/**
 * RIR-based progression: user reports reps-in-reserve, weight adjusts to maintain target RIR.
 *
 * If average RIR < target RIR - 1: too heavy, maintain weight.
 * If average RIR > target RIR + 1: too light, increase weight.
 * Otherwise: on target, maintain.
 */
export const rirProgression: ProgressionStrategy = {
  calculateNextTargets(input: ProgressionInput): ProgressionResult {
    const { history, currentTargets, rule, settings } = input;
    const nextTargets = cloneTargets(currentTargets);

    if (history.length === 0) {
      return { nextTargets, reasoning: 'No history yet — using template targets.', action: 'maintain', confidence: 'low' };
    }

    const lastSession = history[0]!;
    const setsWithRir = lastSession.filter(s => s.actualRir !== null);

    if (setsWithRir.length === 0) {
      const lastWeight = lastSession[0]?.actualWeight ?? currentTargets[0]?.targetWeight ?? 0;
      for (const t of nextTargets) {
        if (t.setType === 'working') t.targetWeight = lastWeight;
      }
      return {
        nextTargets,
        reasoning: 'No RIR data logged. Log RIR to enable auto-progression. Maintaining weight.',
        action: 'maintain',
        confidence: 'low',
      };
    }

    const targetRir = currentTargets[0]?.targetRir ?? settings.defaultRir ?? 2;
    const avgRir = setsWithRir.reduce((sum, s) => sum + s.actualRir!, 0) / setsWithRir.length;
    const increment = rule.weightIncrement || settings.weightIncrement;
    const lastWeight = lastSession[0]?.actualWeight ?? currentTargets[0]?.targetWeight ?? 0;

    // Deload check
    const didFail = (session: ProgressionInput['history'][number]) => {
      const withRir = session.filter(s => s.actualRir !== null);
      if (withRir.length === 0) return false;
      const avg = withRir.reduce((sum, s) => sum + s.actualRir!, 0) / withRir.length;
      return avg < targetRir - 1;
    };
    const consecutiveFailures = countConsecutiveFailures(history, didFail);

    if (rule.deloadAfterFailures && rule.deloadPercentage && consecutiveFailures >= rule.deloadAfterFailures) {
      const deloadWeight = roundWeight(lastWeight * (1 - rule.deloadPercentage / 100), settings.weightIncrement);
      for (const t of nextTargets) {
        if (t.setType === 'working') t.targetWeight = deloadWeight;
      }
      return {
        nextTargets,
        reasoning: `RIR too low for ${consecutiveFailures} sessions (avg ${avgRir.toFixed(1)} vs target ${targetRir}). Deloading to ${deloadWeight}${settings.units}.`,
        action: 'deload',
        confidence: 'high',
      };
    }

    if (avgRir > targetRir + 1) {
      const newWeight = roundWeight(lastWeight + increment, settings.weightIncrement);
      for (const t of nextTargets) {
        if (t.setType === 'working') t.targetWeight = newWeight;
      }
      return {
        nextTargets,
        reasoning: `Average RIR ${avgRir.toFixed(1)} > target ${targetRir}. Weight up to ${newWeight}${settings.units}.`,
        action: 'increase',
        confidence: 'medium',
      };
    }

    for (const t of nextTargets) {
      if (t.setType === 'working') t.targetWeight = lastWeight;
    }

    if (avgRir < targetRir - 1) {
      return {
        nextTargets,
        reasoning: `Average RIR ${avgRir.toFixed(1)} below target ${targetRir}. Maintaining ${lastWeight}${settings.units} — consider a deload if this persists.`,
        action: 'maintain',
        confidence: 'medium',
      };
    }

    return {
      nextTargets,
      reasoning: `RIR on target (avg ${avgRir.toFixed(1)} vs target ${targetRir}). Maintaining ${lastWeight}${settings.units}.`,
      action: 'maintain',
      confidence: 'high',
    };
  },
};
