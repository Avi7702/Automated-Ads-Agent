/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Quota Router
 * Quota monitoring, alerts, and Google Cloud sync endpoints
 *
 * Endpoints:
 * - GET /api/quota/status - Real-time quota status
 * - GET /api/quota/history - Historical usage data
 * - GET /api/quota/breakdown - Usage breakdown by category
 * - GET /api/quota/rate-limit-status - Check if currently rate limited
 * - GET /api/quota/alerts - Get alert configurations
 * - PUT /api/quota/alerts - Update or create alert configuration
 * - GET /api/quota/check-alerts - Check triggered alerts
 * - GET /api/quota/google/status - Get Google Cloud sync status
 * - GET /api/quota/google/snapshot - Get latest Google quota snapshot
 * - POST /api/quota/google/sync - Trigger manual sync
 * - GET /api/quota/google/history - Get sync history
 * - GET /api/quota/google/snapshots - Get historical snapshots
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const quotaRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth } = ctx.middleware;
  const { quotaMonitoring, getGoogleCloudService } = ctx.domainServices;

  /**
   * GET /status - Real-time quota status
   */
  router.get(
    '/status',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const brandId = (req.session as any)?.userId || 'anonymous';
        const status = await quotaMonitoring.getQuotaStatus(brandId);
        res.json(status);
      } catch (error: any) {
        logger.error({ module: 'QuotaStatus', err: error }, 'Error fetching quota status');
        res.status(500).json({ error: 'Failed to get quota status' });
      }
    }),
  );

  /**
   * GET /history - Historical usage data
   */
  router.get(
    '/history',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const brandId = (req.session as any)?.userId || 'anonymous';
        const { windowType, startDate, endDate } = req.query;

        const history = await quotaMonitoring.getUsageHistory({
          brandId,
          windowType: (windowType as 'minute' | 'hour' | 'day') || 'hour',
          startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: endDate ? new Date(endDate as string) : new Date(),
        });

        res.json({ history });
      } catch (error: any) {
        logger.error({ module: 'QuotaHistory', err: error }, 'Error fetching quota history');
        res.status(500).json({ error: 'Failed to get quota history' });
      }
    }),
  );

  /**
   * GET /breakdown - Usage breakdown by category
   */
  router.get(
    '/breakdown',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const brandId = (req.session as any)?.userId || 'anonymous';
        const { period } = req.query;

        const breakdown = await quotaMonitoring.getUsageBreakdown({
          brandId,
          period: (period as 'today' | 'week' | 'month') || 'today',
        });

        res.json(breakdown);
      } catch (error: any) {
        logger.error({ module: 'QuotaBreakdown', err: error }, 'Error fetching quota breakdown');
        res.status(500).json({ error: 'Failed to get quota breakdown' });
      }
    }),
  );

  /**
   * GET /rate-limit-status - Check if currently rate limited
   */
  router.get(
    '/rate-limit-status',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const brandId = (req.session as any)?.userId || 'anonymous';
        const status = await quotaMonitoring.getRateLimitStatus(brandId);
        res.json(status);
      } catch (error: any) {
        logger.error({ module: 'RateLimitStatus', err: error }, 'Error fetching rate limit status');
        res.status(500).json({ error: 'Failed to get rate limit status' });
      }
    }),
  );

  /**
   * GET /alerts - Get alert configurations
   */
  router.get(
    '/alerts',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const brandId = (req.session as any).userId;
        const alerts = await quotaMonitoring.getAlerts(brandId);
        res.json({ alerts });
      } catch (error: any) {
        logger.error({ module: 'QuotaAlertsGet', err: error }, 'Error getting quota alerts');
        res.status(500).json({ error: 'Failed to get quota alerts' });
      }
    }),
  );

  /**
   * PUT /alerts - Update or create alert configuration
   */
  router.put(
    '/alerts',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const brandId = (req.session as any).userId;
        const { alertType, thresholdValue, isEnabled } = req.body;

        if (!alertType || thresholdValue === undefined) {
          return res.status(400).json({ error: 'alertType and thresholdValue are required' });
        }

        const alert = await quotaMonitoring.setAlert({
          brandId,
          alertType,
          thresholdValue,
          isEnabled: isEnabled ?? true,
        });

        res.json(alert);
      } catch (error: any) {
        logger.error({ module: 'QuotaAlertsUpdate', err: error }, 'Error updating quota alerts');
        res.status(500).json({ error: 'Failed to update quota alert' });
      }
    }),
  );

  /**
   * GET /check-alerts - Check triggered alerts
   */
  router.get(
    '/check-alerts',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const brandId = (req.session as any)?.userId || 'anonymous';
        const triggered = await quotaMonitoring.checkAlerts(brandId);
        res.json({ triggered });
      } catch (error: any) {
        logger.error({ module: 'CheckAlerts', err: error }, 'Error checking alerts');
        res.status(500).json({ error: 'Failed to check alerts' });
      }
    }),
  );

  // ===== Google Cloud Monitoring Sync =====

  /**
   * GET /google/status - Get Google Cloud sync status
   */
  router.get(
    '/google/status',
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const service = await getGoogleCloudService();
        if (!service) {
          return res.status(503).json({ error: 'Google Cloud Monitoring not available' });
        }
        const syncStatus = service.getSyncStatus();
        const lastSnapshot = service.getLastSync();

        res.json({
          ...syncStatus,
          lastSnapshot: lastSnapshot
            ? {
                quotas: lastSnapshot.quotas,
                projectId: lastSnapshot.projectId,
                service: lastSnapshot.service,
              }
            : null,
        });
      } catch (error: any) {
        logger.error({ module: 'GoogleQuotaStatus', err: error }, 'Error fetching Google quota status');
        res.status(500).json({ error: 'Failed to get Google quota status' });
      }
    }),
  );

  /**
   * GET /google/snapshot - Get latest Google quota snapshot
   */
  router.get(
    '/google/snapshot',
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const service = await getGoogleCloudService();
        const snapshot = service?.getLastSync();

        if (!snapshot) {
          // Try to get from database if not in memory
          const dbSnapshot = await storage.getLatestGoogleQuotaSnapshot();
          if (dbSnapshot) {
            res.json(dbSnapshot);
            return;
          }
          return res.status(404).json({ error: 'No quota snapshot available' });
        }

        res.json(snapshot);
      } catch (error: any) {
        logger.error({ module: 'GoogleQuotaSnapshot', err: error }, 'Error fetching Google quota snapshot');
        res.status(500).json({ error: 'Failed to get Google quota snapshot' });
      }
    }),
  );

  /**
   * POST /google/sync - Trigger manual sync
   */
  router.post(
    '/google/sync',
    ctx.middleware.requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const service = await getGoogleCloudService();
        if (!service) {
          return res.status(503).json({ error: 'Google Cloud Monitoring not available' });
        }
        if (!service.isConfigured()) {
          return res.status(400).json({
            error: 'Google Cloud Monitoring not configured',
            details:
              'Set GOOGLE_CLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_CREDENTIALS_JSON environment variables',
          });
        }

        // Create sync history entry
        const syncEntry = await storage.createSyncHistoryEntry({
          startedAt: new Date(),
          status: 'running',
          metricsRequested: 3, // We request 3 metrics
          metricsFetched: 0,
          triggerType: 'manual',
        });

        // Perform the sync
        let snapshot;
        try {
          snapshot = await service.triggerManualSync();
        } catch {
          // Mark sync entry as failed if triggerManualSync throws
          await storage.updateSyncHistoryEntry(syncEntry.id, {
            completedAt: new Date(),
            durationMs: Date.now() - syncEntry.startedAt.getTime(),
            status: 'failed',
            metricsFetched: 0,
            errorMessage: 'Sync failed unexpectedly',
          });
          throw new Error('Google quota sync failed');
        }

        // Update sync history
        await storage.updateSyncHistoryEntry(syncEntry.id, {
          completedAt: new Date(),
          durationMs: Date.now() - syncEntry.startedAt.getTime(),
          status: snapshot.syncStatus,
          metricsFetched: snapshot.quotas.length,
          errorMessage: snapshot.errorMessage,
        });

        res.json({
          success: snapshot.syncStatus !== 'failed',
          snapshot,
          syncHistoryId: syncEntry.id,
        });
      } catch {
        logger.error({ module: 'GoogleQuotaManualSync' }, 'Error syncing Google quota');
        res.status(500).json({ error: 'Failed to sync Google quota data' });
      }
    }),
  );

  /**
   * GET /google/history - Get sync history
   */
  router.get(
    '/google/history',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const rawLimit = parseInt(String(req.query['limit'] ?? ''), 10);
        const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 100) : 20;
        const history = await storage.getRecentSyncHistory(limit);
        res.json({ history });
      } catch {
        logger.error({ module: 'GoogleQuotaSyncHistory' }, 'Error fetching sync history');
        res.status(500).json({ error: 'Failed to get sync history' });
      }
    }),
  );

  /**
   * GET /google/snapshots - Get historical snapshots
   */
  router.get(
    '/google/snapshots',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const brandIdParam = req.query['brandId'] as string | undefined;
        const startDate = new Date((req.query['startDate'] as string) || Date.now() - 7 * 24 * 60 * 60 * 1000);
        const endDate = new Date((req.query['endDate'] as string) || Date.now());
        const limit = parseInt(String(req.query['limit'] ?? '')) || 100;

        const snapshots = await storage.getGoogleQuotaSnapshotHistory({
          ...(brandIdParam != null && { brandId: brandIdParam }),
          startDate,
          endDate,
          limit,
        });

        res.json({ snapshots });
      } catch (error: any) {
        logger.error({ module: 'GoogleQuotaSnapshotsHistory', err: error }, 'Error fetching snapshots history');
        res.status(500).json({ error: 'Failed to get snapshot history' });
      }
    }),
  );

  return router;
};

export const quotaRouterModule: RouterModule = {
  prefix: '/api/quota',
  factory: quotaRouter,
  description: 'Quota monitoring, alerts, and Google Cloud sync',
  endpointCount: 12,
  requiresAuth: false, // Mixed - some endpoints don't require auth
  tags: ['quota', 'monitoring', 'google-cloud'],
};
