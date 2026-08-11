import type { StoredRecommendation, RecommendationStatus } from '@/types/recommendations';
import { Card, Button } from '@/components/ui';

interface RecommendationCardProps {
  recommendation: StoredRecommendation;
  onRespond: (id: string, status: RecommendationStatus) => void;
  compact?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  schedule: 'Schedule',
  volume: 'Volume',
  deload: 'Recovery',
  exercise: 'Exercise',
  intensity: 'Intensity',
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-blue-400',
};

export function RecommendationCard({
  recommendation: rec,
  onRespond,
  compact = false,
}: RecommendationCardProps) {
  const typeLabel = TYPE_LABELS[rec.type] ?? 'Tip';
  const borderStyle = PRIORITY_STYLES[rec.priority] ?? '';

  return (
    <Card className={`border-l-4 ${borderStyle} space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-0.5">{typeLabel}</p>
          <h3 className="font-semibold text-white text-sm leading-snug">{rec.title}</h3>
        </div>
        <ConfidenceBadge value={rec.confidence} />
      </div>

      <p className="text-sm text-zinc-400 leading-relaxed">{rec.reasoning}</p>

      {!compact && (
        <p className="text-sm text-brand-light">{rec.suggestedAction}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onRespond(rec.id, 'accepted')}
        >
          Got it
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onRespond(rec.id, 'dismissed')}
        >
          Dismiss
        </Button>
      </div>
    </Card>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? 'text-green-400' : value >= 0.5 ? 'text-amber-400' : 'text-zinc-500';
  return (
    <span className={`text-xs ${color} shrink-0`}>{pct}%</span>
  );
}
