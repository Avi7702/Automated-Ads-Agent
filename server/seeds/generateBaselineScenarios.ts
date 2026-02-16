/* eslint-disable no-console */
import "dotenv/config";
import { db } from "../db";
import { products, installationScenarios, users } from "@shared/schema";
import { eq, inArray, and, isNull } from "drizzle-orm";

/**
 * Generate Baseline Installation Scenarios - Phase 1C
 *
 * Creates category-based installation scenarios with isActive=false (drafts).
 * These scenarios provide context for image generation without appearing in
 * RAG queries until manually reviewed and activated.
 *
 * Usage:
 *   npx tsx server/seeds/generateBaselineScenarios.ts --dry-run --user-id <uuid>
 *   npx tsx server/seeds/generateBaselineScenarios.ts --apply --user-id <uuid>
 *
 * Flags:
 *   --dry-run    Preview only, no DB writes (default)
 *   --apply      Actually write to database
 *   --user-id    REQUIRED - Valid user UUID for FK constraint
 */

// Category-based scenario templates
interface ScenarioTemplate {
  categories: string[];
  scenarios: {
    title: string;
    description: string;
    scenarioType: "room_type" | "application" | "before_after";
    installationSteps: string[];
    requiredAccessories: string[];
    roomTypes: string[];
    styleTags: string[];
  }[];
}

