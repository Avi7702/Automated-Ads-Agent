import { pool } from "./db";
import { logger } from './lib/logger';

/**
 * Ensure the production DB schema matches our Drizzle schema.
 *
 * Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so it's fully idempotent.
 * This replaces `drizzle-kit push` which times out via npx on cold start.
 */
export async function pushSchema() {
    if (process.env.SKIP_SCHEMA_PUSH === 'true') {
        logger.info({ module: 'db' }, 'Schema push skipped (SKIP_SCHEMA_PUSH=true)');
        return;
    }

    try {
        logger.info({ module: 'db' }, 'Running schema migrations...');

        // Add missing columns to existing tables (idempotent — IF NOT EXISTS)
        await pool.query(`
            -- Users: role column (PR #61)
            ALTER TABLE users ADD COLUMN IF NOT EXISTS role varchar(20) NOT NULL DEFAULT 'user';

            -- Generations: media type + video duration (PR #64)
            ALTER TABLE generations ADD COLUMN IF NOT EXISTS media_type varchar(10) DEFAULT 'image';
            ALTER TABLE generations ADD COLUMN IF NOT EXISTS video_duration_sec integer;

            -- Generations: Wave 3 context metadata (idempotent)
            ALTER TABLE generations ADD COLUMN IF NOT EXISTS product_ids text[];
            ALTER TABLE generations ADD COLUMN IF NOT EXISTS template_id varchar(50);
            ALTER TABLE generations ADD COLUMN IF NOT EXISTS generation_mode varchar(20);

            -- Training tables (PR #64)
            CREATE TABLE IF NOT EXISTS training_datasets (
                id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id varchar NOT NULL REFERENCES users(id),
                name varchar(255) NOT NULL,
                description text,
                model_type varchar(50) NOT NULL DEFAULT 'gemini',
                status varchar(20) NOT NULL DEFAULT 'draft',
                example_count integer NOT NULL DEFAULT 0,
                created_at timestamp NOT NULL DEFAULT now(),
                updated_at timestamp NOT NULL DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS training_examples (
                id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
                dataset_id varchar NOT NULL REFERENCES training_datasets(id) ON DELETE CASCADE,
                input_text text NOT NULL,
                expected_output text NOT NULL,
                metadata jsonb,
                quality_score real,
                created_at timestamp NOT NULL DEFAULT now()
            );
        `);

        logger.info({ module: 'db' }, 'Schema migrations completed successfully');
    } catch (error: unknown) {
        logger.error({ module: 'db', err: error }, 'Schema migration failed');
        // Don't exit — tables may already exist with the right shape
        logger.info({ module: 'db' }, 'Continuing without schema migration — tables may already exist');
    }
}
