import { describe, it, expect } from 'vitest';
import { buildStarterProgramData, STARTER_PROGRAM_ID } from '@/constants/starterProgram';
import { EXERCISES } from '@/constants/exercises';

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
      'ex-lateral-raise',
      'ex-dips',
    ]);

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
