import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { RecommendationCard } from '@/components/recommendations/RecommendationCard';
import { useRecommendations } from '@/hooks/useRecommendations';
import type { Program, WorkoutTemplate } from '@/types/entities';
import { getActiveProgram, determineNextWorkout } from '@/db/repositories/programs';
import { getTemplate } from '@/db/repositories/workouts';

export function TodayPage() {
  const navigate = useNavigate();
  const [activeProgram, setActiveProgram] = useState<Program | null>(null);
  const [nextWorkout, setNextWorkout] = useState<{
    template: WorkoutTemplate;
    blockName: string;
    workoutIndex: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { recommendations, respond } = useRecommendations();

  useEffect(() => {
    (async () => {
      const program = await getActiveProgram();
      setActiveProgram(program || null);

      if (program) {
        const next = await determineNextWorkout(program.id);
        if (next) {
          const template = await getTemplate(next.templateId);
          if (template) {
            setNextWorkout({
              template,
              blockName: next.blockName,
              workoutIndex: next.workoutIndex,
            });
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return null;

  const topRecs = recommendations.slice(0, 2);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Today</h1>
        <button
          onClick={() => navigate('/more')}
          className="text-brand-light text-sm font-medium min-h-[44px] px-2"
        >
          More
        </button>
      </div>

      {activeProgram && nextWorkout ? (
        <Card className="space-y-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Next Workout</div>
          <div>
            <h3 className="text-lg font-semibold text-white">{nextWorkout.template.name}</h3>
            <p className="text-sm text-zinc-400 mt-0.5">
              {activeProgram.name} — {nextWorkout.blockName}
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() => navigate(`/workout/start/${nextWorkout.template.id}`)}
          >
            Start Workout
          </Button>
        </Card>
      ) : activeProgram ? (
        <Card className="space-y-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Active Program</div>
          <h3 className="font-semibold text-white">{activeProgram.name}</h3>
          <p className="text-sm text-zinc-400">
            No workouts configured in this program yet.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/programs/${activeProgram.id}`)}
          >
            Configure Program
          </Button>
        </Card>
      ) : (
        <Card className="space-y-3">
          <p className="text-zinc-400">
            No active program. Set one up to get workout recommendations.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/programs')}>
              Programs
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/workout')}>
              Quick Workout
            </Button>
          </div>
        </Card>
      )}

      {topRecs.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Recommendations</div>
          {topRecs.map(rec => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onRespond={respond}
              compact
            />
          ))}
          {recommendations.length > 2 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => navigate('/training')}
            >
              View all {recommendations.length} recommendations →
            </Button>
          )}
        </div>
      )}

      {!activeProgram && (
        <Card>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate('/workout')}
          >
            Start a workout →
          </Button>
        </Card>
      )}
    </div>
  );
}
