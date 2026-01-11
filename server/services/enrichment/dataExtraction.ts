/**
 * Data Extraction Service
 *
 * Extracts structured product data from source page content.
 * Uses AI to intelligently parse and structure information.
 */

import { logger } from "../../lib/logger";
import { aiExtractProductData } from "./aiHelpers";
import type {
  ExtractedData,
  SourceSearchResult,
  AggregatedData,
  ConfidenceLevel,
  FieldSource,
} from "./types";

// ============================================
// MAIN EXTRACTION FUNCTION
// ============================================

/**
 * Extract structured data from a source
 */
export async function extractFromSource(
  source: SourceSearchResult,
  productNameHint?: string
): Promise<ExtractedData> {
  // Use AI to extract structured data
  const extracted = await aiExtractProductData(
    source.pageContent,
    productNameHint || source.extractedProductName
  );

  return {
    ...extracted,
    sourceUrl: source.url,
    rawExtract: source.pageContent,
  };
}

/**
 * Extract data from multiple sources in parallel
 */
export async function extractFromSourcesBatch(
  sources: SourceSearchResult[],
  productNameHint?: string
): Promise<ExtractedData[]> {
  const results = await Promise.all(
    sources.map(source =>
      extractFromSource(source, productNameHint)
        .catch(err => {
          logger.error({ module: 'DataExtraction', url: source.url, err }, 'Extraction failed');
          // Return minimal extraction on error
          return {
            sourceUrl: source.url,
            productName: source.extractedProductName || "",
            description: "",
            specifications: {},
            relatedProducts: [],
            installationInfo: "",
            certifications: [],
            rawExtract: source.pageContent,
          };
        })
    )
  );

  return results;
}

// ============================================
// AGGREGATION FUNCTIONS
// ============================================

/**
 * Aggregate extracted data from multiple sources into unified data
 */
export function aggregateExtractions(
  extractions: ExtractedData[],
  sourceTrustLevels: Map<string, number>
): AggregatedData {
  if (extractions.length === 0) {
    return {
      productName: "",
      description: "",
      specifications: {},
      sources: [],
      fieldSources: {},
    };
  }

  const fieldSources: Record<string, FieldSource> = {};
  const sources = extractions.map(e => e.sourceUrl);

  // ============================================
  // 1. Aggregate product name (use highest trust)
  // ============================================
  const productName = selectBestValueByTrust(
    extractions
      .filter(e => e.productName)
      .map(e => ({
        value: e.productName,
        source: e.sourceUrl,
        trustLevel: sourceTrustLevels.get(e.sourceUrl) || 4,
      }))
  );

  if (productName.value) {
    fieldSources["productName"] = {
      value: productName.value,
      agreedBy: productName.agreedBy,
      confidence: calculateFieldConfidence(productName.agreedBy.length),
    };
  }

  // ============================================
  // 2. Aggregate description (combine best descriptions)
  // ============================================
  const description = selectBestValueByTrust(
    extractions
      .filter(e => e.description && e.description.length > 20)
      .map(e => ({
        value: e.description,
        source: e.sourceUrl,
        trustLevel: sourceTrustLevels.get(e.sourceUrl) || 4,
      }))
  );

  if (description.value) {
    fieldSources["description"] = {
      value: description.value,
      agreedBy: description.agreedBy,
      confidence: calculateFieldConfidence(description.agreedBy.length),
    };
  }

  // ============================================
  // 3. Aggregate specifications (field by field)
  // ============================================
  const allSpecKeys = new Set<string>();
  for (const extraction of extractions) {
    for (const key of Object.keys(extraction.specifications)) {
      allSpecKeys.add(key);
    }
  }

  const specifications: Record<string, string> = {};

  for (const specKey of Array.from(allSpecKeys)) {
    const specValues = extractions
      .filter(e => e.specifications[specKey])
      .map(e => ({
        value: e.specifications[specKey] || "",
        source: e.sourceUrl,
        trustLevel: sourceTrustLevels.get(e.sourceUrl) || 4,
      }));

    if (specValues.length > 0) {
      const selected = selectBestValueByTrust(specValues);
      specifications[specKey] = selected.value;

      fieldSources[`specifications.${specKey}`] = {
        value: selected.value,
        agreedBy: selected.agreedBy,
        confidence: calculateFieldConfidence(selected.agreedBy.length),
      };
    }
  }

  // ============================================
  // 4. Aggregate installation info
  // ============================================
  const installationInfos = extractions
    .filter(e => e.installationInfo && e.installationInfo.length > 20)
    .map(e => ({
      value: e.installationInfo,
      source: e.sourceUrl,
      trustLevel: sourceTrustLevels.get(e.sourceUrl) || 4,
    }));

  if (installationInfos.length > 0) {
    const selected = selectBestValueByTrust(installationInfos);
    fieldSources["installationInfo"] = {
      value: selected.value,
      agreedBy: selected.agreedBy,
      confidence: calculateFieldConfidence(selected.agreedBy.length),
    };
  }

  // ============================================
  // 5. Aggregate certifications (union of all)
  // ============================================
  const allCertifications = new Set<string>();
  for (const extraction of extractions) {
    for (const cert of extraction.certifications) {
      if (cert && cert.trim()) {
        allCertifications.add(cert.trim());
      }
    }
  }

  if (allCertifications.size > 0) {
    fieldSources["certifications"] = {
      value: Array.from(allCertifications).join(", "),
      agreedBy: sources,
      confidence: "MEDIUM",
    };
  }

  // ============================================
  // 6. Aggregate related products (union of all)
  // ============================================
  const allRelatedProducts = new Set<string>();
  for (const extraction of extractions) {
    for (const product of extraction.relatedProducts) {
      if (product && product.trim()) {
        allRelatedProducts.add(product.trim());
      }
    }
  }

  if (allRelatedProducts.size > 0) {
    fieldSources["relatedProducts"] = {
      value: Array.from(allRelatedProducts).join(", "),
      agreedBy: sources,
      confidence: "MEDIUM",
    };
  }

  return {
    productName: productName.value,
    description: description.value,
    specifications,
    sources,
    fieldSources,
  };
}

