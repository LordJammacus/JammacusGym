import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Modal } from '@/components/ui';
import {
  LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { BodyMeasurement, RecoveryLog } from '@/types/entities';
import type { MeasurementType, RecoveryRating } from '@/types/enums';
import type { DateRange } from '@/types/analytics';
import {
  addBodyMeasurement,
  getBodyMeasurements,
  getLatestMeasurements,
} from '@/db/repositories/body';
import {
  upsertRecoveryLog,
  getRecoveryLog,
  getRecoveryLogs,
} from '@/db/repositories/body';
import { buildFatigueTimeline, correlateFatigueWithPerformance } from '@/engines/analytics';
import type { FatigueSnapshot, FatiguePerformanceCorrelation } from '@/engines/analytics';
import * as analyticsRepo from '@/db/repositories/analytics';
import { getSettings } from '@/db/database';

type Tab = 'measurements' | 'recovery';

const MEASUREMENT_TYPES: { value: MeasurementType; label: string; unit: 'kg' | 'cm' }[] = [
  { value: 'bodyweight', label: 'Bodyweight', unit: 'kg' },
  { value: 'waist', label: 'Waist', unit: 'cm' },
  { value: 'chest', label: 'Chest', unit: 'cm' },
  { value: 'left_arm', label: 'Left Arm', unit: 'cm' },
  { value: 'right_arm', label: 'Right Arm', unit: 'cm' },
  { value: 'left_thigh', label: 'Left Thigh', unit: 'cm' },
  { value: 'right_thigh', label: 'Right Thigh', unit: 'cm' },
  { value: 'hips', label: 'Hips', unit: 'cm' },
  { value: 'neck', label: 'Neck', unit: 'cm' },
  { value: 'shoulders', label: 'Shoulders', unit: 'cm' },
];

const RATING_LABELS: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Moderate',
  4: 'High',
  5: 'Very High',
};

const chartColors = {
  brand: '#6366f1',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  cyan: '#06b6d4',
};

export function BodyPage() {
  const [tab, setTab] = useState<Tab>('measurements');

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-2xl font-bold">Body & Recovery</h1>

      <div className="flex gap-1 bg-surface-overlay rounded-lg p-1">
        <button
          onClick={() => setTab('measurements')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'measurements' ? 'bg-brand text-white' : 'text-zinc-400'
          }`}
        >
          Measurements
        </button>
        <button
          onClick={() => setTab('recovery')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'recovery' ? 'bg-brand text-white' : 'text-zinc-400'
          }`}
        >
          Recovery
        </button>
      </div>

      {tab === 'measurements' ? <MeasurementsTab /> : <RecoveryTab />}
    </div>
  );
}

// --- Measurements Tab ---

function MeasurementsTab() {
  const [latest, setLatest] = useState<Map<MeasurementType, BodyMeasurement>>(new Map());
  const [showAdd, setShowAdd] = useState(false);
  const [chartType, setChartType] = useState<MeasurementType>('bodyweight');
  const [chartData, setChartData] = useState<{ date: string; value: number }[]>([]);

  const load = useCallback(async () => {
    const latestMap = await getLatestMeasurements();
    setLatest(latestMap);
    await loadChart(chartType);
  }, [chartType]);

  const loadChart = async (type: MeasurementType) => {
    const measurements = await getBodyMeasurements(type);
    setChartData(measurements.map(m => ({
      date: m.measuredAt.split('T')[0]!,
      value: m.value,
    })));
  };

  useEffect(() => { load(); }, [load]);

  const handleAdded = async () => {
    setShowAdd(false);
    await load();
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length < 3) return d;
    return `${parts[1]}/${parts[2]}`;
  };

  const unitLabel = MEASUREMENT_TYPES.find(m => m.value === chartType)?.unit ?? '';

  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={() => setShowAdd(true)}>
        Log Measurement
      </Button>

      {/* Latest measurements grid */}
      {latest.size > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {MEASUREMENT_TYPES.filter(t => latest.has(t.value)).map(t => {
            const m = latest.get(t.value)!;
            return (
              <Card key={t.value} className="space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">{t.label}</p>
                <p className="text-lg font-bold text-white">
                  {m.value} <span className="text-sm font-normal text-zinc-400">{m.unit}</span>
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(m.measuredAt).toLocaleDateString()}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Chart */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm text-zinc-400">Measurement History</h3>
        </div>
        <select
          className="w-full rounded-lg bg-surface-overlay border border-white/10 px-3 py-2 text-white text-sm mb-3"
          value={chartType}
          onChange={e => {
            const val = e.target.value as MeasurementType;
            setChartType(val);
            loadChart(val);
          }}
        >
          {MEASUREMENT_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value) => [`${value} ${unitLabel}`, '']}
              />
              <Line type="monotone" dataKey="value" stroke={chartColors.brand} strokeWidth={2} dot={{ r: 3, fill: chartColors.brand }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-zinc-500 text-sm py-6 text-center">
            {chartData.length === 1 ? 'Log one more measurement to see a chart.' : 'No data yet.'}
          </p>
        )}
      </Card>

      {showAdd && <AddMeasurementModal onClose={() => setShowAdd(false)} onSave={handleAdded} />}
    </div>
  );
}

function AddMeasurementModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [type, setType] = useState<MeasurementType>('bodyweight');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [useKg, setUseKg] = useState(true);

  useEffect(() => {
    (async () => {
      const settings = await getSettings();
      setUseKg(settings.units === 'kg');
    })();
  }, []);

  const selectedType = MEASUREMENT_TYPES.find(m => m.value === type)!;
  const unit = selectedType.unit === 'kg'
    ? (useKg ? 'kg' : 'lb')
    : (useKg ? 'cm' : 'in');

  const handleSave = async () => {
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal <= 0) return;
    setSaving(true);
    await addBodyMeasurement(type, numVal, unit, `${date}T12:00:00.000Z`, notes);
    onSave();
  };

  return (
    <Modal open onClose={onClose} title="Log Measurement">
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-zinc-400 font-medium">Type</label>
          <select
            className="w-full rounded-lg bg-surface-overlay border border-white/10 px-3 py-2.5 text-white text-sm"
            value={type}
            onChange={e => setType(e.target.value as MeasurementType)}
          >
            {MEASUREMENT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <Input
          label={`Value (${unit})`}
          type="number"
          step="0.1"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="0.0"
          inputMode="decimal"
        />

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />

        <Input
          label="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any notes..."
        />

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || !value}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Recovery Tab ---

function RecoveryTab() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]!);
  const [log, setLog] = useState<Partial<RecoveryLog>>({});
  const [saving, setSaving] = useState(false);
  const [fatigueTimeline, setFatigueTimeline] = useState<FatigueSnapshot[]>([]);
  const [correlation, setCorrelation] = useState<FatiguePerformanceCorrelation | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDay = useCallback(async (date: string) => {
    const existing = await getRecoveryLog(date);
    if (existing) {
      setLog(existing);
    } else {
      setLog({ date });
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    const range: DateRange = {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    };

    const [logs, instances] = await Promise.all([
      getRecoveryLogs(range),
      analyticsRepo.getCompletedInstances(range),
    ]);

    setFatigueTimeline(buildFatigueTimeline(logs));

    if (logs.length >= 4 && instances.length >= 4) {
      const instanceIds = instances.map(i => i.id);
      const eis = await analyticsRepo.getAllExerciseInstances(instanceIds);
      const eiIds = eis.map(ei => ei.id);
      const sets = await analyticsRepo.getAllCompletedSets(eiIds);
      setCorrelation(correlateFatigueWithPerformance(logs, instances, eis, sets));
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadDay(selectedDate); }, [selectedDate, loadDay]);
  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const saveLog = async () => {
    setSaving(true);
    await upsertRecoveryLog(selectedDate, {
      sleepQuality: log.sleepQuality,
      sleepHours: log.sleepHours,
      energy: log.energy,
      motivation: log.motivation,
      soreness: log.soreness,
      stress: log.stress,
      overallFatigue: log.overallFatigue,
      notes: log.notes,
    });
    setSaving(false);
    loadAnalytics();
  };

  const updateField = <K extends keyof RecoveryLog>(field: K, value: RecoveryLog[K]) => {
    setLog(prev => ({ ...prev, [field]: value }));
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length < 3) return d;
    return `${parts[1]}/${parts[2]}`;
  };

  return (
    <div className="space-y-4">
      {/* Date selector */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm text-zinc-400 font-medium">Recovery Log</h3>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="rounded-lg bg-surface-overlay border border-white/10 px-3 py-1.5 text-white text-sm"
          />
        </div>

        <RatingRow label="Sleep Quality" value={log.sleepQuality ?? null} onChange={v => updateField('sleepQuality', v)} labels={{ 1: 'Terrible', 2: 'Poor', 3: 'OK', 4: 'Good', 5: 'Great' }} />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-zinc-400">Sleep Hours</label>
          <input
            type="number"
            step="0.5"
            min="0"
            max="24"
            inputMode="decimal"
            value={log.sleepHours ?? ''}
            onChange={e => updateField('sleepHours', e.target.value ? parseFloat(e.target.value) : null)}
            className="w-full rounded-lg bg-surface-overlay border border-white/10 px-3 py-2.5 text-white text-sm min-h-[44px]"
            placeholder="Hours"
          />
        </div>

        <RatingRow label="Energy" value={log.energy ?? null} onChange={v => updateField('energy', v)} />
        <RatingRow label="Motivation" value={log.motivation ?? null} onChange={v => updateField('motivation', v)} />
        <RatingRow label="Soreness" value={log.soreness ?? null} onChange={v => updateField('soreness', v)} labels={{ 1: 'None', 2: 'Mild', 3: 'Moderate', 4: 'Significant', 5: 'Severe' }} />
        <RatingRow label="Stress" value={log.stress ?? null} onChange={v => updateField('stress', v)} />
        <RatingRow label="Overall Fatigue" value={log.overallFatigue ?? null} onChange={v => updateField('overallFatigue', v)} />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-zinc-400">Notes</label>
          <textarea
            value={log.notes ?? ''}
            onChange={e => updateField('notes', e.target.value)}
            className="w-full rounded-lg bg-surface-overlay border border-white/10 px-3 py-2.5 text-white text-sm resize-none"
            rows={2}
            placeholder="How are you feeling?"
          />
        </div>

        <Button className="w-full" onClick={saveLog} disabled={saving}>
          {saving ? 'Saving...' : 'Save Recovery Log'}
        </Button>
      </Card>

      {/* Fatigue timeline chart */}
      {fatigueTimeline.length > 1 && (
        <Card>
          <h3 className="text-sm text-zinc-400 mb-3">Fatigue Trend (90 days)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={fatigueTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#71717a' }} />
              <YAxis domain={[1, 5]} tick={{ fontSize: 11, fill: '#71717a' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value) => [Number(value).toFixed(1), 'Fatigue']}
              />
              <Line type="monotone" dataKey="compositeScore" stroke={chartColors.red} strokeWidth={2} dot={{ r: 2 }} name="Composite Fatigue" />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-zinc-500 mt-2">Higher = more fatigued. Scale 1-5.</p>
        </Card>
      )}

      {/* Fatigue-performance correlation */}
      {correlation && (
        <Card className="space-y-2">
          <h3 className="text-sm text-zinc-400">Fatigue vs Performance</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-lg font-bold text-green-400">
                {correlation.lowFatigueAvgPerformance > 0
                  ? `${Math.round(correlation.lowFatigueAvgPerformance / 1000 * 10) / 10}t`
                  : '—'}
              </p>
              <p className="text-xs text-zinc-500">Low fatigue avg vol</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-400">
                {correlation.highFatigueAvgPerformance > 0
                  ? `${Math.round(correlation.highFatigueAvgPerformance / 1000 * 10) / 10}t`
                  : '—'}
              </p>
              <p className="text-xs text-zinc-500">High fatigue avg vol</p>
            </div>
          </div>
          <p className="text-sm text-zinc-300">{correlation.summary}</p>
          <p className="text-xs text-zinc-500">{correlation.dataPoints} data points</p>
        </Card>
      )}

      {!loading && fatigueTimeline.length === 0 && (
        <Card>
          <p className="text-zinc-400 text-sm">
            Start logging your recovery to see fatigue trends and performance correlations.
          </p>
        </Card>
      )}
    </div>
  );
}

// --- Rating Row Component ---

function RatingRow({
  label,
  value,
  onChange,
  labels,
}: {
  label: string;
  value: RecoveryRating | null;
  onChange: (v: RecoveryRating | null) => void;
  labels?: Record<number, string>;
}) {
  const ratingLabels = labels ?? RATING_LABELS;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm text-zinc-400">{label}</label>
        {value != null && (
          <span className="text-xs text-zinc-500">{ratingLabels[value]}</span>
        )}
      </div>
      <div className="flex gap-1">
        {([1, 2, 3, 4, 5] as RecoveryRating[]).map(r => (
          <button
            key={r}
            onClick={() => onChange(value === r ? null : r)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors min-h-[44px] ${
              value === r
                ? r <= 2 ? 'bg-green-600 text-white' : r === 3 ? 'bg-amber-600 text-white' : 'bg-red-600 text-white'
                : 'bg-surface-overlay text-zinc-400'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
