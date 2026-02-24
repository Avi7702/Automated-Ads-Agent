/**
 * Phase 4A: View Transition Navigation
 *
 * Wraps wouter's navigate with the View Transitions API for smooth
 * cross-page animations. Falls back gracefully on unsupported browsers.
 *
 * Usage:
 *   import { useNavigateWithTransition } from '@/lib/navigate';
 *   const navigate = useNavigateWithTransition();
 *   navigate('/gallery');
 */

import { useCallback } from 'react';
import { useLocation } from 'wouter';

/** Type guard for View Transitions API support */
function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document;
}

/** Check if user prefers reduced motion */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Navigate with View Transition API.
 * Wraps wouter's setLocation to use document.startViewTransition when available.
 *
 * - If the browser supports View Transitions and the user hasn't requested
 *   reduced motion, the navigation is wrapped in a view transition.
 * - Otherwise, navigation happens immediately (no animation).
 */
export function useNavigateWithTransition() {
  const [, setLocation] = useLocation();

  const navigate = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      const shouldAnimate = supportsViewTransitions() && !prefersReducedMotion();

      if (shouldAnimate) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document as any).startViewTransition(() => {
          setLocation(to, options);
        });
      } else {
        setLocation(to, options);
      }
    },
    [setLocation],
  );

  return navigate;
}

/**
 * Trigger a view transition for a non-navigation DOM update.
 * Useful for animating content changes within the same page.
 */
export function withViewTransition(callback: () => void): void {
  const shouldAnimate = supportsViewTransitions() && !prefersReducedMotion();

  if (shouldAnimate) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).startViewTransition(callback);
  } else {
    callback();
  }
}
