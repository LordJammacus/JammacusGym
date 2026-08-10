import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui';
import type { PersonalRecord } from '@/types/analytics';
import * as prRepo from '@/db/repositories/personalRecords';
import * as analyticsRepo from '@/db/repositories/analytics';

export function PRHistoryPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [exerciseNames, setExerciseNames] = useState<Map<string, string>>(new Map());
  const [groupBy, setGroupBy] = useState<'exercise' | 'recent'>('recent');

  useEffect(() => {
    const load = async () => {
      const all = await prRepo.getAllRecords();
      setRecords(all.sort((a, b) => b.achievedAt.localeCompare(a.achievedAt)));
      setExerciseNames(await analyticsRepo.getExerciseNames());
    };
    load();
  }, []);

  const formatPRType = (type: PersonalRecord['type']): string => {
    switch (type) {
      case 'weight': return 'Weight';
      case 'reps': return 'Reps';
      case 'volume': return 'Volume';
      case 'estimated_1rm': return 'Est. 1RM';
      case 'reps_at_weight': return 'Reps@Weight';
    }
  };

  const formatPRValue = (pr: PersonalRecord): string => {
    switch (pr.type) {
      case 'weight': return `${pr.value}kg`;
      case 'reps': return `${pr.value} reps`;
      case 'volume': return `${pr.value >= 1000 ? (pr.value / 1000).toFixed(1) + 't' : pr.value + 'kg'}`;
      case 'estimated_1rm': return `${pr.value}kg`;
      case 'reps_at_weight': return `${pr.reps} @ ${pr.weight}kg`;
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const prTypeColor: Record<string, string> = {
    weight: 'text-brand-light',
    reps: 'text-green-400',
    volume: 'text-cyan-400',
    estimated_1rm: 'text-amber-400',
    reps_at_weight: 'text-purple-400',
  };

  const filteredRecords = records.filter(r => r.type !== 'reps_at_weight');

  const groupedByExercise = () => {
    const map = new Map<string, PersonalRecord[]>();
    for (const r of filteredRecords) {
      const existing = map.get(r.exerciseId) ?? [];
      existing.push(r);
      map.set(r.exerciseId, existing);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const nameA = exerciseNames.get(a[0]) ?? '';
      const nameB = exerciseNames.get(b[0]) ?? '';
      return nameA.localeCompare(nameB);
    });
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <button onClick={() => navigate('/analytics')} className="text-brand-light text-sm">
        ← Analytics
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Personal Records</h1>
        <div className="flex gap-1 bg-surface-overlay rounded-lg p-0.5">
          <button
            onClick={() => setGroupBy('recent')}
            className={`px-3 py-1.5 text-xs rounded-md ${groupBy === 'recent' ? 'bg-brand text-white' : 'text-zinc-400'}`}
          >
            Recent
          </button>
          <button
            onClick={() => setGroupBy('exercise')}
            className={`px-3 py-1.5 text-xs rounded-md ${groupBy === 'exercise' ? 'bg-brand text-white' : 'text-zinc-400'}`}
          >
            By Exercise
          </button>
        </div>
      </div>

      {records.length === 0 && (
        <Card>
          <p className="text-zinc-400 text-sm">Complete workouts to start tracking personal records.</p>
        </Card>
      )}

      {groupBy === 'recent' && (
        <div className="space-y-2">
          {filteredRecords.map(pr => (
            <Card key={pr.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{exerciseNames.get(pr.exerciseId) ?? 'Unknown'}</p>
                  <p className="text-xs text-zinc-500">{formatDate(pr.achievedAt)}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${prTypeColor[pr.type] ?? 'text-white'}`}>
                    {formatPRValue(pr)}
                  </p>
                  <p className="text-xs text-zinc-500">{formatPRType(pr.type)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {groupBy === 'exercise' && (
        <div className="space-y-4">
          {groupedByExercise().map(([exerciseId, prs]) => (
            <Card key={exerciseId}>
              <h3 className="font-semibold text-sm mb-2">{exerciseNames.get(exerciseId) ?? 'Unknown'}</h3>
              <div className="space-y-1.5">
                {prs.map(pr => (
                  <div key={pr.id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">{formatPRType(pr.type)}</span>
                    <div className="text-right">
                      <span className={`font-medium ${prTypeColor[pr.type] ?? ''}`}>{formatPRValue(pr)}</span>
                      <span className="text-xs text-zinc-600 ml-2">{formatDate(pr.achievedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
