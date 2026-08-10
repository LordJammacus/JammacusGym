export type WeightUnit = 'kg' | 'lb';
export type Theme = 'dark' | 'light' | 'system';
export type ProgressionStrategy =
  | 'double'
  | 'rep'
  | 'weight'
  | 'rir'
  | 'percentage'
  | 'topset_backoff'
  | 'manual';

export type MuscleCategory = 'push' | 'pull' | 'legs' | 'core' | 'other';
export type ExerciseCategory = 'compound' | 'isolation' | 'cardio' | 'other';
export type Equipment = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'other';
export type MovementPattern =
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'hip_hinge'
  | 'squat'
  | 'lunge'
  | 'isolation'
  | 'carry'
  | 'other';

export type SetType = 'working' | 'warmup' | 'drop' | 'failure' | 'backoff' | 'additional';
export type MuscleRole = 'primary' | 'secondary';
export type WorkoutStatus = 'in_progress' | 'completed' | 'abandoned';
export type WorkoutGoal =
  | 'hypertrophy'
  | 'strength'
  | 'power'
  | 'explosiveness'
  | 'technique'
  | 'conditioning'
  | 'recovery'
  | 'general';

export type NoteType = 'exercise' | 'workout_template' | 'workout_instance' | 'general' | 'reminder';

export type BlockGoal = 'hypertrophy' | 'strength' | 'power' | 'deload' | 'peaking' | 'general';

export type ProgressionAction = 'increase' | 'maintain' | 'deload' | 'manual';
export type ProgressionConfidence = 'high' | 'medium' | 'low';

export type RecommendationType = 'schedule' | 'volume' | 'deload' | 'exercise' | 'intensity';
export type RecommendationPriority = 'high' | 'medium' | 'low';
export type RecommendationStatus = 'pending' | 'accepted' | 'dismissed' | 'modified';

export type MeasurementType =
  | 'bodyweight'
  | 'waist'
  | 'chest'
  | 'left_arm'
  | 'right_arm'
  | 'left_thigh'
  | 'right_thigh'
  | 'hips'
  | 'neck'
  | 'shoulders'
  | 'left_calf'
  | 'right_calf'
  | 'left_forearm'
  | 'right_forearm';

export type RecoveryRating = 1 | 2 | 3 | 4 | 5;

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
