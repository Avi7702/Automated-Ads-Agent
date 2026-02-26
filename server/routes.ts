import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { db } from './db';

// Modular Router System (Sprint 2)
import { routerModules } from './routes/index';
import { registerRouters } from './routes/utils/registerRouters';
import { buildRouterContext } from './routes/utils/buildContext';

import express from 'express';
import path from 'path';
import { createRateLimiter } from './middleware/rateLimit';
import { logger } from './lib/logger';
import { startPatternCleanupScheduler } from './jobs/patternCleanupJob';
import { startPostingJobScheduler } from './jobs/postingJob';
import { startTokenRefreshScheduler } from './jobs/tokenRefreshJob';

// Lazy-load Google Cloud Monitoring to prevent import-time errors
interface GoogleCloudService {
  getSyncStatus(): Record<string, unknown>;
  getLastSync(): {
    quotas: unknown[];
    projectId: string;
    service: string;
    syncStatus: string;
    errorMessage?: string;
  } | null;
  isConfigured(): boolean;
  triggerManualSync(): Promise<{
    quotas: unknown[];
    projectId: string;
    service: string;
    syncStatus: string;
    errorMessage?: string;
  }>;
  startAutoSync(): void;
}
let googleCloudMonitoringService: GoogleCloudService | null = null;
async function getGoogleCloudService(): Promise<GoogleCloudService | null> {
  if (!googleCloudMonitoringService) {
    try {
      const module = await import('./services/googleCloudMonitoringService');
      googleCloudMonitoringService = module.googleCloudMonitoringService as GoogleCloudService;
    } catch (error) {
      logger.error({ module: 'GoogleCloudMonitoring', err: error }, 'Failed to load module');
    }
  }
  return googleCloudMonitoringService;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ============================================
  // MODULAR ROUTERS (Sprint 2 Migration)
  // All endpoints are handled by domain routers.
  // ============================================
  const routerContext = buildRouterContext();
  registerRouters(app, routerModules, routerContext);
  logger.info(
    {
      routerCount: routerModules.length,
      endpoints: routerModules.reduce((sum, m) => sum + m.endpointCount, 0),
    },
    'Modular routers registered',
  );

  // ============================================
  // STATIC FILE SERVING
  // ============================================

  // Serve static files from attached_assets directory
  app.use(
    '/attached_assets',
    express.static(path.join(process.cwd(), 'attached_assets'), {
      maxAge: '1h',
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
      },
    }),
  );

  // Serve uploaded images (generations)
  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'uploads'), {
      maxAge: '1h',
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
      },
    }),
  );

  // ============================================
  // GLOBAL RATE LIMITING
  // ============================================

  // Apply rate limiting to API routes
  // Exempt lightweight read-only endpoints from the global rate limiter
  const rateLimitExemptPaths = new Set(['/api/pricing/estimate']);
  const rateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  });
  app.use('/api/', (req, res, next) => {
    if (rateLimitExemptPaths.has(req.originalUrl.split('?')[0] as string)) {
      return next();
    }
    return rateLimiter(req, res, next);
  });

  // ============================================
  // BACKGROUND JOBS & INITIALIZATION
  // ============================================

  // Start Google Cloud Monitoring auto-sync on server startup
  (async () => {
    try {
      const service = await getGoogleCloudService();
      if (service) {
        service.startAutoSync();
        logger.info({ module: 'GoogleCloudMonitoring' }, 'Auto-sync started');
      }
    } catch (error) {
      logger.error({ module: 'GoogleCloudMonitoring', err: error }, 'Failed to start auto-sync');
    }
  })();

  // Start pattern cleanup scheduler (Learn from Winners 24-hour TTL)
  startPatternCleanupScheduler();

  // Start posting job (claims due posts and publishes directly via platform APIs)
  startPostingJobScheduler();

  // Start token refresh job (proactively refreshes OAuth tokens before expiry)
  startTokenRefreshScheduler();

  // Load any saved Gemini API key on startup (single-tenant: find any valid key)
  (async () => {
    try {
      const { userApiKeys } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const [row] = await db
        .select()
        .from(userApiKeys)
        .where(and(eq(userApiKeys.service, 'gemini'), eq(userApiKeys.isValid, true)))
        .limit(1);

      if (row) {
        const { decryptApiKey } = await import('./services/encryptionService');
        const decryptedKey = decryptApiKey({
          ciphertext: row.encryptedKey,
          iv: row.iv,
          authTag: row.authTag,
        });
        const { setGlobalGeminiClient } = await import('./lib/geminiClient');
        const { createGeminiClient } = await import('./lib/gemini');
        setGlobalGeminiClient(createGeminiClient(decryptedKey));
        logger.info({ userId: row.userId }, 'Loaded saved Gemini API key on startup');
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to load saved Gemini key on startup');
    }
  })();

  // ============================================
  // HTTP SERVER
  // ============================================

  const httpServer = createServer(app);

  // Initialize real-time collaboration (Socket.io)
  try {
    const { initCollaboration } = await import('./lib/collaboration');
    initCollaboration(httpServer);
  } catch (err) {
    logger.warn({ err }, 'Failed to initialize collaboration (Socket.io) — feature disabled');
  }

  return httpServer;
}
