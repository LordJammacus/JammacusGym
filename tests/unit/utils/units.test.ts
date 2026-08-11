import { describe, it, expect } from 'vitest';
import { formatVolume, formatWeight, roundToIncrement } from '@/utils/units';

describe('units helpers', () => {
  it('formats weight with the selected unit', () => {
    expect(formatWeight(135, 'lb')).toBe('135lb');
    expect(formatWeight(60.5, 'kg')).toBe('60.5kg');
  });

  it('formats volume without forcing kg', () => {
    expect(formatVolume(1350, 'lb')).toBe('1350lb');
    expect(formatVolume(1350, 'kg')).toBe('1.4t');
  });

  it('rounds to the configured increment', () => {
    expect(roundToIncrement(137, 5)).toBe(135);
    expect(roundToIncrement(61.2, 2.5)).toBe(60);
  });
});
