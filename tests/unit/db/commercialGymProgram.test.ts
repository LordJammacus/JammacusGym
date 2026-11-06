import { describe, it, expect, beforeEach } from 'vitest';
import {
  JIMMY_COMMERCIAL_PROGRAM_ID,
  JIMMY_GYM_REVISION_NOTE_ID,
  buildCommercialGymProgramData,
} from '@/constants/commercialGymProgram';
import { EXERCISES } from '@/constants/exercises';
import { db } from '@/db/database';
import { seedCommercialGymProgram, ensureMissingCatalogExercises } from '@/db/seed';
import type { Program } from '@/types/entities';

describe('commercial gym program', () => {
  const data = buildCommercialGymProgramData('2026-11-06T00:00:00.000Z');
  const exerciseIds = new Set(EXERCISES.map(e => e.id));

  function exerciseOrder(templateId: string): string[] {
    return data.templateExercises
      .filter(te => te.workoutTemplateId === templateId)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(te => te.exerciseId);
  }

  function workingSets(templateId: string, exerciseId: string) {
    const te = data.templateExercises.find(
      row => row.workoutTemplateId === templateId && row.exerciseId === exerciseId,
    )!;
    return data.setTargets
      .filter(s => s.templateExerciseId === te.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  it('builds a 16-week 4-day rotation and stays inactive until selected', () => {
    expect(data.program.id).toBe(JIMMY_COMMERCIAL_PROGRAM_ID);
    expect(data.program.name).toBe('(Jimmy) Commercial Gym');
    expect(data.program.isActive).toBe(false);
    expect(data.templates.map(t => t.name)).toEqual([
      '(Jimmy) Day 1 · Heavy Bench',
      '(Jimmy) Day 2 · Back and Arms',
      '(Jimmy) Day 3 · Bench and Triceps',
      '(Jimmy) Day 4 · Back, Legs and Abs',
    ]);
    expect(data.blocks).toHaveLength(1);
    expect(data.blocks[0]).toMatchObject({ weekCount: 16, goal: 'strength' });
    expect(data.blockWorkouts.map(bw => bw.dayOfWeek)).toEqual([null, null, null, null]);
    expect(data.blockWorkouts.map(bw => bw.orderIndex)).toEqual([0, 1, 2, 3]);
    const sessionNotes = data.notes.filter(n => n.type === 'workout_template');
    expect(sessionNotes).toHaveLength(4);
    expect(sessionNotes.every(n => n.showNextTime)).toBe(true);
    expect(data.notes.find(n => n.id === JIMMY_GYM_REVISION_NOTE_ID)?.content).toBe('1');
  });

  it('only uses catalog exercises and working sets', () => {
    for (const te of data.templateExercises) {
      expect(exerciseIds.has(te.exerciseId)).toBe(true);
    }
    expect(data.setTargets.every(s => s.setType === 'working')).toBe(true);
    expect(data.templateExercises.some(te => te.exerciseId === 'ex-reverse-crunch')).toBe(false);
    expect(data.templateExercises.some(te => te.exerciseId === 'ex-squat')).toBe(false);
    expect(data.templateExercises.some(te => te.exerciseId === 'ex-deadlift')).toBe(false);
  });

  it('matches day 1 heavy bench, upper chest, shoulders, and knee raises', () => {
    expect(exerciseOrder('tmpl-jimmy-d1')).toEqual([
      'ex-bb-bench',
      'ex-bb-incline-bench',
      'ex-lateral-raise',
      'ex-reverse-pec-deck',
      'ex-cable-crunch',
      'ex-knee-raise',
    ]);

    const bench = workingSets('tmpl-jimmy-d1', 'ex-bb-bench');
    expect(bench).toHaveLength(4);
    expect(bench[0]).toMatchObject({ targetRepMin: 4, targetRepMax: 6, targetRir: 2 });
    const benchTe = data.templateExercises.find(te => te.id === bench[0]!.templateExerciseId)!;
    expect(benchTe.restSeconds).toBe(180);
    expect(benchTe.notes).toContain('60 kg');
    expect(benchTe.notes).toContain('64 kg');

    const incline = workingSets('tmpl-jimmy-d1', 'ex-bb-incline-bench');
    expect(incline).toHaveLength(2);
    expect(incline[0]).toMatchObject({ targetRepMin: 8, targetRepMax: 12, targetRir: 2 });
    const inclineTe = data.templateExercises.find(te => te.id === incline[0]!.templateExerciseId)!;
    expect(inclineTe.restSeconds).toBe(150);

    const laterals = workingSets('tmpl-jimmy-d1', 'ex-lateral-raise');
    expect(laterals).toHaveLength(3);
    const lateralTe = data.templateExercises.find(te => te.id === laterals[0]!.templateExerciseId)!;
    expect(lateralTe.restSeconds).toBe(60);
  });

  it('puts extra arm and forearm work on day 2 without added pull-up weight', () => {
    expect(exerciseOrder('tmpl-jimmy-d2')).toEqual([
      'ex-pullup',
      'ex-machine-row',
      'ex-cable-curl',
      'ex-hammer-curl',
      'ex-wrist-curl',
    ]);

    const pullups = workingSets('tmpl-jimmy-d2', 'ex-pullup');
    expect(pullups).toHaveLength(3);
    expect(pullups[0]).toMatchObject({ targetRepMin: 4, targetRepMax: 10, targetRir: 2 });
    const pullTe = data.templateExercises.find(
      te => te.workoutTemplateId === 'tmpl-jimmy-d2' && te.exerciseId === 'ex-pullup',
    )!;
    expect(pullTe.restSeconds).toBe(150);
    expect(pullTe.notes.toLowerCase()).toContain('no added weight');

    const rows = workingSets('tmpl-jimmy-d2', 'ex-machine-row');
    expect(rows).toHaveLength(3);
    const rowTe = data.templateExercises.find(te => te.id === rows[0]!.templateExerciseId)!;
    expect(rowTe.restSeconds).toBe(120);

    expect(workingSets('tmpl-jimmy-d2', 'ex-cable-curl')).toHaveLength(2);
    expect(workingSets('tmpl-jimmy-d2', 'ex-hammer-curl')).toHaveLength(2);
    expect(workingSets('tmpl-jimmy-d2', 'ex-wrist-curl')[0]).toMatchObject({
      targetRepMin: 15,
      targetRepMax: 25,
      targetRir: 1,
    });
  });

  it('keeps day 3 a shorter second bench day with cable triceps', () => {
    expect(exerciseOrder('tmpl-jimmy-d3')).toEqual([
      'ex-bb-bench',
      'ex-lateral-raise',
      'ex-reverse-pec-deck',
      'ex-overhead-ext',
    ]);

    const bench = workingSets('tmpl-jimmy-d3', 'ex-bb-bench');
    expect(bench).toHaveLength(3);
    expect(bench[0]).toMatchObject({ targetRepMin: 6, targetRepMax: 10, targetRir: 2 });
    const benchTe = data.templateExercises.find(te => te.id === bench[0]!.templateExerciseId)!;
    expect(benchTe.restSeconds).toBe(150);

    const extensions = workingSets('tmpl-jimmy-d3', 'ex-overhead-ext');
    expect(extensions).toHaveLength(2);
    expect(extensions[0]).toMatchObject({ targetRepMin: 10, targetRepMax: 15, targetRir: 2 });
    const extTe = data.templateExercises.find(te => te.id === extensions[0]!.templateExerciseId)!;
    expect(extTe.restSeconds).toBe(75);
    expect(extTe.notes.toLowerCase()).toContain('pushdown');
  });

  it('matches day 4 maintenance legs, knee raises, and per-side side plank', () => {
    expect(exerciseOrder('tmpl-jimmy-d4')).toEqual([
      'ex-pullup',
      'ex-machine-row',
      'ex-cable-curl',
      'ex-leg-press',
      'ex-leg-curl',
      'ex-knee-raise',
      'ex-side-plank',
    ]);

    const press = workingSets('tmpl-jimmy-d4', 'ex-leg-press');
    expect(press).toHaveLength(3);
    expect(press[0]).toMatchObject({ targetRepMin: 8, targetRepMax: 12, targetRir: 2 });
    const pressTe = data.templateExercises.find(te => te.id === press[0]!.templateExerciseId)!;
    expect(pressTe.restSeconds).toBe(150);

    expect(workingSets('tmpl-jimmy-d4', 'ex-leg-curl')).toHaveLength(2);
    expect(workingSets('tmpl-jimmy-d4', 'ex-pullup')).toHaveLength(2);
    expect(workingSets('tmpl-jimmy-d4', 'ex-knee-raise')).toHaveLength(2);

    const plank = workingSets('tmpl-jimmy-d4', 'ex-side-plank');
    expect(plank).toHaveLength(2);
    expect(plank[0]).toMatchObject({ targetRepMin: 30, targetRepMax: 45, targetRir: 1 });
    const plankTe = data.templateExercises.find(te => te.id === plank[0]!.templateExerciseId)!;
    expect(plankTe.restSeconds).toBe(30);
    expect(plankTe.notes.toLowerCase()).toContain('seconds');
  });
});

describe('seedCommercialGymProgram', () => {
  beforeEach(async () => {
    await db.programs.clear();
    await db.workoutTemplates.clear();
    await db.templateExercises.clear();
    await db.setTargets.clear();
    await db.trainingBlocks.clear();
    await db.blockWorkouts.clear();
    await db.notes.clear();
    await db.exercises.clear();
    await db.exerciseMuscles.clear();
  });

  it('adds the split without taking the active slot, and does not duplicate it', async () => {
    const now = '2026-11-06T00:00:00.000Z';
    const active: Program = {
      id: 'prog-upper-specialisation',
      name: 'Upper Specialisation (4-Day)',
      description: '',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    await db.programs.put(active);

    await ensureMissingCatalogExercises();
    await seedCommercialGymProgram();
    await seedCommercialGymProgram();

    const programs = await db.programs.toArray();
    expect(programs).toHaveLength(2);
    expect((await db.programs.get(active.id))!.isActive).toBe(true);
    expect((await db.programs.get(JIMMY_COMMERCIAL_PROGRAM_ID))!.isActive).toBe(false);
    expect(await db.workoutTemplates.where('id').startsWith('tmpl-jimmy-').count()).toBe(4);
    expect(await db.exercises.get('ex-knee-raise')).toBeTruthy();
    expect(await db.exercises.get('ex-reverse-pec-deck')).toBeTruthy();

    const day1 = await db.templateExercises.where('workoutTemplateId').equals('tmpl-jimmy-d1').sortBy('orderIndex');
    expect(day1.map(te => te.exerciseId)).toEqual([
      'ex-bb-bench',
      'ex-bb-incline-bench',
      'ex-lateral-raise',
      'ex-reverse-pec-deck',
      'ex-cable-crunch',
      'ex-knee-raise',
    ]);
  });

  it('updates an older copy once, then leaves later edits alone', async () => {
    await ensureMissingCatalogExercises();
    await seedCommercialGymProgram();

    const program = await db.programs.get(JIMMY_COMMERCIAL_PROGRAM_ID);
    await db.programs.update(JIMMY_COMMERCIAL_PROGRAM_ID, { isActive: true });
    await db.notes.delete(JIMMY_GYM_REVISION_NOTE_ID);
    await db.templateExercises.put({
      id: 'tmpl-jimmy-d1-old',
      workoutTemplateId: 'tmpl-jimmy-d1',
      exerciseId: 'ex-reverse-crunch',
      orderIndex: 9,
      supersetGroup: null,
      restSeconds: 45,
      notes: 'old finisher',
      progressionRuleId: null,
    });

    await seedCommercialGymProgram();

    const refreshed = await db.programs.get(JIMMY_COMMERCIAL_PROGRAM_ID);
    expect(refreshed?.isActive).toBe(true);
    expect(refreshed?.createdAt).toBe(program?.createdAt);
    const exercises = await db.templateExercises.where('workoutTemplateId').equals('tmpl-jimmy-d1').toArray();
    expect(exercises.some(te => te.exerciseId === 'ex-reverse-crunch')).toBe(false);
    const bench = exercises.find(te => te.exerciseId === 'ex-bb-bench')!;
    const sets = await db.setTargets.where('templateExerciseId').equals(bench.id).toArray();
    expect(sets).toHaveLength(4);

    await db.templateExercises.update(bench.id, { notes: 'kept' });
    await seedCommercialGymProgram();
    expect((await db.templateExercises.get(bench.id))?.notes).toBe('kept');
  });
});
