import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Modal } from '@/components/ui';
import type { WorkoutTemplate } from '@/types/entities';
import type { WorkoutGoal } from '@/types/enums';
import * as workoutsRepo from '@/db/repositories/workouts';
import { generateId } from '@/utils/ids';
import { useWorkoutStore } from '@/stores/workoutStore';

export function WorkoutPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const activeWorkout = useWorkoutStore(s => s.instance);

  const load = useCallback(async () => {
    const t = await workoutsRepo.getAllTemplates();
    setTemplates(t);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (activeWorkout) {
    navigate(`/workout/active`);
    return null;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workouts</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>+ New</Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <p className="text-zinc-400 text-center py-4">No workout templates yet. Create one to get started.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map(template => (
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

      <CreateTemplateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => { setShowCreate(false); navigate(`/workout/template/${id}`); }}
      />
    </div>
  );
}

function CreateTemplateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<WorkoutGoal>('hypertrophy');

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
    setName('');
    onCreated(id);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Workout Template">
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Push Day" />
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
