import "dotenv/config";
import { db } from "../db";
import { performingAdTemplates } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Update Performing Ad Templates with Real Unsplash Images
 *
 * These are curated high-quality images from Unsplash that match
 * high-performing B2B ad patterns - professional, trust-building imagery.
 */

// Real Unsplash images for each category
const CATEGORY_IMAGES: Record<string, string[]> = {
  // Product Showcase - Clean product photography
  product_showcase: [
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop", // Construction materials
    "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=600&fit=crop", // Steel beams
    "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=600&fit=crop", // Metal work
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop", // Industrial materials
  ],

  // Installation - Worksite context
  installation: [
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop", // Construction site
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop", // Building work
    "https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?w=800&h=600&fit=crop", // Construction workers
    "https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?w=800&h=600&fit=crop", // Site installation
  ],

  // Worksite - Active construction scenes
  worksite: [
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=600&fit=crop", // Crane site
    "https://images.unsplash.com/photo-1429497419816-9ca5cfb4571a?w=800&h=600&fit=crop", // Building construction
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop", // High rise
    "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&h=600&fit=crop", // Foundation work
  ],

  // Professional - Office/business context
  professional: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop", // Modern office
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop", // Meeting room
    "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=600&fit=crop", // Team planning
    "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&h=600&fit=crop", // Architect work
  ],

  // Educational - Technical/instructional
  educational: [
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop", // Blueprint review
    "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=800&h=600&fit=crop", // Technical drawing
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop", // Specs/data
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=600&fit=crop", // Training session
  ],

  // Social Proof - Results/testimonials
  social_proof: [
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&fit=crop", // Success team
    "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop", // Business meeting
    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=600&fit=crop", // Happy clients
    "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop", // Handshake
  ],

  // Brand Awareness
  brand_awareness: [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop", // Modern building
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=600&fit=crop", // Corporate office
    "https://images.unsplash.com/photo-1560472355-536de3962603?w=800&h=600&fit=crop", // Brand imagery
    "https://images.unsplash.com/photo-1493612276216-ee3925520721?w=800&h=600&fit=crop", // Abstract brand
  ],
};

// Default images if category not found
const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=600&fit=crop",
];

export async function updatePerformingTemplateImages() {
  console.log("🖼️ Updating performing ad templates with real Unsplash photos...\n");

  try {
    // Get all performing templates
    const templates = await db.select().from(performingAdTemplates);
    console.log(`Found ${templates.length} performing templates to update\n`);

    let updated = 0;

    for (const template of templates) {
      const category = template.category;
      const images = CATEGORY_IMAGES[category] || DEFAULT_IMAGES;

      // Pick a random image from the category
      const imageUrl = images[Math.floor(Math.random() * images.length)];

      // Update template
      await db.update(performingAdTemplates)
        .set({
          previewImageUrl: imageUrl,
          previewPublicId: `unsplash-performing-${category}-${Date.now()}`,
        })
        .where(eq(performingAdTemplates.id, template.id));

      console.log(`✅ Updated: ${template.name} (${category})`);
      updated++;
    }

    console.log(`\n🎉 Updated ${updated} performing templates with real images!`);

  } catch (error) {
    console.error("Error updating performing templates:", error);
    throw error;
  }
}

// Run when called directly
updatePerformingTemplateImages()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
