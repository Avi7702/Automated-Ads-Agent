/**
 * System Health Service
 *
 * Aggregates health status from all subsystems (database, Redis, etc.)
 */

import { checkDbHealth, DbHealthStatus } from '../lib/dbHealth';
import { getRedisClient } from '../lib/redis';
import { logger } from '../lib/logger';

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: DbHealthStatus;
    redis?: {
      status: 'healthy' | 'unhealthy';
      connected: boolean;
      latency?: number;
    };
    gemini?: {
      status: 'healthy' | 'rate_limited' | 'unhealthy';
      lastError?: string;
    };
  };
}

/**
 * Check overall system health
 * Returns aggregated health status from all critical services
 */
export async function getSystemHealth(): Promise<SystemHealthStatus> {
  const dbHealth = await checkDbHealth();

  let redisHealth;
  if (process.env['REDIS_URL']) {
    try {
      const redis = getRedisClient();

      // Wait for connection to be ready (max 3 seconds)
      const maxWait = 3000;
      const startWait = Date.now();
      while (redis.status !== 'ready' && Date.now() - startWait < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (redis.status !== 'ready') {
        throw new Error(`Redis not ready after ${maxWait}ms, status: ${redis.status}`);
      }

      const start = Date.now();
      await redis.ping();
      const latency = Date.now() - start;

      redisHealth = {
        status: 'healthy' as const,
        connected: true,
        latency,
      };
    } catch (err) {
      logger.error({ module: 'SystemHealth', err }, 'Redis health check failed');
      redisHealth = {
        status: 'unhealthy' as const,
        connected: false,
      };
    }
  }

  // Determine overall health based on critical services
  const statuses = [dbHealth.status, redisHealth?.status].filter(Boolean) as string[];
  const overall = statuses.includes('unhealthy') ? 'unhealthy' : statuses.includes('degraded') ? 'degraded' : 'healthy';

  return {
    overall: overall as 'healthy' | 'degraded' | 'unhealthy',
    timestamp: new Date(),
    services: {
      database: dbHealth,
      ...(redisHealth !== undefined && { redis: redisHealth }),
    },
  };
}
