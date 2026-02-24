/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// @ts-nocheck
/**
 * Mock for motion/react - used in tests to avoid animation dependencies
 */
import React from 'react';

const createMotionComponent = (Tag: string) => {
  const Component = ({ children, ...props }: any) => {
    // Strip motion-specific props that are not valid HTML attributes
    const {
      initial,
      animate,
      exit,
      variants,
      transition,
      whileHover,
      whileTap,
      whileFocus,
      whileInView,
      drag,
      dragConstraints,
      dragElastic,
      onAnimationStart,
      onAnimationComplete,
      layout,
      layoutId,
      ...htmlProps
    } = props;
    return React.createElement(Tag, htmlProps, children);
  };
  Component.displayName = `motion.${Tag}`;
  return Component;
};

export const motion = new Proxy(
  {},
  {
    get(_target, prop: string) {
      return createMotionComponent(prop);
    },
  },
);

export const AnimatePresence = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const useAnimation = () => ({ start: vi.fn(), stop: vi.fn() });
export const useMotionValue = (initial: number) => ({ get: () => initial, set: vi.fn() });
export const useTransform = () => ({ get: () => 0 });
export const useSpring = (value: number) => ({ get: () => value });
export const useReducedMotion = () => false;
export const LazyMotion = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const domAnimation = {};
export const m = motion;
