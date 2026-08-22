import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/database';
import * as instancesRepo from '@/db/repositories/instances';
import type { Exercise, SetTarget, WorkoutExerciseInstance, WorkoutInstance } from '@/types/entities';

function makeInstance(id: string, status: WorkoutInstance['status'] = 'paused'): WorkoutInstance {
  const now = '2026-08-16T10:00:00.000Z';
  return {
    id,
    workoutTemplateId: 'tmpl-1',
    programId: null,
    trainingBlockId: null,
    templateName: 'Push',
    goal: 'hypertrophy',
    status,
    startedAt: now,
    completedAt: null,
    durationSeconds: 120,
    notes: '',
    createdAt: now,
  };
}

function makeExercises(workoutInstanceId: string): WorkoutExerciseInstance[] {
  return [
    {
      id: 'ei-a',
      workoutInstanceId,
      exerciseId: 'ex-bench',
      templateExerciseId: 'te-bench',
      originalExerciseId: null,
      orderIndex: 0,
      supersetGroup: null,
      restSecondsTarget: 120,
      notes: '',
    },
    {
      id: 'ei-b',
      workoutInstanceId,
      exerciseId: 'ex-ohp',
      templateExerciseId: 'te-ohp',
      originalExerciseId: null,
      orderIndex: 1,
      supersetGroup: null,
      restSecondsTarget: 90,
      notes: '',
    },
  ];
}

function makeTargets(): SetTarget[][] {
  return [
    [
      { id: 't1', templateExerciseId: 'te-bench', orderIndex: 0, setType: 'working', targetWeight: 80, targetRepMin: 8, targetRepMax: 10, targetRir: 2 },
    ],
    [
      { id: 't2', templateExerciseId: 'te-ohp', orderIndex: 0, setType: 'working', targetWeight: 40, targetRepMin: 8, targetRepMax: 10, targetRir: 2 },
    ],
  ];
}

function makeExercise(id: string, name: string): Exercise {
  const now = '2026-08-16T10:00:00.000Z';
  return {
    id,
    name,
    category: 'isolation',
    equipment: 'dumbbell',
    movementPattern: 'isolation',
    defaultRepRangeMin: 8,
    defaultRepRangeMax: 12,
    defaultRestSeconds: 75,
    notes: '',
    isCustom: false,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe('session exercise edits', () => {
  beforeEach(async () => {
    await db.workoutInstances.clear();
    await db.workoutExerciseInstances.clear();
    await db.completedSets.clear();
    await db.exercises.clear();
  });

  it('adds an extra exercise and planned sets onto a paused session', async () => {
    const instance = { ...makeInstance('w1'), sessionSetTargets: makeTargets() };
    await db.workoutInstances.put(instance);
    await db.workoutExerciseInstances.bulkPut(makeExercises('w1'));
    await db.exercises.put(makeExercise('ex-curl', 'Curl'));

    const { exerciseInstance, setTargets } = await instancesRepo.addExerciseToWorkout('w1', 'ex-curl');

    expect(exerciseInstance.exerciseId).toBe('ex-curl');
    expect(exerciseInstance.templateExerciseId).toBeNull();
    expect(exerciseInstance.orderIndex).toBe(2);
    expect(setTargets).toHaveLength(3);
    expect(setTargets[2]).toHaveLength(3);
    expect(setTargets[2]![0]?.targetRepMin).toBe(8);
    expect(setTargets[2]![0]?.targetRepMax).toBe(12);

    const stored = await db.workoutInstances.get('w1');
    expect(stored?.sessionSetTargets).toHaveLength(3);
    const eis = await instancesRepo.getExerciseInstances('w1');
    expect(eis.map(e => e.exerciseId)).toEqual(['ex-bench', 'ex-ohp', 'ex-curl']);
  });

  it('reorders exercises and keeps session set targets aligned', async () => {
    const instance = { ...makeInstance('w1'), sessionSetTargets: makeTargets() };
    await db.workoutInstances.put(instance);
    await db.workoutExerciseInstances.bulkPut(makeExercises('w1'));

    const { exerciseInstances, setTargets } = await instancesRepo.reorderExerciseInstances(
      'w1',
      ['ei-b', 'ei-a'],
    );

    expect(exerciseInstances.map(e => e.id)).toEqual(['ei-b', 'ei-a']);
    expect(exerciseInstances.map(e => e.orderIndex)).toEqual([0, 1]);
    expect(setTargets[0]?.[0]?.id).toBe('t2');
    expect(setTargets[1]?.[0]?.id).toBe('t1');

    const storedEis = await instancesRepo.getExerciseInstances('w1');
    expect(storedEis.map(e => e.id)).toEqual(['ei-b', 'ei-a']);
    const stored = await db.workoutInstances.get('w1');
    expect(stored?.sessionSetTargets?.[0]?.[0]?.id).toBe('t2');
  });
});
