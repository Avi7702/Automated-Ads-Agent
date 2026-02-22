/**
 * Gate 4: Cross-Source Truth Verification
 *
 * Purpose: Ensure aggregated data is TRUE and not confused across sources.
 *
 * Verification methods:
 * 1. Detect conflicts across sources (different values for same field)
 * 2. Check equivalence (e.g., "50mm" vs "2 inch")
 * 3. Verify each claim in final description against ALL sources
 * 4. Exclude contradicted claims
 *
 * This is the CRITICAL gate that prevents data confusion from multi-source aggregation.
 */

import { aiCheckEquivalence, aiExtractClaims, aiVerifyClaim } from './aiHelpers';
import {
  SOURCE_TRUST_LEVELS,
  type Gate4Result,
  type Gate4Verdict,
  type FieldConflict,
  type TruthCheck,
  type ClaimVerdict,
  type ConflictResolution,
  type ExtractedData,
  type AggregatedData,
  type ConfidenceLevel,
} from './types';

// ============================================
// MAIN VERIFICATION FUNCTION
// ============================================

/**
 * Verify cross-source truth of aggregated data
 */
export async function verifyCrossSourceTruth(
  extractions: ExtractedData[],
  aggregated: AggregatedData,
): Promise<Gate4Result> {
  // ============================================
  // 1. DETECT CONFLICTS across sources
  // ============================================
  const conflicts = await detectFieldConflicts(extractions, aggregated);

  // ============================================
  // 2. VERIFY each claim in final description against ALL sources
  // ============================================
  const truthChecks = await verifyDescriptionClaims(aggregated.description, extractions);

  // ============================================
  // 3. Determine overall verdict
  // ============================================
  const hasUnresolvedConflicts = conflicts.some((c) => c.resolution === 'CONFLICT');
  const hasContradictions = truthChecks.some((t) => t.verdict === 'CONTRADICTED');
  const hasUnverified = truthChecks.some((t) => t.verdict === 'UNVERIFIED');

  let overallVerdict: Gate4Verdict;
  let passed: boolean;

  if (hasUnresolvedConflicts || hasContradictions) {
    overallVerdict = 'CONFLICTS_FOUND';
    passed = false;
  } else if (hasUnverified) {
    overallVerdict = 'SOME_UNVERIFIED';
    passed = true; // Still passes, but with lower confidence
  } else {
    overallVerdict = 'ALL_VERIFIED';
    passed = true;
  }

  return {
    passed,
    conflicts,
    truthChecks,
    overallVerdict,
  };
}

// ============================================
// CONFLICT DETECTION
// ============================================

/**
 * Detect conflicts in field values across sources
 */
async function detectFieldConflicts(
  extractions: ExtractedData[],
  aggregated: AggregatedData,
): Promise<FieldConflict[]> {
  const conflicts: FieldConflict[] = [];

  // Get all unique field names from aggregated data
  const fieldNames = new Set<string>(['productName', 'description', ...Object.keys(aggregated.specifications)]);

  for (const fieldName of Array.from(fieldNames)) {
    // Collect all values for this field across sources
    const valuesWithSources: { source: string; value: string }[] = [];

    for (const extraction of extractions) {
      let value: string | undefined;

      if (fieldName === 'productName') {
        value = extraction.productName;
      } else if (fieldName === 'description') {
        value = extraction.description;
      } else {
        value = extraction.specifications[fieldName];
      }

      if (value && value.trim()) {
        valuesWithSources.push({
          source: extraction.sourceUrl,
          value: value.trim(),
        });
      }
    }

    // Skip if fewer than 2 sources have this field
    if (valuesWithSources.length < 2) {
      continue;
    }

    // Check if all values are the same
    const uniqueValues = Array.from(new Set(valuesWithSources.map((v) => v.value.toLowerCase())));

    if (uniqueValues.length === 1) {
      continue; // No conflict, all sources agree
    }

    // Check if values are equivalent (e.g., unit conversions)
    const equivalence = await aiCheckEquivalence(valuesWithSources.map((v) => v.value));

    let resolution: ConflictResolution;
    let resolvedValue: string | null = null;
    let reasoning: string;

    if (equivalence.allEquivalent) {
      resolution = 'EQUIVALENT';
      resolvedValue = equivalence.resolvedValue;
      reasoning = equivalence.reasoning;
    } else if (equivalence.compatible) {
      resolution = 'COMPATIBLE';
      resolvedValue = equivalence.resolvedValue;
      reasoning = equivalence.reasoning;
    } else {
      resolution = 'CONFLICT';
      resolvedValue = null;
      reasoning = equivalence.reasoning;
    }

    // Only record if there's something to report
    if (resolution !== 'EQUIVALENT' || uniqueValues.length > 1) {
      conflicts.push({
        field: fieldName,
        values: valuesWithSources,
        resolution,
        resolvedValue,
        reasoning,
      });
    }
  }

  return conflicts;
}

