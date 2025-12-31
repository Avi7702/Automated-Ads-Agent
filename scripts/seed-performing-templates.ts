/**
 * Seed Script: Performing Ad Templates Library
 *
 * Creates 10 high-performing ad templates across all categories
 * Run with: DATABASE_URL="..." npx tsx scripts/seed-performing-templates.ts
 */

import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

const sampleTemplates = [
  // E-commerce Templates
  {
    name: "Product Hero Spotlight",
    description: "Clean product-focused layout with bold headline and clear CTA. Top performer for new product launches.",
    category: "ecommerce",
    source_platform: "manual",
    engagement_tier: "top-5",
    estimated_engagement_rate: 87,
    running_days: 45,
    estimated_budget: "5k-20k",
    platform_metrics: JSON.stringify([
      { platform: "instagram", estimatedCTR: 3.2, estimatedConversionRate: 2.1 },
      { platform: "facebook", estimatedCTR: 2.8, estimatedConversionRate: 1.9 }
    ]),
    layouts: JSON.stringify([
      { platform: "instagram", aspectRatio: "1:1", gridStructure: { columns: 1, rows: 3 } },
      { platform: "instagram", aspectRatio: "9:16", gridStructure: { columns: 1, rows: 4 } }
    ]),
    color_palette: JSON.stringify({
      primary: "#FF6B35", secondary: "#004E89", accent: "#FFD700",
      background: "#FFFFFF", text: "#1A1A1A", contrast: 4.5
    }),
    typography: JSON.stringify({
      fontStack: ["Montserrat", "Inter", "sans-serif"],
      headlineSize: 48, bodySize: 16, ctaSize: 18
    }),
    background_type: "solid",
    content_blocks: JSON.stringify({
      headline: { placeholder: "Your Main Benefit Here", maxLength: 40, position: "top" },
      body: { placeholder: "Supporting details that build trust", maxLength: 100, position: "middle" },
      cta: { text: "Shop Now", position: "bottom", style: "button-filled" }
    }),
    visual_patterns: ["centered-product", "minimal-background", "strong-cta"],
    mood: "energetic",
    style: "modern",
    template_format: "html-css",
    editable_variables: ["headline", "body", "ctaText", "productImage", "brandColors"],
    target_platforms: ["instagram", "facebook"],
    target_aspect_ratios: ["1:1", "9:16", "4:5"],
    best_for_industries: ["fashion", "beauty", "home-decor", "electronics"],
    best_for_objectives: ["conversion", "consideration"],
    is_active: true,
    is_featured: true
  },
  {
    name: "Before/After Transformation",
    description: "Split-screen comparison showing product impact. Extremely effective for results-driven products.",
    category: "ecommerce",
    source_platform: "manual",
    engagement_tier: "top-5",
    estimated_engagement_rate: 92,
    running_days: 60,
    estimated_budget: "5k-20k",
    platform_metrics: JSON.stringify([
      { platform: "instagram", estimatedCTR: 4.1, estimatedConversionRate: 2.8 },
      { platform: "facebook", estimatedCTR: 3.5, estimatedConversionRate: 2.4 }
    ]),
    layouts: JSON.stringify([
      { platform: "instagram", aspectRatio: "1:1", gridStructure: { columns: 2, rows: 1 } }
    ]),
    color_palette: JSON.stringify({
      primary: "#2ECC71", secondary: "#E74C3C", accent: "#3498DB",
      background: "#F8F9FA", text: "#2C3E50", contrast: 4.8
    }),
    typography: JSON.stringify({
      fontStack: ["Poppins", "Roboto", "sans-serif"],
      headlineSize: 36, bodySize: 14, ctaSize: 16
    }),
    background_type: "solid",
    content_blocks: JSON.stringify({
      headline: { placeholder: "See the Difference", maxLength: 30, position: "top" },
      body: { placeholder: "Real results from real customers", maxLength: 80, position: "middle" },
      cta: { text: "Transform Now", position: "bottom", style: "button-filled" }
    }),
    visual_patterns: ["split-screen", "before-after", "contrast-highlight"],
    mood: "inspirational",
    style: "clean",
    template_format: "html-css",
    editable_variables: ["headline", "beforeImage", "afterImage", "ctaText"],
    target_platforms: ["instagram", "facebook", "tiktok"],
    target_aspect_ratios: ["1:1", "4:5"],
    best_for_industries: ["fitness", "beauty", "home-improvement", "cleaning"],
    best_for_objectives: ["conversion", "engagement"],
    is_active: true,
    is_featured: true
  },
  {
    name: "Social Proof Stack",
    description: "Review-focused layout with star ratings and customer testimonials. Builds instant trust.",
    category: "ecommerce",
    source_platform: "manual",
    engagement_tier: "top-10",
    estimated_engagement_rate: 78,
    running_days: 30,
    estimated_budget: "1k-5k",
    platform_metrics: JSON.stringify([
      { platform: "facebook", estimatedCTR: 2.9, estimatedConversionRate: 2.2 },
      { platform: "instagram", estimatedCTR: 2.4, estimatedConversionRate: 1.8 }
    ]),
    layouts: JSON.stringify([
      { platform: "facebook", aspectRatio: "1:1", gridStructure: { columns: 1, rows: 4 } }
    ]),
    color_palette: JSON.stringify({
      primary: "#F39C12", secondary: "#27AE60", accent: "#9B59B6",
      background: "#FFFFFF", text: "#333333", contrast: 5.2
    }),
    typography: JSON.stringify({
      fontStack: ["Open Sans", "Lato", "sans-serif"],
      headlineSize: 32, bodySize: 14, ctaSize: 16
    }),
    background_type: "solid",
    content_blocks: JSON.stringify({
      headline: { placeholder: "Loved by 10,000+ Customers", maxLength: 35, position: "top" },
      body: { placeholder: "Best purchase I've ever made! - Sarah M.", maxLength: 120, position: "middle" },
      cta: { text: "Join Them", position: "bottom", style: "button-outline" }
    }),
    visual_patterns: ["testimonial-card", "star-rating", "customer-photo"],
    mood: "trustworthy",
    style: "professional",
    template_format: "html-css",
    editable_variables: ["headline", "testimonial", "customerName", "rating", "productImage"],
    target_platforms: ["facebook", "instagram", "linkedin"],
    target_aspect_ratios: ["1:1", "4:5"],
    best_for_industries: ["saas", "services", "consumer-goods"],
    best_for_objectives: ["consideration", "conversion"],
    is_active: true,
    is_featured: true
  },
  // SaaS Templates
  {
    name: "Feature Highlight Grid",
    description: "3-column feature showcase with icons. Perfect for SaaS products showing capabilities.",
    category: "saas",
    source_platform: "manual",
    engagement_tier: "top-10",
    estimated_engagement_rate: 72,
    running_days: 90,
    estimated_budget: "5k-20k",
    platform_metrics: JSON.stringify([
      { platform: "linkedin", estimatedCTR: 1.8, estimatedConversionRate: 0.9 },
      { platform: "facebook", estimatedCTR: 1.5, estimatedConversionRate: 0.7 }
    ]),
    layouts: JSON.stringify([
      { platform: "linkedin", aspectRatio: "1.91:1", gridStructure: { columns: 3, rows: 2 } }
    ]),
    color_palette: JSON.stringify({
      primary: "#3498DB", secondary: "#2C3E50", accent: "#1ABC9C",
      background: "#ECF0F1", text: "#2C3E50", contrast: 4.6
    }),
    typography: JSON.stringify({
      fontStack: ["Inter", "SF Pro", "sans-serif"],
      headlineSize: 40, bodySize: 14, ctaSize: 16
    }),
    background_type: "gradient",
    content_blocks: JSON.stringify({
      headline: { placeholder: "Everything You Need to Scale", maxLength: 45, position: "top" },
      body: { placeholder: "Feature descriptions go here", maxLength: 150, position: "middle" },
      cta: { text: "Start Free Trial", position: "bottom", style: "button-filled" }
    }),
    visual_patterns: ["icon-grid", "feature-cards", "gradient-bg"],
    mood: "professional",
    style: "corporate",
    template_format: "html-css",
    editable_variables: ["headline", "features", "featureIcons", "ctaText"],
    target_platforms: ["linkedin", "facebook", "twitter"],
    target_aspect_ratios: ["1.91:1", "1:1"],
    best_for_industries: ["saas", "tech", "b2b"],
    best_for_objectives: ["awareness", "consideration"],
    is_active: true,
    is_featured: true
  },
  {
    name: "Problem-Solution Flow",
    description: "Two-panel narrative showing pain point and solution. High engagement for B2B.",
    category: "saas",
    source_platform: "manual",
    engagement_tier: "top-10",
    estimated_engagement_rate: 76,
    running_days: 45,
    estimated_budget: "1k-5k",
    platform_metrics: JSON.stringify([
      { platform: "linkedin", estimatedCTR: 2.1, estimatedConversionRate: 1.1 }
    ]),
    layouts: JSON.stringify([
      { platform: "linkedin", aspectRatio: "1:1", gridStructure: { columns: 1, rows: 2 } }
    ]),
    color_palette: JSON.stringify({
      primary: "#E74C3C", secondary: "#27AE60", accent: "#F1C40F",
      background: "#FFFFFF", text: "#2C3E50", contrast: 5.0
    }),
    typography: JSON.stringify({
      fontStack: ["Roboto", "Arial", "sans-serif"],
      headlineSize: 36, bodySize: 16, ctaSize: 18
    }),
    background_type: "solid",
    content_blocks: JSON.stringify({
      headline: { placeholder: "Tired of [Problem]?", maxLength: 40, position: "top" },
      body: { placeholder: "Here's how we solve it", maxLength: 100, position: "middle" },
      cta: { text: "See How", position: "bottom", style: "button-filled" }
    }),
    visual_patterns: ["problem-solution", "two-panel", "emotional-hook"],
    mood: "empathetic",
    style: "conversational",
    template_format: "html-css",
    editable_variables: ["problem", "solution", "ctaText"],
    target_platforms: ["linkedin", "facebook"],
    target_aspect_ratios: ["1:1", "4:5"],
    best_for_industries: ["saas", "consulting", "b2b"],
    best_for_objectives: ["awareness", "engagement"],
    is_active: true,
    is_featured: false
  },
  // Services Templates
  {
    name: "Expert Authority Card",
    description: "Professional headshot with credentials. Ideal for service professionals.",
    category: "services",
    source_platform: "manual",
    engagement_tier: "top-25",
    estimated_engagement_rate: 65,
    running_days: 30,
    estimated_budget: "under-1k",
    platform_metrics: JSON.stringify([
      { platform: "linkedin", estimatedCTR: 1.6, estimatedConversionRate: 0.8 },
      { platform: "facebook", estimatedCTR: 1.2, estimatedConversionRate: 0.5 }
    ]),
    layouts: JSON.stringify([
      { platform: "linkedin", aspectRatio: "1:1", gridStructure: { columns: 1, rows: 2 } }
    ]),
    color_palette: JSON.stringify({
      primary: "#2C3E50", secondary: "#34495E", accent: "#D4AF37",
      background: "#FAFAFA", text: "#1A1A1A", contrast: 5.5
    }),
    typography: JSON.stringify({
      fontStack: ["Playfair Display", "Georgia", "serif"],
      headlineSize: 32, bodySize: 14, ctaSize: 14
    }),
    background_type: "solid",
    content_blocks: JSON.stringify({
      headline: { placeholder: "Your Expert Name", maxLength: 30, position: "top" },
      body: { placeholder: "15+ Years Experience | 500+ Clients", maxLength: 80, position: "middle" },
      cta: { text: "Book Consultation", position: "bottom", style: "button-outline" }
    }),
    visual_patterns: ["headshot-focus", "credentials-bar", "elegant-typography"],
    mood: "authoritative",
    style: "elegant",
    template_format: "html-css",
    editable_variables: ["name", "credentials", "headshot", "ctaText"],
    target_platforms: ["linkedin", "facebook"],
    target_aspect_ratios: ["1:1"],
    best_for_industries: ["consulting", "legal", "healthcare", "finance"],
    best_for_objectives: ["awareness", "consideration"],
    is_active: true,
    is_featured: false
  },
  {
    name: "Service Package Comparison",
    description: "Three-tier pricing/service layout. Clear value proposition.",
    category: "services",
    source_platform: "manual",
    engagement_tier: "top-10",
    estimated_engagement_rate: 71,
    running_days: 60,
    estimated_budget: "1k-5k",
    platform_metrics: JSON.stringify([
      { platform: "facebook", estimatedCTR: 2.3, estimatedConversionRate: 1.4 },
      { platform: "instagram", estimatedCTR: 1.9, estimatedConversionRate: 1.1 }
    ]),
    layouts: JSON.stringify([
      { platform: "facebook", aspectRatio: "1:1", gridStructure: { columns: 3, rows: 1 } }
    ]),
    color_palette: JSON.stringify({
      primary: "#9B59B6", secondary: "#8E44AD", accent: "#F1C40F",
      background: "#FFFFFF", text: "#2C3E50", contrast: 4.8
    }),
    typography: JSON.stringify({
      fontStack: ["Nunito", "Verdana", "sans-serif"],
      headlineSize: 28, bodySize: 12, ctaSize: 14
    }),
    background_type: "solid",
    content_blocks: JSON.stringify({
      headline: { placeholder: "Choose Your Plan", maxLength: 25, position: "top" },
      body: { placeholder: "Basic | Pro | Enterprise", maxLength: 100, position: "middle" },
      cta: { text: "Get Started", position: "bottom", style: "button-filled" }
    }),
    visual_patterns: ["three-column", "pricing-cards", "highlight-popular"],
    mood: "helpful",
    style: "structured",
    template_format: "html-css",
    editable_variables: ["plans", "prices", "features", "ctaText"],
    target_platforms: ["facebook", "instagram", "linkedin"],
    target_aspect_ratios: ["1:1", "4:5"],
    best_for_industries: ["saas", "services", "fitness", "education"],
    best_for_objectives: ["conversion"],
    is_active: true,
    is_featured: true
  },
  // Awareness Templates
  {
    name: "Bold Statement Banner",
    description: "Full-bleed bold text with minimal imagery. Maximum impact for brand awareness.",
    category: "awareness",
    source_platform: "manual",
    engagement_tier: "top-5",
    estimated_engagement_rate: 84,
    running_days: 30,
    estimated_budget: "5k-20k",
    platform_metrics: JSON.stringify([
      { platform: "instagram", estimatedCTR: 3.8, estimatedConversionRate: 0.8 },
      { platform: "tiktok", estimatedCTR: 4.2, estimatedConversionRate: 0.6 }
    ]),
    layouts: JSON.stringify([
      { platform: "instagram", aspectRatio: "9:16", gridStructure: { columns: 1, rows: 1 } },
      { platform: "tiktok", aspectRatio: "9:16", gridStructure: { columns: 1, rows: 1 } }
    ]),
    color_palette: JSON.stringify({
      primary: "#000000", secondary: "#FFFFFF", accent: "#FF0000",
      background: "#000000", text: "#FFFFFF", contrast: 21
    }),
    typography: JSON.stringify({
      fontStack: ["Impact", "Anton", "sans-serif"],
      headlineSize: 72, bodySize: 0, ctaSize: 24
    }),
    background_type: "solid",
    content_blocks: JSON.stringify({
      headline: { placeholder: "MAKE A STATEMENT", maxLength: 20, position: "center" },
      body: { placeholder: "", maxLength: 0, position: "none" },
      cta: { text: "Learn More", position: "bottom", style: "text-link" }
    }),
    visual_patterns: ["full-bleed", "bold-typography", "high-contrast"],
    mood: "bold",
    style: "minimalist",
    template_format: "html-css",
    editable_variables: ["headline", "backgroundColor", "textColor"],
    target_platforms: ["instagram", "tiktok", "twitter"],
    target_aspect_ratios: ["9:16", "1:1"],
    best_for_industries: ["fashion", "entertainment", "sports", "tech"],
    best_for_objectives: ["awareness", "engagement"],
    is_active: true,
    is_featured: true
  },
  {
    name: "Story Sequence Carousel",
    description: "Multi-slide narrative carousel. Perfect for storytelling and brand building.",
    category: "awareness",
    source_platform: "manual",
    engagement_tier: "top-10",
    estimated_engagement_rate: 79,
    running_days: 45,
    estimated_budget: "1k-5k",
    platform_metrics: JSON.stringify([
      { platform: "instagram", estimatedCTR: 3.1, estimatedConversionRate: 0.9 },
      { platform: "linkedin", estimatedCTR: 2.4, estimatedConversionRate: 0.7 }
    ]),
    layouts: JSON.stringify([
      { platform: "instagram", aspectRatio: "1:1", gridStructure: { columns: 1, rows: 1 }, slides: 5 }
    ]),
    color_palette: JSON.stringify({
      primary: "#1ABC9C", secondary: "#16A085", accent: "#F39C12",
      background: "#FFFFFF", text: "#2C3E50", contrast: 4.7
    }),
    typography: JSON.stringify({
      fontStack: ["Merriweather", "Georgia", "serif"],
      headlineSize: 28, bodySize: 16, ctaSize: 16
    }),
    background_type: "image",
    content_blocks: JSON.stringify({
      headline: { placeholder: "Our Story Begins...", maxLength: 30, position: "top" },
      body: { placeholder: "Each slide tells part of the journey", maxLength: 150, position: "center" },
      cta: { text: "Swipe to Continue", position: "bottom", style: "text-link" }
    }),
    visual_patterns: ["carousel-narrative", "consistent-branding", "story-arc"],
    mood: "inspirational",
    style: "editorial",
    template_format: "html-css",
    editable_variables: ["slides", "headlines", "images", "bodyText"],
    target_platforms: ["instagram", "linkedin", "facebook"],
    target_aspect_ratios: ["1:1", "4:5"],
    best_for_industries: ["nonprofit", "luxury", "travel", "lifestyle"],
    best_for_objectives: ["awareness", "engagement"],
    is_active: true,
    is_featured: false
  },
  {
    name: "UGC Style Testimonial",
    description: "User-generated content style with authentic feel. High trust and engagement.",
    category: "awareness",
    source_platform: "manual",
    engagement_tier: "top-5",
    estimated_engagement_rate: 89,
    running_days: 30,
    estimated_budget: "1k-5k",
    platform_metrics: JSON.stringify([
      { platform: "tiktok", estimatedCTR: 5.2, estimatedConversionRate: 1.8 },
      { platform: "instagram", estimatedCTR: 4.1, estimatedConversionRate: 1.5 }
    ]),
    layouts: JSON.stringify([
      { platform: "tiktok", aspectRatio: "9:16", gridStructure: { columns: 1, rows: 1 } },
      { platform: "instagram", aspectRatio: "9:16", gridStructure: { columns: 1, rows: 1 } }
    ]),
    color_palette: JSON.stringify({
      primary: "#FF6B6B", secondary: "#4ECDC4", accent: "#FFE66D",
      background: "dynamic", text: "#FFFFFF", contrast: 4.5
    }),
    typography: JSON.stringify({
      fontStack: ["system-ui", "-apple-system", "sans-serif"],
      headlineSize: 24, bodySize: 18, ctaSize: 16
    }),
    background_type: "video",
    content_blocks: JSON.stringify({
      headline: { placeholder: "POV: You just discovered...", maxLength: 40, position: "top" },
      body: { placeholder: "Authentic testimonial text here", maxLength: 100, position: "center" },
      cta: { text: "Link in Bio", position: "bottom", style: "native-cta" }
    }),
    visual_patterns: ["ugc-authentic", "native-format", "vertical-video"],
    mood: "authentic",
    style: "casual",
    template_format: "react",
    editable_variables: ["headline", "testimonial", "videoBackground"],
    target_platforms: ["tiktok", "instagram"],
    target_aspect_ratios: ["9:16"],
    best_for_industries: ["beauty", "fashion", "food", "lifestyle"],
    best_for_objectives: ["awareness", "engagement", "conversion"],
    is_active: true,
    is_featured: true
  }
];

