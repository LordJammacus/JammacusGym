import { db } from '../database';
import type { StoredRecommendation, RecommendationStatus } from '@/types/recommendations';

export async function saveRecommendations(recs: StoredRecommendation[]): Promise<void> {
  await db.recommendations.bulkPut(recs);
}

export async function getPendingRecommendations(): Promise<StoredRecommendation[]> {
  return db.recommendations
    .where('status')
    .equals('pending')
    .reverse()
    .sortBy('createdAt');
}

export async function getAllRecommendations(limit = 50): Promise<StoredRecommendation[]> {
  const all = await db.recommendations.orderBy('createdAt').reverse().toArray();
  return all.slice(0, limit);
}

export async function updateRecommendationStatus(
  id: string,
  status: RecommendationStatus,
): Promise<void> {
  await db.recommendations.update(id, {
    status,
    respondedAt: new Date().toISOString(),
  });
}

export async function clearOldRecommendations(keepDays = 30): Promise<void> {
  const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000).toISOString();
  await db.recommendations
    .where('createdAt')
    .below(cutoff)
    .filter(r => r.status !== 'pending')
    .delete();
}

export async function dismissAllPending(): Promise<void> {
  const pending = await getPendingRecommendations();
  const now = new Date().toISOString();
  await db.recommendations.bulkPut(
    pending.map(r => ({ ...r, status: 'dismissed' as const, respondedAt: now })),
  );
}
