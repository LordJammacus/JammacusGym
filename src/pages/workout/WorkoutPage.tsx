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

const GROUP_STORAGE_KEY = 'jammacus.workoutGroup';

function readStoredGroupId(): string | null {
  try {
    return sessionStorage.getItem(GROUP_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeGroupId(id: string) {
  try {
    sessionStorage.setItem(GROUP_STORAGE_KEY, id);
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
  if (!value) return undefined;
  return groups.find(group => group.id === value || group.templateIds.includes(value));
}

function defaultSelection(groups: WorkoutGroup[]): string {
  const active = groups.find(group => group.isActive);
  const fallback = active ?? groups.find(group => group.id === NO_PROGRAM_GROUP_ID);
  return fallback?.templateIds[0] ?? fallback?.id ?? NO_PROGRAM_GROUP_ID;
}

export function WorkoutPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [groups, setGroups] = useState<WorkoutGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(readStoredGroupId);
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
    setSelectedGroupId(current => {
      const next = current && groupForValue(g, current) ? current : defaultSelection(g);
      storeGroupId(next);
      return next;
    });
    setReady(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  function selectGroup(id: string) {
    setSelectedGroupId(id);
    storeGroupId(id);
  }

  if (activeWorkout) {
    navigate(`/workout/active`);
    return null;
  }

  const selected = groupForValue(groups, selectedGroupId) ?? null;
  const templateById = new Map(templates.map(template => [template.id, template]));
  const selectValue = selected?.templateIds.includes(selectedGroupId ?? '')
    ? selectedGroupId!
    : (selected?.templateIds[0] ?? selected?.id ?? NO_PROGRAM_GROUP_ID);
  const visible = (selected?.templateIds ?? [])
    .map(id => templateById.get(id))
    .filter((template): template is WorkoutTemplate => template !== undefined);

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
              value={selectValue}
              onChange={e => selectGroup(e.target.value)}
              className="w-full rounded-lg bg-surface-overlay border border-white/10 px-3 py-2.5 text-white min-h-[44px] text-base"
            >
              {groups.map(group => (
                <optgroup
                  key={group.id}
                  label={group.isActive ? `${group.label} (Active)` : group.label}
                >
                  {group.templateIds.length === 0 ? (
                    <option value={group.id}>
                      {group.programId ? 'No workouts in this split' : 'No one-off workouts'}
                    </option>
                  ) : (
                    group.templateIds.map(id => (
                      <option key={id} value={id}>
                        {templateById.get(id)?.name ?? 'Workout'}
                      </option>
                    ))
                  )}
                </optgroup>
              ))}
            </select>
            <p className="text-sm text-zinc-500">
              {selected?.programId
                ? selected.label
                : 'No program — one-off workouts'}
            </p>
          </div>

          {visible.length === 0 ? (
            <Card>
              <p className="text-zinc-400 text-center py-4">
                {selected?.programId
                  ? 'No workouts in this split yet.'
                  : 'No one-off workouts yet. Create one to train outside a program.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {visible.map(template => (
                <Card key={template.id} className="active:bg-surface-overlay transition-colors">
                  <div className="flex items-center justify-between">
                    <button
                      className="text-left flex-1"
                      onClick={() => navigate(`/workout/template/${template.id}`)}
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-zinc-400 capitalize">{template.goal}</div>
                    </button>
                    <Button size="sm" onClick={() => navigate(`/workout/start/${template.id}`)}>
                      Start
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <CreateTemplateModal
        open={showCreate}
        groups={groups}
        initialGroupId={selected?.id ?? NO_PROGRAM_GROUP_ID}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => {
          selectGroup(id);
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
  onCreated: (id: string) => void;
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

    onCreated(id);
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
            className="w-full rounded-lg bg-surface-overlay border border-white/10 px-3 py-2.5 text-white min-h-[44px] text-base"
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
            className="w-full rounded-lg bg-surface-overlay border border-white/10 px-3 py-2.5 text-white min-h-[44px]"
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
