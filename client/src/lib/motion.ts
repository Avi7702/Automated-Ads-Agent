/**
 * Phase 4A: Motion System
 *
 * Centralized animation constants, presets, and accessibility utilities.
 * All motion values use the "motion/react" package (motion v12+).
 *
 * Usage:
 *   import { MOTION, useReducedMotion, motionSafe } from '@/lib/motion';
 *   <motion.div variants={motionSafe(MOTION.presets.fadeUp)} />
 */

import { useEffect, useState } from 'react';
import type { Variants, Transition } from 'motion/react';

/* ────────────────────────────────────────
   Duration tokens (ms)
   ──────────────────────────────────────── */
const durations = {
  instant: 0.1, // 100ms — micro-interactions
  fast: 0.2, // 200ms — hover/press feedback
  normal: 0.3, // 300ms — standard transitions
  slow: 0.5, // 500ms — emphasis / page elements
  page: 0.4, // 400ms — route transitions
} as const;

/* ────────────────────────────────────────
   Easing curves (cubic-bezier arrays)
   ──────────────────────────────────────── */
const easings = {
  /** Snappy — fast start, abrupt stop. Great for UI toggles. */
  snappy: [0.2, 0, 0, 1] as [number, number, number, number],
  /** Smooth — gentle acceleration and deceleration. Default for most animations. */
  smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
  /** Bounce — overshoots then settles. Use sparingly for delight moments. */
  bounce: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
} as const;

/* ────────────────────────────────────────
   Transition helpers
   ──────────────────────────────────────── */
const defaultTransition: Transition = {
  duration: durations.normal,
  ease: easings.smooth,
};

const fastTransition: Transition = {
  duration: durations.fast,
  ease: easings.snappy,
};

const slowTransition: Transition = {
  duration: durations.slow,
  ease: easings.smooth,
};

/* ────────────────────────────────────────
   Animation Presets (Variants)
   ──────────────────────────────────────── */
const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: defaultTransition,
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.bounce,
    },
  },
};

const slideIn: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: defaultTransition,
  },
};

const staggerChildren: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const presets = {
  fadeIn,
  fadeUp,
  scaleIn,
  slideIn,
  staggerChildren,
} as const;

/* ────────────────────────────────────────
   Exported MOTION constant
   ──────────────────────────────────────── */
export const MOTION = {
  durations,
  easings,
  transitions: {
    default: defaultTransition,
    fast: fastTransition,
    slow: slowTransition,
  },
  presets,
} as const;

/* ────────────────────────────────────────
   useReducedMotion hook
   ──────────────────────────────────────── */

/**
 * Returns `true` when the user has enabled "prefers-reduced-motion: reduce".
 * SSR-safe: defaults to `false` on the server.
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mql.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReduced(e.matches);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

/* ────────────────────────────────────────
   motionSafe utility
   ──────────────────────────────────────── */

/** Empty variants — no animation at all. */
const emptyVariants: Variants = {
  hidden: {},
  visible: {},
};

/**
 * Returns the given variants when motion is OK, or empty variants when
 * the user prefers reduced motion.
 *
 * Usage (inside a component):
 *   const reduced = useReducedMotion();
 *   <motion.div variants={motionSafe(MOTION.presets.fadeUp, reduced)} />
 */
export function motionSafe(variants: Variants, prefersReduced: boolean): Variants {
  return prefersReduced ? emptyVariants : variants;
}
