// @ts-nocheck
/**
 * Tests for useKeyboardShortcuts hook
 * - Registers and fires callbacks on matching key events
 * - Ignores keys typed in inputs/textareas
 * - Respects disabled flag
 * - Modifier key matching (ctrlKey, metaKey, shiftKey)
 * - Cleans up event listeners on unmount
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

function fireKeyDown(key: string, options: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  window.dispatchEvent(event);
  return event;
}

describe('useKeyboardShortcuts — basic firing', () => {
  it('calls callback when matching key is pressed', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'g', callback, description: 'Generate' }]));

    act(() => {
      fireKeyDown('g');
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not call callback for different key', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'g', callback, description: 'Generate' }]));

    act(() => {
      fireKeyDown('h');
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('matching is case-insensitive', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'g', callback, description: 'Generate' }]));

    act(() => {
      fireKeyDown('G');
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('calls only the first matching shortcut', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'g', callback: cb1, description: 'First' },
        { key: 'g', callback: cb2, description: 'Second' },
      ]),
    );

    act(() => {
      fireKeyDown('g');
    });

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).not.toHaveBeenCalled();
  });
});

describe('useKeyboardShortcuts — disabled shortcuts', () => {
  it('does not call callback when shortcut is disabled', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'g', callback, description: 'Generate', disabled: true }]));

    act(() => {
      fireKeyDown('g');
    });

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('useKeyboardShortcuts — modifier keys', () => {
  it('calls callback when ctrlKey shortcut matches', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'g', ctrlKey: true, callback, description: 'Ctrl+G' }]));

    act(() => {
      fireKeyDown('g', { ctrlKey: true });
    });

    expect(callback).toHaveBeenCalled();
  });

  it('does not call callback when ctrlKey required but not pressed', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'g', ctrlKey: true, callback, description: 'Ctrl+G' }]));

    act(() => {
      fireKeyDown('g'); // no ctrlKey
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('treats metaKey as ctrlKey equivalent for ctrlKey shortcuts', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'g', ctrlKey: true, callback, description: 'Ctrl+G' }]));

    act(() => {
      fireKeyDown('g', { metaKey: true }); // Cmd+G on Mac
    });

    expect(callback).toHaveBeenCalled();
  });
});

describe('useKeyboardShortcuts — ignores input focus', () => {
  it('ignores keydown events from INPUT elements', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'g', callback, description: 'Generate' }]));

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', {
      key: 'g',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'target', { value: input, configurable: true });
    window.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
});

describe('useKeyboardShortcuts — cleanup', () => {
  it('removes event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useKeyboardShortcuts([{ key: 'g', callback: vi.fn(), description: 'Generate' }]),
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});
