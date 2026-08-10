import { db } from '../database';
import type { BodyMeasurement, RecoveryLog } from '@/types/entities';
import type { MeasurementType, RecoveryRating } from '@/types/enums';
import type { DateRange } from '@/types/analytics';
import { generateId } from '@/utils/ids';

// --- Body Measurements ---

export async function addBodyMeasurement(
  type: MeasurementType,
  value: number,
  unit: 'kg' | 'lb' | 'cm' | 'in',
  measuredAt?: string,
  notes?: string,
): Promise<BodyMeasurement> {
  const now = new Date().toISOString();
  const measurement: BodyMeasurement = {
    id: generateId(),
    type,
    value,
    unit,
    measuredAt: measuredAt ?? now,
    notes: notes ?? '',
    createdAt: now,
  };
  await db.bodyMeasurements.add(measurement);
  return measurement;
}

export async function getBodyMeasurements(
  type?: MeasurementType,
  dateRange?: DateRange,
): Promise<BodyMeasurement[]> {
  let results: BodyMeasurement[];

  if (type) {
    results = await db.bodyMeasurements.where('type').equals(type).sortBy('measuredAt');
  } else {
    results = await db.bodyMeasurements.orderBy('measuredAt').toArray();
  }

  if (dateRange) {
    results = results.filter(
      m => m.measuredAt >= dateRange.start && m.measuredAt <= dateRange.end,
    );
  }

  return results;
}

export async function getLatestMeasurement(type: MeasurementType): Promise<BodyMeasurement | undefined> {
  const all = await db.bodyMeasurements.where('type').equals(type).sortBy('measuredAt');
  return all[all.length - 1];
}

export async function getLatestMeasurements(): Promise<Map<MeasurementType, BodyMeasurement>> {
  const all = await db.bodyMeasurements.orderBy('measuredAt').toArray();
  const latest = new Map<MeasurementType, BodyMeasurement>();
  for (const m of all) {
    latest.set(m.type, m);
  }
  return latest;
}

export async function deleteBodyMeasurement(id: string): Promise<void> {
  await db.bodyMeasurements.delete(id);
}

// --- Recovery Logs ---

export async function upsertRecoveryLog(
  date: string,
  data: {
    sleepQuality?: RecoveryRating | null;
    sleepHours?: number | null;
    energy?: RecoveryRating | null;
    motivation?: RecoveryRating | null;
    soreness?: RecoveryRating | null;
    stress?: RecoveryRating | null;
    overallFatigue?: RecoveryRating | null;
    notes?: string;
  },
): Promise<RecoveryLog> {
  const now = new Date().toISOString();
  const existing = await db.recoveryLogs.where('date').equals(date).first();

  if (existing) {
    const updated: RecoveryLog = {
      ...existing,
      ...data,
      sleepQuality: data.sleepQuality !== undefined ? data.sleepQuality : existing.sleepQuality,
      sleepHours: data.sleepHours !== undefined ? data.sleepHours : existing.sleepHours,
      energy: data.energy !== undefined ? data.energy : existing.energy,
      motivation: data.motivation !== undefined ? data.motivation : existing.motivation,
      soreness: data.soreness !== undefined ? data.soreness : existing.soreness,
      stress: data.stress !== undefined ? data.stress : existing.stress,
      overallFatigue: data.overallFatigue !== undefined ? data.overallFatigue : existing.overallFatigue,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      updatedAt: now,
    };
    await db.recoveryLogs.put(updated);
    return updated;
  }

  const log: RecoveryLog = {
    id: generateId(),
    date,
    sleepQuality: data.sleepQuality ?? null,
    sleepHours: data.sleepHours ?? null,
    energy: data.energy ?? null,
    motivation: data.motivation ?? null,
    soreness: data.soreness ?? null,
    stress: data.stress ?? null,
    overallFatigue: data.overallFatigue ?? null,
    notes: data.notes ?? '',
    createdAt: now,
    updatedAt: now,
  };
  await db.recoveryLogs.add(log);
  return log;
}

export async function getRecoveryLog(date: string): Promise<RecoveryLog | undefined> {
  return db.recoveryLogs.where('date').equals(date).first();
}

export async function getRecoveryLogs(dateRange?: DateRange): Promise<RecoveryLog[]> {
  const all = await db.recoveryLogs.orderBy('date').toArray();
  if (!dateRange) return all;
  return all.filter(l => l.date >= dateRange.start && l.date <= dateRange.end);
}

export async function deleteRecoveryLog(id: string): Promise<void> {
  await db.recoveryLogs.delete(id);
}
