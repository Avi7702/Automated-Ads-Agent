import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, serial, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  passwordHash: text("password_hash"), // For bcrypt hashed passwords
  failedAttempts: integer("failed_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  brandVoice: jsonb("brand_voice"), // { principles: string[], wordsToAvoid: string[], wordsToUse: string[] }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generations = pgTable("generations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  originalImagePaths: text("original_image_paths").array().notNull(),
  generatedImagePath: text("generated_image_path").notNull(),
  imagePath: text("image_path"), // File path for stored image
  resolution: varchar("resolution", { length: 10 }).default("2K"),
  model: text("model"), // AI model used for generation
  aspectRatio: varchar("aspect_ratio", { length: 10 }).default("1:1"),
  status: varchar("status", { length: 20 }).default("completed"),
  conversationHistory: jsonb("conversation_history"),
  parentGenerationId: varchar("parent_generation_id"),
  editPrompt: text("edit_prompt"),
  editCount: integer("edit_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cloudinaryUrl: text("cloudinary_url").notNull(),
  cloudinaryPublicId: text("cloudinary_public_id").notNull(),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promptTemplates = pgTable("prompt_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  category: varchar("category", { length: 100 }),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adCopy = pgTable("ad_copy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  generationId: varchar("generation_id").notNull().references(() => generations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Core copy components
  headline: text("headline").notNull(),
  hook: text("hook").notNull(),
  bodyText: text("body_text").notNull(),
  cta: text("cta").notNull(),
  caption: text("caption").notNull(),
  hashtags: text("hashtags").array().notNull(),

  // Platform and tone context
  platform: varchar("platform", { length: 50 }).notNull(), // instagram, linkedin, twitter, facebook, tiktok
  tone: varchar("tone", { length: 50 }).notNull(), // professional, casual, fun, luxury, minimal, authentic
  framework: varchar("framework", { length: 50 }), // aida, pas, bab, fab, auto
  campaignObjective: varchar("campaign_objective", { length: 50 }), // awareness, consideration, conversion, engagement

  // Product context
  productName: text("product_name").notNull(),
  productDescription: text("product_description").notNull(),
  productBenefits: text("product_benefits").array(),
  uniqueValueProp: text("unique_value_prop"),
  industry: varchar("industry", { length: 100 }).notNull(),

  // Advanced context
  targetAudience: jsonb("target_audience"), // { demographics, psychographics, painPoints }
  brandVoice: jsonb("brand_voice"), // { principles, wordsToAvoid, wordsToUse }
  socialProof: jsonb("social_proof"), // { testimonial, stats }

  // Quality metrics
  qualityScore: jsonb("quality_score"), // { clarity, persuasiveness, platformFit, brandAlignment, overallScore, reasoning }
  characterCounts: jsonb("character_counts"), // { headline, body, caption, total }

  // Variation tracking
  variationNumber: integer("variation_number").default(1),
  parentCopyId: varchar("parent_copy_id"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// INTELLIGENT IDEA BANK TABLES
// ============================================

/**
 * Ad Scene Templates - Visual templates for ad generation
 * Supports exact_insert and inspiration modes
 */
export const adSceneTemplates = pgTable("ad_scene_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),

  // Preview image (required for template browsing)
  previewImageUrl: text("preview_image_url").notNull(),
  previewPublicId: text("preview_public_id").notNull(),

  // Reference images for exact_insert mode (optional, up to 5)
  referenceImages: jsonb("reference_images"), // [{ url: string, publicId: string }]

  // Categorization
  category: varchar("category", { length: 50 }).notNull(), // lifestyle, professional, outdoor, luxury, seasonal
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),

  // Platform targeting hints
  platformHints: text("platform_hints").array(), // instagram, linkedin, facebook, twitter, tiktok
  aspectRatioHints: text("aspect_ratio_hints").array(), // 1:1, 9:16, 16:9, 4:5

  // Prompt engineering
  promptBlueprint: text("prompt_blueprint").notNull(), // Base prompt with {{product}} placeholder
  placementHints: jsonb("placement_hints"), // { position: 'center'|'left'|'right', scale: 'small'|'medium'|'large' }
  lightingStyle: varchar("lighting_style", { length: 50 }), // natural, studio, dramatic, soft

  // Extended metadata for matching
  intent: varchar("intent", { length: 50 }), // showcase, installation, before-after, scale-demo
  environment: varchar("environment", { length: 50 }), // indoor, outdoor, studio, worksite
  mood: varchar("mood", { length: 50 }), // luxury, cozy, industrial, minimal, vibrant
  bestForProductTypes: text("best_for_product_types").array(), // flooring, furniture, decor, etc.

  // Access control
  isGlobal: boolean("is_global").default(true).notNull(),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Brand Profiles - Extended brand configuration per user
 * Enhances the existing brandVoice in users table
 */
export const brandProfiles = pgTable("brand_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),

  // Brand identity
  brandName: text("brand_name"),
  industry: varchar("industry", { length: 100 }),
  brandValues: text("brand_values").array(), // eco-friendly, luxury, accessible, innovative

  // Target audience (enhanced)
  targetAudience: jsonb("target_audience"), // { demographics: string, psychographics: string, painPoints: string[] }

  // Visual preferences
  preferredStyles: text("preferred_styles").array(), // modern, rustic, minimalist, bold
  colorPreferences: text("color_preferences").array(), // neutral, vibrant, earth-tones

  // Voice (syncs with users.brandVoice)
  voice: jsonb("voice"), // { principles: string[], wordsToUse: string[], wordsToAvoid: string[] }

  // KB integration
  kbTags: text("kb_tags").array(), // Tags to filter KB content

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Product Analyses - Cached vision analysis results
 * Uses imageFingerprint for cache invalidation
 */
export const productAnalyses = pgTable("product_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),

  // Cache key - cloudinaryPublicId + version for invalidation
  imageFingerprint: text("image_fingerprint").notNull(),

  // Vision analysis results
  category: varchar("category", { length: 100 }), // flooring, furniture, decor, fixture
  subcategory: varchar("subcategory", { length: 100 }), // hardwood, tile, laminate
  materials: text("materials").array(), // wood, ceramic, metal, glass
  colors: text("colors").array(), // oak, gray, white, navy
  style: varchar("style", { length: 50 }), // modern, traditional, rustic, industrial
  usageContext: text("usage_context"), // residential living room, commercial office
  targetDemographic: text("target_demographic"), // homeowners, contractors, designers
  detectedText: text("detected_text"), // Any text visible on product/packaging

  // Analysis metadata
  confidence: integer("confidence").default(80), // 0-100
  modelVersion: varchar("model_version", { length: 50 }), // gemini-3-pro-preview
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint on productId to ensure one analysis per product
  productIdUnique: unique().on(table.productId),
}));


// ============================================
// GENERATION USAGE (COST ESTIMATION)
// ============================================

export const generationUsage = pgTable("generation_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  generationId: varchar("generation_id")
    .notNull()
    .references(() => generations.id, { onDelete: "cascade" })
    .unique(),

  // Brand/tenant scope (for now, can equal userId)
  brandId: varchar("brand_id").notNull(),

  model: text("model").notNull(),
  operation: varchar("operation", { length: 20 }).notNull(), // generate | edit
  resolution: varchar("resolution", { length: 10 }).notNull(), // 1K | 2K | 4K

  inputImagesCount: integer("input_images_count").notNull(),
  promptChars: integer("prompt_chars").notNull(),
  durationMs: integer("duration_ms").notNull(),

  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),

  // Store micros USD to avoid float rounding
  estimatedCostMicros: integer("estimated_cost_micros").notNull(),
  estimationSource: varchar("estimation_source", { length: 20 }).notNull(), // usageMetadata | pricingFormula | fallback

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGenerationSchema = createInsertSchema(generations).omit({
  id: true,
  createdAt: true,
});
export type InsertGeneration = z.infer<typeof insertGenerationSchema>;
export type Generation = typeof generations.$inferSelect;

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const insertPromptTemplateSchema = createInsertSchema(promptTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertAdCopySchema = createInsertSchema(adCopy).omit({
  id: true,
  createdAt: true,
});

export const insertGenerationUsageSchema = createInsertSchema(generationUsage).omit({
  id: true,
  createdAt: true,
});
export type InsertGenerationUsage = z.infer<typeof insertGenerationUsageSchema>;
export type GenerationUsage = typeof generationUsage.$inferSelect;

export type InsertPromptTemplate = z.infer<typeof insertPromptTemplateSchema>;
export type PromptTemplate = typeof promptTemplates.$inferSelect;

export type InsertAdCopy = z.infer<typeof insertAdCopySchema>;
export type AdCopy = typeof adCopy.$inferSelect;

// ============================================
// INTELLIGENT IDEA BANK SCHEMAS & TYPES
// ============================================

export const insertAdSceneTemplateSchema = createInsertSchema(adSceneTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertBrandProfileSchema = createInsertSchema(brandProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductAnalysisSchema = createInsertSchema(productAnalyses).omit({
  id: true,
  createdAt: true,
});

export type InsertAdSceneTemplate = z.infer<typeof insertAdSceneTemplateSchema>;
export type AdSceneTemplate = typeof adSceneTemplates.$inferSelect;

export type InsertBrandProfile = z.infer<typeof insertBrandProfileSchema>;
export type BrandProfile = typeof brandProfiles.$inferSelect;

export type InsertProductAnalysis = z.infer<typeof insertProductAnalysisSchema>;
export type ProductAnalysis = typeof productAnalyses.$inferSelect;
