import { describe, it, expect } from 'vitest';
import { calculateWeeklyFrequency, calculateAverageFrequency, calculateWorkoutDurations } from '@/engines/analytics/frequency';
import type { WorkoutInstance } from '@/types/entities';
import type { DateRange } from '@/types/analytics';

describe('calculateWeeklyFrequency', () => {
  it('groups sessions by week', () => {
    const instances: WorkoutInstance[] = [
      makeInstance('i1', '2026-01-06'), // Monday
      makeInstance('i2', '2026-01-07'), // Tuesday
      makeInstance('i3', '2026-01-08'), // Wednesday
      makeInstance('i4', '2026-01-13'), // Next Monday
    ];

    const range: DateRange = {
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-01-31T23:59:59.999Z',
    };

    const result = calculateWeeklyFrequency(instances, range, 1); // Monday start
    expect(result).toHaveLength(2);
    expect(result[0]!.sessions).toBe(3);
    expect(result[1]!.sessions).toBe(1);
  });

  it('excludes non-completed workouts', () => {
    const instances: WorkoutInstance[] = [
      makeInstance('i1', '2026-01-06'),
      { ...makeInstance('i2', '2026-01-07'), status: 'abandoned' },
    ];

    const range: DateRange = {
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-01-31T23:59:59.999Z',
    };

    const result = calculateWeeklyFrequency(instances, range);
    expect(result).toHaveLength(1);
    expect(result[0]!.sessions).toBe(1);
  });
});

describe('calculateAverageFrequency', () => {
  it('calculates average sessions per week', () => {
    const instances: WorkoutInstance[] = [
      makeInstance('i1', '2026-01-06'),
      makeInstance('i2', '2026-01-08'),
      makeInstance('i3', '2026-01-10'),
      makeInstance('i4', '2026-01-13'),
    ];

    const range: DateRange = {
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-01-14T23:59:59.999Z',
    };

    const result = calculateAverageFrequency(instances, range);
    expect(result).toBe(2); // 4 sessions / 2 weeks
  });

  it('returns 0 for no workouts', () => {
    const range: DateRange = {
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-01-31T23:59:59.999Z',
    };
    expect(calculateAverageFrequency([], range)).toBe(0);
  });
});

describe('calculateWorkoutDurations', () => {
  it('returns durations in minutes', () => {
    const instances: WorkoutInstance[] = [
      { ...makeInstance('i1', '2026-01-06'), durationSeconds: 3600 },
      { ...makeInstance('i2', '2026-01-08'), durationSeconds: 5400 },
    ];

    const range: DateRange = {
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-01-31T23:59:59.999Z',
    };

    const result = calculateWorkoutDurations(instances, range);
    expect(result).toHaveLength(2);
    expect(result[0]!.durationMinutes).toBe(60);
    expect(result[1]!.durationMinutes).toBe(90);
  });
});

function makeInstance(id: string, date: string): WorkoutInstance {
  return {
    id,
    workoutTemplateId: 'wt-1',
    programId: null,
    trainingBlockId: null,
    templateName: 'Test',
    goal: 'hypertrophy',
    status: 'completed',
    startedAt: `${date}T10:00:00.000Z`,
    completedAt: `${date}T11:00:00.000Z`,
    durationSeconds: 3600,
    notes: '',
    createdAt: `${date}T10:00:00.000Z`,
  };
}
