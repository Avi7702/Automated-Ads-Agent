/**
 * Vision Analysis Service
 *
 * Analyzes product images using Gemini Vision to extract:
 * - Category/subcategory classification
 * - Material and color detection
 * - Style and mood identification
 * - Usage context suggestions
 * - Target demographic inference
 *
 * Implements multi-layer caching:
 * 1. Redis cache (fast, 7-day TTL) - checked first
 * 2. Database cache (persistent, via productAnalyses table) - checked second
 */

import crypto from 'crypto';
import { generateContentWithRetry } from '../lib/geminiClient';
import { storage } from '../storage';
import type { ProductAnalysis, InsertProductAnalysis, Product } from '@shared/schema';
import { createRateLimitMap } from '../utils/memoryManager';
import { sanitizeOutputString } from '../lib/promptSanitizer';
import { safeParseLLMResponse, visionAnalysisSchema } from '../validation/llmResponseSchemas';
import { logger } from '../lib/logger';
import { getCacheService, CACHE_TTL } from '../lib/cacheService';

// Rate limiting: max 10 analysis requests per minute per user
// Now bounded with automatic cleanup of expired entries (max 10000 users)
const userAnalysisCount = createRateLimitMap<{ count: number; resetAt: number }>('VisionRateLimit', 10000);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

// Vision analysis model - Gemini 3 Pro is #1 on LMArena Vision leaderboard (Dec 2025)
// Superior spatial reasoning and OCR for understanding product details
// MODEL RECENCY RULE: Before changing any model ID, verify today's date and confirm the model is current within the last 3-4 weeks.
const VISION_MODEL = process.env['GEMINI_VISION_MODEL'] || 'gemini-3-pro-preview';

export interface VisionAnalysisResult {
  category: string;
  subcategory: string;
  materials: string[];
  colors: string[];
  style: string;
  usageContext: string;
  targetDemographic: string;
  detectedText: string | null;
  confidence: number;
}

export interface VisionAnalysisError {
  code: 'RATE_LIMITED' | 'INVALID_IMAGE' | 'API_ERROR' | 'CACHE_ERROR';
  message: string;
}

/**
 * Check rate limit for a user
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userData = userAnalysisCount.get(userId);

  if (!userData || userData.resetAt < now) {
    userAnalysisCount.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (userData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userData.count++;
  return true;
}

/**
 * Generate a fingerprint for cache invalidation
 * Combines cloudinary public ID with version/etag if available
 */
export function generateImageFingerprint(product: Product): string {
  // Use cloudinaryPublicId as the base fingerprint
  // Could be extended to include version/etag from Cloudinary
  return `${product.cloudinaryPublicId}`;
}

/**
 * Generate an MD5 hash of the image URL for cache key
 */
function generateImageHash(imageUrl: string): string {
  return crypto.createHash('md5').update(imageUrl).digest('hex');
}

/**
 * Analyze a product image using Gemini Vision
 *
 * Multi-layer caching strategy:
 * 1. Redis cache (fast, 7-day TTL) - checked first for speed
 * 2. Database cache (persistent) - checked second for durability
 * 3. Fresh analysis via Gemini Vision - only on cache miss
 */
