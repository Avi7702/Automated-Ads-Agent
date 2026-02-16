/* eslint-disable no-console */
import "dotenv/config";
import { db } from "../db";
import {
  products,
  productRelationships,
  installationScenarios,
  brandImages,
  productAnalyses,
} from "@shared/schema";
import { eq, sql, or, isNotNull } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

/**
 * Coverage Dashboard - Phase 1A
 *
 * Rerunnable script that outputs:
 * 1. CSV file with per-product coverage data
 * 2. Terminal summary table with key metrics
 * 3. Post-delete safety audit info
 *
 * Metrics tracked:
 * - % products with ≥1 relationship (not raw counts)
 * - % products with ≥1 usable scenario (not raw counts)
 */

interface ProductCoverage {
  productId: string;
  name: string;
  category: string;
  enrichmentStatus: string;
  hasDescription: boolean;
  hasFeatures: boolean;
  hasBenefits: boolean;
  hasSpecs: boolean;
  hasTags: boolean;
  hasSku: boolean;
  // Relationships - separate columns for clarity
  relationshipsAsSourceCount: number;   // Where product is source
  relationshipsAsTargetCount: number;   // Where product is target
  relationshipsAnyCount: number;        // Source OR target (for summary)
  // Scenarios - separate columns for clarity
  scenariosPrimaryCount: number;        // Where product is primary
  scenariosSecondaryCount: number;      // Where product is in secondaryProductIds
  scenariosAnyCount: number;            // Primary OR secondary (for summary)
  scenariosActiveCount: number;         // Only isActive=true (in RAG)
  scenariosInactiveCount: number;       // isActive=false drafts (NOT in RAG)
  brandImagesCount: number;
  hasProductAnalysis: boolean;
  lastVerifiedAt: string | null;
  createdAt: string;
}

