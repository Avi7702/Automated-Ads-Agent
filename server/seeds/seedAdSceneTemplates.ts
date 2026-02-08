import "dotenv/config";
import { db } from "../db";
import { adSceneTemplates } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Ad Scene Templates Seed for NDS (Next Day Steel)
 *
 * Populates the `ad_scene_templates` table with visual scene templates
 * used by the Studio UI (template cards) and Idea Bank suggestion engine.
 *
 * Categories: product_showcase, installation, worksite, professional, outdoor
 *
 * Preview images: Unsplash (free commercial use, permanent URLs)
 *
 * Usage:
 *   npx tsx server/seeds/seedAdSceneTemplates.ts
 *   OR via runAllSeeds.ts
 */

interface TemplateData {
  title: string;
  description: string;
  previewImageUrl: string;
  previewPublicId: string;
  category: string;
  tags: string[];
  platformHints: string[];
  aspectRatioHints: string[];
  promptBlueprint: string;
  placementHints: { position: string; scale: string };
  lightingStyle: string;
  intent: string;
  environment: string;
  mood: string;
  bestForProductTypes: string[];
  isGlobal: boolean;
}

const AD_SCENE_TEMPLATES: TemplateData[] = [
  // ─── Product Showcase ───────────────────────────
  {
    title: "Hero Product - Clean Studio",
    description: "Large product hero shot on clean white/light background with dramatic studio lighting. Best for single-product ads.",
    previewImageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=1000&fit=crop",
    previewPublicId: "nds/templates/hero-clean-studio",
    category: "product_showcase",
    tags: ["hero", "clean", "studio", "dramatic"],
    platformHints: ["linkedin", "instagram", "facebook"],
    aspectRatioHints: ["1:1", "4:5"],
    promptBlueprint: "Professional studio photograph of {{product}} centered on a clean white background with dramatic directional lighting creating strong shadows. Commercial product photography style.",
    placementHints: { position: "center", scale: "large" },
    lightingStyle: "studio",
    intent: "showcase",
    environment: "studio",
    mood: "professional",
    bestForProductTypes: ["rebar", "mesh", "spacers", "tie-wire", "membranes"],
    isGlobal: true,
  },
  {
    title: "Product Grid - Multi-Item Display",
    description: "Multiple products arranged in a grid or flat-lay composition. Great for showing product range or bundles.",
    previewImageUrl: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=1000&fit=crop",
    previewPublicId: "nds/templates/product-grid-display",
    category: "product_showcase",
    tags: ["grid", "flat-lay", "multi-product", "range"],
    platformHints: ["instagram", "facebook"],
    aspectRatioHints: ["1:1", "16:9"],
    promptBlueprint: "Top-down flat-lay arrangement of {{product}} on a dark industrial surface, neatly organized in a grid pattern. Professional product catalog photography.",
    placementHints: { position: "center", scale: "medium" },
    lightingStyle: "soft",
    intent: "showcase",
    environment: "studio",
    mood: "minimal",
    bestForProductTypes: ["spacers", "tie-wire", "accessories", "fasteners"],
    isGlobal: true,
  },

  // ─── Installation ───────────────────────────────
  {
    title: "Real Installation - Worksite Context",
    description: "Product shown being installed or in use on an active construction site. Authentic, real-world context.",
    previewImageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=1000&fit=crop",
    previewPublicId: "nds/templates/real-installation",
    category: "installation",
    tags: ["installation", "in-use", "authentic", "worksite"],
    platformHints: ["linkedin", "facebook"],
    aspectRatioHints: ["16:9", "1.91:1"],
    promptBlueprint: "{{product}} being installed on an active construction site by professional workers wearing safety gear. Authentic construction photography with natural daylight.",
    placementHints: { position: "center", scale: "medium" },
    lightingStyle: "natural",
    intent: "installation",
    environment: "worksite",
    mood: "industrial",
    bestForProductTypes: ["rebar", "mesh", "membranes", "formwork"],
    isGlobal: true,
  },
  {
    title: "Before / After Split",
    description: "Split-screen showing the construction stage before and after product installation. Great for demonstrating value.",
    previewImageUrl: "https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?w=800&h=1000&fit=crop",
    previewPublicId: "nds/templates/before-after-split",
    category: "installation",
    tags: ["before-after", "split", "comparison", "value"],
    platformHints: ["linkedin", "facebook", "instagram"],
    aspectRatioHints: ["16:9", "1:1"],
    promptBlueprint: "Split-screen comparison: left side shows bare construction foundation, right side shows the same area with {{product}} professionally installed. Clean dividing line down the center.",
    placementHints: { position: "center", scale: "large" },
    lightingStyle: "natural",
    intent: "before-after",
    environment: "worksite",
    mood: "professional",
    bestForProductTypes: ["rebar", "mesh", "membranes", "waterproofing"],
    isGlobal: true,
  },

  // ─── Worksite ───────────────────────────────────
  {
    title: "Active Construction Site - Aerial",
    description: "Drone/aerial view of an active construction site with product visible in context. Shows scale and scope.",
    previewImageUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=1000&fit=crop",
    previewPublicId: "nds/templates/worksite-aerial",
    category: "worksite",
    tags: ["aerial", "drone", "scale", "overview"],
    platformHints: ["linkedin", "facebook"],
    aspectRatioHints: ["16:9", "1.91:1"],
    promptBlueprint: "Aerial drone photograph of an active construction site where {{product}} is visible being used across the foundation. Golden hour lighting, showing the massive scale of the project.",
    placementHints: { position: "center", scale: "small" },
    lightingStyle: "natural",
    intent: "scale-demo",
    environment: "worksite",
    mood: "bold",
    bestForProductTypes: ["rebar", "mesh", "formwork", "structural"],
    isGlobal: true,
  },

  // ─── Professional ───────────────────────────────
  {
    title: "Architect Blueprint Review",
    description: "Product shown alongside architectural blueprints and planning documents. Professional B2B positioning.",
    previewImageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=1000&fit=crop",
    previewPublicId: "nds/templates/architect-blueprint",
    category: "professional",
    tags: ["architect", "blueprint", "planning", "B2B"],
    platformHints: ["linkedin"],
    aspectRatioHints: ["16:9", "1.91:1"],
    promptBlueprint: "{{product}} sample placed on an architect's desk next to blueprints, a hard hat, and a laptop showing 3D building plans. Professional office environment with warm lighting.",
    placementHints: { position: "left", scale: "medium" },
    lightingStyle: "soft",
    intent: "showcase",
    environment: "indoor",
    mood: "professional",
    bestForProductTypes: ["rebar", "mesh", "spacers", "tie-wire"],
    isGlobal: true,
  },

  // ─── Outdoor ────────────────────────────────────
  {
    title: "Outdoor Material Yard",
    description: "Product stacked in an outdoor material yard or warehouse with industrial backdrop. Shows supply chain readiness.",
    previewImageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=1000&fit=crop",
    previewPublicId: "nds/templates/outdoor-material-yard",
    category: "outdoor",
    tags: ["outdoor", "material-yard", "supply", "industrial"],
    platformHints: ["linkedin", "facebook"],
    aspectRatioHints: ["16:9", "4:5"],
    promptBlueprint: "Stacks of {{product}} in an outdoor material storage yard with industrial warehouses in the background. Morning light, showing large quantities ready for delivery.",
    placementHints: { position: "center", scale: "large" },
    lightingStyle: "natural",
    intent: "showcase",
    environment: "outdoor",
    mood: "industrial",
    bestForProductTypes: ["rebar", "mesh", "structural", "beams"],
    isGlobal: true,
  },
  {
    title: "Modern Building Exterior",
    description: "Finished building exterior showing how the product contributes to the final structure. Aspirational outcome shot.",
    previewImageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=1000&fit=crop",
    previewPublicId: "nds/templates/modern-building-exterior",
    category: "outdoor",
    tags: ["building", "exterior", "finished", "aspirational"],
    platformHints: ["linkedin", "instagram"],
    aspectRatioHints: ["4:5", "1:1"],
    promptBlueprint: "Modern commercial building exterior shot from ground level looking up, with a subtle overlay or callout showing {{product}} as a key structural component. Blue sky, dramatic perspective.",
    placementHints: { position: "center", scale: "small" },
    lightingStyle: "natural",
    intent: "showcase",
    environment: "outdoor",
    mood: "bold",
    bestForProductTypes: ["rebar", "mesh", "structural", "formwork"],
    isGlobal: true,
  },
];

