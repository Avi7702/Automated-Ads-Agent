import { neon } from "@neondatabase/serverless";

async function runMigration() {
  console.log("Starting database migration...");

  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is not set");
    console.log("Please set DATABASE_URL in your Replit Secrets");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log("Running Phase 4 copywriting migration...\n");

    const statements = [
      // Security fields
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_voice JSONB`,
      
      // Sessions table
      `CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Ad copy table
      `CREATE TABLE IF NOT EXISTS ad_copy (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        generation_id VARCHAR NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        headline TEXT NOT NULL,
        hook TEXT NOT NULL,
        body_text TEXT NOT NULL,
        cta TEXT NOT NULL,
        caption TEXT NOT NULL,
        hashtags TEXT[] NOT NULL,
        platform VARCHAR(50) NOT NULL,
        tone VARCHAR(50) NOT NULL,
        framework VARCHAR(50),
        campaign_objective VARCHAR(50),
        product_name TEXT NOT NULL,
        product_description TEXT NOT NULL,
        product_benefits TEXT[],
        unique_value_prop TEXT,
        industry VARCHAR(100) NOT NULL,
        target_audience JSONB,
        brand_voice JSONB,
        social_proof JSONB,
        quality_score JSONB,
        character_counts JSONB,
        variation_number INTEGER DEFAULT 1,
        parent_copy_id VARCHAR,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_ad_copy_generation_id ON ad_copy(generation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ad_copy_user_id ON ad_copy(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ad_copy_created_at ON ad_copy(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`
    ];

    for (const statement of statements) {
      try {
        await sql(statement);
        const preview = statement.replace(/\s+/g, ' ').substring(0, 60);
        console.log(`✓ ${preview}...`);
      } catch (error: any) {
        if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
          const preview = statement.replace(/\s+/g, ' ').substring(0, 60);
          console.log(`⚠ Skipped (exists): ${preview}...`);
        } else {
          throw error;
        }
      }
    }

    console.log("\n✅ Migration completed successfully!");
    console.log("\nPhase 4 database changes applied:");
    console.log("  - users.brand_voice (JSONB)");
    console.log("  - users.failed_attempts (INTEGER)");
    console.log("  - users.locked_until (TIMESTAMP)");
    console.log("  - sessions table");
    console.log("  - ad_copy table");

  } catch (error: any) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  }
}

runMigration();
