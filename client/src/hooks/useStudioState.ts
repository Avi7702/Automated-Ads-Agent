import { useCallback, useMemo } from 'react';
import { useStudioContext, SelectedSuggestion } from '@/contexts/StudioContext';
import type { Product, AdSceneTemplate } from '@shared/schema';
import type { GenerationRecipe, GenerationMode, IdeaBankMode } from '@shared/types/ideaBank';
import type { AnalyzedUpload } from '@/types/analyzedUpload';

/**
 * useStudioState - Primary hook for accessing Studio state and actions
 *
 * Provides:
 * - Direct state access
 * - Derived state (computed values)
 * - Type-safe action dispatchers
 */
export function useStudioState() {
  const { state, dispatch } = useStudioContext();

  // ============================================
  // DERIVED STATE
  // ============================================

  const hasProducts = state.selectedProducts.length > 0;
  const hasUploads = state.tempUploads.length > 0;
  const hasImages = hasProducts || hasUploads;
  const hasPrompt = state.prompt.trim().length > 0;
  const canGenerate = hasImages && hasPrompt;
  const isGenerating = state.generationState === 'generating';
  const hasResult = state.generationState === 'result';
  const isIdle = state.generationState === 'idle';

  // Count of selected/confirmed uploads
  const confirmedUploads = useMemo(
    () => state.tempUploads.filter((u) => u.status === 'confirmed'),
    [state.tempUploads],
  );

  // All image URLs for generation
  const allImageUrls = useMemo(() => {
    const productUrls = state.selectedProducts.map((p) => p.cloudinaryUrl).filter(Boolean) as string[];
    const uploadUrls = confirmedUploads.map((u) => u.previewUrl);
    return [...productUrls, ...uploadUrls];
  }, [state.selectedProducts, confirmedUploads]);

  // ============================================
  // ACTION DISPATCHERS
  // ============================================

  // Generation Actions
  const setGenerating = useCallback(() => {
    dispatch({ type: 'SET_GENERATION_STATE', state: 'generating' });
  }, [dispatch]);

  const setResult = useCallback(
    (image: string, id: string) => {
      dispatch({ type: 'SET_GENERATED_IMAGE', image, id });
    },
    [dispatch],
  );

  const clearGeneration = useCallback(() => {
    dispatch({ type: 'CLEAR_GENERATION' });
  }, [dispatch]);

  // Product Actions
  const selectProduct = useCallback(
    (product: Product) => {
      dispatch({ type: 'SELECT_PRODUCT', product });
    },
    [dispatch],
  );

  const deselectProduct = useCallback(
    (productId: string) => {
      dispatch({ type: 'DESELECT_PRODUCT', productId });
    },
    [dispatch],
  );

  const clearProducts = useCallback(() => {
    dispatch({ type: 'CLEAR_PRODUCTS' });
  }, [dispatch]);

  const setProducts = useCallback(
    (products: Product[]) => {
      dispatch({ type: 'SET_PRODUCTS', products });
    },
    [dispatch],
  );

  // Template Actions
  const selectTemplate = useCallback(
    (template: AdSceneTemplate) => {
      dispatch({ type: 'SELECT_TEMPLATE', template });
    },
    [dispatch],
  );

  const clearTemplate = useCallback(() => {
    dispatch({ type: 'CLEAR_TEMPLATE' });
  }, [dispatch]);

  // Upload Actions
  const setUploads = useCallback(
    (uploads: AnalyzedUpload[]) => {
      dispatch({ type: 'SET_UPLOADS', uploads });
    },
    [dispatch],
  );

  const addUpload = useCallback(
    (upload: AnalyzedUpload) => {
      dispatch({ type: 'ADD_UPLOAD', upload });
    },
    [dispatch],
  );

  const updateUpload = useCallback(
    (id: string, updates: Partial<AnalyzedUpload>) => {
      dispatch({ type: 'UPDATE_UPLOAD', id, updates });
    },
    [dispatch],
  );

  const removeUpload = useCallback(
    (id: string) => {
      dispatch({ type: 'REMOVE_UPLOAD', id });
    },
    [dispatch],
  );

  const clearUploads = useCallback(() => {
    dispatch({ type: 'CLEAR_UPLOADS' });
  }, [dispatch]);

  // Prompt Actions
  const setPrompt = useCallback(
    (prompt: string) => {
      dispatch({ type: 'SET_PROMPT', prompt });
    },
    [dispatch],
  );

  const setSuggestion = useCallback(
    (suggestion: SelectedSuggestion | null) => {
      dispatch({ type: 'SET_SUGGESTION', suggestion });
    },
    [dispatch],
  );

  // Output Settings Actions
  const setPlatform = useCallback(
    (platform: string) => {
      dispatch({ type: 'SET_PLATFORM', platform });
    },
    [dispatch],
  );

  const setAspectRatio = useCallback(
    (aspectRatio: string) => {
      dispatch({ type: 'SET_ASPECT_RATIO', aspectRatio });
    },
    [dispatch],
  );

  const setResolution = useCallback(
    (resolution: '1K' | '2K' | '4K') => {
      dispatch({ type: 'SET_RESOLUTION', resolution });
    },
    [dispatch],
  );

  // Mode Actions
  const setIdeaBankMode = useCallback(
    (mode: IdeaBankMode) => {
      dispatch({ type: 'SET_IDEABANK_MODE', mode });
    },
    [dispatch],
  );

  const setGenerationMode = useCallback(
    (mode: GenerationMode) => {
      dispatch({ type: 'SET_GENERATION_MODE', mode });
    },
    [dispatch],
  );

  const setTemplateForMode = useCallback(
    (template: AdSceneTemplate | null) => {
      dispatch({ type: 'SET_TEMPLATE_FOR_MODE', template });
    },
    [dispatch],
  );

  const setRecipe = useCallback(
    (recipe: GenerationRecipe | undefined) => {
      dispatch({ type: 'SET_RECIPE', recipe });
    },
    [dispatch],
  );

  // Copy Actions
  const setGeneratedCopy = useCallback(
    (copy: string) => {
      dispatch({ type: 'SET_GENERATED_COPY', copy });
    },
    [dispatch],
  );

  // Reset
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  // Load from history
  const loadFromHistory = useCallback(
    (payload: Parameters<typeof dispatch>[0] extends { type: 'LOAD_FROM_HISTORY'; payload: infer P } ? P : never) => {
      dispatch({ type: 'LOAD_FROM_HISTORY', payload });
    },
    [dispatch],
  );

  return {
    // State
    state,
    dispatch,

    // Derived State
    hasProducts,
    hasUploads,
    hasImages,
    hasPrompt,
    canGenerate,
    isGenerating,
    hasResult,
    isIdle,
    confirmedUploads,
    allImageUrls,

    // Generation Actions
    setGenerating,
    setResult,
    clearGeneration,

    // Product Actions
    selectProduct,
    deselectProduct,
    clearProducts,
    setProducts,

    // Template Actions
    selectTemplate,
    clearTemplate,

    // Upload Actions
    setUploads,
    addUpload,
    updateUpload,
    removeUpload,
    clearUploads,

    // Prompt Actions
    setPrompt,
    setSuggestion,

    // Output Settings Actions
    setPlatform,
    setAspectRatio,
    setResolution,

    // Mode Actions
    setIdeaBankMode,
    setGenerationMode,
    setTemplateForMode,
    setRecipe,

    // Copy Actions
    setGeneratedCopy,

    // Utility Actions
    reset,
    loadFromHistory,
  };
}
