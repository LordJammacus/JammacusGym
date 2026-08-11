import type { WeightUnit } from '@/types/enums';

export function formatWeight(value: number, units: WeightUnit): string {
  const rounded = Number.isInteger(value) ? value.toString() : value.toFixed(1).replace(/\.0$/, '');
  return `${rounded}${units}`;
}

export function formatVolume(volume: number, units: WeightUnit): string {
  if (units === 'kg' && volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}t`;
  }
  if (units === 'lb' && volume >= 10000) {
    return `${(volume / 1000).toFixed(1)}k lb`;
  }
  return `${Math.round(volume)}${units}`;
}

export function roundToIncrement(value: number, increment: number): number {
  if (increment <= 0) return value;
  return Math.round(value / increment) * increment;
}
