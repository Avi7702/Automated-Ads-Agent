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
 * Implements caching via productAnalyses table to avoid redundant API calls.
 */

import { genAI } from "../lib/gemini";
import { storage } from "../storage";
import type { ProductAnalysis, InsertProductAnalysis, Product } from "@shared/schema";

// Rate limiting: max 10 analysis requests per minute per user
const userAnalysisCount = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

// Vision analysis model - Gemini 3 Pro is #1 on LMArena Vision leaderboard (Dec 2025)
// Superior spatial reasoning and OCR for understanding product details
// MODEL RECENCY RULE: Before changing any model ID, verify today's date and confirm the model is current within the last 3-4 weeks.
const VISION_MODEL = process.env.GEMINI_VISION_MODEL || "gemini-3-pro-preview";


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
  code: "RATE_LIMITED" | "INVALID_IMAGE" | "API_ERROR" | "CACHE_ERROR";
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
 * Analyze a product image using Gemini Vision
 * Returns cached result if available and fingerprint matches
 */
export async function analyzeProductImage(
  product: Product,
  userId: string,
  forceRefresh = false
): Promise<{ success: true; analysis: VisionAnalysisResult } | { success: false; error: VisionAnalysisError }> {
  // Check rate limit
  if (!checkRateLimit(userId)) {
    return {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many analysis requests. Please wait before trying again.",
      },
    };
  }

  const fingerprint = generateImageFingerprint(product);

  // Check cache unless force refresh requested
  if (!forceRefresh) {
    try {
      const cached = await storage.getProductAnalysisByProductId(product.id);
      if (cached && cached.imageFingerprint === fingerprint) {
        return {
          success: true,
          analysis: {
            category: cached.category || "unknown",
            subcategory: cached.subcategory || "unknown",
            materials: cached.materials || [],
            colors: cached.colors || [],
            style: cached.style || "unknown",
            usageContext: cached.usageContext || "",
            targetDemographic: cached.targetDemographic || "",
            detectedText: cached.detectedText,
            confidence: cached.confidence || 80,
          },
        };
      }
    } catch (err) {
      console.error("[VisionAnalysis] Cache lookup failed:", err);
      // Continue to fresh analysis if cache fails
    }
  }

  // Perform fresh analysis via Gemini Vision
  try {
    const analysisResult = await callGeminiVision(product.cloudinaryUrl, product.name);

    // Save to cache
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

    // Upsert: update existing or create new
    const existing = await storage.getProductAnalysisByProductId(product.id);
    if (existing) {
      await storage.updateProductAnalysis(product.id, analysisData);
    } else {
      await storage.saveProductAnalysis(analysisData);
    }

    return { success: true, analysis: analysisResult };
  } catch (err) {
    console.error("[VisionAnalysis] Gemini API error:", err);
    return {
      success: false,
      error: {
        code: "API_ERROR",
        message: err instanceof Error ? err.message : "Vision analysis failed",
      },
    };
  }
}

/**
 * Call Gemini Vision API to analyze a product image
 */
async function callGeminiVision(imageUrl: string, productName: string): Promise<VisionAnalysisResult> {
  // Use the shared client
  const model = genAI.models.generateContent;

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

  const response = await genAI.models.generateContent({
    model: VISION_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: await fetchImageAsBase64(imageUrl),
            },
          },
        ],
      },
    ],
    config: {
      temperature: 0.3, // Lower temperature for more consistent results
    },
  });

  const text = response.text || "";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse vision analysis response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as VisionAnalysisResult;

  // Validate and sanitize response
  return {
    category: sanitizeString(parsed.category) || "unknown",
    subcategory: sanitizeString(parsed.subcategory) || "unknown",
    materials: Array.isArray(parsed.materials) ? parsed.materials.map(sanitizeString).filter(Boolean) : [],
    colors: Array.isArray(parsed.colors) ? parsed.colors.map(sanitizeString).filter(Boolean) : [],
    style: sanitizeString(parsed.style) || "unknown",
    usageContext: sanitizeString(parsed.usageContext) || "",
    targetDemographic: sanitizeString(parsed.targetDemographic) || "",
    detectedText: parsed.detectedText ? sanitizeString(parsed.detectedText) : null,
    confidence: typeof parsed.confidence === "number" ? Math.min(100, Math.max(0, parsed.confidence)) : 80,
  };
}

/**
 * Fetch an image URL and convert to base64
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

/**
 * Sanitize a string to prevent prompt injection
 */
function sanitizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  // Remove any potential prompt injection patterns
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/\n/g, " ") // Replace newlines with spaces
    .trim()
    .slice(0, 500); // Limit length
}

/**
 * Get cached analysis for a product, or null if not available
 */
export async function getCachedAnalysis(productId: string): Promise<ProductAnalysis | null> {
  try {
    const analysis = await storage.getProductAnalysisByProductId(productId);
    return analysis || null;
  } catch (err) {
    console.error("[VisionAnalysis] Failed to get cached analysis:", err);
    return null;
  }
}

/**
 * Invalidate cached analysis for a product
 */
export async function invalidateAnalysisCache(productId: string): Promise<void> {
  try {
    await storage.deleteProductAnalysis(productId);
  } catch (err) {
    console.error("[VisionAnalysis] Failed to invalidate cache:", err);
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
  userId: string
): Promise<{ success: true; analysis: SimpleImageAnalysis } | { success: false; error: VisionAnalysisError }> {
  // Check rate limit
  if (!checkRateLimit(userId)) {
    return {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many analysis requests. Please wait before trying again.",
      },
    };
  }

  try {
    const base64Data = imageBuffer.toString("base64");

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

    const response = await genAI.models.generateContent({
      model: VISION_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: base64Data,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.3,
      },
    });

    const text = response.text || "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse image analysis response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      analysis: {
        description: sanitizeString(parsed.description) || "Unable to describe image",
        confidence: typeof parsed.confidence === "number" ? Math.min(100, Math.max(0, parsed.confidence)) : 70,
      },
    };
  } catch (err) {
    console.error("[VisionAnalysis] Arbitrary image analysis error:", err);
    return {
      success: false,
      error: {
        code: "API_ERROR",
        message: err instanceof Error ? err.message : "Image analysis failed",
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
