import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { updateSettings } from '@/db/database';
import { haptic } from '@/utils/haptics';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'welcome' | 'units' | 'done'>('welcome');
  const [units, setUnits] = useState<'kg' | 'lb'>('kg');

  const handleFinish = async () => {
    await updateSettings({ units });
    localStorage.setItem('jammacus-onboarded', 'true');
    haptic('success');
    onComplete();
    navigate('/workout');
  };

  if (step === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center page-enter">
        <div className="w-16 h-16 rounded-2xl bg-brand/20 flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-brand-light">
            <path d="M6.5 6.5h11M6.5 17.5h11M3 10.5h2M3 13.5h2M19 10.5h2M19 13.5h2M5 6.5v11M19 6.5v11M12 4v16" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">JammacusGym</h1>
        <p className="text-zinc-400 text-sm mb-8 max-w-xs">
          Your personal workout tracker. Log sets, track progress, and optimise your training.
        </p>
        <Button className="w-full max-w-xs" onClick={() => setStep('units')}>
          Get Started
        </Button>
      </div>
    );
  }

  if (step === 'units') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center page-enter">
        <h2 className="text-xl font-bold text-white mb-2">Weight units</h2>
        <p className="text-zinc-400 text-sm mb-6">You can change this later in Settings.</p>
        <div className="flex gap-3 w-full max-w-xs mb-8">
          {(['kg', 'lb'] as const).map(u => (
            <button
              key={u}
              onClick={() => { setUnits(u); haptic('selection'); }}
              className={`flex-1 py-4 rounded-xl text-lg font-semibold transition-all min-h-[44px] ${
                units === u
                  ? 'bg-brand text-white scale-105 shadow-lg shadow-brand/20'
                  : 'bg-surface-raised text-zinc-400 border border-white/10'
              }`}
            >
              {u.toUpperCase()}
            </button>
          ))}
        </div>
        <Button className="w-full max-w-xs" onClick={handleFinish}>
          Continue
        </Button>
      </div>
    );
  }

  return null;
}