// ============================================
// CLAIM VERIFICATION
// ============================================

/**
 * Verify claims in the aggregated description against all sources
 */
async function verifyDescriptionClaims(description: string, extractions: ExtractedData[]): Promise<TruthCheck[]> {
  // Skip if description is empty
  if (!description || !description.trim()) {
    return [];
  }

  // Extract individual claims from description
  const claims = await aiExtractClaims(description);

  if (claims.length === 0) {
    return [];
  }

  const truthChecks: TruthCheck[] = [];

  // Verify each claim against all sources
  for (const { claim, importance: _importance } of claims) {
    const supportedBy: string[] = [];
    const contradictedBy: string[] = [];

    // Check claim against each source
    for (const extraction of extractions) {
      const support = await aiVerifyClaim({
        claim,
        source: extraction.rawExtract.substring(0, 4000),
      });

      if (support.supports) {
        supportedBy.push(extraction.sourceUrl);
      } else if (support.contradicts) {
        contradictedBy.push(extraction.sourceUrl);
      }
      // Neutral sources are not tracked
    }

    // Determine verdict
    let verdict: ClaimVerdict;

    if (contradictedBy.length > 0) {
      // Any contradiction is serious
      verdict = 'CONTRADICTED';
    } else if (supportedBy.length > 0) {
      verdict = 'VERIFIED';
    } else {
      verdict = 'UNVERIFIED';
    }

    truthChecks.push({
      claim,
      supportedBy,
      contradictedBy,
      verdict,
    });
  }

  return truthChecks;
}

// ============================================
// AUTOMATED RESOLUTION FUNCTIONS
// ============================================

/**
 * Automatically resolve conflicts when possible
 */
export function resolveConflicts(
  conflicts: FieldConflict[],
  extractions: ExtractedData[],
): {
  resolved: Record<string, string>;
  unresolved: FieldConflict[];
} {
  const resolved: Record<string, string> = {};
  const unresolved: FieldConflict[] = [];

  // Build source trust map
  const sourceTrustMap = buildSourceTrustMap(extractions);

  for (const conflict of conflicts) {
    if (conflict.resolution === 'EQUIVALENT' || conflict.resolution === 'COMPATIBLE') {
      // Use the resolved value from AI
      if (conflict.resolvedValue) {
        resolved[conflict.field] = conflict.resolvedValue;
      } else {
        // Fall back to highest-trust source
        const bestValue = selectHighestTrustValue(conflict.values, sourceTrustMap);
        if (bestValue) {
          resolved[conflict.field] = bestValue;
        } else {
          unresolved.push(conflict);
        }
      }
    } else if (conflict.resolution === 'CONFLICT') {
      // Try to resolve using trust levels
      const bestValue = selectHighestTrustValue(conflict.values, sourceTrustMap);
      if (bestValue) {
        resolved[conflict.field] = bestValue;
      } else {
        unresolved.push(conflict);
      }
    }
  }

  return { resolved, unresolved };
}

/**
 * Build a map of source URL to trust level
 */