const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  // Rebar scenarios
  {
    categories: ["rebar"],
    scenarios: [
      {
        title: "Residential Foundation Reinforcement",
        description: "Standard rebar placement in residential foundation pour. Rebar is positioned in a grid pattern with proper cover spacing, tied at intersections, and supported by spacers to maintain correct positioning during concrete placement.",
        scenarioType: "application",
        installationSteps: [
          "Prepare formwork and verify dimensions",
          "Install spacers at designated intervals",
          "Position longitudinal rebar per structural drawing",
          "Place transverse rebar at specified spacing",
          "Tie intersections with wire ties",
          "Verify cover depth meets BS4449 requirements",
          "Inspect before concrete pour",
        ],
        requiredAccessories: ["spacers", "tie wire", "rebar chairs"],
        roomTypes: ["foundation", "basement", "ground floor"],
        styleTags: ["construction", "structural", "concrete"],
      },
      {
        title: "Commercial Slab Reinforcement",
        description: "Rebar installation in commercial concrete slab for warehouse or industrial flooring. Includes heavy-duty rebar grid with proper spacing for load-bearing applications.",
        scenarioType: "application",
        installationSteps: [
          "Review structural drawings for rebar size and spacing",
          "Mark out grid pattern on sub-base",
          "Position heavy-duty spacers",
          "Lay primary reinforcement bars",
          "Install secondary bars perpendicular",
          "Secure all intersections with tie wire",
          "Final inspection before pour",
        ],
        requiredAccessories: ["heavy-duty spacers", "tie wire", "bar supports"],
        roomTypes: ["warehouse", "industrial", "commercial"],
        styleTags: ["heavy-duty", "industrial", "structural"],
      },
    ],
  },
  // Mesh scenarios
  {
    categories: ["mesh"],
    scenarios: [
      {
        title: "Driveway Concrete Reinforcement",
        description: "Welded wire mesh placement in residential driveway concrete pour. Mesh is positioned mid-depth using chair spacers to provide crack control and distribute loads evenly.",
        scenarioType: "application",
        installationSteps: [
          "Prepare sub-base and formwork",
          "Cut mesh sheets to size, allowing overlap",
          "Position chair spacers at 600mm intervals",
          "Lay mesh sheets on spacers",
          "Overlap adjoining sheets by 200mm minimum",
          "Tie overlaps with wire",
          "Verify cover is 40-50mm from surface",
        ],
        requiredAccessories: ["chair spacers", "tie wire", "mesh cutters"],
        roomTypes: ["driveway", "patio", "garage"],
        styleTags: ["residential", "outdoor", "flatwork"],
      },
      {
        title: "Suspended Slab Reinforcement",
        description: "Structural mesh installation in suspended concrete slab for multi-story construction. Dual-layer mesh with top and bottom reinforcement for bending resistance.",
        scenarioType: "application",
        installationSteps: [
          "Install temporary formwork supports",
          "Position bottom layer spacers",
          "Lay bottom mesh layer",
          "Install top bar supports at correct height",
          "Position top mesh layer",
          "Secure all connections",
          "Check cover to both surfaces",
        ],
        requiredAccessories: ["bottom spacers", "top bar supports", "tie wire"],
        roomTypes: ["multi-story", "suspended floor", "balcony"],
        styleTags: ["structural", "suspended", "dual-layer"],
      },
    ],
  },
  // Cut & bent rebar scenarios
  {
    categories: ["cut-bent"],
    scenarios: [
      {
        title: "Beam Cage Assembly",
        description: "Pre-fabricated cut and bent rebar assembled into beam cage. Stirrups and main bars are assembled on-site or prefabricated for efficient installation.",
        scenarioType: "application",
        installationSteps: [
          "Verify cut and bent schedule matches drawing",
          "Assemble main bars in correct positions",
          "Slide stirrups over main bars",
          "Space stirrups per structural drawing",
          "Tie all intersections securely",
          "Install corner bars and lapping steel",
          "Lift and position complete cage",
        ],
        requiredAccessories: ["tie wire", "spacers", "lifting equipment"],
        roomTypes: ["beam", "column", "structural frame"],
        styleTags: ["prefabricated", "structural", "assembly"],
      },
      {
        title: "Column Reinforcement Installation",
        description: "Vertical cut and bent rebar installation in reinforced concrete column. Includes starter bars, main vertical reinforcement, and links/stirrups.",
        scenarioType: "application",
        installationSteps: [
          "Position starter bars from foundation",
          "Install column formwork spacers",
          "Insert main vertical bars with correct laps",
          "Position links/stirrups at specified spacing",
          "Tie all connections securely",
          "Check vertical alignment",
          "Verify cover all around",
        ],
        requiredAccessories: ["column spacers", "tie wire", "spacer wheels"],
        roomTypes: ["column", "pillar", "structural support"],
        styleTags: ["vertical", "structural", "reinforcement"],
      },
    ],
  },
  // Spacers scenarios
  {
    categories: ["spacers"],
    scenarios: [
      {
        title: "Cover Spacer Installation",
        description: "Concrete cover spacers positioned to maintain correct distance between reinforcement and formwork. Critical for achieving specified cover per BS4449 and corrosion protection.",
        scenarioType: "application",
        installationSteps: [
          "Select spacer size matching required cover",
          "Clean formwork surface",
          "Position spacers at maximum 400mm centers",
          "Clip or tie spacers to reinforcement",
          "Verify spacer contact with formwork",
          "Check cover depth with gauge",
          "Replace any damaged spacers",
        ],
        requiredAccessories: ["depth gauge", "tie wire"],
        roomTypes: ["all concrete applications"],
        styleTags: ["cover", "protection", "quality control"],
      },
    ],
  },
  // Tie wire scenarios
  {
    categories: ["tie-wire"],
    scenarios: [
      {
        title: "Rebar Tying for Structural Connections",
        description: "Tie wire used to secure rebar at intersections and maintain positions during concrete placement. Essential for structural integrity of reinforced concrete.",
        scenarioType: "application",
        installationSteps: [
          "Load tie wire into rebar tying tool or prepare manual ties",
          "Position bars at intersection",
          "Wrap wire around both bars diagonally",
          "Twist wire tight with tool or pliers",
          "Trim excess wire",
          "Verify bar positions are secure",
          "Check critical connections are double-tied",
        ],
        requiredAccessories: ["rebar tying tool", "wire cutters"],
        roomTypes: ["all reinforced concrete"],
        styleTags: ["connection", "securing", "structural"],
      },
    ],
  },
];

