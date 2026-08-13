import type { ExerciseProgressSummary, MetricDelta } from '@/types/analytics';
import type { WeightUnit } from '@/types/enums';
import { formatWeight } from '@/utils/units';
import { deltaClass, formatDelta, trendClass, trendLabel } from './helpers';

export function Sparkline({ values, className = '' }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 72;
  const h = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 2 - ((v - min) / range) * (h - 4);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className={className} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function TrendBadge({ direction }: { direction: ExerciseProgressSummary['trend']['direction'] }) {
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${trendClass(direction)}`}>
      {trendLabel(direction)}
    </span>
  );
}

export function DeltaText({ value, suffix = '' }: { value: number; suffix?: string }) {
  return (
    <span className={`font-medium ${deltaClass(value)}`}>
      {formatDelta(value, suffix)}
    </span>
  );
}

export function ExerciseProgressRow({
  summary,
  units,
  onClick,
}: {
  summary: ExerciseProgressSummary;
  units: WeightUnit;
  onClick: () => void;
}) {
  const sparkValues = summary.trend.movingAverages.map(p => p.value);
  const lastSet = `${formatWeight(summary.latest.weight, units)} × ${summary.latest.reps}`;

  return (
    <button onClick={onClick} className="w-full text-left min-h-[44px]">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{summary.exerciseName}</h3>
            <TrendBadge direction={summary.trend.direction} />
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
            <span>{lastSet}</span>
            {summary.vsPrevious && (
              <>
                <span className="text-zinc-600">·</span>
                <DeltaText value={summary.vsPrevious.estimated1RM} suffix={` ${units} e1RM`} />
              </>
            )}
          </div>
        </div>
        <Sparkline
          values={sparkValues}
          className={
            summary.trend.direction === 'improving' ? 'text-green-400' :
            summary.trend.direction === 'declining' ? 'text-red-400' : 'text-amber-400'
          }
        />
      </div>
    </button>
  );
}

export function formatMetricDelta(delta: MetricDelta, units: WeightUnit): string {
  const parts: string[] = [];
  if (delta.weight !== 0) parts.push(formatDelta(delta.weight, units));
  if (delta.reps !== 0) parts.push(formatDelta(delta.reps, ' reps'));
  if (parts.length === 0) return formatDelta(delta.estimated1RM, ` ${units} e1RM`);
  return parts.join('  ');
}
