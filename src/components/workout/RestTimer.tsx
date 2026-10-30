import { useState, useEffect } from 'react';
import { cancelRestAlert, prepareRestAlerts, scheduleRestAlert } from '@/utils/restAlert';

interface RestTimerProps {
  targetSeconds: number;
  startedAt: number;
  adjustSeconds?: number;
  onAdjust?: (deltaSeconds: number) => void;
  onDismiss: () => void;
}

export function RestTimer({
  targetSeconds,
  startedAt,
  adjustSeconds = 15,
  onAdjust,
  onDismiss,
}: RestTimerProps) {
  const [remaining, setRemaining] = useState(() => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    return targetSeconds - elapsed;
  });

  useEffect(() => {
    scheduleRestAlert(startedAt + targetSeconds * 1000);
    return () => cancelRestAlert();
  }, [startedAt, targetSeconds]);

  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setRemaining(targetSeconds - elapsed);
    };

    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [startedAt, targetSeconds]);

  const isOvertime = remaining <= 0;
  const displaySeconds = Math.abs(remaining);
  const minutes = Math.floor(displaySeconds / 60);
  const secs = displaySeconds % 60;

  const progress = targetSeconds > 0
    ? Math.min(1, (targetSeconds - remaining) / targetSeconds)
    : 1;

  return (
    <div className={`rounded-xl p-4 text-center transition-colors ${
      isOvertime ? 'bg-green-900/30 border border-green-500/30' : 'bg-surface-overlay border border-white/10'
    }`}>
      <p className="text-xs text-zinc-400 mb-1">
        {isOvertime ? 'Rest complete' : 'Rest timer'}
      </p>
      <p className={`text-3xl font-mono font-bold ${isOvertime ? 'text-green-400' : 'text-white'}`}>
        {isOvertime && '+'}{minutes}:{secs.toString().padStart(2, '0')}
      </p>

      {!isOvertime && (
        <div className="mt-2 h-1 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {onAdjust && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label={`Subtract ${adjustSeconds} seconds`}
            onClick={() => {
              prepareRestAlerts();
              onAdjust(-adjustSeconds);
            }}
            className="min-w-[44px] h-11 px-3 rounded-full bg-surface flex items-center justify-center text-sm font-bold active:bg-surface-overlay"
          >
            −{adjustSeconds}s
          </button>
          <button
            type="button"
            aria-label={`Add ${adjustSeconds} seconds`}
            onClick={() => {
              prepareRestAlerts();
              onAdjust(adjustSeconds);
            }}
            className="min-w-[44px] h-11 px-3 rounded-full bg-surface flex items-center justify-center text-sm font-bold active:bg-surface-overlay"
          >
            +{adjustSeconds}s
          </button>
        </div>
      )}

      <button
        onClick={onDismiss}
        className="mt-3 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        {isOvertime ? 'Dismiss' : 'Skip rest'}
      </button>
    </div>
  );
}