// ============================================
// VALUE SELECTION HELPERS
// ============================================

interface ValueWithSource {
  value: string;
  source: string;
  trustLevel: number;
}

interface SelectedValue {
  value: string;
  agreedBy: string[];
}

/**
 * Select the best value using trust-weighted voting
 */
function selectBestValueByTrust(values: ValueWithSource[]): SelectedValue {
  if (values.length === 0) {
    return { value: "", agreedBy: [] };
  }

  // Group by normalized value
  const valueGroups = new Map<string, ValueWithSource[]>();

  for (const v of values) {
    const normalized = normalizeValue(v.value);
    if (!valueGroups.has(normalized)) {
      valueGroups.set(normalized, []);
    }
    valueGroups.get(normalized)!.push(v);
  }

  // Find the group with highest combined trust
  let bestValue = "";
  let bestScore = 0;
  let bestAgreedBy: string[] = [];

  for (const entry of Array.from(valueGroups.entries())) {
    const [, group] = entry;
    // Score = sum of trust levels * agreement bonus
    const trustSum = group.reduce((sum: number, v: ValueWithSource) => sum + v.trustLevel, 0);
    const agreementBonus = 1 + (group.length - 1) * 0.2; // Bonus for multiple sources
    const score = trustSum * agreementBonus;

    if (score > bestScore) {
      bestScore = score;
      // Use the original value from highest trust source
      const sortedGroup = [...group].sort((a, b) => b.trustLevel - a.trustLevel);
      bestValue = sortedGroup[0].value;
      bestAgreedBy = group.map((v: ValueWithSource) => v.source);
    }
  }

  return { value: bestValue, agreedBy: bestAgreedBy };
}

/**
 * Normalize a value for comparison
 */
function normalizeValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\d.-]/g, "")
    .trim();
}

/**
 * Calculate confidence level based on agreement count
 */
function calculateFieldConfidence(agreementCount: number): ConfidenceLevel {
  if (agreementCount >= 3) return "HIGH";
  if (agreementCount >= 2) return "MEDIUM";
  return "LOW";
}

// ============================================
// FEATURE AND BENEFIT EXTRACTION
// ============================================

/**
 * Extract features from aggregated specifications
 */
export function extractFeatures(
  specifications: Record<string, string>,
  description: string
): Record<string, string | string[]> {
  const features: Record<string, string | string[]> = {};

  // Map specifications to features
  const featureKeys = ["material", "finish", "dimensions", "weight", "color", "pattern"];

  for (const key of featureKeys) {
    const value = specifications[key];
    if (value) {
      features[key] = value;
    }
  }

  // Also check description for additional features
  // Look for patterns like "Made of X", "Available in X"
  const descLower = description.toLowerCase();

  // Installation methods
  const installationMethods: string[] = [];
  if (descLower.includes("nail") || descLower.includes("nailing")) {
    installationMethods.push("nail");
  }
  if (descLower.includes("glue") || descLower.includes("adhesive")) {
    installationMethods.push("glue");
  }
  if (descLower.includes("float") || descLower.includes("floating")) {
    installationMethods.push("float");
  }
  if (descLower.includes("stapl")) {
    installationMethods.push("staple");
  }
  if (installationMethods.length > 0) {
    features["installation"] = installationMethods;
  }

  return features;
}

