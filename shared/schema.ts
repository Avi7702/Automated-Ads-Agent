import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, serial, boolean, unique, index, real } from "drizzle-orm/pg-core";
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

  // Phase 0.5: Product Knowledge Fields
  description: text("description"), // What the product is, how it's used
  features: jsonb("features"), // { width: '5 inches', thickness: '5/8 inch', installation: ['glue', 'nail', 'float'] }
  benefits: text("benefits").array(), // ['Durable', 'Easy to maintain', 'Works with radiant heat']
  specifications: jsonb("specifications"), // { boxCoverage: '20 sq ft', planksPerBox: 8 }
  tags: text("tags").array().default(sql`ARRAY[]::text[]`), // ['oak', 'engineered', 'hardwood']
  sku: varchar("sku", { length: 100 }), // Product SKU for inventory reference

  // Product Enrichment Workflow
  enrichmentStatus: varchar("enrichment_status", { length: 20 }).default("pending"), // pending | draft | verified | complete
  enrichmentDraft: jsonb("enrichment_draft"), // AI-generated draft awaiting user verification
  enrichmentVerifiedAt: timestamp("enrichment_verified_at"), // When user verified the data
  enrichmentSource: varchar("enrichment_source", { length: 50 }), // ai_vision | ai_search | user_manual | imported

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
  tone: varchar("tone", { length: 50 }).notNull(), // professional, casual, technical, urgent, minimal, authentic
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
  category: varchar("category", { length: 50 }).notNull(), // product_showcase, installation, worksite, professional, outdoor
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
  mood: varchar("mood", { length: 50 }), // industrial, professional, bold, minimal, urgent
  bestForProductTypes: text("best_for_product_types").array(), // rebar, mesh, spacers, tie-wire, membranes, etc.

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
  brandValues: text("brand_values").array(), // reliable, quality, fast-delivery, no-minimums, professional

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
// PHASE 0.5: PRODUCT KNOWLEDGE TABLES
// ============================================

/**
 * Installation Scenarios - Real-world usage contexts for products
 * Helps AI understand how products are installed and used together
 */
export const installationScenarios = pgTable("installation_scenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Scenario definition
  title: text("title").notNull(),
  description: text("description").notNull(),
  scenarioType: varchar("scenario_type", { length: 50 }).notNull(), // room_type, application, before_after

  // Products involved
  primaryProductId: varchar("primary_product_id").references(() => products.id, { onDelete: "set null" }),
  secondaryProductIds: text("secondary_product_ids").array(), // Related products

  // Visual references
  referenceImages: jsonb("reference_images"), // [{ cloudinaryUrl, publicId, caption }]

  // Installation details
  installationSteps: text("installation_steps").array(),
  requiredAccessories: text("required_accessories").array(), // underlayment, trim, adhesive, etc.

  // Targeting
  roomTypes: text("room_types").array(), // living room, bedroom, kitchen, commercial
  styleTags: text("style_tags").array(), // modern, rustic, traditional

  // Status
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Product Relationships - How products relate to each other
 * Helps AI understand product ecosystem and pairings
 */
export const productRelationships = pgTable("product_relationships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Relationship definition
  sourceProductId: varchar("source_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  targetProductId: varchar("target_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  relationshipType: varchar("relationship_type", { length: 50 }).notNull(), // pairs_with, requires, replaces, matches, completes, upgrades

  // Relationship metadata
  description: text("description"),
  isRequired: boolean("is_required").default(false),
  displayOrder: integer("display_order").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate relationships
  uniqueRelationship: unique().on(table.sourceProductId, table.targetProductId, table.relationshipType),
}));

/**
 * Brand Images - Categorized images for AI reference
 * Provides visual context for style matching and ad generation
 */
export const brandImages = pgTable("brand_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Image storage
  cloudinaryUrl: text("cloudinary_url").notNull(),
  cloudinaryPublicId: text("cloudinary_public_id").notNull(),

  // Categorization
  category: varchar("category", { length: 50 }).notNull(), // historical_ad, product_hero, installation, detail, lifestyle, comparison
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  description: text("description"),

  // Associations
  productIds: text("product_ids").array(), // Products shown in this image
  scenarioId: varchar("scenario_id").references(() => installationScenarios.id, { onDelete: "set null" }),

  // Usage hints
  suggestedUse: text("suggested_use").array(), // hero, detail, comparison, installation, social_media
  aspectRatio: varchar("aspect_ratio", { length: 10 }), // 1:1, 16:9, 4:5, 9:16

  createdAt: timestamp("created_at").defaultNow().notNull(),
});


