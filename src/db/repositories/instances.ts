import { db } from '../database';
import type { WorkoutInstance, WorkoutExerciseInstance, CompletedSet, SetTarget } from '@/types/entities';
import { generateId } from '@/utils/ids';
import * as exercisesRepo from './exercises';
import * as workoutsRepo from './workouts';

export async function createWorkoutInstance(instance: WorkoutInstance): Promise<void> {
  await db.workoutInstances.put(instance);
}

export async function updateWorkoutInstance(id: string, updates: Partial<WorkoutInstance>): Promise<void> {
  await db.workoutInstances.update(id, updates);
}

export async function getWorkoutInstance(id: string): Promise<WorkoutInstance | undefined> {
  return db.workoutInstances.get(id);
}

export async function getInProgressWorkout(): Promise<WorkoutInstance | undefined> {
  return db.workoutInstances.where('status').equals('in_progress').first();
}

export async function getHistoryWorkouts(): Promise<WorkoutInstance[]> {
  const all = await db.workoutInstances.orderBy('startedAt').reverse().toArray();
  const unfinished = all.filter(i => i.status === 'in_progress' || i.status === 'paused');
  const finished = all.filter(i => i.status === 'completed' || i.status === 'abandoned');
  return [...unfinished, ...finished];
}

export async function resolveSessionSetTargets(
  instance: WorkoutInstance,
  exerciseInstances: WorkoutExerciseInstance[],
): Promise<SetTarget[][]> {
  if (instance.sessionSetTargets && instance.sessionSetTargets.length === exerciseInstances.length) {
    return instance.sessionSetTargets;
  }

  const targets: SetTarget[][] = [];
  for (const ei of exerciseInstances) {
    if (ei.templateExerciseId) {
      targets.push(await workoutsRepo.getSetTargets(ei.templateExerciseId));
    } else {
      targets.push([]);
    }
  }
  return targets;
}

/** @deprecated Use getHistoryWorkouts — name was misleading (includes abandoned). */
export async function getCompletedWorkouts(): Promise<WorkoutInstance[]> {
  return getHistoryWorkouts();
}

export async function createExerciseInstances(instances: WorkoutExerciseInstance[]): Promise<void> {
  await db.workoutExerciseInstances.bulkPut(instances);
}

export async function updateExerciseInstance(id: string, updates: Partial<WorkoutExerciseInstance>): Promise<void> {
  await db.workoutExerciseInstances.update(id, updates);
}

export async function getExerciseInstances(workoutInstanceId: string): Promise<WorkoutExerciseInstance[]> {
  return db.workoutExerciseInstances
    .where('workoutInstanceId')
    .equals(workoutInstanceId)
    .sortBy('orderIndex');
}

function alignTargetsToOrder(
  orderedIds: string[],
  currentIds: string[],
  currentTargets: SetTarget[][],
): SetTarget[][] {
  const byId = new Map(currentIds.map((id, i) => [id, currentTargets[i] ?? []]));
  return orderedIds.map(id => byId.get(id) ?? []);
}

async function resolveTargetsForEdit(
  instance: WorkoutInstance,
  exerciseInstances: WorkoutExerciseInstance[],
  sessionSetTargets?: SetTarget[][],
): Promise<SetTarget[][]> {
  if (sessionSetTargets && sessionSetTargets.length === exerciseInstances.length) {
    return sessionSetTargets;
  }
  return resolveSessionSetTargets(instance, exerciseInstances);
}

/**
 * Adds an extra exercise to a session (history or live). Snapshots planned
 * sets onto the instance so resume/continue shows the new movement.
 */
export async function addExerciseToWorkout(
  workoutInstanceId: string,
  exerciseId: string,
  options?: { sessionSetTargets?: SetTarget[][] },
): Promise<{ exerciseInstance: WorkoutExerciseInstance; setTargets: SetTarget[][] }> {
  const instance = await getWorkoutInstance(workoutInstanceId);
  if (!instance) {
    throw new Error('Workout not found');
  }

  const exercise = await exercisesRepo.getExercise(exerciseId);
  if (!exercise) {
    throw new Error('Exercise not found');
  }

  const existing = await getExerciseInstances(workoutInstanceId);
  const currentTargets = await resolveTargetsForEdit(instance, existing, options?.sessionSetTargets);

  const exerciseInstance: WorkoutExerciseInstance = {
    id: generateId(),
    workoutInstanceId,
    exerciseId,
    templateExerciseId: null,
    originalExerciseId: null,
    orderIndex: existing.length,
    supersetGroup: null,
    restSecondsTarget: exercise.defaultRestSeconds,
    notes: '',
  };

  const planned: SetTarget[] = Array.from({ length: 3 }, (_, i) => ({
    id: generateId(),
    templateExerciseId: exerciseInstance.id,
    orderIndex: i,
    setType: 'working',
    targetWeight: null,
    targetRepMin: exercise.defaultRepRangeMin,
    targetRepMax: exercise.defaultRepRangeMax,
    targetRir: null,
  }));

  const setTargets = [...currentTargets, planned];

  await db.transaction('rw', [db.workoutExerciseInstances, db.workoutInstances], async () => {
    await db.workoutExerciseInstances.put(exerciseInstance);
    await db.workoutInstances.update(workoutInstanceId, { sessionSetTargets: setTargets });
  });

  return { exerciseInstance, setTargets };
}

