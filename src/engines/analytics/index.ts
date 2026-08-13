export { estimateOneRepMax, buildExerciseProgression, buildAllExerciseProgressions, calculateVolumeLoad } from './intensity';
export { calculateMuscleGroupVolume, calculatePrimaryMuscleSets, filterSetsToDateRange, calculateWeeklyVolume, calculateRollingVolume, calculateTotalVolume } from './volume';
export { calculateWeeklyFrequency, calculateWorkoutDurations, calculateAverageFrequency } from './frequency';
export { calculateRestAdherence } from './rest';
export { detectPersonalRecords } from './records';
export {
  calculatePerformanceTrend,
  detectStagnation,
  compareSessions,
  summarizeExerciseProgress,
  summarizeAllExercises,
  getLatestWorkoutDeltas,
} from './performance';
export { completedWorkoutsOnly, completedWorkoutIdSet } from './completedOnly';
export {
  buildFatigueTimeline,
  correlateFatigueWithPerformance,
  estimateMuscleRecovery,
  detectWorkoutSequenceInsights,
} from './fatigue';
export type {
  FatigueSnapshot,
  FatiguePerformanceCorrelation,
  MuscleRecoveryEstimate,
  WorkoutSequenceInsight,
} from './fatigue';
export {
  generateBlockSummary,
  suggestNextBlock,
} from './blockSummary';
export type {
  BlockSummary,
  ExerciseSummary,
  NextBlockSuggestion,
} from './blockSummary';
