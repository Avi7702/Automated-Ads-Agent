/**
 * Enrichment Pipeline Module Index
 *
 * Exports all enrichment pipeline functionality for use by other services.
 */

// Types
export * from "./types";

// AI Helpers
export { aiHelpers } from "./aiHelpers";
export {
  aiCompareDescriptions,
  aiCompareImages,
  aiExtractProductData,
  aiReExtractField,
  aiVerifyClaim,
  aiCheckEquivalence,
  aiExtractClaims,
  compareSkus,
  fetchImageAsBase64,
  calculateMatchConfidence,
} from "./aiHelpers";

// Gate 1: Source Match Verification
export { gate1 } from "./gate1-sourceMatch";
export {
  verifySourceMatch,
  verifySourcesBatch,
  getPassedSources,
  categorizeByRecommendation,
} from "./gate1-sourceMatch";

// Gate 2: Extraction Verification
export { gate2 } from "./gate2-extraction";
export {
  verifyExtraction,
  verifyExtractionsBatch,
  getVerifiedFields,
  calculateExtractionConfidence,
} from "./gate2-extraction";

// Gate 3: Database Write Verification
export { gate3 } from "./gate3-dbWrite";
export {
  verifyDatabaseWrite,
  buildWritePayload,
  isRetryableFailure,
} from "./gate3-dbWrite";

// Gate 4: Cross-Source Truth Verification
export { gate4 } from "./gate4-crossSource";
export {
  verifyCrossSourceTruth,
  resolveConflicts,
  filterContradictedClaims,
  calculateGate4Confidence,
  getGate4Summary,
} from "./gate4-crossSource";

// Source Discovery
export { sourceDiscovery } from "./sourceDiscovery";
export {
  discoverSources,
  fetchSourceContent,
  fetchSourceContentsBatch,
} from "./sourceDiscovery";

// Data Extraction
export { dataExtraction } from "./dataExtraction";
export {
  extractFromSource,
  extractFromSourcesBatch,
  aggregateExtractions,
  extractFeatures,
  extractBenefits,
  extractTags,
  validateExtraction,
  calculateExtractionQuality,
} from "./dataExtraction";

// Main Pipeline
export { enrichmentPipeline } from "./pipeline";
export {
  runEnrichmentPipeline,
  runEnrichmentBatch,
  runEnrichmentForPendingProducts,
} from "./pipeline";
