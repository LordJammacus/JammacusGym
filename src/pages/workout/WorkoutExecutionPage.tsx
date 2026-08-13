import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Modal } from '@/components/ui';
import { RestTimer } from '@/components/workout/RestTimer';
import type { SetTarget, WorkoutInstance, WorkoutExerciseInstance, CompletedSet, ProgressionRule, Note } from '@/types/entities';
import type { PersonalRecord } from '@/types/analytics';
import type { ProgressionResult } from '@/engines/progression/types';
import type { WeightUnit } from '@/types/enums';
import * as workoutsRepo from '@/db/repositories/workouts';
import * as exercisesRepo from '@/db/repositories/exercises';
import * as instancesRepo from '@/db/repositories/instances';
import * as progressionRulesRepo from '@/db/repositories/progressionRules';
import * as notesRepo from '@/db/repositories/notes';
import { getSettings } from '@/db/database';
import { getProgramContextForTemplate } from '@/db/repositories/programs';
import { calculateProgression } from '@/engines/progression';
import { useWorkoutStore } from '@/stores/workoutStore';
import { generateId } from '@/utils/ids';
import { haptic } from '@/utils/haptics';
import { formatVolume, formatWeight, roundToIncrement } from '@/utils/units';

export function StartWorkoutPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const startWorkout = useWorkoutStore(s => s.startWorkout);
  const setProgressionResults = useWorkoutStore(s => s.setProgressionResults);
  const [preNotes, setPreNotes] = useState<Note[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!templateId) return;

    const init = async () => {
      const template = await workoutsRepo.getTemplate(templateId);
      if (!template) { navigate('/workout'); return; }

      // Gather pre-workout notes (template notes + reminder notes)
      const templateNotes = await notesRepo.getNotesForTarget(templateId, 'workout_template');
      const reminderNotes = await notesRepo.getReminderNotes(templateId);
      const allPreNotes = [...templateNotes, ...reminderNotes.filter(n => !templateNotes.find(tn => tn.id === n.id))];

      const settings = await getSettings();
      const templateExercises = await workoutsRepo.getTemplateExercises(templateId);
      const allSetTargets: SetTarget[][] = [];
      const exerciseInstances: WorkoutExerciseInstance[] = [];
      const results: (ProgressionResult | null)[] = [];

      for (const te of templateExercises) {
        const targets = await workoutsRepo.getSetTargets(te.id);
        let progressionResult: ProgressionResult | null = null;

        let rule: ProgressionRule | undefined;
        if (te.progressionRuleId) {
          rule = await progressionRulesRepo.getRule(te.progressionRuleId);
        }

        const effectiveRule: ProgressionRule = rule ?? {
          id: '',
          name: 'Default',
          strategy: settings.defaultProgressionStrategy,
          weightIncrement: settings.weightIncrement,
          repThreshold: null,
          requiredConsecutiveSuccess: 1,
          deloadPercentage: 10,
          deloadAfterFailures: 3,
          notes: '',
          createdAt: '',
        };

        if (effectiveRule.strategy !== 'manual') {
          const history = await instancesRepo.getExerciseHistory(te.exerciseId, te.id, 5);

          if (history.length > 0) {
            progressionResult = calculateProgression({
              history,
              currentTargets: targets,
              rule: effectiveRule,
              settings,
            });
          }
        }

        allSetTargets.push(progressionResult?.nextTargets ?? targets);
        results.push(progressionResult);

        // Collect exercise-level reminder notes
        const exNotes = await notesRepo.getReminderNotes(te.exerciseId);
        for (const n of exNotes) {
          if (!allPreNotes.find(existing => existing.id === n.id)) {
            allPreNotes.push(n);
          }
        }

        exerciseInstances.push({
          id: generateId(),
          workoutInstanceId: '',
          exerciseId: te.exerciseId,
          templateExerciseId: te.id,
          originalExerciseId: null,
          orderIndex: te.orderIndex,
          supersetGroup: te.supersetGroup,
          restSecondsTarget: te.restSeconds,
          notes: '',
        });
      }

      const instanceId = generateId();
      const programContext = await getProgramContextForTemplate(template.id);
      const instance: WorkoutInstance = {
        id: instanceId,
        workoutTemplateId: template.id,
        programId: programContext.programId,
        trainingBlockId: programContext.trainingBlockId,
        templateName: template.name,
        goal: template.goal,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        completedAt: null,
        durationSeconds: null,
        notes: '',
        createdAt: new Date().toISOString(),
      };

      const linked = exerciseInstances.map(ei => ({ ...ei, workoutInstanceId: instanceId }));

      await startWorkout(instance, linked, allSetTargets);
      setProgressionResults(results);

      if (allPreNotes.length > 0) {
        setPreNotes(allPreNotes);
        setShowNotes(true);
      } else {
        navigate('/workout/active', { replace: true });
      }

      setReady(true);
    };

    init();
  }, [templateId, navigate, startWorkout, setProgressionResults]);

  if (showNotes) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">Before you start</h1>
        <div className="space-y-3">
          {preNotes.map(n => (
            <Card key={n.id}>
              <p className="text-sm text-zinc-300">{n.content}</p>
              <p className="text-xs text-zinc-500 mt-1 capitalize">{n.type.replace('_', ' ')}</p>
            </Card>
          ))}
        </div>
        <Button className="w-full" onClick={() => navigate('/workout/active', { replace: true })}>
          Let's Go
        </Button>
      </div>
    );
  }

  if (!ready) {
    return <div className="p-4 text-zinc-400">Starting workout...</div>;
  }

  return null;
}

