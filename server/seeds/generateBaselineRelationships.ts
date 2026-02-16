/* eslint-disable no-console */
import "dotenv/config";
import { db } from "../db";
import { products, productRelationships, users } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * Generate Baseline Relationships - Phase 1C
 *
 * Creates conservative category-based relationships:
 * - rebar → spacers (BS4449 cover requirement)
 * - mesh → spacers (BS4449 cover requirement)
 * - cut_bent → spacers (processed rebar, same requirement)
 *
 * Usage:
 *   npx tsx server/seeds/generateBaselineRelationships.ts --dry-run --user-id <uuid>
 *   npx tsx server/seeds/generateBaselineRelationships.ts --apply --user-id <uuid>
 *
 * Flags:
 *   --dry-run    Preview only, no DB writes (default)
 *   --apply      Actually write to database
 *   --user-id    REQUIRED - Valid user UUID for FK constraint
 */

// Representative spacer products - most commonly used covers
const SPACER_REPRESENTATIVES = {
  "25mm_cover": "20892a3c-d163-4a35-a893-111769fa2c64",  // Concrete Spacers - 25mm Cover
  "40mm_cover": "08a14358-16af-4f1b-a78f-9d59b5bda41e",  // Concrete Spacers - 40mm Cover
  "50mm_cover": "1a24f20b-fa03-4093-98da-3d7e89f4134d",  // Concrete Spacers - 50mm Cover
  "chair_spacers": "5835728d-c1ed-4b8f-bf7d-cd2cb6bd868d", // Chair Spacers - Heavy Duty
};

// Category rules - conservative, concept-level relationships
// NOTE: Using RECOMMENDS not REQUIRES because specific SKU isn't mandatory
interface CategoryRule {
  sourceCategories: string[];
  targetCategory: string;
  targetProductId: string;
  relationshipType: string;
  isRequired: boolean;
  descriptionText: string;
  reasoning: string;
}

const CATEGORY_RULES: CategoryRule[] = [
  // Rebar needs spacers for cover
  {
    sourceCategories: ["rebar"],
    targetCategory: "spacers",
    targetProductId: SPACER_REPRESENTATIVES["25mm_cover"],
    relationshipType: "pairs_with",  // Use existing type, not inventing new ones
    isRequired: false,
    descriptionText: "Choose appropriate cover spacer per structural drawing (typically 25-50mm). Spacers maintain concrete cover to rebar per BS4449.",
    reasoning: "BS4449 cover requirement - concrete cover to rebar must be maintained",
  },
  // Mesh needs spacers for cover
  {
    sourceCategories: ["mesh"],
    targetCategory: "spacers",
    targetProductId: SPACER_REPRESENTATIVES["chair_spacers"],
    relationshipType: "pairs_with",
    isRequired: false,
    descriptionText: "Choose appropriate cover spacer per structural drawing. Chair spacers position mesh at correct cover depth per BS4449.",
    reasoning: "BS4449 cover requirement - mesh must be positioned at correct cover depth",
  },
  // Cut & bent is processed rebar, same requirement
  {
    sourceCategories: ["cut-bent"],
    targetCategory: "spacers",
    targetProductId: SPACER_REPRESENTATIVES["25mm_cover"],
    relationshipType: "pairs_with",
    isRequired: false,
    descriptionText: "Choose appropriate cover spacer per structural drawing (typically 25-50mm). Spacers maintain concrete cover per BS4449.",
    reasoning: "BS4449 cover requirement - cut & bent rebar requires same cover as straight rebar",
  },
];

interface ProposedRelationship {
  sourceProductId: string;
  sourceProductName: string;
  sourceCategory: string;
  targetProductId: string;
  targetProductName: string;
  relationshipType: string;
  description: string;
  rule: string;
  alreadyExists: boolean;
}

async function parseArgs(): Promise<{ dryRun: boolean; userId: string | null }> {
  const args = process.argv.slice(2);
  let dryRun = true;
  let userId: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--apply") {
      dryRun = false;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--user-id" && args[i + 1]) {
      userId = args[i + 1];
      i++;
    }
  }

  return { dryRun, userId };
}

