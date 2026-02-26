/**
 * Health Router
 * Health check endpoints for liveness, readiness, and general health
 *
 * Endpoints:
 * - GET /api/health/live - Liveness probe (is process running?)
 * - GET /api/health/ready - Readiness probe (can accept traffic?)
 * - GET /api/health - General health status
 *
 * Analytics Router (also exported):
 * - POST /api/analytics/vitals - Web Vitals telemetry
 */

import type { Router } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { getRedisClient } from '../lib/redis';
import { getGeminiHealthStatus } from '../lib/geminiHealthMonitor';
import type { GeminiHealth } from '../lib/geminiHealthMonitor';

interface RedisHealthStatus {
  connected: boolean;
  latency?: string;
}

async function checkRedisHealth(): Promise<RedisHealthStatus> {
  if (!process.env['REDIS_URL']) {
    return { connected: false };
  }
  try {
    const client = getRedisClient();
    const start = Date.now();
    await client.ping();
    const latencyMs = Date.now() - start;
    return { connected: true, latency: `${latencyMs}ms` };
  } catch {
    return { connected: false };
  }
}

export const healthRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger, pool } = ctx.services;
  const { isServerShuttingDown } = ctx.utils;

  /**
   * GET /live - Liveness probe
   * Always returns 200 if the process is running
   */
  router.get('/live', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  /**
   * GET /ready - Readiness probe
   * Returns 503 if shutting down or database is unavailable
   */
  router.get(
    '/ready',
    asyncHandler(async (_req, res) => {
      if (isServerShuttingDown()) {
        return res.status(503).json({
          status: 'shutting_down',
          timestamp: new Date().toISOString(),
        });
      }

      let dbOk = false;
      try {
        await pool.query('SELECT 1');
        dbOk = true;
      } catch (err) {
        logger.error({ module: 'Health', err }, 'Database readiness check failed');
      }

      const redisHealth = await checkRedisHealth();

      const allReady = dbOk;
      const statusCode = allReady ? 200 : 503;

      res.status(statusCode).json({
        status: allReady ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbOk ? 'ok' : 'failed',
          redis: redisHealth,
        },
      });
    }),
  );

  /**
   * GET / - General health status
   * Legacy endpoint for backwards compatibility, now includes Redis and Gemini status
   */
  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const redisHealth = await checkRedisHealth();
      let geminiHealth: GeminiHealth = { status: 'unknown', failureRate: 0, lastSuccess: null };
      try {
        geminiHealth = await getGeminiHealthStatus();
      } catch {
        // If health check fails, return unknown status
      }

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        redis: redisHealth,
        gemini: geminiHealth,
      });
    }),
  );

  return router;
};

export const healthRouterModule: RouterModule = {
  prefix: '/api/health',
  factory: healthRouter,
  description: 'Health check endpoints for monitoring',
  endpointCount: 3,
  requiresAuth: false,
  tags: ['infrastructure', 'monitoring'],
};

// ----- Analytics Router (Web Vitals telemetry) -----

import express from 'express';

export const analyticsRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger } = ctx.services;

  /**
   * POST /vitals - Web Vitals analytics endpoint
   * Logs metrics via Pino. Body is raw text (JSON stringified metric).
   */
  router.post('/vitals', express.text({ type: '*/*', limit: '1kb' }), (req, res) => {
    try {
      const metric = JSON.parse(req.body as string);
      logger.info(
        { module: 'WebVitals', metric: metric.name, value: metric.value, rating: metric.rating },
        'Web Vital reported',
      );
      res.status(204).end();
    } catch {
      res.status(400).end();
    }
  });

  return router;
};

export const analyticsRouterModule: RouterModule = {
  prefix: '/api/analytics',
  factory: analyticsRouter,
  description: 'Web Vitals analytics telemetry',
  endpointCount: 1,
  requiresAuth: false,
  tags: ['infrastructure', 'analytics'],
};
