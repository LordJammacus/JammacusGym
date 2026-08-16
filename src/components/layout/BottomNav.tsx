import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
  matchPrefixes?: string[];
}

const MORE_PREFIXES = ['/more', '/settings', '/exercises', '/body', '/notes', '/training'];

const navItems: NavItem[] = [
  {
    path: '/',
    label: 'Today',
    icon: <TodayIcon />,
  },
  {
    path: '/workout',
    label: 'Workout',
    icon: <WorkoutIcon />,
  },
  {
    path: '/programs',
    label: 'Programs',
    icon: <ProgramsIcon />,
  },
  {
    path: '/history',
    label: 'History',
    icon: <HistoryIcon />,
  },
  {
    path: '/analytics',
    label: 'Stats',
    icon: <StatsIcon />,
  },
  {
    path: '/more',
    label: 'More',
    icon: <MoreIcon />,
    matchPrefixes: MORE_PREFIXES,
  },
];

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="shrink-0 z-40 bg-surface border-t border-white/10 pb-safe-bottom overflow-hidden" aria-label="Main navigation">
      <div className="flex items-stretch h-14">
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}

function isItemActive(item: NavItem, pathname: string, navLinkActive: boolean) {
  if (item.matchPrefixes) {
    return item.matchPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }
  return navLinkActive;
}

function NavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      aria-label={item.label}
      className={({ isActive }) => {
        const active = isItemActive(item, pathname, isActive);
        return `flex flex-1 min-w-0 flex-col items-center justify-center h-full gap-0.5 px-0.5 transition-colors min-h-[44px] ${
          active ? 'text-brand-light' : 'text-zinc-400'
        }`;
      }}
    >
      <span className="w-5 h-5 shrink-0" aria-hidden="true">{item.icon}</span>
      <span className="text-[10px] leading-tight font-medium truncate w-full text-center">{item.label}</span>
    </NavLink>
  );
}

function TodayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function WorkoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M6.5 6.5h11M6.5 17.5h11M3 10.5h2M3 13.5h2M19 10.5h2M19 13.5h2M5 6.5v11M19 6.5v11M12 4v16" />
    </svg>
  );
}

function ProgramsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
      <circle cx="5" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}
