import "dotenv/config";
import { db } from "../db";
import { performingAdTemplates, users } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Performing Ad Templates Seed for NDS (Next Day Steel)
 *
 * Populates high-performing ad templates based on construction industry patterns.
 * These are visual layouts and patterns that WORK for B2B construction ads.
 *
 * Sources researched:
 * - Construction industry LinkedIn ads
 * - B2B supply chain advertising patterns
 * - Industrial product photography conventions
 * - Trade publication advertising
 *
 * This answers: "What visual pattern works for this type of ad?"
 *
 * Usage:
 *   POST /api/admin/seed-templates
 */

// Template Categories
const CATEGORIES = {
  PRODUCT_SHOWCASE: "product_showcase",
  TESTIMONIAL: "testimonial",
  PROBLEM_SOLUTION: "problem_solution",
  COMPARISON: "comparison",
  URGENCY: "urgency",
  EDUCATIONAL: "educational",
  SOCIAL_PROOF: "social_proof",
  BRAND_AWARENESS: "brand_awareness",
} as const;

// Template Moods
const MOODS = {
  PROFESSIONAL: "professional",
  INDUSTRIAL: "industrial",
  TRUSTWORTHY: "trustworthy",
  URGENT: "urgent",
  HELPFUL: "helpful",
  BOLD: "bold",
} as const;

// Template Styles
const STYLES = {
  CLEAN: "clean",
  MODERN: "modern",
  INDUSTRIAL: "industrial",
  MINIMAL: "minimal",
  BOLD: "bold",
  SPLIT: "split",
} as const;

/**
 * High-Performing Ad Template Patterns
 *
 * Each template includes:
 * - Visual layout structure
 * - Color palette recommendations
 * - Typography patterns
 * - Content block positioning
 * - Platform targeting
 */
