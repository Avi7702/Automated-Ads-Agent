/**
 * PhoenixStudio — Unified Creative Workspace (Phoenix v2)
 *
 * Merges the previous Agent Mode and Studio Mode into a single, unified layout:
 *   - Left: Collapsible Asset Drawer (products, templates, brand, scenarios, patterns)
 *   - Center: Main Canvas (composer → generating → result) + IdeaBank
 *   - Right: Agent Chat Panel (always visible, resizable)
 *
 * The user can select products visually AND chat with the agent simultaneously.
 * The agent receives full context (selected products, uploads, platform, etc.)
 * and can trigger UI actions (select products, set prompt, generate, etc.).
 *
 * This replaces the old Studio.tsx with its separate Agent/Studio mode toggle.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { MOTION, useReducedMotion, motionSafe } from '@/lib/motion';
import { Header } from '@/components/layout/Header';
import { StudioProvider, useStudioContext } from '@/contexts/StudioContext';
import { ComposerView, ResultViewEnhanced, GeneratingView } from '@/components/studio/MainCanvas';
import { InspectorPanel } from '@/components/studio/InspectorPanel';
import { IdeaBankBar } from '@/components/studio/IdeaBankBar';
import { HistoryPanel } from '@/components/studio/HistoryPanel';
import { AgentChatPanel } from '@/components/studio/AgentChat';
import { AssetDrawer } from '@/components/studio/AssetDrawer';
import { SaveToCatalogDialog } from '@/components/SaveToCatalogDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  History,
  TrendingUp,
  Star,
  Layout,
  X,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { useStudioProducts } from '@/hooks/studio/useStudioProducts';
import { useStudioGeneration } from '@/hooks/studio/useStudioGeneration';
import { useStudioUI } from '@/hooks/studio/useStudioUI';
import { useStudioHistory } from '@/hooks/studio/useStudioHistory';
import { useStudioDeepLink } from '@/hooks/studio/useStudioDeepLink';
import { useStudioKeyboard } from '@/hooks/studio/useStudioKeyboard';
import { toast } from 'sonner';
import type { PerformingAdTemplate } from '@/hooks/studio/types';
import type { ShortcutConfig } from '@/hooks/useKeyboardShortcuts';
import type { Product } from '@shared/schema';
import type { IdeaBankContextSnapshot } from '@/components/ideabank/types';

// ════════════════════════════════════════════════════════════
// LAYOUT CONSTANTS
// ════════════════════════════════════════════════════════════

const ASSET_DRAWER_WIDTH = 280;
const CHAT_PANEL_MIN_WIDTH = 340;
const CHAT_PANEL_DEFAULT_WIDTH = 400;
const CHAT_PANEL_MAX_WIDTH = 600;

// ════════════════════════════════════════════════════════════
// CONTEXT BAR — Floating status bar showing current selections
// ════════════════════════════════════════════════════════════

function ContextBar({
  selectedProducts,
  selectedTemplate,
  platform,
  visible,
}: {
  selectedProducts: Product[];
  selectedTemplate: { title: string } | null;
  platform: string;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-background/90 backdrop-blur-md border border-border rounded-full px-4 py-2 flex items-center gap-3 shadow-lg"
    >
      <span className="text-xs text-muted-foreground">
        {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''}
      </span>
      {selectedTemplate && <span className="text-xs text-primary">{selectedTemplate.title}</span>}
      <span className="text-xs text-muted-foreground">{platform}</span>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS PANEL
// ════════════════════════════════════════════════════════════

function KeyboardShortcutsPanel({
  visible,
  shortcuts,
  onClose,
  onToggle,
  haptic,
}: {
  visible: boolean;
  shortcuts: ShortcutConfig[];
  onClose: () => void;
  onToggle: () => void;
  haptic: (intensity: 'light' | 'medium' | 'heavy') => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="glass rounded-xl shadow-lg p-5 w-80"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Keyboard Shortcuts
            </h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {shortcuts.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{s.description}</span>
                <div className="flex gap-1">
                  {s.modifier && (
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                      {s.modifier === 'meta' ? '⌘' : 'Ctrl'}
                    </kbd>
                  )}
                  <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono uppercase">{s.key}</kbd>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      <Button
        variant="outline"
        size="icon"
        className="rounded-full w-10 h-10 shadow-md"
        onClick={() => {
          onToggle();
          haptic('light');
        }}
      >
        <Sparkles className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STUDIO ORCHESTRATOR HOOK (preserved from original Studio.tsx)
// ════════════════════════════════════════════════════════════

function useStudioOrchestrator() {
  const [prompt, setPrompt] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [aspectRatio, setAspectRatio] = useState('1080x1080');
  const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('2K');
  const reduced = useReducedMotion();

  const productHook = useStudioProducts();
  const uiHook = useStudioUI({
    state: 'idle',
    selectedProductsCount: productHook.selectedProducts.length,
    tempUploadsCount: 0,
    prompt,
    resolution,
  });
  const deepLinkHook = useStudioDeepLink({
    templates: productHook.templates,
    products: productHook.products,
    prompt,
    setPrompt,
    setPlatform,
    setAspectRatio,
    setSelectedProducts: productHook.setSelectedProducts,
    setGeneratedCopy: () => {},
    setGeneratedImage: () => {},
    setGeneratedImageUrl: () => {},
    setSelectedTemplate: productHook.setSelectedTemplate,
    setTempUploads: uiHook.setTempUploads,
    setEditPrompt: () => {},
    setAskAIResponse: () => {},
    setGenerationId: () => {},
    setState: () => {},
    setSelectedSuggestion: () => {},
    setGenerationRecipe: () => {},
  });

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
  const generation = useStudioGeneration(genOptions);

  // Re-initialize UI hook with actual generation state
  const ui = useStudioUI({
    state: generation.state,
    selectedProductsCount: productHook.selectedProducts.length,
    tempUploadsCount: uiHook.tempUploads.length,
    prompt,
    resolution,
  });

  const historyHook = useStudioHistory({
    generatedImage: generation.generatedImage,
    setGeneratedImage: generation.setGeneratedImage,
    setGenerationId: generation.setGenerationId,
    setPrompt,
    setState: generation.setState,
  });

  // Reconnect deep link setters that need generation state
  useEffect(() => {
    // This is a one-time setup — the deep link hook needs these references
  }, []);

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
        const targetPlatform = template.targetPlatforms[0];
        const mapped = targetPlatform ? platformMap[targetPlatform] : undefined;
        if (mapped) setPlatform(mapped);
      }
      if (template.targetAspectRatios && template.targetAspectRatios.length > 0) {
        const targetAspectRatio = template.targetAspectRatios[0];
        const mapped = targetAspectRatio ? aspectRatioMap[targetAspectRatio] : undefined;
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
  }, [generation.videoPollIntervalRef, generation.videoPollTimeoutRef]);

  const { shortcuts } = useStudioKeyboard({
    state: generation.state,
    canGenerate: ui.canGenerate,
    generatedImage: generation.generatedImage,
    handleGenerate: generation.handleGenerate,
    handleDownloadWithFeedback: generation.handleDownloadWithFeedback,
    handleReset,
    setShowKeyboardShortcuts: ui.setShowKeyboardShortcuts,
  });

  return {
    // State
    state: generation.state,
    prompt,
    platform,
    aspectRatio,
    resolution,
    selectedProducts: productHook.selectedProducts,
    selectedTemplate: productHook.selectedTemplate,
    tempUploads: uiHook.tempUploads,
    generatedImage: generation.generatedImage,
    generatedCopy: generation.generatedCopy,
    generationId: generation.generationId,
    editPrompt: generation.editPrompt,
    isEditing: generation.isEditing,
    askAIQuestion: generation.askAIQuestion,
    askAIResponse: generation.askAIResponse,
    isAskingAI: generation.isAskingAI,
    isGeneratingCopy: generation.isGeneratingCopy,
    generatedCopyFull: generation.generatedCopyFull,
    activeActionButton: ui.activeActionButton,
    quickStartMode: uiHook.quickStartMode,
    quickStartPrompt: uiHook.quickStartPrompt,
    priceEstimate: ui.priceEstimate,
    collapsedSections: ui.collapsedSections,
    currentSection: ui.currentSection,
    showContextBar: ui.showContextBar,
    showStickyGenerate: ui.showStickyGenerate,
    showSaveToCatalog: ui.showSaveToCatalog,
    showTemplateInspiration: productHook.showTemplateInspiration,
    selectedPerformingTemplate: productHook.selectedPerformingTemplate,
    templateCategory: productHook.templateCategory,
    searchQuery: productHook.searchQuery,
    categoryFilter: productHook.categoryFilter,
    ideaBankMode: deepLinkHook.ideaBankMode,
    generationMode: deepLinkHook.generationMode,
    selectedTemplateForMode: deepLinkHook.selectedTemplateForMode,
    generationRecipe: deepLinkHook.generationRecipe,
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
    authUser: productHook.authUser,
    products: productHook.products,
    templates: productHook.templates,
    featuredAdTemplates: productHook.featuredAdTemplates,
    isLoadingFeatured: productHook.isLoadingFeatured,
    filteredProducts: productHook.filteredProducts,
    categories: productHook.categories,
    progressSections: ui.progressSections,
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
    // Actions
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
    selectGeneration: historyHook.selectGeneration,
    haptic: generation.haptic,
  };
}

// ════════════════════════════════════════════════════════════
// ORCHESTRATOR SYNC — Bridges orchestrator state to StudioContext
// ════════════════════════════════════════════════════════════

function useOrchestratorSync(orch: ReturnType<typeof useStudioOrchestrator>) {
  const { dispatch } = useStudioContext();

  useEffect(() => {
    dispatch({ type: 'SET_PRODUCTS', products: orch.selectedProducts });
  }, [orch.selectedProducts, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SELECT_TEMPLATE', template: orch.selectedTemplate });
  }, [orch.selectedTemplate, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_UPLOADS', uploads: orch.tempUploads });
  }, [orch.tempUploads, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_PROMPT', prompt: orch.prompt });
  }, [orch.prompt, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_PLATFORM', platform: orch.platform });
  }, [orch.platform, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_ASPECT_RATIO', aspectRatio: orch.aspectRatio });
  }, [orch.aspectRatio, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_RESOLUTION', resolution: orch.resolution });
  }, [orch.resolution, dispatch]);
  useEffect(() => {
    if (orch.state === 'idle') dispatch({ type: 'CLEAR_GENERATION' });
    else if (orch.state === 'generating') dispatch({ type: 'SET_GENERATING' });
    else if (orch.state === 'result' && orch.generatedImage && orch.generationId) {
      dispatch({ type: 'SET_RESULT', imageUrl: orch.generatedImage, generationId: orch.generationId });
    }
  }, [orch.state, orch.generatedImage, orch.generationId, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_COLLAPSED_SECTIONS', sections: orch.collapsedSections });
  }, [orch.collapsedSections, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_SHOW_CONTEXT_BAR', visible: orch.showContextBar });
  }, [orch.showContextBar, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_SHOW_STICKY_GENERATE', visible: orch.showStickyGenerate });
  }, [orch.showStickyGenerate, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_QUICK_START_MODE', enabled: orch.quickStartMode });
  }, [orch.quickStartMode, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_QUICK_START_PROMPT', prompt: orch.quickStartPrompt });
  }, [orch.quickStartPrompt, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_PRICE_ESTIMATE', estimate: orch.priceEstimate });
  }, [orch.priceEstimate, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_EDIT_PROMPT', prompt: orch.editPrompt });
  }, [orch.editPrompt, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_IS_EDITING', editing: orch.isEditing });
  }, [orch.isEditing, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_GENERATED_COPY', copy: orch.generatedCopy });
  }, [orch.generatedCopy, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_IS_GENERATING_COPY', generating: orch.isGeneratingCopy });
  }, [orch.isGeneratingCopy, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_GENERATED_COPY_FULL', copyResult: orch.generatedCopyFull });
  }, [orch.generatedCopyFull, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_ASK_AI_QUESTION', question: orch.askAIQuestion });
  }, [orch.askAIQuestion, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_ASK_AI_RESPONSE', response: orch.askAIResponse });
  }, [orch.askAIResponse, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_IS_ASKING_AI', asking: orch.isAskingAI });
  }, [orch.isAskingAI, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_SEARCH_QUERY', query: orch.searchQuery });
  }, [orch.searchQuery, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_CATEGORY_FILTER', filter: orch.categoryFilter });
  }, [orch.categoryFilter, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_HISTORY_PANEL_OPEN', open: orch.historyPanelOpen });
  }, [orch.historyPanelOpen, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_MEDIA_MODE', mode: orch.mediaMode });
  }, [orch.mediaMode, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_VIDEO_DURATION', duration: Number(orch.videoDuration) });
  }, [orch.videoDuration, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_IMAGE_SCALE', scale: orch.imageScale });
  }, [orch.imageScale, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_IMAGE_POSITION', position: orch.imagePosition });
  }, [orch.imagePosition, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_ACTIVE_ACTION_BUTTON', button: orch.activeActionButton });
  }, [orch.activeActionButton, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_SHOW_SAVE_TO_CATALOG', visible: orch.showSaveToCatalog });
  }, [orch.showSaveToCatalog, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_SHOW_CANVAS_EDITOR', visible: orch.showCanvasEditor });
  }, [orch.showCanvasEditor, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_SHOW_KEYBOARD_SHORTCUTS', visible: orch.showKeyboardShortcuts });
  }, [orch.showKeyboardShortcuts, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_JUST_COPIED', copied: orch.justCopied });
  }, [orch.justCopied, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_IS_DOWNLOADING', downloading: orch.isDownloading });
  }, [orch.isDownloading, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_TEMPLATE_CATEGORY', category: orch.templateCategory });
  }, [orch.templateCategory, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_SHOW_TEMPLATE_INSPIRATION', visible: orch.showTemplateInspiration });
  }, [orch.showTemplateInspiration, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_SELECTED_PERFORMING_TEMPLATE', template: orch.selectedPerformingTemplate });
  }, [orch.selectedPerformingTemplate, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_TEMPLATE_FOR_MODE', template: orch.selectedTemplateForMode });
  }, [orch.selectedTemplateForMode, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_PLAN_CONTEXT', context: orch.planContext });
  }, [orch.planContext, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_CP_TEMPLATE', template: orch.cpTemplate });
  }, [orch.cpTemplate, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_SHOW_CAROUSEL_BUILDER', visible: orch.showCarouselBuilder });
  }, [orch.showCarouselBuilder, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_CAROUSEL_TOPIC', topic: orch.carouselTopic });
  }, [orch.carouselTopic, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_SHOW_BEFORE_AFTER_BUILDER', visible: orch.showBeforeAfterBuilder });
  }, [orch.showBeforeAfterBuilder, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_BEFORE_AFTER_TOPIC', topic: orch.beforeAfterTopic });
  }, [orch.beforeAfterTopic, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_SHOW_TEXT_ONLY_MODE', visible: orch.showTextOnlyMode });
  }, [orch.showTextOnlyMode, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_TEXT_ONLY_TOPIC', topic: orch.textOnlyTopic });
  }, [orch.textOnlyTopic, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_VIDEO_JOB_ID', jobId: orch.videoJobId });
  }, [orch.videoJobId, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_GENERATED_MEDIA_TYPE', mediaType: orch.generatedMediaType });
  }, [orch.generatedMediaType, dispatch]);
  useEffect(() => {
    dispatch({ type: 'SET_CURRENT_SECTION', section: orch.currentSection });
  }, [orch.currentSection, dispatch]);
}

// ════════════════════════════════════════════════════════════
// PHOENIX STUDIO CONTENT — The main unified layout
// ════════════════════════════════════════════════════════════

function PhoenixStudioContent() {
  const orch = useStudioOrchestrator();
  useOrchestratorSync(orch);
  const reduced = useReducedMotion();

  // ── Panel visibility state ──────────────────────────────
  const [assetDrawerOpen, setAssetDrawerOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1280; // Open by default on xl+ screens
  });
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [chatPanelWidth, setChatPanelWidth] = useState(CHAT_PANEL_DEFAULT_WIDTH);

  // ── IdeaBank bridge state ───────────────────────────────
  const [ideaBankContext, setIdeaBankContext] = useState<IdeaBankContextSnapshot | null>(null);
  const [agentExternalMessage, setAgentExternalMessage] = useState<{ id: string; text: string } | null>(null);

  // ── Chat panel resize handler ───────────────────────────
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeRef.current = { startX: e.clientX, startWidth: chatPanelWidth };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!resizeRef.current) return;
        const delta = resizeRef.current.startX - moveEvent.clientX;
        const newWidth = Math.min(
          CHAT_PANEL_MAX_WIDTH,
          Math.max(CHAT_PANEL_MIN_WIDTH, resizeRef.current.startWidth + delta),
        );
        setChatPanelWidth(newWidth);
      };

      const handleMouseUp = () => {
        resizeRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [chatPanelWidth],
  );

  // ── IdeaBank → Agent bridge ─────────────────────────────
  const buildIdeaBankAgentMessage = useCallback(() => {
    if (!ideaBankContext || ideaBankContext.suggestionCount <= 0) return '';
    const lines = [
      `The IdeaBank has ${ideaBankContext.suggestionCount} suggestion(s) ready.`,
      ...(ideaBankContext.topIdeas?.map((idea, i) => `${i + 1}. ${idea}`) ?? []),
      '',
      'Please return:',
      '1) Best idea for today',
      '2) 7-day post plan aligned to brand voice',
      '3) Recommended prompts for generation',
    ];
    return lines.join('\n').trim();
  }, [ideaBankContext]);

  const queueIdeaBankMessageToAgent = useCallback(
    (context: IdeaBankContextSnapshot) => {
      if (!context || context.suggestionCount <= 0) return false;
      setAgentExternalMessage({
        id: `idea-bank-${Date.now()}`,
        text: buildIdeaBankAgentMessage(),
      });
      return true;
    },
    [buildIdeaBankAgentMessage],
  );

  const handleIdeaBankContextChange = useCallback((context: IdeaBankContextSnapshot) => {
    setIdeaBankContext(context);
  }, []);

  const handleExternalMessageConsumed = useCallback((id: string) => {
    setAgentExternalMessage((prev) => (prev?.id === id ? null : prev));
  }, []);

  // ── Render the main canvas area ─────────────────────────
  const renderCanvas = () => (
    <div className="flex-1 min-w-0 flex flex-col">
      <AnimatePresence mode="wait">
        {orch.state === 'idle' && (
          <ComposerView
            key="composer"
            onIdeaBankContextChange={handleIdeaBankContextChange}
            handlePromptChange={orch.handlePromptChange}
            handleSelectSuggestion={orch.handleSelectSuggestion}
            handleGenerate={orch.handleGenerate}
            toggleProductSelection={orch.toggleProductSelection}
            filteredProducts={orch.filteredProducts}
            categories={orch.categories}
            generateButtonRef={orch.generateButtonRef}
          />
        )}
        {orch.state === 'generating' && (
          <GeneratingView key="generating" onCancel={orch.handleCancelGeneration} mediaType={orch.generatedMediaType} />
        )}
        {orch.state === 'result' && (
          <ResultViewEnhanced
            key="result"
            handleReset={orch.handleReset}
            handleDownloadWithFeedback={orch.handleDownloadWithFeedback}
            handleCopyText={orch.handleCopyText}
            handleCanvasEditComplete={orch.handleCanvasEditComplete}
            haptic={orch.haptic}
            zoomContainerRef={orch.zoomContainerRef}
          />
        )}
      </AnimatePresence>

      {/* IdeaBank bar below the canvas */}
      <div className="mt-4 hidden lg:block">
        <IdeaBankBar handleSelectSuggestion={orch.handleSelectSuggestion} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-primary/10 via-purple-500/8 to-transparent blur-[120px] rounded-full animate-float" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-blue-500/10 via-cyan-500/8 to-transparent blur-[120px] rounded-full animate-float-delayed" />
      </div>

      <Header currentPage="studio" />

      <AnimatePresence>
        <ContextBar
          selectedProducts={orch.selectedProducts}
          selectedTemplate={orch.selectedTemplate}
          platform={orch.platform}
          visible={orch.showContextBar}
        />
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════
          MAIN 3-COLUMN LAYOUT: Asset Drawer | Canvas | Chat
          ═══════════════════════════════════════════════════════ */}
      <main className="relative z-10 pt-16 h-[calc(100vh-0px)]">
        <div className="flex h-full">
          {/* ── LEFT: Asset Drawer ──────────────────────────── */}
          <AnimatePresence>
            {assetDrawerOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: ASSET_DRAWER_WIDTH, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="hidden lg:block border-r border-border bg-card/30 overflow-hidden flex-shrink-0"
              >
                <AssetDrawer isOpen={assetDrawerOpen} onToggle={() => setAssetDrawerOpen(false)} className="h-full" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── CENTER: Canvas + Controls ───────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
            {/* Toolbar row */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/50 backdrop-blur-sm flex-shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setAssetDrawerOpen(!assetDrawerOpen)}
                  title={assetDrawerOpen ? 'Hide assets' : 'Show assets'}
                >
                  {assetDrawerOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                </Button>
                <span className="text-sm font-medium text-muted-foreground">
                  {orch.selectedProducts.length > 0
                    ? `${orch.selectedProducts.length} product${orch.selectedProducts.length !== 1 ? 's' : ''} selected`
                    : 'Select products to get started'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={orch.handleHistoryToggle} className="gap-2 h-8">
                  <History className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">History</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setChatPanelOpen(!chatPanelOpen)}
                  title={chatPanelOpen ? 'Hide chat' : 'Show chat'}
                >
                  {chatPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Canvas area with optional inspector */}
            <div className="flex-1 overflow-y-auto">
              <div
                className={cn('p-4 lg:p-6', orch.historyPanelOpen ? 'lg:grid lg:grid-cols-[1fr_320px] lg:gap-6' : '')}
              >
                <div className={cn(orch.state === 'result' ? 'lg:grid lg:grid-cols-[1fr_360px] lg:gap-6' : '')}>
                  {renderCanvas()}

                  {/* Inspector panel - only visible when there's a result */}
                  {orch.state === 'result' && (
                    <div className="hidden lg:block">
                      <div className="sticky top-4 max-h-[calc(100vh-160px)] rounded-2xl border border-border bg-card/30 overflow-hidden">
                        <InspectorPanel
                          onApplyEdit={orch.handleApplyEdit}
                          handleGenerateCopy={orch.handleGenerateCopy}
                          handleAskAI={orch.handleAskAI}
                          handleDownloadWithFeedback={orch.handleDownloadWithFeedback}
                          handleLoadFromHistory={orch.handleLoadFromHistory}
                          authUser={orch.authUser}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* History panel */}
                {orch.historyPanelOpen && (
                  <HistoryPanel
                    isOpen={orch.historyPanelOpen}
                    onToggle={orch.handleHistoryToggle}
                    onSelectGeneration={(id) => {
                      orch.selectGeneration(id);
                      fetch(`/api/generations/${id}`, { credentials: 'include' })
                        .then((r) => r.json())
                        .then((data) => {
                          if (data.imageUrl) orch.handleLoadFromHistory(data);
                        })
                        .catch(console.error);
                    }}
                    className="hidden lg:flex"
                  />
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Agent Chat Panel ────────────────────── */}
          <AnimatePresence>
            {chatPanelOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: chatPanelWidth, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="hidden lg:flex flex-col border-l border-border bg-card/20 flex-shrink-0 relative"
                style={{ width: chatPanelWidth }}
              >
                {/* Resize handle */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 transition-colors z-10"
                  onMouseDown={handleResizeStart}
                />
                <AgentChatPanel
                  products={orch.products ?? []}
                  title="Ad Assistant"
                  forceExpanded
                  showCollapseToggle={false}
                  className="h-full border-0 rounded-none"
                  bodyMaxHeightClassName="flex-1"
                  ideaBankContext={ideaBankContext}
                  externalMessage={agentExternalMessage}
                  onExternalMessageConsumed={handleExternalMessageConsumed}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ── Mobile Inspector (bottom sheet) ─────────────────── */}
      {orch.generatedImage && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t max-h-[60vh] overflow-y-auto">
          <InspectorPanel
            onApplyEdit={orch.handleApplyEdit}
            handleGenerateCopy={orch.handleGenerateCopy}
            handleAskAI={orch.handleAskAI}
            handleDownloadWithFeedback={orch.handleDownloadWithFeedback}
            handleLoadFromHistory={orch.handleLoadFromHistory}
            authUser={orch.authUser}
          />
        </div>
      )}

      {/* ── Mobile Chat FAB ────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <Button
          variant="default"
          size="icon"
          className="rounded-full w-14 h-14 shadow-xl"
          onClick={() => setChatPanelOpen(!chatPanelOpen)}
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      </div>

      {/* ── Mobile Chat Sheet ──────────────────────────────── */}
      {chatPanelOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Ad Assistant</h2>
            <Button variant="ghost" size="icon" onClick={() => setChatPanelOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <AgentChatPanel
            products={orch.products ?? []}
            title="Ad Assistant"
            forceExpanded
            showCollapseToggle={false}
            className="h-[calc(100vh-64px)] border-0 rounded-none"
            bodyMaxHeightClassName="flex-1"
            ideaBankContext={ideaBankContext}
            externalMessage={agentExternalMessage}
            onExternalMessageConsumed={handleExternalMessageConsumed}
          />
        </div>
      )}

      {/* ── Save to Catalog Dialog ─────────────────────────── */}
      {orch.generatedImage && (
        <ErrorBoundary>
          <SaveToCatalogDialog
            isOpen={orch.showSaveToCatalog}
            onClose={() => orch.setShowSaveToCatalog(false)}
            imageUrl={orch.generatedImage}
            defaultName={`Generated - ${new Date().toLocaleDateString()}`}
          />
        </ErrorBoundary>
      )}

      {/* ── Template Inspiration Dialog ────────────────────── */}
      <Dialog open={orch.showTemplateInspiration} onOpenChange={orch.setShowTemplateInspiration}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Template Inspiration
            </DialogTitle>
            <DialogDescription>Browse high-performing ad references for creative direction</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {orch.isLoadingFeatured ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (orch.featuredAdTemplates ?? []).length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p>No featured templates yet.</p>
                <Link href="/library?tab=templates">
                  <Button variant="link" className="mt-2">
                    Browse template library
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
                {(orch.featuredAdTemplates ?? []).map((template) => (
                  <button
                    key={template.id}
                    onClick={() => orch.handleSelectPerformingTemplate(template)}
                    className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors text-left card-hover-lift"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                      {template.previewImageUrl ? (
                        <img
                          src={template.previewImageUrl}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Layout className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                      )}
                      {template.isFeatured && (
                        <Badge className="absolute top-2 left-2 bg-yellow-500/90 text-yellow-950 text-xs">
                          <Star className="w-3 h-3 mr-1 fill-current" /> Featured
                        </Badge>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <h4 className="font-medium text-sm line-clamp-1">{template.name}</h4>
                      <div className="flex flex-wrap gap-1">
                        {template.mood && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10">{template.mood}</span>
                        )}
                        {template.style && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10">{template.style}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Keyboard Shortcuts ─────────────────────────────── */}
      <KeyboardShortcutsPanel
        visible={orch.showKeyboardShortcuts}
        shortcuts={orch.shortcuts}
        onClose={() => orch.setShowKeyboardShortcuts(false)}
        onToggle={() => orch.setShowKeyboardShortcuts(!orch.showKeyboardShortcuts)}
        haptic={orch.haptic}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PHOENIX STUDIO — Top-level export with StudioProvider
// ════════════════════════════════════════════════════════════

export default function PhoenixStudio() {
  return (
    <StudioProvider>
      <ErrorBoundary>
        <PhoenixStudioContent />
      </ErrorBoundary>
    </StudioProvider>
  );
}
