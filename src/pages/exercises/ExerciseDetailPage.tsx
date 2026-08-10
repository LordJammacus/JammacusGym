import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '@/components/ui';
import type { Exercise, ExerciseMuscle, MuscleGroup } from '@/types/entities';
import type { ExerciseCategory, Equipment } from '@/types/enums';
import * as exercisesRepo from '@/db/repositories/exercises';

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [muscles, setMuscles] = useState<ExerciseMuscle[]>([]);
  const [allMuscles, setAllMuscles] = useState<MuscleGroup[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('compound');
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [repMin, setRepMin] = useState(8);
  const [repMax, setRepMax] = useState(12);
  const [restSeconds, setRestSeconds] = useState(120);

  useEffect(() => {
    if (!id) return;
    exercisesRepo.getExercise(id).then(ex => {
      if (!ex) return;
      setExercise(ex);
      setName(ex.name);
      setCategory(ex.category);
      setEquipment(ex.equipment);
      setRepMin(ex.defaultRepRangeMin);
      setRepMax(ex.defaultRepRangeMax);
      setRestSeconds(ex.defaultRestSeconds);
    });
    exercisesRepo.getMusclesForExercise(id).then(setMuscles);
    exercisesRepo.getAllMuscleGroups().then(setAllMuscles);
  }, [id]);

  if (!exercise) return <div className="p-4 text-zinc-400">Loading...</div>;

  const handleSave = async () => {
    await exercisesRepo.updateExercise(exercise.id, {
      name: name.trim(),
      category,
      equipment,
      defaultRepRangeMin: repMin,
      defaultRepRangeMax: repMax,
      defaultRestSeconds: restSeconds,
    });
    setExercise({ ...exercise, name: name.trim(), category, equipment, defaultRepRangeMin: repMin, defaultRepRangeMax: repMax, defaultRestSeconds: restSeconds });
    setEditing(false);
  };

  const handleArchive = async () => {
    await exercisesRepo.archiveExercise(exercise.id);
    navigate('/exercises');
  };

  const muscleNames = muscles.map(m => {
    const mg = allMuscles.find(g => g.id === m.muscleGroupId);
    return mg ? `${mg.name} (${m.role})` : m.muscleGroupId;
  });

  return (
    <div className="p-4 space-y-4">
      <button onClick={() => navigate('/exercises')} className="text-brand-light text-sm">
        ← Back to Exercises
      </button>

      {!editing ? (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{exercise.name}</h1>
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
          </div>

          <Card>
            <div className="space-y-2 text-sm">
              <InfoRow label="Category" value={exercise.category} />
              <InfoRow label="Equipment" value={exercise.equipment} />
              <InfoRow label="Rep Range" value={`${exercise.defaultRepRangeMin}-${exercise.defaultRepRangeMax}`} />
              <InfoRow label="Rest" value={`${exercise.defaultRestSeconds}s`} />
            </div>
          </Card>

          {muscleNames.length > 0 && (
            <Card>
              <h3 className="text-sm font-medium text-zinc-400 mb-2">Muscles Worked</h3>
              <div className="flex flex-wrap gap-2">
                {muscleNames.map((name, i) => (
                  <span key={i} className="px-2 py-1 bg-surface-overlay rounded text-sm">{name}</span>
                ))}
              </div>
            </Card>
          )}

          {exercise.isCustom && (
            <Button variant="danger" className="w-full" onClick={handleArchive}>
              Archive Exercise
            </Button>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400 font-medium">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as ExerciseCategory)} className="w-full rounded-lg bg-surface-overlay border border-white/10 px-3 py-2.5 text-white min-h-[44px]">
              <option value="compound">Compound</option>
              <option value="isolation">Isolation</option>
              <option value="cardio">Cardio</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400 font-medium">Equipment</label>
            <select value={equipment} onChange={e => setEquipment(e.target.value as Equipment)} className="w-full rounded-lg bg-surface-overlay border border-white/10 px-3 py-2.5 text-white min-h-[44px]">
              <option value="barbell">Barbell</option>
              <option value="dumbbell">Dumbbell</option>
              <option value="cable">Cable</option>
              <option value="machine">Machine</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Min Reps" type="number" value={repMin} onChange={e => setRepMin(+e.target.value)} />
            <Input label="Max Reps" type="number" value={repMax} onChange={e => setRepMax(+e.target.value)} />
          </div>

          <Input label="Rest (seconds)" type="number" value={restSeconds} onChange={e => setRestSeconds(+e.target.value)} />

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave}>Save</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-400">{label}</span>
      <span className="capitalize">{value}</span>
    </div>
  );
}
