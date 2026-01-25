/**
 * useKeyboardShortcuts Hook - Power user keyboard navigation
 *
 * Registers global keyboard shortcuts with optional Ctrl/Cmd modifier.
 * Automatically handles cleanup on unmount.
 *
 * Usage:
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: 'g', ctrlKey: true, callback: handleGenerate, description: 'Generate image' },
 *   { key: '/', callback: handleFocusSearch, description: 'Focus search' }
 * ]);
 * ```
 */

import { useEffect } from 'react';

export interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  callback: () => void;
  description: string;
  disabled?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when typing in input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow "/" to focus search even in inputs
        if (event.key !== '/') {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        // Skip disabled shortcuts
        if (shortcut.disabled) continue;

        // Check if modifier keys match
        const ctrlMatch = shortcut.ctrlKey === undefined || shortcut.ctrlKey === (event.ctrlKey || event.metaKey);
        const metaMatch = shortcut.metaKey === undefined || shortcut.metaKey === event.metaKey;
        const shiftMatch = shortcut.shiftKey === undefined || shortcut.shiftKey === event.shiftKey;

        // Check if key matches (case insensitive)
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch) {
          event.preventDefault();
          shortcut.callback();
          break; // Only trigger first matching shortcut
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  return shortcuts;
}
