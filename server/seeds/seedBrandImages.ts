/* eslint-disable no-console */
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { db } from "../db";
import { brandImages } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Brand Images Seed for NDS (Next Day Steel)
 *
 * Populates the brand images library with categorized reference assets.
 * These are existing brand photos that AI can reference for context.
 *
 * Categories:
 * - historical_ad: Previous advertising materials
 * - product_hero: Professional product photography
 * - installation: Real installation/site photos
 * - detail: Close-up product details
 * - lifestyle: Products in context/use
 * - comparison: Before/after, size comparisons
 *
 * This answers: "What existing brand assets fit this context?"
 *
 * Usage:
 *   POST /api/admin/seed-brand-images
 */

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Brand Image Categories
const CATEGORIES = {
  HISTORICAL_AD: "historical_ad",
  PRODUCT_HERO: "product_hero",
  INSTALLATION: "installation",
  DETAIL: "detail",
  LIFESTYLE: "lifestyle",
  COMPARISON: "comparison",
} as const;

// Suggested Use Cases
const SUGGESTED_USES = {
  HERO: "hero", // Main image for ads
  DETAIL: "detail", // Supporting detail shots
  COMPARISON: "comparison", // Before/after, size demo
  INSTALLATION: "installation", // How-to context
  SOCIAL_MEDIA: "social_media", // Social post imagery
  BACKGROUND: "background", // Background/texture
} as const;

/**
 * Sample Brand Images Data
 *
 * Describes the types of images NDS would have in their library.
 * In production, these would be populated from actual Cloudinary folders.
 */
