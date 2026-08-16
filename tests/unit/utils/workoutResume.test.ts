import { describe, it, expect } from 'vitest';
import {
  countRemainingPlannedSets,
  findResumeCursor,
  getResumeCta,
  historyStatusLabel,
} from '@/utils/workoutResume';
import type { CompletedSet, SetTarget, WorkoutExerciseInstance } from '@/types/entities';

function ei(id: string, orderIndex: number): WorkoutExerciseInstance {
  return {
    id,
    workoutInstanceId: 'w1',
    exerciseId: `ex-${id}`,
    templateExerciseId: `te-${id}`,
    originalExerciseId: null,
    orderIndex,
    supersetGroup: null,
    restSecondsTarget: 90,
    notes: '',
  };
}

function target(id: string, templateExerciseId: string, orderIndex: number): SetTarget {
  return {
    id,
    templateExerciseId,
    orderIndex,
    setType: 'working',
    targetWeight: 80,
    targetRepMin: 8,
    targetRepMax: 10,
    targetRir: 2,
  };
}

function set(id: string, workoutExerciseInstanceId: string, orderIndex: number): CompletedSet {
  return {
    id,
    workoutExerciseInstanceId,
    orderIndex,
    setType: 'working',
    targetWeight: 80,
    targetRepMin: 8,
    targetRepMax: 10,
    targetRir: 2,
    actualWeight: 80,
    actualReps: 8,
    actualRir: null,
    actualRestSeconds: null,
    isAdditional: false,
    completedAt: '2026-08-16T10:00:00.000Z',
    notes: '',
  };
}

const exercises = [ei('a', 0), ei('b', 1)];
const targets = [
  [target('t1', 'te-a', 0), target('t2', 'te-a', 1), target('t3', 'te-a', 2)],
  [target('t4', 'te-b', 0), target('t5', 'te-b', 1)],
];

describe('countRemainingPlannedSets', () => {
  it('counts unlogged planned sets across exercises', () => {
    const sets = [set('s1', 'a', 0), set('s2', 'a', 1)];
    expect(countRemainingPlannedSets(exercises, sets, targets)).toBe(3);
  });

  it('does not go negative when extra sets were logged', () => {
    const sets = [set('s1', 'a', 0), set('s2', 'a', 1), set('s3', 'a', 2), set('s4', 'a', 3)];
    expect(countRemainingPlannedSets(exercises, sets, targets)).toBe(2);
  });
});

describe('findResumeCursor', () => {
  it('lands on the first exercise with remaining planned sets', () => {
    const sets = [set('s1', 'a', 0), set('s2', 'a', 1), set('s3', 'a', 2)];
    expect(findResumeCursor(exercises, sets, targets)).toEqual({
      exerciseIndex: 1,
      setIndex: 0,
    });
  });

  it('resumes mid-exercise when some sets are already logged', () => {
    const sets = [set('s1', 'a', 0)];
    expect(findResumeCursor(exercises, sets, targets)).toEqual({
      exerciseIndex: 0,
      setIndex: 1,
    });
  });

  it('lands on the last exercise when every planned set is done', () => {
    const sets = [
      set('s1', 'a', 0),
      set('s2', 'a', 1),
      set('s3', 'a', 2),
      set('s4', 'b', 0),
      set('s5', 'b', 1),
    ];
    expect(findResumeCursor(exercises, sets, targets)).toEqual({
      exerciseIndex: 1,
      setIndex: 2,
    });
  });
});

describe('getResumeCta', () => {
  it('offers Finish remaining for paused and incomplete completed sessions', () => {
    expect(getResumeCta('paused', 4)?.label).toBe('Finish remaining');
    expect(getResumeCta('completed', 2)?.label).toBe('Finish remaining');
    expect(getResumeCta('abandoned', 1)?.label).toBe('Finish remaining');
  });

  it('hides the action on fully completed sessions', () => {
    expect(getResumeCta('completed', 0)).toBeNull();
  });

  it('still lets abandoned sessions reopen even if planned sets are done', () => {
    expect(getResumeCta('abandoned', 0)?.label).toBe('Resume');
  });
});

describe('historyStatusLabel', () => {
  it('labels unfinished and incomplete sessions', () => {
    expect(historyStatusLabel('paused', 3)?.text).toBe('Unfinished');
    expect(historyStatusLabel('abandoned', 0)?.text).toBe('Abandoned');
    expect(historyStatusLabel('completed', 2)?.text).toBe('Incomplete');
    expect(historyStatusLabel('completed', 0)).toBeNull();
  });
});