export async function analyzeProductImage(
  product: Product,
  userId: string,
  forceRefresh = false,
): Promise<{ success: true; analysis: VisionAnalysisResult } | { success: false; error: VisionAnalysisError }> {
  // Check rate limit
  if (!checkRateLimit(userId)) {
    return {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many analysis requests. Please wait before trying again.',
      },
    };
  }

  const fingerprint = generateImageFingerprint(product);
  const cache = getCacheService();
  const imageHash = generateImageHash(product.cloudinaryUrl);
  const cacheKey = cache.visionKey(product.id, imageHash);

  // Check cache unless force refresh requested
  if (!forceRefresh) {
    // Layer 1: Try Redis cache first (fastest)
    try {
      const redisCached = await cache.get<VisionAnalysisResult>(cacheKey);
      if (redisCached) {
        logger.info(
          { module: 'VisionAnalysis', productId: product.id, cached: true, layer: 'redis' },
          'Redis cache hit',
        );
        return { success: true, analysis: redisCached };
      }
    } catch (err) {
      logger.warn({ module: 'VisionAnalysis', err }, 'Redis cache lookup failed, falling back to database');
    }

    // Layer 2: Try database cache (durable)
    try {
      const dbCached = await storage.getProductAnalysisByProductId(product.id);
      if (dbCached && dbCached.imageFingerprint === fingerprint) {
        const analysis: VisionAnalysisResult = {
          category: dbCached.category || 'unknown',
          subcategory: dbCached.subcategory || 'unknown',
          materials: dbCached.materials || [],
          colors: dbCached.colors || [],
          style: dbCached.style || 'unknown',
          usageContext: dbCached.usageContext || '',
          targetDemographic: dbCached.targetDemographic || '',
          detectedText: dbCached.detectedText,
          confidence: dbCached.confidence || 80,
        };

        // Backfill Redis cache for future fast access
        try {
          await cache.set(cacheKey, analysis, CACHE_TTL.VISION_ANALYSIS);
          logger.info(
            { module: 'VisionAnalysis', productId: product.id, cached: true, layer: 'database' },
            'Database cache hit, backfilled Redis',
          );
        } catch (backfillErr) {
          logger.warn({ module: 'VisionAnalysis', backfillErr }, 'Failed to backfill Redis cache');
        }

        return { success: true, analysis };
      }
    } catch (err) {
      logger.error({ module: 'VisionAnalysis', err }, 'Database cache lookup failed');
      // Continue to fresh analysis if cache fails
    }
  }

  // Layer 3: Perform fresh analysis via Gemini Vision
  try {
    logger.info(
      { module: 'VisionAnalysis', productId: product.id, cached: false },
      'Cache miss, performing fresh analysis',
    );
    const analysisResult = await callGeminiVision(product.cloudinaryUrl, product.name);

    // Save to both cache layers
    const analysisData: InsertProductAnalysis = {
      productId: product.id,
      imageFingerprint: fingerprint,
      category: analysisResult.category,
      subcategory: analysisResult.subcategory,
      materials: analysisResult.materials,
      colors: analysisResult.colors,
      style: analysisResult.style,
      usageContext: analysisResult.usageContext,
      targetDemographic: analysisResult.targetDemographic,
      detectedText: analysisResult.detectedText,
      confidence: analysisResult.confidence,
      modelVersion: VISION_MODEL,
    };

    // Save to database (durable cache)
    const existing = await storage.getProductAnalysisByProductId(product.id);
    if (existing) {
      await storage.updateProductAnalysis(product.id, analysisData);
    } else {
      await storage.saveProductAnalysis(analysisData);
    }

    // Save to Redis cache (fast cache)
    try {
      await cache.set(cacheKey, analysisResult, CACHE_TTL.VISION_ANALYSIS);
    } catch (cacheErr) {
      logger.warn({ module: 'VisionAnalysis', cacheErr }, 'Failed to save to Redis cache');
    }

    return { success: true, analysis: analysisResult };
  } catch (err) {
    logger.error({ module: 'VisionAnalysis', err }, 'Gemini API error');
    return {
      success: false,
      error: {
        code: 'API_ERROR',
        message: err instanceof Error ? err.message : 'Vision analysis failed',
      },
    };
  }
}

/**
 * Call Gemini Vision API to analyze a product image
 */
