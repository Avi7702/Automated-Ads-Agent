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

import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import { visionAnalysisService, type VisionAnalysisResult } from "./visionAnalysisService";
import { queryFileSearchStore } from "./fileSearchService";
import type {
  IdeaBankSuggestion,
  IdeaBankSuggestResponse,
  GenerationMode,
  SourcesUsed,
} from "@shared/types/ideaBank";
import type { Product, AdSceneTemplate, BrandProfile } from "@shared/schema";

// LLM model for reasoning - use Replit AI integrations supported model
const REASONING_MODEL = process.env.GEMINI_REASONING_MODEL || "gemini-2.5-flash-preview-05-20";

// Initialize Gemini client - prefer Replit AI integrations for better quota
const GEMINI_API_KEY = process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const genai = new GoogleGenAI({ 
  apiKey: GEMINI_API_KEY,
  ...(process.env.AI_INTEGRATIONS_GEMINI_BASE_URL && {
    httpOptions: {
      baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      apiVersion: ''
    }
  })
});

// Rate limiting for suggest endpoint
const userSuggestCount = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

export interface IdeaBankRequest {
  productId: string;
  userId: string;
  userGoal?: string; // Optional user-provided goal/context
  enableWebSearch?: boolean; // Default: false (KB-first policy)
  maxSuggestions?: number; // Default: 3, max: 5
}

export interface IdeaBankError {
  code: "RATE_LIMITED" | "PRODUCT_NOT_FOUND" | "ANALYSIS_FAILED" | "KB_ERROR" | "LLM_ERROR";
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
 * Generate ad idea suggestions for a product
 */
export async function generateSuggestions(
  request: IdeaBankRequest
): Promise<{ success: true; response: IdeaBankSuggestResponse } | { success: false; error: IdeaBankError }> {
  const { productId, userId, userGoal, enableWebSearch = false, maxSuggestions = 3 } = request;

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

  // 1. Fetch product
  const product = await storage.getProductById(productId);
  if (!product) {
    return {
      success: false,
      error: {
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found",
      },
    };
  }

  // 2. Get or perform vision analysis
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
  const productAnalysis = analysisResult.analysis;

  // 3. Fetch brand profile if exists
  const brandProfile = await storage.getBrandProfileByUserId(userId);

  // 4. Query KB for relevant context
  let kbContext: string | null = null;
  let kbCitations: string[] = [];
  try {
    const kbQuery = buildKBQuery(product, productAnalysis, userGoal);
    const kbResult = await queryFileSearchStore({ query: kbQuery, maxResults: 5 });
    if (kbResult) {
      kbContext = sanitizeKBContent(kbResult.context);
      kbCitations = kbResult.citations || [];
    }
  } catch (err) {
    console.error("[IdeaBank] KB query failed:", err);
    // Continue without KB context - not a fatal error
  }

  // 5. Match templates based on product analysis
  const matchedTemplates = await matchTemplates(productAnalysis);

  // 6. Generate suggestions via LLM
  try {
    const suggestions = await generateLLMSuggestions({
      product,
      productAnalysis,
      brandProfile,
      kbContext,
      kbCitations,
      matchedTemplates,
      userGoal,
      maxSuggestions: Math.min(maxSuggestions, 5),
      enableWebSearch,
    });

    // Build response
    const response: IdeaBankSuggestResponse = {
      suggestions,
      analysisStatus: {
        visionComplete: true,
        kbQueried: !!kbContext,
        templatesMatched: matchedTemplates.length,
        webSearchUsed: false, // Web search disabled for now
      },
    };

    return { success: true, response };
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
  product: Product;
  productAnalysis: VisionAnalysisResult;
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
    brandProfile,
    kbContext,
    matchedTemplates,
    userGoal,
    maxSuggestions,
  });

  const response = await genai.models.generateContent({
    model: REASONING_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.7,
      maxOutputTokens: 8000,
    },
  });

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
  product: Product;
  productAnalysis: VisionAnalysisResult;
  brandProfile: BrandProfile | undefined;
  kbContext: string | null;
  matchedTemplates: AdSceneTemplate[];
  userGoal?: string;
  maxSuggestions: number;
}): string {
  const { product, productAnalysis, brandProfile, kbContext, matchedTemplates, userGoal, maxSuggestions } =
    params;

  let prompt = `You are an expert advertising creative director. Generate ${maxSuggestions} distinct ad concept suggestions for this product.

## Product Information
- Name: ${product.name}
- Category: ${productAnalysis.category} / ${productAnalysis.subcategory}
- Materials: ${productAnalysis.materials.join(", ") || "Not specified"}
- Colors: ${productAnalysis.colors.join(", ") || "Not specified"}
- Style: ${productAnalysis.style}
- Usage Context: ${productAnalysis.usageContext}
- Target Demographic: ${productAnalysis.targetDemographic}
`;

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

export const ideaBankService = {
  generateSuggestions,
  getMatchedTemplates,
};
