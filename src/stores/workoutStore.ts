import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { WorkoutInstance, WorkoutExerciseInstance, CompletedSet, SetTarget } from '@/types/entities';
import type { PersonalRecord } from '@/types/analytics';
import type { ProgressionResult } from '@/engines/progression/types';
import * as instancesRepo from '@/db/repositories/instances';
import * as workoutsRepo from '@/db/repositories/workouts';
import * as prRepo from '@/db/repositories/personalRecords';
import { detectPersonalRecords } from '@/engines/analytics/records';

interface SetInput {
  weight: number;
  reps: number;
  rir: number | null;
  setType: CompletedSet['setType'];
}

interface WorkoutState {
  instance: WorkoutInstance | null;
  exerciseInstances: WorkoutExerciseInstance[];
  completedSets: CompletedSet[];
  setTargets: SetTarget[][];
  progressionResults: (ProgressionResult | null)[];
  currentExerciseIndex: number;
  currentSetIndex: number;
  workoutStartTime: number | null;
  lastSetCompletedAt: number | null;
  restTimerTarget: number | null;
  exerciseStartTime: number | null;

  startWorkout: (
    instance: WorkoutInstance,
    exerciseInstances: WorkoutExerciseInstance[],
    setTargets: SetTarget[][],
  ) => Promise<void>;
  setProgressionResults: (results: (ProgressionResult | null)[]) => void;
  completeSet: (input: SetInput) => Promise<void>;
  nextExercise: () => void;
  prevExercise: () => void;
  goToExercise: (index: number) => void;
  addSet: () => void;
  finishWorkout: () => Promise<void>;
  abandonWorkout: () => Promise<void>;
  restoreWorkout: () => Promise<boolean>;
  dismissRestTimer: () => void;
  substituteExercise: (exerciseIndex: number, newExerciseId: string) => Promise<void>;
  newPRs: PersonalRecord[];
  dismissPRs: () => void;
  reset: () => void;
}

