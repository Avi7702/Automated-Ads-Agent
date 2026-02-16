#!/usr/bin/env npx tsx
/* eslint-disable no-console */
/**
 * Product Enrichment CLI Runner
 *
 * Usage:
 *   npx tsx scripts/runEnrichment.ts                    # Enrich all pending products
 *   npx tsx scripts/runEnrichment.ts --product <id>     # Enrich specific product
 *   npx tsx scripts/runEnrichment.ts --all              # Force re-enrich all products
 *   npx tsx scripts/runEnrichment.ts --dry-run          # Show what would be enriched
 *
 * Environment:
 *   DATABASE_URL        - PostgreSQL connection string
 *   GOOGLE_API_KEY      - Gemini API key for AI operations
 */

import { storage } from "../server/storage";
import {
  runEnrichmentPipeline,
  runEnrichmentForPendingProducts,
  type EnrichmentOutput,
  type ConfidenceLevel,
} from "../server/services/enrichment";

// ============================================
// CLI ARGUMENTS
// ============================================

interface CliArgs {
  productId?: string;
  all: boolean;
  dryRun: boolean;
  verbose: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    all: false,
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--product" || arg === "-p") {
      result.productId = args[++i];
    } else if (arg === "--all" || arg === "-a") {
      result.all = true;
    } else if (arg === "--dry-run" || arg === "-d") {
      result.dryRun = true;
    } else if (arg === "--verbose" || arg === "-v") {
      result.verbose = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
Product Enrichment Pipeline

Usage:
  npx tsx scripts/runEnrichment.ts [options]

Options:
  --product, -p <id>   Enrich a specific product by ID
  --all, -a            Force re-enrich all products (including already enriched)
  --dry-run, -d        Show what would be enriched without making changes
  --verbose, -v        Show detailed progress and gate results
  --help, -h           Show this help message

Examples:
  npx tsx scripts/runEnrichment.ts                    # Enrich pending products
  npx tsx scripts/runEnrichment.ts -p abc123          # Enrich specific product
  npx tsx scripts/runEnrichment.ts --all --dry-run    # Preview all products
`);
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main(): Promise<void> {
  const args = parseArgs();

  console.log("\n🔄 Product Enrichment Pipeline");
  console.log("================================\n");

  // ============================================
  // DRY RUN MODE
  // ============================================
  if (args.dryRun) {
    console.log("📋 DRY RUN MODE - No changes will be made\n");

    const products = await storage.getProducts();
    const needsEnrichment = products.filter(p =>
      args.all ||
      !p.description ||
      p.description.length < 20 ||
      p.enrichmentStatus === "pending" ||
      !p.enrichmentStatus
    );

    console.log(`Found ${needsEnrichment.length} products to enrich:\n`);

    for (const product of needsEnrichment) {
      const status = product.enrichmentStatus || "none";
      const hasDesc = product.description && product.description.length > 20;
      console.log(`  - ${product.name}`);
      console.log(`    ID: ${product.id}`);
      console.log(`    Status: ${status}, Has Description: ${hasDesc ? "Yes" : "No"}`);
      console.log("");
    }

    console.log("\nRun without --dry-run to execute enrichment.\n");
    return;
  }

  // ============================================
  // SINGLE PRODUCT MODE
  // ============================================
  if (args.productId) {
    console.log(`🎯 Enriching single product: ${args.productId}\n`);

    const result = await runEnrichmentPipeline({
      productId: args.productId,
      forceRefresh: true,
    });

    printResult(result, args.verbose);
    return;
  }

  // ============================================
  // BATCH MODE
  // ============================================
  console.log(args.all
    ? "🔄 Re-enriching ALL products...\n"
    : "🔄 Enriching pending products...\n"
  );

  let productIds: string[];

  if (args.all) {
    const products = await storage.getProducts();
    productIds = products.map(p => p.id);
  } else {
    const products = await storage.getProducts();
    productIds = products
      .filter(p =>
        !p.description ||
        p.description.length < 20 ||
        p.enrichmentStatus === "pending" ||
        !p.enrichmentStatus
      )
      .map(p => p.id);
  }

  console.log(`Found ${productIds.length} products to process\n`);

  if (productIds.length === 0) {
    console.log("✅ All products are already enriched!\n");
    return;
  }

  // Process each product
  const results: Map<string, EnrichmentOutput> = new Map();
  const startTime = Date.now();

  for (let i = 0; i < productIds.length; i++) {
    const productId = productIds[i];
    const product = await storage.getProductById(productId);
    const name = product?.name || productId;

    console.log(`[${i + 1}/${productIds.length}] Processing: ${name}`);

    try {
      const result = await runEnrichmentPipeline({
        productId,
        forceRefresh: args.all,
      });

      results.set(productId, result);

      // Print brief result
      const icon = result.success ? "✅" : "❌";
      const conf = result.report.overallConfidence;
      console.log(`  ${icon} ${conf} confidence`);

      if (args.verbose && result.report.adaptations.length > 0) {
        console.log(`  Adaptations: ${result.report.adaptations.join(", ")}`);
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err}`);
    }

    console.log("");

    // Small delay between products
    await delay(500);
  }

  // ============================================
  // SUMMARY
  // ============================================
  const duration = Math.round((Date.now() - startTime) / 1000);
  printSummary(results, duration);
}