// ============================================
// PERFORMING AD TEMPLATES LIBRARY
// ============================================

/**
 * Performing Ad Templates - High-performing ad templates sourced from
 * AdSpy, BigSpy, Envato, etc. for reference and inspiration
 */
export const performingAdTemplates = pgTable("performing_ad_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Basic info
  name: text("name").notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // ecommerce, saas, services, awareness

  // Source tracking
  sourceUrl: text("source_url"),
  sourcePlatform: varchar("source_platform", { length: 50 }), // adspy, bigspy, envato, canva, figma, manual
  advertiserName: text("advertiser_name"),

  // Performance metrics (estimated)
  engagementTier: varchar("engagement_tier", { length: 20 }), // top-5, top-10, top-25, unranked
  estimatedEngagementRate: integer("estimated_engagement_rate"), // 0-100
  runningDays: integer("running_days"),
  estimatedBudget: varchar("estimated_budget", { length: 20 }), // under-1k, 1k-5k, 5k-20k, 20k+

  // Platform-specific metrics
  platformMetrics: jsonb("platform_metrics"), // [{ platform, estimatedCTR, estimatedConversionRate }]

  // Design specifications
  layouts: jsonb("layouts"), // [{ platform, aspectRatio, gridStructure, primaryFocusArea }]
  colorPalette: jsonb("color_palette"), // { primary, secondary, accent, background, text, contrast }
  typography: jsonb("typography"), // { fontStack, headlineSize, bodySize, ctaSize }
  backgroundType: varchar("background_type", { length: 20 }), // solid, gradient, image, video

  // Content blocks
  contentBlocks: jsonb("content_blocks"), // { headline, body, cta } with placeholders and positions

  // Visual patterns for AI matching
  visualPatterns: text("visual_patterns").array(), // detected patterns for similarity search
  mood: varchar("mood", { length: 50 }), // industrial, professional, bold, minimal, urgent
  style: varchar("style", { length: 50 }), // modern, classic, playful, professional

  // Implementation
  templateFormat: varchar("template_format", { length: 20 }), // figma, canva, html-css, react, image
  sourceFileUrl: text("source_file_url"),
  previewImageUrl: text("preview_image_url"),
  previewPublicId: text("preview_public_id"),
  editableVariables: text("editable_variables").array(), // variables that can be customized

  // Targeting
  targetPlatforms: text("target_platforms").array(), // instagram, facebook, linkedin, twitter, tiktok
  targetAspectRatios: text("target_aspect_ratios").array(), // 1:1, 16:9, 9:16, 4:5
  bestForIndustries: text("best_for_industries").array(),
  bestForObjectives: text("best_for_objectives").array(), // awareness, consideration, conversion

  // Status
  isActive: boolean("is_active").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


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

// ============================================
// PHASE 0.5: PRODUCT KNOWLEDGE SCHEMAS & TYPES
// ============================================

// Validation schemas with enum constraints
const scenarioTypeEnum = z.enum(['room_type', 'application', 'before_after']);
const relationshipTypeEnum = z.enum(['pairs_with', 'requires', 'replaces', 'matches', 'completes', 'upgrades']);
const brandImageCategoryEnum = z.enum(['historical_ad', 'product_hero', 'installation', 'detail', 'lifestyle', 'comparison']);

export const insertInstallationScenarioSchema = createInsertSchema(installationScenarios, {
  scenarioType: scenarioTypeEnum,
}).omit({
  id: true,
  createdAt: true,
});

export const insertProductRelationshipSchema = createInsertSchema(productRelationships, {
  relationshipType: relationshipTypeEnum,
}).omit({
  id: true,
  createdAt: true,
});

export const insertBrandImageSchema = createInsertSchema(brandImages, {
  category: brandImageCategoryEnum,
}).omit({
  id: true,
  createdAt: true,
});

export type InsertInstallationScenario = z.infer<typeof insertInstallationScenarioSchema>;
export type InstallationScenario = typeof installationScenarios.$inferSelect;

export type InsertProductRelationship = z.infer<typeof insertProductRelationshipSchema>;
export type ProductRelationship = typeof productRelationships.$inferSelect;

export type InsertBrandImage = z.infer<typeof insertBrandImageSchema>;
export type BrandImage = typeof brandImages.$inferSelect;

// Performing Ad Templates enum constraints
const templateCategoryEnum = z.enum(['product_showcase', 'installation', 'urgency', 'testimonial', 'educational']);
const sourcePlatformEnum = z.enum(['adspy', 'bigspy', 'envato', 'canva', 'figma', 'manual']);
const engagementTierEnum = z.enum(['top-5', 'top-10', 'top-25', 'unranked']);
const estimatedBudgetEnum = z.enum(['under-1k', '1k-5k', '5k-20k', '20k+']);
const backgroundTypeEnum = z.enum(['solid', 'gradient', 'image', 'video']);
const templateFormatEnum = z.enum(['figma', 'canva', 'html-css', 'react', 'image']);
const templateMoodEnum = z.enum(['industrial', 'professional', 'bold', 'minimal', 'urgent']);
const templateStyleEnum = z.enum(['modern', 'classic', 'playful', 'professional']);

export const insertPerformingAdTemplateSchema = createInsertSchema(performingAdTemplates, {
  category: templateCategoryEnum,
  sourcePlatform: sourcePlatformEnum.optional(),
  engagementTier: engagementTierEnum.optional(),
  estimatedBudget: estimatedBudgetEnum.optional(),
  backgroundType: backgroundTypeEnum.optional(),
  templateFormat: templateFormatEnum.optional(),
  mood: templateMoodEnum.optional(),
  style: templateStyleEnum.optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPerformingAdTemplate = z.infer<typeof insertPerformingAdTemplateSchema>;
export type PerformingAdTemplate = typeof performingAdTemplates.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertSessionSchema = createInsertSchema(sessions);
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// ============================================
// GEMINI API QUOTA MONITORING TABLES
// ============================================

/**
 * Aggregated usage metrics by time window
 * Stores minute/hour/day level metrics for dashboard display
 */
export const geminiQuotaMetrics = pgTable("gemini_quota_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Time window
  windowType: varchar("window_type", { length: 20 }).notNull(), // 'minute' | 'hour' | 'day'
  windowStart: timestamp("window_start").notNull(),
  windowEnd: timestamp("window_end").notNull(),

  // Scope
  brandId: varchar("brand_id").notNull(),

  // Request metrics
  requestCount: integer("request_count").default(0).notNull(),
  successCount: integer("success_count").default(0).notNull(),
  errorCount: integer("error_count").default(0).notNull(),
  rateLimitCount: integer("rate_limit_count").default(0).notNull(),

  // Token metrics
  inputTokensTotal: integer("input_tokens_total").default(0).notNull(),
  outputTokensTotal: integer("output_tokens_total").default(0).notNull(),

  // Cost metrics (in micros USD)
  estimatedCostMicros: integer("estimated_cost_micros").default(0).notNull(),

  // Breakdown by operation
  generateCount: integer("generate_count").default(0).notNull(),
  editCount: integer("edit_count").default(0).notNull(),
  analyzeCount: integer("analyze_count").default(0).notNull(),

  // Breakdown by model (jsonb for flexibility)
  modelBreakdown: jsonb("model_breakdown"), // { "gemini-3-pro-image": 10, "gemini-3-flash": 5 }

  // Latency percentiles (in ms)
  latencyP50: integer("latency_p50"),
  latencyP90: integer("latency_p90"),
  latencyP99: integer("latency_p99"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint on window + brand
  uniqueWindow: unique().on(table.windowType, table.windowStart, table.brandId),
}));

/**
 * Rate limit event log
 * Records each time a 429 error is encountered
 */
export const geminiRateLimitEvents = pgTable("gemini_rate_limit_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  brandId: varchar("brand_id").notNull(),

  // Event details
  operation: varchar("operation", { length: 20 }).notNull(), // 'generate' | 'edit' | 'analyze'
  model: varchar("model", { length: 100 }).notNull(),

  // Rate limit info
  limitType: varchar("limit_type", { length: 20 }).notNull(), // 'rpm' | 'rpd' | 'tpm' | 'tpd'
  retryAfterSeconds: integer("retry_after_seconds"),

  // Context
  endpoint: varchar("endpoint", { length: 100 }),
  requestMetadata: jsonb("request_metadata"), // { resolution, imageCount, promptLength }

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Quota alert configurations
 * User-configurable warning thresholds
 */
export const geminiQuotaAlerts = pgTable("gemini_quota_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  brandId: varchar("brand_id").notNull(),

  // Alert configuration
  alertType: varchar("alert_type", { length: 30 }).notNull(), // 'rpm_threshold' | 'rpd_threshold' | 'token_threshold' | 'cost_threshold'
  thresholdValue: integer("threshold_value").notNull(), // Percent of limit (e.g., 80 for 80%)
  isEnabled: boolean("is_enabled").default(true).notNull(),

  // Last triggered
  lastTriggeredAt: timestamp("last_triggered_at"),
  triggerCount: integer("trigger_count").default(0).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Quota monitoring schemas and types
export const insertGeminiQuotaMetricsSchema = createInsertSchema(geminiQuotaMetrics).omit({
  id: true,
  createdAt: true,
});
export type InsertGeminiQuotaMetrics = z.infer<typeof insertGeminiQuotaMetricsSchema>;
export type GeminiQuotaMetrics = typeof geminiQuotaMetrics.$inferSelect;

export const insertGeminiRateLimitEventSchema = createInsertSchema(geminiRateLimitEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertGeminiRateLimitEvent = z.infer<typeof insertGeminiRateLimitEventSchema>;
export type GeminiRateLimitEvent = typeof geminiRateLimitEvents.$inferSelect;

export const insertGeminiQuotaAlertSchema = createInsertSchema(geminiQuotaAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGeminiQuotaAlert = z.infer<typeof insertGeminiQuotaAlertSchema>;
export type GeminiQuotaAlert = typeof geminiQuotaAlerts.$inferSelect;

// ============================================
// GOOGLE CLOUD MONITORING SYNC TABLES
// ============================================

/**
 * Google Cloud Monitoring quota snapshots
 * Stores synced data from Google Cloud Monitoring API
 * Updated every 15 minutes via background job
 */
export const googleQuotaSnapshots = pgTable("google_quota_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Sync metadata
  syncedAt: timestamp("synced_at").notNull(),
  nextSyncAt: timestamp("next_sync_at").notNull(),
  syncStatus: varchar("sync_status", { length: 20 }).notNull(), // 'success' | 'partial' | 'failed'
  errorMessage: text("error_message"),

  // Google Cloud context
  projectId: varchar("project_id", { length: 100 }).notNull(),
  service: varchar("service", { length: 200 }).notNull(), // 'generativelanguage.googleapis.com'

  // Quota data (stored as JSONB for flexibility)
  quotas: jsonb("quotas").notNull(), // Array of { metricName, displayName, usage, limit, percentage, unit }

  // For historical tracking
  brandId: varchar("brand_id"), // Optional: scope to specific brand/tenant

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Sync job history
 * Tracks all sync attempts for debugging and audit
 */
export const googleQuotaSyncHistory = pgTable("google_quota_sync_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Sync details
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),

  // Status
  status: varchar("status", { length: 20 }).notNull(), // 'running' | 'success' | 'partial' | 'failed'
  errorMessage: text("error_message"),

  // Metrics fetched
  metricsRequested: integer("metrics_requested").default(0).notNull(),
  metricsFetched: integer("metrics_fetched").default(0).notNull(),

  // Trigger type
  triggerType: varchar("trigger_type", { length: 20 }).notNull(), // 'scheduled' | 'manual' | 'startup'

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Google Cloud Monitoring schemas and types
export const insertGoogleQuotaSnapshotSchema = createInsertSchema(googleQuotaSnapshots).omit({
  id: true,
  createdAt: true,
});
export type InsertGoogleQuotaSnapshot = z.infer<typeof insertGoogleQuotaSnapshotSchema>;
export type GoogleQuotaSnapshot = typeof googleQuotaSnapshots.$inferSelect;

export const insertGoogleQuotaSyncHistorySchema = createInsertSchema(googleQuotaSyncHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertGoogleQuotaSyncHistory = z.infer<typeof insertGoogleQuotaSyncHistorySchema>;
export type GoogleQuotaSyncHistory = typeof googleQuotaSyncHistory.$inferSelect;

// ============================================
// API KEY MANAGEMENT TABLES (Phase 7)
// ============================================

/**
 * User API Keys - Encrypted storage for user-provided API keys
 * Allows users to use their own API keys instead of environment defaults
 * Keys are encrypted with AES-256-GCM at rest
 */
export const userApiKeys = pgTable("user_api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Service identification
  service: varchar("service", { length: 50 }).notNull(), // gemini, cloudinary, firecrawl, redis

  // Encrypted key storage (AES-256-GCM)
  encryptedKey: text("encrypted_key").notNull(), // Base64 encoded ciphertext
  iv: text("iv").notNull(), // Base64 encoded initialization vector (12 bytes)
  authTag: text("auth_tag").notNull(), // Base64 encoded authentication tag (16 bytes)

  // Display preview (first 4 + last 6 chars, e.g., "AIza...xyz789")
  keyPreview: varchar("key_preview", { length: 20 }),

  // Validation status
  isValid: boolean("is_valid").default(true).notNull(),
  lastValidatedAt: timestamp("last_validated_at"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Each user can only have one key per service
  uniqueUserService: unique().on(table.userId, table.service),
}));

/**
 * API Key Audit Log - Tracks all key operations for security compliance
 * Records create, update, delete, validate, and use events
 */
export const apiKeyAuditLog = pgTable("api_key_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Action details
  service: varchar("service", { length: 50 }).notNull(), // gemini, cloudinary, firecrawl, redis
  action: varchar("action", { length: 20 }).notNull(), // create, update, delete, validate, use

  // Request context (for security auditing)
  ipAddress: varchar("ip_address", { length: 45 }), // IPv6 max length
  userAgent: text("user_agent"),

  // Outcome
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),

  // Timestamp
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// API Key Management enum constraints
const apiKeyServiceEnum = z.enum(['gemini', 'cloudinary', 'firecrawl', 'redis']);
const apiKeyActionEnum = z.enum(['create', 'update', 'delete', 'validate', 'use']);

// Insert schemas
export const insertUserApiKeySchema = createInsertSchema(userApiKeys, {
  service: apiKeyServiceEnum,
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApiKeyAuditLogSchema = createInsertSchema(apiKeyAuditLog, {
  service: apiKeyServiceEnum,
  action: apiKeyActionEnum,
}).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type InsertUserApiKey = z.infer<typeof insertUserApiKeySchema>;
export type UserApiKey = typeof userApiKeys.$inferSelect;

export type InsertApiKeyAuditLog = z.infer<typeof insertApiKeyAuditLogSchema>;
export type ApiKeyAuditLog = typeof apiKeyAuditLog.$inferSelect;

// Re-export enums for use in validation
export { apiKeyServiceEnum, apiKeyActionEnum };

// ============================================
// LEARN FROM WINNERS - AD PATTERN EXTRACTION
// ============================================

/**
 * Learned Ad Patterns - Extracted abstract patterns from high-performing ads
 * Stores layout, color, hook, and visual patterns (NO actual text content)
 * Used to enhance ad generation with proven success patterns
 */
export const learnedAdPatterns = pgTable("learned_ad_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Core fields
  name: text("name").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // product_showcase, testimonial, comparison, educational, promotional
  platform: varchar("platform", { length: 50 }).notNull(), // linkedin, facebook, instagram, twitter, tiktok
  industry: varchar("industry", { length: 100 }),

  // Extracted patterns (JSONB) - NO TEXT CONTENT, only abstract patterns
  layoutPattern: jsonb("layout_pattern").$type<{
    structure: string; // "hero-top", "split-50-50", "text-overlay", "grid"
    visualHierarchy: string[]; // ["image", "headline", "cta"]
    whitespaceUsage: "minimal" | "balanced" | "generous";
    focalPointPosition: string; // "center", "top-left", "bottom-right"
  }>(),

  colorPsychology: jsonb("color_psychology").$type<{
    dominantMood: string; // "trust", "urgency", "premium", "friendly"
    colorScheme: "monochromatic" | "complementary" | "analogous" | "triadic";
    contrastLevel: "low" | "medium" | "high";
    emotionalTone: string; // "warm", "cool", "neutral", "vibrant"
  }>(),

  hookPatterns: jsonb("hook_patterns").$type<{
    hookType: string; // "question", "statistic", "pain-point", "benefit", "curiosity"
    headlineFormula: string; // "How to X without Y", "X% of people..." - formula only, not text
    ctaStyle: "soft" | "direct" | "urgency";
    persuasionTechnique: string; // "social-proof", "scarcity", "authority", "reciprocity"
  }>(),

  visualElements: jsonb("visual_elements").$type<{
    imageStyle: "photography" | "illustration" | "mixed" | "3d-render" | "abstract";
    humanPresence: boolean;
    productVisibility: "prominent" | "subtle" | "none";
    iconography: boolean;
    backgroundType: "solid" | "gradient" | "image" | "pattern";
  }>(),

  // Quality metrics
  engagementTier: varchar("engagement_tier", { length: 20 }), // top-1, top-5, top-10, unverified
  confidenceScore: real("confidence_score").default(0.8), // 0.0-1.0 extraction confidence

  // Deduplication
  sourceHash: text("source_hash").notNull(), // SHA-256 of uploaded image

  // Usage tracking
  usageCount: integer("usage_count").default(0).notNull(),
  lastUsedAt: timestamp("last_used_at"),

  // Status
  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueSourceHash: unique().on(table.userId, table.sourceHash),
  idxUserId: index("idx_learned_patterns_user_id").on(table.userId),
  idxCategory: index("idx_learned_patterns_category").on(table.category),
  idxPlatform: index("idx_learned_patterns_platform").on(table.platform),
}));

/**
 * Ad Analysis Uploads - Tracks image uploads for pattern extraction
 * Original images deleted after extraction (24-hour TTL max)
 * Privacy-first: images are processed and discarded
 */
export const adAnalysisUploads = pgTable("ad_analysis_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Cloudinary storage (deleted after extraction)
  cloudinaryUrl: text("cloudinary_url").notNull(),
  cloudinaryPublicId: text("cloudinary_public_id").notNull(),

  // File metadata
  originalFilename: text("original_filename"),
  fileSizeBytes: integer("file_size_bytes"),
  mimeType: varchar("mime_type", { length: 100 }),

  // Processing status
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, scanning, extracting, completed, failed, expired
  errorMessage: text("error_message"),

  // Privacy scan results
  privacyScanResult: jsonb("privacy_scan_result").$type<{
    textDensity: number; // 0-100 percentage
    detectedBrands: string[];
    hasLogos: boolean;
    hasFaces: boolean;
    isSafeToProcess: boolean;
    rejectionReason?: string;
  }>(),

  // Link to extracted pattern (set null if pattern deleted)
  extractedPatternId: varchar("extracted_pattern_id").references(() => learnedAdPatterns.id, { onDelete: "set null" }),

  // Processing timing
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  processingDurationMs: integer("processing_duration_ms"),

  // TTL - 24 hours (reduced from 7 days for privacy)
  expiresAt: timestamp("expires_at").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  idxStatus: index("idx_uploads_status").on(table.status),
  idxExpires: index("idx_uploads_expires").on(table.expiresAt),
  idxUserId: index("idx_uploads_user_id").on(table.userId),
}));

/**
 * Pattern Application History - Tracks pattern usage and feedback
 * Used for pattern quality scoring and optimization
 */
export const patternApplicationHistory = pgTable("pattern_application_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // References
  patternId: varchar("pattern_id").notNull().references(() => learnedAdPatterns.id, { onDelete: "cascade" }),
  generatedAdId: varchar("generated_ad_id").references(() => generations.id, { onDelete: "cascade" }),
  productId: varchar("product_id").references(() => products.id, { onDelete: "set null" }),

  // Application context
  targetPlatform: varchar("target_platform", { length: 50 }),
  promptUsed: text("prompt_used"), // The prompt that included the pattern

  // Feedback
  userRating: integer("user_rating"), // 1-5
  wasUsed: boolean("was_used").default(false).notNull(), // Did user keep the result
  feedback: text("feedback"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  idxPatternId: index("idx_history_pattern_id").on(table.patternId),
  idxUserId: index("idx_history_user_id").on(table.userId),
  uniquePatternGeneration: unique().on(table.patternId, table.generatedAdId),
}));

// Learn from Winners enum constraints
const learnedPatternCategoryEnum = z.enum([
  'product_showcase', 'testimonial', 'comparison', 'educational', 'promotional', 'brand_awareness'
]);
const learnedPatternPlatformEnum = z.enum([
  'linkedin', 'facebook', 'instagram', 'twitter', 'tiktok', 'youtube', 'pinterest', 'general'
]);
const learnedPatternEngagementTierEnum = z.enum(['top-1', 'top-5', 'top-10', 'top-25', 'unverified']);
const uploadStatusEnum = z.enum(['pending', 'scanning', 'extracting', 'completed', 'failed', 'expired']);

// Insert schemas
export const insertLearnedAdPatternSchema = createInsertSchema(learnedAdPatterns, {
  category: learnedPatternCategoryEnum,
  platform: learnedPatternPlatformEnum,
  engagementTier: learnedPatternEngagementTierEnum.optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdAnalysisUploadSchema = createInsertSchema(adAnalysisUploads, {
  status: uploadStatusEnum,
}).omit({
  id: true,
  createdAt: true,
});

export const insertPatternApplicationHistorySchema = createInsertSchema(patternApplicationHistory).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type InsertLearnedAdPattern = z.infer<typeof insertLearnedAdPatternSchema>;
export type LearnedAdPattern = typeof learnedAdPatterns.$inferSelect;

export type InsertAdAnalysisUpload = z.infer<typeof insertAdAnalysisUploadSchema>;
export type AdAnalysisUpload = typeof adAnalysisUploads.$inferSelect;

export type InsertPatternApplicationHistory = z.infer<typeof insertPatternApplicationHistorySchema>;
export type PatternApplicationHistory = typeof patternApplicationHistory.$inferSelect;

// Re-export enums for use in validation
export {
  learnedPatternCategoryEnum,
  learnedPatternPlatformEnum,
  learnedPatternEngagementTierEnum,
  uploadStatusEnum,
};

// ============================================
// CONTENT PLANNER TABLES
// ============================================

/**
 * Content Planner Categories - Enum for the 6 content categories
 */
export const contentPlannerCategoryEnum = z.enum([
  'product_showcase',
  'educational',
  'industry_insights',
  'customer_success',
  'company_updates',
  'engagement'
]);

export const contentPlannerPlatformEnum = z.enum([
  'linkedin',
  'twitter',
  'facebook',
  'instagram',
  'tiktok'
]);

/**
 * Content Planner Posts - Tracks posts created using content planner templates
 * Used for balance tracking across the 6 content categories
 */
export const contentPlannerPosts = pgTable("content_planner_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Content categorization
  category: varchar("category", { length: 50 }).notNull(), // product_showcase, educational, industry_insights, customer_success, company_updates, engagement
  subType: varchar("sub_type", { length: 100 }).notNull(), // e.g., construction_best_practices, testimonials, etc.

  // Platform (optional - user may not specify)
  platform: varchar("platform", { length: 50 }), // linkedin, twitter, facebook, instagram, tiktok

  // Optional notes
  notes: text("notes"),

  // When the post was marked as completed
  postedAt: timestamp("posted_at").defaultNow().notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Index for efficient weekly balance queries
  idxUserPostedAt: index("idx_content_planner_user_posted").on(table.userId, table.postedAt),
  idxUserCategory: index("idx_content_planner_user_category").on(table.userId, table.category),
}));

// Insert schema
export const insertContentPlannerPostSchema = createInsertSchema(contentPlannerPosts, {
  category: contentPlannerCategoryEnum,
  platform: contentPlannerPlatformEnum.optional(),
}).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type InsertContentPlannerPost = z.infer<typeof insertContentPlannerPostSchema>;
export type ContentPlannerPost = typeof contentPlannerPosts.$inferSelect;

// ============================================
// SOCIAL MEDIA SCHEDULING TABLES (Phase 8)
// ============================================

/**
 * Social Platform enum for social connections
 */
export const socialPlatformEnum = z.enum(['linkedin', 'instagram']);

/**
 * Social Account Type enum
 */
export const socialAccountTypeEnum = z.enum(['personal', 'business', 'page']);

/**
 * Scheduled Post Status enum
 */
export const scheduledPostStatusEnum = z.enum([
  'draft',
  'scheduled',
  'publishing',
  'published',
  'failed',
  'cancelled',
  'account_disconnected'
]);

/**
 * Post Failure Reason enum
 */
export const postFailureReasonEnum = z.enum([
  'token_expired',
  'rate_limited',
  'content_policy_violation',
  'image_too_large',
  'image_format_invalid',
  'network_error',
  'api_error',
  'account_disconnected',
  'unknown'
]);

/**
 * Social Connections - OAuth tokens for LinkedIn/Instagram accounts
 * Tokens are encrypted with AES-256-GCM at rest
 */
export const socialConnections = pgTable("social_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Platform identification
  platform: varchar("platform", { length: 20 }).notNull(), // 'linkedin' | 'instagram'

  // Encrypted token storage (AES-256-GCM)
  accessToken: text("access_token").notNull(), // ENCRYPTED
  refreshToken: text("refresh_token"), // LinkedIn only, ENCRYPTED
  tokenIv: text("token_iv").notNull(), // Base64 encoded IV
  tokenAuthTag: text("token_auth_tag").notNull(), // Base64 encoded auth tag

  // Token lifecycle
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
  lastRefreshedAt: timestamp("last_refreshed_at"),

  // Platform user info
  platformUserId: varchar("platform_user_id", { length: 255 }),
  platformUsername: varchar("platform_username", { length: 255 }),
  profilePictureUrl: text("profile_picture_url"),

  // Account classification
  accountType: varchar("account_type", { length: 20 }), // 'personal' | 'business' | 'page'
  scopes: text("scopes").array(), // ['w_member_social', 'r_liteprofile']

  // Status
  isActive: boolean("is_active").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  lastErrorAt: timestamp("last_error_at"),
  lastErrorMessage: text("last_error_message"),

  connectedAt: timestamp("connected_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Index for efficient user lookups
  idxUserPlatform: index("idx_social_conn_user_platform").on(table.userId, table.platform),
  idxUserId: index("idx_social_conn_user_id").on(table.userId),
}));

/**
 * Scheduled Posts - Posts queued for automatic publishing
 * Supports LinkedIn and Instagram with status tracking
 */
export const scheduledPosts = pgTable("scheduled_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  connectionId: varchar("connection_id").notNull().references(() => socialConnections.id, { onDelete: "cascade" }),

  // Content
  caption: text("caption").notNull(),
  hashtags: text("hashtags").array(),
  imageUrl: text("image_url"), // Cloudinary URL (public)
  imagePublicId: text("image_public_id"), // Cloudinary ID for cleanup

  // Scheduling
  scheduledFor: timestamp("scheduled_for").notNull(),
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),

  // Status tracking
  status: varchar("status", { length: 25 }).default("draft").notNull(), // draft | scheduled | publishing | published | failed | cancelled | account_disconnected
  publishedAt: timestamp("published_at"),
  platformPostId: varchar("platform_post_id", { length: 255 }), // LinkedIn/Instagram post ID
  platformPostUrl: text("platform_post_url"), // URL to view the post

  // Error handling
  errorMessage: text("error_message"),
  failureReason: varchar("failure_reason", { length: 50 }), // token_expired | rate_limited | content_policy_violation | etc.
  retryCount: integer("retry_count").default(0).notNull(),
  nextRetryAt: timestamp("next_retry_at"),

  // Traceability - link to generation source
  generationId: varchar("generation_id").references(() => generations.id, { onDelete: "set null" }),
  templateId: varchar("template_id", { length: 100 }), // Content Planner template ID

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Index for efficient calendar queries
  idxUserScheduled: index("idx_sched_posts_user_scheduled").on(table.userId, table.scheduledFor),
  idxConnectionStatus: index("idx_sched_posts_conn_status").on(table.connectionId, table.status),
  // Index for the scheduler job to find due posts
  idxStatusScheduledFor: index("idx_sched_posts_status_time").on(table.status, table.scheduledFor),
}));

