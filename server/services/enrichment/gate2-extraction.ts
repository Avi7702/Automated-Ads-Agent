/**
 * Gate 2: Extraction Verification
 *
 * Purpose: Verify we extracted the data correctly from the source.
 *
 * Verification methods for each field:
 * 1. Direct text search - Does source contain this exact text?
 * 2. AI re-extraction - Ask AI to find this field again
 * 3. Semantic verification - Ask AI if source supports this claim
 *
 * Threshold: 90% of fields must be verified for source to pass
 */

import { logger } from '../../lib/logger';
import { aiReExtractField, aiVerifyClaim, valuesAgree } from './aiHelpers';
import {
  DEFAULT_PIPELINE_CONFIG,
  type Gate2Result,
  type ExtractedData,
  type SourceSearchResult,
  type FieldVerification,
  type PipelineConfig,
} from './types';

// ============================================
// MAIN VERIFICATION FUNCTION
// ============================================

/**
 * Verify extracted data against the original source
 */
export async function verifyExtraction(
  source: SourceSearchResult,
  extracted: ExtractedData,
  config: PipelineConfig = { ...DEFAULT_PIPELINE_CONFIG },
): Promise<Gate2Result> {
  const verifiedFields: FieldVerification[] = [];
  const pageContent = source.pageContent;

  // ============================================
  // 1. Verify each extracted field
  // ============================================

  // Verify productName
  if (extracted.productName) {
    const verification = await verifyField('productName', extracted.productName, pageContent);
    verifiedFields.push(verification);
  }

  // Verify description
  if (extracted.description) {
    const verification = await verifyField('description', extracted.description, pageContent);
    verifiedFields.push(verification);
  }

  // Verify each specification
  for (const [specKey, specValue] of Object.entries(extracted.specifications)) {
    if (specValue) {
      const verification = await verifyField(`specifications.${specKey}`, specValue, pageContent);
      verifiedFields.push(verification);
    }
  }

  // Verify installation info
  if (extracted.installationInfo) {
    const verification = await verifyField('installationInfo', extracted.installationInfo, pageContent);
    verifiedFields.push(verification);
  }

  // Verify certifications (check each one)
  for (let i = 0; i < extracted.certifications.length; i++) {
    const cert = extracted.certifications[i];
    if (cert) {
      const verification = await verifyField(`certifications[${i}]`, cert, pageContent);
      verifiedFields.push(verification);
    }
  }

  // ============================================
  // 2. Calculate overall accuracy
  // ============================================
  const verifiedCount = verifiedFields.filter((f) => f.verified).length;
  const totalFields = verifiedFields.length;
  const overallAccuracy = totalFields > 0 ? Math.round((verifiedCount / totalFields) * 100) : 0;

  // ============================================
  // 3. Determine if extraction passes
  // ============================================
  const passed = overallAccuracy >= config.gate2PassThreshold;

  return {
    sourceUrl: source.url,
    passed,
    verifiedFields,
    overallAccuracy,
  };
}

// ============================================
// FIELD VERIFICATION
// ============================================

/**
 * Verify a single extracted field against source content
 */
