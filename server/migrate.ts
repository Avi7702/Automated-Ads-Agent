
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./db";
import { logger } from './lib/logger';

// For simple prototyping/dev, we use db push behavior by syncing schema
// But since drizzle-kit push is a CLI command, for programmatic usage in prod
// we often use 'migrate' if we have migrations folder.
// However, since this project used 'db:push', we might lack migration files.
// Let's check if we can run specific SQL or if we should use 'drizzle-kit push' via exec.

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function pushSchema() {
    // Run schema push by default in all environments (drizzle-kit push is idempotent)
    // Set SKIP_SCHEMA_PUSH=true to disable
    // Skip schema push in production by default — tables should exist from migrations/CI.
    // drizzle-kit is a devDependency and not available at runtime.
    // Set SKIP_SCHEMA_PUSH=false to force push (e.g. in staging).
    const skipSchemaPush = process.env.SKIP_SCHEMA_PUSH !== 'false'
        && process.env.NODE_ENV === 'production';

    if (skipSchemaPush || process.env.SKIP_SCHEMA_PUSH === 'true') {
        logger.info({ module: 'db' }, 'Schema push skipped (production default or SKIP_SCHEMA_PUSH=true)');
        return;
    }

    try {
        logger.info({ module: 'db' }, 'Pushing schema to database...');
        // We use drizzle-kit push command with --force to skip interactive confirmation.
        // This requires drizzle.config.ts to be present and correct.
        const { stdout, stderr } = await execAsync("npx drizzle-kit push --force", {
            timeout: 30000, // 30 second timeout
        });
        logger.info({ module: 'db', output: stdout }, 'Schema push output');
        if (stderr) logger.error({ module: 'db', stderr }, 'Schema push stderr');
        logger.info({ module: 'db' }, 'Schema push completed successfully');
    } catch (error: any) {
        // Check if it's a timeout error
        if (error.killed) {
            logger.error({ module: 'db' }, 'Schema push timed out after 30 seconds - skipping');
        } else {
            logger.error({ module: 'db', err: error }, 'Failed to push schema');
        }
        // Don't exit process, let app try to start
        logger.info({ module: 'db' }, 'Continuing without schema push - tables may already exist');
    }
}
