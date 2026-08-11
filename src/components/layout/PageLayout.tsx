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
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      <main
        className={
          hideNav
            ? 'flex-1 min-h-0 overflow-hidden flex flex-col'
            : 'flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[calc(4rem+env(safe-area-inset-bottom,0px))]'
        }
      >
        <div
          key={pageKey}
          className={hideNav ? 'page-enter flex-1 min-h-0 flex flex-col' : 'page-enter'}
        >
          {children}
        </div>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
