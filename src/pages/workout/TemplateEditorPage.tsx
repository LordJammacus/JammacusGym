import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Input, Modal } from '@/components/ui';
import type { WorkoutTemplate, TemplateExercise, SetTarget, Exercise } from '@/types/entities';
import type { SetType } from '@/types/enums';
import * as workoutsRepo from '@/db/repositories/workouts';
import * as exercisesRepo from '@/db/repositories/exercises';
import { generateId } from '@/utils/ids';

export function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [setTargets, setSetTargets] = useState<Map<string, SetTarget[]>>(new Map());
  const [exerciseNames, setExerciseNames] = useState<Map<string, string>>(new Map());
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [editingSets, setEditingSets] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const t = await workoutsRepo.getTemplate(id);
    if (!t) return;
    setTemplate(t);

    const exs = await workoutsRepo.getTemplateExercises(id);
    setExercises(exs);

    const targets = new Map<string, SetTarget[]>();
    const names = new Map<string, string>();
    for (const ex of exs) {
      const st = await workoutsRepo.getSetTargets(ex.id);
      targets.set(ex.id, st);
      const exercise = await exercisesRepo.getExercise(ex.exerciseId);
      if (exercise) names.set(ex.exerciseId, exercise.name);
    }
    setSetTargets(targets);
    setExerciseNames(names);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!template) return <div className="p-4 text-zinc-400">Loading...</div>;

  const handleRemoveExercise = async (teId: string) => {
    await workoutsRepo.deleteTemplateExercise(teId);
    load();
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const reordered = [...exercises];
    [reordered[index - 1]!, reordered[index]!] = [reordered[index]!, reordered[index - 1]!];
    const updates = reordered.map((e, i) => ({ id: e.id, orderIndex: i }));
    await workoutsRepo.reorderTemplateExercises(updates);
    load();
  };

  const handleMoveDown = async (index: number) => {
    if (index === exercises.length - 1) return;
    const reordered = [...exercises];
    [reordered[index]!, reordered[index + 1]!] = [reordered[index + 1]!, reordered[index]!];
    const updates = reordered.map((e, i) => ({ id: e.id, orderIndex: i }));
    await workoutsRepo.reorderTemplateExercises(updates);
    load();
  };

  const handleDelete = async () => {
    await workoutsRepo.archiveTemplate(template.id);
    navigate('/workout');
  };

  const SUPERSET_GROUPS = ['A', 'B', 'C', 'D'];

  const handleCycleSuperset = async (te: TemplateExercise) => {
    const currentIdx = te.supersetGroup ? SUPERSET_GROUPS.indexOf(te.supersetGroup) : -1;
    const nextGroup = currentIdx >= SUPERSET_GROUPS.length - 1 ? null : SUPERSET_GROUPS[currentIdx + 1]!;
    await workoutsRepo.putTemplateExercise({ ...te, supersetGroup: nextGroup });
    load();
  };

  const handleRestChange = async (te: TemplateExercise, restSeconds: number) => {
    const next = Math.max(0, Math.round(restSeconds));
    await workoutsRepo.putTemplateExercise({ ...te, restSeconds: next });
    setExercises(exercises.map(e => e.id === te.id ? { ...e, restSeconds: next } : e));
  };

  return (
    <div className="p-4 space-y-4">
      <button onClick={() => navigate('/workout')} className="text-brand-light text-sm">
        ← Back
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{template.name}</h1>
        <Button size="sm" variant="danger" onClick={handleDelete}>Delete</Button>
      </div>

      <p className="text-sm text-zinc-400 capitalize">{template.goal}</p>

      <div className="space-y-3">
        {exercises.map((te, idx) => (
          <Card key={te.id}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {te.supersetGroup && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-800/50">
                      {te.supersetGroup}
                    </span>
                  )}
                  <span className="font-medium">{exerciseNames.get(te.exerciseId) ?? 'Unknown'}</span>
                </div>
                <div className="text-sm text-zinc-400 mt-1 flex items-center gap-2">
                  <span>{(setTargets.get(te.id) ?? []).length} sets ·</span>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    aria-label={`Rest seconds for ${exerciseNames.get(te.exerciseId) ?? 'exercise'}`}
                    value={te.restSeconds}
                    onChange={e => handleRestChange(te, +e.target.value || 0)}
                    className="w-16 bg-surface-overlay rounded px-2 py-1 text-sm text-white text-center"
                  />
                  <span>s rest</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleMoveUp(idx)} className="p-2 text-zinc-400 active:text-white" disabled={idx === 0}>↑</button>
                <button onClick={() => handleMoveDown(idx)} className="p-2 text-zinc-400 active:text-white" disabled={idx === exercises.length - 1}>↓</button>
                <button onClick={() => handleCycleSuperset(te)} className="p-2 text-purple-400 text-xs font-bold">SS</button>
                <button onClick={() => setEditingSets(te.id)} className="p-2 text-brand-light">Sets</button>
                <button onClick={() => handleRemoveExercise(te.id)} className="p-2 text-red-400">×</button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button variant="secondary" className="w-full" onClick={() => setShowAddExercise(true)}>
        + Add Exercise
      </Button>

      <AddExerciseModal
        open={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        onAdd={async (exerciseId) => {
          const exercise = await exercisesRepo.getExercise(exerciseId);
          if (!exercise) return;
          const te: TemplateExercise = {
            id: generateId(),
            workoutTemplateId: template.id,
            exerciseId,
            orderIndex: exercises.length,
            supersetGroup: null,
            restSeconds: exercise.defaultRestSeconds,
            notes: '',
            progressionRuleId: null,
          };
          await workoutsRepo.putTemplateExercise(te);

          const defaultSets: SetTarget[] = Array.from({ length: 3 }, (_, i) => ({
            id: generateId(),
            templateExerciseId: te.id,
            orderIndex: i,
            setType: 'working' as SetType,
            targetWeight: null,
            targetRepMin: exercise.defaultRepRangeMin,
            targetRepMax: exercise.defaultRepRangeMax,
            targetRir: null,
          }));
          await workoutsRepo.putSetTargets(defaultSets);

          setShowAddExercise(false);
          load();
        }}
      />

      <EditSetsModal
        open={editingSets !== null}
        onClose={() => setEditingSets(null)}
        templateExerciseId={editingSets}
        restSeconds={editingSets ? (exercises.find(e => e.id === editingSets)?.restSeconds ?? 0) : 0}
        targets={editingSets ? (setTargets.get(editingSets) ?? []) : []}
        onSave={load}
      />
    </div>
  );
}

function AddExerciseModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (exerciseId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Exercise[]>([]);

  useEffect(() => {
    if (!open) return;
    const loadResults = async () => {
      const r = search
        ? await exercisesRepo.searchExercises(search)
        : await exercisesRepo.getActiveExercises();
      setResults(r);
    };
    loadResults();
  }, [search, open]);

  return (
    <Modal open={open} onClose={onClose} title="Add Exercise">
      <div className="space-y-3">
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="max-h-64 overflow-y-auto space-y-1">
          {results.map(ex => (
            <button
              key={ex.id}
              className="w-full text-left p-3 rounded-lg active:bg-surface-overlay transition-colors"
              onClick={() => { onAdd(ex.id); setSearch(''); }}
            >
              <div className="font-medium">{ex.name}</div>
              <div className="text-xs text-zinc-400 capitalize">{ex.equipment} · {ex.category}</div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function EditSetsModal({
  open,
  onClose,
  templateExerciseId,
  restSeconds: initialRestSeconds,
  targets,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  templateExerciseId: string | null;
  restSeconds: number;
  targets: SetTarget[];
  onSave: () => void;
}) {
  const [sets, setSets] = useState<SetTarget[]>([]);
  const [restSeconds, setRestSeconds] = useState(initialRestSeconds);

  useEffect(() => {
    setSets([...targets]);
    setRestSeconds(initialRestSeconds);
  }, [targets, initialRestSeconds]);

  if (!templateExerciseId) return null;

  const handleAddSet = () => {
    const last = sets[sets.length - 1];
    setSets([...sets, {
      id: generateId(),
      templateExerciseId,
      orderIndex: sets.length,
      setType: 'working',
      targetWeight: last?.targetWeight ?? null,
      targetRepMin: last?.targetRepMin ?? 8,
      targetRepMax: last?.targetRepMax ?? 12,
      targetRir: last?.targetRir ?? null,
    }]);
  };

  const handleRemoveSet = (index: number) => {
    const newSets = sets.filter((_, i) => i !== index).map((s, i) => ({ ...s, orderIndex: i }));
    setSets(newSets);
  };

  const updateSet = (index: number, updates: Partial<SetTarget>) => {
    setSets(sets.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const handleSave = async () => {
    await workoutsRepo.replaceSetTargets(templateExerciseId, sets);
    const te = await workoutsRepo.getTemplateExercise(templateExerciseId);
    if (te) {
      await workoutsRepo.putTemplateExercise({ ...te, restSeconds: Math.max(0, Math.round(restSeconds) || 0) });
    }
    onSave();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Sets">
      <div className="space-y-3">
        <div className="flex items-center justify-between bg-surface-overlay rounded-lg p-3">
          <span className="text-sm text-zinc-400">Rest (seconds)</span>
          <input
            type="number"
            min={0}
            step={5}
            aria-label="Rest seconds"
            value={restSeconds}
            onChange={e => setRestSeconds(+e.target.value || 0)}
            className="w-20 bg-surface rounded px-2 py-1.5 text-sm text-white text-center"
          />
        </div>
        {sets.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 bg-surface-overlay rounded-lg p-2">
            <span className="text-sm text-zinc-400 w-8">#{i + 1}</span>
            <input
              type="number"
              placeholder="kg"
              value={s.targetWeight ?? ''}
              onChange={e => updateSet(i, { targetWeight: e.target.value ? +e.target.value : null })}
              className="w-16 bg-surface rounded px-2 py-1 text-sm text-white text-center"
            />
            <span className="text-zinc-500 text-xs">×</span>
            <input
              type="number"
              value={s.targetRepMin}
              onChange={e => updateSet(i, { targetRepMin: +e.target.value })}
              className="w-12 bg-surface rounded px-2 py-1 text-sm text-white text-center"
            />
            <span className="text-zinc-500 text-xs">-</span>
            <input
              type="number"
              value={s.targetRepMax}
              onChange={e => updateSet(i, { targetRepMax: +e.target.value })}
              className="w-12 bg-surface rounded px-2 py-1 text-sm text-white text-center"
            />
            <button onClick={() => handleRemoveSet(i)} className="text-red-400 p-1">×</button>
          </div>
        ))}
        <Button variant="secondary" size="sm" className="w-full" onClick={handleAddSet}>+ Add Set</Button>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