export function ActiveWorkoutPage() {
  const navigate = useNavigate();
  const {
    instance,
    exerciseInstances,
    completedSets,
    setTargets,
    progressionResults,
    currentExerciseIndex,
    completeSet,
    nextExercise,
    prevExercise,
    goToExercise,
    finishWorkout,
    abandonWorkout,
    workoutStartTime,
    lastSetCompletedAt,
    restTimerTarget,
    exerciseStartTime,
    dismissRestTimer,
    adjustRestTimer,
    substituteExercise,
    newPRs,
    dismissPRs,
  } = useWorkoutStore();

  const [exerciseNames, setExerciseNames] = useState<Map<string, string>>(new Map());
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [setType, setSetType] = useState<CompletedSet['setType']>('working');
  const [showFinish, setShowFinish] = useState(false);
  const [showAbandon, setShowAbandon] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [exerciseElapsed, setExerciseElapsed] = useState(0);
  const [previousSets, setPreviousSets] = useState<Map<string, CompletedSet[]>>(new Map());
  const [exerciseNotes, setExerciseNotes] = useState<Map<string, Note[]>>(new Map());
  const [postNote, setPostNote] = useState('');
  const [showSubstitute, setShowSubstitute] = useState(false);
  const [setFlash, setSetFlash] = useState(false);
  const [units, setUnits] = useState<WeightUnit>('kg');
  const [weightIncrement, setWeightIncrement] = useState(2.5);
  const [restTimerAdjustSeconds, setRestTimerAdjustSeconds] = useState(15);
  const [summary, setSummary] = useState<{
    setCount: number;
    volume: number;
    exerciseCount: number;
    duration: number;
  } | null>(null);

  useEffect(() => {
    getSettings().then(s => {
      setUnits(s.units);
      setWeightIncrement(s.weightIncrement);
      setRestTimerAdjustSeconds(s.restTimerAdjustSeconds);
    });
  }, []);

  useEffect(() => {
    if (!instance && !showSummary) { navigate('/workout', { replace: true }); return; }
    if (!instance) return;
    const loadNames = async () => {
      const names = new Map<string, string>();
      for (const ei of exerciseInstances) {
        if (!names.has(ei.exerciseId)) {
          const ex = await exercisesRepo.getExercise(ei.exerciseId);
          if (ex) names.set(ei.exerciseId, ex.name);
        }
      }
      setExerciseNames(names);
    };
    loadNames();
  }, [instance, exerciseInstances, navigate, showSummary]);

  // Load previous workout data
  useEffect(() => {
    if (!instance?.workoutTemplateId) return;
    const loadPrevious = async () => {
      const prev = await instancesRepo.getLastInstanceForTemplate(instance.workoutTemplateId!, instance.id);
      if (!prev) return;

      const prevEis = await instancesRepo.getExerciseInstances(prev.id);
      const map = new Map<string, CompletedSet[]>();

      for (const pei of prevEis) {
        const sets = await instancesRepo.getCompletedSets(pei.id);
        if (sets.length > 0) map.set(pei.exerciseId, sets);
      }

      setPreviousSets(map);
    };
    loadPrevious();
  }, [instance?.workoutTemplateId, instance?.id]);

  // Load exercise notes
  useEffect(() => {
    if (exerciseInstances.length === 0) return;
    const loadNotes = async () => {
      const map = new Map<string, Note[]>();
      for (const ei of exerciseInstances) {
        const notes = await notesRepo.getNotesForTarget(ei.exerciseId, 'exercise');
        if (notes.length > 0) map.set(ei.exerciseId, notes);
      }
      setExerciseNotes(map);
    };
    loadNotes();
  }, [exerciseInstances]);

  // Workout elapsed timer
  useEffect(() => {
    if (!workoutStartTime) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - workoutStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [workoutStartTime]);

  // Exercise elapsed timer
  useEffect(() => {
    if (!exerciseStartTime) return;
    const timer = setInterval(() => {
      setExerciseElapsed(Math.floor((Date.now() - exerciseStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [exerciseStartTime]);

  const currentExercise = exerciseInstances[currentExerciseIndex];
  const currentTargets = setTargets[currentExerciseIndex] ?? [];
  const currentSets = completedSets.filter(
    s => s.workoutExerciseInstanceId === currentExercise?.id,
  );
  const currentSetIdx = currentSets.length;
  const currentTarget = currentTargets[currentSetIdx];

  // Set defaults from targets when switching exercises
  useEffect(() => {
    if (currentTarget) {
      setWeight(currentTarget.targetWeight ?? (currentSets[currentSets.length - 1]?.actualWeight ?? 0));
      setReps(currentTarget.targetRepMax ?? 10);
    } else if (currentSets.length > 0) {
      const lastSet = currentSets[currentSets.length - 1]!;
      setWeight(lastSet.actualWeight);
      setReps(lastSet.actualReps);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex, currentSetIdx]);

  const handleCompleteSet = useCallback(async () => {
    haptic('success');
    setSetFlash(true);
    setTimeout(() => setSetFlash(false), 400);
    await completeSet({ weight, reps, rir: null, setType });
    setSetType('working');
  }, [weight, reps, setType, completeSet]);

  const handleAbandon = useCallback(async () => {
    setShowAbandon(false);
    await abandonWorkout();
    navigate('/workout', { replace: true });
  }, [abandonWorkout, navigate]);

  if ((!instance || !currentExercise) && !showSummary) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleFinish = async () => {
    if (!instance) return;
    setShowFinish(false);
    haptic('heavy');
    const snapshot = {
      setCount: completedSets.length,
      volume: completedSets.reduce((acc, s) => acc + s.actualWeight * s.actualReps, 0),
      exerciseCount: exerciseInstances.length,
      duration: elapsed,
    };
    const instanceId = instance.id;
    await finishWorkout();
    if (postNote.trim()) {
      await notesRepo.createNote({
        id: generateId(),
        type: 'workout_instance',
        targetId: instanceId,
        content: postNote.trim(),
        showNextTime: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archivedAt: null,
      });
    }
    setSummary(snapshot);
    setShowSummary(true);
  };

  if (showSummary && summary) {
    return (
      <Modal
        open
        onClose={() => { setShowSummary(false); dismissPRs(); navigate('/history', { replace: true }); }}
        title="Workout Complete!"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold">{formatTime(summary.duration)}</p>
              <p className="text-xs text-zinc-400">Duration</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{summary.setCount}</p>
              <p className="text-xs text-zinc-400">Sets</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatVolume(summary.volume, units)}</p>
              <p className="text-xs text-zinc-400">Volume</p>
            </div>
          </div>
          <div className="text-sm text-zinc-400 text-center">
            {summary.exerciseCount} exercise{summary.exerciseCount !== 1 ? 's' : ''}
          </div>
          {newPRs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-400 text-center">Personal Records!</h3>
              <div className="space-y-1">
                {deduplicatePRsForDisplay(newPRs).map(pr => (
                  <div key={pr.id} className="flex items-center gap-2 bg-amber-900/20 border border-amber-800/40 rounded-lg px-3 py-2">
                    <span className="text-amber-400 text-sm">PR</span>
                    <span className="text-sm text-zinc-200 flex-1">
                      {exerciseNames.get(pr.exerciseId) ?? 'Exercise'} — {formatPRType(pr.type)}: {formatPRValue(pr, units)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button className="w-full" onClick={() => { setShowSummary(false); dismissPRs(); navigate('/history', { replace: true }); }}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  if (!instance || !currentExercise) return null;

  const allSetsComplete = exerciseInstances.every((ei, idx) => {
    const targets = setTargets[idx] ?? [];
    const done = completedSets.filter(s => s.workoutExerciseInstanceId === ei.id);
    return done.length >= targets.length;
  });

  const prevExerciseSets = previousSets.get(currentExercise.exerciseId);
  const currentProgression = progressionResults?.[currentExerciseIndex] ?? null;
  const currentExerciseNotes = exerciseNotes.get(currentExercise.exerciseId) ?? [];

  const progressionBadgeColor: Record<string, string> = {
    increase: 'bg-green-900/40 text-green-400 border-green-800/50',
    deload: 'bg-amber-900/40 text-amber-400 border-amber-800/50',
    maintain: 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50',
    manual: 'bg-zinc-800/40 text-zinc-500 border-zinc-700/50',
  };

  const warmupSuggestion = currentTarget?.targetWeight
    ? roundToIncrement(currentTarget.targetWeight * 0.5, weightIncrement)
    : null;

  return (
    <div className="flex flex-col h-full relative">
      {/* Set completion flash overlay */}
      {setFlash && (
        <div className="absolute inset-0 z-40 pointer-events-none bg-green-500/10 animate-pulse" />
      )}
      {/* Header */}
      <div className="bg-surface-raised border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">{instance.templateName}</h1>
            <div className="flex gap-3 text-sm text-zinc-400">
              <span>{formatTime(elapsed)}</span>
              <span className="text-zinc-600">|</span>
              <span>Ex: {formatTime(exerciseElapsed)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowAbandon(true)}>Abandon</Button>
            <Button size="sm" onClick={() => setShowFinish(true)} disabled={completedSets.length === 0}>
              Finish
            </Button>
          </div>
        </div>
      </div>

      {/* Exercise navigation pills */}
      <div className="flex gap-1 p-3 overflow-x-auto bg-surface border-b border-white/10">
        {exerciseInstances.map((ei, idx) => {
          const targets = setTargets[idx] ?? [];
          const done = completedSets.filter(s => s.workoutExerciseInstanceId === ei.id);
          const isComplete = done.length >= targets.length && targets.length > 0;
          const prevEi = exerciseInstances[idx - 1];
          const isGroupStart = ei.supersetGroup && (!prevEi || prevEi.supersetGroup !== ei.supersetGroup);
          const nextEi = exerciseInstances[idx + 1];
          const isGroupEnd = ei.supersetGroup && (!nextEi || nextEi.supersetGroup !== ei.supersetGroup);
          return (
            <div key={ei.id} className="flex items-center">
              {isGroupStart && ei.supersetGroup && (
                <span className="text-[10px] text-purple-400 font-bold mr-1">{ei.supersetGroup}</span>
              )}
              <button
                onClick={() => goToExercise(idx)}
                className={`px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                  ei.supersetGroup
                    ? `${isGroupStart ? 'rounded-l-full' : ''} ${isGroupEnd ? 'rounded-r-full' : ''} ${!isGroupStart && !isGroupEnd ? '' : ''}`
                    : 'rounded-full'
                } ${!ei.supersetGroup ? '' : 'border border-purple-800/40'} ${
                  idx === currentExerciseIndex
                    ? 'bg-brand text-white'
                    : isComplete
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-surface-overlay text-zinc-400'
                }`}
              >
                {(exerciseNames.get(ei.exerciseId) ?? '...').split(' ').slice(0, 2).join(' ')}
              </button>
            </div>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto no-bounce p-4 space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold">{exerciseNames.get(currentExercise.exerciseId) ?? '...'}</h2>
          {currentExercise.supersetGroup && (
            <span className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-800/50 mt-1">
              Superset {currentExercise.supersetGroup}
            </span>
          )}
          {currentExercise.originalExerciseId && (
            <p className="text-xs text-amber-400 mt-1">Substituted</p>
          )}
          <p className="text-sm text-zinc-400 mt-1">
            Set {currentSetIdx + 1} of {Math.max(currentTargets.length, currentSetIdx + 1)}
            {currentTarget && ` · ${currentTarget.targetRepMin}-${currentTarget.targetRepMax} reps`}
          </p>
          <button
            onClick={() => setShowSubstitute(true)}
            className="text-xs text-zinc-500 mt-1 underline"
          >
            Substitute exercise
          </button>
        </div>

        {/* Progression reasoning */}
        {currentProgression && currentProgression.action !== 'manual' && (
          <div className={`rounded-lg border px-3 py-2 text-xs ${progressionBadgeColor[currentProgression.action] ?? ''}`}>
            <span className="font-semibold capitalize">{currentProgression.action}</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span>{currentProgression.reasoning}</span>
          </div>
        )}

        {/* Exercise notes */}
        {currentExerciseNotes.length > 0 && (
          <div className="space-y-1">
            {currentExerciseNotes.map(n => (
              <div key={n.id} className="rounded-lg border border-blue-800/40 bg-blue-900/20 px-3 py-2 text-xs text-blue-300">
                {n.content}
              </div>
            ))}
          </div>
        )}

        {/* Rest timer */}
        {restTimerTarget && lastSetCompletedAt && (
          <RestTimer
            targetSeconds={restTimerTarget}
            startedAt={lastSetCompletedAt}
            adjustSeconds={restTimerAdjustSeconds}
            onAdjust={adjustRestTimer}
            onDismiss={dismissRestTimer}
          />
        )}

        {/* Weight control */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm">Weight ({units})</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWeight(Math.max(0, roundToIncrement(weight - weightIncrement, weightIncrement)))}
                aria-label="Decrease weight"
                className="w-11 h-11 rounded-full bg-surface-overlay flex items-center justify-center text-xl font-bold active:bg-surface"
              >−</button>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={weight}
                onChange={e => setWeight(+e.target.value)}
                aria-label="Weight"
                className="w-20 text-center text-2xl font-bold bg-transparent text-white"
              />
              <button
                onClick={() => setWeight(roundToIncrement(weight + weightIncrement, weightIncrement))}
                aria-label="Increase weight"
                className="w-11 h-11 rounded-full bg-surface-overlay flex items-center justify-center text-xl font-bold active:bg-surface"
              >+</button>
            </div>
          </div>
        </Card>

        {/* Reps control */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm">Reps</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setReps(Math.max(0, reps - 1))}
                aria-label="Decrease reps"
                className="w-11 h-11 rounded-full bg-surface-overlay flex items-center justify-center text-xl font-bold active:bg-surface"
              >−</button>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={reps}
                onChange={e => setReps(+e.target.value)}
                aria-label="Reps"
                className="w-20 text-center text-2xl font-bold bg-transparent text-white"
              />
              <button
                onClick={() => setReps(reps + 1)}
                aria-label="Increase reps"
                className="w-11 h-11 rounded-full bg-surface-overlay flex items-center justify-center text-xl font-bold active:bg-surface"
              >+</button>
            </div>
          </div>
        </Card>

        {/* Set type selector */}
        <div className="flex gap-2 justify-center">
          {(['working', 'warmup', 'drop', 'failure'] as const).map(t => (
            <button
              key={t}
              onClick={() => setSetType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                setType === t
                  ? t === 'warmup' ? 'bg-amber-900/50 text-amber-300 border border-amber-700/60'
                  : t === 'drop' ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-700/60'
                  : t === 'failure' ? 'bg-red-900/50 text-red-300 border border-red-700/60'
                  : 'bg-brand/20 text-brand-light border border-brand/40'
                  : 'bg-surface-overlay text-zinc-500 border border-transparent'
              }`}
            >
              {t === 'warmup' ? 'Warm-up' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Auto warm-up suggestion */}
        {currentSetIdx === 0 && currentTarget?.targetWeight && warmupSuggestion != null && currentTarget.targetWeight >= weightIncrement * 8 && (
          <button
            onClick={() => {
              setSetType('warmup');
              setWeight(warmupSuggestion);
              setReps(Math.min(10, currentTarget.targetRepMax));
            }}
            className="w-full text-center text-xs text-amber-400 py-2 rounded-lg border border-amber-800/30 bg-amber-900/10"
          >
            Suggest warm-up: {formatWeight(warmupSuggestion, units)} × {Math.min(10, currentTarget.targetRepMax)} reps
          </button>
        )}

        {/* Complete set button */}
        <Button
          className={`w-full text-lg py-4 transition-all duration-150 ${setFlash ? 'scale-95 brightness-125' : ''}`}
          onClick={handleCompleteSet}
        >
          Complete {setType !== 'working' ? `${setType === 'warmup' ? 'Warm-up' : setType.charAt(0).toUpperCase() + setType.slice(1)} ` : ''}Set
        </Button>

        {/* Completed sets for current exercise */}
        {currentSets.length > 0 && (
          <Card>
            <h3 className="text-sm text-zinc-400 mb-2">Completed</h3>
            <div className="space-y-1">
              {currentSets.map((s, i) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span className="text-zinc-400">
                    Set {i + 1}
                    {s.setType !== 'working' && (
                      <span className={`ml-1.5 text-xs ${
                        s.setType === 'warmup' ? 'text-amber-400' :
                        s.setType === 'drop' ? 'text-cyan-400' :
                        s.setType === 'failure' ? 'text-red-400' : 'text-zinc-500'
                      }`}>({s.setType})</span>
                    )}
                  </span>
                  <span>{formatWeight(s.actualWeight, units)} × {s.actualReps}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Previous workout for this exercise */}
        {prevExerciseSets && prevExerciseSets.length > 0 && (
          <Card>
            <h3 className="text-sm text-zinc-500 mb-2">Previous session</h3>
            <div className="space-y-1">
              {prevExerciseSets.map((s, i) => (
                <div key={s.id} className="flex justify-between text-sm text-zinc-500">
                  <span>Set {i + 1}</span>
                  <span>{formatWeight(s.actualWeight, units)} × {s.actualReps}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Exercise prev/next */}
      <div className="flex gap-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-surface-raised border-t border-white/10">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={prevExercise}
          disabled={currentExerciseIndex === 0}
        >
          ← Prev
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={nextExercise}
          disabled={currentExerciseIndex === exerciseInstances.length - 1}
        >
          Next →
        </Button>
      </div>

      {/* Finish modal */}
      <Modal open={showFinish} onClose={() => setShowFinish(false)} title="Finish Workout?">
        <div className="space-y-4">
          <p className="text-zinc-300">
            {allSetsComplete
              ? 'All planned sets complete. Great work!'
              : 'Some sets are incomplete. Finish anyway?'}
          </p>
          <div className="text-sm text-zinc-400">
            <p>{completedSets.length} sets logged · {formatTime(elapsed)}</p>
          </div>
          <textarea
            placeholder="Post-workout note (optional)..."
            value={postNote}
            onChange={e => setPostNote(e.target.value)}
            className="w-full bg-surface-overlay rounded-lg p-3 text-sm text-white placeholder-zinc-500 resize-none h-20"
          />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowFinish(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleFinish}>Finish</Button>
          </div>
        </div>
      </Modal>

      {/* Abandon modal */}
      <Modal open={showAbandon} onClose={() => setShowAbandon(false)} title="Abandon Workout?">
        <div className="space-y-4">
          <p className="text-zinc-300">
            Logged sets stay in History for your records, but abandoned workouts are ignored for analytics, progression, and recommendations.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAbandon(false)}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={handleAbandon}>Abandon</Button>
          </div>
        </div>
      </Modal>

      {/* Substitute exercise modal */}
      <SubstituteModal
        open={showSubstitute}
        onClose={() => setShowSubstitute(false)}
        onSubstitute={async (newExerciseId) => {
          await substituteExercise(currentExerciseIndex, newExerciseId);
          const ex = await exercisesRepo.getExercise(newExerciseId);
          if (ex) {
            setExerciseNames(prev => new Map(prev).set(newExerciseId, ex.name));
          }
          setShowSubstitute(false);
        }}
      />
    </div>
  );
}

function formatPRType(type: PersonalRecord['type']): string {
  switch (type) {
    case 'weight': return 'Weight';
    case 'reps': return 'Reps';
    case 'volume': return 'Volume';
    case 'estimated_1rm': return 'Est. 1RM';
    case 'reps_at_weight': return 'Reps@Weight';
  }
}

function formatPRValue(pr: PersonalRecord, units: WeightUnit): string {
  switch (pr.type) {
    case 'weight': return formatWeight(pr.value, units);
    case 'reps': return `${pr.value} reps`;
    case 'volume': return formatVolume(pr.value, units);
    case 'estimated_1rm': return formatWeight(pr.value, units);
    case 'reps_at_weight': return `${pr.reps} @ ${formatWeight(pr.weight ?? 0, units)}`;
  }
}

function deduplicatePRsForDisplay(prs: PersonalRecord[]): PersonalRecord[] {
  const seen = new Map<string, PersonalRecord>();
  for (const pr of prs) {
    if (pr.type === 'reps_at_weight') continue;
    const key = `${pr.exerciseId}_${pr.type}`;
    const existing = seen.get(key);
    if (!existing || pr.value > existing.value) {
      seen.set(key, pr);
    }
  }
  return Array.from(seen.values());
}

function SubstituteModal({
  open,
  onClose,
  onSubstitute,
}: {
  open: boolean;
  onClose: () => void;
  onSubstitute: (exerciseId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Array<{ id: string; name: string; equipment: string; category: string }>>([]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const r = search
        ? await exercisesRepo.searchExercises(search)
        : await exercisesRepo.getActiveExercises();
      setResults(r.slice(0, 30));
    };
    load();
  }, [search, open]);

  return (
    <Modal open={open} onClose={onClose} title="Substitute Exercise">
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Search exercises..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-surface-overlay rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500"
        />
        <div className="max-h-64 overflow-y-auto space-y-1">
          {results.map(ex => (
            <button
              key={ex.id}
              className="w-full text-left p-3 rounded-lg active:bg-surface-overlay transition-colors"
              onClick={() => onSubstitute(ex.id)}
            >
              <div className="font-medium text-sm">{ex.name}</div>
              <div className="text-xs text-zinc-400 capitalize">{ex.equipment} · {ex.category}</div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