async function verifyField(fieldName: string, extractedValue: string, pageContent: string): Promise<FieldVerification> {
  // Skip empty values
  if (!extractedValue || !extractedValue.trim()) {
    return {
      field: fieldName,
      extracted: extractedValue,
      verified: false,
      verificationMethod: 'NOT_VERIFIED',
      confidence: 0,
    };
  }

  // ============================================
  // Method 1: Direct text search (fastest, most reliable)
  // ============================================
  const directMatch = checkDirectMatch(pageContent, extractedValue);

  if (directMatch.found) {
    return {
      field: fieldName,
      extracted: extractedValue,
      verified: true,
      verificationMethod: 'DIRECT_MATCH',
      confidence: directMatch.confidence,
    };
  }

  // ============================================
  // Method 2: AI re-extraction
  // ============================================
  try {
    // Extract the base field name (remove array indices and nested paths)
    const baseFieldName =
      fieldName
        .split('.')
        .pop()
        ?.replace(/\[\d+\]/, '') || fieldName;

    const reExtracted = await aiReExtractField(pageContent, baseFieldName);

    if (reExtracted && valuesAgree(extractedValue, reExtracted)) {
      return {
        field: fieldName,
        extracted: extractedValue,
        verified: true,
        verificationMethod: 'AI_REEXTRACT',
        confidence: 85, // AI re-extraction is reliable but not 100%
      };
    }

    // Values don't match but both exist - check if semantically equivalent
    if (reExtracted) {
      const semanticVerify = await aiVerifyClaim({
        claim: `The ${baseFieldName} is: ${extractedValue}`,
        source: pageContent,
      });

      if (semanticVerify.supports) {
        return {
          field: fieldName,
          extracted: extractedValue,
          verified: true,
          verificationMethod: 'SEMANTIC_VERIFY',
          confidence: 75, // Semantic verification is less precise
        };
      }
    }
  } catch (err) {
    logger.warn({ module: 'Gate2', fieldName, err }, 'AI verification failed');
    // Fall through to semantic-only verification
  }

  // ============================================
  // Method 3: Semantic verification (fallback)
  // ============================================
  try {
    const baseFieldName =
      fieldName
        .split('.')
        .pop()
        ?.replace(/\[\d+\]/, '') || fieldName;

    const semanticVerify = await aiVerifyClaim({
      claim: `The product's ${baseFieldName} is: ${extractedValue}`,
      source: pageContent.substring(0, 4000), // Limit content for API
    });

    if (semanticVerify.supports) {
      return {
        field: fieldName,
        extracted: extractedValue,
        verified: true,
        verificationMethod: 'SEMANTIC_VERIFY',
        confidence: 70,
      };
    }

    // Check if contradicted
    if (semanticVerify.contradicts) {
      return {
        field: fieldName,
        extracted: extractedValue,
        verified: false,
        verificationMethod: 'NOT_VERIFIED',
        confidence: 0, // Actively contradicted
      };
    }
  } catch (err) {
    logger.warn({ module: 'Gate2', fieldName, err }, 'Semantic verification failed');
  }

  // ============================================
  // Verification failed
  // ============================================
  return {
    field: fieldName,
    extracted: extractedValue,
    verified: false,
    verificationMethod: 'NOT_VERIFIED',
    confidence: 0,
  };
}

// ============================================
// DIRECT MATCH HELPERS
// ============================================

interface DirectMatchResult {
  found: boolean;
  confidence: number;
}

/**
 * Check if source content contains the extracted value
 */
function checkDirectMatch(pageContent: string, extractedValue: string): DirectMatchResult {
  const normalizedContent = normalizeText(pageContent);
  const normalizedValue = normalizeText(extractedValue);

  // Exact match (after normalization)
  if (normalizedContent.includes(normalizedValue)) {
    return { found: true, confidence: 100 };
  }

  // Check for significant substring match (for longer values)
  if (normalizedValue.length > 20) {
    // Split into words and check if most words are present
    const words = normalizedValue.split(/\s+/).filter((w) => w.length > 3);
    if (words.length > 0) {
      const matchedWords = words.filter((word) => normalizedContent.includes(word));
      const matchRatio = matchedWords.length / words.length;

      if (matchRatio >= 0.8) {
        return { found: true, confidence: Math.round(matchRatio * 95) };
      }
    }
  }

  // Check for numerical values with tolerance
  const numberMatch = checkNumberMatch(extractedValue, pageContent);
  if (numberMatch.found) {
    return numberMatch;
  }

  return { found: false, confidence: 0 };
}

/**
 * Check for numerical value matches (handles unit conversions)
 */
