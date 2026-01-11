/**
 * AI Helpers for Enrichment Pipeline
 *
 * Core AI functions for comparison, verification, and intelligent data processing.
 * These functions power the 4-gate verification system.
 */

import { generateContentWithRetry } from "../../lib/geminiClient";
import type {
  ComparisonResult,
  EquivalenceResult,
  ClaimSupportResult,
  ExtractedClaim,
  ExtractedData,
  VisionResult,
} from "./types";

// ============================================
// CONSTANTS
// ============================================

// Text model for comparisons and verification (fast, accurate)
// MODEL RECENCY RULE: Before changing any model ID, verify today's date and confirm the model is current within the last 3-4 weeks.
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";

// Vision model for image comparisons (best spatial reasoning)
// MODEL RECENCY RULE: Before changing any model ID, verify today's date and confirm the model is current within the last 3-4 weeks.
const VISION_MODEL = process.env.GEMINI_VISION_MODEL || "gemini-3-pro-preview";

// ============================================
// SEMANTIC COMPARISON FUNCTIONS
// ============================================

/**
 * Compare product descriptions to determine if they describe the same product
 */
export async function aiCompareDescriptions(params: {
  ourProduct: {
    category: string;
    materials: string[];
    colors: string[];
    style: string;
  };
  sourceProduct: {
    title: string;
    content: string;
  };
}): Promise<ComparisonResult> {
  const prompt = `You are a product matching expert. Determine if these two descriptions refer to the SAME specific product.

## Our Product (from image analysis):
- Category: ${params.ourProduct.category}
- Materials: ${params.ourProduct.materials.join(", ")}
- Colors: ${params.ourProduct.colors.join(", ")}
- Style: ${params.ourProduct.style}

## Source Product (from website):
- Title: ${params.sourceProduct.title}
- Description: ${params.sourceProduct.content}

## Task
Determine if the source product is the EXACT same product as our product, not just similar.
Consider:
1. Do the materials match? (e.g., "galvanized steel" must match "galvanized steel", not just "steel")
2. Do the categories align? (e.g., "spacer bar" must match "spacer bar", not "rebar")
3. Is the form factor the same? (e.g., "50mm" must match "50mm")

## Response (JSON only)
{
  "similar": true/false,
  "confidence": 0-100,
  "reasoning": "Brief explanation of why they match or don't match"
}`;

  try {
    const response = await generateContentWithRetry({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1 },
    }, { operation: 'enrichment_ai' });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { similar: false, confidence: 0, reasoning: "Failed to parse AI response" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      similar: Boolean(parsed.similar),
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
      reasoning: String(parsed.reasoning || ""),
    };
  } catch (err) {
    console.error("[aiHelpers] aiCompareDescriptions failed:", err);
    return { similar: false, confidence: 0, reasoning: `Error: ${err}` };
  }
}

/**
 * Compare two images to determine visual similarity
 */
export async function aiCompareImages(
  productImageBase64: string,
  sourceImageBase64: string
): Promise<ComparisonResult> {
  const prompt = `You are a visual product matching expert. Determine if these two images show the SAME product.

## Task
Compare the two images and determine:
1. Are they showing the exact same product (not just similar category)?
2. Consider shape, color, texture, size proportions, and any visible markings.
3. Account for different angles and lighting.

## Response (JSON only)
{
  "similar": true/false,
  "confidence": 0-100,
  "reasoning": "Brief explanation of visual similarities/differences"
}`;

  try {
    const response = await generateContentWithRetry({
      model: VISION_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: productImageBase64 } },
            { inlineData: { mimeType: "image/jpeg", data: sourceImageBase64 } },
          ],
        },
      ],
      config: { temperature: 0.1 },
    }, { operation: 'enrichment_ai' });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { similar: false, confidence: 0, reasoning: "Failed to parse AI response" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      similar: Boolean(parsed.similar),
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
      reasoning: String(parsed.reasoning || ""),
    };
  } catch (err) {
    console.error("[aiHelpers] aiCompareImages failed:", err);
    return { similar: false, confidence: 0, reasoning: `Error: ${err}` };
  }
}

