/**
 * Idea Bank Service
 *
 * The core intelligence layer that generates ad idea suggestions by:
 * 1. Analyzing product images (via visionAnalysisService)
 * 2. Retrieving relevant context from KB (via fileSearchService)
 * 3. Matching templates based on product attributes
 * 4. Generating prompt suggestions with reasoning
 *
 * Pipeline: Vision Analysis -> KB Retrieval -> Template Matching -> LLM Reasoning
 *
 * Security: KB-first policy, web search disabled by default
 */

import { generateContentWithRetry } from "../lib/geminiClient";
import { storage } from "../storage";
import { visionAnalysisService, type VisionAnalysisResult } from "./visionAnalysisService";
import { queryFileSearchStore } from "./fileSearchService";
import {
  productKnowledgeService,
  type EnhancedProductContext,
} from "./productKnowledgeService";
import type {
  IdeaBankSuggestion,
  IdeaBankSuggestResponse,
  GenerationMode,
  SourcesUsed,
  GenerationRecipe,
  GenerationRecipeProduct,
  GenerationRecipeRelationship,
  GenerationRecipeScenario,
  IdeaBankMode,
  TemplateContext,
  TemplateSlotSuggestion,
  IdeaBankTemplateResponse,
  PlacementHints,
} from "@shared/types/ideaBank";
import type { Product, AdSceneTemplate, BrandProfile } from "@shared/schema";
import { createRateLimitMap } from "../utils/memoryManager";

// LLM model for reasoning - use Gemini 3 Flash for speed
// MODEL RECENCY RULE: Before changing any model ID, verify today's date and confirm the model is current within the last 3-4 weeks.
const REASONING_MODEL = process.env.GEMINI_REASONING_MODEL || "gemini-3-flash-preview";


// Rate limiting for suggest endpoint
// Now bounded with automatic cleanup of expired entries (max 10000 users)
const userSuggestCount = createRateLimitMap<{ count: number; resetAt: number }>('IdeaBankRateLimit', 10000);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

export interface IdeaBankRequest {
  productId?: string; // Optional if uploadDescriptions provided
  userId: string;
  userGoal?: string; // Optional user-provided goal/context
  enableWebSearch?: boolean; // Default: false (KB-first policy)
  maxSuggestions?: number; // Default: 3, max: 5
  uploadDescriptions?: string[]; // Descriptions of temporary uploaded images
  // Template mode support
  mode?: IdeaBankMode; // 'freestyle' (default) or 'template'
  templateId?: string; // Required when mode = 'template'
}

export interface IdeaBankError {
  code: "RATE_LIMITED" | "PRODUCT_NOT_FOUND" | "ANALYSIS_FAILED" | "KB_ERROR" | "LLM_ERROR" | "TEMPLATE_NOT_FOUND" | "TEMPLATE_REQUIRED";
  message: string;
}

/**
 * Check rate limit for suggestion requests
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userData = userSuggestCount.get(userId);

  if (!userData || userData.resetAt < now) {
    userSuggestCount.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (userData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userData.count++;
  return true;
}

/**
 * Generate ad idea suggestions for a product and/or uploaded images
 * Supports two modes:
 * - 'freestyle' (default): AI suggests complete prompts
 * - 'template': AI suggests content to fill template slots
 */
