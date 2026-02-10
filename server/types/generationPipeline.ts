// @ts-nocheck
/**
 * Generation Pipeline Types
 *
 * Type definitions for the systematic image generation pipeline.
 * All context sources flow through a shared GenerationContext object.
 */

import type { GenerationRecipe } from '@shared/types/ideaBank';
import type { StyleAnalysisResult, StyleElements } from '../services/styleAnalysisService';
import type { VisionAnalysisResult } from '../services/visionAnalysisService';

// ============================================
// INPUT TYPES
// ============================================

export interface ImageInput {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

export type GenerationMode = 'standard' | 'exact_insert' | 'inspiration';

export interface GenerationInput {
  prompt: string;
  mode: GenerationMode;
  images: ImageInput[];
  templateId?: string;
  templateReferenceUrls?: string[];
  recipe?: GenerationRecipe;
  styleReferenceIds?: string[];
  resolution: '1K' | '2K' | '4K';
  userId: string;
}

// ============================================
// CONTEXT TYPES (populated by pipeline stages)
// ============================================

export interface ProductContext {
  primaryId: string;
  primaryName: string;
  category?: string;
  description?: string;
  relationships: Array<{
    targetProductName: string;
    relationshipType: string;
    description?: string;
  }>;
  scenarios: Array<{
    title: string;
    description: string;
    steps?: string[];
    isActive: boolean;
  }>;
  brandImages: Array<{
    imageUrl: string;
    category: string;
  }>;
  formattedContext: string;
}

export interface BrandContext {
  name: string;
  styles: string[];
  values: string[];
  colors: string[];
  voicePrinciples: string[];
}

export interface StyleContext {
  directive: string;
  referenceCount: number;
}

export interface VisionContext {
  category: string;
  materials: string[];
  colors: string[];
  style: string;
  usageContext: string;
}

export interface KBContext {
  context: string;
  citations: string[];
}

export interface PatternsContext {
  directive: string;
  patternCount: number;
}

export interface TemplateContext {
  id: string;
  title: string;
  blueprint: string;
  mood: string;
  lighting: string;
  environment: string;
  placementHints: Record<string, unknown>;
  category: string;
  referenceImageUrls: string[];
}

// ============================================
// MAIN CONTEXT OBJECT
// ============================================

export interface GenerationContext {
  input: GenerationInput;
  product?: ProductContext;
  brand?: BrandContext;
  style?: StyleContext;
  vision?: VisionContext;
  kb?: KBContext;
  patterns?: PatternsContext;
  template?: TemplateContext;
  assembled?: {
    finalPrompt: string;
    imageParts: Array<{ inlineData: { mimeType: string; data: string } }>;
  };
  result?: {
    imageBase64: string;
    mimeType: string;
    conversationHistory: any[];
    usageMetadata?: Record<string, unknown>;
    modelResponse?: any;
  };
}

// ============================================
// CRITIQUE TYPES (populated by critic stage)
// ============================================

export interface CritiqueResult {
  /** Whether the image passed quality checks */
  passed: boolean;
  /** Overall quality score 0-100 */
  score: number;
  /** Specific check results */
  checks: {
    productVisible: boolean;
    brandConsistent: boolean;
    compositionGood: boolean;
    promptFaithful: boolean;
  };
  /** Short summary of issues found */
  issues: string[];
  /** Revised prompt suggestion if needs retry */
  revisedPrompt?: string;
}

// ============================================
// RESULT TYPES
// ============================================

export interface GenerationResult {
  generationId: string;
  imageUrl: string;
  prompt: string;
  canEdit: boolean;
  mode: GenerationMode;
  templateId?: string;
  stagesCompleted: string[];
}
