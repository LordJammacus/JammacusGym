import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Modal } from '@/components/ui';
import type { Exercise, MuscleGroup } from '@/types/entities';
import type { Equipment, ExerciseCategory } from '@/types/enums';
import * as exercisesRepo from '@/db/repositories/exercises';
import { generateId } from '@/utils/ids';

export function ExercisesPage() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [search, setSearch] = useState('');
  const [filterEquipment, setFilterEquipment] = useState<Equipment | ''>('');
  const [filterCategory, setFilterCategory] = useState<ExerciseCategory | ''>('');
  const [showCreate, setShowCreate] = useState(false);

  const loadExercises = useCallback(async () => {
    const results = search
      ? await exercisesRepo.searchExercises(search)
      : await exercisesRepo.getActiveExercises();
    setExercises(results);
  }, [search]);

  useEffect(() => { loadExercises(); }, [loadExercises]);
  useEffect(() => { exercisesRepo.getAllMuscleGroups().then(setMuscleGroups); }, []);

  const filtered = exercises.filter(e => {
    if (filterEquipment && e.equipment !== filterEquipment) return false;
    if (filterCategory && e.category !== filterCategory) return false;
    return true;
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exercises</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>+ New</Button>
      </div>

      <Input
        placeholder="Search exercises..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterChip
          label="All Types"
          active={!filterCategory}
          onClick={() => setFilterCategory('')}
        />
        <FilterChip
          label="Compound"
          active={filterCategory === 'compound'}
          onClick={() => setFilterCategory('compound')}
        />
        <FilterChip
          label="Isolation"
          active={filterCategory === 'isolation'}
          onClick={() => setFilterCategory('isolation')}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterChip label="All Equipment" active={!filterEquipment} onClick={() => setFilterEquipment('')} />
        <FilterChip label="Barbell" active={filterEquipment === 'barbell'} onClick={() => setFilterEquipment('barbell')} />
        <FilterChip label="Dumbbell" active={filterEquipment === 'dumbbell'} onClick={() => setFilterEquipment('dumbbell')} />
        <FilterChip label="Cable" active={filterEquipment === 'cable'} onClick={() => setFilterEquipment('cable')} />
        <FilterChip label="Machine" active={filterEquipment === 'machine'} onClick={() => setFilterEquipment('machine')} />
        <FilterChip label="Bodyweight" active={filterEquipment === 'bodyweight'} onClick={() => setFilterEquipment('bodyweight')} />
      </div>

      <div className="space-y-2">
        {filtered.map(exercise => (
          <Card key={exercise.id} className="active:bg-surface-overlay transition-colors">
            <button
              className="w-full text-left"
              onClick={() => navigate(`/exercises/${exercise.id}`)}
            >
              <div className="font-medium">{exercise.name}</div>
              <div className="text-sm text-zinc-400 mt-0.5 capitalize">
                {exercise.equipment} · {exercise.category} · {exercise.defaultRepRangeMin}-{exercise.defaultRepRangeMax} reps
              </div>
            </button>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-zinc-500 py-8">No exercises found.</p>
        )}
      </div>

      <CreateExerciseModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        muscleGroups={muscleGroups}
        onCreated={() => { setShowCreate(false); loadExercises(); }}
      />
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
        active ? 'bg-brand text-white' : 'bg-surface-overlay text-zinc-300'
      }`}
    >
      {label}
    </button>
  );
}

function CreateExerciseModal({
  open,
  onClose,
  muscleGroups,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  muscleGroups: MuscleGroup[];
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('compound');
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [primaryMuscle, setPrimaryMuscle] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const id = generateId();

    const exercise: Exercise = {
      id,
      name: name.trim(),
      category,
      equipment,
      movementPattern: 'other',
      defaultRepRangeMin: 8,
      defaultRepRangeMax: 12,
      defaultRestSeconds: 120,
      notes: '',
      isCustom: true,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await exercisesRepo.createExercise(exercise);

    if (primaryMuscle) {
      await exercisesRepo.setMusclesForExercise(id, [{
        id: generateId(),
        exerciseId: id,
        muscleGroupId: primaryMuscle,
        role: 'primary',
        contribution: 1.0,
      }]);
    }

    setName('');
    onCreated();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Exercise">
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Incline Smith Press" />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-zinc-400 font-medium">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as ExerciseCategory)}
            className="w-full rounded-lg bg-surface-overlay border border-white/10 px-3 py-2.5 text-white min-h-[44px]"
          >
            <option value="compound">Compound</option>
            <option value="isolation">Isolation</option>
            <option value="cardio">Cardio</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-zinc-400 font-medium">Equipment</label>
          <select
            value={equipment}
            onChange={e => setEquipment(e.target.value as Equipment)}
            className="w-full rounded-lg bg-surface-overlay border border-white/10 px-3 py-2.5 text-white min-h-[44px]"
          >
            <option value="barbell">Barbell</option>
            <option value="dumbbell">Dumbbell</option>
            <option value="cable">Cable</option>
            <option value="machine">Machine</option>
            <option value="bodyweight">Bodyweight</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-zinc-400 font-medium">Primary Muscle</label>
          <select
            value={primaryMuscle}
            onChange={e => setPrimaryMuscle(e.target.value)}
            className="w-full rounded-lg bg-surface-overlay border border-white/10 px-3 py-2.5 text-white min-h-[44px]"
          >
            <option value="">Select...</option>
            {muscleGroups.map(mg => (
              <option key={mg.id} value={mg.id}>{mg.name}</option>
            ))}
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