export async function generateSuggestions(
  request: IdeaBankRequest
): Promise<{ success: true; response: IdeaBankSuggestResponse | IdeaBankTemplateResponse } | { success: false; error: IdeaBankError }> {
  const { productId, userId, userGoal, enableWebSearch = false, maxSuggestions = 3, uploadDescriptions = [], mode = 'freestyle', templateId } = request;
  const buildStartTime = Date.now(); // Track for recipe debug timing

  // Rate limit check
  if (!checkRateLimit(userId)) {
    return {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many suggestion requests. Please wait before trying again.",
      },
    };
  }

  // Template mode validation and context fetching
  let templateContext: TemplateContext | null = null;

  if (mode === 'template') {
    if (!templateId) {
      return {
        success: false,
        error: {
          code: "TEMPLATE_REQUIRED",
          message: "templateId is required when mode is 'template'",
        },
      };
    }

    const template = await storage.getAdSceneTemplateById(templateId);
    if (!template) {
      return {
        success: false,
        error: {
          code: "TEMPLATE_NOT_FOUND",
          message: "Template not found",
        },
      };
    }

    templateContext = {
      id: template.id,
      title: template.title,
      promptBlueprint: template.promptBlueprint,
      placementHints: template.placementHints as PlacementHints | undefined,
      lightingStyle: template.lightingStyle || undefined,
      mood: template.mood || undefined,
      environment: template.environment || undefined,
      category: template.category,
      aspectRatioHints: template.aspectRatioHints || undefined,
      platformHints: template.platformHints || undefined,
      bestForProductTypes: template.bestForProductTypes || undefined,
    };
  }

  // Validate that we have at least a product or upload descriptions
  const hasProduct = !!productId;
  const hasUploads = uploadDescriptions.length > 0;

  if (!hasProduct && !hasUploads) {
    return {
      success: false,
      error: {
        code: "PRODUCT_NOT_FOUND",
        message: "Either productId or uploadDescriptions is required",
      },
    };
  }

  // 1. Fetch product if provided
  let product: Product | undefined;
  if (hasProduct) {
    product = await storage.getProductById(productId);
    if (!product) {
      return {
        success: false,
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: "Product not found",
        },
      };
    }
  }

  // 2. Get or perform vision analysis (only if product exists)
  let productAnalysis: VisionAnalysisResult | null = null;
  if (product) {
    const analysisResult = await visionAnalysisService.analyzeProductImage(product, userId);
    if (!analysisResult.success) {
      return {
        success: false,
        error: {
          code: "ANALYSIS_FAILED",
          message: analysisResult.error.message,
        },
      };
    }
    productAnalysis = analysisResult.analysis;
  }

  // 3. Fetch brand profile if exists
  const brandProfile = await storage.getBrandProfileByUserId(userId);

  // 3.5 Build enhanced product context (Phase 0.5) - only if product exists
  let enhancedContext: EnhancedProductContext | null = null;
  if (productId) {
    try {
      enhancedContext = await productKnowledgeService.buildEnhancedContext(productId, userId);
    } catch (err) {
      console.error("[IdeaBank] Failed to build enhanced context:", err);
      // Continue without enhanced context - not a fatal error
    }
  }

  // 4. Query KB for relevant context
  let kbContext: string | null = null;
  let kbCitations: string[] = [];
  try {
    const kbQuery = buildKBQueryExtended(product, productAnalysis, uploadDescriptions, userGoal);
    const kbResult = await queryFileSearchStore({ query: kbQuery, maxResults: 5 });
    if (kbResult) {
      kbContext = sanitizeKBContent(kbResult.context);
      kbCitations = kbResult.citations || [];
    }
  } catch (err) {
    console.error("[IdeaBank] KB query failed:", err);
    // Continue without KB context - not a fatal error
  }

  // 5. Match templates based on product analysis (if available) - only for freestyle mode
  const matchedTemplates = productAnalysis && mode === 'freestyle' ? await matchTemplates(productAnalysis) : [];

  // 6. Branch based on mode
  try {
    if (mode === 'template' && templateContext) {
      // TEMPLATE MODE: Generate slot suggestions for the selected template
      const slotSuggestions = await generateTemplateSlotSuggestions({
        templateContext,
        product,
        productAnalysis,
        uploadDescriptions,
        enhancedContext,
        brandProfile,
        kbContext,
        userGoal,
        maxSuggestions: Math.min(maxSuggestions, 3), // Limit to 3 for template mode
      });

      // Merge template with the best slot suggestion
      const bestSlot = slotSuggestions[0];
      const productName = product?.name || 'product';
      const mergedPrompt = mergeTemplateWithInsights(templateContext, bestSlot, productName);

      // Build GenerationRecipe for template mode
      const recipe = buildGenerationRecipe({
        product,
        enhancedContext,
        matchedTemplates: [], // No template matching in template mode
        brandProfile,
        buildStartTime,
      });

      // Build template response
      const response: IdeaBankTemplateResponse = {
        slotSuggestions,
        template: templateContext,
        mergedPrompt,
        analysisStatus: {
          visionComplete: !!productAnalysis,
          kbQueried: !!kbContext,
          templatesMatched: 1, // The selected template
          webSearchUsed: false,
          productKnowledgeUsed: !!enhancedContext,
          uploadDescriptionsUsed: uploadDescriptions.length,
        },
        recipe,
      };

      return { success: true, response };
    } else {
      // FREESTYLE MODE: Generate complete prompt suggestions (existing behavior)
      const suggestions = await generateLLMSuggestions({
        product,
        productAnalysis,
        uploadDescriptions,
        enhancedContext,
        brandProfile,
        kbContext,
        kbCitations,
        matchedTemplates,
        userGoal,
        maxSuggestions: Math.min(maxSuggestions, 5),
        enableWebSearch,
      });

      // Build GenerationRecipe for context passing to /api/transform
      const recipe = buildGenerationRecipe({
        product,
        enhancedContext,
        matchedTemplates,
        brandProfile,
        buildStartTime,
      });

      // Build response
      const response: IdeaBankSuggestResponse = {
        suggestions,
        analysisStatus: {
          visionComplete: !!productAnalysis,
          kbQueried: !!kbContext,
          templatesMatched: matchedTemplates.length,
          webSearchUsed: false, // Web search disabled for now
          productKnowledgeUsed: !!enhancedContext, // Phase 0.5
          uploadDescriptionsUsed: uploadDescriptions.length, // Phase 9
        },
        recipe, // Include recipe for /api/transform context
      };

      return { success: true, response };
    }
  } catch (err) {
    console.error("[IdeaBank] LLM generation failed:", err);
    return {
      success: false,
      error: {
        code: "LLM_ERROR",
        message: err instanceof Error ? err.message : "Failed to generate suggestions",
      },
    };
  }
}

