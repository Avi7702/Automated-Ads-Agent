/**
 * Product Enrichment Service
 *
 * Orchestrates the AI-assisted product data collection workflow:
 * 1. Analyzes product images with vision AI
 * 2. Searches for additional product information
 * 3. Generates a draft for human verification
 * 4. Stores verified data back to the product
 *
 * Human-in-the-loop: All AI-generated data requires user verification
 */

import { generateContentWithRetry } from '../lib/geminiClient';
import { storage } from '../storage';
import { logger } from '../lib/logger';
import { visionAnalysisService } from './visionAnalysisService';
import type { Product, InsertProduct } from '@shared/schema';

// ============================================
// TYPES
// ============================================

export type EnrichmentStatus = 'pending' | 'draft' | 'verified' | 'complete';

export interface EnrichmentDraft {
  /** AI-generated description */
  description: string;
  /** Key features as structured data */
  features: Record<string, string | string[]>;
  /** Product benefits list */
  benefits: string[];
  /** Technical specifications */
  specifications: Record<string, string>;
  /** Suggested tags for categorization */
  tags: string[];
  /** Installation information */
  installation?: {
    methods: string[];
    difficulty: string;
    requiredAccessories: string[];
    tips: string[];
  };
  /** Related product suggestions (names/types, not IDs) */
  relatedProductTypes?: string[];
  /** AI confidence score (0-100) */
  confidence: number;
  /** Sources used for enrichment */
  sources: Array<{
    type: 'vision' | 'web_search' | 'kb';
    detail: string;
  }>;
  /** Timestamp when draft was generated */
  generatedAt: string;
}

export interface EnrichmentResult {
  success: boolean;
  productId: string;
  draft?: EnrichmentDraft;
  error?: string;
}