async function runCoverageDashboard() {
  console.log("═".repeat(80));
  console.log("  COVERAGE DASHBOARD - Phase 1A");
  console.log("  Single source of truth for 'what's missing'");
  console.log("═".repeat(80));

  // ========================================
  // 1. FETCH ALL DATA
  // ========================================

  const allProducts = await db.select().from(products);
  const allRelationships = await db.select().from(productRelationships);
  const allScenarios = await db.select().from(installationScenarios);
  const allBrandImages = await db.select().from(brandImages);

  // Check if productAnalyses table exists and has data
  let allAnalyses: { productId: string }[] = [];
  try {
    allAnalyses = await db
      .select({ productId: productAnalyses.productId })
      .from(productAnalyses);
  } catch {
    // Table may not exist or be empty
  }

  // ========================================
  // 2. BUILD LOOKUP MAPS
  // ========================================

  // Products with at least 1 relationship (as source OR target)
  const productsWithRelationships = new Set<string>();
  const productsWithRelAsSource = new Set<string>();
  const productsWithRelAsTarget = new Set<string>();
  for (const rel of allRelationships) {
    productsWithRelationships.add(rel.sourceProductId);
    productsWithRelAsSource.add(rel.sourceProductId);
    if (rel.targetProductId) {
      productsWithRelationships.add(rel.targetProductId);
      productsWithRelAsTarget.add(rel.targetProductId);
    }
  }

  // Products with at least 1 scenario (primary OR secondary)
  const productsWithScenarios = new Set<string>();
  const productsWithScenarioAsPrimary = new Set<string>();
  const productsWithScenarioAsSecondary = new Set<string>();
  for (const scenario of allScenarios) {
    if (scenario.primaryProductId) {
      productsWithScenarios.add(scenario.primaryProductId);
      productsWithScenarioAsPrimary.add(scenario.primaryProductId);
    }
    // Check secondaryProductIds if it exists
    const secondaryIds = scenario.secondaryProductIds as string[] | null;
    if (secondaryIds && Array.isArray(secondaryIds)) {
      for (const id of secondaryIds) {
        productsWithScenarios.add(id);
        productsWithScenarioAsSecondary.add(id);
      }
    }
  }

  // Count relationships per product (source only)
  const relationshipsAsSourcePerProduct = new Map<string, number>();
  const relationshipsAsTargetPerProduct = new Map<string, number>();
  for (const rel of allRelationships) {
    relationshipsAsSourcePerProduct.set(
      rel.sourceProductId,
      (relationshipsAsSourcePerProduct.get(rel.sourceProductId) || 0) + 1
    );
    if (rel.targetProductId) {
      relationshipsAsTargetPerProduct.set(
        rel.targetProductId,
        (relationshipsAsTargetPerProduct.get(rel.targetProductId) || 0) + 1
      );
    }
  }

  // Count scenarios per product (primary and secondary separately)
  const scenariosPrimaryPerProduct = new Map<string, number>();
  const scenariosSecondaryPerProduct = new Map<string, number>();
  const scenariosActivePerProduct = new Map<string, number>();
  const scenariosInactivePerProduct = new Map<string, number>();

  for (const scenario of allScenarios) {
    const isActive = scenario.isActive !== false; // Default true if not set

    if (scenario.primaryProductId) {
      scenariosPrimaryPerProduct.set(
        scenario.primaryProductId,
        (scenariosPrimaryPerProduct.get(scenario.primaryProductId) || 0) + 1
      );
      // Track active/inactive for primary product
      if (isActive) {
        scenariosActivePerProduct.set(
          scenario.primaryProductId,
          (scenariosActivePerProduct.get(scenario.primaryProductId) || 0) + 1
        );
      } else {
        scenariosInactivePerProduct.set(
          scenario.primaryProductId,
          (scenariosInactivePerProduct.get(scenario.primaryProductId) || 0) + 1
        );
      }
    }

    const secondaryIds = scenario.secondaryProductIds as string[] | null;
    if (secondaryIds && Array.isArray(secondaryIds)) {
      for (const id of secondaryIds) {
        scenariosSecondaryPerProduct.set(
          id,
          (scenariosSecondaryPerProduct.get(id) || 0) + 1
        );
        // Track active/inactive for secondary products too
        if (isActive) {
          scenariosActivePerProduct.set(
            id,
            (scenariosActivePerProduct.get(id) || 0) + 1
          );
        } else {
          scenariosInactivePerProduct.set(
            id,
            (scenariosInactivePerProduct.get(id) || 0) + 1
          );
        }
      }
    }
  }

  // Brand images per product (by category match or explicit link)
  const brandImagesPerProduct = new Map<string, number>();
  for (const product of allProducts) {
    const categoryImages = allBrandImages.filter(
      (img) =>
        img.category === product.category ||
        (img.tags && img.tags.includes(product.category || ""))
    );
    brandImagesPerProduct.set(product.id, categoryImages.length);
  }

  // Product analyses
  const productsWithAnalysis = new Set(allAnalyses.map((a) => a.productId));

  // ========================================
  // 3. BUILD COVERAGE DATA
  // ========================================

  const coverageData: ProductCoverage[] = [];

  for (const product of allProducts) {
    const relAsSource = relationshipsAsSourcePerProduct.get(product.id) || 0;
    const relAsTarget = relationshipsAsTargetPerProduct.get(product.id) || 0;
    const scenPrimary = scenariosPrimaryPerProduct.get(product.id) || 0;
    const scenSecondary = scenariosSecondaryPerProduct.get(product.id) || 0;
    const scenActive = scenariosActivePerProduct.get(product.id) || 0;
    const scenInactive = scenariosInactivePerProduct.get(product.id) || 0;

    const coverage: ProductCoverage = {
      productId: product.id,
      name: product.name,
      category: product.category || "uncategorized",
      enrichmentStatus: product.enrichmentStatus || "pending",
      hasDescription: !!product.description && product.description.length > 10,
      hasFeatures: !!product.features && Object.keys(product.features).length > 0,
      hasBenefits: !!product.benefits && (product.benefits as string[]).length > 0,
      hasSpecs:
        !!product.specifications && Object.keys(product.specifications).length > 0,
      hasTags: !!product.tags && (product.tags as string[]).length > 0,
      hasSku: !!product.sku && product.sku.length > 0,
      // Relationships - separate columns
      relationshipsAsSourceCount: relAsSource,
      relationshipsAsTargetCount: relAsTarget,
      relationshipsAnyCount: relAsSource + relAsTarget, // Note: may double-count if same product is both source and target
      // Scenarios - separate columns
      scenariosPrimaryCount: scenPrimary,
      scenariosSecondaryCount: scenSecondary,
      scenariosAnyCount: scenPrimary + scenSecondary, // Note: may double-count
      scenariosActiveCount: scenActive,
      scenariosInactiveCount: scenInactive,
      brandImagesCount: brandImagesPerProduct.get(product.id) || 0,
      hasProductAnalysis: productsWithAnalysis.has(product.id),
      lastVerifiedAt: product.enrichmentVerifiedAt
        ? product.enrichmentVerifiedAt.toISOString()
        : null,
      createdAt: product.createdAt ? product.createdAt.toISOString() : "unknown",
    };
    coverageData.push(coverage);
  }

  // ========================================
  // 4. CALCULATE SUMMARY METRICS
  // ========================================

  const totalProducts = allProducts.length;
  const productsWithDesc = coverageData.filter((p) => p.hasDescription).length;
  const productsWithFeatures = coverageData.filter((p) => p.hasFeatures).length;
  const productsWithBenefits = coverageData.filter((p) => p.hasBenefits).length;
  const productsWithSpecs = coverageData.filter((p) => p.hasSpecs).length;
  const productsWithTags = coverageData.filter((p) => p.hasTags).length;
  const productsWithSku = coverageData.filter((p) => p.hasSku).length;
  // Relationship metrics
  const productsWithAtLeast1Rel = productsWithRelationships.size;
  const productsWithRelAsSourceOnly = productsWithRelAsSource.size;
  const productsWithRelAsTargetOnly = productsWithRelAsTarget.size;
  // Scenario metrics
  const productsWithAtLeast1Scenario = productsWithScenarios.size;
  const productsWithScenarioPrimaryOnly = productsWithScenarioAsPrimary.size;
  const productsWithScenarioSecondaryOnly = productsWithScenarioAsSecondary.size;
  // Active vs inactive scenarios
  const totalActiveScenarios = allScenarios.filter(s => s.isActive !== false).length;
  const totalInactiveScenarios = allScenarios.filter(s => s.isActive === false).length;
  const productsWithActiveScenario = coverageData.filter(p => p.scenariosActiveCount > 0).length;
  const productsWithInactiveOnlyScenario = coverageData.filter(
    p => p.scenariosInactiveCount > 0 && p.scenariosActiveCount === 0
  ).length;
  const productsWithAnalysisCount = coverageData.filter(
    (p) => p.hasProductAnalysis
  ).length;

  // By category
  const byCategory = new Map<string, number>();
  for (const product of allProducts) {
    const cat = product.category || "uncategorized";
    byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
  }

  // By enrichment status
  const byStatus = new Map<string, number>();
  for (const product of allProducts) {
    const status = product.enrichmentStatus || "pending";
    byStatus.set(status, (byStatus.get(status) || 0) + 1);
  }

  // ========================================
  // 5. OUTPUT CSV
  // ========================================

  const csvHeader = [
    "productId",
    "name",
    "category",
    "enrichmentStatus",
    "hasDescription",
    "hasFeatures",
    "hasBenefits",
    "hasSpecs",
    "hasTags",
    "hasSku",
    // Relationships - separate columns
    "relationshipsAsSourceCount",
    "relationshipsAsTargetCount",
    "relationshipsAnyCount",
    // Scenarios - separate columns
    "scenariosPrimaryCount",
    "scenariosSecondaryCount",
    "scenariosAnyCount",
    "scenariosActiveCount",
    "scenariosInactiveCount",
    "brandImagesCount",
    "hasProductAnalysis",
    "lastVerifiedAt",
    "createdAt",
  ].join(",");

  const csvRows = coverageData.map((p) =>
    [
      p.productId,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      p.enrichmentStatus,
      p.hasDescription,
      p.hasFeatures,
      p.hasBenefits,
      p.hasSpecs,
      p.hasTags,
      p.hasSku,
      // Relationships
      p.relationshipsAsSourceCount,
      p.relationshipsAsTargetCount,
      p.relationshipsAnyCount,
      // Scenarios
      p.scenariosPrimaryCount,
      p.scenariosSecondaryCount,
      p.scenariosAnyCount,
      p.scenariosActiveCount,
      p.scenariosInactiveCount,
      p.brandImagesCount,
      p.hasProductAnalysis,
      p.lastVerifiedAt || "",
      p.createdAt,
    ].join(",")
  );

  const csvContent = [csvHeader, ...csvRows].join("\n");
  const csvPath = path.join(process.cwd(), "coverage-report.csv");
  fs.writeFileSync(csvPath, csvContent);
  console.log(`\n✓ CSV saved to: ${csvPath}`);

  // ========================================
  // 6. OUTPUT TERMINAL SUMMARY
  // ========================================

  const pct = (n: number) => ((n / totalProducts) * 100).toFixed(1);

  console.log("\n" + "─".repeat(80));
  console.log("SUMMARY METRICS");
  console.log("─".repeat(80));

  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRODUCT COVERAGE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Total Products:                    ${totalProducts.toString().padStart(5)}                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  FIELD COVERAGE                                                              │
│  ─────────────                                                               │
│  With Description:                  ${productsWithDesc.toString().padStart(5)} (${pct(productsWithDesc).padStart(5)}%)                        │
│  With Features:                     ${productsWithFeatures.toString().padStart(5)} (${pct(productsWithFeatures).padStart(5)}%)                        │
│  With Benefits:                     ${productsWithBenefits.toString().padStart(5)} (${pct(productsWithBenefits).padStart(5)}%)                        │
│  With Specifications:               ${productsWithSpecs.toString().padStart(5)} (${pct(productsWithSpecs).padStart(5)}%)                        │
│  With Tags:                         ${productsWithTags.toString().padStart(5)} (${pct(productsWithTags).padStart(5)}%)                        │
│  With SKU:                          ${productsWithSku.toString().padStart(5)} (${pct(productsWithSku).padStart(5)}%)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  RELATIONSHIP COVERAGE (Phase 1 Target: ≥70%)                               │
│  ─────────────────────────────────────────────                              │
│  Products with ≥1 rel (any):        ${productsWithAtLeast1Rel.toString().padStart(5)} (${pct(productsWithAtLeast1Rel).padStart(5)}%)                        │
│    └─ as source:                    ${productsWithRelAsSourceOnly.toString().padStart(5)} (${pct(productsWithRelAsSourceOnly).padStart(5)}%)                        │
│    └─ as target:                    ${productsWithRelAsTargetOnly.toString().padStart(5)} (${pct(productsWithRelAsTargetOnly).padStart(5)}%)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  SCENARIO COVERAGE (Phase 1 Target: ≥50%)                                   │
│  ────────────────────────────────────────                                   │
│  Products with ≥1 scenario (any):   ${productsWithAtLeast1Scenario.toString().padStart(5)} (${pct(productsWithAtLeast1Scenario).padStart(5)}%)                        │
│    └─ as primary:                   ${productsWithScenarioPrimaryOnly.toString().padStart(5)} (${pct(productsWithScenarioPrimaryOnly).padStart(5)}%)                        │
│    └─ as secondary:                 ${productsWithScenarioSecondaryOnly.toString().padStart(5)} (${pct(productsWithScenarioSecondaryOnly).padStart(5)}%)                        │
│  ─────────────────────────────────────────────                              │
│  Products with ACTIVE scenario:     ${productsWithActiveScenario.toString().padStart(5)} (${pct(productsWithActiveScenario).padStart(5)}%)  ← In RAG          │
│  Products with INACTIVE only:       ${productsWithInactiveOnlyScenario.toString().padStart(5)} (${pct(productsWithInactiveOnlyScenario).padStart(5)}%)  ← NOT in RAG      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Products with analysis:            ${productsWithAnalysisCount.toString().padStart(5)} (${pct(productsWithAnalysisCount).padStart(5)}%)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  RAW COUNTS                                                                  │
│  ──────────                                                                  │
│  Total Relationships:               ${allRelationships.length.toString().padStart(5)}                                │
│  Total Scenarios:                   ${allScenarios.length.toString().padStart(5)} (active: ${totalActiveScenarios}, inactive: ${totalInactiveScenarios})    │
│  Total Brand Images:                ${allBrandImages.length.toString().padStart(5)}                                │
└─────────────────────────────────────────────────────────────────────────────┘
`);

  console.log("─".repeat(80));
  console.log("BY CATEGORY");
  console.log("─".repeat(80));
  for (const [cat, count] of Array.from(byCategory.entries()).sort()) {
    console.log(`  ${cat.padEnd(20)} ${count.toString().padStart(5)} products`);
  }

  console.log("\n" + "─".repeat(80));
  console.log("BY ENRICHMENT STATUS");
  console.log("─".repeat(80));
  for (const [status, count] of Array.from(byStatus.entries()).sort()) {
    console.log(`  ${status.padEnd(20)} ${count.toString().padStart(5)} products`);
  }

  // ========================================
  // 7. POST-DELETE SAFETY AUDIT
  // ========================================

  console.log("\n" + "═".repeat(80));
  console.log("POST-DELETE SAFETY AUDIT");
  console.log("═".repeat(80));

  // Check for orphaned relationships (reference non-existent products)
  const productIds = new Set(allProducts.map((p) => p.id));
  const orphanedRelationships = allRelationships.filter(
    (r) =>
      !productIds.has(r.sourceProductId) ||
      (r.targetProductId && !productIds.has(r.targetProductId))
  );

  // Check for orphaned scenarios
  const orphanedScenarios = allScenarios.filter(
    (s) => s.primaryProductId && !productIds.has(s.primaryProductId)
  );

  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│  DELETION AUDIT                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Orphaned relationships:            ${orphanedRelationships.length.toString().padStart(5)} ${orphanedRelationships.length === 0 ? "✓ None" : "⚠ NEEDS FIX"}          │
│  Orphaned scenarios:                ${orphanedScenarios.length.toString().padStart(5)} ${orphanedScenarios.length === 0 ? "✓ None" : "⚠ NEEDS FIX"}          │
│                                                                              │
│  Note: Deletion was DB-only. Cloudinary images were NOT deleted.            │
│  Source image URLs preserved in specifications.sourceImageUrls field.       │
└─────────────────────────────────────────────────────────────────────────────┘
`);

  if (orphanedRelationships.length > 0) {
    console.log("\nOrphaned relationship IDs:");
    for (const r of orphanedRelationships.slice(0, 10)) {
      console.log(`  - ${r.id} (source: ${r.sourceProductId})`);
    }
    if (orphanedRelationships.length > 10) {
      console.log(`  ... and ${orphanedRelationships.length - 10} more`);
    }
  }

  if (orphanedScenarios.length > 0) {
    console.log("\nOrphaned scenario IDs:");
    for (const s of orphanedScenarios.slice(0, 10)) {
      console.log(`  - ${s.id} (primary: ${s.primaryProductId})`);
    }
    if (orphanedScenarios.length > 10) {
      console.log(`  ... and ${orphanedScenarios.length - 10} more`);
    }
  }

  // ========================================
  // 8. GAP ANALYSIS
  // ========================================

  console.log("\n" + "═".repeat(80));
  console.log("GAP ANALYSIS - Products Needing Work");
  console.log("═".repeat(80));

  const noRelationships = coverageData.filter((p) => p.relationshipsAnyCount === 0);
  const noScenarios = coverageData.filter((p) => p.scenariosAnyCount === 0);

  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│  GAPS TO CLOSE                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Products without relationships:    ${noRelationships.length.toString().padStart(5)} (need ${Math.max(0, Math.ceil(totalProducts * 0.7) - productsWithAtLeast1Rel)} more for 70%)    │