/**
 * Build a KB query based on product and analysis
 */
function buildKBQuery(product: Product, analysis: VisionAnalysisResult, userGoal?: string): string {
  const parts = [
    `advertising ideas for ${analysis.category}`,
    analysis.subcategory,
    analysis.style,
    product.name,
  ];

  if (userGoal) {
    parts.push(userGoal);
  }

  return parts.filter(Boolean).join(" ");
}

/**
 * Build a KB query that can work with products, uploads, or both
 */
function buildKBQueryExtended(
  product: Product | undefined,
  analysis: VisionAnalysisResult | null,
  uploadDescriptions: string[],
  userGoal?: string
): string {
  const parts: string[] = [];

  // Add product-based terms if available
  if (analysis) {
    parts.push(`advertising ideas for ${analysis.category}`);
    if (analysis.subcategory) parts.push(analysis.subcategory);
    if (analysis.style) parts.push(analysis.style);
  }

  if (product) {
    parts.push(product.name);
  }

  // Add upload descriptions as additional context
  if (uploadDescriptions.length > 0) {
    parts.push(...uploadDescriptions.slice(0, 3)); // Limit to avoid overly long queries
  }

  if (userGoal) {
    parts.push(userGoal);
  }

  // If we have no parts at all, use a generic query
  if (parts.length === 0) {
    return "advertising ideas creative marketing";
  }

  return parts.filter(Boolean).join(" ");
}

/**
 * Sanitize KB content to prevent prompt injection
 */
function sanitizeKBContent(content: string): string {
  if (!content) return "";

  // Remove potential prompt injection patterns
  return content
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .replace(/\[INST\]|\[\/INST\]/gi, "") // Remove instruction markers
    .replace(/<\|.*?\|>/g, "") // Remove special tokens
    .replace(/system:|user:|assistant:/gi, "") // Remove role markers
    .replace(/ignore (previous|above|all) instructions/gi, "[filtered]")
    .replace(/you are now|pretend to be|act as if/gi, "[filtered]")
    .slice(0, 5000); // Limit length
}

/**
 * Match templates based on product analysis
 */
async function matchTemplates(analysis: VisionAnalysisResult): Promise<AdSceneTemplate[]> {
  // Get all global templates
  const allTemplates = await storage.getAdSceneTemplates({ isGlobal: true });

  // Score templates based on compatibility
  const scored = allTemplates.map((template) => ({
    template,
    score: calculateTemplateScore(template, analysis),
  }));

  // Sort by score and return top 5
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .filter((s) => s.score > 0)
    .map((s) => s.template);
}

/**
 * Calculate compatibility score between template and product analysis
 */
function calculateTemplateScore(template: AdSceneTemplate, analysis: VisionAnalysisResult): number {
  let score = 0;

  // Category match (high weight)
  if (
    template.bestForProductTypes?.some(
      (type) =>
        type.toLowerCase() === analysis.category.toLowerCase() ||
        type.toLowerCase() === analysis.subcategory.toLowerCase()
    )
  ) {
    score += 30;
  }

  // Style match
  if (template.mood?.toLowerCase() === analysis.style.toLowerCase()) {
    score += 20;
  }

  // Environment match
  if (analysis.usageContext.toLowerCase().includes(template.environment?.toLowerCase() || "")) {
    score += 15;
  }

  // Tag overlap
  const analysisTags = [
    ...analysis.materials,
    ...analysis.colors,
    analysis.category,
    analysis.subcategory,
    analysis.style,
  ].map((t) => t.toLowerCase());

  const templateTags = (template.tags || []).map((t) => t.toLowerCase());
  const tagOverlap = templateTags.filter((t) => analysisTags.includes(t)).length;
  score += tagOverlap * 5;

  return score;
}

