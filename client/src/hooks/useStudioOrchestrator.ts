// @ts-nocheck
/**
 * useStudioOrchestrator — Thin composer that combines focused sub-hooks.
 *
 * This hook preserves the EXACT same return API as before so that all
 * consumer components continue to work without changes.
 *
 * Sub-hooks (in client/src/hooks/studio/):
 *   useStudioProducts   — product/template queries & selection
 *   useStudioGeneration  — image/video generation, editing, copy
 *   useStudioUI          — collapsed sections, scroll, zoom, dialogs
 *   useStudioHistory     — history panel & URL state
 *   useStudioDeepLink    — query-param deep linking, plan context
 *   useStudioKeyboard    — keyboard shortcuts
 */

import { useState, useEffect, useCallback } from 'react';
import { useStudioProducts } from './studio/useStudioProducts';
import { useStudioGeneration } from './studio/useStudioGeneration';
import { useStudioUI } from './studio/useStudioUI';
import { useStudioHistory } from './studio/useStudioHistory';
import { useStudioDeepLink } from './studio/useStudioDeepLink';
import { useStudioKeyboard } from './studio/useStudioKeyboard';
import { toast } from 'sonner';
import type { PerformingAdTemplate } from './studio/types';

// Re-export types for backward compatibility
export type { GenerationState, CopyResult } from './studio/types';

