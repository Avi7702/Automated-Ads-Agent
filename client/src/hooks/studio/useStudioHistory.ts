/**
 * useStudioHistory — History panel state and generation loading
 */
import { useState, useEffect, useCallback } from 'react';
import { useHistoryPanelUrl } from '@/hooks/useUrlState';
import type { GenerationDTO, GenerationState } from './types';

export function useStudioHistory(deps: {
  generatedImage: string | null;
  setGeneratedImage: (url: string | null) => void;
  setGenerationId: (id: string | null) => void;
  setPrompt: (prompt: string) => void;
  setState: (state: GenerationState) => void;
}) {
  const { isHistoryOpen, selectedGenerationId, openHistory, closeHistory, selectGeneration } = useHistoryPanelUrl();
  const [historyPanelOpen, setHistoryPanelOpen] = useState(isHistoryOpen);

  // Sync history panel URL state
  useEffect(() => {
    setHistoryPanelOpen(isHistoryOpen);
  }, [isHistoryOpen]);

  // Load generation from URL
  useEffect(() => {
    if (selectedGenerationId && !deps.generatedImage) {
      fetch(`/api/generations/${selectedGenerationId}`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.imageUrl) {
            deps.setGeneratedImage(data.imageUrl);
            deps.setGenerationId(data.id);
            deps.setPrompt(data.prompt || '');
            deps.setState('result');
          }
        })
        .catch(console.error);
    }
  }, [selectedGenerationId, deps.generatedImage]);

  const handleLoadFromHistory = useCallback(
    (generation: GenerationDTO) => {
      deps.setGeneratedImage(generation.imageUrl);
      deps.setGenerationId(generation.id);
      deps.setPrompt(generation.prompt || '');
      deps.setState('result');
      setTimeout(() => {
        document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    [deps],
  );

  const handleHistoryToggle = useCallback(() => {
    if (historyPanelOpen) {
      closeHistory();
    } else {
      openHistory();
    }
    setHistoryPanelOpen(!historyPanelOpen);
  }, [historyPanelOpen, closeHistory, openHistory]);

  return {
    historyPanelOpen,
    setHistoryPanelOpen,
    handleLoadFromHistory,
    handleHistoryToggle,
    selectGeneration,
  };
}
