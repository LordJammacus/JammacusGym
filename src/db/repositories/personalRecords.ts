import { db } from '../database';
import type { PersonalRecord } from '@/types/analytics';

export async function getRecordsForExercise(exerciseId: string): Promise<PersonalRecord[]> {
  return db.personalRecords
    .where('exerciseId')
    .equals(exerciseId)
    .toArray();
}

export async function getAllRecords(): Promise<PersonalRecord[]> {
  return db.personalRecords.toArray();
}

export async function getRecordsForWorkout(workoutInstanceId: string): Promise<PersonalRecord[]> {
  return db.personalRecords
    .where('workoutInstanceId')
    .equals(workoutInstanceId)
    .toArray();
}

export async function saveRecords(records: PersonalRecord[]): Promise<void> {
  if (records.length === 0) return;

  await db.transaction('rw', db.personalRecords, async () => {
    for (const record of records) {
      const existing = await db.personalRecords
        .where('exerciseId')
        .equals(record.exerciseId)
        .filter(r => {
          if (record.type === 'reps_at_weight') {
            return r.type === 'reps_at_weight' && r.weight === record.weight;
          }
          return r.type === record.type;
        })
        .first();

      if (existing) {
        if (record.value > existing.value) {
          await db.personalRecords.update(existing.id, {
            value: record.value,
            weight: record.weight,
            reps: record.reps,
            completedSetId: record.completedSetId,
            workoutInstanceId: record.workoutInstanceId,
            achievedAt: record.achievedAt,
          });
        }
      } else {
        await db.personalRecords.put(record);
      }
    }
  });
}

export async function getLatestRecords(limit: number = 20): Promise<PersonalRecord[]> {
  return db.personalRecords
    .orderBy('achievedAt')
    .reverse()
    .limit(limit)
    .toArray();
}