// ============================================
// EXTRACTION FUNCTIONS
// ============================================

/**
 * Extract structured product data from webpage content
 */
export async function aiExtractProductData(
  pageContent: string,
  productNameHint?: string
): Promise<ExtractedData> {
  const prompt = `You are a product data extraction expert. Extract structured information from this webpage content.

${productNameHint ? `## Product Name Hint: ${productNameHint}` : ""}

## Webpage Content
${pageContent.substring(0, 8000)}

## Task
Extract the following information about the product. Be accurate - only include information explicitly stated in the content.

## Response (JSON only)
{
  "productName": "Official product name",
  "description": "Product description (2-3 sentences)",
  "specifications": {
    "material": "Material if mentioned",
    "dimensions": "Dimensions if mentioned",
    "weight": "Weight if mentioned",
    "finish": "Finish/coating if mentioned"
  },
  "relatedProducts": ["Related product names mentioned"],
  "installationInfo": "Installation instructions or tips if mentioned",
  "certifications": ["Any certifications mentioned"]
}

Only include fields that have explicit information in the source content. Leave fields empty ("" or []) if not found.`;

  try {
    const response = await generateContentWithRetry({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1, maxOutputTokens: 2000 },
    }, { operation: 'enrichment_ai' });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse extraction response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      sourceUrl: "",  // Will be filled by caller
      productName: String(parsed.productName || ""),
      description: String(parsed.description || ""),
      specifications: parsed.specifications || {},
      relatedProducts: Array.isArray(parsed.relatedProducts) ? parsed.relatedProducts : [],
      installationInfo: String(parsed.installationInfo || ""),
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      rawExtract: pageContent,
    };
  } catch (err) {
    console.error("[aiHelpers] aiExtractProductData failed:", err);
    return {
      sourceUrl: "",
      productName: "",
      description: "",
      specifications: {},
      relatedProducts: [],
      installationInfo: "",
      certifications: [],
      rawExtract: pageContent,
    };
  }
}

/**
 * Re-extract a specific field from content (for verification)
 */
export async function aiReExtractField(
  pageContent: string,
  fieldName: string
): Promise<string> {
  const prompt = `Extract the "${fieldName}" from this product page content.

## Content
${pageContent.substring(0, 4000)}

## Task
Find and extract ONLY the ${fieldName} information. Return the exact value as it appears in the source.

## Response
Return ONLY the extracted value, nothing else. If not found, return "NOT_FOUND".`;

  try {
    const response = await generateContentWithRetry({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1, maxOutputTokens: 500 },
    }, { operation: 'enrichment_ai' });

    const text = (response.text || "").trim();
    return text === "NOT_FOUND" ? "" : text;
  } catch (err) {
    console.error("[aiHelpers] aiReExtractField failed:", err);
    return "";
  }
}

// ============================================
// VERIFICATION FUNCTIONS
// ============================================

/**
 * Verify a claim against source content
 */
export async function aiVerifyClaim(params: {
  claim: string;
  source: string;
}): Promise<ClaimSupportResult> {
  const prompt = `You are a fact-checking expert. Verify if the following claim is supported by the source content.

## Claim
${params.claim}

## Source Content
${params.source.substring(0, 4000)}

## Task
Determine if the source content:
1. SUPPORTS the claim (explicitly states or strongly implies it)
2. CONTRADICTS the claim (states the opposite or incompatible information)
3. Is NEUTRAL (doesn't address the claim at all)

## Response (JSON only)
{
  "supports": true/false,
  "contradicts": true/false,
  "neutral": true/false,
  "reasoning": "Brief explanation"
}`;

  try {
    const response = await generateContentWithRetry({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1 },
    }, { operation: 'enrichment_ai' });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { supports: false, contradicts: false, neutral: true, reasoning: "Failed to parse" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      supports: Boolean(parsed.supports),
      contradicts: Boolean(parsed.contradicts),
      neutral: Boolean(parsed.neutral),
      reasoning: String(parsed.reasoning || ""),
    };
  } catch (err) {
    console.error("[aiHelpers] aiVerifyClaim failed:", err);
    return { supports: false, contradicts: false, neutral: true, reasoning: `Error: ${err}` };
  }
}

/**
 * Check if multiple values are equivalent (e.g., "50mm" vs "2 inch")
 */
export async function aiCheckEquivalence(values: string[]): Promise<EquivalenceResult> {
  if (values.length < 2) {
    return {
      allEquivalent: true,
      compatible: true,
      resolvedValue: values[0] || null,
      reasoning: "Only one value provided",
    };
  }

  const prompt = `You are a unit conversion and equivalence expert. Determine if these values are equivalent.

## Values to Compare
${values.map((v, i) => `${i + 1}. "${v}"`).join("\n")}

## Task
Determine if all these values represent the SAME measurement or property:
1. Check for unit conversions (mm vs inches, kg vs lb)
2. Check for formatting differences ("50 mm" vs "50mm")
3. Check for semantic equivalence ("galvanized" vs "zinc-coated")

## Response (JSON only)
{
  "allEquivalent": true/false,
  "compatible": true/false,
  "resolvedValue": "The normalized/standard value or null if they conflict",
  "reasoning": "Brief explanation of why they are/aren't equivalent"
}`;

  try {
    const response = await generateContentWithRetry({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1 },
    }, { operation: 'enrichment_ai' });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        allEquivalent: false,
        compatible: false,
        resolvedValue: null,
        reasoning: "Failed to parse response",
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      allEquivalent: Boolean(parsed.allEquivalent),
      compatible: Boolean(parsed.compatible || parsed.allEquivalent),
      resolvedValue: parsed.resolvedValue || null,
      reasoning: String(parsed.reasoning || ""),
    };
  } catch (err) {
    console.error("[aiHelpers] aiCheckEquivalence failed:", err);
    return {
      allEquivalent: false,
      compatible: false,
      resolvedValue: null,
      reasoning: `Error: ${err}`,
    };
  }
}

/**
 * Extract individual claims from a description for verification
 */
export async function aiExtractClaims(description: string): Promise<ExtractedClaim[]> {
  const prompt = `Extract factual claims from this product description that can be verified.

## Description
${description}

## Task
Break down the description into individual factual claims. Focus on:
1. Material claims (what it's made of)
2. Dimension/size claims
3. Performance claims (load capacity, durability)
4. Certification claims
5. Usage/application claims

Ignore marketing language and subjective statements.

## Response (JSON only)
{
  "claims": [
    { "claim": "The specific claim", "importance": "high/medium/low" },
    ...
  ]
}`;

  try {
    const response = await generateContentWithRetry({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1, maxOutputTokens: 1500 },
    }, { operation: 'enrichment_ai' });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.claims)) {
      return [];
    }

    return parsed.claims.map((c: { claim?: string; importance?: string }) => ({
      claim: String(c.claim || ""),
      importance: (c.importance as "high" | "medium" | "low") || "medium",
    }));
  } catch (err) {
    console.error("[aiHelpers] aiExtractClaims failed:", err);
    return [];
  }
}

// ============================================
// AGGREGATION FUNCTIONS
// ============================================

/**
 * Select the best value from multiple extractions using trust-weighted voting
 */
export function selectBestValue(
  extractions: Array<{ value: string; trustLevel: number }>,
  fieldName: string
): string {
  if (extractions.length === 0) return "";

  // Sort by trust level (highest first)
  const sorted = [...extractions]
    .filter(e => e.value && e.value.trim())
    .sort((a, b) => b.trustLevel - a.trustLevel);

  if (sorted.length === 0) return "";

  // Return the highest trust value
  return sorted[0].value;
}

/**
 * Check if two string values agree (case-insensitive, whitespace-normalized)
 */
export function valuesAgree(value1: string, value2: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/\s+/g, " ").trim();

  return normalize(value1) === normalize(value2);
}

// ============================================
// SKU MATCHING FUNCTIONS
// ============================================

/**
 * Compare SKU/part numbers with fuzzy matching
 */
export function compareSkus(
  detectedTexts: string[],
  sourceSku: string | null
): { match: boolean; confidence: number } {
  if (!sourceSku || detectedTexts.length === 0) {
    return { match: false, confidence: 0 };
  }

  // Normalize for comparison
  const normalizeForComparison = (s: string) =>
    s.toUpperCase().replace(/[\s\-_\.]/g, "");

  const normalizedSource = normalizeForComparison(sourceSku);

  for (const detected of detectedTexts) {
    const normalizedDetected = normalizeForComparison(detected);

    // Exact match
    if (normalizedDetected === normalizedSource) {
      return { match: true, confidence: 100 };
    }

    // Contains match (detected contains source or vice versa)
    if (normalizedDetected.includes(normalizedSource) ||
        normalizedSource.includes(normalizedDetected)) {
      return { match: true, confidence: 85 };
    }

    // Levenshtein-like similarity for short strings
    if (normalizedSource.length <= 20 && normalizedDetected.length <= 20) {
      const similarity = calculateSimilarity(normalizedDetected, normalizedSource);
      if (similarity > 0.8) {
        return { match: true, confidence: Math.round(similarity * 100) };
      }
    }
  }

  return { match: false, confidence: 0 };
}

/**
 * Calculate string similarity (simple approach)
 */
function calculateSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  // Count matching characters in sequence
  let matches = 0;
  let longerIdx = 0;

  for (const char of shorter) {
    const foundIdx = longer.indexOf(char, longerIdx);
    if (foundIdx !== -1) {
      matches++;
      longerIdx = foundIdx + 1;
    }
  }

  return matches / longer.length;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Normalize product image URL - handles Shopify {width} placeholders
 */
function normalizeImageUrl(url: string, width: number = 800): string {
  if (!url) return url;

  // Handle Shopify URLs with {width} placeholder (e.g., nextdaysteel.co.uk)
  if (url.includes("{width}")) {
    return url.replace("{width}", String(width));
  }

  return url;
}

/**
 * Fetch image as base64 from URL
 */
export async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    // Normalize URL before fetching (handles Shopify {width} placeholder)
    const normalizedUrl = normalizeImageUrl(url);

    const response = await fetch(normalizedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} for URL: ${normalizedUrl}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("base64");
  } catch (err) {
    console.error("[aiHelpers] fetchImageAsBase64 failed:", err);
    throw err;
  }
}

/**
 * Calculate weighted confidence score
 */
export function calculateMatchConfidence(params: {
  skuMatch: { match: boolean; confidence: number };
  visualSimilarity: ComparisonResult;
  semanticMatch: ComparisonResult;
}): number {
  // Weights: SKU=40%, Visual=35%, Semantic=25%
  const skuScore = params.skuMatch.match ? params.skuMatch.confidence : 0;
  const visualScore = params.visualSimilarity.similar ? params.visualSimilarity.confidence : 0;
  const semanticScore = params.semanticMatch.similar ? params.semanticMatch.confidence : 0;

  return Math.round(
    skuScore * 0.4 +
    visualScore * 0.35 +
    semanticScore * 0.25
  );
}

// Export all helpers
export const aiHelpers = {
  aiCompareDescriptions,
  aiCompareImages,
  aiExtractProductData,
  aiReExtractField,
  aiVerifyClaim,
  aiCheckEquivalence,
  aiExtractClaims,
  selectBestValue,
  valuesAgree,
  compareSkus,
  fetchImageAsBase64,
  calculateMatchConfidence,
};
