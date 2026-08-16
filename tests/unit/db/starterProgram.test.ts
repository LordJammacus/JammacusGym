import { describe, it, expect, beforeEach } from 'vitest';
import { buildStarterProgramData, STARTER_PROGRAM_ID } from '@/constants/starterProgram';
import { EXERCISES } from '@/constants/exercises';
import { db } from '@/db/database';
import { patchStarterPushShoulderPress } from '@/db/seed';
import type { Program, TemplateExercise, WorkoutTemplate } from '@/types/entities';

describe('starter home PPL program', () => {
  const data = buildStarterProgramData('2026-01-01T00:00:00.000Z');
  const exerciseIds = new Set(EXERCISES.map(e => e.id));

  it('builds the expected program shell', () => {
    expect(data.program.id).toBe(STARTER_PROGRAM_ID);
    expect(data.program.isActive).toBe(true);
    expect(data.templates).toHaveLength(9);
    expect(data.blocks).toHaveLength(3);
    expect(data.blocks.map(b => b.goal)).toEqual(['hypertrophy', 'strength', 'deload']);
    expect(data.blocks.map(b => b.weekCount)).toEqual([6, 4, 1]);
    expect(data.blockWorkouts).toHaveLength(9);
  });

  it('only references catalog exercises that exist', () => {
    for (const te of data.templateExercises) {
      expect(exerciseIds.has(te.exerciseId)).toBe(true);
    }
  });

  it('keeps hypertrophy push close to the current home routine', () => {
    const push = data.templates.find(t => t.id === 'tmpl-push-hypertrophy')!;
    const tes = data.templateExercises
      .filter(te => te.workoutTemplateId === push.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    expect(tes.map(te => te.exerciseId)).toEqual([
      'ex-db-bench',
      'ex-db-incline-bench',
      'ex-db-shoulder-press',
      'ex-lateral-raise',
      'ex-dips',
    ]);

    const pressTe = tes.find(te => te.exerciseId === 'ex-db-shoulder-press')!;
    const pressSets = data.setTargets.filter(s => s.templateExerciseId === pressTe.id);
    expect(pressSets.filter(s => s.setType === 'working')).toHaveLength(3);

    const benchSets = data.setTargets
      .filter(s => s.templateExerciseId === tes[0]!.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    expect(benchSets.filter(s => s.setType === 'warmup')).toHaveLength(3);
    expect(benchSets.filter(s => s.setType === 'working')).toHaveLength(3);
    expect(benchSets.find(s => s.setType === 'working')!.targetRepMin).toBe(8);
    expect(benchSets.find(s => s.setType === 'working')!.targetRepMax).toBe(12);
  });

  it('uses heavier low-rep targets on strength templates', () => {
    const strengthPushTe = data.templateExercises.find(
      te => te.workoutTemplateId === 'tmpl-push-strength' && te.exerciseId === 'ex-db-bench',
    )!;
    const working = data.setTargets.filter(
      s => s.templateExerciseId === strengthPushTe.id && s.setType === 'working',
    );
    expect(working[0]!.targetRepMin).toBe(4);
    expect(working[0]!.targetRepMax).toBe(6);
  });

  it('keeps legs lean (two compounds only)', () => {
    for (const id of ['tmpl-legs-hypertrophy', 'tmpl-legs-strength', 'tmpl-legs-deload']) {
      const count = data.templateExercises.filter(te => te.workoutTemplateId === id).length;
      expect(count).toBe(2);
    }
  });
});

describe('patchStarterPushShoulderPress', () => {
  beforeEach(async () => {
    await db.programs.clear();
    await db.workoutTemplates.clear();
    await db.templateExercises.clear();
    await db.setTargets.clear();
  });

  it('inserts shoulder press after incline on an existing starter push template', async () => {
    const now = '2026-08-16T00:00:00.000Z';
    const program: Program = {
      id: STARTER_PROGRAM_ID,
      name: 'Home PPL (DB / Bar)',
      description: '',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    const template: WorkoutTemplate = {
      id: 'tmpl-push-hypertrophy',
      name: 'Push (Hypertrophy)',
      goal: 'hypertrophy',
      estimatedDurationMinutes: 55,
      notes: '',
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    const exercises: TemplateExercise[] = [
      { id: 'te0', workoutTemplateId: template.id, exerciseId: 'ex-db-bench', orderIndex: 0, supersetGroup: null, restSeconds: 120, notes: '', progressionRuleId: null },
      { id: 'te1', workoutTemplateId: template.id, exerciseId: 'ex-db-incline-bench', orderIndex: 1, supersetGroup: null, restSeconds: 120, notes: '', progressionRuleId: null },
      { id: 'te2', workoutTemplateId: template.id, exerciseId: 'ex-lateral-raise', orderIndex: 2, supersetGroup: null, restSeconds: 60, notes: '', progressionRuleId: null },
      { id: 'te3', workoutTemplateId: template.id, exerciseId: 'ex-dips', orderIndex: 3, supersetGroup: null, restSeconds: 90, notes: '', progressionRuleId: null },
    ];

    await db.programs.put(program);
    await db.workoutTemplates.put(template);
    await db.templateExercises.bulkPut(exercises);

    await patchStarterPushShoulderPress();
    await patchStarterPushShoulderPress();

    const tes = await db.templateExercises
      .where('workoutTemplateId')
      .equals(template.id)
      .sortBy('orderIndex');

    expect(tes.map(te => te.exerciseId)).toEqual([
      'ex-db-bench',
      'ex-db-incline-bench',
      'ex-db-shoulder-press',
      'ex-lateral-raise',
      'ex-dips',
    ]);
    expect(tes.filter(te => te.exerciseId === 'ex-db-shoulder-press')).toHaveLength(1);

    const press = tes.find(te => te.exerciseId === 'ex-db-shoulder-press')!;
    const sets = await db.setTargets.where('templateExerciseId').equals(press.id).sortBy('orderIndex');
    expect(sets).toHaveLength(3);
    expect(sets.every(s => s.setType === 'working' && s.targetRepMin === 8 && s.targetRepMax === 12)).toBe(true);
  });
});
