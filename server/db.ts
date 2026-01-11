import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { logger } from './lib/logger';

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Simple connection check
logger.info({ module: 'db' }, 'Initializing database connection...');

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Add error listener to prevent app crash on idle client errors
pool.on('error', (err, client) => {
    logger.error({ module: 'db', err }, 'Unexpected error on idle client');
    process.exit(-1);
});

export const db = drizzle(pool, { schema });
logger.info({ module: 'db' }, 'Database initialized with node-postgres');
