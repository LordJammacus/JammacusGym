import type { SetTarget } from '@/types/entities';
import type { SessionSets } from './types';

export function cloneTargets(targets: SetTarget[]): SetTarget[] {
  return targets.map(t => ({ ...t }));
}

export function roundWeight(weight: number, increment: number): number {
  if (increment <= 0) return Math.round(weight * 100) / 100;
  return Math.round(weight / increment) * increment;
}

export function countConsecutiveSuccesses(
  history: SessionSets[],
  predicate: (session: SessionSets) => boolean,
): number {
  let count = 0;
  for (const session of history) {
    if (predicate(session)) count++;
    else break;
  }
  return count;
}

export function countConsecutiveFailures(
  history: SessionSets[],
  predicate: (session: SessionSets) => boolean,
): number {
  let count = 0;
  for (const session of history) {
    if (predicate(session)) count++;
    else break;
  }
  return count;
}

export function filterWorkingSets(sets: SessionSets): SessionSets {
  return sets.filter(s => s.setType === 'working' || s.setType === 'backoff');
}
