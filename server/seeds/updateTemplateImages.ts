/* eslint-disable no-console */
import "dotenv/config";
import { db } from "../db";
import { adSceneTemplates } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Update Ad Scene Templates with Real Unsplash Images
 *
 * These are curated high-quality images from Unsplash that match
 * proven high-performing B2B construction ad patterns.
 *
 * Sources: Unsplash (free commercial use, no attribution required)
 * - https://unsplash.com/s/photos/construction
 * - https://unsplash.com/s/photos/worksite
 */

// Real Unsplash images for each template category
// These are permanent URLs (not API-based, won't change)
const TEMPLATE_IMAGES: Record<string, string[]> = {
  // Product Showcase - Clean product photography
  product_showcase: [
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=1000&fit=crop", // Construction materials
    "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=1000&fit=crop", // Steel beams
    "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=1000&fit=crop", // Metal work
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=1000&fit=crop", // Industrial materials
  ],

  // Installation - Worksite context
  installation: [
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=1000&fit=crop", // Construction site
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=1000&fit=crop", // Building work
    "https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?w=800&h=1000&fit=crop", // Construction workers
    "https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?w=800&h=1000&fit=crop", // Site installation
  ],

  // Worksite - Active construction scenes
  worksite: [
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=1000&fit=crop", // Crane site
    "https://images.unsplash.com/photo-1429497419816-9ca5cfb4571a?w=800&h=1000&fit=crop", // Building construction
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=1000&fit=crop", // High rise
    "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&h=1000&fit=crop", // Foundation work
  ],

  // Professional - Office/business context
  professional: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=1000&fit=crop", // Modern office
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=1000&fit=crop", // Meeting room
    "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=1000&fit=crop", // Team planning
    "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&h=1000&fit=crop", // Architect work
  ],

  // Educational - Technical/instructional
  educational: [
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=1000&fit=crop", // Blueprint review
    "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=800&h=1000&fit=crop", // Technical drawing
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=1000&fit=crop", // Specs/data
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=1000&fit=crop", // Training session
  ],
};

export async function updateTemplateImages() {
  console.log("🖼️ Updating template images with real Unsplash photos...\n");

  try {
    // Get all templates
    const templates = await db.select().from(adSceneTemplates);
    console.log(`Found ${templates.length} templates to update\n`);

    let updated = 0;

    for (const template of templates) {
      const category = template.category;
      const images = TEMPLATE_IMAGES[category];

      if (!images || images.length === 0) {
        console.log(`⚠️ No images for category: ${category}`);
        continue;
      }

      // Pick a random image from the category
      const imageUrl = images[Math.floor(Math.random() * images.length)];

      // Update template
      await db.update(adSceneTemplates)
        .set({
          previewImageUrl: imageUrl,
          previewPublicId: `unsplash-${category}-${Date.now()}`,
        })
        .where(eq(adSceneTemplates.id, template.id));

      console.log(`✅ Updated: ${template.title} (${category})`);
      updated++;
    }

    console.log(`\n🎉 Updated ${updated} templates with real images!`);

  } catch (error) {
    console.error("Error updating templates:", error);
    throw error;
  }
}

// Run when called directly
updateTemplateImages()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
