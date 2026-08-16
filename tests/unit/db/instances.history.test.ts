import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/database';
import { getHistoryWorkouts } from '@/db/repositories/instances';
import type { WorkoutInstance } from '@/types/entities';

function instance(
  id: string,
  status: WorkoutInstance['status'],
  startedAt: string,
): WorkoutInstance {
  return {
    id,
    workoutTemplateId: 'tmpl-1',
    programId: null,
    trainingBlockId: null,
    templateName: id,
    goal: 'hypertrophy',
    status,
    startedAt,
    completedAt: status === 'in_progress' || status === 'paused' ? null : startedAt,
    durationSeconds: 600,
    notes: '',
    createdAt: startedAt,
  };
}

describe('getHistoryWorkouts', () => {
  beforeEach(async () => {
    await db.workoutInstances.clear();
  });

  it('pins unfinished sessions above completed history', async () => {
    await db.workoutInstances.bulkPut([
      instance('done', 'completed', '2026-08-16T12:00:00.000Z'),
      instance('paused', 'paused', '2026-08-15T10:00:00.000Z'),
      instance('old', 'abandoned', '2026-08-14T10:00:00.000Z'),
    ]);

    const history = await getHistoryWorkouts();
    expect(history.map(w => w.id)).toEqual(['paused', 'done', 'old']);
  });
});
