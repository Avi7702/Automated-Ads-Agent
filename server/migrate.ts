import { pool } from './db';
import { logger } from './lib/logger';

/**
 * Ensure the production DB schema matches our Drizzle schema.
 *
 * Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so it's fully idempotent.
 * This replaces `drizzle-kit push` which times out via npx on cold start.
 */
export async function pushSchema() {
  if (process.env['SKIP_SCHEMA_PUSH'] === 'true') {
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
            ALTER TABLE generations ADD COLUMN IF NOT EXISTS product_ids text[];
            ALTER TABLE generations ADD COLUMN IF NOT EXISTS template_id varchar(50);
            ALTER TABLE generations ADD COLUMN IF NOT EXISTS generation_mode varchar(20);

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

            -- Publishing Pipeline: OAuth state table (DB-backed CSRF + PKCE)
            CREATE TABLE IF NOT EXISTS oauth_states (
                id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                platform varchar(20) NOT NULL,
                state_token varchar(128) NOT NULL UNIQUE,
                code_verifier text,
                expires_at timestamp NOT NULL,
                created_at timestamp NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS oauth_states_state_token_idx ON oauth_states(state_token);
            CREATE INDEX IF NOT EXISTS oauth_states_expires_at_idx ON oauth_states(expires_at);

            -- Publishing Pipeline: idempotency key on scheduled_posts
            ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS publish_idempotency_key varchar(36);

            -- Agent Mode: plans table
            CREATE TABLE IF NOT EXISTS agent_plans (
                id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                suggestion_id varchar(128),
                objective text NOT NULL,
                cadence text NOT NULL,
                platform varchar(50) NOT NULL,
                content_mix jsonb NOT NULL,
                approval_score integer NOT NULL,
                score_breakdown jsonb NOT NULL,
                estimated_cost jsonb NOT NULL,
                posts jsonb NOT NULL,
                status varchar(25) NOT NULL DEFAULT 'draft',
                revision_count integer NOT NULL DEFAULT 0,
                created_at timestamp NOT NULL DEFAULT now(),
                updated_at timestamp NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS agent_plans_user_id_idx ON agent_plans(user_id);
            CREATE INDEX IF NOT EXISTS agent_plans_status_idx ON agent_plans(status);
            CREATE INDEX IF NOT EXISTS agent_plans_created_at_idx ON agent_plans(created_at);

            -- Agent Mode: executions table
            CREATE TABLE IF NOT EXISTS agent_executions (
                id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
                plan_id varchar NOT NULL REFERENCES agent_plans(id) ON DELETE CASCADE,
                user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                idempotency_key varchar(128) NOT NULL,
                status varchar(25) NOT NULL DEFAULT 'queued',
                steps jsonb NOT NULL,
                generation_ids text[],
                ad_copy_ids text[],
                approval_queue_ids text[],
                started_at timestamp,
                completed_at timestamp,
                error_message text,
                created_at timestamp NOT NULL DEFAULT now(),
                updated_at timestamp NOT NULL DEFAULT now(),
                CONSTRAINT agent_executions_plan_idempotency UNIQUE(plan_id, idempotency_key)
            );
            CREATE INDEX IF NOT EXISTS agent_executions_plan_id_idx ON agent_executions(plan_id);
            CREATE INDEX IF NOT EXISTS agent_executions_user_id_idx ON agent_executions(user_id);
        `);

    logger.info({ module: 'db' }, 'Schema migrations completed successfully');
  } catch (error: unknown) {
    logger.error({ module: 'db', err: error }, 'Schema migration failed');
    // Don't exit — tables may already exist with the right shape
    logger.info({ module: 'db' }, 'Continuing without schema migration — tables may already exist');
  }
}
