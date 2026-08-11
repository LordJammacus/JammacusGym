import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Modal } from '@/components/ui';
import type { Program } from '@/types/entities';
import { generateId } from '@/utils/ids';
import {
  getAllPrograms,
  createProgram,
  archiveProgram,
  setActiveProgram,
} from '@/db/repositories/programs';

export function ProgramsPage() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const load = useCallback(async () => {
    setPrograms(await getAllPrograms());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!newName.trim()) return;
    const now = new Date().toISOString();
    const program: Program = {
      id: generateId(),
      name: newName.trim(),
      description: newDescription.trim(),
      isActive: false,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    await createProgram(program);
    setNewName('');
    setNewDescription('');
    setShowCreate(false);
    await load();
    navigate(`/programs/${program.id}`);
  }

  async function handleSetActive(id: string) {
    await setActiveProgram(id);
    await load();
  }

  async function handleArchive(id: string) {
    await archiveProgram(id);
    await load();
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Programs</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>+ New</Button>
      </div>

      {programs.length === 0 && (
        <Card>
          <p className="text-zinc-400">
            No programs yet. Create one to structure your training with blocks and rotations.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {programs.map(program => (
          <Card key={program.id} className="space-y-2">
            <div className="flex items-start justify-between">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => navigate(`/programs/${program.id}`)}
              >
                <h3 className="font-semibold text-white">{program.name}</h3>
                {program.description && (
                  <p className="text-sm text-zinc-400 mt-0.5">{program.description}</p>
                )}
              </div>
              {program.isActive && (
                <span className="text-xs bg-brand/20 text-brand px-2 py-0.5 rounded-full font-medium">
                  Active
                </span>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              {!program.isActive && (
                <Button size="sm" variant="secondary" onClick={() => handleSetActive(program.id)}>
                  Set Active
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => navigate(`/programs/${program.id}`)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleArchive(program.id)}>
                Archive
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Program">
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <Input
            label="Name"
            placeholder="e.g. Push Pull Legs"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            autoFocus
          />
          <Input
            label="Description (optional)"
            placeholder="e.g. 6-day hypertrophy split"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" disabled={!newName.trim()}>
              Create
            </Button>
            <Button type="button" className="flex-1" variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
