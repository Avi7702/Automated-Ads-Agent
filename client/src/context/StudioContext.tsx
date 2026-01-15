import { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';
import type { Product, AdSceneTemplate } from '@shared/schema';
import type { GenerationRecipe, GenerationMode, IdeaBankMode } from '@shared/types/ideaBank';
import type { AnalyzedUpload } from '@/types/analyzedUpload';

// ============================================
// STATE TYPES
// ============================================

export type GenerationState = 'idle' | 'generating' | 'result';

export interface SelectedSuggestion {
  id: string;
  prompt: string;
  reasoning?: string;
}

export interface StudioState {
  // Generation State
  generationState: GenerationState;
  generatedImage: string | null;
  generationId: string | null;

  // Selection State
  selectedProducts: Product[];
  selectedTemplate: AdSceneTemplate | null;
  tempUploads: AnalyzedUpload[];

  // Prompt State
  prompt: string;
  selectedSuggestion: SelectedSuggestion | null;

  // Output Settings
  platform: string;
  aspectRatio: string;
  resolution: '1K' | '2K' | '4K';

  // IdeaBank/Generation Mode
  ideaBankMode: IdeaBankMode;
  generationMode: GenerationMode;
  selectedTemplateForMode: AdSceneTemplate | null;
  generationRecipe: GenerationRecipe | undefined;

  // Copy
  generatedCopy: string;
}

// ============================================
// ACTIONS
// ============================================

export type StudioAction =
  // Generation Actions
  | { type: 'SET_GENERATION_STATE'; state: GenerationState }
  | { type: 'SET_GENERATED_IMAGE'; image: string; id: string }
  | { type: 'CLEAR_GENERATION' }

  // Product Actions
  | { type: 'SELECT_PRODUCT'; product: Product }
  | { type: 'DESELECT_PRODUCT'; productId: string }
  | { type: 'CLEAR_PRODUCTS' }
  | { type: 'SET_PRODUCTS'; products: Product[] }

  // Template Actions
  | { type: 'SELECT_TEMPLATE'; template: AdSceneTemplate }
  | { type: 'CLEAR_TEMPLATE' }

  // Upload Actions
  | { type: 'SET_UPLOADS'; uploads: AnalyzedUpload[] }
  | { type: 'ADD_UPLOAD'; upload: AnalyzedUpload }
  | { type: 'UPDATE_UPLOAD'; id: string; updates: Partial<AnalyzedUpload> }
  | { type: 'REMOVE_UPLOAD'; id: string }
  | { type: 'CLEAR_UPLOADS' }

  // Prompt Actions
  | { type: 'SET_PROMPT'; prompt: string }
  | { type: 'SET_SUGGESTION'; suggestion: SelectedSuggestion | null }

  // Output Settings Actions
  | { type: 'SET_PLATFORM'; platform: string }
  | { type: 'SET_ASPECT_RATIO'; aspectRatio: string }
  | { type: 'SET_RESOLUTION'; resolution: '1K' | '2K' | '4K' }

  // Mode Actions
  | { type: 'SET_IDEABANK_MODE'; mode: IdeaBankMode }
  | { type: 'SET_GENERATION_MODE'; mode: GenerationMode }
  | { type: 'SET_TEMPLATE_FOR_MODE'; template: AdSceneTemplate | null }
  | { type: 'SET_RECIPE'; recipe: GenerationRecipe | undefined }

  // Copy Actions
  | { type: 'SET_GENERATED_COPY'; copy: string }

  // Full Reset
  | { type: 'RESET' }

  // Load from history
  | { type: 'LOAD_FROM_HISTORY'; payload: Partial<StudioState> };

// ============================================
// INITIAL STATE
// ============================================

export const initialStudioState: StudioState = {
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
};

// ============================================
// REDUCER
// ============================================

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    // Generation Actions
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

    // Product Actions
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

    // Template Actions
    case 'SELECT_TEMPLATE':
      return { ...state, selectedTemplate: action.template };

    case 'CLEAR_TEMPLATE':
      return { ...state, selectedTemplate: null };

    // Upload Actions
    case 'SET_UPLOADS':
      return { ...state, tempUploads: action.uploads };

    case 'ADD_UPLOAD':
      return { ...state, tempUploads: [...state.tempUploads, action.upload] };

    case 'UPDATE_UPLOAD':
      return {
        ...state,
        tempUploads: state.tempUploads.map((u) =>
          u.id === action.id ? { ...u, ...action.updates } : u
        ),
      };

    case 'REMOVE_UPLOAD':
      return {
        ...state,
        tempUploads: state.tempUploads.filter((u) => u.id !== action.id),
      };

    case 'CLEAR_UPLOADS':
      return { ...state, tempUploads: [] };

    // Prompt Actions
    case 'SET_PROMPT':
      return { ...state, prompt: action.prompt };

    case 'SET_SUGGESTION':
      return {
        ...state,
        selectedSuggestion: action.suggestion,
        prompt: action.suggestion?.prompt ?? state.prompt,
      };

    // Output Settings Actions
    case 'SET_PLATFORM':
      return { ...state, platform: action.platform };

    case 'SET_ASPECT_RATIO':
      return { ...state, aspectRatio: action.aspectRatio };

    case 'SET_RESOLUTION':
      return { ...state, resolution: action.resolution };

    // Mode Actions
    case 'SET_IDEABANK_MODE':
      return { ...state, ideaBankMode: action.mode };

    case 'SET_GENERATION_MODE':
      return { ...state, generationMode: action.mode };

    case 'SET_TEMPLATE_FOR_MODE':
      return { ...state, selectedTemplateForMode: action.template };

    case 'SET_RECIPE':
      return { ...state, generationRecipe: action.recipe };

    // Copy Actions
    case 'SET_GENERATED_COPY':
      return { ...state, generatedCopy: action.copy };

    // Reset
    case 'RESET':
      return initialStudioState;

    // Load from history
    case 'LOAD_FROM_HISTORY':
      return { ...state, ...action.payload };

    default:
      return state;
  }
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

  return (
    <StudioContext.Provider value={{ state, dispatch }}>
      {children}
    </StudioContext.Provider>
  );
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
