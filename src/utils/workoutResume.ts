import type { CompletedSet, SetTarget, WorkoutExerciseInstance } from '@/types/entities';
import type { WorkoutStatus } from '@/types/enums';

export function countRemainingPlannedSets(
  exerciseInstances: WorkoutExerciseInstance[],
  completedSets: CompletedSet[],
  setTargets: SetTarget[][],
): number {
  let remaining = 0;
  for (let i = 0; i < exerciseInstances.length; i++) {
    const ei = exerciseInstances[i]!;
    const planned = setTargets[i]?.length ?? 0;
    const done = completedSets.filter(s => s.workoutExerciseInstanceId === ei.id).length;
    remaining += Math.max(0, planned - done);
  }
  return remaining;
}

export function findResumeCursor(
  exerciseInstances: WorkoutExerciseInstance[],
  completedSets: CompletedSet[],
  setTargets: SetTarget[][],
): { exerciseIndex: number; setIndex: number } {
  for (let i = 0; i < exerciseInstances.length; i++) {
    const ei = exerciseInstances[i]!;
    const planned = setTargets[i]?.length ?? 0;
    const done = completedSets.filter(s => s.workoutExerciseInstanceId === ei.id).length;
    if (done < planned) {
      return { exerciseIndex: i, setIndex: done };
    }
  }

  const last = Math.max(0, exerciseInstances.length - 1);
  const lastEi = exerciseInstances[last];
  const done = lastEi
    ? completedSets.filter(s => s.workoutExerciseInstanceId === lastEi.id).length
    : 0;
  return { exerciseIndex: last, setIndex: done };
}

export function getResumeCta(
  status: WorkoutStatus,
  remainingPlannedSets: number,
): { label: string } | null {
  if (status === 'in_progress' || status === 'paused') {
    return { label: remainingPlannedSets > 0 ? 'Finish remaining' : 'Continue' };
  }
  if (remainingPlannedSets > 0) {
    return { label: 'Finish remaining' };
  }
  if (status === 'abandoned') {
    return { label: 'Resume' };
  }
  return null;
}

export function historyStatusLabel(
  status: WorkoutStatus,
  remainingPlannedSets: number,
): { text: string; className: string } | null {
  if (status === 'in_progress') {
    return { text: 'In progress', className: 'text-amber-400' };
  }
  if (status === 'paused') {
    return { text: 'Unfinished', className: 'text-amber-400' };
  }
  if (status === 'abandoned') {
    return { text: 'Abandoned', className: 'text-red-400' };
  }
  if (remainingPlannedSets > 0) {
    return { text: 'Incomplete', className: 'text-amber-400' };
  }
  return null;
}
