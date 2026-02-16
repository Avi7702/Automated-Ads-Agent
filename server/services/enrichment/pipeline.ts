/**
 * Enrichment Pipeline Orchestrator
 *
 * Main orchestration for the Intelligent 4-Gate Verification Pipeline.
 *
 * Pipeline Flow:
 * 1. Vision Analysis (existing service)
 * 2. Source Discovery (find 2-5 authoritative sources)
 * 3. Gate 1: Verify each source matches our product
 * 4. Data Extraction (extract structured data from verified sources)
 * 5. Gate 2: Verify extractions are correct
 * 6. Aggregation (combine data from multiple sources)
 * 7. Gate 4: Cross-source truth verification
 * 8. Gate 3: Database write verification
 *
 * Automated Adaptation:
 * - When gates fail, system adapts automatically (no human needed)
 * - Confidence levels reflect data quality (HIGH/MEDIUM/LOW)
 */

import { logger } from "../../lib/logger";
import { storage } from "../../storage";
import { visionAnalysisService } from "../visionAnalysisService";

import {
  discoverSources,
  fetchSourceContentsBatch,
} from "./sourceDiscovery";
import {
  extractFromSourcesBatch,
  aggregateExtractions,
  extractFeatures,
  extractBenefits,
  extractTags,
} from "./dataExtraction";
import { verifySourcesBatch, getPassedSources } from "./gate1-sourceMatch";
import { verifyExtractionsBatch, getVerifiedFields } from "./gate2-extraction";
import { verifyDatabaseWrite, buildWritePayload } from "./gate3-dbWrite";
import {
  verifyCrossSourceTruth,
  resolveConflicts,
  filterContradictedClaims,
  calculateGate4Confidence,
} from "./gate4-crossSource";

import {
  DEFAULT_PIPELINE_CONFIG,
  type EnrichmentInput,
  type EnrichmentOutput,
  type EnrichmentReport,
  type VisionResult,
  type SourceSearchResult,
  type ExtractedData,
  type Gate1Result,
  type Gate2Result,
  type Gate3Result,
  type Gate4Result,
  type AggregatedData,
  type ConfidenceLevel,
  type PipelineConfig,
} from "./types";

// ============================================
// MAIN PIPELINE FUNCTION
// ============================================

/**
 * Run the full enrichment pipeline for a product
 */
