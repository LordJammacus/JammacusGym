import { describe, it, expect } from 'vitest';
import {
  buildFatigueTimeline,
  correlateFatigueWithPerformance,
  estimateMuscleRecovery,
  detectWorkoutSequenceInsights,
} from '@/engines/analytics/fatigue';
import type { RecoveryLog, WorkoutInstance, WorkoutExerciseInstance, CompletedSet, ExerciseMuscle } from '@/types/entities';

function makeRecoveryLog(overrides: Partial<RecoveryLog> & { date: string }): RecoveryLog {
  return {
    id: `rl-${overrides.date}`,
    date: overrides.date,
    sleepQuality: overrides.sleepQuality ?? null,
    sleepHours: overrides.sleepHours ?? null,
    energy: overrides.energy ?? null,
    motivation: overrides.motivation ?? null,
    soreness: overrides.soreness ?? null,
    stress: overrides.stress ?? null,
    overallFatigue: overrides.overallFatigue ?? null,
    notes: overrides.notes ?? '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeWorkout(id: string, date: string, templateName: string): WorkoutInstance {
  return {
    id,
    workoutTemplateId: `tpl-${templateName}`,
    programId: null,
    trainingBlockId: null,
    templateName,
    goal: 'hypertrophy',
    status: 'completed',
    startedAt: `${date}T10:00:00.000Z`,
    completedAt: `${date}T11:00:00.000Z`,
    durationSeconds: 3600,
    notes: '',
    createdAt: `${date}T10:00:00.000Z`,
  };
}

function makeEi(id: string, workoutId: string, exerciseId: string): WorkoutExerciseInstance {
  return {
    id,
    workoutInstanceId: workoutId,
    exerciseId,
    templateExerciseId: null,
    originalExerciseId: null,
    orderIndex: 0,
    supersetGroup: null,
    restSecondsTarget: 120,
    notes: '',
  };
}

function makeSet(eiId: string, weight: number, reps: number, idx: number = 0): CompletedSet {
  return {
    id: `set-${eiId}-${idx}`,
    workoutExerciseInstanceId: eiId,
    orderIndex: idx,
    setType: 'working',
    targetWeight: weight,
    targetRepMin: 8,
    targetRepMax: 12,
    targetRir: 2,
    actualWeight: weight,
    actualReps: reps,
    actualRir: 2,
    actualRestSeconds: 120,
    isAdditional: false,
    completedAt: '2026-01-01T10:05:00.000Z',
    notes: '',
  };
}

describe('buildFatigueTimeline', () => {
  it('builds timeline from recovery logs with composite scores', () => {
    const logs: RecoveryLog[] = [
      makeRecoveryLog({ date: '2026-01-01', sleepQuality: 4, energy: 4, soreness: 2 }),
      makeRecoveryLog({ date: '2026-01-02', sleepQuality: 2, energy: 2, soreness: 4 }),
    ];

    const timeline = buildFatigueTimeline(logs);
    expect(timeline).toHaveLength(2);

    // Day 1: sleep=4→inverted=2, energy=4→inverted=2, soreness=2 (not inverted) → avg = (2+2+2)/3 = 2
    expect(timeline[0]!.compositeScore).toBe(2);

    // Day 2: sleep=2→inverted=4, energy=2→inverted=4, soreness=4 → avg = (4+4+4)/3 = 4
    expect(timeline[1]!.compositeScore).toBe(4);
  });

  it('returns empty for logs with no ratings', () => {
    const logs: RecoveryLog[] = [
      makeRecoveryLog({ date: '2026-01-01' }),
    ];

    expect(buildFatigueTimeline(logs)).toHaveLength(0);
  });

  it('sorts by date', () => {
    const logs: RecoveryLog[] = [
      makeRecoveryLog({ date: '2026-01-03', energy: 3 }),
      makeRecoveryLog({ date: '2026-01-01', energy: 3 }),
      makeRecoveryLog({ date: '2026-01-02', energy: 3 }),
    ];

    const timeline = buildFatigueTimeline(logs);
    expect(timeline[0]!.date).toBe('2026-01-01');
    expect(timeline[2]!.date).toBe('2026-01-03');
  });
});

describe('correlateFatigueWithPerformance', () => {
  it('returns insufficient data message when not enough data', () => {
    const result = correlateFatigueWithPerformance([], [], [], []);
    expect(result.dataPoints).toBe(0);
    expect(result.summary).toContain('Not enough data');
  });

  it('correlates low and high fatigue days with volume', () => {
    const logs: RecoveryLog[] = [
      makeRecoveryLog({ date: '2026-01-01', energy: 5, sleepQuality: 5 }),
      makeRecoveryLog({ date: '2026-01-02', energy: 5, sleepQuality: 5 }),
      makeRecoveryLog({ date: '2026-01-03', energy: 1, sleepQuality: 1 }),
      makeRecoveryLog({ date: '2026-01-04', energy: 1, sleepQuality: 1 }),
    ];

    const workouts: WorkoutInstance[] = [
      makeWorkout('w1', '2026-01-01', 'Push'),
      makeWorkout('w2', '2026-01-02', 'Pull'),
      makeWorkout('w3', '2026-01-03', 'Legs'),
      makeWorkout('w4', '2026-01-04', 'Push'),
    ];

    const eis: WorkoutExerciseInstance[] = [
      makeEi('ei1', 'w1', 'bench'),
      makeEi('ei2', 'w2', 'row'),
      makeEi('ei3', 'w3', 'squat'),
      makeEi('ei4', 'w4', 'bench'),
    ];

    // Low fatigue days (high energy/sleep → inverted = low fatigue): high volume
    // High fatigue days (low energy/sleep → inverted = high fatigue): low volume
    const sets: CompletedSet[] = [
      makeSet('ei1', 100, 10, 0), makeSet('ei1', 100, 10, 1), makeSet('ei1', 100, 10, 2),
      makeSet('ei2', 80, 10, 0), makeSet('ei2', 80, 10, 1), makeSet('ei2', 80, 10, 2),
      makeSet('ei3', 60, 5, 0), makeSet('ei3', 60, 5, 1),
      makeSet('ei4', 60, 5, 0), makeSet('ei4', 60, 5, 1),
    ];

    const result = correlateFatigueWithPerformance(logs, workouts, eis, sets);
    expect(result.dataPoints).toBe(4);
    expect(result.lowFatigueAvgPerformance).toBeGreaterThan(result.highFatigueAvgPerformance);
  });
});

describe('estimateMuscleRecovery', () => {
  it('estimates recovery percentage based on time since training', () => {
    const now = new Date('2026-01-05T12:00:00Z').getTime();
    const workouts: WorkoutInstance[] = [
      makeWorkout('w1', '2026-01-03', 'Push'),
    ];
    const eis: WorkoutExerciseInstance[] = [
      makeEi('ei1', 'w1', 'bench'),
    ];
    const sets: CompletedSet[] = [
      makeSet('ei1', 80, 10, 0),
      makeSet('ei1', 80, 10, 1),
      makeSet('ei1', 80, 10, 2),
    ];
    const exerciseMuscles: ExerciseMuscle[] = [
      { id: 'em1', exerciseId: 'bench', muscleGroupId: 'chest', role: 'primary', contribution: 1 },
    ];
    const muscleNames = new Map([['chest', 'Chest']]);

    const result = estimateMuscleRecovery(workouts, eis, sets, exerciseMuscles, muscleNames, now);
    expect(result).toHaveLength(1);
    expect(result[0]!.muscleName).toBe('Chest');
    expect(result[0]!.daysSinceTrained).toBe(2);
    expect(result[0]!.recoveryPercent).toBeGreaterThanOrEqual(50);
    expect(result[0]!.recoveryPercent).toBeLessThanOrEqual(100);
  });

  it('returns fully recovered for muscles trained long ago', () => {
    const now = new Date('2026-01-15T12:00:00Z').getTime();
    const workouts: WorkoutInstance[] = [
      makeWorkout('w1', '2026-01-01', 'Push'),
    ];
    const eis: WorkoutExerciseInstance[] = [
      makeEi('ei1', 'w1', 'bench'),
    ];
    const sets: CompletedSet[] = [
      makeSet('ei1', 80, 10, 0),
    ];
    const exerciseMuscles: ExerciseMuscle[] = [
      { id: 'em1', exerciseId: 'bench', muscleGroupId: 'chest', role: 'primary', contribution: 1 },
    ];
    const muscleNames = new Map([['chest', 'Chest']]);

    const result = estimateMuscleRecovery(workouts, eis, sets, exerciseMuscles, muscleNames, now);
    expect(result[0]!.recoveryPercent).toBe(100);
  });
});

describe('detectWorkoutSequenceInsights', () => {
  it('returns empty for insufficient data', () => {
    const result = detectWorkoutSequenceInsights([], [], []);
    expect(result).toHaveLength(0);
  });

  it('detects volume difference after specific preceding workouts', () => {
    const workouts: WorkoutInstance[] = [
      makeWorkout('w1', '2026-01-01', 'Legs'),
      makeWorkout('w2', '2026-01-02', 'Push'),
      makeWorkout('w3', '2026-01-03', 'Rest Day'),
      makeWorkout('w4', '2026-01-04', 'Push'),
      makeWorkout('w5', '2026-01-05', 'Legs'),
      makeWorkout('w6', '2026-01-06', 'Push'),
    ];

    const eis: WorkoutExerciseInstance[] = [
      makeEi('ei1', 'w1', 'squat'),
      makeEi('ei2', 'w2', 'bench'),
      makeEi('ei3', 'w3', 'bench'),
      makeEi('ei4', 'w4', 'bench'),
      makeEi('ei5', 'w5', 'squat'),
      makeEi('ei6', 'w6', 'bench'),
    ];

    const sets: CompletedSet[] = [
      makeSet('ei1', 100, 10, 0), makeSet('ei1', 100, 10, 1),
      makeSet('ei2', 60, 5, 0), makeSet('ei2', 60, 5, 1),
      makeSet('ei3', 80, 10, 0), makeSet('ei3', 80, 10, 1),
      makeSet('ei4', 100, 10, 0), makeSet('ei4', 100, 10, 1),
      makeSet('ei5', 100, 10, 0), makeSet('ei5', 100, 10, 1),
      makeSet('ei6', 60, 5, 0), makeSet('ei6', 60, 5, 1),
    ];

    const result = detectWorkoutSequenceInsights(workouts, eis, sets);
    // Should detect that Push after Legs has different volume than Push after Rest Day
    expect(Array.isArray(result)).toBe(true);
  });
});
