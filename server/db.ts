import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { logger } from './lib/logger';

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

/**
 * Get validated connection pool configuration from environment variables
 * Validates and bounds all numeric values to safe ranges
 */
function getPoolConfig() {
    const max = Math.min(Math.max(parseInt(process.env.DB_POOL_MAX || '20', 10), 1), 100);
    const min = Math.min(Math.max(parseInt(process.env.DB_POOL_MIN || '2', 10), 0), max);
    const idleTimeout = Math.max(parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10), 1000);
    const connectionTimeout = Math.max(parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10), 1000);
    const statementTimeout = Math.max(parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000', 10), 1000);

    return { max, min, idleTimeout, connectionTimeout, statementTimeout };
}

const poolConfig = getPoolConfig();

logger.info({ module: 'db' }, 'Initializing database connection...');

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    // Connection pool sizing
    max: poolConfig.max,
    min: poolConfig.min,

    // Timeout configuration
    idleTimeoutMillis: poolConfig.idleTimeout,
    connectionTimeoutMillis: poolConfig.connectionTimeout,

    // SSL for production
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,

    // Connection validation
    allowExitOnIdle: false,
});

// Set statement timeout on each connection (PostgreSQL server-side)
pool.on('connect', (client) => {
    client.query(`SET statement_timeout = ${poolConfig.statementTimeout}`).catch((err) => {
        logger.error({ module: 'db', err }, 'Failed to set statement_timeout on connection');
    });
});

// Log pool events for monitoring
pool.on('error', (err, client) => {
    logger.error({ module: 'db', err }, 'Unexpected error on idle client');
});

pool.on('acquire', () => {
    logger.debug({ module: 'db', total: pool.totalCount, idle: pool.idleCount }, 'Client acquired from pool');
});

export const db = drizzle(pool, { schema });
logger.info({
    module: 'db',
    max: poolConfig.max,
    min: poolConfig.min,
    idleTimeout: poolConfig.idleTimeout,
    connectionTimeout: poolConfig.connectionTimeout,
    statementTimeout: poolConfig.statementTimeout,
}, 'Database initialized with node-postgres');