export interface VerificationInput {
  productId: string;
  /** User can modify any field from the draft */
  description?: string;
  features?: Record<string, string | string[]>;
  benefits?: string[];
  specifications?: Record<string, string>;
  tags?: string[];
  sku?: string;
  /** If true, user approved the draft as-is */
  approvedAsIs?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

// Vision analysis uses Gemini 3 Pro - #1 on LMArena Vision leaderboard (Dec 2025)
// Superior spatial reasoning and OCR for understanding product details
// MODEL RECENCY RULE: Before changing any model ID, verify today's date and confirm the model is current within the last 3-4 weeks.
// Enrichment draft also uses Gemini 3 Pro with grounding for better research (Dec 2025)
// MODEL RECENCY RULE: Before changing any model ID, verify today's date and confirm the model is current within the last 3-4 weeks.
const ENRICHMENT_MODEL = process.env['GEMINI_ENRICHMENT_MODEL'] || 'gemini-3-pro-preview';

// Enable web search grounding for product research
const ENABLE_GROUNDING = true;

// ============================================
// MAIN SERVICE FUNCTIONS
// ============================================

/**
 * Generate an enrichment draft for a product using AI
 * This analyzes the product image and searches for additional context
 */
export async function generateEnrichmentDraft(productId: string, userId: string): Promise<EnrichmentResult> {
  // 1. Fetch product
  const product = await storage.getProductById(productId);
  if (!product) {
    return { success: false, productId, error: 'Product not found' };
  }

  // 2. Run vision analysis if not already done
  let visionData: Record<string, unknown> = {};
  try {
    const analysisResult = await visionAnalysisService.analyzeProductImage(product, userId);
    if (analysisResult.success) {
      visionData = {
        category: analysisResult.analysis.category,
        subcategory: analysisResult.analysis.subcategory,
        materials: analysisResult.analysis.materials,
        colors: analysisResult.analysis.colors,
        style: analysisResult.analysis.style,
        usageContext: analysisResult.analysis.usageContext,
        targetDemographic: analysisResult.analysis.targetDemographic,
        detectedText: analysisResult.analysis.detectedText,
      };
    }
  } catch (err) {
    logger.error({ module: 'Enrichment', err }, 'Vision analysis failed');
    // Continue - vision is not required
  }

  // 3. Generate comprehensive enrichment draft via LLM
  const draft = await generateDraftViaLLM(product, visionData);

  // 4. Save draft to product
  await storage.updateProduct(productId, {
    enrichmentDraft: draft as unknown as Record<string, unknown>,
    enrichmentStatus: 'draft',
  });

  return {
    success: true,
    productId,
    draft,
  };
}

/**
 * Verify and save user-approved enrichment data
 */
export async function verifyEnrichment(
  input: VerificationInput,
  _userId: string,
): Promise<{ success: boolean; error?: string }> {
  const { productId, approvedAsIs } = input;

  // 1. Fetch product with draft
  const product = await storage.getProductById(productId);
  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  if (product.enrichmentStatus !== 'draft') {
    return { success: false, error: 'Product has no draft to verify' };
  }

  const draft = product.enrichmentDraft as EnrichmentDraft | null;
  if (!draft) {
    return { success: false, error: 'No enrichment draft found' };
  }

  // 2. Build update from user input or approved draft
  const updates: Partial<InsertProduct> = {
    description: approvedAsIs ? draft.description : (input.description ?? draft.description),
    features: approvedAsIs ? draft.features : (input.features ?? draft.features),
    benefits: approvedAsIs ? draft.benefits : (input.benefits ?? draft.benefits),
    specifications: approvedAsIs ? draft.specifications : (input.specifications ?? draft.specifications),
    tags: approvedAsIs ? draft.tags : (input.tags ?? draft.tags),
    sku: input.sku,
    enrichmentStatus: 'verified',
    enrichmentVerifiedAt: new Date(),
    enrichmentSource: 'ai_vision',
  };

  // 3. Save verified data
  await storage.updateProduct(productId, updates);

  return { success: true };
}

/**
 * Get products that need enrichment
 * Note: Currently products are global (no userId). Future: add userId filter.
 */
export async function getProductsNeedingEnrichment(status?: EnrichmentStatus): Promise<Product[]> {
  // Get all products
  const products = await storage.getProducts();

  // Filter by enrichment status
  if (status) {
    return products.filter((p) => p.enrichmentStatus === status);
  }

  // Return products that are pending or draft (need attention)
  return products.filter(
    (p) => p.enrichmentStatus === 'pending' || p.enrichmentStatus === 'draft' || !p.enrichmentStatus,
  );
}

/**
 * Check if a product is ready for ad generation
 * (has verified enrichment data)
 */
export function isProductReady(product: Product): boolean {
  return (
    product.enrichmentStatus === 'verified' ||
    product.enrichmentStatus === 'complete' ||
    // Legacy products with description are considered ready
    (!!product.description && product.description.length > 10)
  );
}

/**
 * Calculate enrichment completeness percentage
 */
export function getEnrichmentCompleteness(product: Product): {
  percentage: number;
  missing: string[];
} {
  const fields = [
    { name: 'description', value: product.description },
    { name: 'features', value: product.features },
    { name: 'benefits', value: product.benefits },
    { name: 'tags', value: product.tags },
  ];

  const missing: string[] = [];
  let filled = 0;

  for (const field of fields) {
    const hasValue =
      field.value &&
      (typeof field.value === 'string'
        ? field.value.length > 0
        : Array.isArray(field.value)
          ? field.value.length > 0
          : Object.keys(field.value as object).length > 0);

    if (hasValue) {
      filled++;
    } else {
      missing.push(field.name);
    }
  }

  return {
    percentage: Math.round((filled / fields.length) * 100),
    missing,
  };
}

// ============================================
// INTERNAL FUNCTIONS
// ============================================

/**
 * Generate enrichment draft using LLM with product image and vision data
 * Uses Gemini 3 Pro with Google Search grounding for accurate product information
 */
async function generateDraftViaLLM(product: Product, visionData: Record<string, unknown>): Promise<EnrichmentDraft> {
  const prompt = buildEnrichmentPrompt(product, visionData);

  // Build config with optional grounding (web search)
  const config: Record<string, unknown> = {
    temperature: 0.3, // Lower temperature for more factual output
    maxOutputTokens: 4000,
  };

  // Enable Google Search grounding for better product research
  if (ENABLE_GROUNDING) {
    config['tools'] = [{ googleSearch: {} }];
  }

  const response = await generateContentWithRetry(
    {
      model: ENRICHMENT_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: await fetchImageAsBase64(product.cloudinaryUrl),
              },
            },
          ],
        },
      ],
      config,
    },
    { operation: 'product_enrichment' },
  );

  const text = response.text || '';

  // Extract grounding citations if available
  const sources: EnrichmentDraft['sources'] = [{ type: 'vision', detail: 'Image analysis' }];

  // Check for grounding metadata in response
  const groundingMeta = (
    response as unknown as { candidates?: Array<{ groundingMetadata?: { webSearchQueries?: string[] } }> }
  )?.candidates?.[0]?.groundingMetadata;
  if (groundingMeta?.webSearchQueries) {
    sources.push({
      type: 'web_search',
      detail: `Searched: ${groundingMeta.webSearchQueries.join(', ')}`,
    });
  }

  // Parse JSON from response
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
  const jsonContent = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : text;

  try {
    const parsed = JSON.parse(jsonContent);
    return {
      description: parsed.description || '',
      features: parsed.features || {},
      benefits: parsed.benefits || [],
      specifications: parsed.specifications || {},
      tags: parsed.tags || [],
      installation: parsed.installation,
      relatedProductTypes: parsed.relatedProductTypes,
      confidence: parsed.confidence || 70,
      sources,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error({ module: 'Enrichment', err }, 'Failed to parse LLM response');
    // Return basic draft from vision data
    return {
      description: `${visionData['category'] || 'Product'} - ${visionData['subcategory'] || ''}`.trim(),
      features: {},
      benefits: [],
      specifications: {},
      tags: (visionData['materials'] as string[]) || [],
      confidence: 30,
      sources: [{ type: 'vision', detail: 'Basic vision analysis only' }],
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Build the enrichment prompt for LLM
 */
function buildEnrichmentPrompt(product: Product, visionData: Record<string, unknown>): string {
  return `You are a product information specialist. Analyze this product image and generate comprehensive product data for an advertising platform.

## Product Name
${product.name}

## Vision Analysis (if available)
${JSON.stringify(visionData, null, 2)}

## Your Task
Generate detailed product information that would help create effective advertisements. Be specific and factual based on what you can see in the image.

## Output Format (JSON)
Return a JSON object with these fields:

{
  "description": "A clear 2-3 sentence description of what this product is and its primary use case. Be specific about the product type, not generic.",

  "features": {
    "material": "Primary material (e.g., 'solid oak', 'porcelain tile')",
    "finish": "Surface finish (e.g., 'matte', 'glossy', 'textured')",
    "dimensions": "Typical dimensions if visible",
    "color": "Color name or palette",
    "pattern": "Any pattern visible (e.g., 'wood grain', 'marble veining')"
  },

  "benefits": [
    "Benefit 1 - why a customer would want this",
    "Benefit 2 - practical advantage",
    "Benefit 3 - aesthetic or lifestyle benefit"
  ],

  "specifications": {
    "type": "Product type/category",
    "style": "Design style (modern, traditional, etc.)",
    "application": "Where this product is typically used"
  },

  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],

  "installation": {
    "methods": ["method1", "method2"],
    "difficulty": "Easy/Medium/Professional",
    "requiredAccessories": ["item1", "item2"],
    "tips": ["Helpful tip for installation"]
  },

  "relatedProductTypes": ["Related product type 1", "Accessory type"],

  "confidence": 85
}

## Important Guidelines
1. Only include information you can reasonably infer from the image
2. Be specific - avoid generic descriptions
3. If uncertain about something, either omit it or lower the confidence score
4. Tags should be useful for search and categorization
5. Installation info is optional - only include if relevant to the product type

Return ONLY the JSON object, no additional text.`;
}

/**
 * Normalize product image URL - handles Shopify {width} placeholders
 */
function normalizeImageUrl(url: string, width: number = 800): string {
  if (!url) return url;

  // Handle Shopify URLs with {width} placeholder (e.g., nextdaysteel.co.uk)
  if (url.includes('{width}')) {
    return url.replace('{width}', String(width));
  }

  return url;
}

/**
 * Fetch image as base64 for vision API
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  // Normalize URL before fetching (handles Shopify {width} placeholder)
  const normalizedUrl = normalizeImageUrl(url);

  const response = await fetch(normalizedUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

// ============================================
// EXPORTS
// ============================================

export const productEnrichmentService = {
  generateEnrichmentDraft,
  verifyEnrichment,
  getProductsNeedingEnrichment,
  isProductReady,
  getEnrichmentCompleteness,
};