/**
 * Generate suggestions using LLM
 */
async function generateLLMSuggestions(params: {
  product?: Product;
  productAnalysis: VisionAnalysisResult | null;
  uploadDescriptions: string[];
  enhancedContext: EnhancedProductContext | null;
  brandProfile: BrandProfile | undefined;
  kbContext: string | null;
  kbCitations: string[];
  matchedTemplates: AdSceneTemplate[];
  userGoal?: string;
  maxSuggestions: number;
  enableWebSearch: boolean;
}): Promise<IdeaBankSuggestion[]> {
  const {
    product,
    productAnalysis,
    uploadDescriptions,
    enhancedContext,
    brandProfile,
    kbContext,
    kbCitations,
    matchedTemplates,
    userGoal,
    maxSuggestions,
  } = params;

  // Build prompt
  const prompt = buildSuggestionPrompt({
    product,
    productAnalysis,
    uploadDescriptions,
    enhancedContext,
    brandProfile,
    kbContext,
    matchedTemplates,
    userGoal,
    maxSuggestions,
  });

  const response = await generateContentWithRetry({
    model: REASONING_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.7,
      maxOutputTokens: 8000,
    },
  }, { operation: 'idea_suggestion' });

  const text = response.text || "";
  console.log("[IdeaBank] LLM raw response length:", text.length);

  // Parse JSON response - try multiple patterns
  let jsonContent: string | null = null;

  // Try extracting from code block if wrapped
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonContent = codeBlockMatch[1].trim();
  } else {
    // Try to find raw JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }
  }

  if (!jsonContent || !jsonContent.startsWith('[')) {
    console.error("[IdeaBank] Failed to parse response. Full text:", text);
    throw new Error("Failed to parse suggestions response");
  }

  // Try to fix truncated JSON by closing incomplete objects
  let fixedJson = jsonContent;
  try {
    JSON.parse(fixedJson);
  } catch {
    // Try to close truncated JSON
    const openBrackets = (fixedJson.match(/\[/g) || []).length;
    const closeBrackets = (fixedJson.match(/\]/g) || []).length;
    const openBraces = (fixedJson.match(/\{/g) || []).length;
    const closeBraces = (fixedJson.match(/\}/g) || []).length;

    // Close any open braces and brackets
    fixedJson = fixedJson.replace(/,\s*$/, ''); // Remove trailing comma
    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixedJson += '}';
    }
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      fixedJson += ']';
    }
  }

  const rawSuggestions = JSON.parse(fixedJson) as Array<{
    prompt: string;
    mode: string;
    templateId?: string;
    reasoning: string;
    confidence: number;
    recommendedPlatform?: string;
    recommendedAspectRatio?: string;
  }>;

  // Transform and validate suggestions
  return rawSuggestions.slice(0, maxSuggestions).map((s, index) => ({
    id: `suggestion-${Date.now()}-${index}`,
    prompt: sanitizePrompt(s.prompt),
    mode: validateMode(s.mode),
    templateIds: s.templateId ? [s.templateId] : undefined,
    reasoning: sanitizeString(s.reasoning),
    confidence: Math.min(100, Math.max(0, s.confidence || 70)),
    sourcesUsed: {
      visionAnalysis: true,
      kbRetrieval: !!kbContext,
      webSearch: false,
      templateMatching: matchedTemplates.length > 0,
    } as SourcesUsed,
    recommendedPlatform: s.recommendedPlatform,
    recommendedAspectRatio: s.recommendedAspectRatio,
  }));
}

/**
 * Build the suggestion generation prompt
 */
