/**
 * Monitoring Router
 * System monitoring and health aggregation endpoints
 *
 * Endpoints:
 * - GET /api/monitoring/health - System health check
 * - GET /api/monitoring/performance - Performance metrics
 * - GET /api/monitoring/errors - Error tracking
 * - GET /api/monitoring/system - Full system health aggregation
 * - GET /api/monitoring/endpoints - API endpoints summary
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { validate } from '../middleware/validate';
import { monitoringErrorsQuerySchema } from '../validation/schemas';

export const monitoringRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger } = ctx.services;
  const { requireAuth } = ctx.middleware;

  /**
   * GET /health - System health check
   */
  router.get(
    '/health',
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const { getSystemHealth } = await import('../services/systemHealthService');
        const health = await getSystemHealth();
        res.json(health);
      } catch (error: any) {
        logger.error({ module: 'monitoring', error }, 'Failed to fetch system health');
        res.status(500).json({ error: 'Failed to fetch system health' });
      }
    }),
  );

  /**
   * GET /performance - Performance metrics
   */
  router.get(
    '/performance',
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const { getPerformanceMetrics } = await import('../middleware/performanceMetrics');
        const metrics = getPerformanceMetrics();
        res.json(metrics);
      } catch (error: any) {
        logger.error({ module: 'monitoring', error }, 'Failed to fetch performance metrics');
        res.status(500).json({ error: 'Failed to fetch performance metrics' });
      }
    }),
  );

  /**
   * GET /errors - Error tracking
   */
  router.get(
    '/errors',
    requireAuth,
    validate(monitoringErrorsQuerySchema, 'query'),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const validated = (req as any).validatedQuery ?? {};
        const limit = validated.limit ?? 50;
        const { getRecentErrors, getErrorStats } = await import('../services/errorTrackingService');
        const errors = getRecentErrors(limit);
        const stats = getErrorStats();

        res.json({ errors, stats });
      } catch (error: any) {
        logger.error({ module: 'monitoring', error }, 'Failed to fetch errors');
        res.status(500).json({ error: 'Failed to fetch errors' });
      }
    }),
  );

  /**
   * GET /system - Full system health aggregation
   */
  router.get(
    '/system',
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const { getSystemHealth } = await import('../services/systemHealthService');
        const { getPerformanceMetrics } = await import('../middleware/performanceMetrics');
        const { getErrorStats } = await import('../services/errorTrackingService');

        const health = await getSystemHealth();
        const perfMetrics = getPerformanceMetrics();
        const errorStats = getErrorStats();

        // Aggregate performance metrics
        const totalRequests = perfMetrics.reduce((sum: number, m: any) => sum + m.requests, 0);
        const totalErrors = perfMetrics.reduce((sum: number, m: any) => sum + m.errors, 0);
        const avgResponseTime =
          perfMetrics.length > 0
            ? perfMetrics.reduce((sum: number, m: any) => sum + m.avgLatency, 0) / perfMetrics.length
            : 0;

        // Top 5 endpoints by request count
        const topEndpoints = perfMetrics
          .sort((a: any, b: any) => b.requests - a.requests)
          .slice(0, 5)
          .map((m: any) => ({
            endpoint: m.endpoint,
            method: m.method,
            requests: m.requests,
            avgLatency: Math.round(m.avgLatency),
          }));

        res.json({
          status: health.overall,
          timestamp: health.timestamp,
          services: health.services,
          performance: {
            totalRequests,
            totalErrors,
            avgResponseTime: Math.round(avgResponseTime),
            topEndpoints,
          },
          errors: {
            total: errorStats.total,
            recent: errorStats.last5min,
          },
        });
      } catch (error: any) {
        logger.error({ module: 'monitoring', error }, 'Failed to fetch system health');
        res.status(500).json({ error: 'Failed to fetch system health' });
      }
    }),
  );

  /**
   * GET /endpoints - API endpoints summary
   */
  router.get(
    '/endpoints',
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const { getPerformanceMetrics } = await import('../middleware/performanceMetrics');
        const metrics = getPerformanceMetrics();

        // Aggregate by endpoint pattern (group similar paths)
        const summary = metrics.map((m: any) => ({
          endpoint: m.endpoint,
          method: m.method,
          requests: m.requests,
          errorRate: m.errorRate.toFixed(2) + '%',
          avgLatency: Math.round(m.avgLatency) + 'ms',
          status: m.errorRate > 5 ? 'unhealthy' : m.errorRate > 1 ? 'degraded' : 'healthy',
        }));

        res.json(summary);
      } catch (error: any) {
        logger.error({ module: 'monitoring', error }, 'Failed to fetch endpoint summary');
        res.status(500).json({ error: 'Failed to fetch endpoint summary' });
      }
    }),
  );

  return router;
};

export const monitoringRouterModule: RouterModule = {
  prefix: '/api/monitoring',
  factory: monitoringRouter,
  description: 'System monitoring and health aggregation',
  endpointCount: 5,
  requiresAuth: true,
  tags: ['infrastructure', 'monitoring'],
};
