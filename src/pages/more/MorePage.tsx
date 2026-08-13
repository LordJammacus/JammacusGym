import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface MoreItem {
  path: string;
  label: string;
  description: string;
  icon: ReactNode;
}

const items: MoreItem[] = [
  {
    path: '/exercises',
    label: 'Exercises',
    description: 'Library and exercise setup',
    icon: <DumbbellIcon />,
  },
  {
    path: '/training',
    label: 'Training Manager',
    description: 'Recommendations, recovery, blocks',
    icon: <ClipboardIcon />,
  },
  {
    path: '/body',
    label: 'Body & Recovery',
    description: 'Measurements, sleep, fatigue',
    icon: <BodyIcon />,
  },
  {
    path: '/notes',
    label: 'Notes',
    description: 'Training diary',
    icon: <NotesIcon />,
  },
  {
    path: '/settings',
    label: 'Settings',
    description: 'Units, backups, preferences',
    icon: <SettingsIcon />,
  },
];

export function MorePage() {
  const navigate = useNavigate();

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-2xl font-bold">More</h1>
      <div className="space-y-2">
        {items.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="w-full text-left bg-surface-raised rounded-xl p-4 flex items-center gap-3 min-h-[44px] active:bg-surface-overlay"
          >
            <span className="w-10 h-10 rounded-lg bg-surface-overlay text-brand-light flex items-center justify-center shrink-0">
              {item.icon}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-medium">{item.label}</span>
              <span className="block text-xs text-zinc-500">{item.description}</span>
            </span>
            <span className="text-zinc-600" aria-hidden="true">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DumbbellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M6.5 6.5h11M6.5 17.5h11M3 10.5h2M3 13.5h2M19 10.5h2M19 13.5h2M5 6.5v11M19 6.5v11M12 4v16" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
  );
}

function BodyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v6M9 21l3-8 3 8M7 11h10" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
