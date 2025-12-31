import { storage } from "./storage";

const defaultTemplates = [
  {
    title: "Construction - Site Trench",
    prompt: "active construction site trench with exposed earth and safety barriers, professional job site photography",
    category: "construction",
    tags: ["trench", "site", "excavation", "construction"],
  },
  {
    title: "Industrial - Warehouse",
    prompt: "expansive industrial warehouse with high ceilings and concrete flooring, clean logistic environment",
    category: "industrial",
    tags: ["warehouse", "storage", "industrial", "logistic"],
  },
  {
    title: "Construction - Rebar Setup",
    prompt: "steel rebar grid reinforcement laid out on site ready for concrete pour, technical construction detail",
    category: "construction",
    tags: ["rebar", "steel", "reinforcement", "concrete"],
  },
  {
    title: "Industrial - Concrete Slab",
    prompt: "freshly poured smooth concrete slab surface with industrial finish, minimal texture background",
    category: "industrial",
    tags: ["concrete", "slab", "surface", "finish"],
  },
  {
    title: "Blueprints - Technical Overlay",
    prompt: "architectural blueprints and technical drawings spread on a workspace table, engineering context",
    category: "professional",
    tags: ["blueprints", "drawings", "plans", "architecture"],
  },
  {
    title: "Construction - Safety Gear",
    prompt: "construction safety gear including hard hat and vest on raw timber surface, site safety theme",
    category: "construction",
    tags: ["safety", "gear", "ppe", "site"],
  },
  {
    title: "Industrial - Steel Beam",
    prompt: "structural steel beams and framework in industrial setting, strength and engineering focus",
    category: "industrial",
    tags: ["steel", "beam", "structure", "framework"],
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

// CLI execution disabled - this check doesn't work correctly when bundled with esbuild
// The bundled file becomes the "main module" so this would run on every server start
// To seed manually, create an admin endpoint or run: npx tsx server/seedPromptTemplates.ts