function buildSuggestionPrompt(params: {
  product?: Product;
  productAnalysis: VisionAnalysisResult | null;
  uploadDescriptions: string[];
  enhancedContext: EnhancedProductContext | null;
  brandProfile: BrandProfile | undefined;
  kbContext: string | null;
  matchedTemplates: AdSceneTemplate[];
  userGoal?: string;
  maxSuggestions: number;
}): string {
  const { product, productAnalysis, uploadDescriptions, enhancedContext, brandProfile, kbContext, matchedTemplates, userGoal, maxSuggestions } =
    params;

  let prompt = `You are an expert advertising creative director. Generate ${maxSuggestions} distinct ad concept suggestions.

`;

  // Add product information if available
  if (product && productAnalysis) {
    prompt += `## Product Information
- Name: ${product.name}
- Category: ${productAnalysis.category} / ${productAnalysis.subcategory}
- Materials: ${productAnalysis.materials.join(", ") || "Not specified"}
- Colors: ${productAnalysis.colors.join(", ") || "Not specified"}
- Style: ${productAnalysis.style}
- Usage Context: ${productAnalysis.usageContext}
- Target Demographic: ${productAnalysis.targetDemographic}
`;
  }

  // Add uploaded image descriptions
  if (uploadDescriptions.length > 0) {
    prompt += `\n## Uploaded Images (User-Provided)
The user has also uploaded the following images for context:
${uploadDescriptions.map((desc, i) => `${i + 1}. "${desc}"`).join("\n")}

IMPORTANT: These uploaded images should be incorporated into your ad concepts. Consider how they can be used alongside the products or as the main visual elements.
`;
  }

  // Add enhanced product knowledge context (Phase 0.5)
  if (enhancedContext) {
    prompt += `\n## Enhanced Product Knowledge\n${enhancedContext.formattedContext}\n`;
  }

  if (userGoal) {
    prompt += `\n## User's Goal\n${sanitizeString(userGoal)}\n`;
  }

  if (brandProfile) {
    prompt += `\n## Brand Guidelines
- Brand: ${brandProfile.brandName || "Not specified"}
- Industry: ${brandProfile.industry || "Not specified"}
- Values: ${brandProfile.brandValues?.join(", ") || "Not specified"}
- Preferred Styles: ${brandProfile.preferredStyles?.join(", ") || "Not specified"}
`;
  }

  if (kbContext) {
    prompt += `\n## Relevant Context from Knowledge Base\n${kbContext}\n`;
  }

  if (matchedTemplates.length > 0) {
    prompt += `\n## Available Scene Templates\n`;
    matchedTemplates.forEach((t, i) => {
      prompt += `${i + 1}. "${t.title}" (ID: ${t.id})
   - Category: ${t.category}
   - Mood: ${t.mood || "Not specified"}
   - Environment: ${t.environment || "Not specified"}
   - Blueprint: ${t.promptBlueprint.slice(0, 100)}...
`;
    });
  }

  prompt += `
## Output Format
Return a JSON array of ${maxSuggestions} suggestions. Each suggestion must have:
- prompt: A detailed image generation prompt (50-150 words)
- mode: Either "exact_insert" (use template reference image) or "inspiration" (use template as style guide) or "standard" (no template)
- templateId: The template ID if using a template, omit otherwise
- reasoning: Why this concept works for the product (2-3 sentences)
- confidence: 0-100 score for how well this matches the product
- recommendedPlatform: Best platform (instagram, linkedin, facebook, twitter, tiktok)
- recommendedAspectRatio: Recommended ratio (1:1, 9:16, 16:9, 4:5)

Make suggestions diverse - vary the modes, platforms, and creative approaches.
For exact_insert mode, the prompt should describe placing the product in the template scene.
For inspiration mode, the prompt should capture the template's mood/style but create a new scene.

Return ONLY the JSON array, no other text.`;

  return prompt;
}

/**
 * Sanitize a generated prompt
 */
function sanitizePrompt(prompt: string): string {
  if (!prompt) return "";
  return prompt
    .replace(/[<>]/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 1000);
}

/**
 * Sanitize a string
 */
function sanitizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(/[<>]/g, "").trim().slice(0, 500);
}

/**
 * Validate generation mode
 */
function validateMode(mode: string): GenerationMode {
  const valid: GenerationMode[] = ["exact_insert", "inspiration", "standard"];
  const normalized = mode?.toLowerCase() as GenerationMode;
  return valid.includes(normalized) ? normalized : "standard";
}

// ============================================
// TEMPLATE MODE FUNCTIONS
// ============================================

/**
 * Generate template slot suggestions using LLM
 * This creates product-specific content to fill template slots
 */
