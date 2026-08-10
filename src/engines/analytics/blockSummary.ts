import type {
  WorkoutInstance,
  WorkoutExerciseInstance,
  CompletedSet,
  ExerciseMuscle,
  TrainingBlock,
} from '@/types/entities';
import type { MuscleVolumeEntry } from '@/types/analytics';
import { buildExerciseProgression } from './intensity';
import { calculateMuscleGroupVolume } from './volume';
import { calculatePerformanceTrend } from './performance';

export interface ExerciseSummary {
  exerciseId: string;
  exerciseName: string;
  sessions: number;
  startingE1RM: number;
  endingE1RM: number;
  change: number;
  changePercent: number;
  direction: 'improved' | 'stagnated' | 'declined';
}

export interface BlockSummary {
  block: TrainingBlock;
  totalWorkouts: number;
  totalSets: number;
  totalVolume: number;
  durationWeeks: number;
  avgWorkoutsPerWeek: number;
  muscleVolume: MuscleVolumeEntry[];
  exerciseSummaries: ExerciseSummary[];
  improved: ExerciseSummary[];
  stagnated: ExerciseSummary[];
  declined: ExerciseSummary[];
  topMuscleGroups: { name: string; sets: number }[];
  weakMuscleGroups: { name: string; sets: number }[];
}

export interface NextBlockSuggestion {
  title: string;
  reasoning: string;
  suggestedAction: string;
}

/**
 * Generate a comprehensive summary for a completed training block.
 */
export function generateBlockSummary(
  block: TrainingBlock,
  workouts: WorkoutInstance[],
  exerciseInstances: WorkoutExerciseInstance[],
  sets: CompletedSet[],
  exerciseMuscles: ExerciseMuscle[],
  exerciseNames: Map<string, string>,
  muscleNames: Map<string, string>,
): BlockSummary {
  const blockWorkouts = workouts.filter(
    w => w.trainingBlockId === block.id && w.status === 'completed',
  );

  const blockWorkoutIds = new Set(blockWorkouts.map(w => w.id));
  const blockEis = exerciseInstances.filter(ei => blockWorkoutIds.has(ei.workoutInstanceId));
  const blockEiIds = new Set(blockEis.map(ei => ei.id));
  const blockSets = sets.filter(s => blockEiIds.has(s.workoutExerciseInstanceId));

  const workingSets = blockSets.filter(s => s.setType !== 'warmup');
  const totalVolume = workingSets.reduce((acc, s) => acc + s.actualWeight * s.actualReps, 0);

  const muscleVolume = calculateMuscleGroupVolume(blockSets, blockEis, exerciseMuscles, muscleNames);

  // Per-exercise summaries
  const uniqueExercises = [...new Set(blockEis.map(ei => ei.exerciseId))];
  const exerciseSummaries: ExerciseSummary[] = [];

  for (const exerciseId of uniqueExercises) {
    const points = buildExerciseProgression(blockSets, blockEis, blockWorkouts, exerciseId);
    if (points.length < 2) continue;

    const startE1RM = points[0]!.estimated1RM;
    const endE1RM = points[points.length - 1]!.estimated1RM;
    const change = endE1RM - startE1RM;
    const changePercent = startE1RM > 0 ? (change / startE1RM) * 100 : 0;

    const trend = calculatePerformanceTrend(points);

    exerciseSummaries.push({
      exerciseId,
      exerciseName: exerciseNames.get(exerciseId) ?? 'Unknown',
      sessions: points.length,
      startingE1RM: Math.round(startE1RM * 10) / 10,
      endingE1RM: Math.round(endE1RM * 10) / 10,
      change: Math.round(change * 10) / 10,
      changePercent: Math.round(changePercent * 10) / 10,
      direction: trend.direction === 'improving' ? 'improved'
        : trend.direction === 'declining' ? 'declined'
        : 'stagnated',
    });
  }

  exerciseSummaries.sort((a, b) => b.changePercent - a.changePercent);

  const improved = exerciseSummaries.filter(e => e.direction === 'improved');
  const stagnated = exerciseSummaries.filter(e => e.direction === 'stagnated');
  const declined = exerciseSummaries.filter(e => e.direction === 'declined');

  // Duration calculation
  let durationWeeks = block.weekCount;
  if (blockWorkouts.length >= 2) {
    const first = blockWorkouts.reduce((a, b) => a.startedAt < b.startedAt ? a : b);
    const last = blockWorkouts.reduce((a, b) => a.startedAt > b.startedAt ? a : b);
    const ms = new Date(last.startedAt).getTime() - new Date(first.startedAt).getTime();
    durationWeeks = Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)));
  }

  const sortedMuscle = [...muscleVolume].sort((a, b) => b.totalWeightedSets - a.totalWeightedSets);
  const topMuscleGroups = sortedMuscle.slice(0, 5).map(m => ({ name: m.muscleName, sets: m.totalWeightedSets }));
  const weakMuscleGroups = sortedMuscle.slice(-3).map(m => ({ name: m.muscleName, sets: m.totalWeightedSets }));

  return {
    block,
    totalWorkouts: blockWorkouts.length,
    totalSets: workingSets.length,
    totalVolume: Math.round(totalVolume),
    durationWeeks,
    avgWorkoutsPerWeek: durationWeeks > 0 ? Math.round((blockWorkouts.length / durationWeeks) * 10) / 10 : 0,
    muscleVolume,
    exerciseSummaries,
    improved,
    stagnated,
    declined,
    topMuscleGroups,
    weakMuscleGroups,
  };
}

