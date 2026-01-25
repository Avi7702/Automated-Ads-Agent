/**
 * useRipple Hook - Material Design ripple effect
 *
 * Creates expanding circular ripple animations on click.
 * Works with any HTML element that has position: relative.
 *
 * Usage:
 * ```tsx
 * const { createRipple } = useRipple();
 *
 * <button onClick={createRipple}>
 *   Click me!
 * </button>
 * ```
 */

import { useCallback } from 'react';

export function useRipple() {
  const createRipple = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const element = event.currentTarget;

    // Create ripple span
    const ripple = document.createElement('span');

    // Calculate ripple size (diameter of largest dimension)
    const diameter = Math.max(element.clientWidth, element.clientHeight);
    const radius = diameter / 2;

    // Position ripple at click coordinates
    const rect = element.getBoundingClientRect();
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - rect.left - radius}px`;
    ripple.style.top = `${event.clientY - rect.top - radius}px`;
    ripple.classList.add('ripple');

    // Remove any existing ripples to prevent buildup
    const existingRipple = element.querySelector('.ripple');
    if (existingRipple) {
      existingRipple.remove();
    }

    // Add ripple to element
    element.appendChild(ripple);

    // Remove ripple after animation completes
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }, []);

  return { createRipple };
}