async function generateTemplateSlotSuggestions(params: {
  templateContext: TemplateContext;
  product?: Product;
  productAnalysis: VisionAnalysisResult | null;
  uploadDescriptions: string[];
  enhancedContext: EnhancedProductContext | null;
  brandProfile: BrandProfile | undefined;
  kbContext: string | null;
  userGoal?: string;
  maxSuggestions: number;
}): Promise<TemplateSlotSuggestion[]> {
  const {
    templateContext,
    product,
    productAnalysis,
    uploadDescriptions,
    enhancedContext,
    brandProfile,
    kbContext,
    userGoal,
    maxSuggestions,
  } = params;

  const prompt = buildTemplateSlotPrompt({
    templateContext,
    product,
    productAnalysis,
    uploadDescriptions,
    enhancedContext,
    brandProfile,
    kbContext,
    userGoal,
    maxSuggestions,
  });

  const response = await generateContentWithRetry({
    model: REASONING_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.7,
      maxOutputTokens: 8000,
    },
  }, { operation: 'idea_refinement' });

  const text = response.text || "";
  console.log("[IdeaBank Template] LLM raw response length:", text.length);

  // Parse JSON response
  let jsonContent: string | null = null;

  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonContent = codeBlockMatch[1].trim();
  } else {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }
  }

  if (!jsonContent || !jsonContent.startsWith('[')) {
    console.error("[IdeaBank Template] Failed to parse response. Full text:", text);
    throw new Error("Failed to parse template slot suggestions response");
  }

  // Try to fix truncated JSON
  let fixedJson = jsonContent;
  try {
    JSON.parse(fixedJson);
  } catch {
    const openBrackets = (fixedJson.match(/\[/g) || []).length;
    const closeBrackets = (fixedJson.match(/\]/g) || []).length;
    const openBraces = (fixedJson.match(/\{/g) || []).length;
    const closeBraces = (fixedJson.match(/\}/g) || []).length;

    fixedJson = fixedJson.replace(/,\s*$/, '');
    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixedJson += '}';
    }
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      fixedJson += ']';
    }
  }

  const rawSuggestions = JSON.parse(fixedJson) as Array<{
    productHighlights?: string[];
    productPlacement?: string;
    detailsToEmphasize?: string[];
    scaleReference?: string;
    headerText?: string;
    bodyText?: string;
    ctaSuggestion?: string;
    colorHarmony?: string[];
    lightingNotes?: string;
    confidence?: number;
    reasoning?: string;
  }>;

  // Transform and validate slot suggestions
  return rawSuggestions.slice(0, maxSuggestions).map((s) => ({
    productHighlights: (s.productHighlights || []).slice(0, 5).map(h => sanitizeString(h)),
    productPlacement: sanitizeString(s.productPlacement || 'center of frame'),
    detailsToEmphasize: (s.detailsToEmphasize || []).slice(0, 5).map(d => sanitizeString(d)),
    scaleReference: s.scaleReference ? sanitizeString(s.scaleReference) : undefined,
    headerText: s.headerText ? sanitizeString(s.headerText).slice(0, 60) : undefined,
    bodyText: s.bodyText ? sanitizeString(s.bodyText).slice(0, 150) : undefined,
    ctaSuggestion: s.ctaSuggestion ? sanitizeString(s.ctaSuggestion).slice(0, 30) : undefined,
    colorHarmony: (s.colorHarmony || []).slice(0, 5).map(c => sanitizeString(c)),
    lightingNotes: sanitizeString(s.lightingNotes || 'Natural lighting'),
    confidence: Math.min(100, Math.max(0, s.confidence || 70)),
    reasoning: sanitizeString(s.reasoning || 'Product-template compatibility analysis'),
  }));
}

/**
 * Build the prompt for template slot suggestion generation
 */
