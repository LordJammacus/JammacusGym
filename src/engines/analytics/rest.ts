import type { CompletedSet, WorkoutExerciseInstance } from '@/types/entities';
import type { RestAdherenceResult } from '@/types/analytics';

export function calculateRestAdherence(
  sets: CompletedSet[],
  exerciseInstances: WorkoutExerciseInstance[],
): RestAdherenceResult {
  const eiMap = new Map<string, number>();
  for (const ei of exerciseInstances) {
    eiMap.set(ei.id, ei.restSecondsTarget);
  }

  let totalPrescribed = 0;
  let totalActual = 0;
  let count = 0;

  for (const set of sets) {
    if (set.actualRestSeconds == null) continue;
    const prescribed = eiMap.get(set.workoutExerciseInstanceId);
    if (prescribed == null || prescribed === 0) continue;

    totalPrescribed += prescribed;
    totalActual += set.actualRestSeconds;
    count++;
  }

  if (count === 0) {
    return { prescribedAvg: 0, actualAvg: 0, adherencePercent: 100, totalSetsWithRest: 0 };
  }

  const prescribedAvg = Math.round(totalPrescribed / count);
  const actualAvg = Math.round(totalActual / count);
  const adherencePercent = prescribedAvg > 0
    ? Math.round(Math.min(100, (1 - Math.abs(actualAvg - prescribedAvg) / prescribedAvg) * 100))
    : 100;

  return {
    prescribedAvg,
    actualAvg,
    adherencePercent: Math.max(0, adherencePercent),
    totalSetsWithRest: count,
  };
}
