/**
 * useStudioKeyboard — Keyboard shortcuts for Studio
 */
import { useMemo } from 'react';
import { useKeyboardShortcuts, type ShortcutConfig } from '@/hooks/useKeyboardShortcuts';
import type { GenerationState } from './types';

interface UseStudioKeyboardDeps {
  state: GenerationState;
  canGenerate: boolean;
  generatedImage: string | null;
  handleGenerate: () => void;
  handleDownloadWithFeedback: () => void;
  handleReset: () => void;
  setShowKeyboardShortcuts: (fn: (v: boolean) => boolean) => void;
}

export function useStudioKeyboard(deps: UseStudioKeyboardDeps) {
  const shortcuts: ShortcutConfig[] = useMemo(
    () => [
      {
        key: 'g',
        ctrlKey: true,
        callback: () => {
          if (deps.state === 'idle' && deps.canGenerate) deps.handleGenerate();
        },
        description: 'Generate image',
        disabled: deps.state !== 'idle' || !deps.canGenerate,
      },
      {
        key: 'd',
        ctrlKey: true,
        callback: () => {
          if (deps.generatedImage) deps.handleDownloadWithFeedback();
        },
        description: 'Download image',
        disabled: !deps.generatedImage,
      },
      {
        key: 'r',
        ctrlKey: true,
        callback: deps.handleReset,
        description: 'Reset workspace',
        disabled: deps.state === 'idle' && !deps.generatedImage,
      },
      {
        key: '/',
        callback: () => document.getElementById('prompt-textarea')?.focus(),
        description: 'Focus prompt',
      },
      {
        key: '?',
        shiftKey: true,
        callback: () => deps.setShowKeyboardShortcuts((v: boolean) => !v),
        description: 'Toggle shortcuts help',
      },
    ],
    [deps],
  );

  useKeyboardShortcuts(shortcuts);

  return { shortcuts };
}
