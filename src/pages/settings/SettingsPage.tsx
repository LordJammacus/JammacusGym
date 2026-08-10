import { useState, useEffect, useRef } from 'react';
import { Card, Button, Modal } from '@/components/ui';
import type { UserSettings } from '@/types/entities';
import type { DayOfWeek } from '@/types/enums';
import { getSettings, updateSettings, db } from '@/db/database';
import { exportAllData, downloadBlob } from '@/utils/export';
import { readFileAsJSON, validateImportData, importData, type ImportValidation } from '@/utils/import';
import type { ExportData } from '@/utils/export';
import { haptic } from '@/utils/haptics';

const DAY_NAMES: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const PROGRESSION_STRATEGIES = [
  { value: 'double', label: 'Double Progression' },
  { value: 'weight', label: 'Weight' },
  { value: 'rep', label: 'Rep' },
  { value: 'rir', label: 'RIR-based' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'manual', label: 'Manual' },
] as const;

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importValidation, setImportValidation] = useState<ImportValidation | null>(null);
  const [importFile, setImportFile] = useState<ExportData | null>(null);
  const [importStrategy, setImportStrategy] = useState<'replace' | 'merge'>('merge');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setSettings(s);
    })();
  }, []);

  if (!settings) return null;

  const save = async (updates: Partial<UserSettings>) => {
    const updated = await updateSettings(updates);
    setSettings(updated);
  };

  const toggleDay = (day: DayOfWeek) => {
    const current = settings.availableTrainingDays ?? [1, 2, 3, 4, 5, 6];
    const next = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort((a, b) => a - b);
    save({ availableTrainingDays: next });
  };

  const handleExport = async () => {
    try {
      setExportStatus('Exporting...');
      const blob = await exportAllData();
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `jammacusgym-backup-${date}.json`);
      setExportStatus('Exported successfully');
      haptic('success');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      setExportStatus(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const raw = await readFileAsJSON(file);
      const validation = validateImportData(raw);
      setImportValidation(validation);
      if (validation.valid) {
        setImportFile(raw as ExportData);
      }
      setShowImport(true);
      setImportStatus(null);
    } catch (err) {
      setImportValidation({
        valid: false,
        errors: [err instanceof Error ? err.message : 'Failed to read file'],
        warnings: [],
        tables: [],
        exportedAt: null,
      });
      setShowImport(true);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      setImportStatus('Importing...');
      const result = await importData(importFile, importStrategy);
      setImportStatus(`Imported ${result.imported} records. ${result.skipped} skipped.`);
      haptic('success');
      const s = await getSettings();
      setSettings(s);
    } catch (err) {
      setImportStatus(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteAll = async () => {
    if (deleteText !== 'DELETE') return;
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
      }
    });
    haptic('heavy');
    window.location.href = '/';
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Units */}
      <Card className="space-y-3">
        <h3 className="text-sm text-zinc-400 font-medium">Units</h3>
        <div className="flex gap-2">
          {(['kg', 'lb'] as const).map(u => (
            <button
              key={u}
              onClick={() => save({ units: u })}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg min-h-[44px] transition-colors ${
                settings.units === u ? 'bg-brand text-white' : 'bg-surface-overlay text-zinc-400'
              }`}
            >
              {u === 'kg' ? 'Kilograms (kg)' : 'Pounds (lb)'}
            </button>
          ))}
        </div>
      </Card>

      {/* Default Progression Strategy */}
      <Card className="space-y-3">
        <h3 className="text-sm text-zinc-400 font-medium">Default Progression Strategy</h3>
        <div className="grid grid-cols-2 gap-2">
          {PROGRESSION_STRATEGIES.map(s => (
            <button
              key={s.value}
              onClick={() => save({ defaultProgressionStrategy: s.value })}
              className={`py-2.5 text-sm font-medium rounded-lg min-h-[44px] transition-colors ${
                settings.defaultProgressionStrategy === s.value ? 'bg-brand text-white' : 'bg-surface-overlay text-zinc-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Available Training Days */}
      <Card className="space-y-3">
        <h3 className="text-sm text-zinc-400 font-medium">Available Training Days</h3>
        <p className="text-xs text-zinc-500">Used for scheduling recommendations.</p>
        <div className="grid grid-cols-7 gap-1">
          {DAY_NAMES.map(d => {
            const active = (settings.availableTrainingDays ?? []).includes(d.value);
            return (
              <button
                key={d.value}
                onClick={() => toggleDay(d.value)}
                className={`py-2.5 text-xs font-medium rounded-lg min-h-[44px] transition-colors ${
                  active ? 'bg-brand text-white' : 'bg-surface-overlay text-zinc-500'
                }`}
              >
                {d.short}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Default Rest Timer */}
      <Card className="space-y-3">
        <h3 className="text-sm text-zinc-400 font-medium">Default Rest Timer</h3>
        <div className="flex gap-2">
          {[60, 90, 120, 180, 240].map(s => (
            <button
              key={s}
              onClick={() => save({ defaultRestSeconds: s })}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg min-h-[44px] transition-colors ${
                settings.defaultRestSeconds === s ? 'bg-brand text-white' : 'bg-surface-overlay text-zinc-400'
              }`}
            >
              {s >= 60 ? `${s / 60}m` : `${s}s`}
            </button>
          ))}
        </div>
      </Card>

      {/* Default RIR */}
      <Card className="space-y-3">
        <h3 className="text-sm text-zinc-400 font-medium">Default RIR Target</h3>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map(r => (
            <button
              key={r}
              onClick={() => save({ defaultRir: r })}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg min-h-[44px] transition-colors ${
                settings.defaultRir === r ? 'bg-brand text-white' : 'bg-surface-overlay text-zinc-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </Card>

      {/* Weight Increment */}
      <Card className="space-y-3">
        <h3 className="text-sm text-zinc-400 font-medium">Weight Increment</h3>
        <div className="flex gap-2">
          {[1, 1.25, 2, 2.5, 5].map(w => (
            <button
              key={w}
              onClick={() => save({ weightIncrement: w })}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg min-h-[44px] transition-colors ${
                settings.weightIncrement === w ? 'bg-brand text-white' : 'bg-surface-overlay text-zinc-400'
              }`}
            >
              {w}{settings.units}
            </button>
          ))}
        </div>
      </Card>

      {/* Week Start */}
      <Card className="space-y-3">
        <h3 className="text-sm text-zinc-400 font-medium">Week Starts On</h3>
        <div className="flex gap-2">
          {[
            { value: 0, label: 'Sunday' },
            { value: 1, label: 'Monday' },
          ].map(d => (
            <button
              key={d.value}
              onClick={() => save({ weekStartDay: d.value })}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg min-h-[44px] transition-colors ${
                settings.weekStartDay === d.value ? 'bg-brand text-white' : 'bg-surface-overlay text-zinc-400'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Data Management */}
      <h2 className="text-lg font-semibold pt-4">Data</h2>

      <Card className="space-y-3">
        <h3 className="text-sm text-zinc-400 font-medium">Backup & Restore</h3>
        <p className="text-xs text-zinc-500">Export all data as JSON. Import a previous backup to restore.</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={handleExport}>
            Export Data
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => fileInputRef.current?.click()}>
            Import Data
          </Button>
        </div>
        {exportStatus && (
          <p className={`text-xs ${exportStatus.includes('fail') ? 'text-red-400' : 'text-green-400'}`}>
            {exportStatus}
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Select backup file"
        />
      </Card>

      {/* Danger Zone */}
      <h2 className="text-lg font-semibold text-red-400 pt-4">Danger Zone</h2>

      <Card className="space-y-3 border border-red-900/40">
        <h3 className="text-sm text-red-400 font-medium">Delete All Data</h3>
        <p className="text-xs text-zinc-400">
          Permanently delete all workout history, programs, exercises, and settings. This cannot be undone.
        </p>
        <Button variant="danger" className="w-full" onClick={() => setShowDeleteConfirm(true)}>
          Delete Everything
        </Button>
      </Card>

      {/* Import modal */}
      <Modal open={showImport} onClose={() => { setShowImport(false); setImportValidation(null); setImportFile(null); setImportStatus(null); }} title="Import Data">
        <div className="space-y-4">
          {importValidation && !importValidation.valid && (
            <div className="space-y-2">
              {importValidation.errors.map((e, i) => (
                <p key={i} className="text-sm text-red-400">{e}</p>
              ))}
            </div>
          )}
          {importValidation?.valid && (
            <>
              {importValidation.exportedAt && (
                <p className="text-xs text-zinc-400">
                  Backup from: {new Date(importValidation.exportedAt).toLocaleString()}
                </p>
              )}
              <div className="space-y-1">
                {importValidation.tables.map(t => (
                  <div key={t.name} className="flex justify-between text-sm">
                    <span className="text-zinc-300 capitalize">{t.name.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-zinc-500">{t.count}</span>
                  </div>
                ))}
              </div>
              {importValidation.warnings.length > 0 && (
                <div className="space-y-1">
                  {importValidation.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-400">{w}</p>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <h4 className="text-sm text-zinc-300 font-medium">Import strategy</h4>
                <div className="flex gap-2">
                  {(['merge', 'replace'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setImportStrategy(s)}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg min-h-[44px] transition-colors ${
                        importStrategy === s ? 'bg-brand text-white' : 'bg-surface-overlay text-zinc-400'
                      }`}
                    >
                      {s === 'merge' ? 'Merge (keep newer)' : 'Replace all'}
                    </button>
                  ))}
                </div>
                {importStrategy === 'replace' && (
                  <p className="text-xs text-red-400">All existing data will be deleted first.</p>
                )}
              </div>
              <Button className="w-full" onClick={handleImport} disabled={importStatus === 'Importing...'}>
                {importStatus === 'Importing...' ? 'Importing...' : 'Import'}
              </Button>
            </>
          )}
          {importStatus && importStatus !== 'Importing...' && (
            <p className={`text-sm ${importStatus.includes('fail') ? 'text-red-400' : 'text-green-400'}`}>
              {importStatus}
            </p>
          )}
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setDeleteText(''); }} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">
            Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm.
          </p>
          <input
            type="text"
            value={deleteText}
            onChange={e => setDeleteText(e.target.value)}
            placeholder="Type DELETE"
            className="w-full bg-surface-overlay rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 text-sm border border-white/10 min-h-[44px]"
            autoComplete="off"
          />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleDeleteAll} disabled={deleteText !== 'DELETE'}>
              Delete All
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