/**
 * Post Analytics - Performance metrics for published posts
 * Fetched periodically from LinkedIn/Instagram APIs
 */
export const postAnalytics = pgTable("post_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduledPostId: varchar("scheduled_post_id").notNull().references(() => scheduledPosts.id, { onDelete: "cascade" }),

  // When analytics were fetched
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),

  // Engagement metrics
  impressions: integer("impressions"),
  reach: integer("reach"),
  likes: integer("likes"),
  comments: integer("comments"),
  shares: integer("shares"),
  clicks: integer("clicks"),
  saves: integer("saves"), // Instagram only

  // Calculated metrics
  engagementRate: real("engagement_rate"), // (likes + comments + shares) / impressions * 100

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Index for time-series queries
  idxPostFetched: index("idx_post_analytics_post_fetched").on(table.scheduledPostId, table.fetchedAt),
}));

// Insert schemas for social media tables
export const insertSocialConnectionSchema = createInsertSchema(socialConnections, {
  platform: socialPlatformEnum,
  accountType: socialAccountTypeEnum.optional(),
}).omit({
  id: true,
  connectedAt: true,
  updatedAt: true,
});

export const insertScheduledPostSchema = createInsertSchema(scheduledPosts, {
  status: scheduledPostStatusEnum,
  failureReason: postFailureReasonEnum.optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostAnalyticsSchema = createInsertSchema(postAnalytics).omit({
  id: true,
  createdAt: true,
});

// Type exports for social media tables
export type InsertSocialConnection = z.infer<typeof insertSocialConnectionSchema>;
export type SocialConnection = typeof socialConnections.$inferSelect;

export type InsertScheduledPost = z.infer<typeof insertScheduledPostSchema>;
export type ScheduledPost = typeof scheduledPosts.$inferSelect;

export type InsertPostAnalytics = z.infer<typeof insertPostAnalyticsSchema>;
export type PostAnalytics = typeof postAnalytics.$inferSelect;