/**
 * Extract benefits from description
 */
export function extractBenefits(description: string): string[] {
  const benefits: string[] = [];

  // Common benefit patterns
  const benefitPatterns = [
    /durable/i,
    /easy to (install|maintain|clean)/i,
    /long[- ]lasting/i,
    /water[- ]?resistant/i,
    /scratch[- ]?resistant/i,
    /eco[- ]?friendly/i,
    /sustainable/i,
    /low[- ]?maintenance/i,
    /high[- ]?quality/i,
    /professional[- ]?grade/i,
    /weather[- ]?resistant/i,
    /corrosion[- ]?resistant/i,
    /rust[- ]?resistant/i,
    /fire[- ]?resistant/i,
    /uv[- ]?resistant/i,
  ];

  for (const pattern of benefitPatterns) {
    const match = description.match(pattern);
    if (match) {
      // Capitalize first letter
      const benefit = match[0].charAt(0).toUpperCase() + match[0].slice(1);
      if (!benefits.includes(benefit)) {
        benefits.push(benefit);
      }
    }
  }

  return benefits;
}

/**
 * Extract tags from aggregated data
 */
export function extractTags(
  specifications: Record<string, string>,
  description: string,
  productName: string
): string[] {
  const tags = new Set<string>();

  // Add material as tag
  if (specifications.material) {
    tags.add(specifications.material.toLowerCase());
  }

  // Add color as tag
  if (specifications.color) {
    tags.add(specifications.color.toLowerCase());
  }

  // Add style as tag
  if (specifications.style) {
    tags.add(specifications.style.toLowerCase());
  }

  // Extract words from product name that could be tags
  const nameWords = productName.toLowerCase().split(/\s+/);
  for (const word of nameWords) {
    // Skip common non-descriptive words
    if (word.length >= 4 && !["with", "from", "the", "and", "for"].includes(word)) {
      tags.add(word);
    }
  }

  // Common category tags from description
  const categoryKeywords = [
    "construction",
    "industrial",
    "commercial",
    "residential",
    "outdoor",
    "indoor",
    "heavy-duty",
    "professional",
  ];

  const descLower = description.toLowerCase();
  for (const keyword of categoryKeywords) {
    if (descLower.includes(keyword)) {
      tags.add(keyword);
    }
  }

  return Array.from(tags);
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate that extracted data meets minimum quality standards
 */
export function validateExtraction(extracted: ExtractedData): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check required fields
  if (!extracted.productName || extracted.productName.length < 3) {
    issues.push("Product name is missing or too short");
  }

  if (!extracted.description || extracted.description.length < 20) {
    issues.push("Description is missing or too short");
  }

  // Check for placeholder or error content
  const placeholder = /lorem ipsum|example|placeholder|not found|error/i;
  if (placeholder.test(extracted.description)) {
    issues.push("Description appears to contain placeholder text");
  }

  if (placeholder.test(extracted.productName)) {
    issues.push("Product name appears to contain placeholder text");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Calculate overall extraction quality score
 */
export function calculateExtractionQuality(extracted: ExtractedData): number {
  let score = 0;

  // Product name (20 points)
  if (extracted.productName) {
    score += 20;
  }

  // Description quality (30 points)
  if (extracted.description) {
    if (extracted.description.length >= 100) {
      score += 30;
    } else if (extracted.description.length >= 50) {
      score += 20;
    } else {
      score += 10;
    }
  }

  // Specifications (30 points)
  const specCount = Object.keys(extracted.specifications).length;
  score += Math.min(30, specCount * 6); // 6 points per spec, max 30

  // Certifications (10 points)
  if (extracted.certifications.length > 0) {
    score += 10;
  }

  // Installation info (10 points)
  if (extracted.installationInfo && extracted.installationInfo.length > 20) {
    score += 10;
  }

  return score;
}

// Export data extraction module
export const dataExtraction = {
  extractFromSource,
  extractFromSourcesBatch,
  aggregateExtractions,
  extractFeatures,
  extractBenefits,
  extractTags,
  validateExtraction,
  calculateExtractionQuality,
};
