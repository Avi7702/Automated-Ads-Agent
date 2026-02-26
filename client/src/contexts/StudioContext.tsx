import { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';
import type { Product, AdSceneTemplate, PerformingAdTemplate } from '@shared/schema';
import type { GenerationRecipe, GenerationMode, IdeaBankMode } from '@shared/types/ideaBank';
import type { AnalyzedUpload } from '@/types/analyzedUpload';
import type { ContentTemplate } from '@shared/contentTemplates';

// ============================================
// STATE TYPES
// ============================================

export type GenerationState = 'idle' | 'generating' | 'result';

export interface SelectedSuggestion {
  id: string;
  prompt: string;
  reasoning?: string | undefined;
}

export interface CollapsedSections {
  upload: boolean;
  products: boolean;
  templates: boolean;
  refine: boolean;
  copy: boolean;
  preview: boolean;
  styleRefs: boolean;
}

export interface PriceEstimate {
  estimatedCost: number;
  p90: number;
  sampleCount: number;
  usedFallback: boolean;
}

export interface PlanContext {
  planId: string;
  postIndex: number;
  briefing: string;
  category: string;
  dayOfWeek: string;
}

export interface CopyResult {
  headline: string;
  hook: string;
  bodyText: string;
  cta: string;
  caption: string;
  hashtags: string[];
  framework: string;
}

export interface StudioState {
  // ── Generation State (3 fields) ────────────────────────
  generationState: GenerationState;
  generatedImage: string | null;
  generationId: string | null;

  // ── Selection State (3 fields) ─────────────────────────
  selectedProducts: Product[];
  selectedTemplate: AdSceneTemplate | null;
  tempUploads: AnalyzedUpload[];

  // ── Prompt State (2 fields) ────────────────────────────
  prompt: string;
  selectedSuggestion: SelectedSuggestion | null;

  // ── Output Settings (3 fields) ─────────────────────────
  platform: string;
  aspectRatio: string;
  resolution: '1K' | '2K' | '4K';

  // ── IdeaBank / Generation Mode (4 fields) ──────────────
  ideaBankMode: IdeaBankMode;
  generationMode: GenerationMode;
  selectedTemplateForMode: AdSceneTemplate | null;
  generationRecipe: GenerationRecipe | undefined;

  // ── Copy (1 field) ─────────────────────────────────────
  generatedCopy: string;

  // ════════════════════════════════════════════════════════
  // ORCHESTRATOR-ONLY FIELDS (added S2-11)
  // ════════════════════════════════════════════════════════

  // ── UI: Section State (4 fields) ───────────────────────
  collapsedSections: CollapsedSections;
  currentSection: string;
  showContextBar: boolean;
  showStickyGenerate: boolean;

  // ── UI: Quick Start (2 fields) ─────────────────────────
  quickStartMode: boolean;
  quickStartPrompt: string;

  // ── UI: Price Estimate (1 field) ───────────────────────
  priceEstimate: PriceEstimate | null;

  // ── UI: Action Buttons (1 field) ───────────────────────
  activeActionButton: 'edit' | 'copy' | 'preview' | 'save' | null;

  // ── UI: Dialogs (3 fields) ────────────────────────────
  showSaveToCatalog: boolean;
  showCanvasEditor: boolean;
  showKeyboardShortcuts: boolean;

  // ── UI: Zoom / Pan (2 fields) ─────────────────────────
  imageScale: number;
  imagePosition: { x: number; y: number };

  // ── UI: Media Mode (2 fields) ─────────────────────────
  mediaMode: 'image' | 'video';
  videoDuration: number;

  // ── Generation: Edit / Ask AI (5 fields) ──────────────
  editPrompt: string;
  isEditing: boolean;
  askAIQuestion: string;
  askAIResponse: string | null;
  isAskingAI: boolean;

  // ── Generation: Copy Extended (2 fields) ──────────────
  isGeneratingCopy: boolean;
  generatedCopyFull: CopyResult | null;

  // ── Generation: Video (2 fields) ──────────────────────
  videoJobId: string | null;
  generatedMediaType: 'image' | 'video';

  // ── Generation: UX Feedback (2 fields) ────────────────
  justCopied: boolean;
  isDownloading: boolean;

  // ── Products: Filtering (3 fields) ────────────────────
  templateCategory: string;
  searchQuery: string;
  categoryFilter: string;

  // ── Products: Template Inspiration (2 fields) ─────────
  showTemplateInspiration: boolean;
  selectedPerformingTemplate: PerformingAdTemplate | null;

  // ── Deep Link: Plan Context (2 fields) ────────────────
  planContext: PlanContext | null;
  cpTemplate: ContentTemplate | null;

  // ── Deep Link: Content Builders (6 fields) ────────────
  showCarouselBuilder: boolean;
  carouselTopic: string;
  showBeforeAfterBuilder: boolean;
  beforeAfterTopic: string;
  showTextOnlyMode: boolean;
  textOnlyTopic: string;

  // ── History (1 field) ─────────────────────────────────
  historyPanelOpen: boolean;
}

// ============================================
// ACTIONS (24 original + 40 new = 64 total)
// ============================================

export type StudioAction =
  // ── Generation Actions ─────────────────────────────────
  | { type: 'SET_GENERATION_STATE'; state: GenerationState }
  | { type: 'SET_GENERATED_IMAGE'; image: string; id: string }
  | { type: 'CLEAR_GENERATION' }

  // ── Product Actions ────────────────────────────────────
  | { type: 'SELECT_PRODUCT'; product: Product }
  | { type: 'DESELECT_PRODUCT'; productId: string }
  | { type: 'CLEAR_PRODUCTS' }
  | { type: 'SET_PRODUCTS'; products: Product[] }

  // ── Template Actions ───────────────────────────────────
  | { type: 'SELECT_TEMPLATE'; template: AdSceneTemplate }
  | { type: 'CLEAR_TEMPLATE' }

  // ── Upload Actions ─────────────────────────────────────
  | { type: 'SET_UPLOADS'; uploads: AnalyzedUpload[] }
  | { type: 'ADD_UPLOAD'; upload: AnalyzedUpload }
  | { type: 'UPDATE_UPLOAD'; id: string; updates: Partial<AnalyzedUpload> }
  | { type: 'REMOVE_UPLOAD'; id: string }
  | { type: 'CLEAR_UPLOADS' }

  // ── Prompt Actions ─────────────────────────────────────
  | { type: 'SET_PROMPT'; prompt: string }
  | { type: 'SET_SUGGESTION'; suggestion: SelectedSuggestion | null }

  // ── Output Settings Actions ────────────────────────────
  | { type: 'SET_PLATFORM'; platform: string }
  | { type: 'SET_ASPECT_RATIO'; aspectRatio: string }
  | { type: 'SET_RESOLUTION'; resolution: '1K' | '2K' | '4K' }

  // ── Mode Actions ───────────────────────────────────────
  | { type: 'SET_IDEABANK_MODE'; mode: IdeaBankMode }
  | { type: 'SET_GENERATION_MODE'; mode: GenerationMode }
  | { type: 'SET_TEMPLATE_FOR_MODE'; template: AdSceneTemplate | null }
  | { type: 'SET_RECIPE'; recipe: GenerationRecipe | undefined }

  // ── Copy Actions ───────────────────────────────────────
  | { type: 'SET_GENERATED_COPY'; copy: string }

  // ── Full Reset ─────────────────────────────────────────
  | { type: 'RESET' }

  // ── Load from history ──────────────────────────────────
  | { type: 'LOAD_FROM_HISTORY'; payload: Partial<StudioState> }

  // ════════════════════════════════════════════════════════
  // NEW ACTIONS (S2-11: orchestrator-only fields)
  // ════════════════════════════════════════════════════════

  // ── UI: Section State Actions ──────────────────────────
  | { type: 'SET_COLLAPSED_SECTIONS'; sections: CollapsedSections }
  | { type: 'TOGGLE_SECTION'; section: keyof CollapsedSections }
  | { type: 'SET_CURRENT_SECTION'; section: string }
  | { type: 'SET_SHOW_CONTEXT_BAR'; visible: boolean }
  | { type: 'SET_SHOW_STICKY_GENERATE'; visible: boolean }

  // ── UI: Quick Start Actions ────────────────────────────
  | { type: 'SET_QUICK_START_MODE'; enabled: boolean }
  | { type: 'SET_QUICK_START_PROMPT'; prompt: string }

  // ── UI: Price Estimate Actions ─────────────────────────
  | { type: 'SET_PRICE_ESTIMATE'; estimate: PriceEstimate | null }

  // ── UI: Action Button Actions ──────────────────────────
  | { type: 'SET_ACTIVE_ACTION_BUTTON'; button: 'edit' | 'copy' | 'preview' | 'save' | null }

  // ── UI: Dialog Actions ─────────────────────────────────
  | { type: 'SET_SHOW_SAVE_TO_CATALOG'; visible: boolean }
  | { type: 'SET_SHOW_CANVAS_EDITOR'; visible: boolean }
  | { type: 'SET_SHOW_KEYBOARD_SHORTCUTS'; visible: boolean }

  // ── UI: Zoom / Pan Actions ─────────────────────────────
  | { type: 'SET_IMAGE_SCALE'; scale: number }
  | { type: 'SET_IMAGE_POSITION'; position: { x: number; y: number } }

  // ── UI: Media Mode Actions ─────────────────────────────
  | { type: 'SET_MEDIA_MODE'; mode: 'image' | 'video' }
  | { type: 'SET_VIDEO_DURATION'; duration: number }

  // ── Generation: Edit / Ask AI Actions ──────────────────
  | { type: 'SET_EDIT_PROMPT'; prompt: string }
  | { type: 'SET_IS_EDITING'; editing: boolean }
  | { type: 'SET_ASK_AI_QUESTION'; question: string }
  | { type: 'SET_ASK_AI_RESPONSE'; response: string | null }
  | { type: 'SET_IS_ASKING_AI'; asking: boolean }

  // ── Generation: Copy Extended Actions ──────────────────
  | { type: 'SET_IS_GENERATING_COPY'; generating: boolean }
  | { type: 'SET_GENERATED_COPY_FULL'; copyResult: CopyResult | null }

  // ── Generation: Video Actions ──────────────────────────
  | { type: 'SET_VIDEO_JOB_ID'; jobId: string | null }
  | { type: 'SET_GENERATED_MEDIA_TYPE'; mediaType: 'image' | 'video' }

  // ── Generation: UX Feedback Actions ────────────────────
  | { type: 'SET_JUST_COPIED'; copied: boolean }
  | { type: 'SET_IS_DOWNLOADING'; downloading: boolean }

  // ── Products: Filtering Actions ────────────────────────
  | { type: 'SET_TEMPLATE_CATEGORY'; category: string }
  | { type: 'SET_SEARCH_QUERY'; query: string }
  | { type: 'SET_CATEGORY_FILTER'; filter: string }

  // ── Products: Template Inspiration Actions ─────────────
  | { type: 'SET_SHOW_TEMPLATE_INSPIRATION'; visible: boolean }
  | { type: 'SET_SELECTED_PERFORMING_TEMPLATE'; template: PerformingAdTemplate | null }

  // ── Deep Link: Plan Context Actions ────────────────────
  | { type: 'SET_PLAN_CONTEXT'; context: PlanContext | null }
  | { type: 'CLEAR_PLAN_CONTEXT' }
  | { type: 'SET_CP_TEMPLATE'; template: ContentTemplate | null }

  // ── Deep Link: Content Builder Actions ─────────────────
  | { type: 'SET_SHOW_CAROUSEL_BUILDER'; visible: boolean }
  | { type: 'SET_CAROUSEL_TOPIC'; topic: string }
  | { type: 'SET_SHOW_BEFORE_AFTER_BUILDER'; visible: boolean }
  | { type: 'SET_BEFORE_AFTER_TOPIC'; topic: string }
  | { type: 'SET_SHOW_TEXT_ONLY_MODE'; visible: boolean }
  | { type: 'SET_TEXT_ONLY_TOPIC'; topic: string }

  // ── History Actions ────────────────────────────────────
  | { type: 'SET_HISTORY_PANEL_OPEN'; open: boolean };

// ============================================
// INITIAL STATE
// ============================================

const defaultCollapsedSections: CollapsedSections = {
  upload: false,
  products: false,
  templates: false,
  refine: false,
  copy: true,
  preview: true,
  styleRefs: false,
};

export const initialStudioState: StudioState = {
  // ── Original 16 fields ─────────────────────────────────
  // Generation
  generationState: 'idle',
  generatedImage: null,
  generationId: null,

  // Selection
  selectedProducts: [],
  selectedTemplate: null,
  tempUploads: [],

  // Prompt
  prompt: '',
  selectedSuggestion: null,

  // Output
  platform: 'LinkedIn',
  aspectRatio: '1200x627',
  resolution: '2K',

  // Modes
  ideaBankMode: 'freestyle',
  generationMode: 'standard',
  selectedTemplateForMode: null,
  generationRecipe: undefined,

  // Copy
  generatedCopy: '',

  // ── Orchestrator-only fields (S2-11) ───────────────────

  // UI: Section State
  collapsedSections: defaultCollapsedSections,
  currentSection: 'products',
  showContextBar: false,
  showStickyGenerate: false,

  // UI: Quick Start
  quickStartMode: false,
  quickStartPrompt: '',

  // UI: Price Estimate
  priceEstimate: null,

  // UI: Action Buttons
  activeActionButton: null,

  // UI: Dialogs
  showSaveToCatalog: false,
  showCanvasEditor: false,
  showKeyboardShortcuts: false,

  // UI: Zoom / Pan
  imageScale: 1,
  imagePosition: { x: 0, y: 0 },

  // UI: Media Mode
  mediaMode: 'image',
  videoDuration: 8,

  // Generation: Edit / Ask AI
  editPrompt: '',
  isEditing: false,
  askAIQuestion: '',
  askAIResponse: null,
  isAskingAI: false,

  // Generation: Copy Extended
  isGeneratingCopy: false,
  generatedCopyFull: null,

  // Generation: Video
  videoJobId: null,
  generatedMediaType: 'image',

  // Generation: UX Feedback
  justCopied: false,
  isDownloading: false,

  // Products: Filtering
  templateCategory: 'all',
  searchQuery: '',
  categoryFilter: 'all',

  // Products: Template Inspiration
  showTemplateInspiration: false,
  selectedPerformingTemplate: null,

  // Deep Link: Plan Context
  planContext: null,
  cpTemplate: null,

  // Deep Link: Content Builders
  showCarouselBuilder: false,
  carouselTopic: '',
  showBeforeAfterBuilder: false,
  beforeAfterTopic: '',
  showTextOnlyMode: false,
  textOnlyTopic: '',

  // History
  historyPanelOpen: false,
};

// ============================================
// REDUCER
// ============================================

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    // ── Generation Actions ─────────────────────────────────
    case 'SET_GENERATION_STATE':
      return { ...state, generationState: action.state };

    case 'SET_GENERATED_IMAGE':
      return {
        ...state,
        generatedImage: action.image,
        generationId: action.id,
        generationState: 'result',
      };

    case 'CLEAR_GENERATION':
      return {
        ...state,
        generationState: 'idle',
        generatedImage: null,
        generationId: null,
      };

    // ── Product Actions ────────────────────────────────────
    case 'SELECT_PRODUCT':
      if (state.selectedProducts.some((p) => p.id === action.product.id)) {
        return state;
      }
      return {
        ...state,
        selectedProducts: [...state.selectedProducts, action.product],
      };

    case 'DESELECT_PRODUCT':
      return {
        ...state,
        selectedProducts: state.selectedProducts.filter((p) => p.id !== action.productId),
      };

    case 'CLEAR_PRODUCTS':
      return { ...state, selectedProducts: [] };

    case 'SET_PRODUCTS':
      return { ...state, selectedProducts: action.products };

    // ── Template Actions ───────────────────────────────────
    case 'SELECT_TEMPLATE':
      return { ...state, selectedTemplate: action.template };

    case 'CLEAR_TEMPLATE':
      return { ...state, selectedTemplate: null };

    // ── Upload Actions ─────────────────────────────────────
    case 'SET_UPLOADS':
      return { ...state, tempUploads: action.uploads };

    case 'ADD_UPLOAD':
      return { ...state, tempUploads: [...state.tempUploads, action.upload] };

    case 'UPDATE_UPLOAD':
      return {
        ...state,
        tempUploads: state.tempUploads.map((u) => (u.id === action.id ? { ...u, ...action.updates } : u)),
      };

    case 'REMOVE_UPLOAD':
      return {
        ...state,
        tempUploads: state.tempUploads.filter((u) => u.id !== action.id),
      };

    case 'CLEAR_UPLOADS':
      return { ...state, tempUploads: [] };

    // ── Prompt Actions ─────────────────────────────────────
    case 'SET_PROMPT':
      return { ...state, prompt: action.prompt };

    case 'SET_SUGGESTION':
      return {
        ...state,
        selectedSuggestion: action.suggestion,
        prompt: action.suggestion?.prompt ?? state.prompt,
      };

    // ── Output Settings Actions ────────────────────────────
    case 'SET_PLATFORM':
      return { ...state, platform: action.platform };

    case 'SET_ASPECT_RATIO':
      return { ...state, aspectRatio: action.aspectRatio };

    case 'SET_RESOLUTION':
      return { ...state, resolution: action.resolution };

    // ── Mode Actions ───────────────────────────────────────
    case 'SET_IDEABANK_MODE':
      return { ...state, ideaBankMode: action.mode };

    case 'SET_GENERATION_MODE':
      return { ...state, generationMode: action.mode };

    case 'SET_TEMPLATE_FOR_MODE':
      return { ...state, selectedTemplateForMode: action.template };

    case 'SET_RECIPE':
      return { ...state, generationRecipe: action.recipe };

    // ── Copy Actions ───────────────────────────────────────
    case 'SET_GENERATED_COPY':
      return { ...state, generatedCopy: action.copy };

    // ── Reset ──────────────────────────────────────────────
    case 'RESET':
      return initialStudioState;

    // ── Load from history ──────────────────────────────────
    case 'LOAD_FROM_HISTORY':
      return { ...state, ...action.payload };

    // ════════════════════════════════════════════════════════
    // NEW REDUCER CASES (S2-11)
    // ════════════════════════════════════════════════════════

    // ── UI: Section State ──────────────────────────────────
    case 'SET_COLLAPSED_SECTIONS':
      return { ...state, collapsedSections: action.sections };

    case 'TOGGLE_SECTION':
      return {
        ...state,
        collapsedSections: {
          ...state.collapsedSections,
          [action.section]: !state.collapsedSections[action.section],
        },
      };

    case 'SET_CURRENT_SECTION':
      return { ...state, currentSection: action.section };

    case 'SET_SHOW_CONTEXT_BAR':
      return { ...state, showContextBar: action.visible };

    case 'SET_SHOW_STICKY_GENERATE':
      return { ...state, showStickyGenerate: action.visible };

    // ── UI: Quick Start ────────────────────────────────────
    case 'SET_QUICK_START_MODE':
      return { ...state, quickStartMode: action.enabled };

    case 'SET_QUICK_START_PROMPT':
      return { ...state, quickStartPrompt: action.prompt };

    // ── UI: Price Estimate ─────────────────────────────────
    case 'SET_PRICE_ESTIMATE':
      return { ...state, priceEstimate: action.estimate };

    // ── UI: Action Buttons ─────────────────────────────────
    case 'SET_ACTIVE_ACTION_BUTTON':
      return { ...state, activeActionButton: action.button };

    // ── UI: Dialogs ────────────────────────────────────────
    case 'SET_SHOW_SAVE_TO_CATALOG':
      return { ...state, showSaveToCatalog: action.visible };

    case 'SET_SHOW_CANVAS_EDITOR':
      return { ...state, showCanvasEditor: action.visible };

    case 'SET_SHOW_KEYBOARD_SHORTCUTS':
      return { ...state, showKeyboardShortcuts: action.visible };

    // ── UI: Zoom / Pan ─────────────────────────────────────
    case 'SET_IMAGE_SCALE':
      return { ...state, imageScale: action.scale };

    case 'SET_IMAGE_POSITION':
      return { ...state, imagePosition: action.position };

    // ── UI: Media Mode ─────────────────────────────────────
    case 'SET_MEDIA_MODE':
      return { ...state, mediaMode: action.mode };

    case 'SET_VIDEO_DURATION':
      return { ...state, videoDuration: action.duration };

    // ── Generation: Edit / Ask AI ──────────────────────────
    case 'SET_EDIT_PROMPT':
      return { ...state, editPrompt: action.prompt };

    case 'SET_IS_EDITING':
      return { ...state, isEditing: action.editing };

    case 'SET_ASK_AI_QUESTION':
      return { ...state, askAIQuestion: action.question };

    case 'SET_ASK_AI_RESPONSE':
      return { ...state, askAIResponse: action.response };

    case 'SET_IS_ASKING_AI':
      return { ...state, isAskingAI: action.asking };

    // ── Generation: Copy Extended ──────────────────────────
    case 'SET_IS_GENERATING_COPY':
      return { ...state, isGeneratingCopy: action.generating };

    case 'SET_GENERATED_COPY_FULL':
      return { ...state, generatedCopyFull: action.copyResult };

    // ── Generation: Video ──────────────────────────────────
    case 'SET_VIDEO_JOB_ID':
      return { ...state, videoJobId: action.jobId };

    case 'SET_GENERATED_MEDIA_TYPE':
      return { ...state, generatedMediaType: action.mediaType };

    // ── Generation: UX Feedback ────────────────────────────
    case 'SET_JUST_COPIED':
      return { ...state, justCopied: action.copied };

    case 'SET_IS_DOWNLOADING':
      return { ...state, isDownloading: action.downloading };

    // ── Products: Filtering ────────────────────────────────
    case 'SET_TEMPLATE_CATEGORY':
      return { ...state, templateCategory: action.category };

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.query };

    case 'SET_CATEGORY_FILTER':
      return { ...state, categoryFilter: action.filter };

    // ── Products: Template Inspiration ─────────────────────
    case 'SET_SHOW_TEMPLATE_INSPIRATION':
      return { ...state, showTemplateInspiration: action.visible };

    case 'SET_SELECTED_PERFORMING_TEMPLATE':
      return { ...state, selectedPerformingTemplate: action.template };

    // ── Deep Link: Plan Context ────────────────────────────
    case 'SET_PLAN_CONTEXT':
      return { ...state, planContext: action.context };

    case 'CLEAR_PLAN_CONTEXT':
      return { ...state, planContext: null };

    case 'SET_CP_TEMPLATE':
      return { ...state, cpTemplate: action.template };

    // ── Deep Link: Content Builders ────────────────────────
    case 'SET_SHOW_CAROUSEL_BUILDER':
      return { ...state, showCarouselBuilder: action.visible };

    case 'SET_CAROUSEL_TOPIC':
      return { ...state, carouselTopic: action.topic };

    case 'SET_SHOW_BEFORE_AFTER_BUILDER':
      return { ...state, showBeforeAfterBuilder: action.visible };

    case 'SET_BEFORE_AFTER_TOPIC':
      return { ...state, beforeAfterTopic: action.topic };

    case 'SET_SHOW_TEXT_ONLY_MODE':
      return { ...state, showTextOnlyMode: action.visible };

    case 'SET_TEXT_ONLY_TOPIC':
      return { ...state, textOnlyTopic: action.topic };

    // ── History ────────────────────────────────────────────
    case 'SET_HISTORY_PANEL_OPEN':
      return { ...state, historyPanelOpen: action.open };

    default:
      return state;
  }
}

