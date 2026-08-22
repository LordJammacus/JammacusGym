import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/database';
import { useWorkoutStore } from '@/stores/workoutStore';
import * as instancesRepo from '@/db/repositories/instances';
import type { Exercise, SetTarget, WorkoutExerciseInstance, WorkoutInstance } from '@/types/entities';

function makeInstance(id: string, status: WorkoutInstance['status'] = 'in_progress'): WorkoutInstance {
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
    durationSeconds: null,
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
      { id: 't2', templateExerciseId: 'te-bench', orderIndex: 1, setType: 'working', targetWeight: 80, targetRepMin: 8, targetRepMax: 10, targetRir: 2 },
      { id: 't3', templateExerciseId: 'te-bench', orderIndex: 2, setType: 'working', targetWeight: 80, targetRepMin: 8, targetRepMax: 10, targetRir: 2 },
    ],
    [
      { id: 't4', templateExerciseId: 'te-ohp', orderIndex: 0, setType: 'working', targetWeight: 40, targetRepMin: 8, targetRepMax: 10, targetRir: 2 },
      { id: 't5', templateExerciseId: 'te-ohp', orderIndex: 1, setType: 'working', targetWeight: 40, targetRepMin: 8, targetRepMax: 10, targetRir: 2 },
    ],
  ];
}

describe('pause and resume workout', () => {
  beforeEach(async () => {
    useWorkoutStore.getState().reset();
    localStorage.clear();
    await db.workoutInstances.clear();
    await db.workoutExerciseInstances.clear();
    await db.completedSets.clear();
    await db.setTargets.clear();
    await db.exercises.clear();
  });

  it('pauses an in-progress session and restores it from history', async () => {
    const instance = makeInstance('w1');
    await useWorkoutStore.getState().startWorkout(instance, makeExercises('w1'), makeTargets());
    await useWorkoutStore.getState().completeSet({ weight: 80, reps: 8, rir: null, setType: 'working' });

    await useWorkoutStore.getState().pauseWorkout();

    expect(useWorkoutStore.getState().instance).toBeNull();
    const paused = await db.workoutInstances.get('w1');
    expect(paused?.status).toBe('paused');
    expect(paused?.sessionSetTargets).toHaveLength(2);

    const result = await useWorkoutStore.getState().resumeWorkout('w1');
    expect(result).toBe('ok');

    const state = useWorkoutStore.getState();
    expect(state.instance?.id).toBe('w1');
    expect(state.instance?.status).toBe('in_progress');
    expect(state.completedSets).toHaveLength(1);
    expect(state.currentExerciseIndex).toBe(0);
    expect(state.currentSetIndex).toBe(1);
    expect(state.setTargets[0]).toHaveLength(3);
  });

  it('resumes on the next unfinished exercise', async () => {
    const instance = makeInstance('w1');
    await useWorkoutStore.getState().startWorkout(instance, makeExercises('w1'), makeTargets());
    await useWorkoutStore.getState().completeSet({ weight: 80, reps: 8, rir: null, setType: 'working' });
    await useWorkoutStore.getState().completeSet({ weight: 80, reps: 8, rir: null, setType: 'working' });
    await useWorkoutStore.getState().completeSet({ weight: 80, reps: 8, rir: null, setType: 'working' });
    await useWorkoutStore.getState().pauseWorkout();

    await useWorkoutStore.getState().resumeWorkout('w1');
    const state = useWorkoutStore.getState();
    expect(state.currentExerciseIndex).toBe(1);
    expect(state.currentSetIndex).toBe(0);
  });

  it('keeps elapsed time from before the pause and excludes the gap', async () => {
    const instance = makeInstance('w1');
    await useWorkoutStore.getState().startWorkout(instance, makeExercises('w1'), makeTargets());

    const startedAt = useWorkoutStore.getState().workoutStartTime!;
    useWorkoutStore.setState({ workoutStartTime: startedAt - 600_000 });
    await useWorkoutStore.getState().pauseWorkout();

    const paused = await db.workoutInstances.get('w1');
    expect(paused?.durationSeconds).toBe(600);

    const beforeResume = Date.now();
    await useWorkoutStore.getState().resumeWorkout('w1');
    const resumeStart = useWorkoutStore.getState().workoutStartTime!;
    expect(resumeStart).toBeGreaterThanOrEqual(beforeResume - 600_000 - 50);
    expect(resumeStart).toBeLessThanOrEqual(Date.now() - 600_000 + 50);
  });

  it('blocks resuming a different session while one is already active', async () => {
    await useWorkoutStore.getState().startWorkout(makeInstance('w1'), makeExercises('w1'), makeTargets());
    await db.workoutInstances.put(makeInstance('w2', 'paused'));

    const result = await useWorkoutStore.getState().resumeWorkout('w2');
    expect(result).toBe('active_conflict');
    expect(useWorkoutStore.getState().instance?.id).toBe('w1');
  });

  it('returns already_active when resuming the live session', async () => {
    await useWorkoutStore.getState().startWorkout(makeInstance('w1'), makeExercises('w1'), makeTargets());
    const result = await useWorkoutStore.getState().resumeWorkout('w1');
    expect(result).toBe('already_active');
  });

  it('picks up extra exercises added after finish later', async () => {
    const instance = makeInstance('w1');
    await useWorkoutStore.getState().startWorkout(instance, makeExercises('w1'), makeTargets());
    await useWorkoutStore.getState().completeSet({ weight: 80, reps: 8, rir: null, setType: 'working' });
    await useWorkoutStore.getState().completeSet({ weight: 80, reps: 8, rir: null, setType: 'working' });
    await useWorkoutStore.getState().completeSet({ weight: 80, reps: 8, rir: null, setType: 'working' });
    useWorkoutStore.getState().nextExercise();
    await useWorkoutStore.getState().completeSet({ weight: 40, reps: 8, rir: null, setType: 'working' });
    await useWorkoutStore.getState().completeSet({ weight: 40, reps: 8, rir: null, setType: 'working' });
    await useWorkoutStore.getState().pauseWorkout();

    const now = '2026-08-16T10:00:00.000Z';
    const curl: Exercise = {
      id: 'ex-curl',
      name: 'Curl',
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
    await db.exercises.put(curl);
    await instancesRepo.addExerciseToWorkout('w1', 'ex-curl');

    const result = await useWorkoutStore.getState().resumeWorkout('w1');
    expect(result).toBe('ok');

    const state = useWorkoutStore.getState();
    expect(state.exerciseInstances).toHaveLength(3);
    expect(state.exerciseInstances[2]?.exerciseId).toBe('ex-curl');
    expect(state.setTargets).toHaveLength(3);
    expect(state.setTargets[2]).toHaveLength(3);
    expect(state.currentExerciseIndex).toBe(2);
    expect(state.currentSetIndex).toBe(0);
  });

  it('keeps reordered exercises after pause and resume', async () => {
    await useWorkoutStore.getState().startWorkout(makeInstance('w1'), makeExercises('w1'), makeTargets());
    await useWorkoutStore.getState().reorderExercises(0, 1);
    expect(useWorkoutStore.getState().exerciseInstances.map(e => e.id)).toEqual(['ei-b', 'ei-a']);

    await useWorkoutStore.getState().pauseWorkout();
    await useWorkoutStore.getState().resumeWorkout('w1');

    const state = useWorkoutStore.getState();
    expect(state.exerciseInstances.map(e => e.id)).toEqual(['ei-b', 'ei-a']);
    expect(state.setTargets[0]?.[0]?.targetWeight).toBe(40);
    expect(state.setTargets[1]?.[0]?.targetWeight).toBe(80);
  });
});