function buildSourceTrustMap(extractions: ExtractedData[]): Map<string, number> {
  const trustMap = new Map<string, number>();

  for (const extraction of extractions) {
    try {
      const url = new URL(extraction.sourceUrl);
      const domain = url.hostname.replace(/^www\./, '');

      // Look up trust level
      const trustLevel = SOURCE_TRUST_LEVELS[domain] ?? SOURCE_TRUST_LEVELS['default'] ?? 4;
      trustMap.set(extraction.sourceUrl, trustLevel);
    } catch {
      // Invalid URL, use default trust
      trustMap.set(extraction.sourceUrl, 4);
    }
  }

  return trustMap;
}

/**
 * Select value from highest-trust source
 */
function selectHighestTrustValue(
  values: { source: string; value: string }[],
  trustMap: Map<string, number>,
): string | null {
  if (values.length === 0) return null;

  // Sort by trust level (highest first)
  const sorted = [...values].sort((a, b) => {
    const trustA = trustMap.get(a.source) || 4;
    const trustB = trustMap.get(b.source) || 4;
    return trustB - trustA;
  });

  return sorted[0]?.value ?? null;
}

/**
 * Filter out contradicted claims from description
 */
export function filterContradictedClaims(description: string, truthChecks: TruthCheck[]): string {
  let filteredDescription = description;

  // Get contradicted claims
  const contradicted = truthChecks.filter((t) => t.verdict === 'CONTRADICTED');

  // Simple approach: try to remove sentences containing the claim
  for (const check of contradicted) {
    // Find and remove the claim from the description
    // This is a simple implementation - could be improved with NLP
    const sentences = filteredDescription.split(/(?<=[.!?])\s+/);
    const filteredSentences = sentences.filter((sentence) => {
      // Check if this sentence contains the problematic claim
      const sentenceLower = sentence.toLowerCase();
      const claimLower = check.claim.toLowerCase();

      // Simple word overlap check
      const claimWords = claimLower.split(/\s+/).filter((w) => w.length > 3);
      const matchCount = claimWords.filter((w) => sentenceLower.includes(w)).length;
      const matchRatio = matchCount / claimWords.length;

      // Remove if more than 60% of claim words match
      return matchRatio < 0.6;
    });

    filteredDescription = filteredSentences.join(' ');
  }

  return filteredDescription.trim();
}

// ============================================
// CONFIDENCE CALCULATION
// ============================================

/**
 * Calculate overall confidence from Gate 4 result
 */
export function calculateGate4Confidence(result: Gate4Result): ConfidenceLevel {
  if (!result.passed) {
    return 'LOW';
  }

  const verifiedCount = result.truthChecks.filter((t) => t.verdict === 'VERIFIED').length;
  const totalChecks = result.truthChecks.length;

  if (totalChecks === 0) {
    return 'MEDIUM'; // No claims to verify
  }

  const verificationRatio = verifiedCount / totalChecks;

  if (verificationRatio >= 0.8 && result.conflicts.length === 0) {
    return 'HIGH';
  } else if (verificationRatio >= 0.5) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

/**
 * Get summary of Gate 4 results
 */
export function getGate4Summary(result: Gate4Result): {
  conflictsResolved: number;
  conflictsUnresolved: number;
  claimsVerified: number;
  claimsUnverified: number;
  claimsContradicted: number;
} {
  const conflictsResolved = result.conflicts.filter(
    (c) => c.resolution === 'EQUIVALENT' || c.resolution === 'COMPATIBLE',
  ).length;

  const conflictsUnresolved = result.conflicts.filter((c) => c.resolution === 'CONFLICT').length;

  const claimsVerified = result.truthChecks.filter((t) => t.verdict === 'VERIFIED').length;

  const claimsUnverified = result.truthChecks.filter((t) => t.verdict === 'UNVERIFIED').length;

  const claimsContradicted = result.truthChecks.filter((t) => t.verdict === 'CONTRADICTED').length;

  return {
    conflictsResolved,
    conflictsUnresolved,
    claimsVerified,
    claimsUnverified,
    claimsContradicted,
  };
}

// Export gate4 module
export const gate4 = {
  verifyCrossSourceTruth,
  resolveConflicts,
  filterContradictedClaims,
  calculateGate4Confidence,
  getGate4Summary,
};