export function useStudioOrchestrator() {
  // ── Prompt & Platform (shared across sub-hooks) ────────
  const [prompt, setPrompt] = useState('');
  const [platform, setPlatform] = useState('LinkedIn');
  const [aspectRatio, setAspectRatio] = useState('1200x627');
  const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('2K');

  // Restore draft on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem('studio-prompt-draft');
    if (savedPrompt && !prompt) setPrompt(savedPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only effect
  }, []);

  // ── Sub-hooks ──────────────────────────────────────────
  const productHook = useStudioProducts();

  const uiHook = useStudioUI({
    state: 'idle', // Will be overridden below after generation hook
    selectedProductsCount: productHook.selectedProducts.length,
    tempUploadsCount: 0, // Placeholder, updated via effect
    prompt,
    resolution,
  });

  const genHook = useStudioGeneration({
    selectedProducts: productHook.selectedProducts,
    tempUploads: uiHook.tempUploads,
    prompt,
    quickStartMode: uiHook.quickStartMode,
    quickStartPrompt: uiHook.quickStartPrompt,
    resolution,
    ideaBankMode: 'freestyle', // Placeholder, deep link hook provides real value
    selectedTemplateForMode: null,
    generationMode: 'standard',
    generationRecipe: undefined,
    planContext: null,
    platform,
    aspectRatio,
    videoDuration: uiHook.videoDuration,
  });

  const historyHook = useStudioHistory({
    generatedImage: genHook.generatedImage,
    setGeneratedImage: genHook.setGeneratedImage,
    setGenerationId: genHook.setGenerationId,
    setPrompt,
    setState: genHook.setState,
  });

  const deepLinkHook = useStudioDeepLink({
    templates: productHook.templates,
    products: productHook.products,
    prompt,
    setPrompt,
    setPlatform,
    setAspectRatio,
    setSelectedProducts: productHook.setSelectedProducts,
    setGeneratedCopy: genHook.setGeneratedCopy,
    setGeneratedImage: genHook.setGeneratedImage,
    setGeneratedImageUrl: () => {}, // No-op, genHook manages it internally
    setSelectedTemplate: productHook.setSelectedTemplate,
    setTempUploads: uiHook.setTempUploads,
    setEditPrompt: genHook.setEditPrompt,
    setAskAIResponse: () => {}, // Managed internally
    setGenerationId: genHook.setGenerationId,
    setState: genHook.setState,
    setSelectedSuggestion: () => {}, // Deep link manages its own
    setGenerationRecipe: () => {}, // Deep link manages its own
  });

  // Wire deep link values back into generation hook options
  // (The generation hook reads these via the options ref each call)
  const genOptions = {
    selectedProducts: productHook.selectedProducts,
    tempUploads: uiHook.tempUploads,
    prompt,
    quickStartMode: uiHook.quickStartMode,
    quickStartPrompt: uiHook.quickStartPrompt,
    resolution,
    ideaBankMode: deepLinkHook.ideaBankMode,
    selectedTemplateForMode: deepLinkHook.selectedTemplateForMode,
    generationMode: deepLinkHook.generationMode,
    generationRecipe: deepLinkHook.generationRecipe,
    planContext: deepLinkHook.planContext,
    platform,
    aspectRatio,
    videoDuration: uiHook.videoDuration,
  };

  // Re-create generation hook with correct deps
  const generation = useStudioGeneration(genOptions);

  // Re-create UI hook with correct state dependency
  const ui = useStudioUI({
    state: generation.state,
    selectedProductsCount: productHook.selectedProducts.length,
    tempUploadsCount: uiHook.tempUploads.length,
    prompt,
    resolution,
  });

  // Wrap handleReset to also clear quick start
  const handleReset = useCallback(() => {
    generation.handleReset();
    ui.setQuickStartMode(false);
    ui.setQuickStartPrompt('');
    ui.setTempUploads([]);
  }, [generation, ui]);

  const handleCanvasEditComplete = useCallback(
    (newImageUrl: string) => {
      generation.setGeneratedImage(newImageUrl);
      ui.setShowCanvasEditor(false);
      generation.haptic('medium');
      toast.success('Canvas edit applied!', { duration: 2000 });
    },
    [generation, ui],
  );

  const handleSelectPerformingTemplate = useCallback(
    (template: PerformingAdTemplate) => {
      productHook.setSelectedPerformingTemplate(template);
      const platformMap: Record<string, string> = {
        instagram: 'Instagram',
        linkedin: 'LinkedIn',
        facebook: 'Facebook',
        twitter: 'Twitter',
        tiktok: 'TikTok',
      };
      const aspectRatioMap: Record<string, string> = {
        '1:1': '1200x1200',
        '16:9': '1920x1080',
        '9:16': '1080x1920',
        '4:5': '1080x1350',
        '1.91:1': '1200x627',
      };
      if (template.targetPlatforms && template.targetPlatforms.length > 0) {
        const mapped = platformMap[template.targetPlatforms[0]];
        if (mapped) setPlatform(mapped);
      }
      if (template.targetAspectRatios && template.targetAspectRatios.length > 0) {
        const mapped = aspectRatioMap[template.targetAspectRatios[0]];
        if (mapped) setAspectRatio(mapped);
      }
      const styleHints: string[] = [];
      if (template.mood) styleHints.push(template.mood);
      if (template.style) styleHints.push(template.style);
      if (template.backgroundType) styleHints.push(`${template.backgroundType} background`);
      if (styleHints.length > 0) {
        const stylePrefix = `Style: ${styleHints.join(', ')}. `;
        if (!prompt.startsWith('Style:')) {
          setPrompt((prev) => (prev ? `${stylePrefix}${prev}` : stylePrefix));
        }
      }
      productHook.setShowTemplateInspiration(false);
    },
    [prompt, productHook],
  );

  // Cleanup video polling on unmount
  useEffect(() => {
    return () => {
      if (generation.videoPollIntervalRef.current) {
        clearInterval(generation.videoPollIntervalRef.current);
        generation.videoPollIntervalRef.current = null;
      }
      if (generation.videoPollTimeoutRef.current) {
        clearTimeout(generation.videoPollTimeoutRef.current);
        generation.videoPollTimeoutRef.current = null;
      }
    };
  }, []);

  // Keyboard shortcuts
  const { shortcuts } = useStudioKeyboard({
    state: generation.state,
    canGenerate: ui.canGenerate,
    generatedImage: generation.generatedImage,
    handleGenerate: generation.handleGenerate,
    handleDownloadWithFeedback: generation.handleDownloadWithFeedback,
    handleReset,
    setShowKeyboardShortcuts: ui.setShowKeyboardShortcuts,
  });

  // ── Return (preserves exact same API) ──────────────────
  return {
    // State
    state: generation.state,
    generatedImage: generation.generatedImage,
    generationId: generation.generationId,
    selectedProducts: productHook.selectedProducts,
    selectedTemplate: productHook.selectedTemplate,
    templateCategory: productHook.templateCategory,
    prompt,
    platform,
    aspectRatio,
    resolution,
    collapsedSections: ui.collapsedSections,
    currentSection: ui.currentSection,
    showContextBar: ui.showContextBar,
    showStickyGenerate: ui.showStickyGenerate,
    searchQuery: productHook.searchQuery,
    categoryFilter: productHook.categoryFilter,
    activeActionButton: ui.activeActionButton,
    quickStartMode: ui.quickStartMode,
    quickStartPrompt: ui.quickStartPrompt,
    tempUploads: ui.tempUploads,
    priceEstimate: ui.priceEstimate,
    editPrompt: generation.editPrompt,
    isEditing: generation.isEditing,
    askAIQuestion: generation.askAIQuestion,
    askAIResponse: generation.askAIResponse,
    isAskingAI: generation.isAskingAI,
    generatedCopy: generation.generatedCopy,
    isGeneratingCopy: generation.isGeneratingCopy,
    generatedImageUrl: generation.generatedImageUrl,
    generatedCopyFull: generation.generatedCopyFull,
    showSaveToCatalog: ui.showSaveToCatalog,
    showTemplateInspiration: productHook.showTemplateInspiration,
    selectedPerformingTemplate: productHook.selectedPerformingTemplate,
    selectedSuggestion: deepLinkHook.selectedSuggestion,
    generationRecipe: deepLinkHook.generationRecipe,
    ideaBankMode: deepLinkHook.ideaBankMode,
    generationMode: deepLinkHook.generationMode,
    selectedTemplateForMode: deepLinkHook.selectedTemplateForMode,
    planContext: deepLinkHook.planContext,
    cpTemplate: deepLinkHook.cpTemplate,
    showCarouselBuilder: deepLinkHook.showCarouselBuilder,
    carouselTopic: deepLinkHook.carouselTopic,
    showBeforeAfterBuilder: deepLinkHook.showBeforeAfterBuilder,
    beforeAfterTopic: deepLinkHook.beforeAfterTopic,
    showTextOnlyMode: deepLinkHook.showTextOnlyMode,
    textOnlyTopic: deepLinkHook.textOnlyTopic,
    showCanvasEditor: ui.showCanvasEditor,
    mediaMode: ui.mediaMode,
    videoDuration: ui.videoDuration,
    videoJobId: generation.videoJobId,
    generatedMediaType: generation.generatedMediaType,
    historyPanelOpen: historyHook.historyPanelOpen,
    justCopied: generation.justCopied,
    isDownloading: generation.isDownloading,
    showKeyboardShortcuts: ui.showKeyboardShortcuts,
    imageScale: ui.imageScale,
    imagePosition: ui.imagePosition,
    canGenerate: ui.canGenerate,
    shortcuts,

    // Data
    authUser: productHook.authUser,
    products: productHook.products,
    templates: productHook.templates,
    featuredAdTemplates: productHook.featuredAdTemplates,
    isLoadingFeatured: productHook.isLoadingFeatured,
    filteredProducts: productHook.filteredProducts,
    categories: productHook.categories,
    progressSections: ui.progressSections,

    // Refs
    generateButtonRef: ui.generateButtonRef,
    heroRef: ui.heroRef,
    zoomContainerRef: ui.zoomContainerRef,

    // Setters
    setState: generation.setState,
    setGeneratedImage: generation.setGeneratedImage,
    setGenerationId: generation.setGenerationId,
    setSelectedProducts: productHook.setSelectedProducts,
    setSelectedTemplate: productHook.setSelectedTemplate,
    setTemplateCategory: productHook.setTemplateCategory,
    setPrompt,
    setPlatform,
    setAspectRatio,
    setResolution,
    setSearchQuery: productHook.setSearchQuery,
    setCategoryFilter: productHook.setCategoryFilter,
    setActiveActionButton: ui.setActiveActionButton,
    setQuickStartMode: ui.setQuickStartMode,
    setQuickStartPrompt: ui.setQuickStartPrompt,
    setTempUploads: ui.setTempUploads,
    setEditPrompt: generation.setEditPrompt,
    setAskAIQuestion: generation.setAskAIQuestion,
    setGeneratedCopy: generation.setGeneratedCopy,
    setIsGeneratingCopy: generation.setIsGeneratingCopy,
    setGeneratedCopyFull: generation.setGeneratedCopyFull,
    setShowSaveToCatalog: ui.setShowSaveToCatalog,
    setShowTemplateInspiration: productHook.setShowTemplateInspiration,
    setSelectedPerformingTemplate: productHook.setSelectedPerformingTemplate,
    setSelectedSuggestion: deepLinkHook.setSelectedSuggestion,
    setGenerationRecipe: deepLinkHook.setGenerationRecipe,
    setIdeaBankMode: deepLinkHook.setIdeaBankMode,
    setGenerationMode: deepLinkHook.setGenerationMode,
    setSelectedTemplateForMode: deepLinkHook.setSelectedTemplateForMode,
    setPlanContext: deepLinkHook.setPlanContext,
    clearPlanContext: deepLinkHook.clearPlanContext,
    setCpTemplate: deepLinkHook.setCpTemplate,
    setShowCarouselBuilder: deepLinkHook.setShowCarouselBuilder,
    setCarouselTopic: deepLinkHook.setCarouselTopic,
    setShowBeforeAfterBuilder: deepLinkHook.setShowBeforeAfterBuilder,
    setBeforeAfterTopic: deepLinkHook.setBeforeAfterTopic,
    setShowTextOnlyMode: deepLinkHook.setShowTextOnlyMode,
    setTextOnlyTopic: deepLinkHook.setTextOnlyTopic,
    setShowCanvasEditor: ui.setShowCanvasEditor,
    setMediaMode: ui.setMediaMode,
    setVideoDuration: ui.setVideoDuration,
    setVideoJobId: generation.setVideoJobId,
    setGeneratedMediaType: generation.setGeneratedMediaType,
    setHistoryPanelOpen: historyHook.setHistoryPanelOpen,
    setShowKeyboardShortcuts: ui.setShowKeyboardShortcuts,
    setImageScale: ui.setImageScale,
    setImagePosition: ui.setImagePosition,

    // Handlers
    toggleProductSelection: productHook.toggleProductSelection,
    toggleSection: ui.toggleSection,
    navigateToSection: ui.navigateToSection,
    handleGenerate: generation.handleGenerate,
    handleGenerateVideo: generation.handleGenerateVideo,
    handleCancelGeneration: generation.handleCancelGeneration,
    handleDownload: generation.handleDownload,
    handleDownloadWithFeedback: generation.handleDownloadWithFeedback,
    handleReset,
    handleApplyEdit: generation.handleApplyEdit,
    handleCanvasEditComplete,
    handleSelectSuggestion: deepLinkHook.handleSelectSuggestion,
    handlePromptChange: deepLinkHook.handlePromptChange,
    handleGenerateCopy: generation.handleGenerateCopy,
    handleLoadFromHistory: historyHook.handleLoadFromHistory,
    handleHistoryToggle: historyHook.handleHistoryToggle,
    handleAskAI: generation.handleAskAI,
    handleSelectPerformingTemplate,
    handleCopyText: generation.handleCopyText,

    // History URL state
    selectGeneration: historyHook.selectGeneration,
    haptic: generation.haptic,
  };
}

export type StudioOrchestrator = ReturnType<typeof useStudioOrchestrator>;
