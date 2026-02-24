/**
 * Shared types for studio hooks
 */
import type { Product, PerformingAdTemplate, AdSceneTemplate } from '@shared/schema';
import type { GenerationDTO } from '@shared/types/api';
import type { GenerationRecipe, GenerationMode, IdeaBankMode } from '@shared/types/ideaBank';
import type { AnalyzedUpload } from '@/types/analyzedUpload';
import type { ContentTemplate } from '@shared/contentTemplates';

export type GenerationState = 'idle' | 'generating' | 'result';

export interface CopyResult {
  headline: string;
  hook: string;
  bodyText: string;
  cta: string;
  caption: string;
  hashtags: string[];
  framework: string;
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

export interface SelectedSuggestion {
  id: string;
  prompt: string;
  reasoning?: string | undefined;
}

// Re-export types used by consumers
export type {
  Product,
  PerformingAdTemplate,
  AdSceneTemplate,
  GenerationDTO,
  GenerationRecipe,
  GenerationMode,
  IdeaBankMode,
  AnalyzedUpload,
  ContentTemplate,
};
