import { z } from 'zod';
import { logger } from '../lib/logger';

/**
 * Zod schemas for validating LLM JSON responses.
 * Replaces all bare JSON.parse() + `as Type` casts with runtime validation.
 *
 * Usage:
 *   const result = safeParseLLMResponse(jsonString, ideaSuggestionArraySchema, 'idea_suggestion');
 */

// ─── Idea Bank Suggestions ─────────────────────────────────────────

export const ideaSuggestionSchema = z.object({
  summary: z.string().optional(),
  prompt: z.string(),
  mode: z.string(),
  templateId: z.string().optional(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(100).default(70),
  recommendedPlatform: z.string().optional(),
  recommendedAspectRatio: z.string().optional(),
});

export const ideaSuggestionArraySchema = z.array(ideaSuggestionSchema);

// ─── Copywriting Service ────────────────────────────────────────────

export const generatedCopySchema = z.object({
  headline: z.string().default(''),
  hook: z.string().default(''),
  bodyText: z.string().default(''),
  caption: z.string().default(''),
  cta: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  framework: z.string().optional(),
});

// ─── Vision Analysis ────────────────────────────────────────────────

export const visionAnalysisSchema = z.object({
  category: z.string().default('unknown'),
  subcategory: z.string().default('unknown'),
  materials: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  style: z.string().default('unknown'),
  usageContext: z.string().default(''),
  targetDemographic: z.string().default(''),
  detectedText: z.string().nullable().default(null),
  confidence: z.number().min(0).max(100).default(80),
});

// ─── Confidence Scoring ─────────────────────────────────────────────

export const brandVoiceAlignmentSchema = z.object({
  alignmentScore: z.number().min(0).max(100),
  reasoning: z.string(),
});

// ─── Carousel Outline ───────────────────────────────────────────────

export const carouselSlideSchema = z.object({
  purpose: z.string().default('point'),
  headline: z.string().default(''),
  body: z.string().default(''),
  imagePrompt: z.string().default(''),
});

export const carouselOutlineSchema = z.object({
  title: z.string().default(''),
  description: z.string().default(''),
  slides: z.array(carouselSlideSchema).default([]),
  captionCopy: z.string().default(''),
  hashtags: z.array(z.string()).optional(),
});

// ─── Pattern Extraction ─────────────────────────────────────────────

export const extractedPatternSchema = z.object({
  layoutPattern: z.record(z.string(), z.unknown()).default({}),
  colorPsychology: z.record(z.string(), z.unknown()).default({}),
  hookPatterns: z.record(z.string(), z.unknown()).default({}),
  visualElements: z.record(z.string(), z.unknown()).default({}),
  confidenceScore: z.number().min(0).max(1).default(0.8),
});

// ─── Enrichment AI Helpers ──────────────────────────────────────────

export const enrichmentComparisonSchema = z.object({
  isMatch: z.boolean().default(false),
  confidence: z.number().min(0).max(1).default(0),
  matchedAttributes: z.array(z.string()).default([]),
  reasoning: z.string().default(''),
});

export const enrichmentExtractionSchema = z.record(z.string(), z.unknown());

// ─── Template Pattern RAG ───────────────────────────────────────────

export const templateAnalysisSchema = z.object({
  templateType: z.string().default('unknown'),
  elements: z.array(z.string()).default([]),
  mood: z.string().default(''),
  effectiveness: z.number().min(0).max(100).default(50),
});

// ─── Privacy Filter ─────────────────────────────────────────────────

export const privacyScanResultSchema = z.object({
  containsPII: z.boolean().default(false),
  detectedPII: z.array(z.string()).default([]),
  containsText: z.boolean().default(false),
  detectedText: z.array(z.string()).default([]),
  riskLevel: z.enum(['low', 'medium', 'high']).default('low'),
});

// ─── Relationship Discovery ─────────────────────────────────────────

export const relationshipDiscoverySchema = z.object({
  relationships: z.array(z.object({
    type: z.string(),
    sourceId: z.string().optional(),
    targetId: z.string().optional(),
    confidence: z.number().min(0).max(1).default(0),
    reasoning: z.string().default(''),
  })).default([]),
});

// ─── Installation Scenario RAG ──────────────────────────────────────

export const installationMatchSchema = z.object({
  matches: z.array(z.object({
    scenarioId: z.string().optional(),
    relevance: z.number().min(0).max(1).default(0),
    reasoning: z.string().default(''),
  })).default([]),
});

// ─── Product Enrichment ─────────────────────────────────────────────

export const productEnrichmentSchema = z.record(z.string(), z.unknown());

// ─── Source Discovery ───────────────────────────────────────────────

export const sourceDiscoverySchema = z.array(z.object({
  url: z.string(),
  type: z.string().default('unknown'),
  confidence: z.number().min(0).max(1).default(0),
}));


// ─── Safe Parse Helper ──────────────────────────────────────────────

/**
 * Safely parse an LLM JSON response with Zod validation.
 * Extracts JSON from the text, parses it, and validates against the schema.
 * Returns the validated data or throws a descriptive error.
 */
export function safeParseLLMResponse<T extends z.ZodType>(
  text: string,
  schema: T,
  context: string,
): z.infer<T> {
  // Extract JSON from text (may be wrapped in markdown code blocks)
  let jsonContent = text;

  // Try extracting from code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    jsonContent = codeBlockMatch[1].trim();
  } else {
    // Try to find raw JSON array or object
    const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }
  }

  // Parse JSON
  let raw: unknown;
  try {
    raw = JSON.parse(jsonContent);
  } catch (parseError) {
    // Try fixing truncated JSON
    let fixed = jsonContent.replace(/,\s*$/, '');
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';
    for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';

    try {
      raw = JSON.parse(fixed);
    } catch {
      logger.error({ module: 'llmValidation', context, textSnippet: text.slice(0, 200) },
        'Failed to parse LLM JSON response');
      throw new Error(`Failed to parse LLM response JSON in ${context}`);
    }
  }

  // Validate with Zod
  const result = schema.safeParse(raw);
  if (!result.success) {
    logger.warn({
      module: 'llmValidation',
      context,
      errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
    }, 'LLM response failed Zod validation, using defaults where possible');

    // Try again with passthrough to get partial data
    // If the schema has defaults, this might still produce usable output
    try {
      return schema.parse(raw);
    } catch {
      throw new Error(`LLM response validation failed in ${context}: ${result.error.issues.map(i => i.message).join(', ')}`);
    }
  }

  return result.data;
}