// Placeholder image
const PLACEHOLDER_PREVIEW = "https://res.cloudinary.com/dq1h66xvf/image/upload/v1735334139/nds-logo_wnlmue.png";
const PLACEHOLDER_PUBLIC_ID = "nds-logo_wnlmue";

async function seedPerformingTemplates() {
  console.log("Starting performing ad template seeding...\n");

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Get or create a user for the templates
    let userId: string;
    const userResult = await pool.query("SELECT id FROM users LIMIT 1");

    if (userResult.rows.length === 0) {
      console.log("No users found. Creating template-admin user...");
      const newUserResult = await pool.query(
        "INSERT INTO users (id, username, password_hash, created_at) VALUES (gen_random_uuid(), 'template-admin', 'not-for-login', NOW()) RETURNING id"
      );
      userId = newUserResult.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    console.log("Using user ID:", userId, "\n");

    let created = 0;
    let skipped = 0;

    for (const t of sampleTemplates) {
      // Check if template with same name exists
      const existingResult = await pool.query(
        "SELECT id FROM performing_ad_templates WHERE name = $1 LIMIT 1",
        [t.name]
      );

      if (existingResult.rows.length > 0) {
        console.log("Skipping", t.name, "- already exists");
        skipped++;
        continue;
      }

      // Insert template
      await pool.query(`
        INSERT INTO performing_ad_templates (
          id, user_id, name, description, category, source_platform,
          engagement_tier, estimated_engagement_rate, running_days, estimated_budget,
          platform_metrics, layouts, color_palette, typography,
          background_type, content_blocks, visual_patterns, mood, style,
          template_format, preview_image_url, preview_public_id,
          editable_variables, target_platforms, target_aspect_ratios,
          best_for_industries, best_for_objectives,
          is_active, is_featured, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, $20, $21,
          $22, $23, $24,
          $25, $26,
          $27, $28, NOW(), NOW()
        )
      `, [
        userId,
        t.name,
        t.description,
        t.category,
        t.source_platform,
        t.engagement_tier,
        t.estimated_engagement_rate,
        t.running_days,
        t.estimated_budget,
        t.platform_metrics,
        t.layouts,
        t.color_palette,
        t.typography,
        t.background_type,
        t.content_blocks,
        t.visual_patterns,
        t.mood,
        t.style,
        t.template_format,
        PLACEHOLDER_PREVIEW,
        PLACEHOLDER_PUBLIC_ID,
        t.editable_variables,
        t.target_platforms,
        t.target_aspect_ratios,
        t.best_for_industries,
        t.best_for_objectives,
        t.is_active,
        t.is_featured
      ]);

      console.log("Created:", t.name, "(", t.category, ",", t.engagement_tier, ")");
      created++;
    }

    console.log("\nSummary:");
    console.log("  Created:", created);
    console.log("  Skipped:", skipped);
    console.log("  Total:", sampleTemplates.length);
    console.log("\nSeeding complete!");

  } finally {
    await pool.end();
  }
}

// Run the seed
seedPerformingTemplates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
