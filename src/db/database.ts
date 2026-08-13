import Dexie, { type EntityTable } from 'dexie';
import type {
  UserSettings,
  MuscleGroup,
  Exercise,
  ExerciseMuscle,
  WorkoutTemplate,
  TemplateExercise,
  SetTarget,
  ProgressionRule,
  WorkoutInstance,
  WorkoutExerciseInstance,
  CompletedSet,
  Program,
  TrainingBlock,
  BlockWorkout,
  Note,
  BodyMeasurement,
  RecoveryLog,
} from '@/types/entities';
import type { PersonalRecord } from '@/types/analytics';
import type { StoredRecommendation } from '@/types/recommendations';
import { DEFAULT_SETTINGS } from '@/constants/defaults';

export class GymDatabase extends Dexie {
  userSettings!: EntityTable<UserSettings, 'id'>;
  muscleGroups!: EntityTable<MuscleGroup, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  exerciseMuscles!: EntityTable<ExerciseMuscle, 'id'>;
  workoutTemplates!: EntityTable<WorkoutTemplate, 'id'>;
  templateExercises!: EntityTable<TemplateExercise, 'id'>;
  setTargets!: EntityTable<SetTarget, 'id'>;
  progressionRules!: EntityTable<ProgressionRule, 'id'>;
  workoutInstances!: EntityTable<WorkoutInstance, 'id'>;
  workoutExerciseInstances!: EntityTable<WorkoutExerciseInstance, 'id'>;
  completedSets!: EntityTable<CompletedSet, 'id'>;
  programs!: EntityTable<Program, 'id'>;
  trainingBlocks!: EntityTable<TrainingBlock, 'id'>;
  blockWorkouts!: EntityTable<BlockWorkout, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  personalRecords!: EntityTable<PersonalRecord, 'id'>;
  recommendations!: EntityTable<StoredRecommendation, 'id'>;
  bodyMeasurements!: EntityTable<BodyMeasurement, 'id'>;
  recoveryLogs!: EntityTable<RecoveryLog, 'id'>;

  constructor() {
    super('JammacusGym');

    this.version(1).stores({
      userSettings: 'id',
      muscleGroups: 'id, name, category',
      exercises: 'id, name, category, equipment, movementPattern, archivedAt',
      exerciseMuscles: 'id, exerciseId, muscleGroupId',
      workoutTemplates: 'id, name, archivedAt',
      templateExercises: 'id, workoutTemplateId, orderIndex',
      setTargets: 'id, templateExerciseId, orderIndex',
      workoutInstances: 'id, workoutTemplateId, status, startedAt',
      workoutExerciseInstances: 'id, workoutInstanceId, exerciseId, orderIndex',
      completedSets: 'id, workoutExerciseInstanceId, orderIndex, completedAt',
    });

    this.version(2).stores({}).upgrade(tx => {
      return tx.table('completedSets').toCollection().modify(set => {
        if (set.actualRestSeconds === undefined) {
          set.actualRestSeconds = null;
        }
      });
    });

    this.version(3).stores({
      programs: 'id, isActive, archivedAt',
      trainingBlocks: 'id, programId, orderIndex',
      blockWorkouts: 'id, trainingBlockId, orderIndex',
      workoutInstances: 'id, workoutTemplateId, programId, status, startedAt',
    });

    this.version(4).stores({
      progressionRules: 'id',
    }).upgrade(tx => {
      return tx.table('templateExercises').toCollection().modify(te => {
        if (te.progressionRuleId === undefined) {
          te.progressionRuleId = null;
        }
      });
    });

    this.version(5).stores({
      notes: 'id, type, targetId, showNextTime, archivedAt',
    });

    this.version(6).stores({
      personalRecords: 'id, exerciseId, type, achievedAt, workoutInstanceId',
    });

    this.version(7).stores({
      recommendations: 'id, type, priority, status, createdAt',
    });

    this.version(8).stores({
      bodyMeasurements: 'id, type, measuredAt',
      recoveryLogs: 'id, date',
    }).upgrade(tx => {
      return tx.table('userSettings').toCollection().modify(settings => {
        if (settings.availableTrainingDays === undefined) {
          settings.availableTrainingDays = [1, 2, 3, 4, 5, 6];
        }
      });
    });
  }
}

export const db = new GymDatabase();

export async function getSettings(): Promise<UserSettings> {
  const existing = await db.userSettings.get('default');
  if (existing) return { ...DEFAULT_SETTINGS, ...existing };

  const settings = { ...DEFAULT_SETTINGS, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await db.userSettings.put(settings);
  return settings;
}

export async function updateSettings(updates: Partial<Omit<UserSettings, 'id' | 'createdAt'>>): Promise<UserSettings> {
  const current = await getSettings();
  const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
  await db.userSettings.put(updated);
  return updated;
}
