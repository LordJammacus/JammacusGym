import { describe, it, expect } from 'vitest';
import { unlockAudio, playRestCompleteChime, setAmbientAudioSession } from '@/utils/audio';
import { cancelRestAlert, prepareRestAlerts, scheduleRestAlert } from '@/utils/restAlert';

describe('audio', () => {
  it('does not throw when AudioContext is unavailable', async () => {
    expect(() => unlockAudio()).not.toThrow();
    await expect(playRestCompleteChime()).resolves.toBe(false);
  });

  it('does not claim a mixable session when the browser has none', () => {
    expect(setAmbientAudioSession()).toBe(false);
  });
});

describe('rest alerts', () => {
  it('schedules and cancels without throwing', () => {
    expect(() => {
      prepareRestAlerts();
      scheduleRestAlert(Date.now() + 60_000);
      cancelRestAlert();
    }).not.toThrow();
  });
});