const initialState = {
  instance: null,
  exerciseInstances: [],
  completedSets: [],
  setTargets: [],
  progressionResults: [],
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  workoutStartTime: null,
  lastSetCompletedAt: null,
  restTimerTarget: null,
  exerciseStartTime: null,
  newPRs: [] as PersonalRecord[],
};

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      ...initialState,

      startWorkout: async (instance, exerciseInstances, setTargets) => {
        await instancesRepo.createWorkoutInstance(instance);
        await instancesRepo.createExerciseInstances(exerciseInstances);

        const now = Date.now();
        set({
          instance,
          exerciseInstances,
          setTargets,
          progressionResults: [],
          completedSets: [],
          currentExerciseIndex: 0,
          currentSetIndex: 0,
          workoutStartTime: now,
          lastSetCompletedAt: null,
          restTimerTarget: null,
          exerciseStartTime: now,
        });
      },

      setProgressionResults: (results) => {
        set({ progressionResults: results });
      },

      completeSet: async (input) => {
        const state = get();
        if (!state.instance) return;

        const exerciseInstance = state.exerciseInstances[state.currentExerciseIndex];
        if (!exerciseInstance) return;

        const exerciseSets = state.completedSets.filter(
          s => s.workoutExerciseInstanceId === exerciseInstance.id,
        );
        const targets = state.setTargets[state.currentExerciseIndex];
        const currentTarget = targets?.[exerciseSets.length];

        const now = Date.now();
        const actualRestSeconds = state.lastSetCompletedAt
          ? Math.round((now - state.lastSetCompletedAt) / 1000)
          : null;

        const completedSet: CompletedSet = {
          id: crypto.randomUUID(),
          workoutExerciseInstanceId: exerciseInstance.id,
          orderIndex: exerciseSets.length,
          setType: input.setType,
          targetWeight: currentTarget?.targetWeight ?? null,
          targetRepMin: currentTarget?.targetRepMin ?? null,
          targetRepMax: currentTarget?.targetRepMax ?? null,
          targetRir: currentTarget?.targetRir ?? null,
          actualWeight: input.weight,
          actualReps: input.reps,
          actualRir: input.rir,
          actualRestSeconds,
          isAdditional: exerciseSets.length >= (targets?.length ?? 0),
          completedAt: new Date().toISOString(),
          notes: '',
        };

        await instancesRepo.addCompletedSet(completedSet);

        const newSets = [...state.completedSets, completedSet];
        const nextSetIndex = exerciseSets.length + 1;

        // For supersets: only show rest timer after last exercise in group
        const supersetGroup = exerciseInstance.supersetGroup;
        let shouldShowRest = true;
        if (supersetGroup) {
          const groupMembers = state.exerciseInstances.filter(ei => ei.supersetGroup === supersetGroup);
          const currentGroupIdx = groupMembers.findIndex(ei => ei.id === exerciseInstance.id);
          if (currentGroupIdx < groupMembers.length - 1) {
            shouldShowRest = false;
          }
        }

        set({
          completedSets: newSets,
          currentSetIndex: nextSetIndex,
          lastSetCompletedAt: now,
          restTimerTarget: shouldShowRest ? exerciseInstance.restSecondsTarget : null,
        });
      },

      nextExercise: () => {
        const state = get();
        if (state.currentExerciseIndex < state.exerciseInstances.length - 1) {
          const nextIdx = state.currentExerciseIndex + 1;
          const exerciseInstance = state.exerciseInstances[nextIdx];
          const setsForNext = state.completedSets.filter(
            s => s.workoutExerciseInstanceId === exerciseInstance?.id,
          );
          set({ currentExerciseIndex: nextIdx, currentSetIndex: setsForNext.length, exerciseStartTime: Date.now() });
        }
      },

      prevExercise: () => {
        const state = get();
        if (state.currentExerciseIndex > 0) {
          const prevIdx = state.currentExerciseIndex - 1;
          const exerciseInstance = state.exerciseInstances[prevIdx];
          const setsForPrev = state.completedSets.filter(
            s => s.workoutExerciseInstanceId === exerciseInstance?.id,
          );
          set({ currentExerciseIndex: prevIdx, currentSetIndex: setsForPrev.length, exerciseStartTime: Date.now() });
        }
      },

      goToExercise: (index) => {
        const state = get();
        const exerciseInstance = state.exerciseInstances[index];
        if (exerciseInstance) {
          const setsForEx = state.completedSets.filter(
            s => s.workoutExerciseInstanceId === exerciseInstance.id,
          );
          set({ currentExerciseIndex: index, currentSetIndex: setsForEx.length, exerciseStartTime: Date.now() });
        }
      },

      addSet: () => {
        // Adding a set just means we allow logging beyond the target count
        // The actual set is created when completeSet is called
      },

      finishWorkout: async () => {
        const state = get();
        if (!state.instance) return;

        const now = new Date().toISOString();
        const durationSeconds = state.workoutStartTime
          ? Math.round((Date.now() - state.workoutStartTime) / 1000)
          : null;

        await instancesRepo.updateWorkoutInstance(state.instance.id, {
          status: 'completed',
          completedAt: now,
          durationSeconds,
        });

        // Persist progression-adjusted targets back to the template
        for (let i = 0; i < state.exerciseInstances.length; i++) {
          const ei = state.exerciseInstances[i]!;
          const targets = state.setTargets[i];
          if (ei.templateExerciseId && targets && targets.length > 0) {
            const updated = targets.map(t => ({
              ...t,
              templateExerciseId: ei.templateExerciseId!,
            }));
            await workoutsRepo.replaceSetTargets(ei.templateExerciseId, updated);
          }
        }

        // PR detection
        const existingRecords = await prRepo.getAllRecords();
        const detectedPRs = detectPersonalRecords(
          state.completedSets,
          state.exerciseInstances,
          existingRecords,
          state.instance.id,
        );
        if (detectedPRs.length > 0) {
          await prRepo.saveRecords(detectedPRs);
        }

        set({ ...initialState, newPRs: detectedPRs });
      },

      dismissPRs: () => {
        set({ newPRs: [] });
      },

      abandonWorkout: async () => {
        const state = get();
        if (!state.instance) return;

        await instancesRepo.updateWorkoutInstance(state.instance.id, {
          status: 'abandoned',
          completedAt: new Date().toISOString(),
        });

        set(initialState);
      },

      restoreWorkout: async () => {
        const state = get();
        if (!state.instance) return false;

        const existing = await instancesRepo.getWorkoutInstance(state.instance.id);
        if (!existing || existing.status !== 'in_progress') {
          set(initialState);
          return false;
        }
        return true;
      },

      dismissRestTimer: () => {
        set({ restTimerTarget: null });
      },

      substituteExercise: async (exerciseIndex, newExerciseId) => {
        const state = get();
        const original = state.exerciseInstances[exerciseIndex];
        if (!original) return;

        const updated = state.exerciseInstances.map((ei, idx) => {
          if (idx !== exerciseIndex) return ei;
          return {
            ...ei,
            originalExerciseId: ei.originalExerciseId ?? ei.exerciseId,
            exerciseId: newExerciseId,
          };
        });

        // Persist the substitution
        const updatedEi = updated[exerciseIndex]!;
        await instancesRepo.updateExerciseInstance(updatedEi.id, {
          exerciseId: newExerciseId,
          originalExerciseId: updatedEi.originalExerciseId,
        });

        set({ exerciseInstances: updated });
      },

      reset: () => set(initialState),
    }),
    {
      name: 'jammacus-workout-in-progress',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        instance: state.instance,
        exerciseInstances: state.exerciseInstances,
        completedSets: state.completedSets,
        setTargets: state.setTargets,
        progressionResults: state.progressionResults,
        currentExerciseIndex: state.currentExerciseIndex,
        currentSetIndex: state.currentSetIndex,
        workoutStartTime: state.workoutStartTime,
        lastSetCompletedAt: state.lastSetCompletedAt,
        restTimerTarget: state.restTimerTarget,
        exerciseStartTime: state.exerciseStartTime,
        newPRs: state.newPRs,
      }),
    },
  ),
);
