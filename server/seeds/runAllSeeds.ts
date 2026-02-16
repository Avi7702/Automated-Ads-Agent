/* eslint-disable no-console */
import "dotenv/config";
import { seedBrandProfile } from "./seedBrandProfile";
import { seedProducts, seedProductsFromSampleData, seedProductsFromCloudinary } from "./seedProducts";
import { seedInstallationScenarios } from "./seedInstallationScenarios";
import { seedProductRelationships } from "./seedRelationships";
import { seedBrandImages, seedBrandImagesFromSampleData, seedBrandImagesFromCloudinary } from "./seedBrandImages";
import { seedPerformingTemplates } from "./seedTemplates";
import { seedAdSceneTemplates } from "./seedAdSceneTemplates";

/**
 * Master Seed Script for NDS (Next Day Steel)
 *
 * Runs all seed scripts in the correct order to populate the entire knowledge base.
 *
 * Order matters:
 * 1. Brand Profile - Establishes brand context (already done, but included for completeness)
 * 2. Products - Foundation for everything else
 * 3. Installation Scenarios - References products
 * 4. Product Relationships - References products
 * 5. Brand Images - May reference products
 * 6. Performing Templates - Independent, can run any time
 *
 * Usage:
 *   npx tsx server/seeds/runAllSeeds.ts
 *   OR
 *   POST /api/admin/seed-all
 *
 * Options:
 *   --sample-only       Only use sample data, skip Cloudinary import
 *   --cloudinary-only   Only import from Cloudinary, skip sample data
 *   --skip-products     Skip product seeding
 *   --skip-scenarios    Skip installation scenarios
 *   --skip-relationships Skip product relationships
 *   --skip-images       Skip brand images
 *   --skip-templates    Skip performing templates
 *   --skip-ad-scenes    Skip ad scene templates
 */

interface SeedOptions {
  sampleOnly?: boolean;
  cloudinaryOnly?: boolean;
  skipProducts?: boolean;
  skipScenarios?: boolean;
  skipRelationships?: boolean;
  skipImages?: boolean;
  skipTemplates?: boolean;
  skipBrandProfile?: boolean;
  skipAdSceneTemplates?: boolean;
}

interface SeedResults {
  brandProfile?: { success: boolean; error?: string };
  products?: { created: number; updated: number; errors: number; skipped?: number };
  scenarios?: { created: number; updated: number; errors: number };
  relationships?: { created: number; skipped: number; errors: number };
  brandImages?: { created: number; updated: number; errors: number; skipped?: number };
  templates?: { created: number; updated: number; errors: number };
  adSceneTemplates?: { created: number; updated: number; errors: number };
  totalTime: number;
}

/**
 * Run all seeds in order
 */
