import { useCallback, useMemo } from 'react';
import {
  useStudioContext,
  type SelectedSuggestion,
  type CollapsedSections,
  type PriceEstimate,
  type PlanContext,
  type CopyResult,
} from '@/contexts/StudioContext';
import type { Product, AdSceneTemplate, PerformingAdTemplate } from '@shared/schema';
import type { GenerationRecipe, GenerationMode, IdeaBankMode } from '@shared/types/ideaBank';
import type { AnalyzedUpload } from '@/types/analyzedUpload';
import type { ContentTemplate } from '@shared/contentTemplates';

/**
 * useStudioState - Primary hook for accessing Studio state and actions
 *
 * Provides:
 * - Direct state access
 * - Derived state (computed values)
 * - Type-safe action dispatchers for ALL 56 state fields
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
  // ORIGINAL ACTION DISPATCHERS (16 fields)
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

  // ============================================
  // NEW ACTION DISPATCHERS (S2-11: 40 fields)
  // ============================================

  // UI: Section State
  const setCollapsedSections = useCallback(
    (sections: CollapsedSections) => {
      dispatch({ type: 'SET_COLLAPSED_SECTIONS', sections });
    },
    [dispatch],
  );

  const toggleSection = useCallback(
    (section: keyof CollapsedSections) => {
      dispatch({ type: 'TOGGLE_SECTION', section });
    },
    [dispatch],
  );

  const setCurrentSection = useCallback(
    (section: string) => {
      dispatch({ type: 'SET_CURRENT_SECTION', section });
    },
    [dispatch],
  );

  const setShowContextBar = useCallback(
    (visible: boolean) => {
      dispatch({ type: 'SET_SHOW_CONTEXT_BAR', visible });
    },
    [dispatch],
  );

  const setShowStickyGenerate = useCallback(
    (visible: boolean) => {
      dispatch({ type: 'SET_SHOW_STICKY_GENERATE', visible });
    },
    [dispatch],
  );

  // UI: Quick Start
  const setQuickStartMode = useCallback(
    (enabled: boolean) => {
      dispatch({ type: 'SET_QUICK_START_MODE', enabled });
    },
    [dispatch],
  );

  const setQuickStartPrompt = useCallback(
    (prompt: string) => {
      dispatch({ type: 'SET_QUICK_START_PROMPT', prompt });
    },
    [dispatch],
  );

  // UI: Price Estimate
  const setPriceEstimate = useCallback(
    (estimate: PriceEstimate | null) => {
      dispatch({ type: 'SET_PRICE_ESTIMATE', estimate });
    },
    [dispatch],
  );

  // UI: Action Buttons
  const setActiveActionButton = useCallback(
    (button: 'edit' | 'copy' | 'preview' | 'save' | null) => {
      dispatch({ type: 'SET_ACTIVE_ACTION_BUTTON', button });
    },
    [dispatch],
  );

  // UI: Dialogs
  const setShowSaveToCatalog = useCallback(
    (visible: boolean) => {
      dispatch({ type: 'SET_SHOW_SAVE_TO_CATALOG', visible });
    },
    [dispatch],
  );

  const setShowCanvasEditor = useCallback(
    (visible: boolean) => {
      dispatch({ type: 'SET_SHOW_CANVAS_EDITOR', visible });
    },
    [dispatch],
  );

  const setShowKeyboardShortcuts = useCallback(
    (visible: boolean) => {
      dispatch({ type: 'SET_SHOW_KEYBOARD_SHORTCUTS', visible });
    },
    [dispatch],
  );

  // UI: Zoom / Pan
  const setImageScale = useCallback(
    (scale: number) => {
      dispatch({ type: 'SET_IMAGE_SCALE', scale });
    },
    [dispatch],
  );

  const setImagePosition = useCallback(
    (position: { x: number; y: number }) => {
      dispatch({ type: 'SET_IMAGE_POSITION', position });
    },
    [dispatch],
  );

  // UI: Media Mode
  const setMediaMode = useCallback(
    (mode: 'image' | 'video') => {
      dispatch({ type: 'SET_MEDIA_MODE', mode });
    },
    [dispatch],
  );

  const setVideoDuration = useCallback(
    (duration: number) => {
      dispatch({ type: 'SET_VIDEO_DURATION', duration });
    },
    [dispatch],
  );

  // Generation: Edit / Ask AI
  const setEditPrompt = useCallback(
    (prompt: string) => {
      dispatch({ type: 'SET_EDIT_PROMPT', prompt });
    },
    [dispatch],
  );

  const setIsEditing = useCallback(
    (editing: boolean) => {
      dispatch({ type: 'SET_IS_EDITING', editing });
    },
    [dispatch],
  );

  const setAskAIQuestion = useCallback(
    (question: string) => {
      dispatch({ type: 'SET_ASK_AI_QUESTION', question });
    },
    [dispatch],
  );

  const setAskAIResponse = useCallback(
    (response: string | null) => {
      dispatch({ type: 'SET_ASK_AI_RESPONSE', response });
    },
    [dispatch],
  );

  const setIsAskingAI = useCallback(
    (asking: boolean) => {
      dispatch({ type: 'SET_IS_ASKING_AI', asking });
    },
    [dispatch],
  );

  // Generation: Copy Extended
  const setIsGeneratingCopy = useCallback(
    (generating: boolean) => {
      dispatch({ type: 'SET_IS_GENERATING_COPY', generating });
    },
    [dispatch],
  );

  const setGeneratedCopyFull = useCallback(
    (copyResult: CopyResult | null) => {
      dispatch({ type: 'SET_GENERATED_COPY_FULL', copyResult });
    },
    [dispatch],
  );

  // Generation: Video
  const setVideoJobId = useCallback(
    (jobId: string | null) => {
      dispatch({ type: 'SET_VIDEO_JOB_ID', jobId });
    },
    [dispatch],
  );

  const setGeneratedMediaType = useCallback(
    (mediaType: 'image' | 'video') => {
      dispatch({ type: 'SET_GENERATED_MEDIA_TYPE', mediaType });
    },
    [dispatch],
  );

  // Generation: UX Feedback
  const setJustCopied = useCallback(
    (copied: boolean) => {
      dispatch({ type: 'SET_JUST_COPIED', copied });
    },
    [dispatch],
  );

  const setIsDownloading = useCallback(
    (downloading: boolean) => {
      dispatch({ type: 'SET_IS_DOWNLOADING', downloading });
    },
    [dispatch],
  );

  // Products: Filtering
  const setTemplateCategory = useCallback(
    (category: string) => {
      dispatch({ type: 'SET_TEMPLATE_CATEGORY', category });
    },
    [dispatch],
  );

  const setSearchQuery = useCallback(
    (query: string) => {
      dispatch({ type: 'SET_SEARCH_QUERY', query });
    },
    [dispatch],
  );

  const setCategoryFilter = useCallback(
    (filter: string) => {
      dispatch({ type: 'SET_CATEGORY_FILTER', filter });
    },
    [dispatch],
  );

  // Products: Template Inspiration
  const setShowTemplateInspiration = useCallback(
    (visible: boolean) => {
      dispatch({ type: 'SET_SHOW_TEMPLATE_INSPIRATION', visible });
    },
    [dispatch],
  );

  const setSelectedPerformingTemplate = useCallback(
    (template: PerformingAdTemplate | null) => {
      dispatch({ type: 'SET_SELECTED_PERFORMING_TEMPLATE', template });
    },
    [dispatch],
  );

  // Deep Link: Plan Context
  const setPlanContext = useCallback(
    (context: PlanContext | null) => {
      dispatch({ type: 'SET_PLAN_CONTEXT', context });
    },
    [dispatch],
  );

  const clearPlanContext = useCallback(() => {
    dispatch({ type: 'CLEAR_PLAN_CONTEXT' });
  }, [dispatch]);

  const setCpTemplate = useCallback(
    (template: ContentTemplate | null) => {
      dispatch({ type: 'SET_CP_TEMPLATE', template });
    },
    [dispatch],
  );

  // Deep Link: Content Builders
  const setShowCarouselBuilder = useCallback(
    (visible: boolean) => {
      dispatch({ type: 'SET_SHOW_CAROUSEL_BUILDER', visible });
    },
    [dispatch],
  );

  const setCarouselTopic = useCallback(
    (topic: string) => {
      dispatch({ type: 'SET_CAROUSEL_TOPIC', topic });
    },
    [dispatch],
  );

  const setShowBeforeAfterBuilder = useCallback(
    (visible: boolean) => {
      dispatch({ type: 'SET_SHOW_BEFORE_AFTER_BUILDER', visible });
    },
    [dispatch],
  );

  const setBeforeAfterTopic = useCallback(
    (topic: string) => {
      dispatch({ type: 'SET_BEFORE_AFTER_TOPIC', topic });
    },
    [dispatch],
  );

  const setShowTextOnlyMode = useCallback(
    (visible: boolean) => {
      dispatch({ type: 'SET_SHOW_TEXT_ONLY_MODE', visible });
    },
    [dispatch],
  );

  const setTextOnlyTopic = useCallback(
    (topic: string) => {
      dispatch({ type: 'SET_TEXT_ONLY_TOPIC', topic });
    },
    [dispatch],
  );

  // History
  const setHistoryPanelOpen = useCallback(
    (open: boolean) => {
      dispatch({ type: 'SET_HISTORY_PANEL_OPEN', open });
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

    // ── Original Action Dispatchers ────────────────────────

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

    // ── New S2-11 Action Dispatchers ───────────────────────

    // UI: Section State
    setCollapsedSections,
    toggleSection,
    setCurrentSection,
    setShowContextBar,
    setShowStickyGenerate,

    // UI: Quick Start
    setQuickStartMode,
    setQuickStartPrompt,

    // UI: Price Estimate
    setPriceEstimate,

    // UI: Action Buttons
    setActiveActionButton,

    // UI: Dialogs
    setShowSaveToCatalog,
    setShowCanvasEditor,
    setShowKeyboardShortcuts,

    // UI: Zoom / Pan
    setImageScale,
    setImagePosition,

    // UI: Media Mode
    setMediaMode,
    setVideoDuration,

    // Generation: Edit / Ask AI
    setEditPrompt,
    setIsEditing,
    setAskAIQuestion,
    setAskAIResponse,
    setIsAskingAI,

    // Generation: Copy Extended
    setIsGeneratingCopy,
    setGeneratedCopyFull,

    // Generation: Video
    setVideoJobId,
    setGeneratedMediaType,

    // Generation: UX Feedback
    setJustCopied,
    setIsDownloading,

    // Products: Filtering
    setTemplateCategory,
    setSearchQuery,
    setCategoryFilter,

    // Products: Template Inspiration
    setShowTemplateInspiration,
    setSelectedPerformingTemplate,

    // Deep Link: Plan Context
    setPlanContext,
    clearPlanContext,
    setCpTemplate,

    // Deep Link: Content Builders
    setShowCarouselBuilder,
    setCarouselTopic,
    setShowBeforeAfterBuilder,
    setBeforeAfterTopic,
    setShowTextOnlyMode,
    setTextOnlyTopic,

    // History
    setHistoryPanelOpen,
  };
}