export async function reorderExerciseInstances(
  workoutInstanceId: string,
  orderedIds: string[],
  options?: { sessionSetTargets?: SetTarget[][] },
): Promise<{ exerciseInstances: WorkoutExerciseInstance[]; setTargets: SetTarget[][] }> {
  const instance = await getWorkoutInstance(workoutInstanceId);
  if (!instance) {
    throw new Error('Workout not found');
  }

  const existing = await getExerciseInstances(workoutInstanceId);
  if (existing.length !== orderedIds.length) {
    throw new Error('Exercise order must include every exercise');
  }

  const byId = new Map(existing.map(ei => [ei.id, ei]));
  for (const id of orderedIds) {
    if (!byId.has(id)) {
      throw new Error('Exercise order includes an unknown exercise');
    }
  }

  const currentTargets = await resolveTargetsForEdit(instance, existing, options?.sessionSetTargets);
  const setTargets = alignTargetsToOrder(
    orderedIds,
    existing.map(ei => ei.id),
    currentTargets,
  );
  const exerciseInstances = orderedIds.map((id, orderIndex) => ({
    ...byId.get(id)!,
    orderIndex,
  }));

  await db.transaction('rw', [db.workoutExerciseInstances, db.workoutInstances], async () => {
    for (const ei of exerciseInstances) {
      await db.workoutExerciseInstances.update(ei.id, { orderIndex: ei.orderIndex });
    }
    await db.workoutInstances.update(workoutInstanceId, { sessionSetTargets: setTargets });
  });

  return { exerciseInstances, setTargets };
}

export async function removeExerciseFromWorkout(
  workoutInstanceId: string,
  exerciseInstanceId: string,
  options?: { sessionSetTargets?: SetTarget[][] },
): Promise<{ exerciseInstances: WorkoutExerciseInstance[]; setTargets: SetTarget[][] }> {
  const instance = await getWorkoutInstance(workoutInstanceId);
  if (!instance) {
    throw new Error('Workout not found');
  }

  const existing = await getExerciseInstances(workoutInstanceId);
  if (existing.length <= 1) {
    throw new Error('Cannot remove the last exercise');
  }

  const remaining = existing.filter(ei => ei.id !== exerciseInstanceId);
  if (remaining.length === existing.length) {
    throw new Error('Exercise not found');
  }

  const currentTargets = await resolveTargetsForEdit(instance, existing, options?.sessionSetTargets);
  const setTargets = alignTargetsToOrder(
    remaining.map(ei => ei.id),
    existing.map(ei => ei.id),
    currentTargets,
  );
  const exerciseInstances = remaining.map((ei, orderIndex) => ({ ...ei, orderIndex }));

  await db.transaction('rw', [db.workoutExerciseInstances, db.workoutInstances, db.completedSets], async () => {
    await db.completedSets.where('workoutExerciseInstanceId').equals(exerciseInstanceId).delete();
    await db.workoutExerciseInstances.delete(exerciseInstanceId);
    for (const ei of exerciseInstances) {
      await db.workoutExerciseInstances.update(ei.id, { orderIndex: ei.orderIndex });
    }
    await db.workoutInstances.update(workoutInstanceId, { sessionSetTargets: setTargets });
  });

  return { exerciseInstances, setTargets };
}

export async function addCompletedSet(set: CompletedSet): Promise<void> {
  await db.completedSets.put(set);
}

export async function getCompletedSets(workoutExerciseInstanceId: string): Promise<CompletedSet[]> {
  return db.completedSets
    .where('workoutExerciseInstanceId')
    .equals(workoutExerciseInstanceId)
    .sortBy('orderIndex');
}

export async function getAllCompletedSetsForWorkout(workoutInstanceId: string): Promise<CompletedSet[]> {
  const exerciseInstances = await getExerciseInstances(workoutInstanceId);
  const ids = exerciseInstances.map(e => e.id);
  return db.completedSets
    .where('workoutExerciseInstanceId')
    .anyOf(ids)
    .sortBy('orderIndex');
}

export async function getLastInstanceForTemplate(templateId: string, excludeId?: string): Promise<WorkoutInstance | undefined> {
  const instances = await db.workoutInstances
    .where('workoutTemplateId')
    .equals(templateId)
    .filter(i => i.status === 'completed' && i.id !== excludeId)
    .sortBy('startedAt');
  return instances[instances.length - 1];
}

export async function updateCompletedSet(id: string, updates: Partial<CompletedSet>): Promise<void> {
  await db.completedSets.update(id, updates);
}

export async function deleteCompletedSet(id: string): Promise<void> {
  await db.completedSets.delete(id);
}

export async function reindexCompletedSets(
  workoutExerciseInstanceId: string,
): Promise<void> {
  const sets = await getCompletedSets(workoutExerciseInstanceId);
  await db.transaction('rw', db.completedSets, async () => {
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i]!;
      if (set.orderIndex !== i) {
        await db.completedSets.update(set.id, { orderIndex: i });
      }
    }
  });
}

/**
 * Returns the last N completed sessions' working sets for a given exercise,
 * identified by templateExerciseId. Most recent session first.
 */
export async function getExerciseHistory(
  exerciseId: string,
  templateExerciseId: string,
  sessionCount: number,
): Promise<CompletedSet[][]> {
  const allInstances = await db.workoutInstances
    .where('status')
    .equals('completed')
    .reverse()
    .sortBy('startedAt');

  const sessions: CompletedSet[][] = [];

  for (const instance of allInstances) {
    if (sessions.length >= sessionCount) break;

    const exerciseInsts = await db.workoutExerciseInstances
      .where('workoutInstanceId')
      .equals(instance.id)
      .filter(ei => ei.exerciseId === exerciseId || ei.templateExerciseId === templateExerciseId)
      .toArray();

    for (const ei of exerciseInsts) {
      const sets = await db.completedSets
        .where('workoutExerciseInstanceId')
        .equals(ei.id)
        .filter(s => s.setType === 'working' || s.setType === 'backoff')
        .sortBy('orderIndex');

      if (sets.length > 0) {
        sessions.push(sets);
        break;
      }
    }
  }

  return sessions;
}
