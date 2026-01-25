/**
 * useHaptic Hook - Provides haptic feedback for touch interactions
 *
 * Usage:
 * const { haptic } = useHaptic();
 * haptic('light'); // Quick tap (50ms)
 * haptic('medium'); // Success (100ms)
 * haptic('heavy'); // Error/warning (50-100-50ms)
 */

import { useCallback } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy';

export function useHaptic() {
  const haptic = useCallback((pattern: HapticPattern) => {
    // Check if vibration API is supported
    if (!navigator.vibrate) return;

    const patterns: Record<HapticPattern, number | number[]> = {
      light: [50],           // Quick tap
      medium: [100],         // Success
      heavy: [50, 100, 50]   // Error/warning
    };

    navigator.vibrate(patterns[pattern]);
  }, []);

  return { haptic };
}
