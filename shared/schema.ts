import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  brandVoice: jsonb("brand_voice"), // { principles: string[], wordsToAvoid: string[], wordsToUse: string[] }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const generations = pgTable("generations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prompt: text("prompt").notNull(),
  originalImagePaths: text("original_image_paths").array().notNull(),
  generatedImagePath: text("generated_image_path").notNull(),
  resolution: varchar("resolution", { length: 10 }).default("2K"),
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

export const insertGenerationSchema = createInsertSchema(generations).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const insertPromptTemplateSchema = createInsertSchema(promptTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertAdCopySchema = createInsertSchema(adCopy).omit({
  id: true,
  createdAt: true,
});

export type InsertGeneration = z.infer<typeof insertGenerationSchema>;
export type Generation = typeof generations.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertPromptTemplate = z.infer<typeof insertPromptTemplateSchema>;
export type PromptTemplate = typeof promptTemplates.$inferSelect;

export type InsertAdCopy = z.infer<typeof insertAdCopySchema>;
export type AdCopy = typeof adCopy.$inferSelect;
