type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const patterns: Record<HapticPattern, number[]> = {
  light: [10],
  medium: [20],
  heavy: [40],
  success: [15, 80, 15],
  warning: [30, 60, 30],
  error: [50, 30, 50, 30, 50],
  selection: [5],
};

export function haptic(pattern: HapticPattern = 'light') {
  if (!('vibrate' in navigator)) return;
  try {
    navigator.vibrate(patterns[pattern]!);
  } catch {
    // Vibration not supported
  }
}
