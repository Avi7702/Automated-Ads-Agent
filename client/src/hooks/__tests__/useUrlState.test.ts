// @ts-nocheck
/**
 * Tests for useUrlState hook and its convenience hooks
 * - getParam, hasParam, getParamAll
 * - setParam (add, update, delete)
 * - setParams (bulk update)
 * - toggleParam
 * - clearParams
 * - navigateWithParams
 * - useHistoryPanelUrl
 * - useLibraryTabUrl
 * - useSettingsSectionUrl
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock wouter before importing useUrlState
const mockSetLocation = vi.fn();
let mockLocation = '/';

vi.mock('wouter', () => ({
  useLocation: () => [mockLocation, mockSetLocation],
}));

import { useUrlState, useHistoryPanelUrl, useLibraryTabUrl, useSettingsSectionUrl } from '../useUrlState';

// Helper: set window.location.search for tests
function setWindowSearch(search: string) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search },
    writable: true,
    configurable: true,
  });
}

describe('useUrlState — getParam / hasParam / getParamAll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = '/';
    setWindowSearch('');
  });

  it('returns null for a missing param', () => {
    const { result } = renderHook(() => useUrlState());
    expect(result.current.getParam('tab')).toBeNull();
  });

  it('returns param value from window.location.search', () => {
    setWindowSearch('?tab=products');
    const { result } = renderHook(() => useUrlState());
    expect(result.current.getParam('tab')).toBe('products');
  });

  it('returns false for hasParam when param missing', () => {
    const { result } = renderHook(() => useUrlState());
    expect(result.current.hasParam('view')).toBe(false);
  });

  it('returns true for hasParam when param exists', () => {
    setWindowSearch('?view=history');
    const { result } = renderHook(() => useUrlState());
    expect(result.current.hasParam('view')).toBe(true);
  });

  it('returns empty array for getParamAll when param missing', () => {
    const { result } = renderHook(() => useUrlState());
    expect(result.current.getParamAll('ids')).toEqual([]);
  });
});

describe('useUrlState — setParam()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = '/';
    setWindowSearch('');
  });

  it('calls setLocation with param appended', () => {
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.setParam('tab', 'gallery');
    });

    expect(mockSetLocation).toHaveBeenCalledWith(expect.stringContaining('tab=gallery'));
  });

  it('removes param when value is null', () => {
    setWindowSearch('?tab=products');
    mockLocation = '/?tab=products';
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.setParam('tab', null);
    });

    const calledWith = mockSetLocation.mock.calls[0][0];
    expect(calledWith).not.toContain('tab');
  });

  it('navigates to base path without "?" when all params removed', () => {
    mockLocation = '/?tab=products';
    setWindowSearch('?tab=products');
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.setParam('tab', null);
    });

    expect(mockSetLocation).toHaveBeenCalledWith('/');
  });
});

describe('useUrlState — setParams()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = '/';
    setWindowSearch('');
  });

  it('sets multiple params at once', () => {
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.setParams({ tab: 'products', item: '123' });
    });

    const calledWith = mockSetLocation.mock.calls[0][0];
    expect(calledWith).toContain('tab=products');
    expect(calledWith).toContain('item=123');
  });

  it('removes params with null value', () => {
    setWindowSearch('?tab=products&item=123');
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.setParams({ tab: null });
    });

    const calledWith = mockSetLocation.mock.calls[0][0];
    expect(calledWith).not.toContain('tab=');
  });
});

describe('useUrlState — toggleParam()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = '/';
    setWindowSearch('');
  });

  it('adds param with value "true" when absent', () => {
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.toggleParam('sidebar');
    });

    const calledWith = mockSetLocation.mock.calls[0][0];
    expect(calledWith).toContain('sidebar=true');
  });

  it('removes param when present', () => {
    setWindowSearch('?sidebar=true');
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.toggleParam('sidebar');
    });

    const calledWith = mockSetLocation.mock.calls[0][0];
    expect(calledWith).not.toContain('sidebar');
  });
});

describe('useUrlState — clearParams()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = '/?tab=products&item=123';
    setWindowSearch('?tab=products&item=123');
  });

  it('clears all params', () => {
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.clearParams();
    });

    expect(mockSetLocation).toHaveBeenCalledWith('/');
  });

  it('keeps specified params when clearing', () => {
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.clearParams(['tab']);
    });

    const calledWith = mockSetLocation.mock.calls[0][0];
    expect(calledWith).toContain('tab=products');
    expect(calledWith).not.toContain('item=');
  });
});

describe('useUrlState — navigateWithParams()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = '/';
    setWindowSearch('');
  });

  it('navigates to new path with params', () => {
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.navigateWithParams('/settings', { section: 'api-keys' });
    });

    expect(mockSetLocation).toHaveBeenCalledWith('/settings?section=api-keys');
  });

  it('navigates to path without params when no params provided', () => {
    const { result } = renderHook(() => useUrlState());

    act(() => {
      result.current.navigateWithParams('/gallery');
    });

    expect(mockSetLocation).toHaveBeenCalledWith('/gallery');
  });
});

describe('useHistoryPanelUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = '/';
    setWindowSearch('');
  });

  it('isHistoryOpen is false when no view param', () => {
    const { result } = renderHook(() => useHistoryPanelUrl());
    expect(result.current.isHistoryOpen).toBe(false);
  });

  it('isHistoryOpen is true when view=history', () => {
    setWindowSearch('?view=history');
    const { result } = renderHook(() => useHistoryPanelUrl());
    expect(result.current.isHistoryOpen).toBe(true);
  });

  it('selectedGenerationId is null when no generation param', () => {
    const { result } = renderHook(() => useHistoryPanelUrl());
    expect(result.current.selectedGenerationId).toBeNull();
  });

  it('openHistory calls setParam with view=history', () => {
    const { result } = renderHook(() => useHistoryPanelUrl());

    act(() => {
      result.current.openHistory();
    });

    expect(mockSetLocation).toHaveBeenCalledWith(expect.stringContaining('view=history'));
  });

  it('closeHistory calls setParam with null', () => {
    setWindowSearch('?view=history');
    const { result } = renderHook(() => useHistoryPanelUrl());

    act(() => {
      result.current.closeHistory();
    });

    const calledWith = mockSetLocation.mock.calls[0][0];
    expect(calledWith).not.toContain('view=');
  });

  it('selectGeneration sets generation param', () => {
    const { result } = renderHook(() => useHistoryPanelUrl());

    act(() => {
      result.current.selectGeneration('gen-123');
    });

    expect(mockSetLocation).toHaveBeenCalledWith(expect.stringContaining('generation=gen-123'));
  });
});

describe('useLibraryTabUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = '/library';
    setWindowSearch('');
  });

  it('defaults activeTab to "products"', () => {
    const { result } = renderHook(() => useLibraryTabUrl());
    expect(result.current.activeTab).toBe('products');
  });

  it('returns tab from URL', () => {
    setWindowSearch('?tab=uploads');
    const { result } = renderHook(() => useLibraryTabUrl());
    expect(result.current.activeTab).toBe('uploads');
  });

  it('setTab updates the tab param', () => {
    const { result } = renderHook(() => useLibraryTabUrl());

    act(() => {
      result.current.setTab('uploads');
    });

    expect(mockSetLocation).toHaveBeenCalledWith(expect.stringContaining('tab=uploads'));
  });
});

describe('useSettingsSectionUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = '/settings';
    setWindowSearch('');
  });

  it('defaults activeSection to "brand"', () => {
    const { result } = renderHook(() => useSettingsSectionUrl());
    expect(result.current.activeSection).toBe('brand');
  });

  it('returns section from URL', () => {
    setWindowSearch('?section=api-keys');
    const { result } = renderHook(() => useSettingsSectionUrl());
    expect(result.current.activeSection).toBe('api-keys');
  });

  it('setSection navigates to new section', () => {
    const { result } = renderHook(() => useSettingsSectionUrl());

    act(() => {
      result.current.setSection('knowledge-base');
    });

    expect(mockSetLocation).toHaveBeenCalledWith(expect.stringContaining('section=knowledge-base'));
  });
});
