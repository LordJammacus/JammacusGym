import type { TrainingContext } from '@/types/recommendations';
import type { WorkoutInstance, WorkoutExerciseInstance, CompletedSet, ExerciseMuscle, RecoveryLog } from '@/types/entities';
import type { Program, TrainingBlock, BlockWorkout } from '@/types/entities';
import type { DayOfWeek } from '@/types/enums';
import {
  calculatePrimaryMuscleSets,
  filterSetsToDateRange,
  calculateRollingVolume,
  calculatePerformanceTrend,
  detectStagnation,
  buildExerciseProgression,
  calculateAverageFrequency,
  buildFatigueTimeline,
} from '@/engines/analytics';
import type { DateRange, PerformanceTrendResult, StagnationResult } from '@/types/analytics';

interface ContextInput {
  recentWorkouts: WorkoutInstance[];
  allSets: CompletedSet[];
  exerciseInstances: WorkoutExerciseInstance[];
  exerciseMuscles: ExerciseMuscle[];
  muscleNames: Map<string, string>;
  exerciseNames: Map<string, string>;
  currentProgram: Program | null;
  currentBlock: TrainingBlock | null;
  blockWorkouts: BlockWorkout[];
  recoveryLogs?: RecoveryLog[];
  availableTrainingDays?: DayOfWeek[];
  now?: string;
}

/**
 * Builds a fully-hydrated TrainingContext from raw DB data + analytics.
 * Pure: all inputs provided, no DB access.
 */
export function buildTrainingContext(input: ContextInput): TrainingContext {
  const now = input.now ?? new Date().toISOString();
  const nowMs = new Date(now).getTime();

  const dateRange7d: DateRange = {
    start: new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: now,
  };
  const dateRange28d: DateRange = {
    start: new Date(nowMs - 28 * 24 * 60 * 60 * 1000).toISOString(),
    end: now,
  };

  // True 7-day primary-set counts for volume recommendations (no fractional spillover).
  const weekData = filterSetsToDateRange(
    input.allSets,
    input.exerciseInstances,
    input.recentWorkouts,
    dateRange7d,
  );
  const muscleVolume = calculatePrimaryMuscleSets(
    weekData.sets,
    weekData.exerciseInstances,
    input.exerciseMuscles,
    input.muscleNames,
  );

  const rollingVolume = calculateRollingVolume(
    input.allSets,
    input.exerciseInstances,
    input.recentWorkouts,
    7,
  );

  const exerciseIds = getUniqueExerciseIds(input.exerciseInstances);
  const exerciseTrends = new Map<string, PerformanceTrendResult>();
  const stagnatingExercises: StagnationResult[] = [];

  for (const exerciseId of exerciseIds) {
    const points = buildExerciseProgression(
      input.allSets,
      input.exerciseInstances,
      input.recentWorkouts,
      exerciseId,
    );
    if (points.length < 2) continue;

    const trend = calculatePerformanceTrend(points);
    exerciseTrends.set(exerciseId, trend);

    const stag = detectStagnation(
      points,
      exerciseId,
      input.exerciseNames.get(exerciseId) ?? 'Unknown',
    );
    if (stag.isStagnating) {
      stagnatingExercises.push(stag);
    }
  }

  const daysSinceLastWorkout = computeDaysSinceLastWorkout(input.recentWorkouts, nowMs);

  const daysSinceMuscleGroupTrained = computeDaysSinceMuscleGroupTrained(
    input.recentWorkouts,
    input.exerciseInstances,
    input.allSets,
    input.exerciseMuscles,
    nowMs,
  );

  const averageWeeklyFrequency = calculateAverageFrequency(input.recentWorkouts, dateRange28d);

  const recoveryLogs = input.recoveryLogs ?? [];
  let recentFatigueScore: number | null = null;
  if (recoveryLogs.length > 0) {
    const timeline = buildFatigueTimeline(recoveryLogs);
    const recent = timeline.slice(-3);
    if (recent.length > 0) {
      recentFatigueScore = recent.reduce((a, b) => a + b.compositeScore, 0) / recent.length;
    }
  }

  return {
    recentWorkouts: input.recentWorkouts,
    allSets: input.allSets,
    exerciseInstances: input.exerciseInstances,
    exerciseMuscles: input.exerciseMuscles,
    muscleNames: input.muscleNames,
    exerciseNames: input.exerciseNames,
    muscleVolume,
    rollingVolume,
    exerciseTrends,
    stagnatingExercises,
    currentProgram: input.currentProgram,
    currentBlock: input.currentBlock,
    blockWorkouts: input.blockWorkouts,
    daysSinceLastWorkout,
    daysSinceMuscleGroupTrained,
    averageWeeklyFrequency,
    recoveryLogs,
    recentFatigueScore,
    availableTrainingDays: input.availableTrainingDays ?? [1, 2, 3, 4, 5, 6],
    now,
  };
}

function getUniqueExerciseIds(exerciseInstances: WorkoutExerciseInstance[]): string[] {
  return [...new Set(exerciseInstances.map(ei => ei.exerciseId))];
}

function computeDaysSinceLastWorkout(workouts: WorkoutInstance[], nowMs: number): number {
  const completed = workouts.filter(w => w.status === 'completed');
  if (completed.length === 0) return Infinity;

  const last = completed.reduce((latest, w) =>
    w.startedAt > latest.startedAt ? w : latest,
  );
  return Math.floor((nowMs - new Date(last.startedAt).getTime()) / (24 * 60 * 60 * 1000));
}

function computeDaysSinceMuscleGroupTrained(
  workouts: WorkoutInstance[],
  exerciseInstances: WorkoutExerciseInstance[],
  sets: CompletedSet[],
  exerciseMuscles: ExerciseMuscle[],
  nowMs: number,
): Map<string, number> {
  const result = new Map<string, number>();

  const eiByInstance = new Map<string, WorkoutExerciseInstance[]>();
  for (const ei of exerciseInstances) {
    const list = eiByInstance.get(ei.workoutInstanceId) ?? [];
    list.push(ei);
    eiByInstance.set(ei.workoutInstanceId, list);
  }

  const eiIds = new Set(sets.filter(s => s.setType !== 'warmup').map(s => s.workoutExerciseInstanceId));

  const completed = workouts
    .filter(w => w.status === 'completed')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  for (const workout of completed) {
    const eis = eiByInstance.get(workout.id) ?? [];
    const workoutDate = new Date(workout.startedAt).getTime();
    const daysSince = Math.floor((nowMs - workoutDate) / (24 * 60 * 60 * 1000));

    for (const ei of eis) {
      if (!eiIds.has(ei.id)) continue;

      const muscles = exerciseMuscles.filter(em => em.exerciseId === ei.exerciseId && em.role === 'primary');
      for (const m of muscles) {
        if (!result.has(m.muscleGroupId)) {
          result.set(m.muscleGroupId, daysSince);
        }
      }
    }
  }

  return result;
}
