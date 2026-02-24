/**
 * Phase 4B: PageStagger - staggered entrance animation for page content
 *
 * Wraps direct children with staggered fadeUp entrance on mount.
 */

import { motion } from 'motion/react';
import type { HTMLAttributes, ReactNode } from 'react';
import { MOTION, useReducedMotion, motionSafe } from '@/lib/motion';

interface PageStaggerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function PageStagger({ children, className, ...props }: PageStaggerProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={MOTION.presets.staggerChildren}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Wrap individual stagger children with this for the fadeUp effect */
export function StaggerItem({ children, className, ...props }: PageStaggerProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div variants={motionSafe(MOTION.presets.fadeUp, reduced)} className={className} {...props}>
      {children}
    </motion.div>
  );
}