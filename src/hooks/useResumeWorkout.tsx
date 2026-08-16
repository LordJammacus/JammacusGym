import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal } from '@/components/ui';
import { useWorkoutStore } from '@/stores/workoutStore';

export function useResumeWorkout() {
  const navigate = useNavigate();
  const resumeWorkout = useWorkoutStore(s => s.resumeWorkout);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const resume = async (instanceId: string) => {
    setBusyId(instanceId);
    try {
      const result = await resumeWorkout(instanceId);
      if (result === 'active_conflict') {
        setConflict(true);
        return;
      }
      if (result === 'ok' || result === 'already_active') {
        navigate('/workout/active');
      }
    } finally {
      setBusyId(null);
    }
  };

  return {
    resume,
    busyId,
    conflict,
    dismissConflict: () => setConflict(false),
  };
}

export function ResumeConflictModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <Modal open={open} onClose={onClose} title="Workout already in progress">
      <div className="space-y-4">
        <p className="text-zinc-300">
          Finish or save your current workout for later before picking this one up.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>OK</Button>
          <Button className="flex-1" onClick={() => navigate('/workout/active')}>
            Go to current
          </Button>
        </div>
      </div>
    </Modal>
  );
}