│  Products without scenarios:        ${noScenarios.length.toString().padStart(5)} (need ${Math.max(0, Math.ceil(totalProducts * 0.5) - productsWithAtLeast1Scenario)} more for 50%)    │
└─────────────────────────────────────────────────────────────────────────────┘
`);

  // Show sample of products without relationships (by category)
  console.log("\nSample products without relationships (by category):");
  const noRelByCategory = new Map<string, ProductCoverage[]>();
  for (const p of noRelationships) {
    if (!noRelByCategory.has(p.category)) {
      noRelByCategory.set(p.category, []);
    }
    noRelByCategory.get(p.category)!.push(p);
  }

  for (const [cat, prods] of Array.from(noRelByCategory.entries())
    .sort()
    .slice(0, 5)) {
    console.log(`  ${cat}: ${prods.length} products`);
    for (const p of prods.slice(0, 2)) {
      console.log(`    - ${p.name.substring(0, 50)}`);
    }
  }

  console.log("\n" + "═".repeat(80));
  console.log("  DASHBOARD COMPLETE");
  console.log("═".repeat(80));

  return {
    totalProducts,
    productsWithAtLeast1Rel,
    productsWithAtLeast1Scenario,
    orphanedRelationships: orphanedRelationships.length,
    orphanedScenarios: orphanedScenarios.length,
    csvPath,
  };
}

// Run the dashboard
runCoverageDashboard()
  .then((result) => {
    console.log("\nResult:", JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
