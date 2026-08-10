export interface DateRange {
  start: string;
  end: string;
}

export type TimePeriod = '1w' | '1m' | '3m' | '6m' | '1y' | 'all';

export interface MuscleVolumeEntry {
  muscleGroupId: string;
  muscleName: string;
  directSets: number;
  indirectSets: number;
  totalWeightedSets: number;
}

export interface WeeklyVolumePoint {
  weekStart: string;
  totalSets: number;
  workingSets: number;
  totalVolume: number;
}

export interface ExerciseProgressionPoint {
  date: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  volumeLoad: number;
}

export interface FrequencyPoint {
  weekStart: string;
  sessions: number;
}

export interface WorkoutDurationPoint {
  date: string;
  durationMinutes: number;
}

export interface RestAdherenceResult {
  prescribedAvg: number;
  actualAvg: number;
  adherencePercent: number;
  totalSetsWithRest: number;
}

export interface PersonalRecordType {
  type: 'weight' | 'reps' | 'volume' | 'estimated_1rm' | 'reps_at_weight';
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  type: PersonalRecordType['type'];
  value: number;
  weight: number | null;
  reps: number | null;
  completedSetId: string;
  workoutInstanceId: string;
  achievedAt: string;
  createdAt: string;
}

export interface PerformanceTrendResult {
  slope: number;
  direction: 'improving' | 'stagnating' | 'declining';
  dataPoints: number;
  movingAverages: { date: string; value: number }[];
}

export interface RollingVolumeResult {
  window: 7 | 14 | 28;
  totalSets: number;
  totalVolume: number;
  avgSetsPerDay: number;
}

export interface StagnationResult {
  exerciseId: string;
  exerciseName: string;
  sessionsSinceProgress: number;
  isStagnating: boolean;
  lastProgressDate: string | null;
}
