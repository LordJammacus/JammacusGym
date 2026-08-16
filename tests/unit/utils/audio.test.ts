import { describe, it, expect } from 'vitest';
import { unlockAudio, playRestCompleteChime } from '@/utils/audio';

describe('audio', () => {
  it('does not throw when AudioContext is unavailable', () => {
    expect(() => unlockAudio()).not.toThrow();
    expect(() => playRestCompleteChime()).not.toThrow();
  });
});
