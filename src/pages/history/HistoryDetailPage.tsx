import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import * as instancesRepo from '@/db/repositories/instances';
import * as exercisesRepo from '@/db/repositories/exercises';
import type { WorkoutInstance, WorkoutExerciseInstance, CompletedSet } from '@/types/entities';

interface ExerciseBreakdown {
  exerciseInstance: WorkoutExerciseInstance;
  name: string;
  sets: CompletedSet[];
}

export function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [instance, setInstance] = useState<WorkoutInstance | null>(null);
  const [exercises, setExercises] = useState<ExerciseBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const inst = await instancesRepo.getWorkoutInstance(id);
      if (!inst) { navigate('/history', { replace: true }); return; }
      setInstance(inst);

      const eis = await instancesRepo.getExerciseInstances(id);
      const breakdowns: ExerciseBreakdown[] = [];

      for (const ei of eis) {
        const ex = await exercisesRepo.getExercise(ei.exerciseId);
        const sets = await instancesRepo.getCompletedSets(ei.id);
        breakdowns.push({ exerciseInstance: ei, name: ex?.name ?? 'Unknown', sets });
      }

      setExercises(breakdowns);
      setLoading(false);
    };
    load();
  }, [id, navigate]);

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

  return (
    <div className="p-4 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>← Back</Button>

      <div>
        <h1 className="text-2xl font-bold">{instance.templateName}</h1>
        <p className="text-sm text-zinc-400">{formatDate(instance.startedAt)} at {formatTime(instance.startedAt)}</p>
        {instance.status === 'abandoned' && (
          <span className="text-xs text-red-400 mt-1 inline-block">Abandoned</span>
        )}
      </div>

      {/* Summary stats */}
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
          <p className="text-lg font-bold">{totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${totalVolume}kg`}</p>
        </Card>
      </div>

      {/* Exercise breakdown */}
      <div className="space-y-3">
        {exercises.map(({ exerciseInstance, name, sets }) => (
          <Card key={exerciseInstance.id}>
            <h3 className="font-semibold mb-2">{name}</h3>
            {sets.length === 0 ? (
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
                    <span>{s.actualWeight}kg</span>
                    <span>{s.actualReps}</span>
                    <span className="text-zinc-400">{s.actualRestSeconds ? `${s.actualRestSeconds}s` : '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
