import type { RecoveryLog, WorkoutInstance, WorkoutExerciseInstance, CompletedSet, ExerciseMuscle } from '@/types/entities';

export interface FatigueSnapshot {
  date: string;
  compositeScore: number;
  sleepScore: number | null;
  energyScore: number | null;
  sorenessScore: number | null;
  stressScore: number | null;
  overallFatigueScore: number | null;
}

export interface FatiguePerformanceCorrelation {
  lowFatigueAvgPerformance: number;
  highFatigueAvgPerformance: number;
  dataPoints: number;
  significantDifference: boolean;
  summary: string;
}

export interface MuscleRecoveryEstimate {
  muscleGroupId: string;
  muscleName: string;
  daysSinceTrained: number;
  lastVolume: number;
  estimatedRecoveryDays: number;
  recoveryPercent: number;
}

export interface WorkoutSequenceInsight {
  precedingWorkoutName: string;
  followingWorkoutName: string;
  avgPerformanceChange: number;
  occurrences: number;
  summary: string;
}

/**
 * Build a time-series of fatigue snapshots from recovery logs.
 * Composite score: average of all non-null ratings, inverted where appropriate
 * so higher = more fatigued (1-5 scale).
 */
export function buildFatigueTimeline(logs: RecoveryLog[]): FatigueSnapshot[] {
  return logs
    .filter(l => hasAnyRating(l))
    .map(log => {
      const scores: number[] = [];

      if (log.sleepQuality != null) scores.push(invertRating(log.sleepQuality));
      if (log.energy != null) scores.push(invertRating(log.energy));
      if (log.motivation != null) scores.push(invertRating(log.motivation));
      if (log.soreness != null) scores.push(log.soreness);
      if (log.stress != null) scores.push(log.stress);
      if (log.overallFatigue != null) scores.push(log.overallFatigue);

      const compositeScore = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0;

      return {
        date: log.date,
        compositeScore,
        sleepScore: log.sleepQuality != null ? invertRating(log.sleepQuality) : null,
        energyScore: log.energy != null ? invertRating(log.energy) : null,
        sorenessScore: log.soreness,
        stressScore: log.stress,
        overallFatigueScore: log.overallFatigue,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Correlate recovery scores with workout performance (volume load per session).
 * Splits recovery days into low-fatigue (composite <= 2.5) and high-fatigue (> 2.5),
 * then compares average session volume load.
 */
export function correlateFatigueWithPerformance(
  logs: RecoveryLog[],
  workouts: WorkoutInstance[],
  exerciseInstances: WorkoutExerciseInstance[],
  sets: CompletedSet[],
): FatiguePerformanceCorrelation {
  const fatigueDays = buildFatigueTimeline(logs);
  const fatigueByDate = new Map(fatigueDays.map(f => [f.date, f.compositeScore]));

  const eiByWorkout = groupBy(exerciseInstances, ei => ei.workoutInstanceId);
  const setsByEi = groupBy(sets, s => s.workoutExerciseInstanceId);

  const lowFatiguePerformance: number[] = [];
  const highFatiguePerformance: number[] = [];

  for (const workout of workouts) {
    if (workout.status !== 'completed') continue;
    const workoutDate = workout.startedAt.split('T')[0]!;
    const fatigue = fatigueByDate.get(workoutDate);
    if (fatigue == null) continue;

    const eis = eiByWorkout.get(workout.id) ?? [];
    let sessionVolume = 0;
    for (const ei of eis) {
      const eiSets = setsByEi.get(ei.id) ?? [];
      for (const s of eiSets) {
        if (s.setType !== 'warmup') {
          sessionVolume += s.actualWeight * s.actualReps;
        }
      }
    }

    if (fatigue <= 2.5) {
      lowFatiguePerformance.push(sessionVolume);
    } else {
      highFatiguePerformance.push(sessionVolume);
    }
  }

  const lowAvg = avg(lowFatiguePerformance);
  const highAvg = avg(highFatiguePerformance);
  const totalPoints = lowFatiguePerformance.length + highFatiguePerformance.length;
  const diff = lowAvg > 0 ? ((lowAvg - highAvg) / lowAvg) * 100 : 0;
  const significantDifference = Math.abs(diff) > 10 && totalPoints >= 4;

  let summary: string;
  if (totalPoints < 4) {
    summary = 'Not enough data to correlate fatigue with performance. Keep logging recovery.';
  } else if (significantDifference && diff > 0) {
    summary = `Performance is ${Math.round(diff)}% higher on low-fatigue days. Recovery appears to meaningfully impact your output.`;
  } else if (significantDifference && diff < 0) {
    summary = `Interestingly, performance is ${Math.round(Math.abs(diff))}% higher on reported high-fatigue days. Perceived fatigue may not reflect actual readiness.`;
  } else {
    summary = 'No significant difference in performance between high and low fatigue days so far.';
  }

  return {
    lowFatigueAvgPerformance: Math.round(lowAvg),
    highFatigueAvgPerformance: Math.round(highAvg),
    dataPoints: totalPoints,
    significantDifference,
    summary,
  };
}

/**
 * Estimate muscle group recovery status based on days since trained
 * and the volume applied. Higher volume = longer estimated recovery.
 */
export function estimateMuscleRecovery(
  workouts: WorkoutInstance[],
  exerciseInstances: WorkoutExerciseInstance[],
  sets: CompletedSet[],
  exerciseMuscles: ExerciseMuscle[],
  muscleNames: Map<string, string>,
  nowMs: number,
): MuscleRecoveryEstimate[] {
  const eiByWorkout = groupBy(exerciseInstances, ei => ei.workoutInstanceId);
  const setsByEi = groupBy(sets, s => s.workoutExerciseInstanceId);

  const muscleData = new Map<string, { lastDate: number; volume: number }>();

  const completed = workouts
    .filter(w => w.status === 'completed')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  for (const workout of completed) {
    const workoutDate = new Date(workout.startedAt).getTime();
    const eis = eiByWorkout.get(workout.id) ?? [];

    for (const ei of eis) {
      const muscles = exerciseMuscles.filter(em => em.exerciseId === ei.exerciseId);
      const eiSets = setsByEi.get(ei.id) ?? [];
      const workingSets = eiSets.filter(s => s.setType !== 'warmup').length;

      for (const muscle of muscles) {
        if (!muscleData.has(muscle.muscleGroupId)) {
          muscleData.set(muscle.muscleGroupId, {
            lastDate: workoutDate,
            volume: workingSets * muscle.contribution,
          });
        }
      }
    }
  }

  return Array.from(muscleData.entries()).map(([muscleGroupId, data]) => {
    const daysSince = Math.floor((nowMs - data.lastDate) / (24 * 60 * 60 * 1000));
    const baseRecoveryDays = estimateBaseRecovery(data.volume);
    const recoveryPercent = Math.min(100, Math.round((daysSince / baseRecoveryDays) * 100));

    return {
      muscleGroupId,
      muscleName: muscleNames.get(muscleGroupId) ?? 'Unknown',
      daysSinceTrained: daysSince,
      lastVolume: Math.round(data.volume * 10) / 10,
      estimatedRecoveryDays: baseRecoveryDays,
      recoveryPercent,
    };
  }).sort((a, b) => a.recoveryPercent - b.recoveryPercent);
}

/**
 * Detect performance patterns based on workout sequence.
 * E.g. "Pull 2 performance is lower when preceded by Legs 2".
 */
export function detectWorkoutSequenceInsights(
  workouts: WorkoutInstance[],
  exerciseInstances: WorkoutExerciseInstance[],
  sets: CompletedSet[],
): WorkoutSequenceInsight[] {
  const completed = workouts
    .filter(w => w.status === 'completed')
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  if (completed.length < 4) return [];

  const eiByWorkout = groupBy(exerciseInstances, ei => ei.workoutInstanceId);
  const setsByEi = groupBy(sets, s => s.workoutExerciseInstanceId);

  const workoutVolumes = new Map<string, number>();
  for (const w of completed) {
    const eis = eiByWorkout.get(w.id) ?? [];
    let vol = 0;
    for (const ei of eis) {
      for (const s of (setsByEi.get(ei.id) ?? [])) {
        if (s.setType !== 'warmup') vol += s.actualWeight * s.actualReps;
      }
    }
    workoutVolumes.set(w.id, vol);
  }

  // Group by (preceding template name, following template name) pairs
  const pairData = new Map<string, { volumes: number[]; baseVolumes: number[] }>();

  for (let i = 1; i < completed.length; i++) {
    const prev = completed[i - 1]!;
    const curr = completed[i]!;
    const key = `${prev.templateName}→${curr.templateName}`;
    const existing = pairData.get(key) ?? { volumes: [], baseVolumes: [] };
    existing.volumes.push(workoutVolumes.get(curr.id) ?? 0);
    pairData.set(key, existing);
  }

  // Get average volume per template name for baseline
  const templateVolumes = new Map<string, number[]>();
  for (const w of completed) {
    const list = templateVolumes.get(w.templateName) ?? [];
    list.push(workoutVolumes.get(w.id) ?? 0);
    templateVolumes.set(w.templateName, list);
  }

  const insights: WorkoutSequenceInsight[] = [];

  for (const [key, data] of pairData) {
    if (data.volumes.length < 2) continue;
    const [precedingName, followingName] = key.split('→');
    if (!precedingName || !followingName) continue;

    const baselineVolumes = templateVolumes.get(followingName) ?? [];
    const baseline = avg(baselineVolumes);
    const sequenceAvg = avg(data.volumes);
    if (baseline === 0) continue;

    const change = ((sequenceAvg - baseline) / baseline) * 100;
    if (Math.abs(change) < 8) continue;

    const direction = change < 0 ? 'lower' : 'higher';
    insights.push({
      precedingWorkoutName: precedingName,
      followingWorkoutName: followingName,
      avgPerformanceChange: Math.round(change),
      occurrences: data.volumes.length,
      summary: `${followingName} volume is ${Math.abs(Math.round(change))}% ${direction} when preceded by ${precedingName} (${data.volumes.length} occurrences).`,
    });
  }

  return insights.sort((a, b) => Math.abs(b.avgPerformanceChange) - Math.abs(a.avgPerformanceChange));
}

// --- Helpers ---

function invertRating(r: number): number {
  return 6 - r;
}

function hasAnyRating(log: RecoveryLog): boolean {
  return log.sleepQuality != null
    || log.energy != null
    || log.soreness != null
    || log.stress != null
    || log.overallFatigue != null;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

/**
 * Heuristic: more working sets = longer recovery estimate.
 * ~3 sets → 2 days, ~6 sets → 3 days, ~12+ sets → 4 days.
 */
function estimateBaseRecovery(weightedSets: number): number {
  if (weightedSets <= 3) return 2;
  if (weightedSets <= 6) return 2.5;
  if (weightedSets <= 9) return 3;
  if (weightedSets <= 12) return 3.5;
  return 4;
}
