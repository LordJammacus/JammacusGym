import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui';
import * as instancesRepo from '@/db/repositories/instances';
import type { WorkoutInstance } from '@/types/entities';

interface WorkoutSummary {
  instance: WorkoutInstance;
  exerciseCount: number;
  setCount: number;
}

export function HistoryPage() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const instances = await instancesRepo.getHistoryWorkouts();
      const summaries: WorkoutSummary[] = [];

      for (const inst of instances) {
        const exercises = await instancesRepo.getExerciseInstances(inst.id);
        const sets = await instancesRepo.getAllCompletedSetsForWorkout(inst.id);
        summaries.push({ instance: inst, exerciseCount: exercises.length, setCount: sets.length });
      }

      setWorkouts(summaries);
      setLoading(false);
    };
    load();
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  };

  if (loading) return <div className="p-4 text-zinc-400">Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">History</h1>

      {workouts.length === 0 ? (
        <Card>
          <p className="text-zinc-400">No workouts logged yet. Complete a workout to see it here.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {workouts.map(({ instance, exerciseCount, setCount }) => (
            <button
              key={instance.id}
              onClick={() => navigate(`/history/${instance.id}`)}
              className="w-full text-left"
            >
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{instance.templateName}</h3>
                    <p className="text-sm text-zinc-400">{formatDate(instance.startedAt)}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-zinc-300">{formatDuration(instance.durationSeconds)}</p>
                    <p className="text-zinc-400">
                      {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''} · {setCount} set{setCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {instance.status === 'abandoned' && (
                  <span className="text-xs text-red-400 mt-1 inline-block">Abandoned</span>
                )}
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
