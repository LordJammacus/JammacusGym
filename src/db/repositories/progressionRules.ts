import { db } from '../database';
import type { ProgressionRule } from '@/types/entities';

export async function getAllRules(): Promise<ProgressionRule[]> {
  return db.progressionRules.toArray();
}

export async function getRule(id: string): Promise<ProgressionRule | undefined> {
  return db.progressionRules.get(id);
}

export async function createRule(rule: ProgressionRule): Promise<void> {
  await db.progressionRules.put(rule);
}

export async function updateRule(id: string, updates: Partial<ProgressionRule>): Promise<void> {
  await db.progressionRules.update(id, updates);
}

export async function deleteRule(id: string): Promise<void> {
  await db.progressionRules.delete(id);
}
