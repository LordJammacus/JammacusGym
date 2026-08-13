import type { ProgressionStrategy, ProgressionInput, ProgressionResult } from '../types';
import { cloneTargets, isWorkingSetType } from '../utils';

/**
 * Manual progression: no auto-adjustment. Targets stay as configured in the template.
 * User is responsible for updating weights/reps themselves.
 * Carries forward last session's weight to pre-fill the UI.
 */
export const manualProgression: ProgressionStrategy = {
  calculateNextTargets(input: ProgressionInput): ProgressionResult {
    const { history, currentTargets } = input;
    const nextTargets = cloneTargets(currentTargets);

    if (history.length > 0) {
      const lastWorking = history[0]!.filter(s => isWorkingSetType(s.setType));
      let wi = 0;
      for (const t of nextTargets) {
        if (!isWorkingSetType(t.setType)) continue;
        const lastSet = lastWorking[wi++];
        if (lastSet) t.targetWeight = lastSet.actualWeight;
      }
    }

    return {
      nextTargets,
      reasoning: 'Manual progression — adjust weight/reps as needed.',
      action: 'manual',
      confidence: 'high',
    };
  },
};
