import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  failedAttempts: integer("failed_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  brandVoice: jsonb("brand_voice"),
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
  prompt: text("prompt").notNull(),
  originalImagePaths: text("original_image_paths").array().notNull(),
  generatedImagePath: text("generated_image_path").notNull(),
  resolution: varchar("resolution", { length: 10 }).default("2K"),
  cost: real("cost"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  conversationHistory: jsonb("conversation_history"),
  parentGenerationId: varchar("parent_generation_id"),
  editPrompt: text("edit_prompt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Brand profiles for intelligent Idea Bank
export const brandProfiles = pgTable("brand_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industry: varchar("industry", { length: 100 }),
  targetAudience: text("target_audience"),
  brandVoice: varchar("brand_voice", { length: 50 }), // professional, playful, luxury, minimal, etc.
  brandValues: text("brand_values").array(),
  colorPalette: text("color_palette").array(),
  competitors: text("competitors").array(),
  uniqueSellingPoints: text("unique_selling_points").array(),
  preferredStyles: text("preferred_styles").array(), // lifestyle, studio, outdoor, etc.
  avoidStyles: text("avoid_styles").array(),
  additionalContext: text("additional_context"),
  isDefault: integer("is_default").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cached product analysis from vision AI
export const productAnalysis = pgTable("product_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  materials: text("materials").array(),
  colors: text("colors").array(),
  style: varchar("style", { length: 100 }),
  usageContext: text("usage_context").array(),
  targetDemographic: text("target_demographic"),
  pricePoint: varchar("price_point", { length: 50 }), // budget, mid-range, premium, luxury
  seasonality: text("seasonality").array(),
  keywords: text("keywords").array(),
  rawAnalysis: jsonb("raw_analysis"),
  confidence: real("confidence"),
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
});

export const adCopy = pgTable("ad_copy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  generationId: varchar("generation_id").notNull().references(() => generations.id),
  userId: varchar("user_id"),
  headline: text("headline").notNull(),
  hook: text("hook").notNull(),
  bodyText: text("body_text").notNull(),
  cta: text("cta").notNull(),
  caption: text("caption").notNull(),
  hashtags: text("hashtags").array().notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  tone: varchar("tone", { length: 50 }).notNull(),
  framework: varchar("framework", { length: 50 }),
  campaignObjective: varchar("campaign_objective", { length: 50 }),
  productName: text("product_name").notNull(),
  productDescription: text("product_description").notNull(),
  productBenefits: text("product_benefits").array(),
  uniqueValueProp: text("unique_value_prop"),
  industry: varchar("industry", { length: 100 }).notNull(),
  targetAudience: jsonb("target_audience"),
  brandVoice: jsonb("brand_voice"),
  socialProof: jsonb("social_proof"),
  qualityScore: jsonb("quality_score"),
  characterCounts: jsonb("character_counts"),
  variationNumber: integer("variation_number").default(1),
  parentCopyId: varchar("parent_copy_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  failedAttempts: true,
  lockedUntil: true,
  brandVoice: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertSessionSchema = createInsertSchema(sessions).omit({
  createdAt: true,
});
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

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
export type InsertPromptTemplate = z.infer<typeof insertPromptTemplateSchema>;
export type PromptTemplate = typeof promptTemplates.$inferSelect;

export const insertAdCopySchema = createInsertSchema(adCopy).omit({
  id: true,
  createdAt: true,
});
export type InsertAdCopy = z.infer<typeof insertAdCopySchema>;
export type AdCopy = typeof adCopy.$inferSelect;

export const insertBrandProfileSchema = createInsertSchema(brandProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBrandProfile = z.infer<typeof insertBrandProfileSchema>;
export type BrandProfile = typeof brandProfiles.$inferSelect;

export const insertProductAnalysisSchema = createInsertSchema(productAnalysis).omit({
  id: true,
  analyzedAt: true,
});
export type InsertProductAnalysis = z.infer<typeof insertProductAnalysisSchema>;
export type ProductAnalysis = typeof productAnalysis.$inferSelect;
