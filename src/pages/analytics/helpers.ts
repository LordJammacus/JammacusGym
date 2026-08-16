import type { TimePeriod, DateRange, PerformanceTrendResult } from '@/types/analytics';

export const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
];

export const chartColors = {
  brand: '#6366f1',
  green: '#22c55e',
  amber: '#f59e0b',
  cyan: '#06b6d4',
  red: '#ef4444',
  zinc: '#71717a',
};

export const setChartColors = ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#a855f7', '#71717a', '#f43f5e'];

export const chartTooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: 8,
};

export function getDateRange(period: TimePeriod): DateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();

  switch (period) {
    case '1w': start.setDate(start.getDate() - 7); break;
    case '1m': start.setMonth(start.getMonth() - 1); break;
    case '3m': start.setMonth(start.getMonth() - 3); break;
    case '6m': start.setMonth(start.getMonth() - 6); break;
    case '1y': start.setFullYear(start.getFullYear() - 1); break;
    case 'all': start.setFullYear(2000); break;
  }
  start.setHours(0, 0, 0, 0);

  return { start: start.toISOString(), end: end.toISOString() };
}

export function formatChartDate(d: string): string {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length < 3) return d;
  return `${parts[1]}/${parts[2]}`;
}

export function formatDisplayDate(iso: string): string {
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDelta(value: number, suffix = ''): string {
  if (value === 0) return `0${suffix}`;
  const rounded = Number.isInteger(value) ? String(value) : (Math.round(value * 10) / 10).toString();
  return `${value > 0 ? '+' : ''}${rounded}${suffix}`;
}

export function deltaClass(value: number): string {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-zinc-500';
}

export function trendLabel(direction: PerformanceTrendResult['direction']): string {
  switch (direction) {
    case 'improving': return 'Improving';
    case 'declining': return 'Declining';
    case 'stagnating': return 'Stalling';
  }
}

export function trendClass(direction: PerformanceTrendResult['direction']): string {
  switch (direction) {
    case 'improving': return 'text-green-400 bg-green-400/10';
    case 'declining': return 'text-red-400 bg-red-400/10';
    case 'stagnating': return 'text-amber-400 bg-amber-400/10';
  }
}