const SAMPLE_BRAND_IMAGES = [
  // Historical Ads
  {
    name: "Next Day Delivery Promise Ad",
    category: CATEGORIES.HISTORICAL_AD,
    description: "Classic NDS ad highlighting next-day delivery. Orange and black color scheme, bold headline 'ORDER BY 1PM, DELIVERED TOMORROW'.",
    tags: ["next-day", "delivery", "promise", "orange", "headline"],
    suggestedUse: [SUGGESTED_USES.HERO, SUGGESTED_USES.SOCIAL_MEDIA],
    aspectRatio: "16:9",
  },
  {
    name: "Trade Quality DIY Friendly Ad",
    category: CATEGORIES.HISTORICAL_AD,
    description: "Ad showing NDS serves both trade and DIY customers equally. Split design with contractor and homeowner imagery.",
    tags: ["trade", "diy", "inclusive", "split-design"],
    suggestedUse: [SUGGESTED_USES.HERO, SUGGESTED_USES.SOCIAL_MEDIA],
    aspectRatio: "1:1",
  },
  {
    name: "No Minimum Order Campaign",
    category: CATEGORIES.HISTORICAL_AD,
    description: "Campaign highlighting no minimum order policy. Single rebar bar featured with '1 BAR OR 1000' messaging.",
    tags: ["no-minimum", "accessibility", "single-bar"],
    suggestedUse: [SUGGESTED_USES.HERO, SUGGESTED_USES.SOCIAL_MEDIA],
    aspectRatio: "4:5",
  },

  // Product Hero Shots
  {
    name: "Rebar Stack - Professional Shot",
    category: CATEGORIES.PRODUCT_HERO,
    description: "Studio shot of T10-T25 rebar bars stacked neatly. Clean background, professional lighting showing ribbed texture.",
    tags: ["rebar", "stack", "professional", "studio", "texture"],
    suggestedUse: [SUGGESTED_USES.HERO, SUGGESTED_USES.DETAIL],
    aspectRatio: "16:9",
  },
  {
    name: "A193 Mesh Sheet - Aerial View",
    category: CATEGORIES.PRODUCT_HERO,
    description: "Top-down shot of A193 mesh sheet showing grid pattern. Clean concrete floor background, CARES certification visible.",
    tags: ["mesh", "A193", "aerial", "grid-pattern", "certified"],
    suggestedUse: [SUGGESTED_USES.HERO, SUGGESTED_USES.DETAIL],
    aspectRatio: "1:1",
  },
  {
    name: "Spacer Collection - Product Range",
    category: CATEGORIES.PRODUCT_HERO,
    description: "Range shot showing all spacer types: clips, chairs, wheels. Size progression visible, clean white background.",
    tags: ["spacers", "range", "collection", "sizes", "white-background"],
    suggestedUse: [SUGGESTED_USES.HERO, SUGGESTED_USES.COMPARISON],
    aspectRatio: "16:9",
  },
  {
    name: "Tie Wire Coil - Close Up",
    category: CATEGORIES.PRODUCT_HERO,
    description: "Detailed shot of 20kg tie wire coil. Metallic texture visible, label showing specifications.",
    tags: ["tie-wire", "coil", "detail", "specifications"],
    suggestedUse: [SUGGESTED_USES.DETAIL],
    aspectRatio: "1:1",
  },

  // Installation Photos
  {
    name: "Foundation Reinforcement - Site Photo",
    category: CATEGORIES.INSTALLATION,
    description: "Real construction site showing foundation reinforcement. Workers in hi-vis, rebar cage visible in excavation.",
    tags: ["foundation", "site", "workers", "rebar-cage", "excavation"],
    suggestedUse: [SUGGESTED_USES.INSTALLATION, SUGGESTED_USES.SOCIAL_MEDIA],
    aspectRatio: "16:9",
  },
  {
    name: "Mesh Installation - Slab Pour",
    category: CATEGORIES.INSTALLATION,
    description: "Ground floor slab installation with A193 mesh on chair spacers. Concrete pour in progress, professional site.",
    tags: ["mesh", "slab", "pour", "chairs", "professional-site"],
    suggestedUse: [SUGGESTED_USES.INSTALLATION, SUGGESTED_USES.HERO],
    aspectRatio: "16:9",
  },
  {
    name: "Rebar Tying - Close Up",
    category: CATEGORIES.INSTALLATION,
    description: "Close-up of worker tying rebar intersections. Tie wire technique visible, gloved hands, professional quality.",
    tags: ["tying", "technique", "close-up", "hands", "tie-wire"],
    suggestedUse: [SUGGESTED_USES.DETAIL, SUGGESTED_USES.INSTALLATION],
    aspectRatio: "4:5",
  },
  {
    name: "Column Cage Assembly",
    category: CATEGORIES.INSTALLATION,
    description: "Column reinforcement cage being assembled on site. T20 main bars, T10 links visible, workers in background.",
    tags: ["column", "cage", "assembly", "links", "main-bars"],
    suggestedUse: [SUGGESTED_USES.INSTALLATION, SUGGESTED_USES.SOCIAL_MEDIA],
    aspectRatio: "9:16",
  },
  {
    name: "Spacer Positioning - Detail",
    category: CATEGORIES.INSTALLATION,
    description: "Detail shot of spacers being positioned under mesh. Correct cover being maintained, clean installation.",
    tags: ["spacers", "positioning", "cover", "detail", "technique"],
    suggestedUse: [SUGGESTED_USES.INSTALLATION, SUGGESTED_USES.DETAIL],
    aspectRatio: "1:1",
  },

  // Detail/Close-up Shots
  {
    name: "Rebar Ribs - Macro",
    category: CATEGORIES.DETAIL,
    description: "Macro shot of rebar ribbed surface. Shows deformation pattern for concrete bond, metallic texture.",
    tags: ["ribs", "macro", "texture", "deformation", "bond"],
    suggestedUse: [SUGGESTED_USES.DETAIL, SUGGESTED_USES.BACKGROUND],
    aspectRatio: "1:1",
  },
  {
    name: "Mesh Weld Points",
    category: CATEGORIES.DETAIL,
    description: "Close-up of mesh weld intersections. Quality welding visible, structural integrity evident.",
    tags: ["weld", "intersection", "quality", "close-up"],
    suggestedUse: [SUGGESTED_USES.DETAIL],
    aspectRatio: "1:1",
  },
  {
    name: "Coupler Thread Detail",
    category: CATEGORIES.DETAIL,
    description: "Macro shot of mechanical coupler threading. Precision machining visible, certification marks.",
    tags: ["coupler", "thread", "precision", "machining"],
    suggestedUse: [SUGGESTED_USES.DETAIL],
    aspectRatio: "1:1",
  },

  // Lifestyle/Context
  {
    name: "Contractor on Site with Delivery",
    category: CATEGORIES.LIFESTYLE,
    description: "Contractor receiving NDS delivery on site. Branded vehicle visible, professional handover, satisfied customer.",
    tags: ["delivery", "contractor", "branded", "handover", "customer"],
    suggestedUse: [SUGGESTED_USES.HERO, SUGGESTED_USES.SOCIAL_MEDIA],
    aspectRatio: "16:9",
  },
  {
    name: "DIY Customer - Home Project",
    category: CATEGORIES.LIFESTYLE,
    description: "Homeowner working on garden project with NDS mesh. Domestic setting, achievable DIY project feel.",
    tags: ["diy", "homeowner", "garden", "domestic", "achievable"],
    suggestedUse: [SUGGESTED_USES.HERO, SUGGESTED_USES.SOCIAL_MEDIA],
    aspectRatio: "4:5",
  },
  {
    name: "Warehouse Operations",
    category: CATEGORIES.LIFESTYLE,
    description: "NDS warehouse showing stock levels and operations. Organised stock, professional environment, capacity.",
    tags: ["warehouse", "stock", "operations", "professional", "capacity"],
    suggestedUse: [SUGGESTED_USES.BACKGROUND, SUGGESTED_USES.SOCIAL_MEDIA],
    aspectRatio: "16:9",
  },

  // Comparison Images
  {
    name: "Mesh Size Comparison A142-A393",
    category: CATEGORIES.COMPARISON,
    description: "Side-by-side comparison of A142 vs A393 mesh. Wire size difference clearly visible, scale reference included.",
    tags: ["comparison", "mesh", "sizes", "scale", "wire-size"],
    suggestedUse: [SUGGESTED_USES.COMPARISON, SUGGESTED_USES.DETAIL],
    aspectRatio: "16:9",
  },
  {
    name: "Rebar Size Range T8-T40",
    category: CATEGORIES.COMPARISON,
    description: "Cross-section comparison of rebar sizes T8 through T40. Diameter progression clear, size labels.",
    tags: ["comparison", "rebar", "sizes", "cross-section", "range"],
    suggestedUse: [SUGGESTED_USES.COMPARISON, SUGGESTED_USES.HERO],
    aspectRatio: "16:9",
  },
  {
    name: "Spacer Cover Options",
    category: CATEGORIES.COMPARISON,
    description: "Comparison showing 25mm, 40mm, 50mm cover spacers in use. Cover difference visible against formwork.",
    tags: ["comparison", "spacers", "cover", "options", "formwork"],
    suggestedUse: [SUGGESTED_USES.COMPARISON, SUGGESTED_USES.INSTALLATION],
    aspectRatio: "16:9",
  },
];

