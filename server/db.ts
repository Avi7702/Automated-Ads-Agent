import { Pool, type PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Simple connection check
console.log(`[db] Initializing database connection...`);

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Add error listener to prevent app crash on idle client errors
pool.on('error', (err, client) => {
    console.error('[db] Unexpected error on idle client', err);
    process.exit(-1);
});

export const db = drizzle(pool, { schema });
console.log(`[db] Database initialized with node-postgres`);