const PERFORMING_TEMPLATES = [
  // Product Showcase Templates
  {
    name: "Hero Product - Industrial Clean",
    description: "Large product hero shot with industrial backdrop. Clean typography, minimal distractions. Works for rebar, mesh, spacers.",
    category: CATEGORIES.PRODUCT_SHOWCASE,
    mood: MOODS.PROFESSIONAL,
    style: STYLES.CLEAN,
    layouts: [
      { platform: "instagram", aspectRatio: "1:1", gridStructure: "single-hero", primaryFocusArea: "center" },
      { platform: "facebook", aspectRatio: "1:1", gridStructure: "single-hero", primaryFocusArea: "center" },
      { platform: "linkedin", aspectRatio: "1.91:1", gridStructure: "single-hero", primaryFocusArea: "center-left" },
    ],
    colorPalette: {
      primary: "#FF6B35", // NDS Orange
      secondary: "#1A1A1A", // Black
      accent: "#7A7A7A", // Steel Grey
      background: "#FFFFFF",
      text: "#1A1A1A",
      contrast: "high",
    },
    typography: {
      fontStack: "sans-serif, industrial",
      headlineSize: "large",
      bodySize: "medium",
      ctaSize: "large",
    },
    backgroundType: "image",
    contentBlocks: {
      headline: { position: "top-left", maxChars: 50, placeholder: "{{PRODUCT_NAME}} - {{KEY_BENEFIT}}" },
      body: { position: "bottom-left", maxChars: 100, placeholder: "{{FEATURES}} | {{CERTIFICATION}}" },
      cta: { position: "bottom-right", text: "Order Now →" },
    },
    visualPatterns: ["large-product-center", "industrial-background", "high-contrast-text", "minimal-elements"],
    targetPlatforms: ["instagram", "facebook", "linkedin"],
    targetAspectRatios: ["1:1", "1.91:1"],
    bestForIndustries: ["construction", "manufacturing", "industrial-supplies"],
    bestForObjectives: ["awareness", "consideration"],
    engagementTier: "top-10",
  },
  {
    name: "Product Stack - Quantity Display",
    description: "Stacked product display showing volume/quantity available. Emphasizes stock levels and capacity. Good for bulk messaging.",
    category: CATEGORIES.PRODUCT_SHOWCASE,
    mood: MOODS.INDUSTRIAL,
    style: STYLES.INDUSTRIAL,
    layouts: [
      { platform: "instagram", aspectRatio: "4:5", gridStructure: "full-bleed", primaryFocusArea: "center" },
      { platform: "linkedin", aspectRatio: "1:1", gridStructure: "full-bleed", primaryFocusArea: "center" },
    ],
    colorPalette: {
      primary: "#FF6B35",
      secondary: "#2D2D2D",
      accent: "#7A7A7A",
      background: "#1A1A1A",
      text: "#FFFFFF",
      contrast: "high",
    },
    typography: {
      fontStack: "sans-serif, bold",
      headlineSize: "extra-large",
      bodySize: "medium",
      ctaSize: "large",
    },
    backgroundType: "image",
    contentBlocks: {
      headline: { position: "top-center", maxChars: 30, placeholder: "{{QUANTITY}} IN STOCK" },
      body: { position: "bottom-center", maxChars: 80, placeholder: "{{PRODUCT_RANGE}} ready for next-day delivery" },
      cta: { position: "bottom-center", text: "Check Stock →" },
    },
    visualPatterns: ["stacked-products", "dark-background", "quantity-emphasis", "industrial-lighting"],
    targetPlatforms: ["instagram", "linkedin"],
    targetAspectRatios: ["1:1", "4:5"],
    bestForIndustries: ["construction", "wholesale", "industrial-supplies"],
    bestForObjectives: ["awareness", "consideration"],
    engagementTier: "top-25",
  },

  // Urgency/Next-Day Templates
  {
    name: "Next-Day Promise - Bold CTA",
    description: "Time-sensitive messaging with bold typography. Emphasizes speed and reliability. Orange accent on time element.",
    category: CATEGORIES.URGENCY,
    mood: MOODS.URGENT,
    style: STYLES.BOLD,
    layouts: [
      { platform: "instagram", aspectRatio: "1:1", gridStructure: "text-overlay", primaryFocusArea: "center" },
      { platform: "facebook", aspectRatio: "1.91:1", gridStructure: "text-overlay", primaryFocusArea: "center" },
    ],
    colorPalette: {
      primary: "#FF6B35",
      secondary: "#FFFFFF",
      accent: "#FF6B35",
      background: "#1A1A1A",
      text: "#FFFFFF",
      contrast: "maximum",
    },
    typography: {
      fontStack: "sans-serif, extra-bold",
      headlineSize: "extra-large",
      bodySize: "large",
      ctaSize: "extra-large",
    },
    backgroundType: "solid",
    contentBlocks: {
      headline: { position: "center", maxChars: 40, placeholder: "ORDER BY 1PM" },
      body: { position: "center-below-headline", maxChars: 30, placeholder: "DELIVERED TOMORROW" },
      cta: { position: "bottom-center", text: "Order Now" },
    },
    visualPatterns: ["bold-typography", "dark-background", "orange-accent", "time-emphasis"],
    targetPlatforms: ["instagram", "facebook", "twitter"],
    targetAspectRatios: ["1:1", "1.91:1"],
    bestForIndustries: ["construction", "delivery", "supplies"],
    bestForObjectives: ["conversion"],
    engagementTier: "top-5",
  },
  {
    name: "Clock Countdown - Urgency Driver",
    description: "Visual clock or time element with countdown urgency. Creates FOMO for delivery cutoff. High conversion rates.",
    category: CATEGORIES.URGENCY,
    mood: MOODS.URGENT,
    style: STYLES.MODERN,
    layouts: [
      { platform: "instagram", aspectRatio: "1:1", gridStructure: "icon-centered", primaryFocusArea: "center" },
      { platform: "facebook", aspectRatio: "1:1", gridStructure: "icon-centered", primaryFocusArea: "center" },
    ],
    colorPalette: {
      primary: "#FF6B35",
      secondary: "#1A1A1A",
      accent: "#FF6B35",
      background: "#FFFFFF",
      text: "#1A1A1A",
      contrast: "high",
    },
    typography: {
      fontStack: "sans-serif, bold",
      headlineSize: "large",
      bodySize: "medium",
      ctaSize: "large",
    },
    backgroundType: "solid",
    contentBlocks: {
      headline: { position: "top-center", maxChars: 30, placeholder: "⏰ {{TIME}} LEFT" },
      body: { position: "center", maxChars: 50, placeholder: "Order now for next-day delivery" },
      cta: { position: "bottom-center", text: "Beat the Clock →" },
    },
    visualPatterns: ["clock-icon", "countdown", "orange-highlight", "clean-background"],
    targetPlatforms: ["instagram", "facebook"],
    targetAspectRatios: ["1:1"],
    bestForIndustries: ["construction", "delivery", "ecommerce"],
    bestForObjectives: ["conversion"],
    engagementTier: "top-10",
  },

  // Problem-Solution Templates
  {
    name: "Before/After Split - Installation",
    description: "Split-screen showing problem (empty site) vs solution (reinforced site). Powerful for installation context.",
    category: CATEGORIES.PROBLEM_SOLUTION,
    mood: MOODS.HELPFUL,
    style: STYLES.SPLIT,
    layouts: [
      { platform: "instagram", aspectRatio: "1:1", gridStructure: "split-vertical", primaryFocusArea: "both" },
      { platform: "linkedin", aspectRatio: "1.91:1", gridStructure: "split-horizontal", primaryFocusArea: "both" },
    ],
    colorPalette: {
      primary: "#FF6B35",
      secondary: "#1A1A1A",
      accent: "#4CAF50",
      background: "#FFFFFF",
      text: "#1A1A1A",
      contrast: "medium",
    },
    typography: {
      fontStack: "sans-serif, medium",
      headlineSize: "medium",
      bodySize: "small",
      ctaSize: "medium",
    },
    backgroundType: "image",
    contentBlocks: {
      headline: { position: "top-center", maxChars: 40, placeholder: "Before | After" },
      body: { position: "bottom-center", maxChars: 60, placeholder: "Professional reinforcement makes the difference" },
      cta: { position: "bottom-right", text: "Get Started →" },
    },
    visualPatterns: ["split-screen", "before-after", "transformation", "site-photos"],
    targetPlatforms: ["instagram", "linkedin", "facebook"],
    targetAspectRatios: ["1:1", "1.91:1"],
    bestForIndustries: ["construction", "renovation", "contracting"],
    bestForObjectives: ["consideration", "conversion"],
    engagementTier: "top-10",
  },
  {
    name: "Pain Point Call-Out",
    description: "Direct addressing of customer pain point with solution. Question headline format, clear answer below.",
    category: CATEGORIES.PROBLEM_SOLUTION,
    mood: MOODS.HELPFUL,
    style: STYLES.CLEAN,
    layouts: [
      { platform: "linkedin", aspectRatio: "1:1", gridStructure: "text-heavy", primaryFocusArea: "top" },
      { platform: "facebook", aspectRatio: "1:1", gridStructure: "text-heavy", primaryFocusArea: "top" },
    ],
    colorPalette: {
      primary: "#FF6B35",
      secondary: "#1A1A1A",
      accent: "#FF6B35",
      background: "#F5F5F5",
      text: "#1A1A1A",
      contrast: "medium",
    },
    typography: {
      fontStack: "sans-serif, regular",
      headlineSize: "large",
      bodySize: "medium",
      ctaSize: "large",
    },
    backgroundType: "solid",
    contentBlocks: {
      headline: { position: "top-center", maxChars: 50, placeholder: "Supplier let you down again?" },
      body: { position: "center", maxChars: 100, placeholder: "We guarantee next-day delivery. Order by 1pm, on-site tomorrow." },
      cta: { position: "bottom-center", text: "Never Miss a Pour →" },
    },
    visualPatterns: ["question-headline", "answer-body", "empathy-driven", "solution-focus"],
    targetPlatforms: ["linkedin", "facebook"],
    targetAspectRatios: ["1:1"],
    bestForIndustries: ["construction", "supplies", "b2b-services"],
    bestForObjectives: ["awareness", "consideration"],
    engagementTier: "top-25",
  },

  // Social Proof Templates
  {
    name: "Testimonial Card - Contractor Quote",
    description: "Customer testimonial with photo and quote. Professional contractor perspective. Trust-building format.",
    category: CATEGORIES.TESTIMONIAL,
    mood: MOODS.TRUSTWORTHY,
    style: STYLES.CLEAN,
    layouts: [
      { platform: "linkedin", aspectRatio: "1:1", gridStructure: "testimonial-card", primaryFocusArea: "center" },
      { platform: "facebook", aspectRatio: "1:1", gridStructure: "testimonial-card", primaryFocusArea: "center" },
    ],
    colorPalette: {
      primary: "#1A1A1A",
      secondary: "#FF6B35",
      accent: "#FF6B35",
      background: "#FFFFFF",
      text: "#1A1A1A",
      contrast: "medium",
    },
    typography: {
      fontStack: "serif, quotes / sans-serif, body",
      headlineSize: "large",
      bodySize: "medium",
      ctaSize: "medium",
    },
    backgroundType: "solid",
    contentBlocks: {
      headline: { position: "center", maxChars: 150, placeholder: "\"{{TESTIMONIAL_QUOTE}}\"" },
      body: { position: "bottom-center", maxChars: 50, placeholder: "{{NAME}}, {{COMPANY}}" },
      cta: { position: "bottom-center", text: "Join 1000+ Contractors →" },
    },
    visualPatterns: ["quote-marks", "customer-photo", "clean-background", "trust-signals"],
    targetPlatforms: ["linkedin", "facebook"],
    targetAspectRatios: ["1:1"],
    bestForIndustries: ["construction", "b2b-services", "supplies"],
    bestForObjectives: ["awareness", "consideration"],
    engagementTier: "top-10",
  },
  {
    name: "Stats & Numbers - Trust Building",
    description: "Large numbers/statistics as visual anchor. Deliveries made, customers served, years in business.",
    category: CATEGORIES.SOCIAL_PROOF,
    mood: MOODS.TRUSTWORTHY,
    style: STYLES.BOLD,
    layouts: [
      { platform: "linkedin", aspectRatio: "1.91:1", gridStructure: "stats-row", primaryFocusArea: "center" },
      { platform: "instagram", aspectRatio: "1:1", gridStructure: "stats-grid", primaryFocusArea: "center" },
    ],
    colorPalette: {
      primary: "#FF6B35",
      secondary: "#1A1A1A",
      accent: "#FF6B35",
      background: "#1A1A1A",
      text: "#FFFFFF",
      contrast: "high",
    },
    typography: {
      fontStack: "sans-serif, extra-bold",
      headlineSize: "extra-large",
      bodySize: "small",
      ctaSize: "medium",
    },
    backgroundType: "solid",
    contentBlocks: {
      headline: { position: "center", maxChars: 30, placeholder: "10,000+" },
      body: { position: "below-headline", maxChars: 40, placeholder: "Deliveries Made This Year" },
      cta: { position: "bottom-center", text: "Be Next →" },
    },
    visualPatterns: ["large-numbers", "stats-focus", "dark-background", "orange-accent"],
    targetPlatforms: ["linkedin", "instagram", "facebook"],
    targetAspectRatios: ["1:1", "1.91:1"],
    bestForIndustries: ["construction", "logistics", "b2b-services"],
    bestForObjectives: ["awareness"],
    engagementTier: "top-25",
  },

  // Educational Templates
  {
    name: "How-To Carousel - Installation Steps",
    description: "Step-by-step installation guide format. Numbered steps, clear visuals. High save/share rates.",
    category: CATEGORIES.EDUCATIONAL,
    mood: MOODS.HELPFUL,
    style: STYLES.CLEAN,
    layouts: [
      { platform: "instagram", aspectRatio: "1:1", gridStructure: "carousel-step", primaryFocusArea: "center" },
      { platform: "linkedin", aspectRatio: "1:1", gridStructure: "carousel-step", primaryFocusArea: "center" },
    ],
    colorPalette: {
      primary: "#FF6B35",
      secondary: "#1A1A1A",
      accent: "#FF6B35",
      background: "#FFFFFF",
      text: "#1A1A1A",
      contrast: "medium",
    },
    typography: {
      fontStack: "sans-serif, medium",
      headlineSize: "medium",
      bodySize: "small",
      ctaSize: "medium",
    },
    backgroundType: "image",
    contentBlocks: {
      headline: { position: "top-left", maxChars: 30, placeholder: "Step {{NUMBER}}" },
      body: { position: "bottom-left", maxChars: 80, placeholder: "{{STEP_DESCRIPTION}}" },
      cta: { position: "bottom-right", text: "Swipe →" },
    },
    visualPatterns: ["numbered-steps", "carousel-format", "instruction-focus", "process-visualization"],
    targetPlatforms: ["instagram", "linkedin"],
    targetAspectRatios: ["1:1"],
    bestForIndustries: ["construction", "diy", "trades"],
    bestForObjectives: ["engagement", "awareness"],
    engagementTier: "top-5",
  },
  {
    name: "Specification Card - Technical Info",
    description: "Technical specification display with clean layout. BS numbers, CARES certification, dimensions.",
    category: CATEGORIES.EDUCATIONAL,
    mood: MOODS.PROFESSIONAL,
    style: STYLES.MINIMAL,
    layouts: [
      { platform: "linkedin", aspectRatio: "1:1", gridStructure: "spec-card", primaryFocusArea: "center" },
    ],
    colorPalette: {
      primary: "#1A1A1A",
      secondary: "#7A7A7A",
      accent: "#FF6B35",
      background: "#FFFFFF",
      text: "#1A1A1A",
      contrast: "medium",
    },
    typography: {
      fontStack: "monospace, specs / sans-serif, labels",
      headlineSize: "medium",
      bodySize: "small",
      ctaSize: "medium",
    },
    backgroundType: "solid",
    contentBlocks: {
      headline: { position: "top-left", maxChars: 40, placeholder: "{{PRODUCT_NAME}} Specifications" },
      body: { position: "center", maxChars: 200, placeholder: "{{SPECS_LIST}}" },
      cta: { position: "bottom-center", text: "View Full Specs →" },
    },
    visualPatterns: ["technical-layout", "spec-table", "certification-badges", "clean-minimal"],
    targetPlatforms: ["linkedin"],
    targetAspectRatios: ["1:1"],
    bestForIndustries: ["construction", "engineering", "industrial"],
    bestForObjectives: ["consideration"],
    engagementTier: "top-25",
  },

  // No Minimum Order Templates
  {
    name: "Single Item Highlight - Accessibility",
    description: "Single product item emphasized to show no minimum order. '1 Bar or 1000' messaging. Inclusive positioning.",
    category: CATEGORIES.BRAND_AWARENESS,
    mood: MOODS.HELPFUL,
    style: STYLES.MINIMAL,
    layouts: [
      { platform: "instagram", aspectRatio: "1:1", gridStructure: "single-item", primaryFocusArea: "center" },
      { platform: "facebook", aspectRatio: "1:1", gridStructure: "single-item", primaryFocusArea: "center" },
    ],
    colorPalette: {
      primary: "#FF6B35",
      secondary: "#1A1A1A",
      accent: "#FF6B35",
      background: "#FFFFFF",
      text: "#1A1A1A",
      contrast: "high",
    },
    typography: {
      fontStack: "sans-serif, bold",
      headlineSize: "large",
      bodySize: "medium",
      ctaSize: "large",
    },
    backgroundType: "solid",
    contentBlocks: {
      headline: { position: "top-center", maxChars: 30, placeholder: "1 Bar or 1,000" },
      body: { position: "bottom-center", maxChars: 50, placeholder: "No minimum orders. Ever." },
      cta: { position: "bottom-center", text: "Order Your Quantity →" },
    },
    visualPatterns: ["single-product", "quantity-range", "inclusive-messaging", "clean-background"],
    targetPlatforms: ["instagram", "facebook"],
    targetAspectRatios: ["1:1"],
    bestForIndustries: ["construction", "supplies", "wholesale"],
    bestForObjectives: ["awareness", "conversion"],
    engagementTier: "top-10",
  },
];

