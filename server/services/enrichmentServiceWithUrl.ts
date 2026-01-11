/**
 * URL-Based Product Enrichment Service
 *
 * Enriches a product from a user-provided URL by:
 * 1. Fetching content from the URL
 * 2. Running through extraction + verification gates
 * 3. Returning enrichment draft with confidence scores
 *
 * This is a streamlined version of the full pipeline that uses a
 * single user-provided URL instead of auto-discovering sources.
 */

import { storage } from "../storage";
import { generateContentWithRetry } from "../lib/geminiClient";
import type { Product } from "@shared/schema";
import {
  extractFromSource,
  extractFeatures,
  extractBenefits,
  extractTags,
} from "./enrichment/dataExtraction";
import { verifyExtraction } from "./enrichment/gate2-extraction";
import { SOURCE_TRUST_LEVELS, type ExtractedData } from "./enrichment/types";


// ============================================
// TYPES
// ============================================

export interface UrlEnrichmentInput {
  productId: string;
  productUrl: string;
}

export interface UrlEnrichmentOutput {
  success: boolean;
  productId: string;
  enrichmentDraft: EnrichmentDraft | null;
  error?: string;
}

export interface EnrichmentDraft {
  description: string;
  features: Record<string, string | string[]>;
  benefits: string[];
  specifications: Record<string, string>;
  tags: string[];
  confidence: number;
  sources: Array<{
    type: "vision" | "web_search" | "kb" | "url";
    detail: string;
  }>;
  generatedAt: string;
}

// ============================================
// URL CONTENT FETCHING
// ============================================

/**
 * Fetch and extract text content from a URL using Gemini's URL grounding
 */
