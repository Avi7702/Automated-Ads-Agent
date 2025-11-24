import { storage } from "./storage";

const defaultTemplates = [
  {
    title: "Lifestyle - Morning Coffee",
    prompt: "cozy morning coffee setup with natural sunlight streaming through window",
    category: "lifestyle",
    tags: ["morning", "coffee", "natural light", "cozy"],
  },
  {
    title: "Professional - Office Desk",
    prompt: "minimalist professional desk setup with laptop and organized workspace",
    category: "professional",
    tags: ["desk", "workspace", "minimalist", "professional"],
  },
  {
    title: "Outdoor - Adventure",
    prompt: "outdoor adventure scene in mountains with hiking backpack and gear",
    category: "outdoor",
    tags: ["adventure", "mountains", "hiking", "outdoor"],
  },
  {
    title: "Lifestyle - Gym Fitness",
    prompt: "modern gym setting with fitness equipment and athletic vibe",
    category: "lifestyle",
    tags: ["fitness", "gym", "athletic", "workout"],
  },
  {
    title: "Professional - Studio Shot",
    prompt: "clean white studio background with professional lighting and shadows",
    category: "professional",
    tags: ["studio", "white background", "professional", "clean"],
  },
  {
    title: "Lifestyle - Beach Scene",
    prompt: "sunny beach setting with sand and ocean waves in background",
    category: "lifestyle",
    tags: ["beach", "summer", "ocean", "vacation"],
  },
  {
    title: "Urban - Street Style",
    prompt: "urban street photography aesthetic with city backdrop and natural lighting",
    category: "urban",
    tags: ["street", "city", "urban", "modern"],
  },
  {
    title: "Nature - Forest",
    prompt: "natural forest setting with greenery and dappled sunlight filtering through trees",
    category: "nature",
    tags: ["forest", "nature", "green", "outdoor"],
  },
  {
    title: "Lifestyle - Kitchen Scene",
    prompt: "modern kitchen countertop with marble surface and cooking utensils",
    category: "lifestyle",
    tags: ["kitchen", "cooking", "home", "food"],
  },
  {
    title: "Professional - Tech Workspace",
    prompt: "high-tech workspace with multiple monitors and modern gadgets",
    category: "professional",
    tags: ["tech", "workspace", "modern", "gadgets"],
  },
  {
    title: "Luxury - Premium Display",
    prompt: "luxury display with elegant backdrop and premium lighting setup",
    category: "luxury",
    tags: ["luxury", "premium", "elegant", "high-end"],
  },
  {
    title: "Lifestyle - Flat Lay",
    prompt: "aesthetic flat lay arrangement on textured surface from overhead view",
    category: "lifestyle",
    tags: ["flat lay", "overhead", "aesthetic", "arrangement"],
  },
  {
    title: "Outdoor - Camping",
    prompt: "camping scene with tent and outdoor gear in natural wilderness",
    category: "outdoor",
    tags: ["camping", "tent", "wilderness", "adventure"],
  },
  {
    title: "Professional - Conference Room",
    prompt: "modern conference room with sleek table and professional meeting setup",
    category: "professional",
    tags: ["conference", "meeting", "business", "professional"],
  },
  {
    title: "Lifestyle - Yoga & Wellness",
    prompt: "peaceful yoga studio with plants and calming wellness atmosphere",
    category: "lifestyle",
    tags: ["yoga", "wellness", "peaceful", "meditation"],
  },
];

export async function seedPromptTemplates() {
  console.log("Seeding prompt templates...");
  
  try {
    for (const template of defaultTemplates) {
      await storage.savePromptTemplate(template);
      console.log(`✓ Added: ${template.title}`);
    }
    console.log(`\n✅ Successfully seeded ${defaultTemplates.length} prompt templates!`);
  } catch (error) {
    console.error("❌ Error seeding templates:", error);
    throw error;
  }
}

// Run if executed directly
seedPromptTemplates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