function buildTemplateSlotPrompt(params: {
  templateContext: TemplateContext;
  product?: Product;
  productAnalysis: VisionAnalysisResult | null;
  uploadDescriptions: string[];
  enhancedContext: EnhancedProductContext | null;
  brandProfile: BrandProfile | undefined;
  kbContext: string | null;
  userGoal?: string;
  maxSuggestions: number;
}): string {
  const {
    templateContext,
    product,
    productAnalysis,
    uploadDescriptions,
    enhancedContext,
    brandProfile,
    kbContext,
    userGoal,
    maxSuggestions,
  } = params;

  let prompt = `You are an expert advertising creative director. Your task is to suggest how to fill a template's content slots for a specific product.

## Template Structure
- Title: ${templateContext.title}
- Category: ${templateContext.category}
- Prompt Blueprint: ${templateContext.promptBlueprint}
`;

  if (templateContext.lightingStyle) {
    prompt += `- Lighting Style: ${templateContext.lightingStyle}\n`;
  }
  if (templateContext.mood) {
    prompt += `- Mood: ${templateContext.mood}\n`;
  }
  if (templateContext.environment) {
    prompt += `- Environment: ${templateContext.environment}\n`;
  }
  if (templateContext.placementHints) {
    prompt += `- Placement Hints: Position=${templateContext.placementHints.position || 'center'}, Scale=${templateContext.placementHints.scale || 'medium'}\n`;
  }
  if (templateContext.aspectRatioHints?.length) {
    prompt += `- Recommended Aspect Ratios: ${templateContext.aspectRatioHints.join(', ')}\n`;
  }
  if (templateContext.platformHints?.length) {
    prompt += `- Best Platforms: ${templateContext.platformHints.join(', ')}\n`;
  }
  if (templateContext.bestForProductTypes?.length) {
    prompt += `- Best For Product Types: ${templateContext.bestForProductTypes.join(', ')}\n`;
  }

  // Add product information
  if (product && productAnalysis) {
    prompt += `
## Product Analysis
- Name: ${product.name}
- Category: ${productAnalysis.category} / ${productAnalysis.subcategory}
- Materials: ${productAnalysis.materials.join(", ") || "Not specified"}
- Colors: ${productAnalysis.colors.join(", ") || "Not specified"}
- Style: ${productAnalysis.style}
- Usage Context: ${productAnalysis.usageContext}
- Target Demographic: ${productAnalysis.targetDemographic}
`;
  }

  // Add upload descriptions
  if (uploadDescriptions.length > 0) {
    prompt += `
## Additional Uploaded Images
${uploadDescriptions.map((desc, i) => `${i + 1}. "${desc}"`).join("\n")}
`;
  }

  // Add enhanced context
  if (enhancedContext) {
    prompt += `\n## Enhanced Product Knowledge\n${enhancedContext.formattedContext}\n`;
  }

  // Add user goal
  if (userGoal) {
    prompt += `\n## User's Goal\n${sanitizeString(userGoal)}\n`;
  }

  // Add brand profile
  if (brandProfile) {
    prompt += `\n## Brand Guidelines
- Brand: ${brandProfile.brandName || "Not specified"}
- Industry: ${brandProfile.industry || "Not specified"}
- Values: ${brandProfile.brandValues?.join(", ") || "Not specified"}
- Preferred Styles: ${brandProfile.preferredStyles?.join(", ") || "Not specified"}
`;
  }

  // Add KB context
  if (kbContext) {
    prompt += `\n## Relevant Context from Knowledge Base\n${kbContext}\n`;
  }

  prompt += `
## Your Task
Generate ${maxSuggestions} different slot suggestions to customize this template for the product. Each suggestion should fill these slots:

### Required Slots:
- productHighlights: 3-5 key features to visually show (strings array)
- productPlacement: How/where to position product in the scene (string)
- detailsToEmphasize: Visual details to highlight in the image (strings array)
- colorHarmony: Colors that complement the product and work with the template mood (strings array)
- lightingNotes: How to light this specific product within the template's lighting style (string)
- confidence: 0-100 score for how well this fills the template (number)
- reasoning: 2-3 sentences explaining why these suggestions work (string)

### Optional Copy Slots (only include if appropriate for the template):
- scaleReference: Object or element to show scale (e.g., "worker's hands", "doorframe")
- headerText: Headline text, max 60 chars (string)
- bodyText: Supporting copy, max 150 chars (string)
- ctaSuggestion: Call to action, max 30 chars (string)

## Output Format
Return a JSON array of ${maxSuggestions} slot suggestions. Each must have all required slots.

Return ONLY the JSON array, no other text.`;

  return prompt;
}

/**
 * Merge template blueprint with AI-suggested slot content
 */
function mergeTemplateWithInsights(
  template: TemplateContext,
  slotSuggestion: TemplateSlotSuggestion,
  productName: string
): string {
  // Start with the template blueprint
  let mergedPrompt = template.promptBlueprint;

  // Replace {{product}} placeholder if present
  mergedPrompt = mergedPrompt.replace(/\{\{product\}\}/gi, productName);

  // Build product-specific additions
  const additions: string[] = [];

  // Add product highlights
  if (slotSuggestion.productHighlights.length > 0) {
    additions.push(`Emphasize these product features: ${slotSuggestion.productHighlights.join(', ')}.`);
  }

  // Add placement guidance
  if (slotSuggestion.productPlacement) {
    additions.push(`Product placement: ${slotSuggestion.productPlacement}.`);
  }

  // Add details to emphasize
  if (slotSuggestion.detailsToEmphasize.length > 0) {
    additions.push(`Visual focus on: ${slotSuggestion.detailsToEmphasize.join(', ')}.`);
  }

  // Add scale reference if provided
  if (slotSuggestion.scaleReference) {
    additions.push(`Include ${slotSuggestion.scaleReference} for scale reference.`);
  }

  // Add color harmony
  if (slotSuggestion.colorHarmony.length > 0) {
    additions.push(`Color palette: ${slotSuggestion.colorHarmony.join(', ')}.`);
  }

  // Add lighting notes
  if (slotSuggestion.lightingNotes) {
    additions.push(`Lighting: ${slotSuggestion.lightingNotes}.`);
  }

  // Append all additions to the merged prompt
  if (additions.length > 0) {
    mergedPrompt += '\n\n' + additions.join(' ');
  }

  return mergedPrompt;
}

