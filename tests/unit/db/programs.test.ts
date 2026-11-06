import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/database';
import {
  createProgram,
  createBlock,
  addBlockWorkout,
  getActiveProgram,
  setActiveProgram,
  determineNextWorkout,
  listWorkoutGroups,
  NO_PROGRAM_GROUP_ID,
} from '@/db/repositories/programs';
import type { Program, TrainingBlock, WorkoutInstance, WorkoutTemplate } from '@/types/entities';

function makeProgram(id: string, isActive: boolean): Program {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id,
    name: id,
    description: '',
    isActive,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
}

describe('getActiveProgram', () => {
  beforeEach(async () => {
    await db.programs.clear();
  });

  it('finds a program stored with boolean isActive true', async () => {
    await createProgram(makeProgram('prog-a', true));
    const active = await getActiveProgram();
    expect(active?.id).toBe('prog-a');
  });

  it('ignores archived active flags', async () => {
    await createProgram({
      ...makeProgram('prog-old', true),
      archivedAt: '2026-01-02T00:00:00.000Z',
    });
    await createProgram(makeProgram('prog-live', true));
    const active = await getActiveProgram();
    expect(active?.id).toBe('prog-live');
  });

  it('setActiveProgram switches the active flag', async () => {
    await createProgram(makeProgram('prog-a', true));
    await createProgram(makeProgram('prog-b', false));
    await setActiveProgram('prog-b');

    const active = await getActiveProgram();
    expect(active?.id).toBe('prog-b');

    const a = await db.programs.get('prog-a');
    expect(a?.isActive).toBe(false);
  });
});

