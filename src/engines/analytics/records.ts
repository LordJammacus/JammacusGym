import type { CompletedSet, WorkoutExerciseInstance } from '@/types/entities';
import type { PersonalRecord } from '@/types/analytics';
import { estimateOneRepMax } from './intensity';
import { generateId } from '@/utils/ids';

/**
 * Detect new personal records from a set of newly completed sets,
 * compared against existing records.
 */
export function detectPersonalRecords(
  newSets: CompletedSet[],
  exerciseInstances: WorkoutExerciseInstance[],
  existingRecords: PersonalRecord[],
  workoutInstanceId: string,
): PersonalRecord[] {
  const eiMap = new Map<string, string>();
  for (const ei of exerciseInstances) {
    eiMap.set(ei.id, ei.exerciseId);
  }

  const recordsByExercise = new Map<string, Map<string, PersonalRecord>>();
  for (const r of existingRecords) {
    const exerciseMap = recordsByExercise.get(r.exerciseId) ?? new Map();
    const key = r.type === 'reps_at_weight' ? `${r.type}_${r.weight}` : r.type;
    exerciseMap.set(key, r);
    recordsByExercise.set(r.exerciseId, exerciseMap);
  }

  const newRecords: PersonalRecord[] = [];
  const now = new Date().toISOString();

  const exerciseSets = new Map<string, CompletedSet[]>();
  for (const set of newSets) {
    if (set.setType === 'warmup') continue;
    const exerciseId = eiMap.get(set.workoutExerciseInstanceId);
    if (!exerciseId) continue;
    const existing = exerciseSets.get(exerciseId) ?? [];
    existing.push(set);
    exerciseSets.set(exerciseId, existing);
  }

  for (const [exerciseId, sets] of exerciseSets) {
    const currentRecords = recordsByExercise.get(exerciseId) ?? new Map<string, PersonalRecord>();

    for (const set of sets) {
      // Weight PR
      const weightPR = currentRecords.get('weight');
      if (!weightPR || set.actualWeight > weightPR.value) {
        const pr = makePR(exerciseId, 'weight', set.actualWeight, set, workoutInstanceId, now);
        newRecords.push(pr);
        currentRecords.set('weight', pr);
      }

      // Rep PR (at any weight)
      const repPR = currentRecords.get('reps');
      if (!repPR || set.actualReps > repPR.value) {
        const pr = makePR(exerciseId, 'reps', set.actualReps, set, workoutInstanceId, now);
        newRecords.push(pr);
        currentRecords.set('reps', pr);
      }

      // Estimated 1RM PR
      const e1rm = estimateOneRepMax(set.actualWeight, set.actualReps);
      const e1rmPR = currentRecords.get('estimated_1rm');
      if (e1rm > 0 && (!e1rmPR || e1rm > e1rmPR.value)) {
        const pr = makePR(exerciseId, 'estimated_1rm', e1rm, set, workoutInstanceId, now);
        newRecords.push(pr);
        currentRecords.set('estimated_1rm', pr);
      }

      // Reps-at-weight PR
      const rawKey = `reps_at_weight_${set.actualWeight}`;
      const rawPR = currentRecords.get(rawKey);
      if (!rawPR || set.actualReps > rawPR.value) {
        const pr: PersonalRecord = {
          id: generateId(),
          exerciseId,
          type: 'reps_at_weight',
          value: set.actualReps,
          weight: set.actualWeight,
          reps: set.actualReps,
          completedSetId: set.id,
          workoutInstanceId,
          achievedAt: set.completedAt,
          createdAt: now,
        };
        newRecords.push(pr);
        currentRecords.set(rawKey, pr);
      }
    }

    // Volume PR (total session volume for this exercise)
    const sessionVolume = sets.reduce((acc, s) => acc + s.actualWeight * s.actualReps, 0);
    const volPR = currentRecords.get('volume');
    if (sessionVolume > 0 && (!volPR || sessionVolume > volPR.value)) {
      const bestSet = sets.reduce((best, s) =>
        (s.actualWeight * s.actualReps > best.actualWeight * best.actualReps) ? s : best,
      );
      const pr = makePR(exerciseId, 'volume', Math.round(sessionVolume), bestSet, workoutInstanceId, now);
      newRecords.push(pr);
      currentRecords.set('volume', pr);
    }

    recordsByExercise.set(exerciseId, currentRecords);
  }

  return newRecords;
}

function makePR(
  exerciseId: string,
  type: PersonalRecord['type'],
  value: number,
  set: CompletedSet,
  workoutInstanceId: string,
  now: string,
): PersonalRecord {
  return {
    id: generateId(),
    exerciseId,
    type,
    value,
    weight: set.actualWeight,
    reps: set.actualReps,
    completedSetId: set.id,
    workoutInstanceId,
    achievedAt: set.completedAt,
    createdAt: now,
  };
}
