/* eslint-disable no-console */
import "dotenv/config";
import pg from "pg";

const { Client } = pg;

async function migrateApiKeysTables() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  console.log("Starting API Keys table migration...\n");

  try {
    await client.connect();
    console.log("Connected to database\n");

    // Check if tables already exist
    const existingTablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('user_api_keys', 'api_key_audit_log')
    `);

    const existingTableNames = existingTablesResult.rows.map((r: any) => r.table_name);

    // Create api_key_audit_log table if not exists
    if (!existingTableNames.includes('api_key_audit_log')) {
      console.log("Creating api_key_audit_log table...");
      await client.query(`
        CREATE TABLE "api_key_audit_log" (
          "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" varchar NOT NULL,
          "service" varchar(50) NOT NULL,
          "action" varchar(20) NOT NULL,
          "ip_address" varchar(45),
          "user_agent" text,
          "success" boolean NOT NULL,
          "error_message" text,
          "created_at" timestamp DEFAULT now() NOT NULL
        )
      `);
      console.log("✓ api_key_audit_log table created");

      // Add foreign key constraint
      await client.query(`
        ALTER TABLE "api_key_audit_log"
        ADD CONSTRAINT "api_key_audit_log_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action
      `);
      console.log("✓ api_key_audit_log foreign key added");
    } else {
      console.log("⊘ api_key_audit_log table already exists, skipping");
    }

    // Create user_api_keys table if not exists
    if (!existingTableNames.includes('user_api_keys')) {
      console.log("Creating user_api_keys table...");
      await client.query(`
        CREATE TABLE "user_api_keys" (
          "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" varchar NOT NULL,
          "service" varchar(50) NOT NULL,
          "encrypted_key" text NOT NULL,
          "iv" text NOT NULL,
          "auth_tag" text NOT NULL,
          "key_preview" varchar(20),
          "is_valid" boolean DEFAULT true NOT NULL,
          "last_validated_at" timestamp,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL,
          CONSTRAINT "user_api_keys_user_id_service_unique" UNIQUE("user_id","service")
        )
      `);
      console.log("✓ user_api_keys table created");

      // Add foreign key constraint
      await client.query(`
        ALTER TABLE "user_api_keys"
        ADD CONSTRAINT "user_api_keys_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action
      `);
      console.log("✓ user_api_keys foreign key added");
    } else {
      console.log("⊘ user_api_keys table already exists, skipping");
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateApiKeysTables();