// ============================================
// TYPED ACTION CREATORS (S2-11)
// ============================================

/** Typed action creators for all StudioAction types */
export const studioActions = {
  // Generation
  setGenerationState: (genState: GenerationState): StudioAction => ({ type: 'SET_GENERATION_STATE', state: genState }),
  setGeneratedImage: (image: string, id: string): StudioAction => ({ type: 'SET_GENERATED_IMAGE', image, id }),
  clearGeneration: (): StudioAction => ({ type: 'CLEAR_GENERATION' }),

  // Products
  selectProduct: (product: Product): StudioAction => ({ type: 'SELECT_PRODUCT', product }),
  deselectProduct: (productId: string): StudioAction => ({ type: 'DESELECT_PRODUCT', productId }),
  clearProducts: (): StudioAction => ({ type: 'CLEAR_PRODUCTS' }),
  setProducts: (products: Product[]): StudioAction => ({ type: 'SET_PRODUCTS', products }),

  // Templates
  selectTemplate: (template: AdSceneTemplate): StudioAction => ({ type: 'SELECT_TEMPLATE', template }),
  clearTemplate: (): StudioAction => ({ type: 'CLEAR_TEMPLATE' }),

  // Uploads
  setUploads: (uploads: AnalyzedUpload[]): StudioAction => ({ type: 'SET_UPLOADS', uploads }),
  addUpload: (upload: AnalyzedUpload): StudioAction => ({ type: 'ADD_UPLOAD', upload }),
  updateUpload: (id: string, updates: Partial<AnalyzedUpload>): StudioAction => ({
    type: 'UPDATE_UPLOAD',
    id,
    updates,
  }),
  removeUpload: (id: string): StudioAction => ({ type: 'REMOVE_UPLOAD', id }),
  clearUploads: (): StudioAction => ({ type: 'CLEAR_UPLOADS' }),

  // Prompt
  setPrompt: (prompt: string): StudioAction => ({ type: 'SET_PROMPT', prompt }),
  setSuggestion: (suggestion: SelectedSuggestion | null): StudioAction => ({ type: 'SET_SUGGESTION', suggestion }),

  // Output Settings
  setPlatform: (platform: string): StudioAction => ({ type: 'SET_PLATFORM', platform }),
  setAspectRatio: (aspectRatio: string): StudioAction => ({ type: 'SET_ASPECT_RATIO', aspectRatio }),
  setResolution: (resolution: '1K' | '2K' | '4K'): StudioAction => ({ type: 'SET_RESOLUTION', resolution }),

  // Modes
  setIdeaBankMode: (mode: IdeaBankMode): StudioAction => ({ type: 'SET_IDEABANK_MODE', mode }),
  setGenerationMode: (mode: GenerationMode): StudioAction => ({ type: 'SET_GENERATION_MODE', mode }),
  setTemplateForMode: (template: AdSceneTemplate | null): StudioAction => ({
    type: 'SET_TEMPLATE_FOR_MODE',
    template,
  }),
  setRecipe: (recipe: GenerationRecipe | undefined): StudioAction => ({ type: 'SET_RECIPE', recipe }),

  // Copy
  setGeneratedCopy: (copy: string): StudioAction => ({ type: 'SET_GENERATED_COPY', copy }),

  // Reset & History
  reset: (): StudioAction => ({ type: 'RESET' }),
  loadFromHistory: (payload: Partial<StudioState>): StudioAction => ({ type: 'LOAD_FROM_HISTORY', payload }),

  // UI: Section State
  setCollapsedSections: (sections: CollapsedSections): StudioAction => ({
    type: 'SET_COLLAPSED_SECTIONS',
    sections,
  }),
  toggleSection: (section: keyof CollapsedSections): StudioAction => ({ type: 'TOGGLE_SECTION', section }),
  setCurrentSection: (section: string): StudioAction => ({ type: 'SET_CURRENT_SECTION', section }),
  setShowContextBar: (visible: boolean): StudioAction => ({ type: 'SET_SHOW_CONTEXT_BAR', visible }),
  setShowStickyGenerate: (visible: boolean): StudioAction => ({ type: 'SET_SHOW_STICKY_GENERATE', visible }),

  // UI: Quick Start
  setQuickStartMode: (enabled: boolean): StudioAction => ({ type: 'SET_QUICK_START_MODE', enabled }),
  setQuickStartPrompt: (prompt: string): StudioAction => ({ type: 'SET_QUICK_START_PROMPT', prompt }),

  // UI: Price Estimate
  setPriceEstimate: (estimate: PriceEstimate | null): StudioAction => ({ type: 'SET_PRICE_ESTIMATE', estimate }),

  // UI: Action Buttons
  setActiveActionButton: (button: 'edit' | 'copy' | 'preview' | 'save' | null): StudioAction => ({
    type: 'SET_ACTIVE_ACTION_BUTTON',
    button,
  }),

  // UI: Dialogs
  setShowSaveToCatalog: (visible: boolean): StudioAction => ({ type: 'SET_SHOW_SAVE_TO_CATALOG', visible }),
  setShowCanvasEditor: (visible: boolean): StudioAction => ({ type: 'SET_SHOW_CANVAS_EDITOR', visible }),
  setShowKeyboardShortcuts: (visible: boolean): StudioAction => ({ type: 'SET_SHOW_KEYBOARD_SHORTCUTS', visible }),

  // UI: Zoom / Pan
  setImageScale: (scale: number): StudioAction => ({ type: 'SET_IMAGE_SCALE', scale }),
  setImagePosition: (position: { x: number; y: number }): StudioAction => ({ type: 'SET_IMAGE_POSITION', position }),

  // UI: Media Mode
  setMediaMode: (mode: 'image' | 'video'): StudioAction => ({ type: 'SET_MEDIA_MODE', mode }),
  setVideoDuration: (duration: number): StudioAction => ({ type: 'SET_VIDEO_DURATION', duration }),

  // Generation: Edit / Ask AI
  setEditPrompt: (prompt: string): StudioAction => ({ type: 'SET_EDIT_PROMPT', prompt }),
  setIsEditing: (editing: boolean): StudioAction => ({ type: 'SET_IS_EDITING', editing }),
  setAskAIQuestion: (question: string): StudioAction => ({ type: 'SET_ASK_AI_QUESTION', question }),
  setAskAIResponse: (response: string | null): StudioAction => ({ type: 'SET_ASK_AI_RESPONSE', response }),
  setIsAskingAI: (asking: boolean): StudioAction => ({ type: 'SET_IS_ASKING_AI', asking }),

  // Generation: Copy Extended
  setIsGeneratingCopy: (generating: boolean): StudioAction => ({ type: 'SET_IS_GENERATING_COPY', generating }),
  setGeneratedCopyFull: (copyResult: CopyResult | null): StudioAction => ({
    type: 'SET_GENERATED_COPY_FULL',
    copyResult,
  }),

  // Generation: Video
  setVideoJobId: (jobId: string | null): StudioAction => ({ type: 'SET_VIDEO_JOB_ID', jobId }),
  setGeneratedMediaType: (mediaType: 'image' | 'video'): StudioAction => ({
    type: 'SET_GENERATED_MEDIA_TYPE',
    mediaType,
  }),

  // Generation: UX Feedback
  setJustCopied: (copied: boolean): StudioAction => ({ type: 'SET_JUST_COPIED', copied }),
  setIsDownloading: (downloading: boolean): StudioAction => ({ type: 'SET_IS_DOWNLOADING', downloading }),

  // Products: Filtering
  setTemplateCategory: (category: string): StudioAction => ({ type: 'SET_TEMPLATE_CATEGORY', category }),
  setSearchQuery: (query: string): StudioAction => ({ type: 'SET_SEARCH_QUERY', query }),
  setCategoryFilter: (filter: string): StudioAction => ({ type: 'SET_CATEGORY_FILTER', filter }),

  // Products: Template Inspiration
  setShowTemplateInspiration: (visible: boolean): StudioAction => ({
    type: 'SET_SHOW_TEMPLATE_INSPIRATION',
    visible,
  }),
  setSelectedPerformingTemplate: (template: PerformingAdTemplate | null): StudioAction => ({
    type: 'SET_SELECTED_PERFORMING_TEMPLATE',
    template,
  }),

  // Deep Link: Plan Context
  setPlanContext: (context: PlanContext | null): StudioAction => ({ type: 'SET_PLAN_CONTEXT', context }),
  clearPlanContext: (): StudioAction => ({ type: 'CLEAR_PLAN_CONTEXT' }),
  setCpTemplate: (template: ContentTemplate | null): StudioAction => ({ type: 'SET_CP_TEMPLATE', template }),

  // Deep Link: Content Builders
  setShowCarouselBuilder: (visible: boolean): StudioAction => ({ type: 'SET_SHOW_CAROUSEL_BUILDER', visible }),
  setCarouselTopic: (topic: string): StudioAction => ({ type: 'SET_CAROUSEL_TOPIC', topic }),
  setShowBeforeAfterBuilder: (visible: boolean): StudioAction => ({
    type: 'SET_SHOW_BEFORE_AFTER_BUILDER',
    visible,
  }),
  setBeforeAfterTopic: (topic: string): StudioAction => ({ type: 'SET_BEFORE_AFTER_TOPIC', topic }),
  setShowTextOnlyMode: (visible: boolean): StudioAction => ({ type: 'SET_SHOW_TEXT_ONLY_MODE', visible }),
  setTextOnlyTopic: (topic: string): StudioAction => ({ type: 'SET_TEXT_ONLY_TOPIC', topic }),

  // History
  setHistoryPanelOpen: (open: boolean): StudioAction => ({ type: 'SET_HISTORY_PANEL_OPEN', open }),
} as const;

// ============================================
// FIELD SELECTOR HOOK (S2-11)
// ============================================

/**
 * Type-safe selector hook for accessing individual StudioState fields.
 *
 * Usage:
 *   const prompt = useStudioField('prompt');
 *   const generatedImage = useStudioField('generatedImage');
 */
export function useStudioField<K extends keyof StudioState>(field: K): StudioState[K] {
  const { state } = useStudioContext();
  return state[field];
}

// ============================================
// CONTEXT
// ============================================

interface StudioContextValue {
  state: StudioState;
  dispatch: Dispatch<StudioAction>;
}

const StudioContext = createContext<StudioContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface StudioProviderProps {
  children: ReactNode;
  initialState?: Partial<StudioState>;
}

export function StudioProvider({ children, initialState }: StudioProviderProps) {
  const [state, dispatch] = useReducer(studioReducer, {
    ...initialStudioState,
    ...initialState,
  });

  return <StudioContext.Provider value={{ state, dispatch }}>{children}</StudioContext.Provider>;
}

// ============================================
// HOOK
// ============================================

export function useStudioContext() {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudioContext must be used within a StudioProvider');
  }
  return context;
}

export { StudioContext };