/**
 * Get matched templates for a product (without full suggestion generation)
 */
export async function getMatchedTemplates(
  productId: string,
  userId: string
): Promise<{ templates: AdSceneTemplate[]; analysis: VisionAnalysisResult } | null> {
  const product = await storage.getProductById(productId);
  if (!product) return null;

  const analysisResult = await visionAnalysisService.analyzeProductImage(product, userId);
  if (!analysisResult.success) return null;

  const templates = await matchTemplates(analysisResult.analysis);

  return {
    templates,
    analysis: analysisResult.analysis,
  };
}

/**
 * Build GenerationRecipe from enhanced context
 * Recipe includes products, relationships, scenarios, and brand context
 */
function buildGenerationRecipe(params: {
  product?: Product;
  enhancedContext: EnhancedProductContext | null;
  matchedTemplates: AdSceneTemplate[];
  brandProfile?: BrandProfile;
  buildStartTime: number;
}): GenerationRecipe | undefined {
  const { product, enhancedContext, matchedTemplates, brandProfile, buildStartTime } = params;

  // If no product or enhanced context, return undefined (recipe is optional)
  if (!product || !enhancedContext) {
    return undefined;
  }

  // Check if debug context should be included (env var gated)
  const includeDebug = process.env.ENABLE_DEBUG_CONTEXT === "true";

  // Build products array
  const products: GenerationRecipeProduct[] = [{
    id: product.id,
    name: product.name,
    category: product.category || undefined,
    description: product.description || undefined,
    imageUrls: product.cloudinaryUrl ? [product.cloudinaryUrl] : [],
  }];

  // Build relationships array
  const relationships: GenerationRecipeRelationship[] = enhancedContext.relatedProducts.map(rp => ({
    sourceProductId: product.id,
    sourceProductName: product.name,
    targetProductId: rp.product.id,
    targetProductName: rp.product.name,
    relationshipType: rp.relationshipType,
    description: rp.relationshipDescription,
  }));

  // Build scenarios array
  const scenarios: GenerationRecipeScenario[] = enhancedContext.installationScenarios.map(s => ({
    id: s.id,
    title: s.title,
    description: s.description,
    steps: s.installationSteps,
    isActive: true, // From enhanced context means active
    scenarioType: s.scenarioType,
  }));

  // Build template info (first matched template if any)
  const template = matchedTemplates.length > 0 ? {
    id: matchedTemplates[0].id,
    title: matchedTemplates[0].title,
    category: matchedTemplates[0].category,
    aspectRatio: matchedTemplates[0].aspectRatioHints?.[0],
  } : undefined;

  // Build brand images
  const brandImages = enhancedContext.brandImages.map(bi => ({
    id: bi.id,
    imageUrl: bi.cloudinaryUrl,
    category: bi.category,
  }));

  // Build brand voice
  const brandVoice = brandProfile ? {
    brandName: brandProfile.brandName || undefined,
    industry: brandProfile.industry || undefined,
    values: brandProfile.brandValues || undefined,
  } : undefined;

  const recipe: GenerationRecipe = {
    version: "1.0",
    products,
    relationships,
    scenarios,
    template,
    brandImages,
    brandVoice,
  };

  // Add debug context if enabled
  if (includeDebug) {
    const activeScenarios = scenarios.filter(s => s.isActive).length;
    recipe.debugContext = {
      relationshipsFound: relationships.length,
      scenariosFound: scenarios.length,
      scenariosActive: activeScenarios,
      scenariosInactive: scenarios.length - activeScenarios,
      templatesMatched: matchedTemplates.length,
      brandImagesFound: brandImages.length,
      buildTimeMs: Date.now() - buildStartTime,
    };
  }

  return recipe;
}

export const ideaBankService = {
  generateSuggestions,
  getMatchedTemplates,
};
