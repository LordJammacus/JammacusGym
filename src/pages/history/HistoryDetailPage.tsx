import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '@/components/ui';
import * as instancesRepo from '@/db/repositories/instances';
import * as exercisesRepo from '@/db/repositories/exercises';
import { getSettings } from '@/db/database';
import { generateId } from '@/utils/ids';
import { formatVolume, formatWeight } from '@/utils/units';
import { countRemainingPlannedSets, getResumeCta, historyStatusLabel } from '@/utils/workoutResume';
import { ResumeConflictModal, useResumeWorkout } from '@/hooks/useResumeWorkout';
import type { WorkoutInstance, WorkoutExerciseInstance, CompletedSet, SetTarget } from '@/types/entities';
import type { WeightUnit } from '@/types/enums';

interface ExerciseBreakdown {
  exerciseInstance: WorkoutExerciseInstance;
  name: string;
  sets: CompletedSet[];
}

interface SetDraft {
  id: string;
  actualWeight: string;
  actualReps: string;
}

export function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [instance, setInstance] = useState<WorkoutInstance | null>(null);
  const [exercises, setExercises] = useState<ExerciseBreakdown[]>([]);
  const [units, setUnits] = useState<WeightUnit>('kg');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, SetDraft[]>>({});
  const [saving, setSaving] = useState(false);
  const [setTargets, setSetTargets] = useState<SetTarget[][]>([]);
  const { resume, busyId, conflict, dismissConflict } = useResumeWorkout();

  const load = useCallback(async () => {
    if (!id) return;
    const inst = await instancesRepo.getWorkoutInstance(id);
    if (!inst) { navigate('/history', { replace: true }); return; }
    setInstance(inst);

    const settings = await getSettings();
    setUnits(settings.units);

    const eis = await instancesRepo.getExerciseInstances(id);
    const breakdowns: ExerciseBreakdown[] = [];

    for (const ei of eis) {
      const ex = await exercisesRepo.getExercise(ei.exerciseId);
      const sets = await instancesRepo.getCompletedSets(ei.id);
      breakdowns.push({ exerciseInstance: ei, name: ex?.name ?? 'Unknown', sets });
    }

    setExercises(breakdowns);
    setSetTargets(await instancesRepo.resolveSessionSetTargets(inst, eis));
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const startEditing = () => {
    const next: Record<string, SetDraft[]> = {};
    for (const ex of exercises) {
      next[ex.exerciseInstance.id] = ex.sets.map(s => ({
        id: s.id,
        actualWeight: String(s.actualWeight),
        actualReps: String(s.actualReps),
      }));
    }
    setDrafts(next);
    setEditing(true);
  };

  const updateDraft = (exerciseInstanceId: string, setId: string, field: keyof Omit<SetDraft, 'id'>, value: string) => {
    setDrafts(prev => ({
      ...prev,
      [exerciseInstanceId]: (prev[exerciseInstanceId] ?? []).map(s =>
        s.id === setId ? { ...s, [field]: value } : s,
      ),
    }));
  };

  const addDraftSet = (exerciseInstanceId: string) => {
    const existing = drafts[exerciseInstanceId] ?? [];
    const last = existing[existing.length - 1];
    setDrafts(prev => ({
      ...prev,
      [exerciseInstanceId]: [
        ...existing,
        {
          id: generateId(),
          actualWeight: last?.actualWeight ?? '0',
          actualReps: last?.actualReps ?? '0',
        },
      ],
    }));
  };

  const removeDraftSet = (exerciseInstanceId: string, setId: string) => {
    setDrafts(prev => ({
      ...prev,
      [exerciseInstanceId]: (prev[exerciseInstanceId] ?? []).filter(s => s.id !== setId),
    }));
  };

  const saveEdits = async () => {
    setSaving(true);
    try {
      for (const ex of exercises) {
        const eiId = ex.exerciseInstance.id;
        const draftSets = drafts[eiId] ?? [];
        const originalIds = new Set(ex.sets.map(s => s.id));
        const draftIds = new Set(draftSets.map(s => s.id));

        for (const original of ex.sets) {
          if (!draftIds.has(original.id)) {
            await instancesRepo.deleteCompletedSet(original.id);
          }
        }

        for (let i = 0; i < draftSets.length; i++) {
          const draft = draftSets[i]!;
          const weight = Number(draft.actualWeight);
          const reps = Number(draft.actualReps);
          if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps < 0) {
            continue;
          }

          if (originalIds.has(draft.id)) {
            await instancesRepo.updateCompletedSet(draft.id, {
              actualWeight: weight,
              actualReps: Math.round(reps),
              orderIndex: i,
            });
          } else {
            const template = ex.sets[ex.sets.length - 1];
            await instancesRepo.addCompletedSet({
              id: draft.id,
              workoutExerciseInstanceId: eiId,
              orderIndex: i,
              setType: template?.setType ?? 'working',
              targetWeight: template?.targetWeight ?? null,
              targetRepMin: template?.targetRepMin ?? null,
              targetRepMax: template?.targetRepMax ?? null,
              targetRir: template?.targetRir ?? null,
              actualWeight: weight,
              actualReps: Math.round(reps),
              actualRir: null,
              actualRestSeconds: null,
              isAdditional: true,
              completedAt: new Date().toISOString(),
              notes: '',
            });
          }
        }

        await instancesRepo.reindexCompletedSets(eiId);
      }

      setEditing(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading || !instance) return <div className="p-4 text-zinc-400">Loading...</div>;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  };

  const totalVolume = exercises.reduce((acc, ex) =>
    acc + ex.sets.reduce((s, set) => s + set.actualWeight * set.actualReps, 0), 0,
  );

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const remainingSets = countRemainingPlannedSets(
    exercises.map(ex => ex.exerciseInstance),
    exercises.flatMap(ex => ex.sets),
    setTargets,
  );
  const status = historyStatusLabel(instance.status, remainingSets);
  const cta = getResumeCta(instance.status, remainingSets);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>← Back</Button>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveEdits} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={startEditing}>
            Edit
          </Button>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold">{instance.templateName}</h1>
        <p className="text-sm text-zinc-400">{formatDate(instance.startedAt)} at {formatTime(instance.startedAt)}</p>
        {status && (
          <span className={`text-xs mt-1 inline-block ${status.className}`}>{status.text}</span>
        )}
      </div>

      {cta && !editing && (
        <Button
          className="w-full"
          disabled={busyId === instance.id}
          onClick={() => resume(instance.id)}
        >
          {busyId === instance.id
            ? 'Opening…'
            : remainingSets > 0
              ? `${cta.label} · ${remainingSets} set${remainingSets !== 1 ? 's' : ''} left`
              : cta.label}
        </Button>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-zinc-400">Duration</p>
          <p className="text-lg font-bold">{formatDuration(instance.durationSeconds)}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-400">Sets</p>
          <p className="text-lg font-bold">{totalSets}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-400">Volume</p>
          <p className="text-lg font-bold">{formatVolume(totalVolume, units)}</p>
        </Card>
      </div>

      <div className="space-y-3">
        {exercises.map(({ exerciseInstance, name, sets }) => {
          const draftSets = drafts[exerciseInstance.id] ?? [];
          return (
            <Card key={exerciseInstance.id}>
              <h3 className="font-semibold mb-2">{name}</h3>
              {editing ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 text-xs text-zinc-500">
                    <span>Set</span>
                    <span>Weight ({units})</span>
                    <span>Reps</span>
                    <span />
                  </div>
                  {draftSets.map((s, i) => (
                    <div key={s.id} className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center">
                      <span className="text-sm text-zinc-400">{i + 1}</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={s.actualWeight}
                        onChange={e => updateDraft(exerciseInstance.id, s.id, 'actualWeight', e.target.value)}
                        className="min-h-[44px] py-2"
                      />
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        value={s.actualReps}
                        onChange={e => updateDraft(exerciseInstance.id, s.id, 'actualReps', e.target.value)}
                        className="min-h-[44px] py-2"
                      />
                      <button
                        type="button"
                        aria-label={`Remove set ${i + 1}`}
                        className="text-red-400 text-lg min-h-[44px]"
                        onClick={() => removeDraftSet(exerciseInstance.id, s.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => addDraftSet(exerciseInstance.id)}
                  >
                    Add set
                  </Button>
                </div>
              ) : sets.length === 0 ? (
                <p className="text-sm text-zinc-500">No sets logged</p>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-4 text-xs text-zinc-500 border-b border-white/5 pb-1">
                    <span>Set</span>
                    <span>Weight</span>
                    <span>Reps</span>
                    <span>Rest</span>
                  </div>
                  {sets.map((s, i) => (
                    <div key={s.id} className="grid grid-cols-4 text-sm">
                      <span className="text-zinc-400">{i + 1}</span>
                      <span>{formatWeight(s.actualWeight, units)}</span>
                      <span>{s.actualReps}</span>
                      <span className="text-zinc-400">{s.actualRestSeconds ? `${s.actualRestSeconds}s` : '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <ResumeConflictModal open={conflict} onClose={dismissConflict} />
    </div>
  );
}