export async function runAllSeeds(options: SeedOptions = {}): Promise<SeedResults> {
  const startTime = Date.now();
  const results: SeedResults = { totalTime: 0 };

  console.log("\n" + "═".repeat(60));
  console.log("  NDS KNOWLEDGE BASE SEEDING");
  console.log("  Next Day Steel - Context Maximization System");
  console.log("═".repeat(60) + "\n");

  console.log("📋 Seed Plan:");
  console.log(`   Brand Profile: ${options.skipBrandProfile ? "⏭️  SKIP" : "✅ RUN"}`);
  console.log(`   Products:      ${options.skipProducts ? "⏭️  SKIP" : "✅ RUN"}`);
  console.log(`   Scenarios:     ${options.skipScenarios ? "⏭️  SKIP" : "✅ RUN"}`);
  console.log(`   Relationships: ${options.skipRelationships ? "⏭️  SKIP" : "✅ RUN"}`);
  console.log(`   Brand Images:  ${options.skipImages ? "⏭️  SKIP" : "✅ RUN"}`);
  console.log(`   Templates:     ${options.skipTemplates ? "⏭️  SKIP" : "✅ RUN"}`);
  console.log(`   Ad Scenes:    ${options.skipAdSceneTemplates ? "⏭️  SKIP" : "✅ RUN"}`);
  console.log(`   Data Source:   ${options.sampleOnly ? "SAMPLE ONLY" : options.cloudinaryOnly ? "CLOUDINARY ONLY" : "SAMPLE + CLOUDINARY"}`);
  console.log("\n");

  // 1. Brand Profile (establishes user context)
  if (!options.skipBrandProfile) {
    console.log("\n" + "─".repeat(50));
    console.log("STEP 1/6: Brand Profile");
    console.log("─".repeat(50));
    try {
      await seedBrandProfile();
      results.brandProfile = { success: true };
    } catch (err) {
      console.error("❌ Brand Profile seeding failed:", err);
      results.brandProfile = { success: false, error: String(err) };
    }
  }

  // 2. Products (foundation for everything)
  if (!options.skipProducts) {
    console.log("\n" + "─".repeat(50));
    console.log("STEP 2/6: Products");
    console.log("─".repeat(50));
    try {
      if (options.sampleOnly) {
        results.products = await seedProductsFromSampleData();
      } else if (options.cloudinaryOnly) {
        const cloudinaryResults = await seedProductsFromCloudinary();
        results.products = { ...cloudinaryResults, updated: 0 };
      } else {
        const allResults = await seedProducts();
        results.products = {
          created: allResults.sample.created + allResults.cloudinary.created,
          updated: allResults.sample.updated + (allResults.cloudinary.skipped || 0),
          errors: allResults.sample.errors + allResults.cloudinary.errors,
        };
      }
    } catch (err) {
      console.error("❌ Product seeding failed:", err);
      results.products = { created: 0, updated: 0, errors: 1 };
    }
  }

  // 3. Installation Scenarios (references products)
  if (!options.skipScenarios) {
    console.log("\n" + "─".repeat(50));
    console.log("STEP 3/6: Installation Scenarios");
    console.log("─".repeat(50));
    try {
      results.scenarios = await seedInstallationScenarios();
    } catch (err) {
      console.error("❌ Installation Scenarios seeding failed:", err);
      results.scenarios = { created: 0, updated: 0, errors: 1 };
    }
  }

  // 4. Product Relationships (references products)
  if (!options.skipRelationships) {
    console.log("\n" + "─".repeat(50));
    console.log("STEP 4/6: Product Relationships");
    console.log("─".repeat(50));
    try {
      results.relationships = await seedProductRelationships();
    } catch (err) {
      console.error("❌ Product Relationships seeding failed:", err);
      results.relationships = { created: 0, skipped: 0, errors: 1 };
    }
  }

  // 5. Brand Images
  if (!options.skipImages) {
    console.log("\n" + "─".repeat(50));
    console.log("STEP 5/6: Brand Images");
    console.log("─".repeat(50));
    try {
      if (options.sampleOnly) {
        results.brandImages = await seedBrandImagesFromSampleData();
      } else if (options.cloudinaryOnly) {
        const cloudinaryResults = await seedBrandImagesFromCloudinary();
        results.brandImages = { ...cloudinaryResults, updated: 0 };
      } else {
        const allResults = await seedBrandImages();
        results.brandImages = {
          created: allResults.sample.created + allResults.cloudinary.created,
          updated: allResults.sample.updated,
          errors: allResults.sample.errors + allResults.cloudinary.errors,
        };
      }
    } catch (err) {
      console.error("❌ Brand Images seeding failed:", err);
      results.brandImages = { created: 0, updated: 0, errors: 1 };
    }
  }

  // 6. Performing Templates
  if (!options.skipTemplates) {
    console.log("\n" + "─".repeat(50));
    console.log("STEP 6/6: Performing Ad Templates");
    console.log("─".repeat(50));
    try {
      results.templates = await seedPerformingTemplates();
    } catch (err) {
      console.error("❌ Performing Templates seeding failed:", err);
      results.templates = { created: 0, updated: 0, errors: 1 };
    }
  }

  // 7. Ad Scene Templates (used by Studio template cards + Idea Bank)
  if (!options.skipAdSceneTemplates) {
    console.log("\n" + "─".repeat(50));
    console.log("STEP 7/7: Ad Scene Templates");
    console.log("─".repeat(50));
    try {
      results.adSceneTemplates = await seedAdSceneTemplates();
    } catch (err) {
      console.error("❌ Ad Scene Templates seeding failed:", err);
      results.adSceneTemplates = { created: 0, updated: 0, errors: 1 };
    }
  }

  // Summary
  results.totalTime = Date.now() - startTime;

  console.log("\n" + "═".repeat(60));
  console.log("  SEEDING COMPLETE - SUMMARY");
  console.log("═".repeat(60));

  if (results.brandProfile) {
    console.log(`\n  Brand Profile: ${results.brandProfile.success ? "✅ SUCCESS" : "❌ FAILED"}`);
  }

  if (results.products) {
    console.log(`\n  Products:`);
    console.log(`    Created: ${results.products.created}`);
    console.log(`    Updated: ${results.products.updated}`);
    console.log(`    Errors:  ${results.products.errors}`);
  }

  if (results.scenarios) {
    console.log(`\n  Installation Scenarios:`);
    console.log(`    Created: ${results.scenarios.created}`);
    console.log(`    Updated: ${results.scenarios.updated}`);
    console.log(`    Errors:  ${results.scenarios.errors}`);
  }

  if (results.relationships) {
    console.log(`\n  Product Relationships:`);
    console.log(`    Created: ${results.relationships.created}`);
    console.log(`    Skipped: ${results.relationships.skipped}`);
    console.log(`    Errors:  ${results.relationships.errors}`);
  }

  if (results.brandImages) {
    console.log(`\n  Brand Images:`);
    console.log(`    Created: ${results.brandImages.created}`);
    console.log(`    Updated: ${results.brandImages.updated}`);
    console.log(`    Errors:  ${results.brandImages.errors}`);
  }

  if (results.templates) {
    console.log(`\n  Performing Templates:`);
    console.log(`    Created: ${results.templates.created}`);
    console.log(`    Updated: ${results.templates.updated}`);
    console.log(`    Errors:  ${results.templates.errors}`);
  }

  if (results.adSceneTemplates) {
    console.log(`\n  Ad Scene Templates:`);
    console.log(`    Created: ${results.adSceneTemplates.created}`);
    console.log(`    Updated: ${results.adSceneTemplates.updated}`);
    console.log(`    Errors:  ${results.adSceneTemplates.errors}`);
  }

  console.log(`\n  Total Time: ${(results.totalTime / 1000).toFixed(2)}s`);
  console.log("\n" + "═".repeat(60) + "\n");

  return results;
}

// CLI execution
if (process.argv[1]?.includes("runAllSeeds")) {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    sampleOnly: args.includes("--sample-only"),
    cloudinaryOnly: args.includes("--cloudinary-only"),
    skipProducts: args.includes("--skip-products"),
    skipScenarios: args.includes("--skip-scenarios"),
    skipRelationships: args.includes("--skip-relationships"),
    skipImages: args.includes("--skip-images"),
    skipTemplates: args.includes("--skip-templates"),
    skipBrandProfile: args.includes("--skip-brand-profile"),
    skipAdSceneTemplates: args.includes("--skip-ad-scenes"),
  };

  runAllSeeds(options)
    .then(() => {
      console.log("✅ All seeding complete!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}
