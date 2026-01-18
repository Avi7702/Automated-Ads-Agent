import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'wouter';

/**
 * useUrlState - Hook for managing URL query parameters as state
 *
 * Enables deep linking and URL-based state management without full page reloads.
 * Used for:
 * - History panel: /?view=history
 * - Generation detail: /?generation=:id
 * - Library tabs: /library?tab=products
 * - Settings sections: /settings?section=api-keys
 */
export function useUrlState() {
  const [location, setLocation] = useLocation();

  // Version counter to force searchParams re-computation when we update query params
  // This is needed because wouter's location only contains the pathname, not query params
  // So when navigating within the same path (e.g., /settings?section=brand → /settings?section=usage),
  // the location doesn't change and useMemo won't re-run without this trigger
  const [urlVersion, setUrlVersion] = useState(0);

  // Parse current URL search params from window.location
  // The location dependency ensures re-parsing when wouter updates the route
  // The urlVersion dependency ensures re-parsing when we programmatically update query params
  const searchParams = useMemo(() => {
    if (typeof window === 'undefined') {
      return new URLSearchParams();
    }
    // Use window.location.search as the single source of truth
    // This ensures we always have the current query params even with hash routing
    return new URLSearchParams(window.location.search);
  }, [location, urlVersion]);

  /**
   * Get a single query parameter value
   */
  const getParam = useCallback(
    (key: string): string | null => {
      return searchParams.get(key);
    },
    [searchParams]
  );

  /**
   * Get all values for a query parameter (for multi-value params)
   */
  const getParamAll = useCallback(
    (key: string): string[] => {
      return searchParams.getAll(key);
    },
    [searchParams]
  );

  /**
   * Check if a query parameter exists
   */
  const hasParam = useCallback(
    (key: string): boolean => {
      return searchParams.has(key);
    },
    [searchParams]
  );

  /**
   * Set a single query parameter value
   * Pass null to remove the parameter
   */
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const newParams = new URLSearchParams(searchParams);

      if (value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }

      const newSearch = newParams.toString();
      const basePath = location.split('?')[0];
      const newLocation = newSearch ? `${basePath}?${newSearch}` : basePath;

      setLocation(newLocation);
      setUrlVersion(v => v + 1); // Force searchParams re-computation
    },
    [searchParams, location, setLocation]
  );

  /**
   * Set multiple query parameters at once
   * Values of null will remove the parameter
   */
  const setParams = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams);

      for (const [key, value] of Object.entries(params)) {
        if (value === null) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }

      const newSearch = newParams.toString();
      const basePath = location.split('?')[0];
      const newLocation = newSearch ? `${basePath}?${newSearch}` : basePath;

      setLocation(newLocation);
      setUrlVersion(v => v + 1); // Force searchParams re-computation
    },
    [searchParams, location, setLocation]
  );

  /**
   * Toggle a boolean-like query parameter
   * If present, removes it; if absent, adds with value 'true'
   */
  const toggleParam = useCallback(
    (key: string) => {
      if (searchParams.has(key)) {
        setParam(key, null);
      } else {
        setParam(key, 'true');
      }
    },
    [searchParams, setParam]
  );

  /**
   * Clear all query parameters, optionally keeping specified keys
   */
  const clearParams = useCallback(
    (keepKeys: string[] = []) => {
      const newParams = new URLSearchParams();

      for (const key of keepKeys) {
        const value = searchParams.get(key);
        if (value !== null) {
          newParams.set(key, value);
        }
      }

      const newSearch = newParams.toString();
      const basePath = location.split('?')[0];
      const newLocation = newSearch ? `${basePath}?${newSearch}` : basePath;

      setLocation(newLocation);
      setUrlVersion(v => v + 1); // Force searchParams re-computation
    },
    [searchParams, location, setLocation]
  );

  /**
   * Navigate to a new path while preserving or replacing query params
   */
  const navigateWithParams = useCallback(
    (path: string, params?: Record<string, string | null>, preserveExisting = false) => {
      const newParams = preserveExisting
        ? new URLSearchParams(searchParams)
        : new URLSearchParams();

      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (value === null) {
            newParams.delete(key);
          } else {
            newParams.set(key, value);
          }
        }
      }

      const newSearch = newParams.toString();
      const newLocation = newSearch ? `${path}?${newSearch}` : path;

      setLocation(newLocation);
      setUrlVersion(v => v + 1); // Force searchParams re-computation
    },
    [searchParams, setLocation]
  );

  return {
    // Current state
    searchParams,
    location,

    // Getters
    getParam,
    getParamAll,
    hasParam,

    // Setters
    setParam,
    setParams,
    toggleParam,
    clearParams,

    // Navigation
    navigateWithParams,
  };
}

// ============================================
// CONVENIENCE HOOKS FOR SPECIFIC USE CASES
// ============================================

/**
 * useHistoryPanelUrl - Manage history panel URL state
 */
export function useHistoryPanelUrl() {
  const { getParam, setParam, hasParam } = useUrlState();

  const isHistoryOpen = hasParam('view') && getParam('view') === 'history';
  const selectedGenerationId = getParam('generation');

  const openHistory = useCallback(() => {
    setParam('view', 'history');
  }, [setParam]);

  const closeHistory = useCallback(() => {
    setParam('view', null);
  }, [setParam]);

  const selectGeneration = useCallback(
    (id: string | null) => {
      setParam('generation', id);
    },
    [setParam]
  );

  return {
    isHistoryOpen,
    selectedGenerationId,
    openHistory,
    closeHistory,
    selectGeneration,
  };
}

/**
 * useLibraryTabUrl - Manage library tab URL state
 */
export function useLibraryTabUrl() {
  const { getParam, setParam } = useUrlState();

  const activeTab = getParam('tab') || 'products';
  const selectedItemId = getParam('item');

  const setTab = useCallback(
    (tab: string) => {
      setParam('tab', tab);
    },
    [setParam]
  );

  const selectItem = useCallback(
    (id: string | null) => {
      setParam('item', id);
    },
    [setParam]
  );

  return {
    activeTab,
    selectedItemId,
    setTab,
    selectItem,
  };
}

/**
 * useSettingsSectionUrl - Manage settings section URL state
 */
export function useSettingsSectionUrl() {
  const { getParam, setParam } = useUrlState();

  const activeSection = getParam('section') || 'brand';

  const setSection = useCallback(
    (section: string) => {
      setParam('section', section);
    },
    [setParam]
  );

  return {
    activeSection,
    setSection,
  };
}
