/**
 * Seed Script: Ad Scene Template Library
 *
 * Creates 12 curated visual ad scene templates across all categories
 * Run with: npx tsx scripts/seed-templates.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
import { adSceneTemplates } from "../shared/schema";

// Load environment variables
dotenv.config();

// Template data - 12 templates across 5 categories
const templates = [
  // LIFESTYLE (3)
  {
    title: "Modern Living Room Showcase",
    description: "Elegant minimalist living room with natural light, perfect for home products",
    category: "lifestyle",
    promptBlueprint: "Professional interior photograph of {{product}} installed in a modern minimalist living room with large windows, natural light, neutral color palette, Scandinavian furniture, high-end editorial photography, 8k resolution",
    platformHints: ["instagram", "pinterest", "facebook"],
    aspectRatioHints: ["4:5", "1:1"],
    placementHints: { position: "center", scale: "medium" },
    lightingStyle: "natural",
    intent: "showcase",
    environment: "indoor",
    mood: "minimal",
    bestForProductTypes: ["flooring", "furniture", "decor", "lighting"],
    tags: ["modern", "scandinavian", "neutral", "home"],
  },
  {
    title: "Cozy Kitchen Scene",
    description: "Warm kitchen environment with morning light, ideal for appliances and kitchenware",
    category: "lifestyle",
    promptBlueprint: "Warm inviting kitchen scene featuring {{product}} on a marble countertop, morning sunlight streaming through window, fresh herbs and coffee in background, lifestyle photography style, soft shadows",
    platformHints: ["instagram", "pinterest"],
    aspectRatioHints: ["1:1", "4:5"],
    placementHints: { position: "center-left", scale: "medium" },
    lightingStyle: "natural",
    intent: "showcase",
    environment: "indoor",
    mood: "cozy",
    bestForProductTypes: ["appliances", "kitchenware", "countertops", "tile"],
    tags: ["kitchen", "cozy", "morning", "warm"],
  },
  {
    title: "Outdoor Patio Living",
    description: "Relaxing outdoor patio space with greenery, great for outdoor furniture and decor",
    category: "lifestyle",
    promptBlueprint: "Beautiful outdoor patio scene with {{product}} as the focal point, lush green plants surrounding, comfortable outdoor furniture, golden hour lighting, lifestyle magazine quality",
    platformHints: ["instagram", "pinterest", "facebook"],
    aspectRatioHints: ["16:9", "4:5"],
    placementHints: { position: "center", scale: "large" },
    lightingStyle: "golden-hour",
    intent: "showcase",
    environment: "outdoor",
    mood: "relaxed",
    bestForProductTypes: ["outdoor-furniture", "planters", "decking", "pavers"],
    tags: ["outdoor", "patio", "garden", "relaxation"],
  },

  // PROFESSIONAL (3)
  {
    title: "Clean Studio Product Shot",
    description: "Professional studio setup with controlled lighting for crisp product photography",
    category: "professional",
    promptBlueprint: "Professional studio product photography of {{product}}, clean white background, soft box lighting from multiple angles, sharp focus, commercial quality, no shadows, isolated subject",
    platformHints: ["linkedin", "facebook", "instagram"],
    aspectRatioHints: ["1:1", "4:5"],
    placementHints: { position: "center", scale: "large" },
    lightingStyle: "studio",
    intent: "product-focus",
    environment: "studio",
    mood: "professional",
    bestForProductTypes: ["any"],
    tags: ["studio", "clean", "professional", "commercial"],
  },
  {
    title: "Office Environment",
    description: "Modern office space for business and tech products",
    category: "professional",
    promptBlueprint: "Modern corporate office environment featuring {{product}}, sleek glass and steel architecture, professional lighting, minimalist desk setup, business photography style",
    platformHints: ["linkedin", "facebook"],
    aspectRatioHints: ["16:9", "1:1"],
    placementHints: { position: "foreground", scale: "medium" },
    lightingStyle: "studio",
    intent: "showcase",
    environment: "indoor",
    mood: "professional",
    bestForProductTypes: ["furniture", "tech", "office-supplies"],
    tags: ["office", "corporate", "modern", "business"],
  },
  {
    title: "Construction Site Context",
    description: "Active construction environment for building materials and tools",
    category: "professional",
    promptBlueprint: "Active construction site scene with {{product}} being used or installed, professional workers in safety gear, realistic worksite environment, documentary style photography",
    platformHints: ["linkedin", "facebook", "instagram"],
    aspectRatioHints: ["16:9", "4:5"],
    placementHints: { position: "center", scale: "medium" },
    lightingStyle: "natural",
    intent: "installation",
    environment: "worksite",
    mood: "industrial",
    bestForProductTypes: ["building-materials", "tools", "safety-equipment", "flooring"],
    tags: ["construction", "worksite", "installation", "professional"],
  },

  // OUTDOOR (2)
  {
    title: "Backyard Landscape",
    description: "Beautiful backyard with landscaping for outdoor products",
    category: "outdoor",
    promptBlueprint: "Stunning backyard landscape featuring {{product}} as a key element, manicured lawn, mature trees, stone pathways, blue sky with soft clouds, landscape photography",
    platformHints: ["instagram", "pinterest", "facebook"],
    aspectRatioHints: ["16:9", "4:5"],
    placementHints: { position: "center", scale: "large" },
    lightingStyle: "natural",
    intent: "showcase",
    environment: "outdoor",
    mood: "natural",
    bestForProductTypes: ["pavers", "decking", "fencing", "outdoor-furniture", "landscaping"],
    tags: ["backyard", "landscape", "garden", "outdoor"],
  },
  {
    title: "Pool Area Showcase",
    description: "Luxury pool area for outdoor and water-related products",
    category: "outdoor",
    promptBlueprint: "Luxurious pool area featuring {{product}}, crystal clear blue water, modern pool deck, palm trees, resort-style atmosphere, architectural photography",
    platformHints: ["instagram", "pinterest"],
    aspectRatioHints: ["16:9", "1:1"],
    placementHints: { position: "foreground", scale: "medium" },
    lightingStyle: "natural",
    intent: "showcase",
    environment: "outdoor",
    mood: "luxury",
    bestForProductTypes: ["pool-tiles", "decking", "outdoor-furniture", "stone"],
    tags: ["pool", "luxury", "resort", "outdoor"],
  },

  // LUXURY (2)
  {
    title: "High-End Showroom",
    description: "Upscale showroom environment for premium products",
    category: "luxury",
    promptBlueprint: "Elegant high-end showroom displaying {{product}}, marble floors, designer lighting fixtures, minimalist luxury aesthetic, dramatic spotlight, architectural digest quality",
    platformHints: ["instagram", "linkedin", "pinterest"],
    aspectRatioHints: ["4:5", "1:1"],
    placementHints: { position: "center", scale: "large" },
    lightingStyle: "dramatic",
    intent: "showcase",
    environment: "indoor",
    mood: "luxury",
    bestForProductTypes: ["premium-materials", "designer-items", "high-end-finishes"],
    tags: ["luxury", "showroom", "premium", "elegant"],
  },
  {
    title: "Luxury Bathroom",
    description: "Spa-like bathroom for premium fixtures and finishes",
    category: "luxury",
    promptBlueprint: "Luxurious spa-like bathroom featuring {{product}}, freestanding bathtub, marble surfaces, warm ambient lighting, fresh white towels, five-star hotel quality, interior design photography",
    platformHints: ["instagram", "pinterest"],
    aspectRatioHints: ["4:5", "1:1"],
    placementHints: { position: "center", scale: "medium" },
    lightingStyle: "soft",
    intent: "showcase",
    environment: "indoor",
    mood: "luxury",
    bestForProductTypes: ["tile", "fixtures", "vanity", "bathroom-accessories"],
    tags: ["bathroom", "spa", "luxury", "marble"],
  },

  // SEASONAL (2)
  {
    title: "Holiday Home Setting",
    description: "Festive home environment for seasonal promotions",
    category: "seasonal",
    promptBlueprint: "Cozy holiday home setting featuring {{product}}, Christmas decorations, warm fireplace glow, wrapped presents, festive atmosphere, editorial holiday photography",
    platformHints: ["instagram", "facebook", "pinterest"],
    aspectRatioHints: ["4:5", "1:1"],
    placementHints: { position: "center", scale: "medium" },
    lightingStyle: "warm",
    intent: "lifestyle",
    environment: "indoor",
    mood: "festive",
    bestForProductTypes: ["decor", "furniture", "flooring", "lighting"],
    tags: ["holiday", "christmas", "festive", "cozy"],
  },
  {
    title: "Spring Renovation",
    description: "Fresh spring home improvement context",
    category: "seasonal",
    promptBlueprint: "Bright spring home renovation scene with {{product}} being freshly installed, open windows with spring flowers visible, light and airy atmosphere, before-after transformation feel",
    platformHints: ["instagram", "facebook", "pinterest"],
    aspectRatioHints: ["16:9", "4:5"],
    placementHints: { position: "center", scale: "large" },
    lightingStyle: "natural",
    intent: "installation",
    environment: "indoor",
    mood: "fresh",
    bestForProductTypes: ["flooring", "paint", "fixtures", "windows"],
    tags: ["spring", "renovation", "fresh", "transformation"],
  },
];

// Placeholder image - NDS logo from Cloudinary
const PLACEHOLDER_PREVIEW = "https://res.cloudinary.com/dq1h66xvf/image/upload/v1735334139/nds-logo_wnlmue.png";
const PLACEHOLDER_PUBLIC_ID = "nds-logo_wnlmue";

async function seedTemplates() {
  console.log("🌱 Starting template seeding...\n");

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  let created = 0;
  let skipped = 0;

  for (const template of templates) {
    try {
      // Check if template with same title exists
      const existing = await db
        .select()
        .from(adSceneTemplates)
        .where(eq(adSceneTemplates.title, template.title))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️  Skipping "${template.title}" - already exists`);
        skipped++;
        continue;
      }

      // Insert template with placeholder image
      await db.insert(adSceneTemplates).values({
        ...template,
        previewImageUrl: PLACEHOLDER_PREVIEW,
        previewPublicId: PLACEHOLDER_PUBLIC_ID,
        isGlobal: true,
      });

      console.log(`✅ Created "${template.title}" (${template.category})`);
      created++;
    } catch (error) {
      console.error(`❌ Failed to create "${template.title}":`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total templates: ${templates.length}`);
  console.log("\n🎉 Seeding complete!");

  await pool.end();
}

// Run the seed
seedTemplates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
