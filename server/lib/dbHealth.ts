/**
 * Database Health Monitoring
 *
 * Provides health check functionality for the PostgreSQL connection pool
 */

import { pool } from '../db';
import { logger } from './logger';

export interface DbHealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    totalConnections: number;
    idleConnections: number;
    activeConnections: number;
    waitingClients: number;
    maxConnections: number;
    averageQueryTime?: number;
}

/**
 * Check database health by running a simple query and inspecting pool metrics
 *
 * Health status determination:
 * - healthy: Query < 200ms, pool not exhausted
 * - degraded: Query 200-500ms, or pool nearing exhaustion
 * - unhealthy: Query > 500ms, or pool exhausted, or connection failed
 */
export async function checkDbHealth(): Promise<DbHealthStatus> {
    try {
        const start = Date.now();
        await pool.query('SELECT 1');
        const queryTime = Date.now() - start;

        const totalConnections = pool.totalCount;
        const idleConnections = pool.idleCount;
        const activeConnections = totalConnections - idleConnections;
        const waitingClients = pool.waitingCount;
        const maxConnections = pool.options.max || 10;

        // Determine health status
        let status: 'healthy' | 'degraded' | 'unhealthy';

        if (queryTime >= 500 || activeConnections >= maxConnections) {
            status = 'unhealthy';
        } else if (queryTime >= 200 || activeConnections >= maxConnections * 0.8) {
            status = 'degraded';
        } else {
            status = 'healthy';
        }

        return {
            status,
            totalConnections,
            idleConnections,
            activeConnections,
            waitingClients,
            maxConnections,
            averageQueryTime: queryTime,
        };
    } catch (err) {
        logger.error({ module: 'DbHealth', err }, 'Database health check failed');

        return {
            status: 'unhealthy',
            totalConnections: 0,
            idleConnections: 0,
            activeConnections: 0,
            waitingClients: 0,
            maxConnections: pool.options.max || 10,
        };
    }
}
