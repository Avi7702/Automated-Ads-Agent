/**
 * Health Router
 * Health check endpoints for liveness, readiness, and general health
 *
 * Endpoints:
 * - GET /api/health/live - Liveness probe (is process running?)
 * - GET /api/health/ready - Readiness probe (can accept traffic?)
 * - GET /api/health - General health status
 */

import type { Router } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

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
  router.get('/ready', asyncHandler(async (_req, res) => {
    if (isServerShuttingDown()) {
      return res.status(503).json({
        status: 'shutting_down',
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Check database connectivity with a simple query
      await pool.query('SELECT 1');

      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'ok'
        }
      });
    } catch (err) {
      logger.error({ module: 'Health', err }, 'Readiness check failed');
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'failed'
        }
      });
    }
  }));

  /**
   * GET / - General health status
   * Legacy endpoint for backwards compatibility
   */
  router.get('/', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
};

export const healthRouterModule: RouterModule = {
  prefix: '/api/health',
  factory: healthRouter,
  description: 'Health check endpoints for monitoring',
  endpointCount: 3,
  requiresAuth: false,
  tags: ['infrastructure', 'monitoring']
};