export async function seedAdSceneTemplates(): Promise<{ created: number; updated: number; errors: number }> {
  console.log("\nSeeding Ad Scene Templates...\n");

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const tpl of AD_SCENE_TEMPLATES) {
    try {
      // Check if template already exists by title
      const existing = await db
        .select()
        .from(adSceneTemplates)
        .where(eq(adSceneTemplates.title, tpl.title))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db
          .update(adSceneTemplates)
          .set({
            description: tpl.description,
            previewImageUrl: tpl.previewImageUrl,
            previewPublicId: tpl.previewPublicId,
            category: tpl.category,
            tags: tpl.tags,
            platformHints: tpl.platformHints,
            aspectRatioHints: tpl.aspectRatioHints,
            promptBlueprint: tpl.promptBlueprint,
            placementHints: tpl.placementHints,
            lightingStyle: tpl.lightingStyle,
            intent: tpl.intent,
            environment: tpl.environment,
            mood: tpl.mood,
            bestForProductTypes: tpl.bestForProductTypes,
            isGlobal: tpl.isGlobal,
          })
          .where(eq(adSceneTemplates.id, existing[0]!.id));
        console.log(`  Updated: ${tpl.title}`);
        updated++;
      } else {
        // Insert new
        await db.insert(adSceneTemplates).values({
          title: tpl.title,
          description: tpl.description,
          previewImageUrl: tpl.previewImageUrl,
          previewPublicId: tpl.previewPublicId,
          category: tpl.category,
          tags: tpl.tags,
          platformHints: tpl.platformHints,
          aspectRatioHints: tpl.aspectRatioHints,
          promptBlueprint: tpl.promptBlueprint,
          placementHints: tpl.placementHints,
          lightingStyle: tpl.lightingStyle,
          intent: tpl.intent,
          environment: tpl.environment,
          mood: tpl.mood,
          bestForProductTypes: tpl.bestForProductTypes,
          isGlobal: tpl.isGlobal,
        });
        console.log(`  Created: ${tpl.title}`);
        created++;
      }
    } catch (err) {
      console.error(`  Failed: ${tpl.title}`, err);
      errors++;
    }
  }

  console.log(`\nAd Scene Templates: ${created} created, ${updated} updated, ${errors} errors`);
  return { created, updated, errors };
}

// CLI execution
if (process.argv[1]?.includes("seedAdSceneTemplates")) {
  seedAdSceneTemplates()
    .then(() => {
      console.log("Done!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
