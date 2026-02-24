/**
 * Phase 4B: MotionCard - hover lift + shadow micro-interaction
 *
 * Wraps any card-like element with translateY(-2px) + shadow lift on hover.
 * Uses motion/react for hardware-accelerated transform + opacity only.
 */

import { motion } from 'motion/react';
import type { HTMLAttributes, ReactNode } from 'react';
import { MOTION, useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface MotionCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function MotionCard({ children, className, ...props }: MotionCardProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div className={cn('card-hover-lift', className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2, transition: MOTION.transitions.fast }}
      className={cn('card-hover-lift', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}