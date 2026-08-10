import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './app/routes';
import { PageLayout } from './components/layout/PageLayout';
import { PWAUpdatePrompt, OfflineIndicator } from './components/ui/PWAUpdatePrompt';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';

export function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onboarded = localStorage.getItem('jammacus-onboarded');
    if (!onboarded) {
      setShowOnboarding(true);
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <BrowserRouter basename="/JammacusGym">
        <OfflineIndicator />
        <PWAUpdatePrompt />
        {showOnboarding ? (
          <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
        ) : (
          <PageLayout>
            <AppRoutes />
          </PageLayout>
        )}
      </BrowserRouter>
    </ErrorBoundary>
  );
}