describe('determineNextWorkout', () => {
  const programId = 'prog-ppl';
  const blockId = 'block-1';
  const push = 'tmpl-push';
  const pull = 'tmpl-pull';
  const legs = 'tmpl-legs';

  beforeEach(async () => {
    await db.programs.clear();
    await db.trainingBlocks.clear();
    await db.blockWorkouts.clear();
    await db.workoutInstances.clear();

    await createProgram(makeProgram(programId, true));
    const block: TrainingBlock = {
      id: blockId,
      programId,
      name: 'Hypertrophy',
      orderIndex: 0,
      weekCount: 6,
      goal: 'hypertrophy',
      notes: '',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    await createBlock(block);
    await addBlockWorkout({ id: 'bw-0', trainingBlockId: blockId, workoutTemplateId: push, orderIndex: 0, dayOfWeek: null });
    await addBlockWorkout({ id: 'bw-1', trainingBlockId: blockId, workoutTemplateId: pull, orderIndex: 1, dayOfWeek: null });
    await addBlockWorkout({ id: 'bw-2', trainingBlockId: blockId, workoutTemplateId: legs, orderIndex: 2, dayOfWeek: null });
  });

  function instance(
    id: string,
    templateId: string,
    status: WorkoutInstance['status'],
    startedAt: string,
    instanceProgramId: string | null = null,
  ): WorkoutInstance {
    return {
      id,
      workoutTemplateId: templateId,
      programId: instanceProgramId,
      trainingBlockId: instanceProgramId ? blockId : null,
      templateName: templateId,
      goal: 'hypertrophy',
      status,
      startedAt,
      completedAt: status === 'in_progress' ? null : startedAt,
      durationSeconds: null,
      notes: '',
      createdAt: startedAt,
    };
  }

  it('starts at the first template when there is no history', async () => {
    const next = await determineNextWorkout(programId);
    expect(next?.templateId).toBe(push);
    expect(next?.workoutIndex).toBe(0);
  });

  it('advances after a completed workout even if programId was never stored', async () => {
    await db.workoutInstances.put(instance('i1', push, 'completed', '2026-08-10T10:00:00.000Z'));
    const next = await determineNextWorkout(programId);
    expect(next?.templateId).toBe(pull);
  });

  it('ignores abandoned sessions so rotation does not skip ahead', async () => {
    await db.workoutInstances.bulkPut([
      instance('i1', push, 'completed', '2026-08-10T10:00:00.000Z'),
      instance('i2', pull, 'abandoned', '2026-08-12T10:00:00.000Z'),
    ]);
    const next = await determineNextWorkout(programId);
    expect(next?.templateId).toBe(pull);
  });

  it('ignores in-progress sessions', async () => {
    await db.workoutInstances.bulkPut([
      instance('i1', push, 'completed', '2026-08-10T10:00:00.000Z'),
      instance('i2', pull, 'in_progress', '2026-08-12T10:00:00.000Z'),
    ]);
    const next = await determineNextWorkout(programId);
    expect(next?.templateId).toBe(pull);
  });

  it('ignores paused sessions so rotation does not skip ahead', async () => {
    await db.workoutInstances.bulkPut([
      instance('i1', push, 'completed', '2026-08-10T10:00:00.000Z'),
      instance('i2', pull, 'paused', '2026-08-12T10:00:00.000Z'),
    ]);
    const next = await determineNextWorkout(programId);
    expect(next?.templateId).toBe(pull);
  });

  it('wraps to the first template after completing the last in the block', async () => {
    await db.workoutInstances.put(instance('i1', legs, 'completed', '2026-08-10T10:00:00.000Z', programId));
    const next = await determineNextWorkout(programId);
    expect(next?.templateId).toBe(push);
  });
});

describe('listWorkoutGroups', () => {
  function makeTemplate(id: string, name: string, archivedAt: string | null = null): WorkoutTemplate {
    return {
      id,
      name,
      goal: 'hypertrophy',
      estimatedDurationMinutes: null,
      notes: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      archivedAt,
    };
  }

  beforeEach(async () => {
    await db.programs.clear();
    await db.trainingBlocks.clear();
    await db.blockWorkouts.clear();
    await db.workoutTemplates.clear();
  });

  it('groups workouts by program and keeps one-offs in No program', async () => {
    await createProgram(makeProgram('prog-ppl', true));
    await createProgram(makeProgram('prog-upper', false));
    await createBlock({
      id: 'block-hyper',
      programId: 'prog-ppl',
      name: 'Hypertrophy',
      orderIndex: 0,
      weekCount: 6,
      goal: 'hypertrophy',
      notes: '',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await createBlock({
      id: 'block-strength',
      programId: 'prog-ppl',
      name: 'Strength',
      orderIndex: 1,
      weekCount: 4,
      goal: 'strength',
      notes: '',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await createBlock({
      id: 'block-upper',
      programId: 'prog-upper',
      name: 'Specialisation',
      orderIndex: 0,
      weekCount: 8,
      goal: 'hypertrophy',
      notes: '',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await addBlockWorkout({ id: 'bw-push', trainingBlockId: 'block-hyper', workoutTemplateId: 'tmpl-push', orderIndex: 0, dayOfWeek: null });
    await addBlockWorkout({ id: 'bw-pull', trainingBlockId: 'block-hyper', workoutTemplateId: 'tmpl-pull', orderIndex: 1, dayOfWeek: null });
    await addBlockWorkout({ id: 'bw-strength', trainingBlockId: 'block-strength', workoutTemplateId: 'tmpl-push-s', orderIndex: 0, dayOfWeek: null });
    await addBlockWorkout({ id: 'bw-upper', trainingBlockId: 'block-upper', workoutTemplateId: 'tmpl-a', orderIndex: 0, dayOfWeek: null });
    await db.workoutTemplates.bulkPut([
      makeTemplate('tmpl-push', 'Push'),
      makeTemplate('tmpl-pull', 'Pull'),
      makeTemplate('tmpl-push-s', 'Push Strength'),
      makeTemplate('tmpl-a', 'Day A'),
      makeTemplate('tmpl-extra', 'Arms Finisher'),
      makeTemplate('tmpl-old', 'Archived Day', '2026-02-01T00:00:00.000Z'),
    ]);

    const groups = await listWorkoutGroups();

    expect(groups.map(group => group.label)).toEqual([
      'prog-ppl · Hypertrophy',
      'prog-ppl · Strength',
      'prog-upper',
      'No program',
    ]);
    expect(groups[0]?.isActive).toBe(true);
    expect(groups[1]?.isActive).toBe(false);
    expect(groups[0]?.templateIds).toEqual(['tmpl-push', 'tmpl-pull']);
    expect(groups[1]?.templateIds).toEqual(['tmpl-push-s']);
    expect(groups[2]?.templateIds).toEqual(['tmpl-a']);
    expect(groups[3]?.id).toBe(NO_PROGRAM_GROUP_ID);
    expect(groups[3]?.programId).toBeNull();
    expect(groups[3]?.templateIds).toEqual(['tmpl-extra']);
  });

  it('keeps an empty program selectable', async () => {
    await createProgram({ ...makeProgram('prog-empty', false), name: 'Empty Split' });

    const groups = await listWorkoutGroups();

    expect(groups[0]).toMatchObject({
      id: 'program:prog-empty',
      label: 'Empty Split',
      programId: 'prog-empty',
      blockId: null,
      templateIds: [],
    });
    expect(groups.at(-1)?.id).toBe(NO_PROGRAM_GROUP_ID);
  });
});
