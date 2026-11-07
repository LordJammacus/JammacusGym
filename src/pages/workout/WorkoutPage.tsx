import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Modal } from '@/components/ui';
import type { TrainingBlock, WorkoutTemplate } from '@/types/entities';
import type { WorkoutGoal } from '@/types/enums';
import * as workoutsRepo from '@/db/repositories/workouts';
import {
  NO_PROGRAM_GROUP_ID,
  addBlockWorkout,
  createBlock,
  getBlockWorkouts,
  listWorkoutGroups,
  type WorkoutGroup,
} from '@/db/repositories/programs';
import { generateId } from '@/utils/ids';
import { useWorkoutStore } from '@/stores/workoutStore';

const SPLIT_STORAGE_KEY = 'jammacus.workoutGroup';
const WORKOUT_STORAGE_KEY = 'jammacus.workoutTemplate';
const ALL_SPLITS_ID = 'all';

const selectClass =
  'w-full rounded-lg bg-surface-overlay border border-white/10 px-3 py-2.5 text-white min-h-[44px] text-base';

function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    // sessionStorage can throw in private mode; the in-memory selection still works.
  }
}

function groupOptionLabel(group: WorkoutGroup): string {
  const count = group.templateIds.length === 1 ? '1 workout' : `${group.templateIds.length} workouts`;
  const active = group.isActive ? ' (Active)' : '';
  return `${group.label}${active} — ${count}`;
}

function groupForValue(groups: WorkoutGroup[], value: string | null): WorkoutGroup | undefined {
  if (!value || value === ALL_SPLITS_ID) return undefined;
  return groups.find(group => group.id === value || group.templateIds.includes(value));
}

function defaultSplitId(groups: WorkoutGroup[]): string {
  return groups.find(group => group.isActive)?.id ?? ALL_SPLITS_ID;
}

function templatesInSplit(groups: WorkoutGroup[], splitId: string): string[] {
  if (splitId === ALL_SPLITS_ID) {
    return groups.flatMap(group => group.templateIds);
  }
  return groupForValue(groups, splitId)?.templateIds ?? [];
}

