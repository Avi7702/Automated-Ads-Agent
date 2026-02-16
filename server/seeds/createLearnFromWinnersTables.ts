/* eslint-disable no-console */
import "dotenv/config";
import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Creates the "Learn from Winners" tables for ad pattern extraction
 * Tables: learned_ad_patterns, ad_analysis_uploads, pattern_application_history
 */
async function createTables() {
  console.log("Creating Learn from Winners tables...\n");

  try {
    // Check if tables already exist
    const existingTables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('learned_ad_patterns', 'ad_analysis_uploads', 'pattern_application_history')
    `);

    if (existingTables.rows.length > 0) {
      console.log("Tables already exist:", existingTables.rows.map((r: any) => r.table_name));
      console.log("\n✅ Tables verified, no action needed.");
      return;
    }

    // Create learned_ad_patterns table first (referenced by others)
    console.log("Creating learned_ad_patterns...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "learned_ad_patterns" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
        "name" text NOT NULL,
        "category" varchar(50) NOT NULL,
        "platform" varchar(50) NOT NULL,
        "industry" varchar(100),
        "layout_pattern" jsonb,
        "color_psychology" jsonb,
        "hook_patterns" jsonb,
        "visual_elements" jsonb,
        "engagement_tier" varchar(20),
        "confidence_score" real DEFAULT 0.8,
        "source_hash" text NOT NULL,
        "usage_count" integer DEFAULT 0 NOT NULL,
        "last_used_at" timestamp,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "learned_ad_patterns_user_id_source_hash_unique" UNIQUE("user_id","source_hash")
      )
    `);
    console.log("✓ Created learned_ad_patterns");

    // Create ad_analysis_uploads table
    console.log("Creating ad_analysis_uploads...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ad_analysis_uploads" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
        "cloudinary_url" text NOT NULL,
        "cloudinary_public_id" text NOT NULL,
        "original_filename" text,
        "file_size_bytes" integer,
        "mime_type" varchar(100),
        "status" varchar(20) DEFAULT 'pending' NOT NULL,
        "error_message" text,
        "privacy_scan_result" jsonb,
        "extracted_pattern_id" varchar REFERENCES "learned_ad_patterns"("id") ON DELETE set null,
        "processing_started_at" timestamp,
        "processing_completed_at" timestamp,
        "processing_duration_ms" integer,
        "expires_at" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log("✓ Created ad_analysis_uploads");

    // Create pattern_application_history table
    console.log("Creating pattern_application_history...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "pattern_application_history" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
        "pattern_id" varchar NOT NULL REFERENCES "learned_ad_patterns"("id") ON DELETE cascade,
        "generated_ad_id" varchar REFERENCES "generations"("id") ON DELETE cascade,
        "product_id" varchar REFERENCES "products"("id") ON DELETE set null,
        "target_platform" varchar(50),
        "prompt_used" text,
        "user_rating" integer,
        "was_used" boolean DEFAULT false NOT NULL,
        "feedback" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pattern_application_history_pattern_id_generated_ad_id_unique" UNIQUE("pattern_id","generated_ad_id")
      )
    `);
    console.log("✓ Created pattern_application_history");

    // Create indexes
    console.log("\nCreating indexes...");
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_uploads_status" ON "ad_analysis_uploads" USING btree ("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_uploads_expires" ON "ad_analysis_uploads" USING btree ("expires_at")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_uploads_user_id" ON "ad_analysis_uploads" USING btree ("user_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_learned_patterns_user_id" ON "learned_ad_patterns" USING btree ("user_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_learned_patterns_category" ON "learned_ad_patterns" USING btree ("category")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_learned_patterns_platform" ON "learned_ad_patterns" USING btree ("platform")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_history_pattern_id" ON "pattern_application_history" USING btree ("pattern_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_history_user_id" ON "pattern_application_history" USING btree ("user_id")`);
    console.log("✓ Created all indexes");

    // Verify tables were created
    const tables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('learned_ad_patterns', 'ad_analysis_uploads', 'pattern_application_history')
      ORDER BY table_name
    `);

    console.log("\n✅ Successfully created tables:");
    tables.rows.forEach((row: any) => console.log(`   - ${row.table_name}`));

  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  }
}

// Run when called directly
createTables()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
