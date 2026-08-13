import type { CompletedSet, WorkoutExerciseInstance, WorkoutInstance } from '@/types/entities';
import type { ExerciseProgressionPoint } from '@/types/analytics';
import { completedWorkoutsOnly } from './completedOnly';

/**
 * Epley formula: 1RM = weight × (1 + reps / 30)
 * Only valid for reps > 0 and reps <= 30.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  if (reps > 30) return weight * (1 + 30 / 30);
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function calculateVolumeLoad(weight: number, reps: number, sets: number): number {
  return weight * reps * sets;
}

/**
 * Build a timeline of progression data points for a specific exercise.
 * Returns one point per workout session (best working set by estimated 1RM).
 */
export function buildExerciseProgression(
  sets: CompletedSet[],
  exerciseInstances: WorkoutExerciseInstance[],
  instances: WorkoutInstance[],
  exerciseId: string,
): ExerciseProgressionPoint[] {
  const instanceDateMap = new Map<string, string>();
  for (const inst of completedWorkoutsOnly(instances)) {
    instanceDateMap.set(inst.id, inst.startedAt);
  }

  const eiForExercise = exerciseInstances.filter(ei => ei.exerciseId === exerciseId);
  const eiIds = new Set(eiForExercise.map(ei => ei.id));
  const eiToInstance = new Map<string, string>();
  for (const ei of eiForExercise) {
    eiToInstance.set(ei.id, ei.workoutInstanceId);
  }

  const sessionSets = new Map<string, CompletedSet[]>();
  for (const set of sets) {
    if (!eiIds.has(set.workoutExerciseInstanceId)) continue;
    if (set.setType === 'warmup') continue;

    const instanceId = eiToInstance.get(set.workoutExerciseInstanceId);
    if (!instanceId) continue;

    const existing = sessionSets.get(instanceId) ?? [];
    existing.push(set);
    sessionSets.set(instanceId, existing);
  }

  const points: ExerciseProgressionPoint[] = [];
  for (const [instanceId, sessionSetList] of sessionSets) {
    const date = instanceDateMap.get(instanceId);
    if (!date) continue;

    let bestSet: CompletedSet | null = null;
    let best1RM = 0;

    for (const s of sessionSetList) {
      const e1rm = estimateOneRepMax(s.actualWeight, s.actualReps);
      if (e1rm > best1RM) {
        best1RM = e1rm;
        bestSet = s;
      }
    }

    if (bestSet) {
      const totalVolume = sessionSetList.reduce(
        (acc, s) => acc + s.actualWeight * s.actualReps, 0,
      );

      points.push({
        date: date.split('T')[0]!,
        weight: bestSet.actualWeight,
        reps: bestSet.actualReps,
        estimated1RM: best1RM,
        volumeLoad: Math.round(totalVolume),
      });
    }
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Build progression timelines for every exercise that appears in the given sessions.
 */
export function buildAllExerciseProgressions(
  sets: CompletedSet[],
  exerciseInstances: WorkoutExerciseInstance[],
  instances: WorkoutInstance[],
): Map<string, ExerciseProgressionPoint[]> {
  const exerciseIds = new Set(exerciseInstances.map(ei => ei.exerciseId));
  const map = new Map<string, ExerciseProgressionPoint[]>();
  for (const exerciseId of exerciseIds) {
    const points = buildExerciseProgression(sets, exerciseInstances, instances, exerciseId);
    if (points.length > 0) {
      map.set(exerciseId, points);
    }
  }
  return map;
}
