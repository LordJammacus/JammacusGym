import type { ProgressionStrategy, ProgressionInput, ProgressionResult } from '../types';
import { cloneTargets } from '../utils';

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
      const lastSession = history[0]!;
      for (let i = 0; i < nextTargets.length; i++) {
        const lastSet = lastSession[i];
        if (lastSet && nextTargets[i]!.setType === 'working') {
          nextTargets[i]!.targetWeight = lastSet.actualWeight;
        }
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