async function fetchUrlContent(url: string): Promise<string> {
  try {
    // Use Gemini to fetch and summarize the page content
    const response = await generateContentWithRetry({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Fetch the content from this URL and extract all product-related information in a structured format. Include product name, description, specifications, features, benefits, materials, dimensions, and any other relevant details.

URL: ${url}

Return the extracted content as plain text with clear sections.`,
            },
          ],
        },
      ],
      config: {
        tools: [{ urlContext: {} }],
      },
    }, { operation: 'enrichment_url' });

    const text = response.text || "";
    if (!text || text.length < 50) {
      throw new Error("Failed to extract meaningful content from URL");
    }

    return text;
  } catch (error: any) {
    console.error(`[UrlEnrichment] Failed to fetch URL content: ${error.message}`);
    throw new Error(`Failed to fetch URL: ${error.message}`);
  }
}

/**
 * Get trust level for a URL based on domain
 */
function getTrustLevel(url: string): number {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // Check for known trusted domains
    for (const [domain, level] of Object.entries(SOURCE_TRUST_LEVELS)) {
      if (hostname.includes(domain)) {
        return level;
      }
    }

    // Default trust level for user-provided URLs
    return 5;
  } catch {
    return 4;
  }
}

/**
 * Get source name from URL
 */
function getSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace("www.", "");
  } catch {
    return "Unknown Source";
  }
}

// ============================================
// AI EXTRACTION
// ============================================

/**
 * Extract product data from URL content using AI
 */
async function extractProductData(
  content: string,
  productName: string
): Promise<{
  description: string;
  specifications: Record<string, string>;
  features: Record<string, string | string[]>;
  benefits: string[];
  tags: string[];
}> {
  const prompt = `Analyze this product page content and extract structured data for "${productName}".

CONTENT:
${content.substring(0, 8000)}

Return a JSON object with these fields:
{
  "description": "A comprehensive product description (2-3 sentences)",
  "specifications": {
    "key": "value pairs for technical specs like material, dimensions, weight, etc."
  },
  "features": {
    "key": "value pairs for product features"
  },
  "benefits": ["Array of product benefits/selling points"],
  "tags": ["Array of relevant tags/keywords"]
}

Only include fields you can confidently extract from the content. Return valid JSON only.`;

  try {
    const response = await generateContentWithRetry({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    }, { operation: 'enrichment_url' });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);

    return {
      description: parsed.description || "",
      specifications: parsed.specifications || {},
      features: parsed.features || {},
      benefits: Array.isArray(parsed.benefits) ? parsed.benefits : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch (error: any) {
    console.error(`[UrlEnrichment] AI extraction failed: ${error.message}`);

    // Fallback: use existing extraction methods
    const extractedData: ExtractedData = {
      sourceUrl: "",
      productName,
      description: "",
      specifications: {},
      relatedProducts: [],
      installationInfo: "",
      certifications: [],
      rawExtract: content,
    };

    // Cast empty specifications to Record<string, string> for extraction functions
    const specsAsRecord: Record<string, string> = {};
    return {
      description: "",
      specifications: {},
      features: extractFeatures(specsAsRecord, content),
      benefits: extractBenefits(content),
      tags: extractTags(specsAsRecord, content, productName),
    };
  }
}

// ============================================
// MAIN ENRICHMENT FUNCTION
// ============================================

/**
 * Enrich a product from a user-provided URL
 */
export async function enrichFromUrl(
  input: UrlEnrichmentInput
): Promise<UrlEnrichmentOutput> {
  const { productId, productUrl } = input;

  console.log(`[UrlEnrichment] Starting enrichment for ${productId} from ${productUrl}`);

  try {
    // 1. Validate and fetch product
    const product = await storage.getProductById(productId);
    if (!product) {
      return {
        success: false,
        productId,
        enrichmentDraft: null,
        error: "Product not found",
      };
    }

    // 2. Validate URL (must be HTTP or HTTPS)
    try {
      const parsedUrl = new URL(productUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          success: false,
          productId,
          enrichmentDraft: null,
          error: "URL must use HTTP or HTTPS protocol",
        };
      }
    } catch {
      return {
        success: false,
        productId,
        enrichmentDraft: null,
        error: "Invalid URL provided",
      };
    }

    // 3. Fetch URL content
    console.log(`[UrlEnrichment] Fetching content from URL...`);
    const content = await fetchUrlContent(productUrl);

    // 4. Extract product data using AI
    console.log(`[UrlEnrichment] Extracting product data...`);
    const extracted = await extractProductData(content, product.name);

    // 5. Calculate confidence based on data quality
    let confidence = 50; // Base confidence

    if (extracted.description && extracted.description.length > 50) {
      confidence += 15;
    }
    if (Object.keys(extracted.specifications).length > 0) {
      confidence += 10;
    }
    if (Object.keys(extracted.features).length > 0) {
      confidence += 10;
    }
    if (extracted.benefits.length > 0) {
      confidence += 10;
    }
    if (extracted.tags.length > 0) {
      confidence += 5;
    }

    // Adjust by trust level
    const trustLevel = getTrustLevel(productUrl);
    confidence = Math.min(100, confidence * (trustLevel / 7));

    // 6. Build enrichment draft
    const enrichmentDraft: EnrichmentDraft = {
      description: extracted.description,
      features: extracted.features,
      benefits: extracted.benefits,
      specifications: extracted.specifications,
      tags: extracted.tags,
      confidence: Math.round(confidence),
      sources: [
        {
          type: "url",
          detail: getSourceName(productUrl),
        },
      ],
      generatedAt: new Date().toISOString(),
    };

    console.log(`[UrlEnrichment] Enrichment complete with ${confidence.toFixed(0)}% confidence`);

    return {
      success: true,
      productId,
      enrichmentDraft,
    };
  } catch (error: any) {
    console.error(`[UrlEnrichment] Error: ${error.message}`);
    return {
      success: false,
      productId,
      enrichmentDraft: null,
      error: error.message,
    };
  }
}

/**
 * Update product with enrichment draft data
 * This saves the draft to the product's enrichmentDraft field
 */
export async function saveEnrichmentDraft(
  productId: string,
  draft: EnrichmentDraft
): Promise<boolean> {
  try {
    await storage.updateProduct(productId, {
      enrichmentDraft: draft as any,
      enrichmentStatus: "draft",
    });
    return true;
  } catch (error: any) {
    console.error(`[UrlEnrichment] Failed to save draft: ${error.message}`);
    return false;
  }
}

export default {
  enrichFromUrl,
  saveEnrichmentDraft,
};
