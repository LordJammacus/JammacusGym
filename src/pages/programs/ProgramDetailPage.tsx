import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Input, Modal } from '@/components/ui';
import type { Program, TrainingBlock, BlockWorkout, WorkoutTemplate } from '@/types/entities';
import type { BlockGoal } from '@/types/enums';
import { generateId } from '@/utils/ids';
import {
  getProgram,
  updateProgram,
  getBlocksForProgram,
  createBlock,
  deleteBlock,
  getBlockWorkouts,
  addBlockWorkout,
  removeBlockWorkout,
  setActiveProgram,
} from '@/db/repositories/programs';
import { getAllTemplates } from '@/db/repositories/workouts';

const BLOCK_GOALS: { value: BlockGoal; label: string }[] = [
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'strength', label: 'Strength' },
  { value: 'power', label: 'Power' },
  { value: 'deload', label: 'Deload' },
  { value: 'peaking', label: 'Peaking' },
  { value: 'general', label: 'General' },
];

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [program, setProgram] = useState<Program | null>(null);
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [blockWorkoutsMap, setBlockWorkoutsMap] = useState<Record<string, BlockWorkout[]>>({});
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

  const [showAddBlock, setShowAddBlock] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [blockGoal, setBlockGoal] = useState<BlockGoal>('hypertrophy');
  const [blockWeeks, setBlockWeeks] = useState('4');

  const [showAddWorkout, setShowAddWorkout] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    const p = await getProgram(id);
    if (!p) { navigate('/programs'); return; }
    setProgram(p);
    setNameValue(p.name);

    const blks = await getBlocksForProgram(id);
    setBlocks(blks);

    const bwMap: Record<string, BlockWorkout[]> = {};
    for (const b of blks) {
      bwMap[b.id] = await getBlockWorkouts(b.id);
    }
    setBlockWorkoutsMap(bwMap);
    setTemplates(await getAllTemplates());
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  async function handleSaveName() {
    if (!program || !nameValue.trim()) return;
    await updateProgram(program.id, { name: nameValue.trim() });
    setEditingName(false);
    await load();
  }

  async function handleAddBlock() {
    if (!id || !blockName.trim()) return;
    const block: TrainingBlock = {
      id: generateId(),
      programId: id,
      name: blockName.trim(),
      orderIndex: blocks.length,
      weekCount: parseInt(blockWeeks) || 4,
      goal: blockGoal,
      notes: '',
      createdAt: new Date().toISOString(),
    };
    await createBlock(block);
    setBlockName('');
    setBlockGoal('hypertrophy');
    setBlockWeeks('4');
    setShowAddBlock(false);
    await load();
  }

  async function handleDeleteBlock(blockId: string) {
    await deleteBlock(blockId);
    await load();
  }

  async function handleAddWorkoutToBlock(blockId: string, templateId: string) {
    const existing = blockWorkoutsMap[blockId] || [];
    const bw: BlockWorkout = {
      id: generateId(),
      trainingBlockId: blockId,
      workoutTemplateId: templateId,
      orderIndex: existing.length,
      dayOfWeek: null,
    };
    await addBlockWorkout(bw);
    setShowAddWorkout(null);
    await load();
  }

  async function handleRemoveWorkout(bwId: string) {
    await removeBlockWorkout(bwId);
    await load();
  }

  async function handleSetActive() {
    if (!program) return;
    await setActiveProgram(program.id);
    await load();
  }

  function getTemplateName(templateId: string): string {
    return templates.find(t => t.id === templateId)?.name || 'Unknown';
  }

  if (!program) return null;

  return (
    <div className="p-4 space-y-4 pb-24">
      <button onClick={() => navigate('/programs')} className="text-sm text-zinc-400">
        ← Programs
      </button>

      <div className="flex items-center justify-between">
        {editingName ? (
          <div className="flex gap-2 flex-1">
            <Input
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              className="flex-1"
              autoFocus
            />
            <Button size="sm" onClick={handleSaveName}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>✕</Button>
          </div>
        ) : (
          <h1
            className="text-2xl font-bold cursor-pointer"
            onClick={() => setEditingName(true)}
          >
            {program.name}
          </h1>
        )}
        {!program.isActive && (
          <Button size="sm" variant="secondary" onClick={handleSetActive}>
            Set Active
          </Button>
        )}
        {program.isActive && (
          <span className="text-xs bg-brand/20 text-brand px-2 py-0.5 rounded-full font-medium">
            Active
          </span>
        )}
      </div>

      {program.description && (
        <p className="text-sm text-zinc-400">{program.description}</p>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Training Blocks</h2>
          <Button size="sm" variant="secondary" onClick={() => setShowAddBlock(true)}>
            + Block
          </Button>
        </div>

        {blocks.length === 0 && (
          <Card>
            <p className="text-zinc-400 text-sm">
              Add training blocks to define your program structure. Each block contains a rotation of workouts.
            </p>
          </Card>
        )}

        {blocks.map((block) => (
          <Card key={block.id} className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-white">{block.name}</h3>
                <div className="flex gap-3 text-xs text-zinc-400 mt-0.5">
                  <span className="capitalize">{block.goal}</span>
                  <span>{block.weekCount} weeks</span>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleDeleteBlock(block.id)}>
                ✕
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Rotation</div>
              {(blockWorkoutsMap[block.id] || []).map((bw, idx) => (
                <div key={bw.id} className="flex items-center justify-between bg-surface-overlay rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 w-5">{idx + 1}.</span>
                    <span className="text-sm text-white">{getTemplateName(bw.workoutTemplateId)}</span>
                  </div>
                  <button
                    className="text-zinc-500 text-sm px-2"
                    onClick={() => handleRemoveWorkout(bw.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="w-full"
                onClick={() => setShowAddWorkout(block.id)}
              >
                + Add Workout
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Block Modal */}
      <Modal open={showAddBlock} onClose={() => setShowAddBlock(false)} title="New Training Block">
        <div className="space-y-4">
          <Input
            label="Block Name"
            placeholder="e.g. Volume Block"
            value={blockName}
            onChange={e => setBlockName(e.target.value)}
            autoFocus
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400 font-medium">Goal</label>
            <select
              className="w-full rounded-lg bg-surface-overlay border border-white/10 px-3 py-2.5 text-white min-h-[44px] text-base"
              value={blockGoal}
              onChange={e => setBlockGoal(e.target.value as BlockGoal)}
            >
              {BLOCK_GOALS.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Weeks"
            type="number"
            min="1"
            max="52"
            value={blockWeeks}
            onChange={e => setBlockWeeks(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleAddBlock} disabled={!blockName.trim()}>
              Add Block
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => setShowAddBlock(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Workout to Block Modal */}
      <Modal
        open={showAddWorkout !== null}
        onClose={() => setShowAddWorkout(null)}
        title="Add Workout to Block"
      >
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {templates.length === 0 && (
            <p className="text-zinc-400 text-sm py-4">
              No workout templates available. Create one first.
            </p>
          )}
          {templates.map(t => (
            <button
              key={t.id}
              className="w-full text-left rounded-lg bg-surface-overlay px-4 py-3 active:bg-white/5"
              onClick={() => showAddWorkout && handleAddWorkoutToBlock(showAddWorkout, t.id)}
            >
              <span className="text-white">{t.name}</span>
              <span className="block text-xs text-zinc-400 capitalize mt-0.5">{t.goal}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