interface ProposedScenario {
  primaryProductId: string;
  primaryProductName: string;
  primaryProductCategory: string;
  title: string;
  description: string;
  scenarioType: "room_type" | "application" | "before_after";
  installationSteps: string[];
  requiredAccessories: string[];
  roomTypes: string[];
  styleTags: string[];
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

async function generateBaselineScenarios() {
  console.log("=".repeat(80));
  console.log("  BASELINE SCENARIO GENERATOR - Phase 1C");
  console.log("=".repeat(80));

  const { dryRun, userId } = await parseArgs();

  // Validate userId
  if (!userId) {
    console.error("\nERROR: --user-id is REQUIRED");
    console.log("\nUsage:");
    console.log("  npx tsx server/seeds/generateBaselineScenarios.ts --dry-run --user-id <uuid>");
    console.log("  npx tsx server/seeds/generateBaselineScenarios.ts --apply --user-id <uuid>");
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
  console.log("  isActive: FALSE (scenarios created as drafts)");

  // Get all categories we have templates for
  const templateCategories = [...new Set(SCENARIO_TEMPLATES.flatMap(t => t.categories))];
  console.log(`\n  Template categories: ${templateCategories.join(", ")}`);

  // Get all products in those categories
  const allProducts = await db
    .select({ id: products.id, name: products.name, category: products.category })
    .from(products)
    .where(inArray(products.category, templateCategories));

  console.log(`  Found ${allProducts.length} products in template categories`);

  // Get existing scenarios to check for duplicates
  const existingScenarios = await db
    .select({ primaryProductId: installationScenarios.primaryProductId, title: installationScenarios.title })
    .from(installationScenarios);

  const existingSet = new Set(
    existingScenarios.map(s => `${s.primaryProductId}|${s.title}`)
  );

  // Build proposed scenarios
  const proposed: ProposedScenario[] = [];

  for (const product of allProducts) {
    // Find matching template
    const template = SCENARIO_TEMPLATES.find(t => t.categories.includes(product.category || ""));
    if (!template) continue;

    for (const scenario of template.scenarios) {
      const key = `${product.id}|${scenario.title}`;
      const alreadyExists = existingSet.has(key);

      proposed.push({
        primaryProductId: product.id,
        primaryProductName: product.name,
        primaryProductCategory: product.category || "unknown",
        title: scenario.title,
        description: scenario.description,
        scenarioType: scenario.scenarioType,
        installationSteps: scenario.installationSteps,
        requiredAccessories: scenario.requiredAccessories,
        roomTypes: scenario.roomTypes,
        styleTags: scenario.styleTags,
        alreadyExists,
      });
    }
  }

  // Calculate metrics
  const newScenarios = proposed.filter(p => !p.alreadyExists);
  const skippedScenarios = proposed.filter(p => p.alreadyExists);
  const uniqueProducts = new Set(newScenarios.map(p => p.primaryProductId));

  // Get current coverage
  const totalProducts = (await db.select({ id: products.id }).from(products)).length;

  // Get products that already have at least 1 scenario
  const existingProductsWithScenarios = new Set<string>();
  const allExistingScenarios = await db
    .select({ primaryProductId: installationScenarios.primaryProductId, secondaryProductIds: installationScenarios.secondaryProductIds })
    .from(installationScenarios);

  for (const s of allExistingScenarios) {
    if (s.primaryProductId) existingProductsWithScenarios.add(s.primaryProductId);
    if (s.secondaryProductIds) {
      for (const id of s.secondaryProductIds) {
        existingProductsWithScenarios.add(id);
      }
    }
  }

  // Project new coverage
  const productsWithNewScenario = new Set([...existingProductsWithScenarios, ...uniqueProducts]);

  console.log("\n" + "=".repeat(80));
  console.log("  DRY-RUN PROJECTION");
  console.log("=".repeat(80));

  console.log(`
  CURRENT STATE:
    Total products:               ${totalProducts}
    Products with >=1 scenario:   ${existingProductsWithScenarios.size} (${((existingProductsWithScenarios.size / totalProducts) * 100).toFixed(1)}%)
    Target: 50% = ${Math.ceil(totalProducts * 0.5)} products

  PROPOSED CHANGES:
    New scenarios to create:      ${newScenarios.length}
    Skipped (already exist):      ${skippedScenarios.length}
    Unique products covered:      ${uniqueProducts.size}
    All scenarios will be DRAFT (isActive=false)

  PROJECTED AFTER APPLY:
    Products with >=1 scenario:   ${productsWithNewScenario.size} (${((productsWithNewScenario.size / totalProducts) * 100).toFixed(1)}%)
    Gap to 50% target:            ${Math.max(0, Math.ceil(totalProducts * 0.5) - productsWithNewScenario.size)} more products needed
`);

  // Show sample scenarios by category
  console.log("=".repeat(80));
  console.log("  SAMPLE SCENARIOS (first 3 per category)");
  console.log("=".repeat(80));

  const byCategory = new Map<string, ProposedScenario[]>();
  for (const s of newScenarios) {
    if (!byCategory.has(s.primaryProductCategory)) {
      byCategory.set(s.primaryProductCategory, []);
    }
    byCategory.get(s.primaryProductCategory)!.push(s);
  }

  for (const [category, scenarios] of Array.from(byCategory.entries()).sort()) {
    console.log(`\n  ${category.toUpperCase()} (${scenarios.length} scenarios):`);
    for (const s of scenarios.slice(0, 3)) {
      console.log(`    ${s.primaryProductName.substring(0, 40)}...`);
      console.log(`      Title: ${s.title}`);
      console.log(`      Type: ${s.scenarioType}`);
      console.log(`      Steps: ${s.installationSteps.length}`);
    }
    if (scenarios.length > 3) {
      console.log(`    ... and ${scenarios.length - 3} more`);
    }
  }

  if (dryRun) {
    console.log("\n" + "=".repeat(80));
    console.log("  DRY-RUN COMPLETE - NO CHANGES MADE");
    console.log("=".repeat(80));
    console.log("\nTo apply these changes, run:");
    console.log(`  npx tsx server/seeds/generateBaselineScenarios.ts --apply --user-id ${userId}`);
    return {
      mode: "dry-run",
      proposed: newScenarios.length,
      skipped: skippedScenarios.length,
      projectedCoverage: productsWithNewScenario.size,
      projectedPercent: ((productsWithNewScenario.size / totalProducts) * 100).toFixed(1),
    };
  }

  // APPLY MODE - Write to database
  console.log("\n" + "=".repeat(80));
  console.log("  APPLYING CHANGES TO DATABASE");
  console.log("=".repeat(80));

  let inserted = 0;
  const errors: string[] = [];

  for (const s of newScenarios) {
    try {
      await db.insert(installationScenarios).values({
        userId: userId,
        title: s.title,
        description: s.description,
        scenarioType: s.scenarioType,
        primaryProductId: s.primaryProductId,
        secondaryProductIds: [], // No secondary products in baseline
        installationSteps: s.installationSteps,
        requiredAccessories: s.requiredAccessories,
        roomTypes: s.roomTypes,
        styleTags: s.styleTags,
        isActive: false, // CRITICAL: Draft mode, not in RAG until reviewed
      });
      inserted++;
      if (inserted % 20 === 0) {
        console.log(`  Inserted ${inserted}/${newScenarios.length}...`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${s.primaryProductName} - ${s.title}: ${errorMsg}`);
    }
  }

  console.log(`\n  Inserted: ${inserted}/${newScenarios.length}`);
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
  const finalScenarios = await db.select().from(installationScenarios);
  const finalProductsWithScenario = new Set<string>();
  for (const s of finalScenarios) {
    if (s.primaryProductId) finalProductsWithScenario.add(s.primaryProductId);
    if (s.secondaryProductIds) {
      for (const id of s.secondaryProductIds) {
        finalProductsWithScenario.add(id);
      }
    }
  }

  // Count active vs inactive
  const activeCount = finalScenarios.filter(s => s.isActive).length;
  const inactiveCount = finalScenarios.filter(s => !s.isActive).length;

  console.log("\n" + "=".repeat(80));
  console.log("  FINAL STATE");
  console.log("=".repeat(80));
  console.log(`
    Total products:               ${totalProducts}
    Products with >=1 scenario:   ${finalProductsWithScenario.size} (${((finalProductsWithScenario.size / totalProducts) * 100).toFixed(1)}%)
    Total scenarios:              ${finalScenarios.length}
      Active (in RAG):            ${activeCount}
      Inactive (drafts):          ${inactiveCount}
`);

  return {
    mode: "apply",
    inserted,
    errors: errors.length,
    finalCoverage: finalProductsWithScenario.size,
    finalPercent: ((finalProductsWithScenario.size / totalProducts) * 100).toFixed(1),
    activeScenarios: activeCount,
    inactiveScenarios: inactiveCount,
  };
}

generateBaselineScenarios()
  .then((result) => {
    console.log("\nResult:", JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
