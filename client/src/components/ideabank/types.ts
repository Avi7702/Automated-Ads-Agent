/**
 * Types for IdeaBank components
 */
import type {
  IdeaBankSuggestResponse,
  IdeaBankSuggestion,
  GenerationMode,
  GenerationRecipe,
  IdeaBankMode,
  TemplateSlotSuggestion,
  TemplateContext,
} from "@shared/types/ideaBank";
import type { Product } from "@shared/schema";
import type { AnalyzedUpload } from "@/types/analyzedUpload";

export interface IdeaBankContextSnapshot {
  mode: IdeaBankMode;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  suggestionCount: number;
  suggestions: Array<{
    id: string;
    summary: string;
    prompt: string;
    reasoning?: string;
    confidence?: number;
    recommendedPlatform?: string;
    recommendedAspectRatio?: string;
  }>;
}

export interface IdeaBankPanelProps {
  selectedProducts: Product[];
  tempUploads?: AnalyzedUpload[];
  onSelectPrompt: (prompt: string, id?: string, reasoning?: string) => void;
  onRecipeAvailable?: (recipe: GenerationRecipe | undefined) => void;
  onSetPlatform?: (platform: string) => void;
  onSetAspectRatio?: (aspectRatio: string) => void;
  onQuickGenerate?: (prompt: string) => void;
  className?: string;
  selectedPromptId?: string;
  isGenerating?: boolean;
  mode?: IdeaBankMode;
  templateId?: string;
  onSlotSuggestionSelect?: (suggestion: TemplateSlotSuggestion, mergedPrompt: string) => void;
  onContextChange?: (context: IdeaBankContextSnapshot) => void;
}

export interface IdeaBankHeaderProps {
  mode: IdeaBankMode;
  legacyMode: boolean;
  loading: boolean;
  onRefresh: () => void;
}

export interface IdeaBankInputSummaryProps {
  selectedProducts: Product[];
  selectedUploads: AnalyzedUpload[];
  analyzingCount: number;
}

export interface IdeaBankAnalysisStatusProps {
  response: IdeaBankSuggestResponse;
  legacyMode: boolean;
}

export interface SuggestionCardProps {
  suggestion: IdeaBankSuggestion;
  onUse: (prompt: string, id: string, reasoning?: string) => void;
  onQuickGenerate?: (prompt: string) => void;
  index: number;
  isSelected: boolean;
  isGenerating?: boolean;
}

export interface TemplateSlotCardProps {
  suggestion: TemplateSlotSuggestion;
  onUse: (suggestion: TemplateSlotSuggestion, mergedPrompt: string) => void;
  index: number;
  isSelected: boolean;
  mergedPrompt: string;
}

export interface IdeaBankSuggestionsProps {
  mode: IdeaBankMode;
  response: IdeaBankSuggestResponse | null;
  slotSuggestions: TemplateSlotSuggestion[];
  mergedPrompt: string;
  templateContext: TemplateContext | null;
  templateId?: string;
  loading: boolean;
  error: string | null;
  selectedPromptId?: string;
  selectedSlotIndex: number | null;
  isGenerating?: boolean;
  onSelectPrompt: (prompt: string, id?: string, reasoning?: string) => void;
  onQuickGenerate?: (prompt: string) => void;
  onSlotSelect: (index: number, suggestion: TemplateSlotSuggestion, mergedPrompt: string) => void;
  onRecipeAvailable?: (recipe: GenerationRecipe | undefined) => void;
  onSetPlatform?: (platform: string) => void;
  onSetAspectRatio?: (aspectRatio: string) => void;
}

export type {
  IdeaBankSuggestResponse,
  IdeaBankSuggestion,
  GenerationMode,
  GenerationRecipe,
  IdeaBankMode,
  TemplateSlotSuggestion,
  TemplateContext,
};