/**
 * Generate placeholder Cloudinary URL
 * In production, these would be actual uploaded images
 */
function getPlaceholderUrl(category: string, name: string): { url: string; publicId: string } {
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "placeholder";
  return {
    url: `https://res.cloudinary.com/${cloudName}/image/upload/v1/brand-images/${category}/${slug}.jpg`,
    publicId: `brand-images/${category}/${slug}`,
  };
}

/**
 * Seed brand images from sample data
 */
export async function seedBrandImagesFromSampleData() {
  console.log("🌱 Seeding NDS Brand Images from sample data...");

  // Get first user
  const user = await db.query.users.findFirst();
  if (!user) {
    console.log("⚠️ No users found. Create a user first.");
    return { created: 0, updated: 0, errors: 0 };
  }

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const imageData of SAMPLE_BRAND_IMAGES) {
    try {
      const { url, publicId } = getPlaceholderUrl(imageData.category, imageData.name);

      // Check if image exists by publicId
      const existing = await db.query.brandImages.findFirst({
        where: eq(brandImages.cloudinaryPublicId, publicId),
      });

      const imageRecord = {
        userId: user.id,
        cloudinaryUrl: url,
        cloudinaryPublicId: publicId,
        category: imageData.category,
        tags: imageData.tags,
        description: imageData.description,
        suggestedUse: imageData.suggestedUse,
        aspectRatio: imageData.aspectRatio,
      };

      if (existing) {
        await db.update(brandImages)
          .set(imageRecord)
          .where(eq(brandImages.id, existing.id));
        updated++;
        console.log(`  🔄 Updated: ${imageData.name}`);
      } else {
        await db.insert(brandImages).values(imageRecord);
        created++;
        console.log(`  ✨ Created: ${imageData.name}`);
      }
    } catch (err) {
      errors++;
      console.error(`  ❌ Failed: ${imageData.name}`, err);
    }
  }

  console.log(`\n✅ Brand Image seeding complete:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);

  return { created, updated, errors };
}

/**
 * Seed brand images from Cloudinary folder
 * Reads existing images and creates brand image records
 */
export async function seedBrandImagesFromCloudinary(folder: string = "brand-images") {
  console.log(`🌱 Seeding brand images from Cloudinary folder: ${folder}`);

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    console.error("❌ Cloudinary not configured");
    return { created: 0, skipped: 0, errors: 0 };
  }

  // Get first user
  const user = await db.query.users.findFirst();
  if (!user) {
    console.log("⚠️ No users found. Create a user first.");
    return { created: 0, skipped: 0, errors: 0 };
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: folder,
      max_results: 500,
    });

    console.log(`📦 Found ${result.resources.length} images in Cloudinary`);

    for (const resource of result.resources) {
      try {
        // Check if already exists
        const existing = await db.query.brandImages.findFirst({
          where: eq(brandImages.cloudinaryPublicId, resource.public_id),
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Extract category from path (e.g., "brand-images/installation/photo1" -> "installation")
        const pathParts = resource.public_id.split("/");
        const category = pathParts.length > 1 ? pathParts[1] : "uncategorized";
        const fileName = pathParts[pathParts.length - 1];

        await db.insert(brandImages).values({
          userId: user.id,
          cloudinaryUrl: resource.secure_url,
          cloudinaryPublicId: resource.public_id,
          category,
          tags: [category],
          description: `Imported: ${fileName}`,
        });

        created++;
        console.log(`  ✨ Created: ${fileName} (${category})`);
      } catch (err) {
        errors++;
        console.error(`  ❌ Failed: ${resource.public_id}`, err);
      }
    }
  } catch (err) {
    console.error("❌ Failed to list Cloudinary resources:", err);
    return { created: 0, skipped: 0, errors: 1 };
  }

  console.log(`\n✅ Cloudinary brand image seeding complete:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);

  return { created, skipped, errors };
}

/**
 * Main seed function
 */
export async function seedBrandImages(options?: { sampleOnly?: boolean; cloudinaryOnly?: boolean; cloudinaryFolder?: string }) {
  console.log("\n" + "=".repeat(50));
  console.log("NDS BRAND IMAGES SEEDING");
  console.log("=".repeat(50) + "\n");

  const results = {
    sample: { created: 0, updated: 0, errors: 0 },
    cloudinary: { created: 0, skipped: 0, errors: 0 },
  };

  if (!options?.cloudinaryOnly) {
    results.sample = await seedBrandImagesFromSampleData();
  }

  if (!options?.sampleOnly) {
    results.cloudinary = await seedBrandImagesFromCloudinary(options?.cloudinaryFolder);
  }

  return results;
}
