import { describe, it, expect, beforeEach } from 'vitest';
import { db, getSettings, updateSettings } from '@/db/database';
import { DEFAULT_SETTINGS } from '@/constants/defaults';

describe('UserSettings', () => {
  beforeEach(async () => {
    await db.userSettings.clear();
  });

  it('returns default settings when none exist', async () => {
    const settings = await getSettings();
    expect(settings.id).toBe('default');
    expect(settings.units).toBe('kg');
    expect(settings.weekStartDay).toBe(1);
    expect(settings.defaultRestSeconds).toBe(120);
    expect(settings.restTimerAdjustSeconds).toBe(15);
    expect(settings.defaultRir).toBe(2);
    expect(settings.defaultProgressionStrategy).toBe('double');
    expect(settings.theme).toBe('dark');
    expect(settings.weightIncrement).toBe(2.5);
  });

  it('persists settings to database', async () => {
    await getSettings();
    const fromDb = await db.userSettings.get('default');
    expect(fromDb).not.toBeNull();
    expect(fromDb!.units).toBe('kg');
  });

  it('updates settings and returns updated values', async () => {
    await getSettings();
    const updated = await updateSettings({ units: 'lb', weightIncrement: 5 });
    expect(updated.units).toBe('lb');
    expect(updated.weightIncrement).toBe(5);
    expect(updated.id).toBe('default');
  });

  it('fills missing restTimerAdjustSeconds from defaults', async () => {
    const { restTimerAdjustSeconds: _omitted, ...legacy } = DEFAULT_SETTINGS;
    await db.userSettings.put(legacy as typeof DEFAULT_SETTINGS);
    const settings = await getSettings();
    expect(settings.restTimerAdjustSeconds).toBe(15);
  });

  it('preserves unchanged fields during update', async () => {
    await getSettings();
    const updated = await updateSettings({ units: 'lb' });
    expect(updated.defaultRestSeconds).toBe(DEFAULT_SETTINGS.defaultRestSeconds);
    expect(updated.theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it('updates the updatedAt timestamp', async () => {
    const initial = await getSettings();
    await new Promise((r) => setTimeout(r, 10));
    const updated = await updateSettings({ units: 'lb' });
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
      new Date(initial.createdAt).getTime()
    );
  });
});
