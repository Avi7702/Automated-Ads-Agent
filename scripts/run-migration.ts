<<<<<<< HEAD
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
=======
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigration() {
  console.log('Starting database migration...');

  // Initialize database connection
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  try {
    // Add brandVoice column to users table
    console.log('Adding brand_voice column to users table...');
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_voice JSONB`);
    console.log('✓ brand_voice column added');

    // Create ad_copy table
    console.log('Creating ad_copy table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ad_copy (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        generation_id VARCHAR NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Core copy components
>>>>>>> 154999650a04bb9973c5cddeae01dd5ce52ab181
        headline TEXT NOT NULL,
        hook TEXT NOT NULL,
        body_text TEXT NOT NULL,
        cta TEXT NOT NULL,
        caption TEXT NOT NULL,
        hashtags TEXT[] NOT NULL,
<<<<<<< HEAD
=======

        -- Platform and tone context
>>>>>>> 154999650a04bb9973c5cddeae01dd5ce52ab181
        platform VARCHAR(50) NOT NULL,
        tone VARCHAR(50) NOT NULL,
        framework VARCHAR(50),
        campaign_objective VARCHAR(50),
<<<<<<< HEAD
=======

        -- Product context
>>>>>>> 154999650a04bb9973c5cddeae01dd5ce52ab181
        product_name TEXT NOT NULL,
        product_description TEXT NOT NULL,
        product_benefits TEXT[],
        unique_value_prop TEXT,
        industry VARCHAR(100) NOT NULL,
<<<<<<< HEAD
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
=======

        -- Advanced context
        target_audience JSONB,
        brand_voice JSONB,
        social_proof JSONB,

        -- Quality metrics
        quality_score JSONB,
        character_counts JSONB,

        -- Variation tracking
        variation_number INTEGER DEFAULT 1,
        parent_copy_id VARCHAR,

        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✓ ad_copy table created');

    // Create indexes
    console.log('Creating indexes...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ad_copy_generation_id ON ad_copy(generation_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ad_copy_user_id ON ad_copy(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ad_copy_parent_copy_id ON ad_copy(parent_copy_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ad_copy_created_at ON ad_copy(created_at DESC)`);
    console.log('✓ Indexes created');

    // Add comments for documentation
    console.log('Adding table comments...');
    await db.execute(sql`COMMENT ON TABLE ad_copy IS 'Ad copywriting generated for image generations with multiple variations'`);
    await db.execute(sql`COMMENT ON COLUMN ad_copy.hook IS 'Opening hook (50-60 chars) - critical for attention grabbing'`);
    await db.execute(sql`COMMENT ON COLUMN ad_copy.framework IS 'Copywriting framework used: aida, pas, bab, fab'`);
    await db.execute(sql`COMMENT ON COLUMN ad_copy.quality_score IS 'AI self-assessment: clarity, persuasiveness, platformFit, brandAlignment, overallScore, reasoning'`);
    await db.execute(sql`COMMENT ON COLUMN ad_copy.character_counts IS 'Character counts for validation: headline, hook, body, caption, total'`);
    await db.execute(sql`COMMENT ON COLUMN ad_copy.variation_number IS 'Variation number for A/B testing (1-5)'`);
    await db.execute(sql`COMMENT ON COLUMN users.brand_voice IS 'User default brand voice: principles, wordsToAvoid, wordsToUse'`);
    console.log('✓ Comments added');

    console.log('\n✅ Migration completed successfully!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);
    await pool.end();
>>>>>>> 154999650a04bb9973c5cddeae01dd5ce52ab181
    process.exit(1);
  }
}

runMigration();
