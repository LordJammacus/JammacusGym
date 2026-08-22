import { useState, useEffect } from 'react';
import { Input, Modal } from '@/components/ui';
import * as exercisesRepo from '@/db/repositories/exercises';
import type { Exercise } from '@/types/entities';

export function ExercisePickerModal({
  open,
  onClose,
  title,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onSelect: (exerciseId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Exercise[]>([]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }
    const loadResults = async () => {
      const r = search
        ? await exercisesRepo.searchExercises(search)
        : await exercisesRepo.getActiveExercises();
      setResults(r);
    };
    loadResults();
  }, [search, open]);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-3">
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="max-h-64 overflow-y-auto space-y-1">
          {results.map(ex => (
            <button
              key={ex.id}
              className="w-full text-left p-3 rounded-lg active:bg-surface-overlay transition-colors"
              onClick={() => onSelect(ex.id)}
            >
              <div className="font-medium">{ex.name}</div>
              <div className="text-xs text-zinc-400 capitalize">{ex.equipment} · {ex.category}</div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