export async function runEnrichmentPipeline(
  input: EnrichmentInput
): Promise<EnrichmentOutput> {
  const startTime = Date.now();
  const config: PipelineConfig = {
    ...DEFAULT_PIPELINE_CONFIG,
    ...input.config,
  };

  const adaptations: string[] = [];

  logger.info({ module: 'Pipeline', productId: input.productId }, 'Starting enrichment');

  try {
    // ============================================
    // 1. FETCH PRODUCT
    // ============================================
    const product = await storage.getProductById(input.productId);
    if (!product) {
      return {
        success: false,
        productId: input.productId,
        report: createEmptyReport(input.productId, "Unknown"),
        error: "Product not found",
      };
    }

    logger.info({ module: 'Pipeline', productName: product.name }, 'Processing product');

    // ============================================
    // 2. VISION ANALYSIS (Step 1)
    // ============================================
    let visionResult: VisionResult;

    try {
      const analysisResult = await visionAnalysisService.analyzeProductImage(
        product,
        "system", // Use system user for background processing
        input.forceRefresh
      );

      if (analysisResult.success) {
        visionResult = {
          category: analysisResult.analysis.category,
          subcategory: analysisResult.analysis.subcategory,
          materials: analysisResult.analysis.materials,
          colors: analysisResult.analysis.colors,
          style: analysisResult.analysis.style,
          usageContext: analysisResult.analysis.usageContext,
          targetDemographic: analysisResult.analysis.targetDemographic,
          confidence: analysisResult.analysis.confidence,
          detectedText: analysisResult.analysis.detectedText
            ? [analysisResult.analysis.detectedText]
            : [],
        };
      } else {
        // Vision failed - use minimal data
        visionResult = createMinimalVisionResult(product.name);
        adaptations.push("Vision analysis failed - using minimal data");
      }
    } catch (err) {
      logger.error({ module: 'Pipeline', err }, 'Vision analysis error');
      visionResult = createMinimalVisionResult(product.name);
      adaptations.push("Vision analysis error - using minimal data");
    }

    logger.info({ module: 'Pipeline', category: visionResult.category, subcategory: visionResult.subcategory }, 'Vision analysis complete');

    // ============================================
    // 3. SOURCE DISCOVERY (Step 2)
    // ============================================
    let sources: SourceSearchResult[];

    try {
      sources = await discoverSources(product.name, visionResult, config);
      logger.info({ module: 'Pipeline', sourceCount: sources.length }, 'Discovered sources');

      // Fetch full content for each source
      sources = await fetchSourceContentsBatch(sources);
    } catch (err) {
      logger.error({ module: 'Pipeline', err }, 'Source discovery error');
      sources = [];
      adaptations.push("Source discovery failed - using vision-only data");
    }

    // ============================================
    // 4. GATE 1: SOURCE MATCH VERIFICATION
    // ============================================
    let gate1Results: Gate1Result[] = [];
    let verifiedSources: SourceSearchResult[] = [];

    if (sources.length > 0) {
      try {
        gate1Results = await verifySourcesBatch(
          visionResult,
          sources,
          product.cloudinaryUrl,
          config
        );

        verifiedSources = getPassedSources(sources, gate1Results);
        logger.info({ module: 'Pipeline', verified: verifiedSources.length, total: sources.length }, 'Gate 1 verification complete');

        if (verifiedSources.length === 0) {
          adaptations.push("No sources passed Gate 1 - using vision-only data");
        } else if (verifiedSources.length < sources.length) {
          adaptations.push(`${sources.length - verifiedSources.length} sources failed Gate 1`);
        }
      } catch (err) {
        logger.error({ module: 'Pipeline', err }, 'Gate 1 error');
        adaptations.push("Gate 1 error - using vision-only data");
      }
    }

    // ============================================
    // 5. DATA EXTRACTION (Step 3)
    // ============================================
    let extractions: ExtractedData[] = [];

    if (verifiedSources.length > 0) {
      try {
        extractions = await extractFromSourcesBatch(verifiedSources, product.name);
        logger.info({ module: 'Pipeline', extractionCount: extractions.length }, 'Extracted data from sources');
      } catch (err) {
        logger.error({ module: 'Pipeline', err }, 'Extraction error');
        adaptations.push("Data extraction failed - using vision-only data");
      }
    }

    // ============================================
    // 6. GATE 2: EXTRACTION VERIFICATION
    // ============================================
    let gate2Results: Gate2Result[] = [];

    if (extractions.length > 0) {
      try {
        gate2Results = await verifyExtractionsBatch(
          extractions.map((extracted, i) => ({
            source: verifiedSources[i],
            extracted,
          })),
          config
        );

        // Filter to only verified extractions
        const verifiedExtractions: ExtractedData[] = [];
        for (let i = 0; i < extractions.length; i++) {
          if (gate2Results[i].passed) {
            verifiedExtractions.push(extractions[i]);
          } else {
            // Use only verified fields
            verifiedExtractions.push(
              getVerifiedFields(extractions[i], gate2Results[i])
            );
          }
        }
        extractions = verifiedExtractions;

        const passedCount = gate2Results.filter(r => r.passed).length;
        logger.info({ module: 'Pipeline', passed: passedCount, total: gate2Results.length }, 'Gate 2 verification complete');

        if (passedCount < gate2Results.length) {
          adaptations.push("Some extractions had unverified fields - using only verified data");
        }
      } catch (err) {
        logger.error({ module: 'Pipeline', err }, 'Gate 2 error');
        adaptations.push("Gate 2 error - using unverified extractions");
      }
    }

    // ============================================
    // 7. AGGREGATION (Step 4)
    // ============================================
    let aggregated: AggregatedData;

    if (extractions.length > 0) {
      // Build trust map from sources
      const trustMap = new Map<string, number>();
      for (const source of verifiedSources) {
        trustMap.set(source.url, source.trustLevel);
      }

      aggregated = aggregateExtractions(extractions, trustMap);
      logger.info({ module: 'Pipeline', productName: aggregated.productName }, 'Aggregation complete');
    } else {
      // Fall back to vision-only aggregation
      aggregated = createVisionOnlyAggregation(visionResult, product.name);
      adaptations.push("Using vision-only aggregation (no external sources)");
    }

    // ============================================
    // 8. GATE 4: CROSS-SOURCE TRUTH VERIFICATION
    // ============================================
    let gate4Result: Gate4Result = {
      passed: true,
      conflicts: [],
      truthChecks: [],
      overallVerdict: "ALL_VERIFIED",
    };

    if (extractions.length > 1) {
      try {
        gate4Result = await verifyCrossSourceTruth(extractions, aggregated);
        logger.info({ module: 'Pipeline', verdict: gate4Result.overallVerdict }, 'Gate 4 verification complete');

        // Handle conflicts
        if (gate4Result.conflicts.length > 0) {
          const { resolved, unresolved } = resolveConflicts(
            gate4Result.conflicts,
            extractions
          );

          // Apply resolved values
          for (const [field, value] of Object.entries(resolved)) {
            if (field.startsWith("specifications.")) {
              const specKey = field.replace("specifications.", "");
              aggregated.specifications[specKey] = value;
            } else if (field === "productName") {
              aggregated.productName = value;
            } else if (field === "description") {
              aggregated.description = value;
            }
          }

          if (unresolved.length > 0) {
            adaptations.push(`${unresolved.length} field conflicts auto-resolved using highest-trust source`);
          }
        }

        // Handle contradicted claims
        const contradictedCount = gate4Result.truthChecks.filter(
          t => t.verdict === "CONTRADICTED"
        ).length;

        if (contradictedCount > 0) {
          aggregated.description = filterContradictedClaims(
            aggregated.description,
            gate4Result.truthChecks
          );
          adaptations.push(`${contradictedCount} contradicted claims removed from description`);
        }
      } catch (err) {
        logger.error({ module: 'Pipeline', err }, 'Gate 4 error');
        adaptations.push("Gate 4 error - using aggregated data as-is");
      }
    }

    // ============================================
    // 9. PREPARE WRITE PAYLOAD
    // ============================================
    const features = extractFeatures(aggregated.specifications, aggregated.description);
    const benefits = extractBenefits(aggregated.description);
    const tags = extractTags(aggregated.specifications, aggregated.description, aggregated.productName);

    const writePayload = buildWritePayload(
      input.productId,
      aggregated.description,
      aggregated.specifications,
      features,
      benefits,
      tags,
      aggregated.sources
    );

    // ============================================
    // 10. GATE 3: DATABASE WRITE VERIFICATION
    // ============================================
    let gate3Result: Gate3Result;

    try {
      gate3Result = await verifyDatabaseWrite(writePayload, config);
      logger.info({ module: 'Pipeline', passed: gate3Result.passed }, 'Gate 3 database write verification');

      if (!gate3Result.passed) {
        adaptations.push(`Database write had ${gate3Result.discrepancies.length} discrepancies after ${gate3Result.retryCount} retries`);
      }
    } catch (err) {
      logger.error({ module: 'Pipeline', err }, 'Gate 3 error');
      gate3Result = {
        passed: false,
        productId: input.productId,
        discrepancies: [
          {
            field: "_error",
            intended: "write data",
            actual: err instanceof Error ? err.message : String(err),
            issue: "CORRUPTED",
          },
        ],
        retryCount: 0,
      };
      adaptations.push("Database write failed");
    }

    // ============================================
    // 11. CALCULATE FINAL CONFIDENCE
    // ============================================
    const overallConfidence = calculateOverallConfidence(
      visionResult,
      gate1Results,
      gate2Results,
      gate4Result,
      extractions.length
    );

    // ============================================
    // 12. BUILD REPORT
    // ============================================
    const report: EnrichmentReport = {
      productId: input.productId,
      productName: product.name,
      timestamp: new Date(),
      sources: verifiedSources.map(s => ({
        url: s.url,
        sourceType: s.sourceType,
        trustLevel: s.trustLevel,
      })),
      gates: {
        gate1: gate1Results,
        gate2: gate2Results,
        gate3: gate3Result,
        gate4: gate4Result,
      },
      dataWritten: {
        description: aggregated.description,
        specifications: aggregated.specifications,
        scenariosCreated: 0, // Future: create scenarios
        relationshipsCreated: 0, // Future: create relationships
      },
      overallConfidence,
      allGatesPassed:
        gate1Results.every(r => r.passed) &&
        gate2Results.every(r => r.passed) &&
        gate3Result.passed &&
        gate4Result.passed,
      adaptations,
    };

    const duration = Date.now() - startTime;
    logger.info({ module: 'Pipeline', durationMs: duration, confidence: overallConfidence }, 'Pipeline completed');

    return {
      success: gate3Result.passed,
      productId: input.productId,
      report,
    };
  } catch (err) {
    logger.error({ module: 'Pipeline', err }, 'Fatal error');

    return {
      success: false,
      productId: input.productId,
      report: createEmptyReport(input.productId, "Unknown"),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================
// BATCH PROCESSING
// ============================================

/**
 * Run enrichment for multiple products
 */
export async function runEnrichmentBatch(
  productIds: string[],
  config?: Partial<PipelineConfig>,
  onProgress?: (completed: number, total: number, current: string) => void
): Promise<Map<string, EnrichmentOutput>> {
  const results = new Map<string, EnrichmentOutput>();

  for (let i = 0; i < productIds.length; i++) {
    const productId = productIds[i];

    if (onProgress) {
      onProgress(i, productIds.length, productId);
    }

    try {
      const result = await runEnrichmentPipeline({
        productId,
        config,
      });
      results.set(productId, result);
    } catch (err) {
      logger.error({ module: 'Pipeline', productId, err }, 'Batch error');
      results.set(productId, {
        success: false,
        productId,
        report: createEmptyReport(productId, "Unknown"),
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Small delay between products to avoid rate limiting
    await delay(1000);
  }

  return results;
}

/**
 * Run enrichment for all products needing enrichment
 */
export async function runEnrichmentForPendingProducts(
  config?: Partial<PipelineConfig>,
  onProgress?: (completed: number, total: number, current: string) => void
): Promise<Map<string, EnrichmentOutput>> {
  // Get all products
  const allProducts = await storage.getProducts();

  // Filter to those needing enrichment
  const needsEnrichment = allProducts.filter(p =>
    !p.description ||
    p.description.length < 20 ||
    p.enrichmentStatus === "pending" ||
    !p.enrichmentStatus
  );

  logger.info({ module: 'Pipeline', count: needsEnrichment.length }, 'Found products needing enrichment');

  if (needsEnrichment.length === 0) {
    return new Map();
  }

  return runEnrichmentBatch(
    needsEnrichment.map(p => p.id),
    config,
    onProgress
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create minimal vision result when analysis fails
 */
function createMinimalVisionResult(_productName: string): VisionResult {
  return {
    category: "unknown",
    subcategory: "unknown",
    materials: [],
    colors: [],
    style: "unknown",
    usageContext: "",
    targetDemographic: "",
    confidence: 0,
    detectedText: [],
  };
}

/**
 * Create aggregation from vision only (no external sources)
 */
function createVisionOnlyAggregation(
  vision: VisionResult,
  productName: string
): AggregatedData {
  const description = vision.usageContext
    ? `${productName} - ${vision.category} ${vision.subcategory}. ${vision.usageContext}.`
    : `${productName} - ${vision.category} ${vision.subcategory}.`;

  const specifications: Record<string, string> = {};
  if (vision.materials.length > 0) {
    specifications.material = vision.materials.join(", ");
  }
  if (vision.colors.length > 0) {
    specifications.color = vision.colors.join(", ");
  }
  if (vision.style !== "unknown") {
    specifications.style = vision.style;
  }

  return {
    productName,
    description,
    specifications,
    sources: [],
    fieldSources: {},
  };
}

/**
 * Create empty report for errors
 */
function createEmptyReport(productId: string, productName: string): EnrichmentReport {
  return {
    productId,
    productName,
    timestamp: new Date(),
    sources: [],
    gates: {
      gate1: [],
      gate2: [],
      gate3: {
        passed: false,
        productId,
        discrepancies: [],
        retryCount: 0,
      },
      gate4: {
        passed: false,
        conflicts: [],
        truthChecks: [],
        overallVerdict: "CONFLICTS_FOUND",
      },
    },
    dataWritten: {
      description: "",
      specifications: {},
      scenariosCreated: 0,
      relationshipsCreated: 0,
    },
    overallConfidence: "LOW",
    allGatesPassed: false,
    adaptations: [],
  };
}

/**
 * Calculate overall confidence from all gate results
 */
function calculateOverallConfidence(
  vision: VisionResult,
  gate1Results: Gate1Result[],
  gate2Results: Gate2Result[],
  gate4Result: Gate4Result,
  extractionCount: number
): ConfidenceLevel {
  // No external sources - LOW confidence
  if (extractionCount === 0) {
    return vision.confidence >= 70 ? "LOW" : "LOW";
  }

  // Calculate component confidences
  const gate1PassRate = gate1Results.length > 0
    ? gate1Results.filter(r => r.passed).length / gate1Results.length
    : 0;

  const gate2PassRate = gate2Results.length > 0
    ? gate2Results.filter(r => r.passed).length / gate2Results.length
    : 0;

  const gate4Confidence = calculateGate4Confidence(gate4Result);

  // Multiple agreeing sources with all gates passed = HIGH
  if (
    extractionCount >= 3 &&
    gate1PassRate >= 0.8 &&
    gate2PassRate >= 0.8 &&
    gate4Confidence === "HIGH"
  ) {
    return "HIGH";
  }

  // At least 2 sources with most gates passed = MEDIUM
  if (
    extractionCount >= 2 &&
    gate1PassRate >= 0.5 &&
    gate2PassRate >= 0.5 &&
    gate4Confidence !== "LOW"
  ) {
    return "MEDIUM";
  }

  // Single source or many gate failures = LOW
  return "LOW";
}

/**
 * Simple delay utility
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export pipeline module
export const enrichmentPipeline = {
  runEnrichmentPipeline,
  runEnrichmentBatch,
  runEnrichmentForPendingProducts,
};
