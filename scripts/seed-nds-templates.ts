/**
 * NDS (Next Day Steel) Template Seeder
 *
 * Creates construction steel-appropriate templates for:
 * - Rebar (T12, T16, T20, etc.)
 * - Steel mesh (A142, A193, A252, A393, etc.)
 * - Spacers and chairs
 * - Tie wire
 * - DPM membranes
 *
 * Categories:
 * - product_showcase: Hero product shots
 * - installation: Products being installed on-site
 * - worksite: Construction site context shots
 * - professional: Corporate/professional imagery
 * - educational: How-to and comparison content
 */

import "dotenv/config";
import { storage } from "../server/storage";

// Placeholder images - Replace with actual Cloudinary URLs after upload
const PLACEHOLDER_IMAGE = "https://placehold.co/400x500/1a1a2e/ffffff?text=Template";
const PLACEHOLDER_PUBLIC_ID = "placeholder";

interface TemplateData {
  title: string;
  description: string;
  previewImageUrl: string;
  previewPublicId: string;
  category: "product_showcase" | "installation" | "worksite" | "professional" | "educational";
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

const NDS_TEMPLATES: TemplateData[] = [
  // ============================================
  // PRODUCT SHOWCASE TEMPLATES
  // ============================================
  {
    title: "Studio Steel Hero Shot",
    description: "Clean studio shot highlighting the texture and quality of steel products. Perfect for catalog and e-commerce.",
    previewImageUrl: PLACEHOLDER_IMAGE,
    previewPublicId: PLACEHOLDER_PUBLIC_ID,
    category: "product_showcase",
    tags: ["studio", "hero", "product", "clean", "professional"],
    platformHints: ["instagram", "facebook", "linkedin"],
    aspectRatioHints: ["1:1", "4:5"],
    promptBlueprint: "Professional studio photography of {{product}}, clean white background with subtle shadows, dramatic side lighting highlighting the ribbed texture and steel finish, shallow depth of field, commercial product photography style, 8K quality",
    placementHints: { position: "center", scale: "large" },
    lightingStyle: "studio",
    intent: "showcase",
    environment: "studio",
    mood: "professional",
    bestForProductTypes: ["rebar", "mesh", "spacers", "tie-wire"],
    isGlobal: true,
  },
  {
    title: "Stacked Steel Display",
    description: "Multiple units stacked to show scale and bulk availability. Great for B2B messaging.",
    previewImageUrl: PLACEHOLDER_IMAGE,
    previewPublicId: PLACEHOLDER_PUBLIC_ID,
    category: "product_showcase",
    tags: ["stack", "bulk", "inventory", "b2b", "supply"],
    platformHints: ["linkedin", "facebook"],
    aspectRatioHints: ["16:9", "4:5"],
    promptBlueprint: "Industrial warehouse photography of {{product}} neatly stacked in large quantities, professional lighting revealing the texture and quality, depth showing rows of inventory, commercial supply chain imagery",
    placementHints: { position: "center", scale: "fill" },
    lightingStyle: "natural",
    intent: "showcase",
    environment: "indoor",
    mood: "industrial",
    bestForProductTypes: ["rebar", "mesh", "membranes"],
    isGlobal: true,
  },
  {
    title: "Close-up Detail Shot",
    description: "Macro-style shot focusing on material quality, ribbing pattern, and finish. Builds trust in product quality.",
    previewImageUrl: PLACEHOLDER_IMAGE,
    previewPublicId: PLACEHOLDER_PUBLIC_ID,
    category: "product_showcase",
    tags: ["macro", "detail", "quality", "texture", "close-up"],
    platformHints: ["instagram", "linkedin"],
    aspectRatioHints: ["1:1", "4:5"],
    promptBlueprint: "Extreme close-up macro photography of {{product}}, revealing the ribbed texture and surface quality, dramatic lighting creating depth and shadows, industrial aesthetic, professional product photography",
    placementHints: { position: "center", scale: "fill" },
    lightingStyle: "dramatic",
    intent: "showcase",
    environment: "studio",
    mood: "bold",
    bestForProductTypes: ["rebar", "mesh", "spacers"],
    isGlobal: true,
  },

  // ============================================
  // INSTALLATION TEMPLATES
  // ============================================
  {
    title: "Foundation Pour Ready",
    description: "Rebar grid tied and ready for concrete pour. Shows professional installation.",
    previewImageUrl: PLACEHOLDER_IMAGE,
    previewPublicId: PLACEHOLDER_PUBLIC_ID,
    category: "installation",
    tags: ["foundation", "pour", "concrete", "grid", "construction"],
    platformHints: ["instagram", "linkedin", "facebook"],
    aspectRatioHints: ["16:9", "4:5"],
    promptBlueprint: "Professional construction photography of {{product}} installed in a foundation grid pattern, ready for concrete pour, spacers visible holding rebar at correct height, natural daylight, worksite setting, high-quality construction documentation",
    placementHints: { position: "center", scale: "large" },
    lightingStyle: "natural",
    intent: "installation",
    environment: "worksite",
    mood: "professional",
    bestForProductTypes: ["rebar", "mesh", "spacers", "tie-wire"],
    isGlobal: true,
  },
  {
    title: "Worker Installing Mesh",
    description: "Contractor hands positioning steel mesh. Shows ease of use and professional installation.",
    previewImageUrl: PLACEHOLDER_IMAGE,
    previewPublicId: PLACEHOLDER_PUBLIC_ID,
    category: "installation",
    tags: ["worker", "hands", "installation", "mesh", "contractor"],
    platformHints: ["instagram", "linkedin", "tiktok"],
    aspectRatioHints: ["4:5", "9:16"],
    promptBlueprint: "Professional construction photography showing contractor's gloved hands positioning {{product}}, focus on the installation process, natural outdoor lighting, safety-conscious worksite setting, authentic construction moment",
    placementHints: { position: "center", scale: "medium" },
    lightingStyle: "natural",
    intent: "installation",
    environment: "worksite",
    mood: "professional",
    bestForProductTypes: ["mesh", "rebar", "spacers"],
    isGlobal: true,
  },
  {
    title: "Scale Reference Shot",
    description: "Product next to worker or tape measure for scale demonstration. Helps buyers understand dimensions.",
    previewImageUrl: PLACEHOLDER_IMAGE,
    previewPublicId: PLACEHOLDER_PUBLIC_ID,
    category: "installation",
    tags: ["scale", "dimensions", "size", "reference", "measurement"],
    platformHints: ["instagram", "facebook"],
    aspectRatioHints: ["1:1", "4:5"],
    promptBlueprint: "Professional product photography of {{product}} with scale reference (worker's hands or tape measure visible), clear demonstration of dimensions and size, construction site or warehouse setting, educational product shot",
    placementHints: { position: "center", scale: "large" },
    lightingStyle: "natural",
    intent: "scale-demo",
    environment: "worksite",
    mood: "professional",
    bestForProductTypes: ["rebar", "mesh", "spacers", "membranes"],
    isGlobal: true,
  },

  // ============================================
  // WORKSITE TEMPLATES
  // ============================================
  {
    title: "Active Construction Site",
    description: "Wide shot of busy construction site with steel products in use. Shows real-world application.",
    previewImageUrl: PLACEHOLDER_IMAGE,
    previewPublicId: PLACEHOLDER_PUBLIC_ID,
    category: "worksite",
    tags: ["construction", "site", "active", "project", "building"],
    platformHints: ["linkedin", "facebook"],
    aspectRatioHints: ["16:9", "4:5"],
    promptBlueprint: "Wide-angle construction site photography featuring {{product}} being used in an active building project, workers in PPE visible, cranes and construction equipment in background, golden hour lighting, professional construction documentation",
    placementHints: { position: "center", scale: "medium" },
    lightingStyle: "natural",
    intent: "showcase",
    environment: "worksite",
    mood: "industrial",
    bestForProductTypes: ["rebar", "mesh", "spacers", "tie-wire", "membranes"],
    isGlobal: true,
  },
  {
    title: "Delivery Arrival",
    description: "Products being delivered to site. Shows reliability and service.",
    previewImageUrl: PLACEHOLDER_IMAGE,
    previewPublicId: PLACEHOLDER_PUBLIC_ID,
    category: "worksite",
    tags: ["delivery", "truck", "service", "supply", "logistics"],
    platformHints: ["linkedin", "facebook", "instagram"],
    aspectRatioHints: ["16:9", "4:5"],
    promptBlueprint: "Professional logistics photography showing {{product}} being delivered to construction site, delivery truck visible, workers receiving materials, efficient supply chain moment, morning light, commercial delivery documentation",
    placementHints: { position: "center", scale: "large" },
    lightingStyle: "natural",
    intent: "showcase",
    environment: "outdoor",
    mood: "professional",
    bestForProductTypes: ["rebar", "mesh", "membranes"],
    isGlobal: true,
  },
  {
    title: "Completed Foundation",
    description: "Finished reinforcement work before pour. Shows quality and craftsmanship.",
    previewImageUrl: PLACEHOLDER_IMAGE,
    previewPublicId: PLACEHOLDER_PUBLIC_ID,
    category: "worksite",
    tags: ["foundation", "complete", "quality", "craftsmanship", "ready"],
    platformHints: ["linkedin", "instagram"],
    aspectRatioHints: ["16:9", "1:1"],
    promptBlueprint: "Professional construction photography of completed {{product}} installation in foundation, perfect grid alignment visible, spacers at correct intervals, ready for concrete pour, aerial or elevated angle, quality craftsmanship on display",
    placementHints: { position: "center", scale: "fill" },
    lightingStyle: "natural",
    intent: "showcase",
    environment: "worksite",
    mood: "professional",
    bestForProductTypes: ["rebar", "mesh", "spacers"],
    isGlobal: true,
  },

  // ============================================
  // PROFESSIONAL TEMPLATES
  // ============================================
  {
    title: "Corporate Brand Shot",
    description: "Clean, professional image suitable for company website and presentations.",
    previewImageUrl: PLACEHOLDER_IMAGE,
    previewPublicId: PLACEHOLDER_PUBLIC_ID,
    category: "professional",
    tags: ["corporate", "brand", "clean", "website", "presentation"],
    platformHints: ["linkedin", "facebook"],
    aspectRatioHints: ["16:9", "4:5"],
    promptBlueprint: "Corporate photography of {{product}} in a professional setting, clean composition with brand-appropriate styling, neutral background with subtle industrial elements, high-end commercial photography for website or presentation use",
    placementHints: { position: "center", scale: "large" },
    lightingStyle: "studio",
    intent: "showcase",
    environment: "studio",
    mood: "professional",
    bestForProductTypes: ["rebar", "mesh", "spacers", "tie-wire", "membranes"],
    isGlobal: true,
  },
  {
    title: "Consultant Meeting",
    description: "Professional showing product samples to client. Great for B2B marketing.",
    previewImageUrl: PLACEHOLDER_IMAGE,
    previewPublicId: PLACEHOLDER_PUBLIC_ID,
    category: "professional",
    tags: ["meeting", "consultant", "client", "b2b", "sales"],
    platformHints: ["linkedin"],
    aspectRatioHints: ["16:9", "4:5"],
    promptBlueprint: "Professional B2B photography showing {{product}} samples being presented in a meeting setting, focus on the product with professionals in background, modern office or meeting room environment, commercial business imagery",
    placementHints: { position: "center", scale: "medium" },
    lightingStyle: "natural",
    intent: "showcase",
    environment: "indoor",
    mood: "professional",
    bestForProductTypes: ["rebar", "mesh", "spacers"],
    isGlobal: true,
  },

  // ============================================
  // EDUCATIONAL TEMPLATES
  // ============================================
  {
    title: "Product Comparison",
    description: "Side-by-side comparison of different sizes/types. Educational and helpful for buyers.",
    previewImageUrl: PLACEHOLDER_IMAGE,
    previewPublicId: PLACEHOLDER_PUBLIC_ID,
    category: "educational",
    tags: ["comparison", "sizes", "types", "educational", "guide"],
    platformHints: ["instagram", "facebook", "linkedin"],
    aspectRatioHints: ["1:1", "4:5"],
    promptBlueprint: "Educational product photography showing {{product}} alongside different size variants for comparison, clean studio background, labels or measurements visible, helpful buyer guide imagery, clear size differentiation",
    placementHints: { position: "center", scale: "large" },
    lightingStyle: "studio",
    intent: "showcase",
    environment: "studio",
    mood: "minimal",
    bestForProductTypes: ["rebar", "mesh", "spacers"],
    isGlobal: true,
  },
  {
    title: "Installation Guide Step",
    description: "Clear step-by-step installation shot. Perfect for how-to content.",
    previewImageUrl: PLACEHOLDER_IMAGE,
    previewPublicId: PLACEHOLDER_PUBLIC_ID,
    category: "educational",
    tags: ["guide", "how-to", "step", "tutorial", "installation"],
    platformHints: ["instagram", "tiktok", "facebook"],
    aspectRatioHints: ["1:1", "9:16"],
    promptBlueprint: "Educational construction photography showing {{product}} installation step, clear focus on technique and proper placement, worker's hands demonstrating correct method, tutorial-style imagery with good lighting for clarity",
    placementHints: { position: "center", scale: "large" },
    lightingStyle: "natural",
    intent: "installation",
    environment: "worksite",
    mood: "professional",
    bestForProductTypes: ["rebar", "mesh", "spacers", "tie-wire", "membranes"],
    isGlobal: true,
  },
  {
    title: "Specification Highlight",
    description: "Product with key specs overlaid or shown. Great for technical buyers.",
    previewImageUrl: PLACEHOLDER_IMAGE,
    previewPublicId: PLACEHOLDER_PUBLIC_ID,
    category: "educational",
    tags: ["specs", "technical", "specifications", "data", "engineering"],
    platformHints: ["linkedin", "facebook"],
    aspectRatioHints: ["16:9", "1:1"],
    promptBlueprint: "Technical product photography of {{product}} with space for specification overlay, clean studio shot with measurement references, engineering-focused composition, professional documentation style suitable for spec sheets",
    placementHints: { position: "left", scale: "large" },
    lightingStyle: "studio",
    intent: "showcase",
    environment: "studio",
    mood: "minimal",
    bestForProductTypes: ["rebar", "mesh", "spacers", "membranes"],
    isGlobal: true,
  },
];

async function seedNDSTemplates() {
  console.log("🏗️  Seeding NDS Construction Steel Templates...\n");

  let created = 0;
  let errors = 0;

  for (const templateData of NDS_TEMPLATES) {
    try {
      const template = await storage.saveAdSceneTemplate({
        title: templateData.title,
        description: templateData.description,
        previewImageUrl: templateData.previewImageUrl,
        previewPublicId: templateData.previewPublicId,
        category: templateData.category,
        tags: templateData.tags,
        platformHints: templateData.platformHints,
        aspectRatioHints: templateData.aspectRatioHints,
        promptBlueprint: templateData.promptBlueprint,
        placementHints: templateData.placementHints,
        lightingStyle: templateData.lightingStyle,
        intent: templateData.intent,
        environment: templateData.environment,
        mood: templateData.mood,
        bestForProductTypes: templateData.bestForProductTypes,
        isGlobal: templateData.isGlobal,
        createdBy: null,
      });

      console.log(`  ✅ Created: ${template.title} (${template.category})`);
      created++;
    } catch (error) {
      console.error(`  ❌ Failed: ${templateData.title}`, error);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created} templates`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${NDS_TEMPLATES.length}\n`);

  if (errors === 0) {
    console.log("✅ All NDS templates seeded successfully!");
  } else {
    console.log("⚠️  Some templates failed to seed. Check errors above.");
  }

  process.exit(errors > 0 ? 1 : 0);
}

// Run if executed directly
seedNDSTemplates().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
