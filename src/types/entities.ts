import type {
  WeightUnit,
  Theme,
  ProgressionStrategy,
  MuscleCategory,
  ExerciseCategory,
  Equipment,
  MovementPattern,
  SetType,
  MuscleRole,
  WorkoutStatus,
  WorkoutGoal,
  BlockGoal,
  MeasurementType,
  RecoveryRating,
  DayOfWeek,
} from './enums';

export interface UserSettings {
  id: string;
  units: WeightUnit;
  weekStartDay: number;
  defaultRestSeconds: number;
  defaultRir: number;
  defaultProgressionStrategy: ProgressionStrategy;
  theme: Theme;
  weightIncrement: number;
  availableTrainingDays: DayOfWeek[];
  createdAt: string;
  updatedAt: string;
}

export interface MuscleGroup {
  id: string;
  name: string;
  category: MuscleCategory;
  sortOrder: number;
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
  movementPattern: MovementPattern;
  defaultRepRangeMin: number;
  defaultRepRangeMax: number;
  defaultRestSeconds: number;
  notes: string;
  isCustom: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseMuscle {
  id: string;
  exerciseId: string;
  muscleGroupId: string;
  role: MuscleRole;
  contribution: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  goal: WorkoutGoal;
  estimatedDurationMinutes: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface TemplateExercise {
  id: string;
  workoutTemplateId: string;
  exerciseId: string;
  orderIndex: number;
  supersetGroup: string | null;
  restSeconds: number;
  notes: string;
  progressionRuleId: string | null;
}

export interface ProgressionRule {
  id: string;
  name: string;
  strategy: ProgressionStrategy;
  weightIncrement: number;
  repThreshold: number | null;
  requiredConsecutiveSuccess: number;
  deloadPercentage: number | null;
  deloadAfterFailures: number | null;
  notes: string;
  createdAt: string;
}

export interface SetTarget {
  id: string;
  templateExerciseId: string;
  orderIndex: number;
  setType: SetType;
  targetWeight: number | null;
  targetRepMin: number;
  targetRepMax: number;
  targetRir: number | null;
}

export interface WorkoutInstance {
  id: string;
  workoutTemplateId: string | null;
  programId: string | null;
  trainingBlockId: string | null;
  templateName: string;
  goal: WorkoutGoal;
  status: WorkoutStatus;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  notes: string;
  createdAt: string;
}

export interface WorkoutExerciseInstance {
  id: string;
  workoutInstanceId: string;
  exerciseId: string;
  templateExerciseId: string | null;
  originalExerciseId: string | null;
  orderIndex: number;
  supersetGroup: string | null;
  restSecondsTarget: number;
  notes: string;
}

export interface CompletedSet {
  id: string;
  workoutExerciseInstanceId: string;
  orderIndex: number;
  setType: SetType;
  targetWeight: number | null;
  targetRepMin: number | null;
  targetRepMax: number | null;
  targetRir: number | null;
  actualWeight: number;
  actualReps: number;
  actualRir: number | null;
  actualRestSeconds: number | null;
  isAdditional: boolean;
  completedAt: string;
  notes: string;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface TrainingBlock {
  id: string;
  programId: string;
  name: string;
  orderIndex: number;
  weekCount: number;
  goal: BlockGoal;
  notes: string;
  createdAt: string;
}

export interface BlockWorkout {
  id: string;
  trainingBlockId: string;
  workoutTemplateId: string;
  orderIndex: number;
  dayOfWeek: number | null;
}

export interface Note {
  id: string;
  type: import('./enums').NoteType;
  targetId: string | null;
  content: string;
  showNextTime: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface BodyMeasurement {
  id: string;
  type: MeasurementType;
  value: number;
  unit: 'kg' | 'lb' | 'cm' | 'in';
  measuredAt: string;
  notes: string;
  createdAt: string;
}

export interface RecoveryLog {
  id: string;
  date: string;
  sleepQuality: RecoveryRating | null;
  sleepHours: number | null;
  energy: RecoveryRating | null;
  motivation: RecoveryRating | null;
  soreness: RecoveryRating | null;
  stress: RecoveryRating | null;
  overallFatigue: RecoveryRating | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