// ============================================
// OUTPUT HELPERS
// ============================================

function printResult(result: EnrichmentOutput, verbose: boolean): void {
  console.log("─".repeat(50));

  if (result.success) {
    console.log("✅ ENRICHMENT SUCCESSFUL\n");
  } else {
    console.log("❌ ENRICHMENT FAILED\n");
    if (result.error) {
      console.log(`Error: ${result.error}\n`);
    }
  }

  const report = result.report;

  console.log(`Product: ${report.productName}`);
  console.log(`Confidence: ${report.overallConfidence}`);
  console.log(`Sources Used: ${report.sources.length}`);
  console.log(`All Gates Passed: ${report.allGatesPassed ? "Yes" : "No"}`);

  if (report.adaptations.length > 0) {
    console.log(`\nAdaptations:`);
    for (const adaptation of report.adaptations) {
      console.log(`  • ${adaptation}`);
    }
  }

  if (verbose) {
    console.log("\n📊 Gate Results:");

    // Gate 1
    console.log(`\n  Gate 1 (Source Match):`);
    for (const g of report.gates.gate1) {
      const icon = g.passed ? "✓" : "✗";
      console.log(`    ${icon} ${g.sourceUrl} (${g.confidence}%)`);
    }

    // Gate 2
    console.log(`\n  Gate 2 (Extraction):`);
    for (const g of report.gates.gate2) {
      const icon = g.passed ? "✓" : "✗";
      console.log(`    ${icon} ${g.sourceUrl} (${g.overallAccuracy}% accurate)`);
    }

    // Gate 3
    console.log(`\n  Gate 3 (Database Write):`);
    const g3 = report.gates.gate3;
    console.log(`    ${g3.passed ? "✓" : "✗"} Passed after ${g3.retryCount} retries`);
    if (g3.discrepancies.length > 0) {
      for (const d of g3.discrepancies) {
        console.log(`      - ${d.field}: ${d.issue}`);
      }
    }

    // Gate 4
    console.log(`\n  Gate 4 (Cross-Source Truth):`);
    const g4 = report.gates.gate4;
    console.log(`    Verdict: ${g4.overallVerdict}`);
    console.log(`    Conflicts: ${g4.conflicts.length}`);
    console.log(`    Claims Verified: ${g4.truthChecks.filter(t => t.verdict === "VERIFIED").length}/${g4.truthChecks.length}`);

    // Data Written
    console.log("\n📝 Data Written:");
    console.log(`  Description: ${report.dataWritten.description.substring(0, 100)}...`);
    console.log(`  Specifications: ${Object.keys(report.dataWritten.specifications).length} fields`);
  }

  console.log("\n" + "─".repeat(50) + "\n");
}

function printSummary(
  results: Map<string, EnrichmentOutput>,
  durationSeconds: number
): void {
  console.log("\n" + "═".repeat(50));
  console.log("📊 ENRICHMENT SUMMARY");
  console.log("═".repeat(50) + "\n");

  const total = results.size;
  const successful = Array.from(results.values()).filter(r => r.success).length;
  const failed = total - successful;

  // Count by confidence
  const byConfidence: Record<ConfidenceLevel, number> = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  for (const result of results.values()) {
    if (result.success) {
      byConfidence[result.report.overallConfidence]++;
    }
  }

  console.log(`Total Products: ${total}`);
  console.log(`Successful: ${successful} (${Math.round(successful / total * 100)}%)`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${durationSeconds}s`);
  console.log("");
  console.log("By Confidence:");
  console.log(`  HIGH:   ${byConfidence.HIGH}`);
  console.log(`  MEDIUM: ${byConfidence.MEDIUM}`);
  console.log(`  LOW:    ${byConfidence.LOW}`);
  console.log("");
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// RUN
// ============================================

main()
  .then(() => {
    console.log("✅ Enrichment complete!\n");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Fatal error:", err);
    process.exit(1);
  });
