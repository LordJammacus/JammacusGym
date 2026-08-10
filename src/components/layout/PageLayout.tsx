import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  const location = useLocation();
  const hideNav = location.pathname === '/workout/active';
  const [pageKey, setPageKey] = useState(location.pathname);

  useEffect(() => {
    setPageKey(location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-col h-[100dvh]">
      <main className={`flex-1 overflow-y-auto ${hideNav ? '' : 'pb-16'}`}>
        <div key={pageKey} className="page-enter">
          {children}
        </div>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
