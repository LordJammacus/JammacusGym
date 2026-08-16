import type { ExerciseProgressSummary, MetricDelta, SessionSetSnapshot } from '@/types/analytics';
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

export function formatSetScheme(
  point: { weight: number; reps: number; sets: SessionSetSnapshot[] },
  units: WeightUnit,
): string {
  if (point.sets.length === 0) {
    return `${formatWeight(point.weight, units)} × ${point.reps}`;
  }

  const firstWeight = point.sets[0]!.weight;
  const sameWeight = point.sets.every(s => s.weight === firstWeight);
  if (sameWeight) {
    return `${formatWeight(firstWeight, units)} × ${point.sets.map(s => s.reps).join('/')}`;
  }

  return point.sets.map(s => `${formatWeight(s.weight, units)}×${s.reps}`).join(', ');
}

export function SessionDelta({ delta, units }: { delta: MetricDelta; units: WeightUnit }) {
  const showWeight = delta.weight !== 0;
  const showReps = delta.totalReps !== 0;
  const showVolume = !showWeight && !showReps && delta.volumeLoad !== 0;

  if (!showWeight && !showReps && !showVolume) {
    return <DeltaText value={0} suffix=" reps" />;
  }

  return (
    <span className="font-medium">
      {showWeight && <DeltaText value={delta.weight} suffix={units} />}
      {showWeight && showReps && <span className="text-zinc-600"> · </span>}
      {showReps && <DeltaText value={delta.totalReps} suffix=" reps" />}
      {showVolume && <DeltaText value={delta.volumeLoad} suffix={` ${units}`} />}
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
  const sparkValues = summary.trend.volumeMovingAverages.length > 1
    ? summary.trend.volumeMovingAverages.map(p => p.value)
    : summary.trend.movingAverages.map(p => p.value);
  const lastSet = formatSetScheme(summary.latest, units);

  return (
    <button onClick={onClick} className="w-full text-left min-h-[44px]">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{summary.exerciseName}</h3>
            <TrendBadge direction={summary.trend.direction} />
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
            <span className="truncate">{lastSet}</span>
            {summary.vsPrevious && (
              <>
                <span className="text-zinc-600">·</span>
                <SessionDelta delta={summary.vsPrevious} units={units} />
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
  if (delta.totalReps !== 0) parts.push(formatDelta(delta.totalReps, ' reps'));
  else if (delta.reps !== 0) parts.push(formatDelta(delta.reps, ' best'));
  if (parts.length === 0 && delta.volumeLoad !== 0) return formatDelta(delta.volumeLoad, ` ${units}`);
  if (parts.length === 0) return formatDelta(delta.estimated1RM, ` ${units} e1RM`);
  return parts.join('  ');
}
