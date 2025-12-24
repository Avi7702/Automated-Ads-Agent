import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

async function runMigration() {
  console.log("Starting database migration...");

  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is not set");
    console.log("Please set DATABASE_URL in your Replit Secrets");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    const migrationPath = path.join(process.cwd(), "migrations", "001_add_copywriting_tables.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("Running migration: 001_add_copywriting_tables.sql");

    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      try {
        await sql(statement);
        console.log(`✓ Executed: ${statement.substring(0, 60)}...`);
      } catch (error: any) {
        if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
          console.log(`⚠ Skipped (already exists): ${statement.substring(0, 60)}...`);
        } else {
          throw error;
        }
      }
    }

    console.log("\n✅ Migration completed successfully!");
    console.log("\nNew tables/columns created:");
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
