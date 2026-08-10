import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => { registration.update(); }, 60 * 60 * 1000);
      }
    },
  });

  const [dismissed, setDismissed] = useState(false);

  if (!needRefresh || dismissed) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-surface-raised border border-white/10 rounded-xl p-4 shadow-xl animate-[pageSlideIn_0.3s_ease-out]">
      <p className="text-sm text-white font-medium">Update available</p>
      <p className="text-xs text-zinc-400 mt-1">A new version of JammacusGym is ready.</p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setDismissed(true)}
          className="flex-1 py-2 text-sm text-zinc-400 rounded-lg bg-surface-overlay min-h-[44px]"
        >
          Later
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex-1 py-2 text-sm text-white font-medium rounded-lg bg-brand min-h-[44px]"
        >
          Update
        </button>
      </div>
    </div>
  );
}

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-900/90 text-amber-200 text-xs text-center py-1 font-medium" style={{ paddingTop: 'max(4px, env(safe-area-inset-top))' }}>
      Offline — data is saved locally
    </div>
  );
}