async function callGeminiVision(imageUrl: string, productName: string): Promise<VisionAnalysisResult> {
  const prompt = `Analyze this product image for an advertising platform. The product is named "${productName}".

Extract the following information in JSON format:
{
  "category": "main product category (e.g., flooring, furniture, decor, fixture, appliance)",
  "subcategory": "specific type (e.g., hardwood, tile, laminate, sofa, lamp)",
  "materials": ["array of visible materials like wood, ceramic, metal, glass, fabric"],
  "colors": ["array of primary colors detected, use descriptive names like 'oak', 'navy', 'cream'"],
  "style": "design style (modern, traditional, rustic, industrial, minimalist, contemporary)",
  "usageContext": "where this product would typically be used (e.g., residential living room, commercial office, outdoor patio)",
  "targetDemographic": "who would typically purchase this (e.g., homeowners, contractors, interior designers)",
  "detectedText": "any text visible on the product or packaging, or null if none",
  "confidence": a number 0-100 indicating confidence in this analysis
}

Be accurate and specific. If uncertain about a field, use your best judgment but lower the confidence score.`;

  const response = await generateContentWithRetry(
    {
      model: VISION_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: await fetchImageAsBase64(imageUrl),
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.3, // Lower temperature for more consistent results
      },
    },
    { operation: 'vision_analysis' },
  );

  const text = response.text || '';

  // Extract and validate JSON response with Zod schema
  const parsed = safeParseLLMResponse(text, visionAnalysisSchema, 'vision_analysis');

  // Sanitize output strings
  return {
    category: sanitizeOutputString(parsed.category) || 'unknown',
    subcategory: sanitizeOutputString(parsed.subcategory) || 'unknown',
    materials: Array.isArray(parsed.materials) ? parsed.materials.map(sanitizeOutputString).filter(Boolean) : [],
    colors: Array.isArray(parsed.colors) ? parsed.colors.map(sanitizeOutputString).filter(Boolean) : [],
    style: sanitizeOutputString(parsed.style) || 'unknown',
    usageContext: sanitizeOutputString(parsed.usageContext) || '',
    targetDemographic: sanitizeOutputString(parsed.targetDemographic) || '',
    detectedText: parsed.detectedText ? sanitizeOutputString(parsed.detectedText) : null,
    confidence: typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, parsed.confidence)) : 80,
  };
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
 * Fetch an image URL and convert to base64
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  // Normalize URL before fetching (handles Shopify {width} placeholder)
  const normalizedUrl = normalizeImageUrl(url);

  const response = await fetch(normalizedUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} for URL: ${normalizedUrl}`);
  }
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

/**
 * Sanitize a string to prevent prompt injection
 */
// sanitizeString replaced by sanitizeOutputString from ../lib/promptSanitizer
const sanitizeString = sanitizeOutputString;

/**
 * Get cached analysis for a product, or null if not available
 */
export async function getCachedAnalysis(productId: string): Promise<ProductAnalysis | null> {
  try {
    const analysis = await storage.getProductAnalysisByProductId(productId);
    return analysis || null;
  } catch (err) {
    logger.error({ module: 'VisionAnalysis', err }, 'Failed to get cached analysis');
    return null;
  }
}

/**
 * Invalidate cached analysis for a product
 * Clears both Redis and database caches
 */
export async function invalidateAnalysisCache(productId: string): Promise<void> {
  const cache = getCacheService();

  // Invalidate Redis cache (pattern match all image hashes for this product)
  try {
    const deleted = await cache.invalidate(`vision:${productId}:*`);
    logger.info({ module: 'VisionAnalysis', productId, redisKeysDeleted: deleted }, 'Redis cache invalidated');
  } catch (err) {
    logger.error({ module: 'VisionAnalysis', err }, 'Failed to invalidate Redis cache');
  }

  // Invalidate database cache
  try {
    await storage.deleteProductAnalysis(productId);
  } catch (err) {
    logger.error({ module: 'VisionAnalysis', err }, 'Failed to invalidate database cache');
  }
}

/**
 * Simple image analysis response for arbitrary uploads (not products)
 */
export interface SimpleImageAnalysis {
  description: string;
  confidence: number;
}

/**
 * Analyze an arbitrary image (not a product) for a simple description
 * Used for temporary uploads that need context for IdeaBank
 * Does NOT cache results (ephemeral analysis)
 */
export async function analyzeArbitraryImage(
  imageBuffer: Buffer,
  mimeType: string,
  userId: string,
): Promise<{ success: true; analysis: SimpleImageAnalysis } | { success: false; error: VisionAnalysisError }> {
  // Check rate limit
  if (!checkRateLimit(userId)) {
    return {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many analysis requests. Please wait before trying again.',
      },
    };
  }

  try {
    const base64Data = imageBuffer.toString('base64');

    const prompt = `Analyze this image and provide a concise description for advertising context.

Return JSON in this exact format:
{
  "description": "A single sentence (15-30 words) describing what this image shows, focusing on elements useful for advertising",
  "confidence": a number 0-100 indicating how confident you are in this description
}

Be specific and descriptive. Focus on:
- Main subject/product/scene
- Key visual elements
- Context or setting
- Any notable details

Example good descriptions:
- "Modern kitchen with white marble countertops and stainless steel appliances in a bright, open floor plan"
- "Construction site showing freshly poured concrete foundation with rebar reinforcement visible"
- "Professional flooring installation with oak hardwood planks being laid in herringbone pattern"`;

    const response = await generateContentWithRetry(
      {
        model: VISION_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: base64Data,
                },
              },
            ],
          },
        ],
        config: {
          temperature: 0.3,
        },
      },
      { operation: 'vision_analysis' },
    );

    const text = response.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse image analysis response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      analysis: {
        description: sanitizeString(parsed.description) || 'Unable to describe image',
        confidence: typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, parsed.confidence)) : 70,
      },
    };
  } catch (err) {
    logger.error({ module: 'VisionAnalysis', err }, 'Arbitrary image analysis error');
    return {
      success: false,
      error: {
        code: 'API_ERROR',
        message: err instanceof Error ? err.message : 'Image analysis failed',
      },
    };
  }
}

export const visionAnalysisService = {
  analyzeProductImage,
  analyzeArbitraryImage,
  getCachedAnalysis,
  invalidateAnalysisCache,
  generateImageFingerprint,
};
