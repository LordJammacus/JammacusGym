import type { SetTarget } from '@/types/entities';
import type { SetType } from '@/types/enums';
import type { SessionSets } from './types';

export function isWorkingSetType(setType: SetType): boolean {
  return setType === 'working' || setType === 'backoff';
}

export function firstWorkingTarget(targets: SetTarget[]): SetTarget | undefined {
  return targets.find(t => t.setType === 'working') ?? targets.find(t => t.setType === 'backoff');
}

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
  return sets.filter(s => isWorkingSetType(s.setType));
}

/**
 * Sets that count for progression: working/backoff only.
 * Also drops mis-tagged warmups (stored target range below the working floor,
 * or leading sets that never hit the working rep min).
 */
export function filterSessionForProgression(
  sets: SessionSets,
  workingRepMin: number | null,
): SessionSets {
  return filterWorkingSets(sets).filter(s => {
    if (workingRepMin == null) return true;
    if (s.targetRepMax != null && s.targetRepMax < workingRepMin) return false;
    return true;
  });
}

export function sanitizeProgressionHistory(
  history: SessionSets[],
  targets: SetTarget[],
): SessionSets[] {
  const workingMin = firstWorkingTarget(targets)?.targetRepMin ?? null;
  return history
    .map(session => filterSessionForProgression(session, workingMin))
    .filter(session => session.length > 0);
}
