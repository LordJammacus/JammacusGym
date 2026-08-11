import { useState, useEffect, useCallback, useRef } from 'react';
import type { Recommendation, StoredRecommendation, TrainingContext } from '@/types/recommendations';
import { generateRecommendations, buildTrainingContext } from '@/engines/recommendations';
import {
  getCompletedInstances,
  getAllExerciseInstances,
  getAllCompletedSets,
  getAllExerciseMuscles,
  getMuscleNames,
  getExerciseNames,
} from '@/db/repositories/analytics';
import { getActiveProgram, getBlocksForProgram, getBlockWorkouts } from '@/db/repositories/programs';
import { getRecoveryLogs } from '@/db/repositories/body';
import {
  saveRecommendations,
  getPendingRecommendations,
  updateRecommendationStatus,
  dismissAllPending,
} from '@/db/repositories/recommendations';
import { getSettings } from '@/db/database';
import type { RecommendationStatus } from '@/types/recommendations';
import type { DateRange } from '@/types/analytics';

interface UseRecommendationsResult {
  recommendations: StoredRecommendation[];
  loading: boolean;
  refresh: () => Promise<void>;
  respond: (id: string, status: RecommendationStatus) => Promise<void>;
}

/** Shared across hook instances so StrictMode double-mount / dual pages don't stack pending rows. */
let refreshInFlight: Promise<StoredRecommendation[]> | null = null;

function dedupePending(recs: StoredRecommendation[]): StoredRecommendation[] {
  const seen = new Set<string>();
  const unique: StoredRecommendation[] = [];
  // Newest first from repo sort — keep first of each type+title.
  for (const rec of recs) {
    const key = `${rec.type}::${rec.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(rec);
  }
  return unique;
}

export function useRecommendations(): UseRecommendationsResult {
  const [recommendations, setRecommendations] = useState<StoredRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);

    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        const now = new Date().toISOString();
        const dateRange: DateRange = {
          start: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString(),
          end: now,
        };

        const [
          instances,
          exerciseMuscles,
          muscleNames,
          exerciseNames,
          program,
          recoveryLogs,
          settings,
        ] = await Promise.all([
          getCompletedInstances(dateRange),
          getAllExerciseMuscles(),
          getMuscleNames(),
          getExerciseNames(),
          getActiveProgram(),
          getRecoveryLogs(dateRange),
          getSettings(),
        ]);

        const instanceIds = instances.map(i => i.id);
        const exerciseInstances = await getAllExerciseInstances(instanceIds);
        const eiIds = exerciseInstances.map(ei => ei.id);
        const allSets = await getAllCompletedSets(eiIds);

        let currentBlock = null;
        let blockWorkoutsList: Awaited<ReturnType<typeof getBlockWorkouts>> = [];
        if (program) {
          const blocks = await getBlocksForProgram(program.id);
          currentBlock = blocks[0] ?? null;
          if (currentBlock) {
            blockWorkoutsList = await getBlockWorkouts(currentBlock.id);
          }
        }

        const ctx: TrainingContext = buildTrainingContext({
          recentWorkouts: instances,
          allSets,
          exerciseInstances,
          exerciseMuscles,
          muscleNames,
          exerciseNames,
          currentProgram: program ?? null,
          currentBlock,
          blockWorkouts: blockWorkoutsList,
          recoveryLogs,
          availableTrainingDays: settings.availableTrainingDays,
          now,
        });

        const recs: Recommendation[] = generateRecommendations(ctx);

        const stored: StoredRecommendation[] = recs.map(r => ({
          ...r,
          status: 'pending' as const,
          respondedAt: null,
        }));

        // Replace pending set so regenerations / StrictMode don't stack duplicates.
        await dismissAllPending();
        await saveRecommendations(stored);
        return stored;
      })().finally(() => {
        refreshInFlight = null;
      });
    }

    try {
      const stored = await refreshInFlight;
      if (mounted.current) {
        setRecommendations(stored);
        setLoading(false);
      }
    } catch {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const respond = useCallback(async (id: string, status: RecommendationStatus) => {
    await updateRecommendationStatus(id, status);
    setRecommendations(prev => prev.filter(r => r.id !== id));
  }, []);

  useEffect(() => {
    const loadExisting = async () => {
      const rawPending = await getPendingRecommendations();
      const pending = dedupePending(rawPending);
      if (pending.length > 0) {
        setRecommendations(pending);
        setLoading(false);
        // Clean up any historical duplicates left in IndexedDB.
        if (pending.length < rawPending.length) {
          await dismissAllPending();
          await saveRecommendations(pending);
        }
      } else {
        await refresh();
      }
    };
    loadExisting();
  }, [refresh]);

  return { recommendations, loading, refresh, respond };
}
