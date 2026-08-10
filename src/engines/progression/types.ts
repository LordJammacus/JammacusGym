import type { CompletedSet, SetTarget, ProgressionRule, UserSettings } from '@/types/entities';
import type { ProgressionAction, ProgressionConfidence } from '@/types/enums';

/**
 * A single session's working sets for one exercise, ordered by set index.
 * Excludes warmup/drop/failure sets — only working + backoff sets count.
 */
export type SessionSets = CompletedSet[];

export interface ProgressionInput {
  /** Last N sessions, most recent first. Each entry is the working sets for that session. */
  history: SessionSets[];
  /** Current template targets (what the template prescribes before adjustment). */
  currentTargets: SetTarget[];
  /** The progression rule config for this exercise. */
  rule: ProgressionRule;
  /** Global user settings (units, weightIncrement fallback, etc.). */
  settings: UserSettings;
}

export interface ProgressionResult {
  nextTargets: SetTarget[];
  reasoning: string;
  action: ProgressionAction;
  confidence: ProgressionConfidence;
}

export interface ProgressionStrategy {
  calculateNextTargets(input: ProgressionInput): ProgressionResult;
}
