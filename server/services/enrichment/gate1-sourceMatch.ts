/**
 * Gate 1: Source Match Verification
 *
 * Purpose: Verify each source URL actually describes THIS product (not a similar one).
 *
 * Verification methods:
 * 1. SKU/Part Number Match (if available) - Weight: 40%
 * 2. Visual Similarity (compare product image to source images) - Weight: 35%
 * 3. Semantic Match (AI compares descriptions) - Weight: 25%
 *
 * Outputs:
 * - USE: confidence >= 85 (use this source)
 * - USE_WITH_CAUTION: 60 <= confidence < 85 (use but mark lower confidence)
 * - SKIP: confidence < 60 (don't use this source)
 */

import {
  aiCompareDescriptions,
  aiCompareImages,
  compareSkus,
  fetchImageAsBase64,
  calculateMatchConfidence,
} from "./aiHelpers";
import {
  DEFAULT_PIPELINE_CONFIG,
  type Gate1Result,
  type Gate1Recommendation,
  type SourceSearchResult,
  type VisionResult,
  type PipelineConfig,
} from "./types";

// ============================================
// MAIN VERIFICATION FUNCTION
// ============================================

/**
 * Verify that a source URL describes the same product as our product
 */
export async function verifySourceMatch(
  vision: VisionResult,
  source: SourceSearchResult,
  productImageUrl: string,
  config: PipelineConfig = { ...DEFAULT_PIPELINE_CONFIG }
): Promise<Gate1Result> {
  const matchReasons: string[] = [];
  const mismatchReasons: string[] = [];

  // ============================================
  // 1. SKU/Part Number Match (Weight: 40%)
  // ============================================
  const skuMatch = compareSkus(vision.detectedText, source.extractedSKU);

  if (skuMatch.match) {
    matchReasons.push(`SKU match found (${skuMatch.confidence}% confidence)`);
  } else if (source.extractedSKU) {
    mismatchReasons.push(`SKU "${source.extractedSKU}" not found in product image`);
  }

  // ============================================
  // 2. Visual Similarity (Weight: 35%)
  // ============================================
  let visualSimilarity = { similar: false, confidence: 0, reasoning: "" };

  if (config.enableVisualComparison && source.extractedImages.length > 0) {
    try {
      // Fetch our product image
      const productImageBase64 = await fetchImageAsBase64(productImageUrl);

      // Compare against each source image, take best match
      for (const sourceImageUrl of source.extractedImages.slice(0, 3)) {
        try {
          const sourceImageBase64 = await fetchImageAsBase64(sourceImageUrl);
          const comparison = await aiCompareImages(productImageBase64, sourceImageBase64);

          if (comparison.confidence > visualSimilarity.confidence) {
            visualSimilarity = comparison;
          }
        } catch (imgErr) {
          // Individual image comparison failed, continue with others
          console.warn(`[Gate1] Failed to compare image ${sourceImageUrl}:`, imgErr);
        }
      }

      if (visualSimilarity.similar) {
        matchReasons.push(`Visual match: ${visualSimilarity.reasoning}`);
      } else if (visualSimilarity.reasoning) {
        mismatchReasons.push(`Visual mismatch: ${visualSimilarity.reasoning}`);
      }
    } catch (err) {
      console.warn("[Gate1] Visual comparison failed:", err);
      // Continue without visual comparison
    }
  }

  // ============================================
  // 3. Semantic Match (Weight: 25%)
  // ============================================
  let semanticMatch = { similar: false, confidence: 0, reasoning: "" };

  if (config.enableSemanticVerification) {
    try {
      semanticMatch = await aiCompareDescriptions({
        ourProduct: {
          category: vision.category,
          materials: vision.materials,
          colors: vision.colors,
          style: vision.style,
        },
        sourceProduct: {
          title: source.pageTitle,
          content: source.pageContent.substring(0, 2000),
        },
      });

      if (semanticMatch.similar) {
        matchReasons.push(`Semantic match: ${semanticMatch.reasoning}`);
      } else {
        mismatchReasons.push(`Semantic mismatch: ${semanticMatch.reasoning}`);
      }
    } catch (err) {
      console.warn("[Gate1] Semantic comparison failed:", err);
      // Continue without semantic comparison
    }
  }

  // ============================================
  // 4. Calculate Overall Confidence
  // ============================================
  const confidence = calculateMatchConfidence({
    skuMatch,
    visualSimilarity,
    semanticMatch,
  });

  // ============================================
  // 5. Determine Recommendation
  // ============================================
  let recommendation: Gate1Recommendation;
  let passed: boolean;

  if (confidence >= config.gate1PassThreshold) {
    recommendation = "USE";
    passed = true;
  } else if (confidence >= config.gate1CautionThreshold) {
    recommendation = "USE_WITH_CAUTION";
    passed = true;  // Still passes, but with lower confidence
  } else {
    recommendation = "SKIP";
    passed = false;
  }

  return {
    sourceUrl: source.url,
    passed,
    confidence,
    matchReasons,
    mismatchReasons,
    recommendation,
    skuMatchScore: skuMatch.confidence,
    visualSimilarityScore: visualSimilarity.confidence,
    semanticMatchScore: semanticMatch.confidence,
  };
}

// ============================================
// BATCH VERIFICATION
// ============================================

/**
 * Verify multiple sources in parallel
 */
export async function verifySourcesBatch(
  vision: VisionResult,
  sources: SourceSearchResult[],
  productImageUrl: string,
  config?: PipelineConfig
): Promise<Gate1Result[]> {
  const results = await Promise.all(
    sources.map(source =>
      verifySourceMatch(vision, source, productImageUrl, config)
        .catch(err => {
          console.error(`[Gate1] Verification failed for ${source.url}:`, err);
          // Return a failed result for this source
          return {
            sourceUrl: source.url,
            passed: false,
            confidence: 0,
            matchReasons: [],
            mismatchReasons: [`Verification error: ${err.message || err}`],
            recommendation: "SKIP" as Gate1Recommendation,
            skuMatchScore: 0,
            visualSimilarityScore: 0,
            semanticMatchScore: 0,
          };
        })
    )
  );

  return results;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Filter sources that passed Gate 1
 */
export function getPassedSources(
  sources: SourceSearchResult[],
  gate1Results: Gate1Result[]
): SourceSearchResult[] {
  const passedUrls = new Set(
    gate1Results
      .filter(r => r.passed)
      .map(r => r.sourceUrl)
  );

  return sources.filter(s => passedUrls.has(s.url));
}

/**
 * Get sources by recommendation type
 */
export function categorizeByRecommendation(
  results: Gate1Result[]
): {
  use: Gate1Result[];
  useWithCaution: Gate1Result[];
  skip: Gate1Result[];
} {
  return {
    use: results.filter(r => r.recommendation === "USE"),
    useWithCaution: results.filter(r => r.recommendation === "USE_WITH_CAUTION"),
    skip: results.filter(r => r.recommendation === "SKIP"),
  };
}

/**
 * Calculate aggregate confidence from multiple sources
 */
export function calculateAggregateConfidence(results: Gate1Result[]): number {
  const passed = results.filter(r => r.passed);
  if (passed.length === 0) return 0;

  // Weight by individual confidence
  const totalWeight = passed.reduce((sum, r) => sum + r.confidence, 0);
  return Math.round(totalWeight / passed.length);
}

// Export gate1 module
export const gate1 = {
  verifySourceMatch,
  verifySourcesBatch,
  getPassedSources,
  categorizeByRecommendation,
  calculateAggregateConfidence,
};