export function WorkoutPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [groups, setGroups] = useState<WorkoutGroup[]>([]);
  const [splitId, setSplitId] = useState<string | null>(() => readStorage(SPLIT_STORAGE_KEY));
  const [workoutId, setWorkoutId] = useState<string | null>(() => readStorage(WORKOUT_STORAGE_KEY));
  const [ready, setReady] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const activeWorkout = useWorkoutStore(s => s.instance);

  const load = useCallback(async () => {
    const [t, g] = await Promise.all([
      workoutsRepo.getAllTemplates(),
      listWorkoutGroups(),
    ]);
    setTemplates(t);
    setGroups(g);

    const storedSplit = readStorage(SPLIT_STORAGE_KEY);
    const nextSplit = storedSplit === ALL_SPLITS_ID || groupForValue(g, storedSplit)
      ? (storedSplit === ALL_SPLITS_ID ? ALL_SPLITS_ID : groupForValue(g, storedSplit)!.id)
      : defaultSplitId(g);
    const pool = templatesInSplit(g, nextSplit);
    const storedWorkout = readStorage(WORKOUT_STORAGE_KEY);
    const nextWorkout = storedWorkout && pool.includes(storedWorkout) ? storedWorkout : (pool[0] ?? null);

    setSplitId(nextSplit);
    setWorkoutId(nextWorkout);
    writeStorage(SPLIT_STORAGE_KEY, nextSplit);
    writeStorage(WORKOUT_STORAGE_KEY, nextWorkout);
    setReady(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  function selectSplit(nextSplit: string) {
    const pool = templatesInSplit(groups, nextSplit);
    const nextWorkout = workoutId && pool.includes(workoutId) ? workoutId : (pool[0] ?? null);
    setSplitId(nextSplit);
    setWorkoutId(nextWorkout);
    writeStorage(SPLIT_STORAGE_KEY, nextSplit);
    writeStorage(WORKOUT_STORAGE_KEY, nextWorkout);
  }

  function selectWorkout(id: string) {
    setWorkoutId(id);
    writeStorage(WORKOUT_STORAGE_KEY, id);
  }

  if (activeWorkout) {
    navigate(`/workout/active`);
    return null;
  }

  const templateById = new Map(templates.map(template => [template.id, template]));
  const selectedSplit = groupForValue(groups, splitId);
  const workoutGroups = splitId === ALL_SPLITS_ID
    ? groups.filter(group => group.templateIds.length > 0)
    : (selectedSplit ? [selectedSplit] : []);
  const pool = templatesInSplit(groups, splitId ?? ALL_SPLITS_ID);
  const selectedTemplate = workoutId ? templateById.get(workoutId) : undefined;
  const selectedWorkoutGroup = groupForValue(groups, workoutId);
  const createGroupId = selectedSplit?.id
    ?? selectedWorkoutGroup?.id
    ?? NO_PROGRAM_GROUP_ID;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workouts</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>+ New</Button>
      </div>

      {ready && (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="workout-split" className="text-sm text-zinc-400 font-medium">
              Split
            </label>
            <select
              id="workout-split"
              aria-label="Workout split"
              value={splitId ?? ALL_SPLITS_ID}
              onChange={e => selectSplit(e.target.value)}
              className={selectClass}
            >
              <option value={ALL_SPLITS_ID}>
                All splits — {groups.reduce((n, group) => n + group.templateIds.length, 0)} workouts
              </option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {groupOptionLabel(group)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="workout-picker" className="text-sm text-zinc-400 font-medium">
              Workout
            </label>
            {pool.length === 0 ? (
              <select id="workout-picker" aria-label="Workout" disabled className={selectClass} value="">
                <option value="">
                  {selectedSplit?.programId ? 'No workouts in this split' : 'No one-off workouts'}
                </option>
              </select>
            ) : (
              <select
                id="workout-picker"
                aria-label="Workout"
                value={workoutId ?? ''}
                onChange={e => selectWorkout(e.target.value)}
                className={selectClass}
              >
                {workoutGroups.map(group => (
                  <optgroup
                    key={group.id}
                    label={group.isActive ? `${group.label} (Active)` : group.label}
                  >
                    {group.templateIds.map(id => (
                      <option key={id} value={id}>
                        {templateById.get(id)?.name ?? 'Workout'}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          {selectedTemplate ? (
            <Card className="active:bg-surface-overlay transition-colors">
              <div className="flex items-center justify-between gap-3">
                <button
                  className="text-left flex-1 min-w-0"
                  onClick={() => navigate(`/workout/template/${selectedTemplate.id}`)}
                >
                  <div className="font-medium truncate">{selectedTemplate.name}</div>
                  <div className="text-sm text-zinc-400 capitalize">{selectedTemplate.goal}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {selectedWorkoutGroup?.programId
                      ? selectedWorkoutGroup.label
                      : 'No program'}
                  </div>
                </button>
                <Button size="sm" onClick={() => navigate(`/workout/start/${selectedTemplate.id}`)}>
                  Start
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <p className="text-zinc-400 text-center py-4">
                {selectedSplit?.programId
                  ? 'No workouts in this split yet.'
                  : 'No one-off workouts yet. Create one to train outside a program.'}
              </p>
            </Card>
          )}
        </>
      )}

      <CreateTemplateModal
        open={showCreate}
        groups={groups}
        initialGroupId={createGroupId}
        onClose={() => setShowCreate(false)}
        onCreated={(id, groupId) => {
          const nextSplit = splitId === ALL_SPLITS_ID ? ALL_SPLITS_ID : groupId;
          writeStorage(SPLIT_STORAGE_KEY, nextSplit);
          writeStorage(WORKOUT_STORAGE_KEY, id);
          setShowCreate(false);
          navigate(`/workout/template/${id}`);
        }}
      />
    </div>
  );
}

function CreateTemplateModal({
  open,
  groups,
  initialGroupId,
  onClose,
  onCreated,
}: {
  open: boolean;
  groups: WorkoutGroup[];
  initialGroupId: string;
  onClose: () => void;
  onCreated: (id: string, groupId: string) => void;
}) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<WorkoutGoal>('hypertrophy');
  const [groupId, setGroupId] = useState(initialGroupId);

  useEffect(() => {
    if (!open) return;
    setName('');
    setGoal('hypertrophy');
    setGroupId(initialGroupId);
  }, [open, initialGroupId]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const id = generateId();
    const template: WorkoutTemplate = {
      id,
      name: name.trim(),
      goal,
      estimatedDurationMinutes: null,
      notes: '',
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    await workoutsRepo.createTemplate(template);

    const group = groups.find(item => item.id === groupId);
    if (group?.programId) {
      await attachTemplateToGroup(group, id, now);
    }

    onCreated(id, group?.id ?? NO_PROGRAM_GROUP_ID);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Workout Template">
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Push Day" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-workout-split" className="text-sm text-zinc-400 font-medium">Split</label>
          <select
            id="new-workout-split"
            value={groupId}
            onChange={e => setGroupId(e.target.value)}
            className={selectClass}
          >
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {groupOptionLabel(group)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-zinc-400 font-medium">Goal</label>
          <select
            value={goal}
            onChange={e => setGoal(e.target.value as WorkoutGoal)}
            className={selectClass}
          >
            <option value="hypertrophy">Hypertrophy</option>
            <option value="strength">Strength</option>
            <option value="power">Power</option>
            <option value="general">General</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleCreate} disabled={!name.trim()}>Create</Button>
        </div>
      </div>
    </Modal>
  );
}

async function attachTemplateToGroup(group: WorkoutGroup, templateId: string, now: string) {
  if (!group.programId) return;

  let blockId = group.blockId;
  if (!blockId) {
    const block: TrainingBlock = {
      id: generateId(),
      programId: group.programId,
      name: 'Workouts',
      orderIndex: 0,
      weekCount: 4,
      goal: 'general',
      notes: '',
      createdAt: now,
    };
    await createBlock(block);
    blockId = block.id;
  }

  const existing = await getBlockWorkouts(blockId);
  if (existing.some(bw => bw.workoutTemplateId === templateId)) return;

  await addBlockWorkout({
    id: generateId(),
    trainingBlockId: blockId,
    workoutTemplateId: templateId,
    orderIndex: existing.length,
    dayOfWeek: null,
  });
}
