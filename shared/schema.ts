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
  mood: varchar("mood", { length: 50 }), // luxury, cozy, bold, minimal, vibrant
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
const templateCategoryEnum = z.enum(['ecommerce', 'saas', 'services', 'awareness']);
const sourcePlatformEnum = z.enum(['adspy', 'bigspy', 'envato', 'canva', 'figma', 'manual']);
const engagementTierEnum = z.enum(['top-5', 'top-10', 'top-25', 'unranked']);
const estimatedBudgetEnum = z.enum(['under-1k', '1k-5k', '5k-20k', '20k+']);
const backgroundTypeEnum = z.enum(['solid', 'gradient', 'image', 'video']);
const templateFormatEnum = z.enum(['figma', 'canva', 'html-css', 'react', 'image']);
const templateMoodEnum = z.enum(['luxury', 'cozy', 'bold', 'minimal', 'vibrant']);
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
