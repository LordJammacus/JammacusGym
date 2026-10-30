import { describe, it, expect, beforeEach } from 'vitest';
import {
  UPPER_SPECIALISATION_PROGRAM_ID,
  buildUpperSpecialisationProgramData,
} from '@/constants/upperSpecialisationProgram';
import { EXERCISES } from '@/constants/exercises';
import { db } from '@/db/database';
import { seedUpperSpecialisationProgram, ensureMissingCatalogExercises } from '@/db/seed';
import type { Program } from '@/types/entities';

describe('upper specialisation program', () => {
  const data = buildUpperSpecialisationProgramData('2026-10-30T00:00:00.000Z');
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

  it('builds a 4-day block and stays inactive until the user selects it', () => {
    expect(data.program.id).toBe(UPPER_SPECIALISATION_PROGRAM_ID);
    expect(data.program.isActive).toBe(false);
    expect(data.templates).toHaveLength(4);
    expect(data.blocks).toHaveLength(1);
    expect(data.blocks[0]!.weekCount).toBe(8);
    expect(data.blocks[0]!.goal).toBe('hypertrophy');
    expect(data.blockWorkouts.map(bw => bw.dayOfWeek)).toEqual([1, 2, 4, 6]);
    expect(data.notes).toHaveLength(4);
    expect(data.notes.every(n => n.showNextTime && n.type === 'workout_template')).toBe(true);
  });

  it('only uses catalog exercises and working sets', () => {
    for (const te of data.templateExercises) {
      expect(exerciseIds.has(te.exerciseId)).toBe(true);
    }
    expect(data.setTargets.every(s => s.setType === 'working')).toBe(true);
    expect(data.templateExercises.some(te => te.exerciseId === 'ex-chest-supported-row')).toBe(false);
    expect(data.templateExercises.some(te => te.exerciseId === 'ex-dips')).toBe(false);
  });

  it('matches workout A prescriptions', () => {
    expect(exerciseOrder('tmpl-upper-a')).toEqual([
      'ex-db-incline-bench',
      'ex-db-squeeze-press',
      'ex-lateral-raise',
      'ex-db-rear-delt-raise',
      'ex-weighted-db-crunch',
      'ex-reverse-crunch',
    ]);

    const incline = workingSets('tmpl-upper-a', 'ex-db-incline-bench');
    expect(incline).toHaveLength(2);
    expect(incline[0]).toMatchObject({ targetRepMin: 6, targetRepMax: 10, targetRir: 2 });
    const inclineTe = data.templateExercises.find(te => te.id === incline[0]!.templateExerciseId)!;
    expect(inclineTe.restSeconds).toBe(120);

    const squeeze = workingSets('tmpl-upper-a', 'ex-db-squeeze-press');
    expect(squeeze).toHaveLength(1);
    expect(squeeze[0]).toMatchObject({ targetRepMin: 10, targetRepMax: 15, targetRir: 1 });

    const laterals = workingSets('tmpl-upper-a', 'ex-lateral-raise');
    expect(laterals).toHaveLength(2);
    expect(laterals[0]).toMatchObject({ targetRepMin: 12, targetRepMax: 20, targetRir: 1 });
    const lateralTe = data.templateExercises.find(te => te.id === laterals[0]!.templateExerciseId)!;
    expect(lateralTe.restSeconds).toBe(60);
  });

  it('keeps pull-ups strict and curls tendon-conservative', () => {
    const pullups = workingSets('tmpl-upper-b', 'ex-pullup');
    expect(pullups).toHaveLength(2);
    expect(pullups[0]).toMatchObject({ targetRepMin: 5, targetRepMax: 10, targetRir: 2 });
    const pullTe = data.templateExercises.find(te => te.workoutTemplateId === 'tmpl-upper-b' && te.exerciseId === 'ex-pullup')!;
    expect(pullTe.restSeconds).toBe(120);
    expect(pullTe.notes.toLowerCase()).toContain('no added weight');

    const hammers = workingSets('tmpl-upper-b', 'ex-hammer-curl');
    expect(hammers).toHaveLength(2);
    expect(hammers[0]).toMatchObject({ targetRepMin: 10, targetRepMax: 15, targetRir: 2 });
  });

  it('matches workouts C and D, including per-side side plank', () => {
    expect(exerciseOrder('tmpl-upper-c')).toEqual([
      'ex-db-bench',
      'ex-db-shoulder-press',
      'ex-lateral-raise',
      'ex-lateral-raise-partial',
    ]);
    const press = workingSets('tmpl-upper-c', 'ex-db-shoulder-press');
    expect(press[0]).toMatchObject({ targetRepMin: 6, targetRepMax: 10, targetRir: 2 });
    const pressTe = data.templateExercises.find(te => te.id === press[0]!.templateExerciseId)!;
    expect(pressTe.restSeconds).toBe(120);

    const partials = workingSets('tmpl-upper-c', 'ex-lateral-raise-partial');
    expect(partials).toHaveLength(1);
    expect(partials[0]).toMatchObject({ targetRepMin: 15, targetRepMax: 25, targetRir: 1 });

    expect(exerciseOrder('tmpl-upper-d')).toEqual([
      'ex-db-row',
      'ex-db-curl',
      'ex-goblet-squat',
      'ex-db-rdl',
      'ex-reverse-crunch',
      'ex-side-plank',
    ]);
    const rdl = workingSets('tmpl-upper-d', 'ex-db-rdl');
    expect(rdl).toHaveLength(2);
    expect(rdl[0]).toMatchObject({ targetRepMin: 8, targetRepMax: 12, targetRir: 2 });
    const rdlTe = data.templateExercises.find(te => te.id === rdl[0]!.templateExerciseId)!;
    expect(rdlTe.restSeconds).toBe(90);

    const plank = workingSets('tmpl-upper-d', 'ex-side-plank');
    expect(plank).toHaveLength(2);
    expect(plank[0]).toMatchObject({ targetRepMin: 30, targetRepMax: 45, targetRir: 1 });
    const plankTe = data.templateExercises.find(te => te.id === plank[0]!.templateExerciseId)!;
    expect(plankTe.restSeconds).toBe(30);
    expect(plankTe.notes.toLowerCase()).toContain('seconds');
  });
});

describe('seedUpperSpecialisationProgram', () => {
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
    const now = '2026-10-30T00:00:00.000Z';
    const active: Program = {
      id: 'prog-starter-home-ppl',
      name: 'Home PPL (DB / Bar)',
      description: '',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    await db.programs.put(active);

    await ensureMissingCatalogExercises();
    await seedUpperSpecialisationProgram();
    await seedUpperSpecialisationProgram();

    const programs = await db.programs.toArray();
    expect(programs).toHaveLength(2);
    expect((await db.programs.get(active.id))!.isActive).toBe(true);
    expect((await db.programs.get(UPPER_SPECIALISATION_PROGRAM_ID))!.isActive).toBe(false);
    expect(await db.workoutTemplates.where('id').startsWith('tmpl-upper-').count()).toBe(4);
    expect(await db.exercises.get('ex-db-squeeze-press')).toBeTruthy();
    expect(await db.exercises.get('ex-side-plank')).toBeTruthy();
  });
});
