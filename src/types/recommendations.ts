import type {
  WorkoutInstance,
  WorkoutExerciseInstance,
  CompletedSet,
  ExerciseMuscle,
  Program,
  TrainingBlock,
  BlockWorkout,
  RecoveryLog,
} from './entities';
import type {
  MuscleVolumeEntry,
  PerformanceTrendResult,
  StagnationResult,
  RollingVolumeResult,
} from './analytics';
import type { DayOfWeek } from './enums';

// --- Recommendation Types ---

export type RecommendationType =
  | 'schedule'
  | 'volume'
  | 'deload'
  | 'exercise'
  | 'intensity';

export type RecommendationPriority = 'high' | 'medium' | 'low';

export type RecommendationStatus = 'pending' | 'accepted' | 'dismissed' | 'modified';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  reasoning: string;
  suggestedAction: string;
  supportingData: Record<string, unknown>;
  confidence: number; // 0-1
  createdAt: string;
}

export interface StoredRecommendation extends Recommendation {
  status: RecommendationStatus;
  respondedAt: string | null;
}

// --- Training Context (input to all recommenders) ---

export interface TrainingContext {
  recentWorkouts: WorkoutInstance[];
  allSets: CompletedSet[];
  exerciseInstances: WorkoutExerciseInstance[];
  exerciseMuscles: ExerciseMuscle[];
  muscleNames: Map<string, string>;
  exerciseNames: Map<string, string>;

  muscleVolume: MuscleVolumeEntry[];
  rollingVolume: RollingVolumeResult;
  exerciseTrends: Map<string, PerformanceTrendResult>;
  stagnatingExercises: StagnationResult[];

  currentProgram: Program | null;
  currentBlock: TrainingBlock | null;
  blockWorkouts: BlockWorkout[];

  daysSinceLastWorkout: number;
  daysSinceMuscleGroupTrained: Map<string, number>;
  averageWeeklyFrequency: number;

  recoveryLogs: RecoveryLog[];
  recentFatigueScore: number | null;
  availableTrainingDays: DayOfWeek[];

  now: string; // ISO string, injectable for determinism
}

// --- Recommender Source Interface ---

export interface RecommendationSource {
  id: string;
  name: string;
  evaluate(context: TrainingContext): Recommendation[];
}
