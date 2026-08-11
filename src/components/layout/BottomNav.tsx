import { NavLink } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
}

import { ReactNode } from 'react';

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
    path: '/more',
    label: 'More',
    icon: <MoreIcon />,
  },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-white/10 pb-safe-bottom" aria-label="Main navigation">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({ item }: { item: NavItem }) {
  if (item.path === '/more') {
    return <MoreMenu />;
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      aria-label={item.label}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center w-16 h-full gap-0.5 transition-colors min-h-[44px] ${
          isActive ? 'text-brand-light' : 'text-zinc-400'
        }`
      }
    >
      <span className="w-6 h-6" aria-hidden="true">{item.icon}</span>
      <span className="text-[10px] font-medium">{item.label}</span>
    </NavLink>
  );
}

function MoreMenu() {
  return (
    <NavLink
      to="/settings"
      className={({ isActive }) =>
        `flex flex-col items-center justify-center w-16 h-full gap-0.5 transition-colors ${
          isActive ? 'text-brand-light' : 'text-zinc-400'
        }`
      }
    >
      <span className="w-6 h-6"><MoreIcon /></span>
      <span className="text-[10px] font-medium">More</span>
    </NavLink>
  );
}

function TodayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function WorkoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M6.5 6.5h11M6.5 17.5h11M3 10.5h2M3 13.5h2M19 10.5h2M19 13.5h2M5 6.5v11M19 6.5v11M12 4v16" />
    </svg>
  );
}

function ProgramsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}