/**
 * Seed performing ad templates
 */
export async function seedPerformingTemplates() {
  console.log("🌱 Seeding NDS Performing Ad Templates...");

  // Get first user
  const user = await db.query.users.findFirst();
  if (!user) {
    console.log("⚠️ No users found. Create a user first.");
    return { created: 0, updated: 0, errors: 0 };
  }

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const template of PERFORMING_TEMPLATES) {
    try {
      // Check if template exists by name
      const existing = await db.query.performingAdTemplates.findFirst({
        where: eq(performingAdTemplates.name, template.name),
      });

      const templateRecord = {
        userId: user.id,
        name: template.name,
        description: template.description,
        category: template.category,
        mood: template.mood,
        style: template.style,
        layouts: template.layouts,
        colorPalette: template.colorPalette,
        typography: template.typography,
        backgroundType: template.backgroundType,
        contentBlocks: template.contentBlocks,
        visualPatterns: template.visualPatterns,
        targetPlatforms: template.targetPlatforms,
        targetAspectRatios: template.targetAspectRatios,
        bestForIndustries: template.bestForIndustries,
        bestForObjectives: template.bestForObjectives,
        engagementTier: template.engagementTier,
        isActive: true,
        isFeatured: template.engagementTier === "top-5",
      };

      if (existing) {
        await db.update(performingAdTemplates)
          .set({ ...templateRecord, updatedAt: new Date() })
          .where(eq(performingAdTemplates.id, existing.id));
        updated++;
        console.log(`  🔄 Updated: ${template.name}`);
      } else {
        await db.insert(performingAdTemplates).values(templateRecord);
        created++;
        console.log(`  ✨ Created: ${template.name}`);
      }
    } catch (err) {
      errors++;
      console.error(`  ❌ Failed: ${template.name}`, err);
    }
  }

  console.log(`\n✅ Performing Template seeding complete:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);

  return { created, updated, errors };
}

// Run if called directly (check for CLI execution)
const isMainModule = process.argv[1]?.includes('seedTemplates');
if (isMainModule) {
  seedPerformingTemplates()
    .then((result) => {
      console.log("\n🎉 Done!", result);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      process.exit(1);
    });
}
