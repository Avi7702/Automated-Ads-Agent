/**
 * Monitoring Router
 * System monitoring, health aggregation, and performance webhook endpoints
 *
 * Endpoints:
 * - GET /api/monitoring/health - System health check
 * - GET /api/monitoring/performance - Performance metrics
 * - GET /api/monitoring/errors - Error tracking
 * - GET /api/monitoring/system - Full system health aggregation
 * - GET /api/monitoring/endpoints - API endpoints summary
 *
 * Webhooks Router (also exported):
 * - POST /api/webhooks/performance - n8n performance data webhook
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { validate } from '../middleware/validate';
import { monitoringErrorsQuerySchema } from '../validation/schemas';

interface PerfMetric {
  endpoint: string;
  method: string;
  requests: number;
  errors: number;
  errorRate: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  lastReset: Date;
}

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
      } catch (err: unknown) {
        logger.error({ module: 'monitoring', err }, 'Failed to fetch system health');
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
      } catch (err: unknown) {
        logger.error({ module: 'monitoring', err }, 'Failed to fetch performance metrics');
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
        const validated = ((req as unknown as Record<string, unknown>)['validatedQuery'] ?? {}) as {
          limit?: number;
        };
        const limit = validated.limit ?? 50;
        const { getRecentErrors, getErrorStats } = await import('../services/errorTrackingService');
        const errors = getRecentErrors(limit);
        const stats = getErrorStats();

        res.json({ errors, stats });
      } catch (err: unknown) {
        logger.error({ module: 'monitoring', err }, 'Failed to fetch errors');
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
        const perfMetrics = getPerformanceMetrics() as PerfMetric[];
        const errorStats = getErrorStats();

        // Aggregate performance metrics
        const totalRequests = perfMetrics.reduce((sum, m) => sum + m.requests, 0);
        const totalErrors = perfMetrics.reduce((sum, m) => sum + m.errors, 0);
        const avgResponseTime =
          perfMetrics.length > 0 ? perfMetrics.reduce((sum, m) => sum + m.avgLatency, 0) / perfMetrics.length : 0;

        // Top 5 endpoints by request count
        const topEndpoints = perfMetrics
          .sort((a, b) => b.requests - a.requests)
          .slice(0, 5)
          .map((m) => ({
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
      } catch (err: unknown) {
        logger.error({ module: 'monitoring', err }, 'Failed to fetch system health');
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
        const metrics = getPerformanceMetrics() as PerfMetric[];

        // Aggregate by endpoint pattern (group similar paths)
        const summary = metrics.map((m) => ({
          endpoint: m.endpoint,
          method: m.method,
          requests: m.requests,
          errorRate: m.errorRate.toFixed(2) + '%',
          avgLatency: Math.round(m.avgLatency) + 'ms',
          status: m.errorRate > 5 ? 'unhealthy' : m.errorRate > 1 ? 'degraded' : 'healthy',
        }));

        res.json(summary);
      } catch (err: unknown) {
        logger.error({ module: 'monitoring', err }, 'Failed to fetch endpoint summary');
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

// ----- Webhooks Router (performance data from n8n) -----

import { performanceWebhookSchema } from '../validation/schemas';

export const webhooksRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { validateN8nWebhook } = ctx.middleware;

  /**
   * POST /performance - Webhook for n8n to POST social media engagement data
   * Requires webhook signature validation (same secret as n8n callbacks).
   */
  router.post(
    '/performance',
    validateN8nWebhook,
    validate(performanceWebhookSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { generationId, platform, impressions, engagementRate, clicks, conversions } = req.body;

        logger.info({ module: 'PerformanceWebhook', generationId, platform }, 'Performance data received');

        // Verify generation exists
        const generation = await storage.getGenerationById(generationId);
        if (!generation) {
          return res.status(404).json({
            success: false,
            error: 'Generation not found',
          });
        }

        // Save performance data
        const performanceRecord = await storage.saveGenerationPerformance({
          generationId,
          platform,
          impressions: impressions ?? 0,
          engagementRate: engagementRate ?? 0,
          clicks: clicks ?? 0,
          conversions: conversions ?? 0,
          fetchedAt: new Date(),
        });

        res.json({
          success: true,
          data: { id: performanceRecord.id },
          message: 'Performance data saved',
        });
      } catch (err: unknown) {
        logger.error({ module: 'PerformanceWebhook', err }, 'Failed to save performance data');

        res.status(500).json({
          success: false,
          error: 'Failed to save performance data',
        });
      }
    }),
  );

  return router;
};

export const webhooksRouterModule: RouterModule = {
  prefix: '/api/webhooks',
  factory: webhooksRouter,
  description: 'Performance data webhooks from n8n',
  endpointCount: 1,
  requiresAuth: false, // Uses webhook signature validation instead
  tags: ['webhooks', 'performance', 'n8n'],
};