/**
 * Generate suggestions for the next training block based on current block analysis.
 */
export function suggestNextBlock(summary: BlockSummary): NextBlockSuggestion[] {
  const suggestions: NextBlockSuggestion[] = [];

  // Volume adjustment
  if (summary.declined.length > summary.improved.length && summary.totalWorkouts >= 4) {
    suggestions.push({
      title: 'Consider reducing volume',
      reasoning: `${summary.declined.length} exercises declined vs ${summary.improved.length} improved. This may indicate accumulated fatigue or excessive volume.`,
      suggestedAction: `Reduce working sets by 15-25% in the next block, or schedule a deload week first.`,
    });
  } else if (summary.improved.length >= summary.exerciseSummaries.length * 0.7 && summary.exerciseSummaries.length >= 3) {
    suggestions.push({
      title: 'Progression is strong — maintain or slightly increase volume',
      reasoning: `${summary.improved.length} of ${summary.exerciseSummaries.length} exercises improved. Current volume appears well-tolerated.`,
      suggestedAction: 'Consider adding 1-2 sets per muscle group, or maintaining current volume.',
    });
  }

  // Stagnation
  if (summary.stagnated.length >= 2) {
    const names = summary.stagnated.slice(0, 3).map(e => e.exerciseName).join(', ');
    suggestions.push({
      title: 'Address stagnating exercises',
      reasoning: `${names} showed no meaningful progress. Stimulus may be insufficient or too fatiguing.`,
      suggestedAction: 'Consider exercise substitutions, rep range changes, or intensity techniques for stagnating movements.',
    });
  }

  // Muscle balance
  if (summary.weakMuscleGroups.length > 0 && summary.topMuscleGroups.length > 0) {
    const topSets = summary.topMuscleGroups[0]!.sets;
    const weakGroups = summary.weakMuscleGroups.filter(m => m.sets < topSets * 0.3);
    if (weakGroups.length > 0) {
      const names = weakGroups.map(m => m.name).join(', ');
      suggestions.push({
        title: 'Address muscle group imbalance',
        reasoning: `${names} received significantly less volume relative to other muscle groups.`,
        suggestedAction: `Add 2-4 weekly sets targeting ${names} in the next block.`,
      });
    }
  }

  // Block goal transition
  if (summary.block.goal === 'hypertrophy' && summary.improved.length > 0) {
    suggestions.push({
      title: 'Consider a strength-focused block',
      reasoning: 'After a successful hypertrophy block, a strength phase can consolidate gains with lower reps and higher intensity.',
      suggestedAction: 'Program 3-6 rep ranges at 80-90% 1RM for primary compounds.',
    });
  } else if (summary.block.goal === 'strength') {
    suggestions.push({
      title: 'Consider a hypertrophy-focused block',
      reasoning: 'After a strength block, higher-rep hypertrophy training can drive further muscle growth and recovery.',
      suggestedAction: 'Program 8-15 rep ranges with moderate loads and higher set volumes.',
    });
  }

  // Deload suggestion if no recent deload
  if (summary.durationWeeks >= 6) {
    suggestions.push({
      title: 'Schedule a deload week',
      reasoning: `This block ran for ${summary.durationWeeks} weeks. A deload allows accumulated fatigue to dissipate.`,
      suggestedAction: 'Reduce volume by 40-60% and intensity by 10-20% for one week before starting the next block.',
    });
  }

  return suggestions;
}