async function generateBaselineRelationships() {
  console.log("=".repeat(80));
  console.log("  BASELINE RELATIONSHIP GENERATOR - Phase 1C");
  console.log("=".repeat(80));

  const { dryRun, userId } = await parseArgs();

  // Validate userId
  if (!userId) {
    console.error("\nERROR: --user-id is REQUIRED");
    console.log("\nUsage:");
    console.log("  npx tsx server/seeds/generateBaselineRelationships.ts --dry-run --user-id <uuid>");
    console.log("  npx tsx server/seeds/generateBaselineRelationships.ts --apply --user-id <uuid>");
    console.log("\nTo get a valid userId:");
    console.log("  npx tsx -e \"require('dotenv/config'); const {db} = require('./server/db'); const {users} = require('@shared/schema'); db.select({id: users.id, email: users.email}).from(users).limit(5).then(u => console.log(JSON.stringify(u, null, 2)))\"");
    process.exit(1);
  }

  // Verify user exists
  const userExists = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (userExists.length === 0) {
    console.error(`\nERROR: User with ID "${userId}" not found in database`);
    process.exit(1);
  }
  console.log(`\n  User ID: ${userId}`);
  console.log(`  Mode: ${dryRun ? "DRY-RUN (preview only)" : "APPLY (will write to DB)"}`);

  // Verify target products exist
  console.log("\n  Verifying target spacer products...");
  const targetIds = Object.values(SPACER_REPRESENTATIVES);
  const targetProducts = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(inArray(products.id, targetIds));

  if (targetProducts.length !== targetIds.length) {
    console.error("\nERROR: Some target spacer products not found in database");
    console.log("  Expected:", targetIds);
    console.log("  Found:", targetProducts.map(p => p.id));
    process.exit(1);
  }

  const targetProductMap = new Map(targetProducts.map(p => [p.id, p.name]));
  console.log("  All target products verified");

  // Get all source products
  const sourceCategories = [...new Set(CATEGORY_RULES.flatMap(r => r.sourceCategories))];
  console.log(`\n  Source categories: ${sourceCategories.join(", ")}`);

  const sourceProducts = await db
    .select({ id: products.id, name: products.name, category: products.category })
    .from(products)
    .where(inArray(products.category, sourceCategories));

  console.log(`  Found ${sourceProducts.length} source products`);

  // Get existing relationships to check for duplicates
  const existingRelationships = await db
    .select({
      sourceProductId: productRelationships.sourceProductId,
      targetProductId: productRelationships.targetProductId,
    })
    .from(productRelationships);

  const existingSet = new Set(
    existingRelationships.map(r => `${r.sourceProductId}→${r.targetProductId}`)
  );

  // Build proposed relationships
  const proposed: ProposedRelationship[] = [];

  for (const rule of CATEGORY_RULES) {
    for (const sourceProduct of sourceProducts) {
      if (!rule.sourceCategories.includes(sourceProduct.category || "")) {
        continue;
      }

      const key = `${sourceProduct.id}→${rule.targetProductId}`;
      const alreadyExists = existingSet.has(key);

      // Build human-readable description with optional meta suffix
      // Format: "Human description. [meta: source=category_rule, rule=X→Y]"
      const metaSuffix = `[meta: source=category_rule, rule=${sourceProduct.category}→spacers]`;
      const humanReadableDescription = `${rule.descriptionText} ${metaSuffix}`;

      proposed.push({
        sourceProductId: sourceProduct.id,
        sourceProductName: sourceProduct.name,
        sourceCategory: sourceProduct.category || "unknown",
        targetProductId: rule.targetProductId,
        targetProductName: targetProductMap.get(rule.targetProductId) || "Unknown",
        relationshipType: rule.relationshipType,
        description: humanReadableDescription,
        rule: `${sourceProduct.category}→spacers`,
        alreadyExists,
      });
    }
  }

  // Calculate metrics
  const newRelationships = proposed.filter(p => !p.alreadyExists);
  const skippedRelationships = proposed.filter(p => p.alreadyExists);

  // Get unique source products that would have relationships
  const uniqueSourceProducts = new Set(newRelationships.map(p => p.sourceProductId));
  const uniqueSourceProductsExisting = new Set(skippedRelationships.map(p => p.sourceProductId));

  // Get current coverage
  const allProducts = await db.select({ id: products.id }).from(products);
  const totalProducts = allProducts.length;

  // Get products that already have at least 1 relationship
  const productsWithRelationships = new Set<string>();
  for (const r of existingRelationships) {
    productsWithRelationships.add(r.sourceProductId);
    if (r.targetProductId) {
      productsWithRelationships.add(r.targetProductId);
    }
  }

  // Project new coverage
  const productsWithNewRel = new Set([...productsWithRelationships, ...uniqueSourceProducts]);
  // Also add target products
  for (const rel of newRelationships) {
    productsWithNewRel.add(rel.targetProductId);
  }

  console.log("\n" + "=".repeat(80));
  console.log("  DRY-RUN PROJECTION");
  console.log("=".repeat(80));

  console.log(`
  CURRENT STATE:
    Total products:                 ${totalProducts}
    Products with >=1 relationship: ${productsWithRelationships.size} (${((productsWithRelationships.size / totalProducts) * 100).toFixed(1)}%)
    Target: 70% = ${Math.ceil(totalProducts * 0.7)} products

  PROPOSED CHANGES:
    New relationships to create:    ${newRelationships.length}
    Skipped (already exist):        ${skippedRelationships.length}
    Unique source products:         ${uniqueSourceProducts.size}

  PROJECTED AFTER APPLY:
    Products with >=1 relationship: ${productsWithNewRel.size} (${((productsWithNewRel.size / totalProducts) * 100).toFixed(1)}%)
    Gap to 70% target:              ${Math.max(0, Math.ceil(totalProducts * 0.7) - productsWithNewRel.size)} more products needed
`);

  // Show sample of new relationships by category
  console.log("=".repeat(80));
  console.log("  SAMPLE RELATIONSHIPS (first 5 per category)");
  console.log("=".repeat(80));

  const byCategory = new Map<string, ProposedRelationship[]>();
  for (const rel of newRelationships) {
    if (!byCategory.has(rel.sourceCategory)) {
      byCategory.set(rel.sourceCategory, []);
    }
    byCategory.get(rel.sourceCategory)!.push(rel);
  }

  for (const [category, rels] of Array.from(byCategory.entries()).sort()) {
    console.log(`\n  ${category.toUpperCase()} (${rels.length} relationships):`);
    for (const rel of rels.slice(0, 5)) {
      console.log(`    ${rel.sourceProductName.substring(0, 40)}...`);
      console.log(`      -> ${rel.targetProductName}`);
      console.log(`      Type: ${rel.relationshipType}`);
    }
    if (rels.length > 5) {
      console.log(`    ... and ${rels.length - 5} more`);
    }
  }

  // Show target product IDs being used
  console.log("\n" + "=".repeat(80));
  console.log("  TARGET PRODUCT IDs USED");
  console.log("=".repeat(80));
  const usedTargets = new Map<string, number>();
  for (const rel of newRelationships) {
    usedTargets.set(rel.targetProductId, (usedTargets.get(rel.targetProductId) || 0) + 1);
  }
  for (const [targetId, count] of usedTargets.entries()) {
    console.log(`  ${targetProductMap.get(targetId)}`);
    console.log(`    ID: ${targetId}`);
    console.log(`    Used in ${count} relationships`);
  }

  if (dryRun) {
    console.log("\n" + "=".repeat(80));
    console.log("  DRY-RUN COMPLETE - NO CHANGES MADE");
    console.log("=".repeat(80));
    console.log("\nTo apply these changes, run:");
    console.log(`  npx tsx server/seeds/generateBaselineRelationships.ts --apply --user-id ${userId}`);
    return {
      mode: "dry-run",
      proposed: newRelationships.length,
      skipped: skippedRelationships.length,
      projectedCoverage: productsWithNewRel.size,
      projectedPercent: ((productsWithNewRel.size / totalProducts) * 100).toFixed(1),
    };
  }

  // APPLY MODE - Write to database
  console.log("\n" + "=".repeat(80));
  console.log("  APPLYING CHANGES TO DATABASE");
  console.log("=".repeat(80));

  let inserted = 0;
  const errors: string[] = [];

  for (const rel of newRelationships) {
    try {
      await db.insert(productRelationships).values({
        sourceProductId: rel.sourceProductId,
        targetProductId: rel.targetProductId,
        relationshipType: rel.relationshipType,
        description: rel.description,
        userId: userId,
      });
      inserted++;
      if (inserted % 10 === 0) {
        console.log(`  Inserted ${inserted}/${newRelationships.length}...`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${rel.sourceProductName} -> ${rel.targetProductName}: ${errorMsg}`);
    }
  }

  console.log(`\n  Inserted: ${inserted}/${newRelationships.length}`);
  if (errors.length > 0) {
    console.log(`  Errors: ${errors.length}`);
    for (const err of errors.slice(0, 5)) {
      console.log(`    - ${err}`);
    }
    if (errors.length > 5) {
      console.log(`    ... and ${errors.length - 5} more errors`);
    }
  }

  // Verify final coverage
  const finalRelationships = await db.select().from(productRelationships);
  const finalProductsWithRel = new Set<string>();
  for (const r of finalRelationships) {
    finalProductsWithRel.add(r.sourceProductId);
    if (r.targetProductId) {
      finalProductsWithRel.add(r.targetProductId);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("  FINAL STATE");
  console.log("=".repeat(80));
  console.log(`
    Total products:                 ${totalProducts}
    Products with >=1 relationship: ${finalProductsWithRel.size} (${((finalProductsWithRel.size / totalProducts) * 100).toFixed(1)}%)
    Total relationships:            ${finalRelationships.length}
`);

  return {
    mode: "apply",
    inserted,
    errors: errors.length,
    finalCoverage: finalProductsWithRel.size,
    finalPercent: ((finalProductsWithRel.size / totalProducts) * 100).toFixed(1),
  };
}

generateBaselineRelationships()
  .then((result) => {
    console.log("\nResult:", JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
