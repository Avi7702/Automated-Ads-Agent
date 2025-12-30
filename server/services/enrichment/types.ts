/**
 * Enrichment Pipeline Types
 *
 * Comprehensive type definitions for the 4-gate intelligent verification pipeline.
 * This pipeline enriches product data from multiple sources with multi-level verification.
 */

// ============================================
// VISION ANALYSIS TYPES (Step 1)
// ============================================

export interface VisionResult {
  category: string;           // "Construction"
  subcategory: string;        // "Reinforcement"
  materials: string[];        // ["Galvanized Steel", "Metal"]
  colors: string[];           // ["Silver", "Grey"]
  style: string;              // "Industrial"
  usageContext: string;       // "Construction site"
  targetDemographic: string;  // "Contractors"
  confidence: number;         // 0-100
  detectedText: string[];     // Any text visible in image (SKU, brand)
}

// ============================================
// SOURCE DISCOVERY TYPES (Step 2)
// ============================================

export type SourceType = "primary" | "secondary" | "tertiary";

export interface SourceSearchResult {
  url: string;
  sourceType: SourceType;
  sourceName: string;        // "NDS Official", "Ferguson", "HD Supply"
  trustLevel: number;        // 1-10 (10 = most trusted)
  pageTitle: string;
  pageContent: string;
  extractedProductName: string;
  extractedSKU: string | null;
  extractedImages: string[];
}

// Trust level assignments by source type
export const SOURCE_TRUST_LEVELS: Record<string, number> = {
  // Primary sources - manufacturer/official
  "ndspro.com": 10,
  "nds.com": 10,
  "manufacturer": 9,

  // Secondary sources - major distributors
  "ferguson.com": 8,
  "hdsupply.com": 8,
  "homedepot.com": 7,
  "lowes.com": 7,
  "menards.com": 7,
  "grainger.com": 8,

  // Tertiary sources - industry databases
  "sweets.construction.com": 6,
  "arcat.com": 6,
  "specagent.com": 6,

  // General web
  "default": 4,
};

// ============================================
// GATE 1: SOURCE MATCH VERIFICATION
// ============================================

export type Gate1Recommendation = "USE" | "SKIP" | "USE_WITH_CAUTION";

export interface Gate1Result {
  sourceUrl: string;
  passed: boolean;
  confidence: number;        // 0-100
  matchReasons: string[];    // Why we think it matches
  mismatchReasons: string[]; // Why we think it might not match
  recommendation: Gate1Recommendation;

  // Individual scores
  skuMatchScore: number;        // 0-100
  visualSimilarityScore: number; // 0-100
  semanticMatchScore: number;    // 0-100
}

// ============================================
// DATA EXTRACTION TYPES (Step 3)
// ============================================

export interface ExtractedSpecifications {
  material?: string;
  dimensions?: string;
  weight?: string;
  loadCapacity?: string;
  finish?: string;
  [key: string]: string | undefined;
}

export interface ExtractedData {
  sourceUrl: string;
  productName: string;
  description: string;
  specifications: ExtractedSpecifications;
  relatedProducts: string[];
  installationInfo: string;
  certifications: string[];
  rawExtract: string;  // Original text before structuring
}

// ============================================
// GATE 2: EXTRACTION VERIFICATION
// ============================================

export type VerificationMethod = "DIRECT_MATCH" | "AI_REEXTRACT" | "SEMANTIC_VERIFY" | "NOT_VERIFIED";

export interface FieldVerification {
  field: string;
  extracted: string;
  verified: boolean;
  verificationMethod: VerificationMethod;
  confidence: number;  // 0-100 for this specific field
}

export interface Gate2Result {
  sourceUrl: string;
  passed: boolean;
  verifiedFields: FieldVerification[];
  overallAccuracy: number;  // 0-100%
}

// ============================================
// AGGREGATION TYPES (Step 4)
// ============================================

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface FieldSource {
  value: string;
  agreedBy: string[];  // Which source URLs agree
  confidence: ConfidenceLevel;
}

export interface AggregatedData {
  productName: string;
  description: string;
  specifications: Record<string, string>;
  sources: string[];
  fieldSources: Record<string, FieldSource>;
}

// ============================================
// GATE 4: CROSS-SOURCE TRUTH VERIFICATION
// ============================================