function checkNumberMatch(extractedValue: string, pageContent: string): DirectMatchResult {
  // Extract numbers from the value
  const numberPattern = /(\d+(?:\.\d+)?)\s*(mm|cm|m|in|inch|inches|ft|feet|kg|lb|lbs|oz|g)?/gi;
  const match = numberPattern.exec(extractedValue);

  if (!match) {
    return { found: false, confidence: 0 };
  }

  const value = parseFloat(match[1] ?? '0');
  const unit = (match[2] ?? '').toLowerCase();

  // Look for the same number in the content
  const contentNumbers = pageContent.match(/\d+(?:\.\d+)?/g) || [];

  for (const numStr of contentNumbers) {
    const contentValue = parseFloat(numStr);

    // Exact match
    if (Math.abs(contentValue - value) < 0.001) {
      return { found: true, confidence: 90 };
    }

    // Common unit conversions
    const conversions: Record<string, Record<string, number>> = {
      mm: { in: 25.4, inch: 25.4, inches: 25.4, cm: 10 },
      cm: { mm: 0.1, in: 2.54, inch: 2.54, inches: 2.54 },
      m: { ft: 0.3048, feet: 0.3048 },
      kg: { lb: 0.453592, lbs: 0.453592 },
    };

    if (unit && conversions[unit]) {
      for (const [_targetUnit, factor] of Object.entries(conversions[unit])) {
        const converted = value / factor;
        if (Math.abs(contentValue - converted) < 0.1) {
          return { found: true, confidence: 85 };
        }
      }
    }
  }

  return { found: false, confidence: 0 };
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\d.-]/g, '')
    .trim();
}

// ============================================
// BATCH VERIFICATION
// ============================================

/**
 * Verify multiple extractions in parallel
 */
export async function verifyExtractionsBatch(
  sourcesWithExtractions: Array<{
    source: SourceSearchResult;
    extracted: ExtractedData;
  }>,
  config?: PipelineConfig,
): Promise<Gate2Result[]> {
  const results = await Promise.all(
    sourcesWithExtractions.map(({ source, extracted }) =>
      verifyExtraction(source, extracted, config).catch((err) => {
        logger.error({ module: 'Gate2', sourceUrl: source.url, err }, 'Verification failed');
        return {
          sourceUrl: source.url,
          passed: false,
          verifiedFields: [],
          overallAccuracy: 0,
        };
      }),
    ),
  );

  return results;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get only verified fields from an extraction
 */
export function getVerifiedFields(extracted: ExtractedData, gate2Result: Gate2Result): ExtractedData {
  const verifiedFieldNames = new Set(gate2Result.verifiedFields.filter((f) => f.verified).map((f) => f.field));

  // Filter specifications to only verified ones
  const verifiedSpecs: Record<string, string> = {};
  for (const [key, value] of Object.entries(extracted.specifications)) {
    if (verifiedFieldNames.has(`specifications.${key}`)) {
      verifiedSpecs[key] = value || '';
    }
  }

  // Filter certifications to only verified ones
  const verifiedCerts: string[] = [];
  for (let i = 0; i < extracted.certifications.length; i++) {
    const cert = extracted.certifications[i];
    if (cert && verifiedFieldNames.has(`certifications[${i}]`)) {
      verifiedCerts.push(cert);
    }
  }

  return {
    ...extracted,
    productName: verifiedFieldNames.has('productName') ? extracted.productName : '',
    description: verifiedFieldNames.has('description') ? extracted.description : '',
    specifications: verifiedSpecs,
    installationInfo: verifiedFieldNames.has('installationInfo') ? extracted.installationInfo : '',
    certifications: verifiedCerts,
  };
}

/**
 * Calculate aggregate extraction confidence
 */
export function calculateExtractionConfidence(results: Gate2Result[]): number {
  if (results.length === 0) return 0;

  const totalAccuracy = results.reduce((sum, r) => sum + r.overallAccuracy, 0);
  return Math.round(totalAccuracy / results.length);
}

// Export gate2 module
export const gate2 = {
  verifyExtraction,
  verifyExtractionsBatch,
  getVerifiedFields,
  calculateExtractionConfidence,
};
