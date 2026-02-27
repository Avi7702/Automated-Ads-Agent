/**
 * Tests for useIsMobile hook
 * - Returns boolean based on window.innerWidth
 * - Responds to matchMedia changes
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../use-mobile';

describe('useIsMobile', () => {
  let addEventListenerSpy: ReturnType<typeof vi.fn>;
  let removeEventListenerSpy: ReturnType<typeof vi.fn>;
  let changeHandler: (() => void) | null = null;

  const setupMatchMedia = (innerWidth: number) => {
    addEventListenerSpy = vi.fn((event, handler) => {
      if (event === 'change') {
        changeHandler = handler;
      }
    });
    removeEventListenerSpy = vi.fn();

    Object.defineProperty(window, 'innerWidth', {
      value: innerWidth,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
      }),
      writable: true,
      configurable: true,
    });
  };

  afterEach(() => {
    changeHandler = null;
  });

  it('returns false on desktop (innerWidth >= 768)', () => {
    setupMatchMedia(1024);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true on mobile (innerWidth < 768)', () => {
    setupMatchMedia(375);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false at exactly 768 (boundary)', () => {
    setupMatchMedia(768);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('registers change event listener on matchMedia', () => {
    setupMatchMedia(1024);

    renderHook(() => useIsMobile());

    expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('removes event listener on unmount', () => {
    setupMatchMedia(1024);

    const { unmount } = renderHook(() => useIsMobile());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('updates when window resizes to mobile', () => {
    setupMatchMedia(1024);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true,
        configurable: true,
      });
      changeHandler?.();
    });

    expect(result.current).toBe(true);
  });
});
