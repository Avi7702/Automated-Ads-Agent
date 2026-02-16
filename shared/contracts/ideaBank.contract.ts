/**
 * Zod contracts for Idea Bank API endpoints
 *
 * POST /api/idea-bank/suggest → IdeaBankSuggestResponse (freestyle mode)
 */
import { z } from 'zod';

/**
 * SourcesUsed — tracks which data sources contributed to a suggestion
 */
export const SourcesUsedDTO = z
  .object({
    visionAnalysis: z.boolean(),
    kbRetrieval: z.boolean(),
    webSearch: z.boolean(),
    templateMatching: z.boolean(),
  })
  .passthrough();

export type SourcesUsedDTO = z.infer<typeof SourcesUsedDTO>;

/**
 * IdeaBankSuggestionDTO — a single suggestion from the Idea Bank
 */
export const IdeaBankSuggestionDTO = z
  .object({
    id: z.string(),
    summary: z.string(),
    prompt: z.string(),
    mode: z.string(), // 'exact_insert' | 'inspiration' | 'standard'
    templateIds: z.array(z.string()).optional(),
    reasoning: z.string(),
    confidence: z.number(),
    sourcesUsed: SourcesUsedDTO,
    recommendedPlatform: z.string().optional(),
    recommendedAspectRatio: z.string().optional(),
  })
  .passthrough();

export type IdeaBankSuggestionDTO = z.infer<typeof IdeaBankSuggestionDTO>;

/**
 * AnalysisStatusDTO — metadata about how the suggestion was generated
 */
export const AnalysisStatusDTO = z
  .object({
    visionComplete: z.boolean(),
    kbQueried: z.boolean(),
    templatesMatched: z.number(),
    webSearchUsed: z.boolean(),
    productKnowledgeUsed: z.boolean().optional(),
    uploadDescriptionsUsed: z.number().optional(),
    learnedPatternsUsed: z.number().optional(),
    // Extra fields from aggregated multi-product responses
    message: z.string().optional(),
    details: z.string().optional(),
  })
  .passthrough();

export type AnalysisStatusDTO = z.infer<typeof AnalysisStatusDTO>;

/**
 * IdeaBankSuggestResponse — POST /api/idea-bank/suggest freestyle response
 */
export const IdeaBankSuggestResponseDTO = z
  .object({
    suggestions: z.array(IdeaBankSuggestionDTO),
    analysisStatus: AnalysisStatusDTO,
    recipe: z.unknown().optional(), // GenerationRecipe — complex nested object
  })
  .passthrough();

export type IdeaBankSuggestResponseDTO = z.infer<typeof IdeaBankSuggestResponseDTO>;
