// @ts-nocheck
/**
 * Tests for usePanelCollapse hook
 * - Initial state (defaults + localStorage restore)
 * - togglePanel
 * - setPanel
 * - localStorage persistence
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePanelCollapse } from '../usePanelCollapse';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('usePanelCollapse — Initial State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('starts with all panels expanded (false)', () => {
    const { result } = renderHook(() => usePanelCollapse());

    expect(result.current.panels.left).toBe(false);
    expect(result.current.panels.right).toBe(false);
    expect(result.current.panels.bottom).toBe(false);
  });

  it('restores saved state from localStorage', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({ left: true, right: false, bottom: true }));

    const { result } = renderHook(() => usePanelCollapse());

    expect(result.current.panels.left).toBe(true);
    expect(result.current.panels.right).toBe(false);
    expect(result.current.panels.bottom).toBe(true);
  });

  it('falls back to defaults when localStorage has invalid JSON', () => {
    localStorageMock.getItem.mockReturnValue('not-valid-json');

    const { result } = renderHook(() => usePanelCollapse());

    expect(result.current.panels.left).toBe(false);
    expect(result.current.panels.right).toBe(false);
    expect(result.current.panels.bottom).toBe(false);
  });

  it('exposes togglePanel and setPanel functions', () => {
    const { result } = renderHook(() => usePanelCollapse());

    expect(typeof result.current.togglePanel).toBe('function');
    expect(typeof result.current.setPanel).toBe('function');
  });
});

describe('usePanelCollapse — togglePanel()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('toggles left panel from false to true', () => {
    const { result } = renderHook(() => usePanelCollapse());

    act(() => {
      result.current.togglePanel('left');
    });

    expect(result.current.panels.left).toBe(true);
  });

  it('toggles left panel back to false', () => {
    const { result } = renderHook(() => usePanelCollapse());

    act(() => {
      result.current.togglePanel('left');
    });
    act(() => {
      result.current.togglePanel('left');
    });

    expect(result.current.panels.left).toBe(false);
  });

  it('toggles right panel independently', () => {
    const { result } = renderHook(() => usePanelCollapse());

    act(() => {
      result.current.togglePanel('right');
    });

    expect(result.current.panels.left).toBe(false);
    expect(result.current.panels.right).toBe(true);
    expect(result.current.panels.bottom).toBe(false);
  });

  it('toggles bottom panel independently', () => {
    const { result } = renderHook(() => usePanelCollapse());

    act(() => {
      result.current.togglePanel('bottom');
    });

    expect(result.current.panels.bottom).toBe(true);
  });

  it('saves updated state to localStorage after toggle', () => {
    const { result } = renderHook(() => usePanelCollapse());

    act(() => {
      result.current.togglePanel('left');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('studio-panel-state', expect.stringContaining('"left":true'));
  });
});

describe('usePanelCollapse — setPanel()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('sets left panel to collapsed', () => {
    const { result } = renderHook(() => usePanelCollapse());

    act(() => {
      result.current.setPanel('left', true);
    });

    expect(result.current.panels.left).toBe(true);
  });

  it('sets right panel to expanded', () => {
    // Start with right collapsed
    localStorageMock.getItem.mockReturnValue(JSON.stringify({ left: false, right: true, bottom: false }));
    const { result } = renderHook(() => usePanelCollapse());

    act(() => {
      result.current.setPanel('right', false);
    });

    expect(result.current.panels.right).toBe(false);
  });

  it('saves updated state to localStorage after setPanel', () => {
    const { result } = renderHook(() => usePanelCollapse());

    act(() => {
      result.current.setPanel('bottom', true);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'studio-panel-state',
      expect.stringContaining('"bottom":true'),
    );
  });

  it('does not affect other panels when setting one', () => {
    // Start fresh — no preloaded state
    localStorageMock.getItem.mockReturnValue(null);
    const { result } = renderHook(() => usePanelCollapse());

    act(() => {
      result.current.setPanel('left', true);
    });

    expect(result.current.panels.right).toBe(false);
    expect(result.current.panels.bottom).toBe(false);
  });
});
