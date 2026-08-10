import { useState, useEffect, useCallback } from 'react';

interface RestTimerProps {
  targetSeconds: number;
  startedAt: number;
  onDismiss: () => void;
}

export function RestTimer({ targetSeconds, startedAt, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(targetSeconds);
  const [hasAlerted, setHasAlerted] = useState(false);

  const triggerAlert = useCallback(() => {
    if (hasAlerted) return;
    setHasAlerted(true);

    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1100;
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.15);
      }, 200);
    } catch {
      // Audio not supported
    }
  }, [hasAlerted]);

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const r = targetSeconds - elapsed;
      setRemaining(r);

      if (r <= 0 && !hasAlerted) {
        triggerAlert();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [startedAt, targetSeconds, hasAlerted, triggerAlert]);

  const isOvertime = remaining <= 0;
  const displaySeconds = Math.abs(remaining);
  const minutes = Math.floor(displaySeconds / 60);
  const secs = displaySeconds % 60;

  const progress = Math.min(1, (targetSeconds - remaining) / targetSeconds);

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

      <button
        onClick={onDismiss}
        className="mt-3 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        {isOvertime ? 'Dismiss' : 'Skip rest'}
      </button>
    </div>
  );
}
