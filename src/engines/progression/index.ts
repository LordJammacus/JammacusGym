import type { ProgressionStrategy as IProgressionStrategy, ProgressionInput, ProgressionResult } from './types';
import type { ProgressionStrategy as StrategyType } from '@/types/enums';
import { doubleProgression } from './strategies/double';
import { weightProgression } from './strategies/weight';
import { repProgression } from './strategies/rep';
import { rirProgression } from './strategies/rir';
import { percentageProgression } from './strategies/percentage';
import { topsetProgression } from './strategies/topset';
import { manualProgression } from './strategies/manual';

const strategies: Record<StrategyType, IProgressionStrategy> = {
  double: doubleProgression,
  weight: weightProgression,
  rep: repProgression,
  rir: rirProgression,
  percentage: percentageProgression,
  topset_backoff: topsetProgression,
  manual: manualProgression,
};

export function calculateProgression(input: ProgressionInput): ProgressionResult {
  const strategy = strategies[input.rule.strategy];
  return strategy.calculateNextTargets(input);
}

export type { ProgressionInput, ProgressionResult, SessionSets } from './types';