export type ConflictResolution = "EQUIVALENT" | "CONFLICT" | "COMPATIBLE";
export type ClaimVerdict = "VERIFIED" | "UNVERIFIED" | "CONTRADICTED";
export type Gate4Verdict = "ALL_VERIFIED" | "SOME_UNVERIFIED" | "CONFLICTS_FOUND";

export interface FieldConflict {
  field: string;
  values: { source: string; value: string }[];
  resolution: ConflictResolution;
  resolvedValue: string | null;
  reasoning: string;
}

export interface TruthCheck {
  claim: string;
  supportedBy: string[];
  contradictedBy: string[];
  verdict: ClaimVerdict;
}

export interface Gate4Result {
  passed: boolean;
  conflicts: FieldConflict[];
  truthChecks: TruthCheck[];
  overallVerdict: Gate4Verdict;
}

// ============================================
// GATE 3: DATABASE WRITE VERIFICATION
// ============================================

export type WriteIssue = "TRUNCATED" | "CORRUPTED" | "MISSING" | "ENCODING" | "TYPE_MISMATCH";

export interface WriteDiscrepancy {
  field: string;
  intended: string;
  actual: string;
  issue: WriteIssue;
}

export interface Gate3Result {
  passed: boolean;
  productId: string;
  discrepancies: WriteDiscrepancy[];
  retryCount: number;
}

// ============================================
// WRITE PAYLOAD
// ============================================

export interface WritePayload {
  productId: string;
  description: string;
  specifications: Record<string, string>;
  features: Record<string, string | string[]>;
  benefits: string[];
  tags: string[];
  sources: string[];
}

// ============================================
// ENRICHMENT REPORT
// ============================================

export interface EnrichmentSourceInfo {
  url: string;
  sourceType: SourceType;
  trustLevel: number;
}

export interface DataWrittenSummary {
  description: string;
  specifications: Record<string, string>;
  scenariosCreated: number;
  relationshipsCreated: number;
}

export interface EnrichmentReport {
  productId: string;
  productName: string;
  timestamp: Date;

  // Sources used
  sources: EnrichmentSourceInfo[];

  // Gate results
  gates: {
    gate1: Gate1Result[];  // One per source
    gate2: Gate2Result[];  // One per source
    gate3: Gate3Result;
    gate4: Gate4Result;
  };

  // Final data
  dataWritten: DataWrittenSummary;

  // Confidence and status
  overallConfidence: ConfidenceLevel;
  allGatesPassed: boolean;
  adaptations: string[];  // What the system adapted due to partial failures
}

// ============================================
// PIPELINE CONFIGURATION
// ============================================

export interface PipelineConfig {
  // Gate thresholds
  gate1PassThreshold: number;        // Default: 85
  gate1CautionThreshold: number;     // Default: 60
  gate2PassThreshold: number;        // Default: 90
  maxSourcesPerProduct: number;      // Default: 5
  minSourcesForHighConfidence: number; // Default: 3

  // Retry settings
  maxDbWriteRetries: number;         // Default: 3
  retryDelayMs: number;              // Default: 500

  // Feature flags
  enableVisualComparison: boolean;   // Default: true
  enableSemanticVerification: boolean; // Default: true
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  gate1PassThreshold: 85,
  gate1CautionThreshold: 60,
  gate2PassThreshold: 90,
  maxSourcesPerProduct: 5,
  minSourcesForHighConfidence: 3,
  maxDbWriteRetries: 3,
  retryDelayMs: 500,
  enableVisualComparison: true,
  enableSemanticVerification: true,
};

// ============================================
// PIPELINE INPUT/OUTPUT
// ============================================

export interface EnrichmentInput {
  productId: string;
  forceRefresh?: boolean;
  config?: Partial<PipelineConfig>;
}

export interface EnrichmentOutput {
  success: boolean;
  productId: string;
  report: EnrichmentReport;
  error?: string;
}

// ============================================
// AI HELPER TYPES
// ============================================

export interface ComparisonResult {
  similar: boolean;
  confidence: number;
  reasoning: string;
}

export interface EquivalenceResult {
  allEquivalent: boolean;
  compatible: boolean;
  resolvedValue: string | null;
  reasoning: string;
}

export interface ClaimSupportResult {
  supports: boolean;
  contradicts: boolean;
  neutral: boolean;
  reasoning: string;
}

export interface ExtractedClaim {
  claim: string;
  importance: "high" | "medium" | "low";
}
