// @ts-nocheck
/**
 * Phase 4B: PageStagger — staggered entrance animation for page content
 *
 * Wraps direct children with staggered fadeUp entrance on mount.
 * Uses motion/react AnimatePresence + staggerChildren preset.
 *
 * Usage:
 *   import { PageStagger } from '@/components/ui/page-stagger';
 *   <PageStagger>
 *     <h1>Title</h1>
 *     <div>Content block 1</div>
 *     <div>Content block 2</div>
 *   </PageStagger>
 */

import { motion } from 'motion/react';
import { MOTION, useReducedMotion, motionSafe } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface PageStaggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
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
