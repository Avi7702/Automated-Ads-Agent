import { useState, useCallback } from "react";

interface PanelCollapseState {
  left: boolean;
  right: boolean;
  bottom: boolean;
}

const STORAGE_KEY = "studio-panel-state";

function loadState(): PanelCollapseState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as PanelCollapseState;
    }
  } catch {
    // Ignore parse errors
  }
  return { left: false, right: false, bottom: false };
}

function saveState(state: PanelCollapseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function usePanelCollapse() {
  const [panels, setPanels] = useState<PanelCollapseState>(loadState);

  const togglePanel = useCallback((panel: keyof PanelCollapseState) => {
    setPanels((prev) => {
      const next = { ...prev, [panel]: !prev[panel] };
      saveState(next);
      return next;
    });
  }, []);

  const setPanel = useCallback((panel: keyof PanelCollapseState, collapsed: boolean) => {
    setPanels((prev) => {
      const next = { ...prev, [panel]: collapsed };
      saveState(next);
      return next;
    });
  }, []);

  return { panels, togglePanel, setPanel };
}
