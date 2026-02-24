// @ts-nocheck
/**
 * Tests for useHaptic hook
 * - Calls navigator.vibrate with correct patterns
 * - Gracefully handles missing vibration API
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHaptic } from '../useHaptic';

describe('useHaptic', () => {
  let originalVibrate: typeof navigator.vibrate;

  beforeEach(() => {
    originalVibrate = navigator.vibrate;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'vibrate', {
      value: originalVibrate,
      writable: true,
      configurable: true,
    });
  });

  it('exposes a haptic function', () => {
    const { result } = renderHook(() => useHaptic());
    expect(typeof result.current.haptic).toBe('function');
  });

  it('calls navigator.vibrate with [50] for "light" pattern', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useHaptic());

    act(() => {
      result.current.haptic('light');
    });

    expect(vibrateMock).toHaveBeenCalledWith([50]);
  });

  it('calls navigator.vibrate with [100] for "medium" pattern', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useHaptic());

    act(() => {
      result.current.haptic('medium');
    });

    expect(vibrateMock).toHaveBeenCalledWith([100]);
  });

  it('calls navigator.vibrate with [50, 100, 50] for "heavy" pattern', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useHaptic());

    act(() => {
      result.current.haptic('heavy');
    });

    expect(vibrateMock).toHaveBeenCalledWith([50, 100, 50]);
  });

  it('does nothing when navigator.vibrate is not available', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useHaptic());

    // Should not throw
    expect(() => {
      act(() => {
        result.current.haptic('light');
      });
    }).not.toThrow();
  });
});
