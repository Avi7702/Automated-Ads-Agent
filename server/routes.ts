/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Express } from 'express';
import { createServer, type Server } from 'http';
import { storage } from './storage';
import { db, pool } from './db';
import { seedBrandProfile } from './seeds/seedBrandProfile';
import multer from 'multer';

// Modular Router System (Sprint 2)
import { routerModules } from './routes/index';
import { registerRouters } from './routes/utils/registerRouters';
import { buildRouterContext } from './routes/utils/buildContext';

import { deleteFile } from './fileStorage';
import { insertInstallationScenarioSchema, insertProductRelationshipSchema } from '@shared/schema';
import { validate } from './middleware/validate';
import { forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema } from './validation/schemas';
import express from 'express';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { authService } from './services/authService';
import { requireAuth } from './middleware/auth';
import { validateN8nWebhook } from './middleware/webhookAuth';
import { isServerShuttingDown } from './utils/gracefulShutdown';
import { createRateLimiter } from './middleware/rateLimit';
import { telemetry } from './instrumentation';
import {
  computeAdaptiveEstimate,
  estimateGenerationCostMicros,
  normalizeResolution,
} from './services/pricingEstimator';
import { quotaMonitoringService } from './services/quotaMonitoringService';
import {
  installationScenarioRAG,
  getRoomInstallationContext,
  ROOM_TYPES,
  type RoomType,
} from './services/installationScenarioRAG';
import {
  suggestRelationships,
  findSimilarProducts,
  analyzeRelationshipType,
  batchSuggestRelationships,
  autoCreateRelationships,
} from './services/relationshipDiscoveryRAG';
import { brandImageRecommendationRAG } from './services/brandImageRecommendationRAG';
import {
  matchTemplateForContext,
  analyzeTemplatePatterns,
  suggestTemplateCustomizations,
} from './services/templatePatternRAG';
import { encryptApiKey, generateKeyPreview, validateMasterKeyConfigured } from './services/encryptionService';
import {
  validateApiKey,
  isValidService,
  getSupportedServices,
  type ServiceName,
} from './services/apiKeyValidationService';
import {
  saveApiKeySchema,
  uploadPatternSchema,
  updatePatternSchema,
  applyPatternSchema,
  ratePatternSchema,
  listPatternsQuerySchema,
  generateCompletePostSchema,
  saveN8nConfigSchema,
  n8nCallbackSchema,
  syncAccountSchema,
  performanceWebhookSchema,
} from './validation/schemas';
import { logger } from './lib/logger';
import { validateFileType, uploadPatternLimiter, checkPatternQuota } from './middleware/uploadValidation';
import { promptInjectionGuard } from './middleware/promptInjectionGuard';
import { toGenerationDTO, toGenerationDTOArray } from './dto/generationDTO';
import { processUploadForPatterns, formatPatternsForPrompt } from './services/patternExtractionService';
import { startPatternCleanupScheduler } from './jobs/patternCleanupJob';
import { startPostingJobScheduler } from './jobs/postingJob';
import { startTokenRefreshScheduler } from './jobs/tokenRefreshJob';
import { handleN8nCallback } from './services/n8nPostingService';
import { generationQueue, generationQueueEvents } from './lib/queue';
import { JobType, JobProgress } from './jobs/types';
import { visionAnalysisService } from './services/visionAnalysisService';
import { productKnowledgeService } from './services/productKnowledgeService';

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 6, // Max 6 files
  },
});

// Validate and initialize Cloudinary
if (
  !process.env['CLOUDINARY_CLOUD_NAME'] ||
  !process.env['CLOUDINARY_API_KEY'] ||
  !process.env['CLOUDINARY_API_SECRET']
) {
  logger.warn({ module: 'Cloudinary' }, 'Missing credentials - product library features disabled');
}

const isCloudinaryConfigured = !!(
  process.env['CLOUDINARY_CLOUD_NAME'] &&
  process.env['CLOUDINARY_API_KEY'] &&
  process.env['CLOUDINARY_API_SECRET']
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env['CLOUDINARY_CLOUD_NAME'] ?? '',
    api_key: process.env['CLOUDINARY_API_KEY'] ?? '',
    api_secret: process.env['CLOUDINARY_API_SECRET'] ?? '',
  });
}

// Initialize TWO Gemini clients:
// 1. genaiText - for text operations (uses Replit AI Integrations for better quotas)
// 2. genaiImage - for image generation (uses direct Google API as Replit doesn't support image models)

import { genAI, createGeminiClient } from './lib/gemini';

// Resolve user's Gemini API key (database first, then env var fallback)
// Returns a GoogleGenAI client configured with the best available key
async function getGeminiClientForUser(userId: string | undefined): Promise<typeof genAI> {
  if (!userId) return genAI;
  try {
    const resolved = await storage.resolveApiKey(userId, 'gemini');
    if (resolved.key && resolved.source === 'user') {
      return createGeminiClient(resolved.key);
    }
  } catch {
    // Fall through to default
  }
  return genAI;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ============================================
  // MODULAR ROUTERS (Sprint 2 Migration)
  // These routers handle their endpoints independently.
  // Legacy endpoints below are being migrated gradually.
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
  // LEGACY ENDPOINTS (Being Migrated)
  // The following endpoints are still in this file
  // and will be removed as routers are completed.
  // ============================================

  // NOTE: Health endpoints migrated to health.router.ts
  // NOTE: Auth endpoints migrated to auth.router.ts
  // NOTE: Monitoring endpoints migrated to monitoring.router.ts
  // NOTE: Templates endpoints migrated to templates.router.ts
  // NOTE: Brand Images endpoints migrated to brandImages.router.ts
  // NOTE: File Search endpoints migrated to catalog.router.ts
  // NOTE: Installation Scenarios endpoints migrated to scenarios.router.ts
  // NOTE: Learned Patterns endpoints migrated to patterns.router.ts
  // NOTE: Copywriting standalone endpoint migrated to copywriting.router.ts
  // NOTE: Social endpoints migrated to social.router.ts
  // NOTE: N8N callback migrated to n8n.router.ts
  // NOTE: Content Planner endpoints migrated to planning.router.ts
  // NOTE: Analyze Image endpoint migrated to image.router.ts

  // LEGACY: Liveness probe - keeping for backwards compatibility during migration
  // Will be removed once migration is complete and verified
  app.get('/api/health/live', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Readiness probe - can we handle traffic?
  app.get('/api/health/ready', async (_req, res) => {
    if (isServerShuttingDown()) {
      return res.status(503).json({
        status: 'shutting_down',
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Check database connectivity with a simple query
      await pool.query('SELECT 1');

      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'ok',
        },
      });
    } catch {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'failed',
        },
      });
    }
  });

  // Legacy health endpoint for backwards compatibility
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Web Vitals analytics endpoint — logs metrics via Pino
  app.post('/api/analytics/vitals', express.text({ type: '*/*', limit: '1kb' }), (req, res) => {
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

  // ===== AUTH ROUTES =====

  // POST /api/auth/register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      const hashedPassword = await authService.hashPassword(password);
      const user = await storage.createUser(email, hashedPassword);

      (req as any).session.userId = user.id;

      telemetry.trackAuth({
        action: 'register',
        success: true,
        userId: user.id,
      });

      res.json({ id: user.id, email: user.email });
    } catch (error: any) {
      logger.error({ module: 'Auth', action: 'register', err: error }, 'Registration error');

      telemetry.trackAuth({
        action: 'register',
        success: false,
        reason: error.message,
      });

      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // POST /api/auth/login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Check lockout
      if (await authService.isLockedOut(email)) {
        const remaining = await authService.getLockoutTimeRemaining(email);
        return res.status(429).json({
          error: 'Too many failed attempts. Try again later.',
          retryAfter: remaining,
        });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        await authService.recordFailedLogin(email);
        telemetry.trackAuth({
          action: 'login',
          success: false,
          reason: 'user_not_found',
        });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const { valid, newHash } = await authService.comparePasswordWithRehash(
        password,
        user.passwordHash || user.password,
      );
      if (!valid) {
        await authService.recordFailedLogin(email);
        telemetry.trackAuth({
          action: 'login',
          success: false,
          reason: 'invalid_password',
        });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Transparent bcrypt→argon2 migration: update hash if re-hashed
      if (newHash) {
        await storage.updatePasswordHash(user.id, newHash);
      }

      await authService.clearFailedLogins(email);
      (req as any).session.userId = user.id;

      telemetry.trackAuth({
        action: 'login',
        success: true,
        userId: user.id,
      });

      res.json({ id: user.id, email: user.email });
    } catch (error: any) {
      logger.error({ module: 'Auth', action: 'login', err: error }, 'Login error');

      telemetry.trackAuth({
        action: 'login',
        success: false,
        reason: error.message,
      });

      res.status(500).json({ error: 'Login failed' });
    }
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req, res) => {
    (req as any).session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  // GET /api/auth/me
  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ id: user.id, email: user.email });
    } catch (error: any) {
      logger.error({ module: 'Auth', action: 'me', err: error }, 'Get user error');
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // GET /api/auth/demo - Auto-login as demo user for single-tenant mode
  app.get('/api/auth/demo', async (req, res) => {
    try {
      const demoEmail = 'demo@company.com';
      let user = await storage.getUserByEmail(demoEmail);

      if (!user) {
        // Create demo user if doesn't exist
        const hashedPassword = await authService.hashPassword('demo123');
        user = await storage.createUser(demoEmail, hashedPassword);
      }

      (req as any).session.userId = user.id;
      res.json({ id: user.id, email: user.email, isDemo: true });
    } catch (error: any) {
      logger.error({ module: 'Auth', action: 'demo', err: error }, 'Demo login error');
      res.status(500).json({ error: 'Demo login failed' });
    }
  });

  // POST /api/auth/forgot-password — Request password reset
  app.post('/api/auth/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
    try {
      const { email } = req.body;
      // Always return success to avoid email enumeration
      logger.info({ module: 'Auth', action: 'forgot-password', email }, 'Password reset requested');
      res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
    } catch (error: any) {
      logger.error({ module: 'Auth', action: 'forgot-password', err: error }, 'Password reset error');
      res.status(500).json({ error: 'Failed to process request' });
    }
  });

  // POST /api/auth/reset-password — Reset password with token
  app.post('/api/auth/reset-password', validate(resetPasswordSchema), async (req, res) => {
    try {
      const { token: _token, newPassword: _newPassword } = req.body;
      // Token validation will be implemented when email service is added
      logger.info({ module: 'Auth', action: 'reset-password' }, 'Password reset attempted');
      res.status(501).json({ error: 'Email service not configured. Contact administrator.' });
    } catch (error: any) {
      logger.error({ module: 'Auth', action: 'reset-password', err: error }, 'Password reset error');
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  // POST /api/auth/verify-email — Verify email with token
  app.post('/api/auth/verify-email', validate(verifyEmailSchema), async (req, res) => {
    try {
      const { token: _verifyToken } = req.body;
      logger.info({ module: 'Auth', action: 'verify-email' }, 'Email verification attempted');
      res.status(501).json({ error: 'Email service not configured. Contact administrator.' });
    } catch (error: any) {
      logger.error({ module: 'Auth', action: 'verify-email', err: error }, 'Email verification error');
      res.status(500).json({ error: 'Failed to verify email' });
    }
  });

  // DELETE /api/auth/account — Delete user account
  app.delete('/api/auth/account', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await storage.deleteUser(userId);

      req.session.destroy((destroyError) => {
        if (destroyError) {
          logger.warn(
            { module: 'Auth', action: 'delete-account', err: destroyError },
            'Session destroy failed after account deletion',
          );
        }
      });

      res.clearCookie('connect.sid');
      res.json({ message: 'Account deleted successfully' });
    } catch (error: any) {
      logger.error({ module: 'Auth', action: 'delete-account', err: error }, 'Account deletion error');
      res.status(500).json({ error: 'Failed to delete account' });
    }
  });

  // GET /api/auth/export — Export all user data (data portability)
  app.get('/api/auth/export', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUserById(userId);
      // OPTIMIZATION: Filter by userId in the database instead of in-memory
      const generations = await storage.getGenerationsByUserId(userId, 1000);
      const products = await storage.getProducts(1000);

      res.json({
        exportedAt: new Date().toISOString(),
        user: user ? { id: user.id, email: user.email, createdAt: user.createdAt } : null,
        generations,
        products,
      });
    } catch (error: any) {
      logger.error({ module: 'Auth', action: 'export', err: error }, 'Data export error');
      res.status(500).json({ error: 'Failed to export data' });
    }
  });

  // ===== END AUTH ROUTES =====
  // Price estimator (adaptive, based on generation history)
  app.get('/api/pricing/estimate', async (req, res) => {
    try {
      const brandId = (req as any).session?.userId || 'anonymous';

      const resolution = normalizeResolution(String(req.query['resolution'] ?? '')) || '2K';
      const operation = (req.query['operation'] === 'edit' ? 'edit' : 'generate') as 'generate' | 'edit';
      const inputImagesCount = Math.max(
        0,
        Math.min(6, parseInt(String(req.query['inputImagesCount'] ?? '0'), 10) || 0),
      );
      const promptChars = Math.max(0, Math.min(20000, parseInt(String(req.query['promptChars'] ?? '0'), 10) || 0));

      const prior = estimateGenerationCostMicros({
        resolution,
        inputImagesCount,
        promptChars,
      });

      const rows = await storage.getGenerationUsageRows({
        brandId,
        operation,
        resolution,
        inputImagesCount,
        limit: 300,
      });

      const estimate = computeAdaptiveEstimate({
        rows,
        priorMeanMicros: prior.estimatedCostMicros,
        priorStrength: 10,
        halfLifeDays: 7,
      });

      const microsToUsd = (micros: number) => Math.round(micros) / 1_000_000;

      res.json({
        currency: 'USD',
        estimatedCost: microsToUsd(estimate.estimatedCostMicros),
        p50: microsToUsd(estimate.p50Micros),
        p90: microsToUsd(estimate.p90Micros),
        sampleCount: estimate.sampleCount,
        effectiveSampleCount: estimate.effectiveSampleCount,
        lastUpdatedAt: estimate.lastUpdatedAt,
        usedFallback: estimate.usedFallback,
      });
    } catch (error: any) {
      logger.error({ module: 'PricingEstimate', err: error }, 'Failed to estimate price');
      res.status(500).json({ error: 'Failed to estimate price' });
    }
  });

  // /api/transform handler migrated to server/routes/generations.router.ts (transformRouterModule)

  // Get all generations (gallery)
  app.get('/api/generations', async (req, res) => {
    try {
      const limit = Math.min(parseInt(String(req.query['limit'] ?? '50')) || 50, 200);
      const offset = Math.max(parseInt(String(req.query['offset'] ?? '0')) || 0, 0);
      const allGenerations = await storage.getGenerations(limit, offset);
      res.json(toGenerationDTOArray(allGenerations));
    } catch (error: any) {
      logger.error({ module: 'Generations', err: error }, 'Error fetching generations');
      res.status(500).json({ error: 'Failed to fetch generations' });
    }
  });

  // Get single generation by ID
  app.get('/api/generations/:id', async (req, res) => {
    try {
      const generation = await storage.getGenerationById(String(req.params['id']));
      if (!generation) {
        return res.status(404).json({ error: 'Generation not found' });
      }
      res.json(toGenerationDTO(generation));
    } catch (error: any) {
      logger.error({ module: 'Generation', err: error }, 'Error fetching generation');
      res.status(500).json({ error: 'Failed to fetch generation' });
    }
  });

  // Get edit history for a generation
  app.get('/api/generations/:id/history', async (req, res) => {
    try {
      const id = String(req.params['id']);

      const generation = await storage.getGenerationById(id);
      if (!generation) {
        return res.status(404).json({ error: 'Generation not found' });
      }

      // Get full edit chain
      const history = await storage.getEditHistory(id);

      res.json({
        current: generation,
        history: history,
        totalEdits: history.length - 1, // Subtract 1 because the original is included
      });
    } catch (error: any) {
      logger.error({ module: 'GenerationHistory', err: error }, 'Error fetching generation history');
      res.status(500).json({ error: 'Failed to fetch generation history' });
    }
  });

  // Delete generation
  app.delete('/api/generations/:id', async (req, res) => {
    try {
      const generation = await storage.getGenerationById(String(req.params['id']));
      if (!generation) {
        return res.status(404).json({ error: 'Generation not found' });
      }

      // Delete files from disk
      await deleteFile(generation.generatedImagePath);
      for (const originalPath of generation.originalImagePaths) {
        await deleteFile(originalPath);
      }

      // Delete from database
      await storage.deleteGeneration(String(req.params['id']));

      res.json({ success: true });
    } catch (error: any) {
      logger.error({ module: 'DeleteGeneration', err: error }, 'Error deleting generation');
      res.status(500).json({ error: 'Failed to delete generation' });
    }
  });

  // Edit generation - Async version using BullMQ job queue
  // Returns immediately with jobId, client polls /api/jobs/:jobId for status
  app.post('/api/generations/:id/edit', promptInjectionGuard, async (req, res) => {
    const userId = (req as any).session?.userId;

    try {
      const id = String(req.params['id']);
      const { editPrompt } = req.body;

      // Validate input
      if (!editPrompt || editPrompt.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Edit prompt is required',
        });
      }

      // Load the parent generation to validate it exists and supports editing
      const parentGeneration = await storage.getGenerationById(id);

      if (!parentGeneration) {
        return res.status(404).json({
          success: false,
          error: 'Generation not found',
        });
      }

      // Check if this generation supports editing
      if (!parentGeneration.conversationHistory) {
        return res.status(400).json({
          success: false,
          error: 'This generation does not support editing. It was created before the edit feature was available.',
        });
      }

      // Create a new generation record for the edit (status: pending)
      const newGeneration = await storage.saveGeneration({
        userId: userId || undefined,
        prompt: parentGeneration.prompt,
        editPrompt: editPrompt.trim(),
        generatedImagePath: parentGeneration.generatedImagePath, // Placeholder, will be updated by worker
        conversationHistory: parentGeneration.conversationHistory,
        parentGenerationId: parentGeneration.id,
        originalImagePaths: parentGeneration.originalImagePaths,
        resolution: parentGeneration.resolution || '2K',
        status: 'pending',
      });

      logger.info(
        { module: 'Edit', generationId: newGeneration.id, parentId: id },
        'Created pending generation for async edit',
      );

      // Enqueue job for background processing
      const editJobData: import('./jobs/types').EditJobData = {
        jobType: JobType.EDIT,
        userId: userId || 'anonymous',
        generationId: newGeneration.id,
        editPrompt: editPrompt.trim(),
        originalImageUrl: parentGeneration.generatedImagePath,
        createdAt: new Date().toISOString(),
      };
      const job = await (generationQueue as import('bullmq').Queue).add('edit-generation', editJobData);

      logger.info({ module: 'Edit', jobId: job.id, generationId: newGeneration.id }, 'Edit job enqueued');

      // Return immediately with job info - client should poll for status
      return res.json({
        success: true,
        generationId: newGeneration.id,
        jobId: job.id,
        status: 'pending',
        message: 'Edit job started. Poll /api/jobs/:jobId for status.',
        parentId: parentGeneration.id,
      });
    } catch (error: any) {
      logger.error({ module: 'Edit', err: error }, 'Edit enqueue error');

      telemetry.trackError({
        endpoint: '/api/generations/:id/edit',
        errorType: error.name || 'unknown',
        statusCode: 500,
        userId,
      });

      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to start edit job',
      });
    }
  });

  // Job status endpoint - Poll this to check job progress
  app.get('/api/jobs/:jobId', async (req, res) => {
    try {
      const jobId = String(req.params['jobId']);

      const job = await generationQueue.getJob(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      const state = await job.getState();
      const progress = job.progress;

      // Get the generation record if available
      let generation = null;
      if (job.data.generationId) {
        generation = await storage.getGenerationById(String(job.data.generationId));
      }

      return res.json({
        success: true,
        jobId: job.id,
        state, // 'waiting', 'active', 'completed', 'failed', 'delayed'
        progress, // { stage, percentage, message }
        data: {
          jobType: job.data.jobType,
          generationId: job.data.generationId,
          createdAt: job.data.createdAt,
        },
        returnvalue: job.returnvalue, // Result when completed
        failedReason: job.failedReason, // Error when failed
        // Include generation data if available and completed
        generation: generation
          ? {
              id: generation.id,
              status: generation.status,
              generatedImagePath: generation.generatedImagePath,
              imageUrl: generation.generatedImagePath?.startsWith('http')
                ? generation.generatedImagePath
                : generation.generatedImagePath
                  ? `/${generation.generatedImagePath.replace(/\\/g, '/')}`
                  : null,
            }
          : null,
      });
    } catch (error: any) {
      logger.error({ module: 'JobStatus', err: error }, 'Error getting job status');
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get job status',
      });
    }
  });

  // SSE endpoint for real-time job status updates
  // Clients connect once and receive push updates instead of polling
  app.get('/api/jobs/:jobId/stream', requireAuth, async (req, res) => {
    const jobId = req.params['jobId'];

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial status
    const job = await generationQueue.getJob(String(jobId ?? ''));
    if (!job) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Job not found' })}\n\n`);
      return res.end();
    }

    const state = await job.getState();
    const progress = job.progress as JobProgress | undefined;
    res.write(
      `data: ${JSON.stringify({
        type: 'status',
        state,
        progress: progress || { percentage: 0 },
      })}\n\n`,
    );

    // If job is already completed or failed, send final state and close
    if (state === 'completed') {
      res.write(
        `data: ${JSON.stringify({
          type: 'completed',
          result: job.returnvalue,
        })}\n\n`,
      );
      return res.end();
    }

    if (state === 'failed') {
      res.write(
        `data: ${JSON.stringify({
          type: 'failed',
          error: job.failedReason || 'Unknown error',
        })}\n\n`,
      );
      return res.end();
    }

    // Listen for job events
    const progressListener = async ({ jobId: eventJobId, data }: { jobId: string; data: JobProgress }) => {
      if (eventJobId === jobId) {
        res.write(`data: ${JSON.stringify({ type: 'progress', progress: data })}\n\n`);
      }
    };

    const completedListener = async ({ jobId: eventJobId, returnvalue }: { jobId: string; returnvalue: any }) => {
      if (eventJobId === jobId) {
        res.write(
          `data: ${JSON.stringify({
            type: 'completed',
            result: returnvalue,
          })}\n\n`,
        );
        cleanup();
        res.end();
      }
    };

    const failedListener = async ({ jobId: eventJobId, failedReason }: { jobId: string; failedReason: string }) => {
      if (eventJobId === jobId) {
        res.write(
          `data: ${JSON.stringify({
            type: 'failed',
            error: failedReason,
          })}\n\n`,
        );
        cleanup();
        res.end();
      }
    };

    // Cleanup function to remove all listeners
    const cleanup = () => {
      generationQueueEvents.off('progress', progressListener as (...args: unknown[]) => void);
      generationQueueEvents.off('completed', completedListener as (...args: unknown[]) => void);
      generationQueueEvents.off('failed', failedListener as (...args: unknown[]) => void);
    };

    generationQueueEvents.on('progress', progressListener as (...args: unknown[]) => void);
    generationQueueEvents.on('completed', completedListener as (...args: unknown[]) => void);
    generationQueueEvents.on('failed', failedListener as (...args: unknown[]) => void);

    // Cleanup on connection close (client disconnects)
    req.on('close', () => {
      logger.debug({ module: 'SSE', jobId }, 'Client disconnected from SSE stream');
      cleanup();
    });
  });

  // Analyze generation - Ask AI about the transformation
  app.post('/api/generations/:id/analyze', async (req, res) => {
    try {
      const id = String(req.params['id']);
      const { question } = req.body;

      if (!question || question.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Question is required',
        });
      }

      const generation = await storage.getGenerationById(id);
      if (!generation) {
        return res.status(404).json({
          success: false,
          error: 'Generation not found',
        });
      }

      logger.info({ module: 'Analyze', generationId: id, question }, 'Analyzing generation');

      // Helper to get MIME type from file path
      const getMimeType = (filePath: string): string => {
        const ext = filePath.toLowerCase().split('.').pop();
        const mimeTypes: Record<string, string> = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
          webp: 'image/webp',
        };
        return mimeTypes[ext || ''] || 'image/png';
      };

      // Load original images as base64
      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const originalImages: { data: string; mimeType: string }[] = [];
      for (const imagePath of generation.originalImagePaths) {
        try {
          const fullPath = pathModule.join(process.cwd(), imagePath);
          const imageBuffer = await fs.readFile(fullPath);
          originalImages.push({
            data: imageBuffer.toString('base64'),
            mimeType: getMimeType(imagePath),
          });
        } catch {
          logger.warn({ module: 'Analyze', imagePath }, 'Could not load original image');
        }
      }

      // Load generated image as base64
      const generatedPath = pathModule.join(process.cwd(), generation.generatedImagePath);
      const generatedBuffer = await fs.readFile(generatedPath);
      const generatedImageBase64 = generatedBuffer.toString('base64');
      const generatedMimeType = getMimeType(generation.generatedImagePath);

      // Call Gemini text model to analyze
      const analysisPrompt = `You are an AI assistant helping users understand image transformations.

Looking at the transformation:
- Original product image(s): [attached]
- Generated marketing image: [attached]  
- Original prompt used: "${generation.prompt}"

User question: ${question}

Provide a helpful, specific answer. If suggesting prompt improvements, give concrete examples. Keep your response concise but informative.`;

      const modelName = 'gemini-3-flash-preview';

      // Build multipart content with images
      const parts: any[] = [{ text: analysisPrompt }];

      // Add original images with correct MIME types
      for (const img of originalImages) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        });
      }

      // Add generated image with correct MIME type
      parts.push({
        inlineData: {
          mimeType: generatedMimeType,
          data: generatedImageBase64,
        },
      });

      // Resolve user's Gemini key (database first, env fallback)
      const analyzeUserId = req.user?.id || (req as any).session?.userId;
      const analyzeClient = await getGeminiClientForUser(analyzeUserId);

      const result = await analyzeClient.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts }],
      });

      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        return res.status(500).json({
          success: false,
          error: 'AI did not return a response',
        });
      }

      logger.info({ module: 'Analyze', responseLength: responseText.length }, 'Response generated');

      return res.json({
        success: true,
        answer: responseText,
      });
    } catch (error: any) {
      logger.error({ module: 'Analyze', err: error }, 'Analyze error');
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to analyze image',
      });
    }
  });

  // Product routes - Upload product to Cloudinary and save to DB
  app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
      if (!isCloudinaryConfigured) {
        return res.status(503).json({ error: 'Product library is not configured' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Validate file is an image
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Only image files are allowed (JPEG, PNG, GIF, WebP)' });
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return res.status(400).json({ error: 'File size must be less than 10MB' });
      }

      const { name, category } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Product name is required' });
      }

      logger.info({ module: 'ProductUpload', productName: name }, 'Uploading to Cloudinary');

      // Upload to Cloudinary using buffer
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'product-library',
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        uploadStream.end(file.buffer);
      });

      // Save product to database
      const product = await storage.saveProduct({
        name,
        cloudinaryUrl: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        category: category || null,
      });

      logger.info({ module: 'ProductUpload', productId: product.id }, 'Saved product');
      res.json(product);
    } catch (error: any) {
      logger.error({ module: 'ProductUpload', err: error }, 'Upload error');
      res.status(500).json({ error: 'Failed to upload product', details: error.message });
    }
  });

  // Get all products
  app.get('/api/products', async (req, res) => {
    try {
      const limit = Math.min(parseInt(String(req.query['limit'] ?? '50')) || 50, 200);
      const offset = Math.max(parseInt(String(req.query['offset'] ?? '0')) || 0, 0);
      const products = await storage.getProducts(limit, offset);
      res.json(products);
    } catch (error: any) {
      logger.error({ module: 'Products', err: error }, 'Error fetching products');
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  // Get single product by ID
  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await storage.getProductById(String(req.params['id']));
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } catch (error: any) {
      logger.error({ module: 'Product', err: error }, 'Error fetching product');
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  });

  // Delete product
  app.delete('/api/products/:id', async (req, res) => {
    try {
      const product = await storage.getProductById(String(req.params['id']));
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const productId = String(req.params['id']);

      // Delete from Cloudinary
      await cloudinary.uploader.destroy(product.cloudinaryPublicId);

      // Invalidate all caches for this product
      await Promise.all([
        visionAnalysisService.invalidateAnalysisCache(productId),
        productKnowledgeService.invalidateProductKnowledgeCache(productId),
      ]);
      logger.info({ module: 'DeleteProduct', productId }, 'Product caches invalidated');

      // Delete from database
      await storage.deleteProduct(productId);

      res.json({ success: true });
    } catch (error: any) {
      logger.error({ module: 'DeleteProduct', err: error }, 'Error deleting product');
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  // Clear all products from database
  app.delete('/api/products', async (_req, res) => {
    try {
      const products = await storage.getProducts();
      const productIds = products.map((p) => p.id);

      // Invalidate all caches for products being deleted
      if (productIds.length > 0) {
        await Promise.all([
          ...productIds.map((id) => visionAnalysisService.invalidateAnalysisCache(id)),
          productKnowledgeService.invalidateMultiProductKnowledgeCache(productIds),
        ]);
        logger.info({ module: 'ClearProducts', productCount: productIds.length }, 'Product caches invalidated');
      }

      await storage.deleteProductsByIds(productIds);

      logger.info({ module: 'Products', clearedCount: products.length }, 'Cleared products from database');
      res.json({ success: true, deleted: products.length });
    } catch (error: any) {
      logger.error({ module: 'ClearProducts', err: error }, 'Error clearing products');
      res.status(500).json({ error: 'Failed to clear products' });
    }
  });

  // Sync products from Cloudinary
  app.post('/api/products/sync', async (req, res) => {
    try {
      if (!isCloudinaryConfigured) {
        return res.status(503).json({ error: 'Cloudinary is not configured' });
      }

      logger.info({ module: 'CloudinarySync' }, 'Starting sync');

      // Fetch all images from Cloudinary (max 500 for now)
      const result = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'image',
        max_results: 500,
        prefix: req.body.folder || '', // Optional folder filter
      });

      logger.info({ module: 'CloudinarySync', imageCount: result.resources.length }, 'Found images');

      // Get existing products to avoid duplicates
      const existingProducts = await storage.getProducts();
      const existingPublicIds = new Set(existingProducts.map((p) => p.cloudinaryPublicId));

      let imported = 0;
      let skipped = 0;

      // Import each image
      for (const resource of result.resources) {
        // Skip if already in database
        if (existingPublicIds.has(resource.public_id)) {
          skipped++;
          continue;
        }

        // Extract name from public_id (e.g., "product-library/bottle" -> "bottle")
        const nameParts = resource.public_id.split('/');
        const name = nameParts[nameParts.length - 1] || resource.public_id;

        // Save to database
        await storage.saveProduct({
          name: name,
          cloudinaryUrl: resource.secure_url,
          cloudinaryPublicId: resource.public_id,
          category: null, // User can update later
        });

        imported++;
      }

      logger.info({ module: 'CloudinarySync', imported, skipped }, 'Sync complete');

      res.json({
        success: true,
        imported,
        skipped,
        total: result.resources.length,
      });
    } catch (error: any) {
      logger.error({ module: 'CloudinarySync', err: error }, 'Sync error');
      res.status(500).json({ error: 'Failed to sync from Cloudinary', details: error.message });
    }
  });

  // Prompt template routes
  app.post('/api/prompt-templates', async (req, res) => {
    try {
      const { title, prompt, category, tags } = req.body;
      if (!title || !prompt) {
        return res.status(400).json({ error: 'Title and prompt are required' });
      }

      const template = await storage.savePromptTemplate({
        title,
        prompt,
        category: category || null,
        tags: tags || [],
      });

      res.json(template);
    } catch (error: any) {
      logger.error({ module: 'PromptTemplate', err: error }, 'Error creating template');
      res.status(500).json({ error: 'Failed to create prompt template' });
    }
  });

  // Get prompt templates (optionally filtered by category)
  app.get('/api/prompt-templates', async (req, res) => {
    try {
      const category = req.query['category'] as string | undefined;
      const templates = await storage.getPromptTemplates(category);
      res.json(templates);
    } catch (error: any) {
      logger.error({ module: 'PromptTemplates', err: error }, 'Error fetching templates');
      res.status(500).json({ error: 'Failed to fetch prompt templates' });
    }
  });

  // Delete prompt template
  app.delete('/api/prompt-templates/:id', async (req, res) => {
    try {
      await storage.deletePromptTemplate(String(req.params['id']));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ module: 'DeletePromptTemplate', err: error }, 'Error deleting template');
      res.status(500).json({ error: 'Failed to delete prompt template' });
    }
  });

  // ===== AD SCENE TEMPLATE ROUTES =====

  // GET /api/ad-templates/categories - Get available categories (must be before :id route)
  app.get('/api/ad-templates/categories', async (_req, res) => {
    try {
      // Return construction-focused categories for NDS
      const categories = [
        { id: 'product_showcase', label: 'Product Showcase', description: 'Rebar, mesh, and materials display' },
        { id: 'installation', label: 'Installation', description: 'On-site installation and usage' },
        { id: 'worksite', label: 'Worksite', description: 'Construction site environments' },
        { id: 'professional', label: 'Professional', description: 'Studio and professional shots' },
        { id: 'outdoor', label: 'Outdoor', description: 'Outdoor construction contexts' },
      ];
      res.json(categories);
    } catch (error: any) {
      logger.error({ module: 'GetTemplateCategories', err: error }, 'Error fetching categories');
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // GET /api/ad-templates - List templates with filters
  app.get('/api/ad-templates', async (req, res) => {
    try {
      const { category, search, platform, aspectRatio } = req.query;

      // If search query provided, use search function
      if (search && typeof search === 'string') {
        const templates = await storage.searchAdSceneTemplates(search);
        return res.json(templates);
      }

      // Otherwise use filters
      const filters: { category?: string; isGlobal?: boolean } = {};
      if (category && typeof category === 'string') {
        filters.category = category;
      }
      filters.isGlobal = true; // Only return global templates by default

      let templates = await storage.getAdSceneTemplates(filters);

      // Additional filtering for platform and aspect ratio
      if (platform && typeof platform === 'string') {
        templates = templates.filter((t) => t.platformHints?.includes(platform));
      }
      if (aspectRatio && typeof aspectRatio === 'string') {
        templates = templates.filter((t) => t.aspectRatioHints?.includes(aspectRatio));
      }

      res.json(templates);
    } catch (error: any) {
      logger.error({ module: 'GetAdTemplates', err: error }, 'Error fetching ad templates');
      res.status(500).json({ error: 'Failed to fetch ad templates' });
    }
  });

  // GET /api/ad-templates/:id - Get single template
  app.get('/api/ad-templates/:id', async (req, res) => {
    try {
      const template = await storage.getAdSceneTemplateById(String(req.params['id']));
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json(template);
    } catch (error: any) {
      logger.error({ module: 'GetAdTemplate', err: error }, 'Error fetching ad template');
      res.status(500).json({ error: 'Failed to fetch ad template' });
    }
  });

  // POST /api/ad-templates - Create template (admin)
  app.post('/api/ad-templates', requireAuth, async (req, res) => {
    try {
      const { insertAdSceneTemplateSchema } = await import('@shared/schema');
      const validatedData = insertAdSceneTemplateSchema.parse(req.body);

      // Set createdBy to current user
      const userId = (req as any).session?.userId;
      const template = await storage.saveAdSceneTemplate({
        ...validatedData,
        createdBy: userId,
      });

      res.status(201).json(template);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid template data', details: error.issues });
      }
      logger.error({ module: 'CreateAdTemplate', err: error }, 'Error creating ad template');
      res.status(500).json({ error: 'Failed to create ad template' });
    }
  });

  // PUT /api/ad-templates/:id - Update template
  app.put('/api/ad-templates/:id', requireAuth, async (req, res) => {
    try {
      const existing = await storage.getAdSceneTemplateById(String(req.params['id']));
      if (!existing) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Validate using partial schema (all fields optional for updates)
      const { insertAdSceneTemplateSchema } = await import('@shared/schema');
      const updateSchema = insertAdSceneTemplateSchema.partial();
      const validatedData = updateSchema.parse(req.body);

      // Strip undefined values for exactOptionalPropertyTypes compatibility
      const cleanData = Object.fromEntries(Object.entries(validatedData).filter(([, v]) => v !== undefined));
      const template = await storage.updateAdSceneTemplate(String(req.params['id']), cleanData);
      res.json(template);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid template data', details: error.issues });
      }
      logger.error({ module: 'UpdateAdTemplate', err: error }, 'Error updating ad template');
      res.status(500).json({ error: 'Failed to update ad template' });
    }
  });

  // DELETE /api/ad-templates/:id - Delete template (admin)
  app.delete('/api/ad-templates/:id', requireAuth, async (req, res) => {
    try {
      const existing = await storage.getAdSceneTemplateById(String(req.params['id']));
      if (!existing) {
        return res.status(404).json({ error: 'Template not found' });
      }

      await storage.deleteAdSceneTemplate(String(req.params['id']));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ module: 'DeleteAdTemplate', err: error }, 'Error deleting ad template');
      res.status(500).json({ error: 'Failed to delete ad template' });
    }
  });

  // ===== END AD SCENE TEMPLATE ROUTES =====

  // COPYWRITING ENDPOINTS

  // Generate ad copy with multiple variations
  app.post('/api/copy/generate', promptInjectionGuard, async (req, res) => {
    try {
      // Use session userId if available, otherwise use a default for demo
      const userId = req.session?.userId || 'demo-user';

      // Validate request
      const { generateCopySchema } = await import('./validation/schemas');
      const validatedData = generateCopySchema.parse(req.body);

      // Verify generation exists
      const generation = await storage.getGenerationById(validatedData.generationId);
      if (!generation) {
        return res.status(404).json({ error: 'Generation not found' });
      }

      // Get user's brand voice if not provided
      let brandVoice = validatedData.brandVoice;
      if (!brandVoice) {
        const user = await storage.getUserById(userId);
        if (user?.brandVoice) {
          brandVoice = user.brandVoice as any;
        }
      }

      // Generate copy variations
      const { copywritingService } = await import('./services/copywritingService');
      const variations = await copywritingService.generateCopy({
        ...validatedData,
        brandVoice,
      });

      // Save all variations to database - use allSettled to handle partial failures
      const saveResults = await Promise.allSettled(
        variations.map((variation, index) =>
          storage.saveAdCopy({
            generationId: validatedData.generationId,
            userId,
            headline: variation.headline,
            hook: variation.hook,
            bodyText: variation.bodyText,
            cta: variation.cta,
            caption: variation.caption,
            hashtags: variation.hashtags,
            platform: validatedData.platform,
            tone: validatedData.tone,
            framework: variation.framework.toLowerCase(),
            campaignObjective: validatedData.campaignObjective,
            productName: validatedData.productName,
            productDescription: validatedData.productDescription,
            productBenefits: validatedData.productBenefits,
            uniqueValueProp: validatedData.uniqueValueProp,
            industry: validatedData.industry,
            targetAudience: validatedData.targetAudience,
            brandVoice: brandVoice,
            socialProof: validatedData.socialProof,
            qualityScore: variation.qualityScore,
            characterCounts: variation.characterCounts,
            variationNumber: index + 1,
            parentCopyId: null,
          }),
        ),
      );

      // Extract successful saves and log any failures
      const savedCopies = saveResults
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map((result) => result.value);

      const failedCount = saveResults.filter((r) => r.status === 'rejected').length;
      if (failedCount > 0) {
        logger.warn(
          { module: 'GenerateCopy', failedCount, totalCount: variations.length },
          'Some variations failed to save',
        );
      }

      if (savedCopies.length === 0) {
        return res.status(500).json({ error: 'Failed to save any copy variations' });
      }

      res.json({
        success: true,
        copies: savedCopies,
        recommended: 0, // First variation is recommended
      });
    } catch (error: any) {
      logger.error({ module: 'GenerateCopy', err: error }, 'Error generating copy');
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.issues });
      }
      res.status(500).json({ error: 'Failed to generate copy', details: error.message });
    }
  });

  // Get copy by generation ID
  app.get('/api/copy/generation/:generationId', async (req, res) => {
    try {
      const copies = await storage.getAdCopyByGenerationId(String(req.params['generationId']));
      res.json({ copies });
    } catch (error: any) {
      logger.error({ module: 'GetCopyByGeneration', err: error }, 'Error fetching copy');
      res.status(500).json({ error: 'Failed to fetch copy' });
    }
  });

  // Get specific copy by ID
  app.get('/api/copy/:id', async (req, res) => {
    try {
      const copy = await storage.getAdCopyById(String(req.params['id']));
      if (!copy) {
        return res.status(404).json({ error: 'Copy not found' });
      }
      res.json({ copy });
    } catch (error: any) {
      logger.error({ module: 'GetCopy', err: error }, 'Error fetching copy');
      res.status(500).json({ error: 'Failed to fetch copy' });
    }
  });

  // Delete copy
  app.delete('/api/copy/:id', async (req, res) => {
    try {
      await storage.deleteAdCopy(String(req.params['id']));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ module: 'DeleteCopy', err: error }, 'Error deleting copy');
      res.status(500).json({ error: 'Failed to delete copy' });
    }
  });

  // Standalone copy generation (no generationId required)
  // Used by BeforeAfterBuilder and TextOnlyMode components
  app.post('/api/copywriting/standalone', async (req, res) => {
    try {
      const {
        platform = 'linkedin',
        tone = 'authentic',
        framework = 'auto',
        campaignObjective = 'engagement',
        productName,
        productDescription,
        variations = 3,
        industry = 'general',
      } = req.body;

      // Validate required fields
      if (!productName || !productDescription) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'productName and productDescription are required',
        });
      }

      // Validate variations
      const variationCount = Math.min(Math.max(parseInt(variations) || 3, 1), 5);

      // Call copywriting service
      const { copywritingService } = await import('./services/copywritingService');
      const generatedVariations = await copywritingService.generateCopy({
        platform,
        tone,
        framework,
        campaignObjective,
        productName,
        productDescription,
        industry,
        variations: variationCount,
        // Provide defaults for fields that copywritingService expects
        productBenefits: [],
        uniqueValueProp: productDescription,
      } as any);

      // Transform to simplified response format
      const responseVariations = generatedVariations.map((v: any) => ({
        copy: v.caption || v.bodyText || '',
        headline: v.headline,
        hook: v.hook,
        hashtags: v.hashtags || [],
        framework: v.framework,
        cta: v.cta,
      }));

      res.json({
        success: true,
        variations: responseVariations,
      });
    } catch (error: any) {
      logger.error({ module: 'StandaloneCopy', err: error }, 'Error generating standalone copy');
      res.status(500).json({
        error: 'Failed to generate copy',
        details: error.message,
      });
    }
  });

  // Update user's brand voice
  app.put('/api/user/brand-voice', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { brandVoice } = req.body;
      if (!brandVoice || !brandVoice.principles || !Array.isArray(brandVoice.principles)) {
        return res.status(400).json({ error: 'Invalid brand voice data' });
      }

      const updatedUser = await storage.updateUserBrandVoice(userId, brandVoice);
      res.json({ success: true, brandVoice: updatedUser.brandVoice });
    } catch (error: any) {
      logger.error({ module: 'UpdateBrandVoice', err: error }, 'Error updating brand voice');
      res.status(500).json({ error: 'Failed to update brand voice' });
    }
  });

  // Admin: Force verification of Brand Profile Seed
  app.post('/api/admin/seed-brand', requireAuth, async (_req, res) => {
    try {
      logger.info({ module: 'Admin' }, 'Force seeding brand profile');
      await seedBrandProfile();
      res.json({ success: true, message: 'Brand Profile seeded successfully' });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Seed failed');
      res.status(500).json({ error: 'Seed failed', details: error.message });
    }
  });

  // Admin: Seed Products
  app.post('/api/admin/seed-products', requireAuth, async (req, res) => {
    try {
      logger.info({ module: 'Admin' }, 'Seeding products');
      const { seedProducts } = await import('./seeds/seedProducts');
      const { sampleOnly, cloudinaryOnly, cloudinaryFolder } = req.body || {};
      const results = await seedProducts({ sampleOnly, cloudinaryOnly, cloudinaryFolder });
      res.json({ success: true, message: 'Products seeded successfully', results });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Product seed failed');
      res.status(500).json({ error: 'Seed failed', details: error.message });
    }
  });

  // Admin: Seed Installation Scenarios
  app.post('/api/admin/seed-installation-scenarios', requireAuth, async (_req, res) => {
    try {
      logger.info({ module: 'Admin' }, 'Seeding installation scenarios');
      const { seedInstallationScenarios } = await import('./seeds/seedInstallationScenarios');
      const results = await seedInstallationScenarios();
      res.json({ success: true, message: 'Installation scenarios seeded successfully', results });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Installation scenarios seed failed');
      res.status(500).json({ error: 'Seed failed', details: error.message });
    }
  });

  // Admin: Seed Product Relationships
  app.post('/api/admin/seed-relationships', requireAuth, async (_req, res) => {
    try {
      logger.info({ module: 'Admin' }, 'Seeding product relationships');
      const { seedProductRelationships } = await import('./seeds/seedRelationships');
      const results = await seedProductRelationships();
      res.json({ success: true, message: 'Product relationships seeded successfully', results });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Relationships seed failed');
      res.status(500).json({ error: 'Seed failed', details: error.message });
    }
  });

  // Admin: Seed Brand Images
  app.post('/api/admin/seed-brand-images', requireAuth, async (req, res) => {
    try {
      logger.info({ module: 'Admin' }, 'Seeding brand images');
      const { seedBrandImages } = await import('./seeds/seedBrandImages');
      const { sampleOnly, cloudinaryOnly, cloudinaryFolder } = req.body || {};
      const results = await seedBrandImages({ sampleOnly, cloudinaryOnly, cloudinaryFolder });
      res.json({ success: true, message: 'Brand images seeded successfully', results });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Brand images seed failed');
      res.status(500).json({ error: 'Seed failed', details: error.message });
    }
  });

  // Admin: Seed Performing Templates
  app.post('/api/admin/seed-templates', requireAuth, async (_req, res) => {
    try {
      logger.info({ module: 'Admin' }, 'Seeding performing templates');
      const { seedPerformingTemplates } = await import('./seeds/seedTemplates');
      const results = await seedPerformingTemplates();
      res.json({ success: true, message: 'Performing templates seeded successfully', results });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Templates seed failed');
      res.status(500).json({ error: 'Seed failed', details: error.message });
    }
  });

  // Admin: Seed Ad Scene Templates
  app.post('/api/admin/seed-ad-scene-templates', requireAuth, async (_req, res) => {
    try {
      logger.info({ module: 'Admin' }, 'Seeding ad scene templates');
      const { seedAdSceneTemplates } = await import('./seeds/seedAdSceneTemplates');
      const results = await seedAdSceneTemplates();
      res.json({ success: true, message: 'Ad scene templates seeded successfully', results });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Ad scene templates seed failed');
      res.status(500).json({ error: 'Seed failed', details: error.message });
    }
  });

  // Admin: Run All Seeds
  app.post('/api/admin/seed-all', requireAuth, async (req, res) => {
    try {
      logger.info({ module: 'Admin' }, 'Running all seeds');
      const { runAllSeeds } = await import('./seeds/runAllSeeds');
      const options = req.body || {};
      const results = await runAllSeeds(options);
      res.json({ success: true, message: 'All seeds completed', results });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Seed all failed');
      res.status(500).json({ error: 'Seed failed', details: error.message });
    }
  });

  // =============================================================================
  // NDS Website Scraper Endpoints
  // =============================================================================

  // Get available categories for scraping
  app.get('/api/admin/scraper/categories', requireAuth, async (_req, res) => {
    try {
      const { getAvailableCategories } = await import('./services/ndsWebsiteScraper');
      const categories = getAvailableCategories();
      res.json({ success: true, categories });
    } catch (error: any) {
      logger.error({ module: 'Scraper', err: error }, 'Failed to get categories');
      res.status(500).json({ error: 'Failed to get categories', details: error.message });
    }
  });

  // Scrape all products from NDS website
  app.post('/api/admin/scraper/scrape-all', requireAuth, async (req, res) => {
    try {
      logger.info({ module: 'Scraper' }, 'Starting full website scrape');
      const { scrapeNDSWebsite } = await import('./services/ndsWebsiteScraper');
      const { categories, dryRun, limit } = req.body || {};
      const results = await scrapeNDSWebsite({ categories, dryRun, limit });
      res.json({ success: true, message: 'Scraping completed', results });
    } catch (error: any) {
      logger.error({ module: 'Scraper', err: error }, 'Full scrape failed');
      res.status(500).json({ error: 'Scraping failed', details: error.message });
    }
  });

  // Scrape a single category
  app.post('/api/admin/scraper/scrape-category/:category', requireAuth, async (req, res) => {
    try {
      const category = String(req.params['category']);
      logger.info({ module: 'Scraper', category }, 'Scraping category');
      const { scrapeSingleCategory } = await import('./services/ndsWebsiteScraper');
      const results = await scrapeSingleCategory(category);
      res.json({ success: true, message: `Category ${category} scraped`, results });
    } catch (error: any) {
      logger.error({ module: 'Scraper', err: error }, 'Category scrape failed');
      res.status(500).json({ error: 'Scraping failed', details: error.message });
    }
  });

  // =============================================================================
  // File Search RAG Endpoints
  // =============================================================================

  // Initialize File Search Store
  app.post('/api/file-search/initialize', requireAuth, async (_req, res) => {
    try {
      const { initializeFileSearchStore } = await import('./services/fileSearchService');
      const store = await initializeFileSearchStore();
      res.json({ success: true, store: { name: store.name, displayName: store.config?.displayName } });
    } catch (error: any) {
      logger.error({ module: 'InitializeFileSearch', err: error }, 'Error initializing file search');
      res.status(500).json({ error: 'Failed to initialize File Search Store' });
    }
  });

  // Upload reference file
  app.post('/api/file-search/upload', upload.single('file'), requireAuth, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { category, description, metadata } = req.body;
      if (!category) {
        return res.status(400).json({ error: 'Category is required' });
      }

      // Safely parse metadata JSON
      let parsedMetadata = {};
      if (metadata) {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch {
          return res.status(400).json({ error: 'Invalid metadata JSON format' });
        }
      }

      const { uploadReferenceFile } = await import('./services/fileSearchService');
      const result = await uploadReferenceFile({
        filePath: req.file.path,
        category,
        description,
        metadata: parsedMetadata,
      });

      res.json({ success: true, file: result });
    } catch (error: any) {
      logger.error({ module: 'UploadReferenceFile', err: error }, 'Error uploading reference file');
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Upload directory of reference files
  app.post('/api/file-search/upload-directory', requireAuth, async (req, res) => {
    try {
      const { directoryPath, category, description } = req.body;
      if (!directoryPath || !category) {
        return res.status(400).json({ error: 'Directory path and category are required' });
      }

      const { uploadDirectoryToFileSearch } = await import('./services/fileSearchService');
      const results = await uploadDirectoryToFileSearch({
        directoryPath,
        category,
        description,
      });

      res.json({ success: true, files: results, count: results.length });
    } catch (error: any) {
      logger.error({ module: 'UploadDirectory', err: error }, 'Error uploading directory');
      res.status(500).json({ error: 'Failed to upload directory' });
    }
  });

  // List reference files
  app.get('/api/file-search/files', requireAuth, async (req, res) => {
    try {
      const { category } = req.query;
      const { listReferenceFiles } = await import('./services/fileSearchService');

      const files = await listReferenceFiles(category as any);
      res.json({ success: true, files, count: files.length });
    } catch (error: any) {
      logger.error({ module: 'ListReferenceFiles', err: error }, 'Error listing reference files');
      res.status(500).json({ error: 'Failed to list files' });
    }
  });

  // Delete reference file
  app.delete('/api/file-search/files/:fileId', requireAuth, async (req, res) => {
    try {
      const fileId = String(req.params['fileId']);
      const { deleteReferenceFile } = await import('./services/fileSearchService');

      await deleteReferenceFile(fileId);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ module: 'DeleteReferenceFile', err: error }, 'Error deleting reference file');
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // Seed File Search Store with initial structure
  app.post('/api/file-search/seed', requireAuth, async (_req, res) => {
    try {
      const { seedFileSearchStore } = await import('./services/fileSearchService');
      const result = await seedFileSearchStore();
      res.json(result);
    } catch (error: any) {
      logger.error({ module: 'SeedFileSearch', err: error }, 'Error seeding file search');
      res.status(500).json({ error: 'Failed to seed File Search Store' });
    }
  });

  // ============================================
  // INTELLIGENT IDEA BANK ENDPOINTS
  // ============================================

  // Analyze a product image (vision analysis)
  app.post('/api/products/:productId/analyze', requireAuth, async (req, res) => {
    try {
      const productId = String(req.params['productId']);
      const userId = (req.session as any).userId;
      const { forceRefresh } = req.body || {};

      const { visionAnalysisService } = await import('./services/visionAnalysisService');
      const product = await storage.getProductById(productId);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const result = await visionAnalysisService.analyzeProductImage(product, userId, forceRefresh);

      if (!result.success) {
        const statusCode = result.error.code === 'RATE_LIMITED' ? 429 : 500;
        return res.status(statusCode).json({ error: result.error.message, code: result.error.code });
      }

      res.json({
        analysis: result.analysis,
        fromCache: !forceRefresh,
      });
    } catch (error: any) {
      logger.error({ module: 'ProductAnalyze', err: error }, 'Error analyzing product');
      res.status(500).json({ error: 'Failed to analyze product' });
    }
  });

  // Get cached analysis for a product
  app.get('/api/products/:productId/analysis', requireAuth, async (req, res) => {
    try {
      const productId = String(req.params['productId']);
      const { visionAnalysisService } = await import('./services/visionAnalysisService');

      const analysis = await visionAnalysisService.getCachedAnalysis(productId);

      if (!analysis) {
        return res.status(404).json({ error: 'No analysis found for this product' });
      }

      res.json({ analysis });
    } catch (error: any) {
      logger.error({ module: 'ProductAnalysisGet', err: error }, 'Error getting product analysis');
      res.status(500).json({ error: 'Failed to get product analysis' });
    }
  });

  // ===== ARBITRARY IMAGE ANALYSIS =====
  // Analyze a temporary upload image (not a product) for IdeaBank context

  app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
    try {
      const userId = (req.session as any)?.userId || 'system-user';
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Validate file type
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'File must be an image' });
      }

      const { visionAnalysisService } = await import('./services/visionAnalysisService');
      const result = await visionAnalysisService.analyzeArbitraryImage(file.buffer, file.mimetype, userId);

      if (!result.success) {
        if (result.error.code === 'RATE_LIMITED') {
          return res.status(429).json({ error: result.error.message });
        }
        return res.status(500).json({ error: result.error.message });
      }

      res.json({
        description: result.analysis.description,
        confidence: result.analysis.confidence,
      });
    } catch (error: any) {
      logger.error({ module: 'AnalyzeImage', err: error }, 'Error analyzing image');
      res.status(500).json({ error: 'Failed to analyze image' });
    }
  });

  // ===== PRODUCT ENRICHMENT ROUTES =====
  // Phase 0.5: Human-in-the-loop product data collection

  // Generate enrichment draft for a product (AI analyzes image + searches web)
  app.post('/api/products/:productId/enrich', requireAuth, async (req, res) => {
    try {
      const productId = String(req.params['productId']);
      const userId = (req.session as any)?.userId;

      const { productEnrichmentService } = await import('./services/productEnrichmentService');
      const result = await productEnrichmentService.generateEnrichmentDraft(productId, userId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        productId: result.productId,
        draft: result.draft,
      });
    } catch (error: any) {
      logger.error({ module: 'ProductEnrichment', err: error }, 'Error enriching product');
      res.status(500).json({ error: 'Failed to generate enrichment draft' });
    }
  });

  // Enrich product from a user-provided URL
  app.post('/api/products/:productId/enrich-from-url', requireAuth, async (req, res) => {
    try {
      const productId = String(req.params['productId']);
      const { productUrl } = req.body;

      if (!productUrl || typeof productUrl !== 'string') {
        return res.status(400).json({ error: 'Product URL is required' });
      }

      // Validate URL format
      try {
        new URL(productUrl);
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      const { enrichFromUrl, saveEnrichmentDraft } = await import('./services/enrichmentServiceWithUrl');
      const result = await enrichFromUrl({ productId: String(productId), productUrl });

      if (!result.success || !result.enrichmentDraft) {
        return res.status(400).json({ error: result.error || 'Failed to enrich from URL' });
      }

      // Save the draft to the product
      await saveEnrichmentDraft(productId, result.enrichmentDraft);

      res.json({
        success: true,
        productId: result.productId,
        draft: result.enrichmentDraft,
      });
    } catch (error: any) {
      logger.error({ module: 'URLEnrichment', err: error }, 'Error enriching from URL');
      res.status(500).json({ error: 'Failed to enrich product from URL' });
    }
  });

  // Get enrichment draft for a product
  app.get('/api/products/:productId/enrichment', requireAuth, async (req, res) => {
    try {
      const productId = String(req.params['productId']);
      const product = await storage.getProductById(productId);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const { productEnrichmentService } = await import('./services/productEnrichmentService');
      const completeness = productEnrichmentService.getEnrichmentCompleteness(product);

      res.json({
        productId,
        status: product.enrichmentStatus || 'pending',
        draft: product.enrichmentDraft,
        verifiedAt: product.enrichmentVerifiedAt,
        source: product.enrichmentSource,
        completeness,
        isReady: productEnrichmentService.isProductReady(product),
      });
    } catch (error: any) {
      logger.error({ module: 'ProductEnrichmentGet', err: error }, 'Error getting product enrichment');
      res.status(500).json({ error: 'Failed to get enrichment data' });
    }
  });

  // Verify/approve enrichment data (human-in-the-loop)
  app.post('/api/products/:productId/enrichment/verify', requireAuth, async (req, res) => {
    try {
      const productId = String(req.params['productId']);
      const userId = (req.session as any)?.userId;
      const { description, features, benefits, specifications, tags, sku, approvedAsIs } = req.body;

      const { productEnrichmentService } = await import('./services/productEnrichmentService');
      const result = await productEnrichmentService.verifyEnrichment(
        { productId, description, features, benefits, specifications, tags, sku, approvedAsIs },
        userId,
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true, message: 'Product enrichment verified' });
    } catch (error: any) {
      logger.error({ module: 'ProductEnrichmentVerify', err: error }, 'Error verifying product enrichment');
      res.status(500).json({ error: 'Failed to verify enrichment' });
    }
  });

  // Get all products needing enrichment
  app.get('/api/products/enrichment/pending', async (req, res) => {
    try {
      const { status } = req.query;

      const { productEnrichmentService } = await import('./services/productEnrichmentService');
      const products = await productEnrichmentService.getProductsNeedingEnrichment(status as any);

      // Return with completeness info
      const productsWithInfo = products.map((product) => ({
        ...product,
        completeness: productEnrichmentService.getEnrichmentCompleteness(product),
        isReady: productEnrichmentService.isProductReady(product),
      }));

      res.json({ products: productsWithInfo });
    } catch (error: any) {
      logger.error({ module: 'ProductsPendingEnrichment', err: error }, 'Error fetching products pending enrichment');
      res.status(500).json({ error: 'Failed to get products needing enrichment' });
    }
  });

  // ============================================
  // INSTALLATION SCENARIOS
  // ============================================

  // Create installation scenario (with validation)
  app.post('/api/installation-scenarios', requireAuth, validate(insertInstallationScenarioSchema), async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const scenario = await storage.createInstallationScenario({
        ...req.body,
        userId,
      });
      res.status(201).json(scenario);
    } catch (error: any) {
      logger.error({ module: 'InstallationScenarios', err: error }, 'Create error');
      res.status(500).json({ error: 'Failed to create installation scenario' });
    }
  });

  // Get all installation scenarios for user
  app.get('/api/installation-scenarios', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const scenarios = await storage.getInstallationScenariosByUser(userId);
      res.json(scenarios);
    } catch (error: any) {
      logger.error({ module: 'InstallationScenarios', err: error }, 'List error');
      res.status(500).json({ error: 'Failed to get installation scenarios' });
    }
  });

  // Get scenarios by room type (MUST be before :id catch-all)
  app.get('/api/installation-scenarios/room-type/:roomType', requireAuth, async (req, res) => {
    try {
      const scenarios = await storage.getScenariosByRoomType(String(req.params['roomType']));
      res.json(scenarios);
    } catch (error: any) {
      logger.error({ module: 'InstallationScenarios', err: error }, 'Room type query error');
      res.status(500).json({ error: 'Failed to get scenarios by room type' });
    }
  });

  // Get scenarios for products (MUST be before :id catch-all)
  app.post('/api/installation-scenarios/for-products', requireAuth, async (req, res) => {
    try {
      const { productIds } = req.body;
      if (!productIds || !Array.isArray(productIds)) {
        return res.status(400).json({ error: 'productIds array is required' });
      }
      const scenarios = await storage.getInstallationScenariosForProducts(productIds);
      res.json(scenarios);
    } catch (error: any) {
      logger.error({ module: 'InstallationScenarios', err: error }, 'Products query error');
      res.status(500).json({ error: 'Failed to get scenarios for products' });
    }
  });

  // Get single installation scenario (catch-all - must be after specific routes)
  app.get('/api/installation-scenarios/:id', requireAuth, async (req, res) => {
    try {
      const scenario = await storage.getInstallationScenarioById(String(req.params['id']));
      if (!scenario) {
        return res.status(404).json({ error: 'Installation scenario not found' });
      }
      res.json(scenario);
    } catch (error: any) {
      logger.error({ module: 'InstallationScenarios', err: error }, 'Get error');
      res.status(500).json({ error: 'Failed to get installation scenario' });
    }
  });

  // Update installation scenario (with ownership check)
  app.put('/api/installation-scenarios/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const existing = await storage.getInstallationScenarioById(String(req.params['id']));
      if (!existing) {
        return res.status(404).json({ error: 'Installation scenario not found' });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to update this scenario' });
      }
      const scenario = await storage.updateInstallationScenario(String(req.params['id']), req.body);
      res.json(scenario);
    } catch (error: any) {
      logger.error({ module: 'InstallationScenarios', err: error }, 'Update error');
      res.status(500).json({ error: 'Failed to update installation scenario' });
    }
  });

  // Delete installation scenario (with ownership check)
  app.delete('/api/installation-scenarios/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const existing = await storage.getInstallationScenarioById(String(req.params['id']));
      if (!existing) {
        return res.status(404).json({ error: 'Installation scenario not found' });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this scenario' });
      }
      await storage.deleteInstallationScenario(String(req.params['id']));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ module: 'InstallationScenarios', err: error }, 'Delete error');
      res.status(500).json({ error: 'Failed to delete installation scenario' });
    }
  });

  // ============================================
  // PRODUCT RELATIONSHIPS
  // ============================================

  // Create product relationship (with validation and self-relationship check)
  app.post('/api/product-relationships', requireAuth, validate(insertProductRelationshipSchema), async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { sourceProductId, targetProductId } = req.body;

      // Prevent self-relationships
      if (sourceProductId === targetProductId) {
        return res.status(400).json({ error: 'Cannot create a relationship between a product and itself' });
      }

      const relationship = await storage.createProductRelationship({
        ...req.body,
        userId,
      });
      res.status(201).json(relationship);
    } catch (error: any) {
      logger.error({ module: 'ProductRelationships', err: error }, 'Create error');
      if (error.code === '23505') {
        // Unique constraint violation
        return res.status(409).json({ error: 'This relationship already exists' });
      }
      res.status(500).json({ error: 'Failed to create product relationship' });
    }
  });

  // Get relationships for a product
  app.get('/api/products/:productId/relationships', requireAuth, async (req, res) => {
    try {
      const relationships = await storage.getProductRelationships([String(req.params['productId'])]);
      res.json(relationships);
    } catch (error: any) {
      logger.error({ module: 'ProductRelationships', err: error }, 'Get error');
      res.status(500).json({ error: 'Failed to get product relationships' });
    }
  });

  // Get relationships by type for a product
  app.get('/api/products/:productId/relationships/:relationshipType', requireAuth, async (req, res) => {
    try {
      const relationships = await storage.getProductRelationshipsByType(
        String(req.params['productId']),
        String(req.params['relationshipType']),
      );
      res.json(relationships);
    } catch (error: any) {
      logger.error({ module: 'ProductRelationships', err: error }, 'Get by type error');
      res.status(500).json({ error: 'Failed to get product relationships' });
    }
  });

  // Delete product relationship
  app.delete('/api/product-relationships/:id', requireAuth, async (req, res) => {
    try {
      await storage.deleteProductRelationship(String(req.params['id']));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ module: 'ProductRelationships', err: error }, 'Delete error');
      res.status(500).json({ error: 'Failed to delete product relationship' });
    }
  });

  // Bulk get relationships for multiple products
  app.post('/api/product-relationships/bulk', requireAuth, async (req, res) => {
    try {
      const { productIds } = req.body;
      if (!productIds || !Array.isArray(productIds)) {
        return res.status(400).json({ error: 'productIds array is required' });
      }
      const relationships = await storage.getProductRelationships(productIds);
      res.json(relationships);
    } catch (error: any) {
      logger.error({ module: 'ProductRelationships', err: error }, 'Bulk get error');
      res.status(500).json({ error: 'Failed to get product relationships' });
    }
  });

  // ============================================
  // BRAND IMAGES
  // ============================================

  // Upload brand image
  app.post('/api/brand-images', upload.single('image'), requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'Image file is required' });
      }

      // Upload to Cloudinary
      const cloudinary = (await import('cloudinary')).v2;
      cloudinary.config({
        cloud_name: process.env['CLOUDINARY_CLOUD_NAME'] ?? '',
        api_key: process.env['CLOUDINARY_API_KEY'] ?? '',
        api_secret: process.env['CLOUDINARY_API_SECRET'] ?? '',
      });

      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: 'brand-images',
              resource_type: 'image',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          )
          .end(file.buffer);
      });

      // Parse metadata from body
      // Valid categories: historical_ad, product_hero, installation, detail, lifestyle, comparison
      const validCategories = ['historical_ad', 'product_hero', 'installation', 'detail', 'lifestyle', 'comparison'];
      const category = validCategories.includes(req.body.category) ? req.body.category : 'product_hero';
      const tags = req.body.tags ? JSON.parse(req.body.tags) : [];
      const productIds = req.body.productIds ? JSON.parse(req.body.productIds) : [];
      const suggestedUse = req.body.suggestedUse ? JSON.parse(req.body.suggestedUse) : [];

      // Create database record
      const brandImage = await storage.createBrandImage({
        userId,
        cloudinaryUrl: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        category,
        tags,
        description: req.body.description || null,
        productIds,
        scenarioId: req.body.scenarioId || null,
        suggestedUse,
        aspectRatio: req.body.aspectRatio || null,
      });

      res.status(201).json(brandImage);
    } catch (error: any) {
      logger.error({ module: 'BrandImages', err: error }, 'Upload error');
      res.status(500).json({ error: 'Failed to upload brand image' });
    }
  });

  // Get all brand images for user
  app.get('/api/brand-images', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const limit = Math.min(parseInt(String(req.query['limit'] ?? '')) || 50, 200);
      const offset = Math.max(parseInt(String(req.query['offset'] ?? '')) || 0, 0);
      const images = await storage.getBrandImagesByUser(userId, limit, offset);
      res.json(images);
    } catch (error: any) {
      logger.error({ module: 'BrandImages', err: error }, 'List error');
      res.status(500).json({ error: 'Failed to get brand images' });
    }
  });

  // Get brand images by category
  app.get('/api/brand-images/category/:category', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const images = await storage.getBrandImagesByCategory(userId, String(req.params['category']));
      res.json(images);
    } catch (error: any) {
      logger.error({ module: 'BrandImages', err: error }, 'Category query error');
      res.status(500).json({ error: 'Failed to get brand images by category' });
    }
  });

  // Get brand images for products
  app.post('/api/brand-images/for-products', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { productIds } = req.body;
      if (!productIds || !Array.isArray(productIds)) {
        return res.status(400).json({ error: 'productIds array is required' });
      }
      const images = await storage.getBrandImagesForProducts(productIds, userId);
      res.json(images);
    } catch (error: any) {
      logger.error({ module: 'BrandImages', err: error }, 'Products query error');
      res.status(500).json({ error: 'Failed to get brand images for products' });
    }
  });

  // Update brand image
  app.put('/api/brand-images/:id', requireAuth, async (req, res) => {
    try {
      const image = await storage.updateBrandImage(String(req.params['id']), req.body);
      res.json(image);
    } catch (error: any) {
      logger.error({ module: 'BrandImages', err: error }, 'Update error');
      res.status(500).json({ error: 'Failed to update brand image' });
    }
  });

  // Delete brand image
  app.delete('/api/brand-images/:id', requireAuth, async (req, res) => {
    try {
      // Get the image to delete from Cloudinary
      const images = await storage.getBrandImagesByUser((req.session as any).userId);
      const imageToDelete = images.find((img) => img.id === String(req.params['id']));

      if (imageToDelete) {
        // Delete from Cloudinary
        const cloudinary = (await import('cloudinary')).v2;
        cloudinary.config({
          cloud_name: process.env['CLOUDINARY_CLOUD_NAME'] ?? '',
          api_key: process.env['CLOUDINARY_API_KEY'] ?? '',
          api_secret: process.env['CLOUDINARY_API_SECRET'] ?? '',
        });

        try {
          await cloudinary.uploader.destroy(imageToDelete.cloudinaryPublicId);
        } catch (cloudinaryError) {
          logger.warn({ module: 'BrandImages', err: cloudinaryError }, 'Cloudinary delete warning');
          // Continue with database deletion even if Cloudinary fails
        }
      }

      await storage.deleteBrandImage(String(req.params['id']));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ module: 'BrandImages', err: error }, 'Delete error');
      res.status(500).json({ error: 'Failed to delete brand image' });
    }
  });

  // ============================================
  // PERFORMING AD TEMPLATES ENDPOINTS
  // ============================================

  // Create performing ad template
  app.post('/api/performing-ad-templates', upload.single('preview'), requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      let previewImageUrl: string | undefined;
      let previewPublicId: string | undefined;

      // Upload preview image to Cloudinary if provided
      if (req.file) {
        const cloudinary = (await import('cloudinary')).v2;
        cloudinary.config({
          cloud_name: process.env['CLOUDINARY_CLOUD_NAME'] ?? '',
          api_key: process.env['CLOUDINARY_API_KEY'] ?? '',
          api_secret: process.env['CLOUDINARY_API_SECRET'] ?? '',
        });

        const result = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'performing-ad-templates',
              resource_type: 'image',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          );
          uploadStream.end(req.file!.buffer);
        });

        previewImageUrl = result.secure_url;
        previewPublicId = result.public_id;
      }

      // Parse JSON fields from form data
      const templateData = {
        userId,
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        sourceUrl: req.body.sourceUrl,
        sourcePlatform: req.body.sourcePlatform,
        advertiserName: req.body.advertiserName,
        engagementTier: req.body.engagementTier,
        estimatedEngagementRate: req.body.estimatedEngagementRate
          ? parseInt(req.body.estimatedEngagementRate)
          : undefined,
        runningDays: req.body.runningDays ? parseInt(req.body.runningDays) : undefined,
        estimatedBudget: req.body.estimatedBudget,
        platformMetrics: req.body.platformMetrics ? JSON.parse(req.body.platformMetrics) : undefined,
        layouts: req.body.layouts ? JSON.parse(req.body.layouts) : undefined,
        colorPalette: req.body.colorPalette ? JSON.parse(req.body.colorPalette) : undefined,
        typography: req.body.typography ? JSON.parse(req.body.typography) : undefined,
        backgroundType: req.body.backgroundType,
        contentBlocks: req.body.contentBlocks ? JSON.parse(req.body.contentBlocks) : undefined,
        visualPatterns: req.body.visualPatterns ? JSON.parse(req.body.visualPatterns) : undefined,
        mood: req.body.mood,
        style: req.body.style,
        templateFormat: req.body.templateFormat,
        sourceFileUrl: req.body.sourceFileUrl,
        previewImageUrl,
        previewPublicId,
        editableVariables: req.body.editableVariables ? JSON.parse(req.body.editableVariables) : undefined,
        targetPlatforms: req.body.targetPlatforms ? JSON.parse(req.body.targetPlatforms) : undefined,
        targetAspectRatios: req.body.targetAspectRatios ? JSON.parse(req.body.targetAspectRatios) : undefined,
        bestForIndustries: req.body.bestForIndustries ? JSON.parse(req.body.bestForIndustries) : undefined,
        bestForObjectives: req.body.bestForObjectives ? JSON.parse(req.body.bestForObjectives) : undefined,
        isActive: req.body.isActive !== 'false',
        isFeatured: req.body.isFeatured === 'true',
      };

      const template = await storage.createPerformingAdTemplate(templateData);
      res.json(template);
    } catch (error: any) {
      logger.error({ module: 'PerformingTemplates', err: error }, 'Create error');
      res.status(500).json({ error: 'Failed to create performing ad template' });
    }
  });

  // Get all performing ad templates for user
  app.get('/api/performing-ad-templates', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const templates = await storage.getPerformingAdTemplates(userId);
      res.json(templates);
    } catch (error: any) {
      logger.error({ module: 'PerformingTemplates', err: error }, 'List error');
      res.status(500).json({ error: 'Failed to fetch performing ad templates' });
    }
  });

  // Get featured templates (MUST be before :id catch-all)
  app.get('/api/performing-ad-templates/featured', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const templates = await storage.getFeaturedPerformingAdTemplates(userId);
      res.json(templates);
    } catch (error: any) {
      logger.error({ module: 'PerformingTemplates', err: error }, 'Get featured error');
      res.status(500).json({ error: 'Failed to fetch featured templates' });
    }
  });

  // Get top performing templates (MUST be before :id catch-all)
  app.get('/api/performing-ad-templates/top', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const limit = parseInt(String(req.query['limit'] ?? '')) || 10;
      const templates = await storage.getTopPerformingAdTemplates(userId, limit);
      res.json(templates);
    } catch (error: any) {
      logger.error({ module: 'PerformingTemplates', err: error }, 'Get top error');
      res.status(500).json({ error: 'Failed to fetch top templates' });
    }
  });

  // Search templates with filters (MUST be before :id catch-all)
  app.post('/api/performing-ad-templates/search', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const filters = req.body;
      const templates = await storage.searchPerformingAdTemplates(userId, filters);
      res.json(templates);
    } catch (error: any) {
      logger.error({ module: 'PerformingTemplates', err: error }, 'Search error');
      res.status(500).json({ error: 'Failed to search templates' });
    }
  });

  // Get templates by category (MUST be before :id catch-all)
  app.get('/api/performing-ad-templates/category/:category', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const templates = await storage.getPerformingAdTemplatesByCategory(userId, String(req.params['category']));
      res.json(templates);
    } catch (error: any) {
      logger.error({ module: 'PerformingTemplates', err: error }, 'Get by category error');
      res.status(500).json({ error: 'Failed to fetch templates by category' });
    }
  });

  // Get templates by platform (MUST be before :id catch-all)
  app.get('/api/performing-ad-templates/platform/:platform', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const templates = await storage.getPerformingAdTemplatesByPlatform(userId, String(req.params['platform']));
      res.json(templates);
    } catch (error: any) {
      logger.error({ module: 'PerformingTemplates', err: error }, 'Get by platform error');
      res.status(500).json({ error: 'Failed to fetch templates by platform' });
    }
  });

  // Get single performing ad template (catch-all - must be after specific routes)
  app.get('/api/performing-ad-templates/:id', requireAuth, async (req, res) => {
    try {
      const template = await storage.getPerformingAdTemplate(String(req.params['id']));
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json(template);
    } catch (error: any) {
      logger.error({ module: 'PerformingTemplates', err: error }, 'Get error');
      res.status(500).json({ error: 'Failed to fetch performing ad template' });
    }
  });

  // Update performing ad template
  app.put('/api/performing-ad-templates/:id', requireAuth, async (req, res) => {
    try {
      const template = await storage.updatePerformingAdTemplate(String(req.params['id']), req.body);
      res.json(template);
    } catch (error: any) {
      logger.error({ module: 'PerformingTemplates', err: error }, 'Update error');
      res.status(500).json({ error: 'Failed to update performing ad template' });
    }
  });

  // Delete performing ad template
  app.delete('/api/performing-ad-templates/:id', requireAuth, async (req, res) => {
    try {
      // Get the template to delete preview from Cloudinary
      const template = await storage.getPerformingAdTemplate(String(req.params['id']));

      if (template?.previewPublicId) {
        const cloudinary = (await import('cloudinary')).v2;
        cloudinary.config({
          cloud_name: process.env['CLOUDINARY_CLOUD_NAME'] ?? '',
          api_key: process.env['CLOUDINARY_API_KEY'] ?? '',
          api_secret: process.env['CLOUDINARY_API_SECRET'] ?? '',
        });

        try {
          await cloudinary.uploader.destroy(template.previewPublicId);
        } catch (cloudinaryError) {
          logger.warn({ module: 'PerformingTemplates', err: cloudinaryError }, 'Cloudinary delete warning');
        }
      }

      await storage.deletePerformingAdTemplate(String(req.params['id']));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ module: 'PerformingTemplates', err: error }, 'Delete error');
      res.status(500).json({ error: 'Failed to delete performing ad template' });
    }
  });

  // Generate idea bank suggestions (optional auth for single-tenant mode)
  app.post('/api/idea-bank/suggest', promptInjectionGuard, async (req, res) => {
    try {
      // Use authenticated user ID, otherwise scope anonymous requests by session/IP
      // so one shared "system-user" key doesn't trigger global rate-limit collisions.
      const sessionUserId = (req.session as any)?.userId as string | undefined;
      const anonBase = String(req.sessionID || req.ip || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
      const userId = sessionUserId || `anon-${anonBase}`;
      const {
        productId,
        productIds,
        uploadDescriptions,
        userGoal,
        enableWebSearch,
        maxSuggestions,
        mode = 'freestyle', // NEW: default to freestyle for backward compatibility
        templateId, // NEW: required when mode = 'template'
      } = req.body;

      // Validate template mode requirements
      if (mode === 'template' && !templateId) {
        return res.status(400).json({
          error: 'templateId is required when mode is "template"',
        });
      }

      // Support both single productId and multiple productIds
      const ids = productIds || (productId ? [productId] : []);

      // Validate upload descriptions if provided
      const validUploadDescriptions: string[] = Array.isArray(uploadDescriptions)
        ? uploadDescriptions.filter((d: any) => typeof d === 'string' && d.trim().length > 0).slice(0, 6)
        : [];

      // Require at least products or upload descriptions
      if (ids.length === 0 && validUploadDescriptions.length === 0) {
        return res.status(400).json({ error: 'productId, productIds, or uploadDescriptions is required' });
      }

      const { ideaBankService } = await import('./services/ideaBankService');

      // For multiple products, aggregate suggestions from each
      if (ids.length > 1) {
        const results = await Promise.all(
          ids.slice(0, 6).map(
            (
              id: string, // Limit to 6 products max
              index: number,
            ) =>
              ideaBankService.generateSuggestions({
                productId: id,
                userId,
                userGoal,
                uploadDescriptions: validUploadDescriptions,
                enableWebSearch: enableWebSearch || false,
                maxSuggestions: 2, // Fewer per product when multiple
                mode,
                templateId,
                skipRateLimitCheck: index > 0, // Count once per API request, not once per product in batch
              }),
          ),
        );

        // Filter successful results and aggregate
        const successfulResults = results.filter((r) => r.success);
        if (successfulResults.length === 0) {
          return res.status(500).json({ error: 'Failed to generate suggestions for all products' });
        }

        // Merge suggestions and aggregate analysis status
        const allSuggestions: any[] = [];
        const aggregateStatus = {
          visionComplete: false,
          kbQueried: false,
          templatesMatched: 0,
          webSearchUsed: false,
          uploadDescriptionsUsed: validUploadDescriptions.length,
        };

        for (const result of successfulResults) {
          if (result.success) {
            allSuggestions.push(...result.response.suggestions);
            aggregateStatus.visionComplete =
              aggregateStatus.visionComplete || result.response.analysisStatus.visionComplete;
            aggregateStatus.kbQueried = aggregateStatus.kbQueried || result.response.analysisStatus.kbQueried;
            aggregateStatus.templatesMatched += result.response.analysisStatus.templatesMatched;
            aggregateStatus.webSearchUsed =
              aggregateStatus.webSearchUsed || result.response.analysisStatus.webSearchUsed;
          }
        }

        // Sort by confidence and limit
        const sortedSuggestions = allSuggestions
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, Math.min(maxSuggestions || 6, 10));

        return res.json({
          suggestions: sortedSuggestions,
          analysisStatus: aggregateStatus,
        });
      }

      // Single product OR uploads-only flow
      const result = await ideaBankService.generateSuggestions({
        productId: ids.length > 0 ? ids[0] : undefined,
        userId,
        userGoal,
        uploadDescriptions: validUploadDescriptions,
        enableWebSearch: enableWebSearch || false,
        maxSuggestions: Math.min(maxSuggestions || 3, 5),
        mode,
        templateId,
      });

      if (!result.success) {
        const statusCode =
          result.error.code === 'RATE_LIMITED' ? 429 : result.error.code === 'PRODUCT_NOT_FOUND' ? 404 : 500;
        return res.status(statusCode).json({ error: result.error.message, code: result.error.code });
      }

      // Response shape changes based on mode
      if (mode === 'template') {
        // Type assertion: service returns IdeaBankTemplateResponse when mode='template'
        const templateResponse = result.response as import('@shared/types/ideaBank').IdeaBankTemplateResponse;
        return res.json({
          slotSuggestions: templateResponse.slotSuggestions,
          template: templateResponse.template,
          mergedPrompt: templateResponse.mergedPrompt,
          analysisStatus: templateResponse.analysisStatus,
          recipe: templateResponse.recipe,
        });
      }

      // Existing freestyle response
      // Type assertion: when mode !== 'template', service returns IdeaBankSuggestResponse
      const response = result.response as import('@shared/types/ideaBank').IdeaBankSuggestResponse;

      // Check if suggestions array is empty and provide helpful message
      if (!response.suggestions || response.suggestions.length === 0) {
        return res.status(200).json({
          suggestions: [],
          analysisStatus: {
            ...response.analysisStatus,
            message: 'No suggestions generated. Try adding products or images.',
            details: 'AI analysis completed but no viable prompts found.',
          },
        });
      }

      res.json(response);
    } catch (error: any) {
      logger.error({ module: 'IdeaBankSuggest', err: error }, 'Error suggesting ideas');

      // Return structured error with retry signal
      res.status(500).json({
        error: 'Failed to generate suggestions',
        message: 'Please try again or contact support',
        fallback: true, // Signal to client this is retryable
      });
    }
  });

  // Get matched templates for a product
  app.get('/api/idea-bank/templates/:productId', requireAuth, async (req, res) => {
    try {
      const productId = String(req.params['productId']);
      const userId = (req.session as any).userId;

      const { ideaBankService } = await import('./services/ideaBankService');

      const result = await ideaBankService.getMatchedTemplates(productId, userId);

      if (!result) {
        return res.status(404).json({ error: 'Product not found or analysis failed' });
      }

      res.json({
        templates: result.templates,
        productAnalysis: result.analysis,
      });
    } catch (error: any) {
      logger.error({ module: 'IdeaBankTemplates', err: error }, 'Error fetching templates');
      res.status(500).json({ error: 'Failed to get matched templates' });
    }
  });

  // ============================================
  // AD SCENE TEMPLATE ENDPOINTS
  // ============================================

  // List all templates (with optional filters) - Public endpoint
  app.get('/api/templates', async (req, res) => {
    try {
      const { category, isGlobal } = req.query;

      const limit = Math.min(parseInt(String(req.query['limit'] ?? '')) || 50, 200);
      const offset = Math.max(parseInt(String(req.query['offset'] ?? '')) || 0, 0);
      const categoryFilter = category as string | undefined;
      const isGlobalFilter = isGlobal === 'true' ? true : isGlobal === 'false' ? false : undefined;
      const allTemplates = await storage.getAdSceneTemplates({
        ...(categoryFilter != null && { category: categoryFilter }),
        ...(isGlobalFilter != null && { isGlobal: isGlobalFilter }),
      });
      const templates = allTemplates.slice(offset, offset + limit);

      res.json({ templates, total: templates.length });
    } catch (error: any) {
      logger.error({ module: 'TemplatesList', err: error }, 'Error listing templates');
      res.status(500).json({ error: 'Failed to list templates' });
    }
  });

  // Get a single template - Public endpoint
  app.get('/api/templates/:id', async (req, res) => {
    try {
      const template = await storage.getAdSceneTemplateById(String(req.params['id']));

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json(template);
    } catch (error: any) {
      logger.error({ module: 'TemplateGet', err: error }, 'Error getting template');
      res.status(500).json({ error: 'Failed to get template' });
    }
  });

  // Search templates - Public endpoint
  app.get('/api/templates/search', async (req, res) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const templates = await storage.searchAdSceneTemplates(q);
      res.json({ templates, total: templates.length });
    } catch (error: any) {
      logger.error({ module: 'TemplatesSearch', err: error }, 'Error searching templates');
      res.status(500).json({ error: 'Failed to search templates' });
    }
  });

  // Create a new template (admin only for now - TODO: add admin check)
  app.post('/api/templates', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      // TODO: Add admin role check here
      // if (!await isUserAdmin(userId)) {
      //   return res.status(403).json({ error: "Admin access required" });
      // }

      const templateData = {
        ...req.body,
        createdBy: userId,
        isGlobal: req.body.isGlobal ?? true,
      };

      const template = await storage.saveAdSceneTemplate(templateData);
      res.status(201).json(template);
    } catch (error: any) {
      logger.error({ module: 'TemplateCreate', err: error }, 'Error creating template');
      res.status(500).json({ error: 'Failed to create template' });
    }
  });

  // Update a template
  app.patch('/api/templates/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const template = await storage.getAdSceneTemplateById(String(req.params['id']));

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Only creator or admin can update
      // TODO: Add admin check
      if (template.createdBy !== userId) {
        return res.status(403).json({ error: 'Not authorized to update this template' });
      }

      const updated = await storage.updateAdSceneTemplate(String(req.params['id']), req.body);
      res.json(updated);
    } catch (error: any) {
      logger.error({ module: 'TemplateUpdate', err: error }, 'Error updating template');
      res.status(500).json({ error: 'Failed to update template' });
    }
  });

  // Delete a template
  app.delete('/api/templates/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const template = await storage.getAdSceneTemplateById(String(req.params['id']));

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Only creator or admin can delete
      // TODO: Add admin check
      if (template.createdBy !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this template' });
      }

      await storage.deleteAdSceneTemplate(String(req.params['id']));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ module: 'TemplateDelete', err: error }, 'Error deleting template');
      res.status(500).json({ error: 'Failed to delete template' });
    }
  });

  // ============================================
  // BRAND PROFILE ENDPOINTS
  // ============================================

  // Get current user's brand profile
  app.get('/api/brand-profile', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const profile = await storage.getBrandProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ error: 'Brand profile not found' });
      }

      res.json(profile);
    } catch (error: any) {
      logger.error({ module: 'BrandProfileGet', err: error }, 'Error getting brand profile');
      res.status(500).json({ error: 'Failed to get brand profile' });
    }
  });

  // Create or update brand profile
  app.put('/api/brand-profile', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      const existing = await storage.getBrandProfileByUserId(userId);

      if (existing) {
        const updated = await storage.updateBrandProfile(userId, req.body);
        res.json(updated);
      } else {
        const created = await storage.saveBrandProfile({
          userId,
          ...req.body,
        });
        res.status(201).json(created);
      }
    } catch (error: any) {
      logger.error({ module: 'BrandProfileUpdate', err: error }, 'Error updating brand profile');
      res.status(500).json({ error: 'Failed to update brand profile' });
    }
  });

  // Delete brand profile
  app.delete('/api/brand-profile', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      await storage.deleteBrandProfile(userId);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ module: 'BrandProfileDelete', err: error }, 'Error deleting brand profile');
      res.status(500).json({ error: 'Failed to delete brand profile' });
    }
  });

  // ============================================
  // QUOTA MONITORING ENDPOINTS
  // ============================================

  // GET /api/quota/status - Real-time quota status
  app.get('/api/quota/status', async (req, res) => {
    try {
      const brandId = (req.session as any)?.userId || 'anonymous';
      const status = await quotaMonitoringService.getQuotaStatus(brandId);
      res.json(status);
    } catch (error: any) {
      logger.error({ module: 'QuotaStatus', err: error }, 'Error fetching quota status');
      res.status(500).json({ error: 'Failed to get quota status' });
    }
  });

  // GET /api/quota/history - Historical usage data
  app.get('/api/quota/history', async (req, res) => {
    try {
      const brandId = (req.session as any)?.userId || 'anonymous';
      const { windowType, startDate, endDate } = req.query;

      const history = await quotaMonitoringService.getUsageHistory({
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
  });

  // GET /api/quota/breakdown - Usage breakdown by category
  app.get('/api/quota/breakdown', async (req, res) => {
    try {
      const brandId = (req.session as any)?.userId || 'anonymous';
      const { period } = req.query;

      const breakdown = await quotaMonitoringService.getUsageBreakdown({
        brandId,
        period: (period as 'today' | 'week' | 'month') || 'today',
      });

      res.json(breakdown);
    } catch (error: any) {
      logger.error({ module: 'QuotaBreakdown', err: error }, 'Error fetching quota breakdown');
      res.status(500).json({ error: 'Failed to get quota breakdown' });
    }
  });

  // GET /api/quota/rate-limit-status - Check if currently rate limited
  app.get('/api/quota/rate-limit-status', async (req, res) => {
    try {
      const brandId = (req.session as any)?.userId || 'anonymous';
      const status = await quotaMonitoringService.getRateLimitStatus(brandId);
      res.json(status);
    } catch (error: any) {
      logger.error({ module: 'RateLimitStatus', err: error }, 'Error fetching rate limit status');
      res.status(500).json({ error: 'Failed to get rate limit status' });
    }
  });

  // GET /api/quota/alerts - Get alert configurations
  app.get('/api/quota/alerts', requireAuth, async (req, res) => {
    try {
      const brandId = (req.session as any).userId;
      const alerts = await quotaMonitoringService.getAlerts(brandId);
      res.json({ alerts });
    } catch (error: any) {
      logger.error({ module: 'QuotaAlertsGet', err: error }, 'Error getting quota alerts');
      res.status(500).json({ error: 'Failed to get quota alerts' });
    }
  });

  // PUT /api/quota/alerts - Update or create alert configuration
  app.put('/api/quota/alerts', requireAuth, async (req, res) => {
    try {
      const brandId = (req.session as any).userId;
      const { alertType, thresholdValue, isEnabled } = req.body;

      if (!alertType || thresholdValue === undefined) {
        return res.status(400).json({ error: 'alertType and thresholdValue are required' });
      }

      const alert = await quotaMonitoringService.setAlert({
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
  });

  // GET /api/quota/check-alerts - Check triggered alerts
  app.get('/api/quota/check-alerts', async (req, res) => {
    try {
      const brandId = (req.session as any)?.userId || 'anonymous';
      const triggered = await quotaMonitoringService.checkAlerts(brandId);
      res.json({ triggered });
    } catch (error: any) {
      logger.error({ module: 'CheckAlerts', err: error }, 'Error checking alerts');
      res.status(500).json({ error: 'Failed to check alerts' });
    }
  });

  // ============================================
  // GOOGLE CLOUD MONITORING SYNC ENDPOINTS
  // ============================================

  // GET /api/quota/google/status - Get Google Cloud sync status
  app.get('/api/quota/google/status', async (_req, res) => {
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
  });

  // GET /api/quota/google/snapshot - Get latest Google quota snapshot
  app.get('/api/quota/google/snapshot', async (_req, res) => {
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
  });

  // POST /api/quota/google/sync - Trigger manual sync
  app.post('/api/quota/google/sync', async (_req, res) => {
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
      const snapshot = await service.triggerManualSync();

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
    } catch (error: any) {
      logger.error({ module: 'GoogleQuotaManualSync', err: error }, 'Error syncing Google quota');
      res.status(500).json({ error: 'Failed to sync Google quota data' });
    }
  });

  // GET /api/quota/google/history - Get sync history
  app.get('/api/quota/google/history', async (req, res) => {
    try {
      const limit = parseInt(String(req.query['limit'] ?? '')) || 20;
      const history = await storage.getRecentSyncHistory(limit);
      res.json({ history });
    } catch (error: any) {
      logger.error({ module: 'GoogleQuotaSyncHistory', err: error }, 'Error fetching sync history');
      res.status(500).json({ error: 'Failed to get sync history' });
    }
  });

  // GET /api/quota/google/snapshots - Get historical snapshots
  app.get('/api/quota/google/snapshots', async (req, res) => {
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
  });

  // ===== MONITORING API ENDPOINTS =====

  // GET /api/monitoring/health - System health status
  app.get('/api/monitoring/health', requireAuth, async (_req, res) => {
    try {
      const { getSystemHealth } = await import('./services/systemHealthService');
      const health = await getSystemHealth();
      res.json(health);
    } catch (error: any) {
      logger.error({ module: 'monitoring', error }, 'Failed to fetch system health');
      res.status(500).json({ error: 'Failed to fetch system health' });
    }
  });

  // GET /api/monitoring/performance - Performance metrics
  app.get('/api/monitoring/performance', requireAuth, async (_req, res) => {
    try {
      const { getPerformanceMetrics } = await import('./middleware/performanceMetrics');
      const metrics = getPerformanceMetrics();
      res.json(metrics);
    } catch (error: any) {
      logger.error({ module: 'monitoring', error }, 'Failed to fetch performance metrics');
      res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
  });

  // GET /api/monitoring/errors - Error tracking
  app.get('/api/monitoring/errors', requireAuth, async (req, res) => {
    try {
      const limit = parseInt(String(req.query['limit'] ?? '')) || 50;
      const errorTrackingModule = await import('./services/errorTrackingService');
      const errors = errorTrackingModule.getRecentErrors(limit);
      const stats = errorTrackingModule.getErrorStats();

      res.json({ errors, stats });
    } catch (error: any) {
      logger.error({ module: 'monitoring', error }, 'Failed to fetch errors');
      res.status(500).json({ error: 'Failed to fetch errors' });
    }
  });

  // GET /api/monitoring/system - Full system health aggregation
  app.get('/api/monitoring/system', requireAuth, async (_req, res) => {
    try {
      const { getSystemHealth } = await import('./services/systemHealthService');
      const { getPerformanceMetrics } = await import('./middleware/performanceMetrics');
      const { getErrorStats } = await import('./services/errorTrackingService');

      const health = await getSystemHealth();
      const perfMetrics = getPerformanceMetrics();
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
    } catch (error: any) {
      logger.error({ module: 'monitoring', error }, 'Failed to fetch system health');
      res.status(500).json({ error: 'Failed to fetch system health' });
    }
  });

  // GET /api/monitoring/endpoints - API endpoints summary
  app.get('/api/monitoring/endpoints', requireAuth, async (_req, res) => {
    try {
      const { getPerformanceMetrics } = await import('./middleware/performanceMetrics');
      const metrics = getPerformanceMetrics();

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
    } catch (error: any) {
      logger.error({ module: 'monitoring', error }, 'Failed to fetch endpoint summary');
      res.status(500).json({ error: 'Failed to fetch endpoint summary' });
    }
  });

  // Start Google Cloud Monitoring auto-sync on server startup
  // ===== RAG API ENDPOINTS =====

  // ----- Installation Scenario RAG -----

  // POST /api/installation/suggest-steps - AI-powered installation step suggestions
  app.post('/api/installation/suggest-steps', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { productId, roomType, includeRelatedProducts, maxSteps } = req.body;

      if (!productId) {
        return res.status(400).json({ error: 'productId is required' });
      }

      const result = await installationScenarioRAG.suggestInstallationSteps({
        productId,
        roomType,
        userId,
        includeRelatedProducts: includeRelatedProducts ?? true,
        maxSteps: maxSteps ?? 10,
      });

      res.json(result);
    } catch (error: any) {
      logger.error({ module: 'InstallationRAG', err: error }, 'Error suggesting steps');
      res.status(500).json({ error: 'Failed to suggest installation steps' });
    }
  });

  // GET /api/installation/room-context/:roomType - Get room-specific installation context
  app.get('/api/installation/room-context/:roomType', requireAuth, async (req, res) => {
    try {
      const roomType = String(req.params['roomType']) as RoomType;

      if (!ROOM_TYPES.includes(roomType)) {
        return res.status(400).json({
          error: `Invalid roomType. Must be one of: ${ROOM_TYPES.join(', ')}`,
        });
      }

      const context = getRoomInstallationContext(roomType);
      res.json(context);
    } catch (error: any) {
      logger.error({ module: 'InstallationRAG', err: error }, 'Error getting room context');
      res.status(500).json({ error: 'Failed to get room context' });
    }
  });

  // POST /api/installation/suggest-accessories - Suggest accessories for installation
  app.post('/api/installation/suggest-accessories', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { productId, roomType } = req.body;

      if (!productId) {
        return res.status(400).json({ error: 'productId is required' });
      }

      const accessories = await installationScenarioRAG.suggestAccessories(productId, roomType, userId);

      res.json(accessories);
    } catch (error: any) {
      logger.error({ module: 'InstallationRAG', err: error }, 'Error suggesting accessories');
      res.status(500).json({ error: 'Failed to suggest accessories' });
    }
  });

  // POST /api/installation/tips - Get installation tips
  app.post('/api/installation/tips', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { productId, roomType } = req.body;

      if (!productId) {
        return res.status(400).json({ error: 'productId is required' });
      }

      const tips = await installationScenarioRAG.getInstallationTips(productId, roomType, userId);

      res.json(tips);
    } catch (error: any) {
      logger.error({ module: 'InstallationRAG', err: error }, 'Error getting tips');
      res.status(500).json({ error: 'Failed to get installation tips' });
    }
  });

  // ----- Relationship Discovery RAG -----

  // POST /api/products/:productId/suggest-relationships - AI-powered relationship suggestions
  app.post('/api/products/:productId/suggest-relationships', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const productId = String(req.params['productId']);
      const { maxSuggestions, minScore, includeExisting } = req.body;

      const suggestions = await suggestRelationships(productId, userId, {
        maxSuggestions: maxSuggestions ?? 10,
        minScore: minScore ?? 50,
        includeExisting: includeExisting ?? false,
      });

      res.json(suggestions);
    } catch (error: any) {
      logger.error({ module: 'RelationshipRAG', err: error }, 'Error suggesting relationships');
      res.status(500).json({ error: 'Failed to suggest relationships' });
    }
  });

  // POST /api/products/find-similar - Find similar products
  app.post('/api/products/find-similar', requireAuth, async (req, res) => {
    try {
      const { productId, maxResults, minSimilarity } = req.body;

      if (!productId) {
        return res.status(400).json({ error: 'productId is required' });
      }

      // Get the product first
      const product = await storage.getProductById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const similar = await findSimilarProducts(product, {
        maxResults: maxResults ?? 10,
        minSimilarity: minSimilarity ?? 30,
      });

      res.json(similar);
    } catch (error: any) {
      logger.error({ module: 'RelationshipRAG', err: error }, 'Error finding similar products');
      res.status(500).json({ error: 'Failed to find similar products' });
    }
  });

  // POST /api/relationships/analyze - Analyze relationship between two products
  app.post('/api/relationships/analyze', requireAuth, async (req, res) => {
    try {
      const { sourceProductId, targetProductId } = req.body;

      if (!sourceProductId || !targetProductId) {
        return res.status(400).json({ error: 'sourceProductId and targetProductId are required' });
      }

      const analysis = await analyzeRelationshipType(sourceProductId, targetProductId);
      res.json(analysis);
    } catch (error: any) {
      logger.error({ module: 'RelationshipRAG', err: error }, 'Error analyzing relationship');
      res.status(500).json({ error: 'Failed to analyze relationship' });
    }
  });

  // POST /api/relationships/batch-suggest - Batch suggest relationships for multiple products
  app.post('/api/relationships/batch-suggest', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { productIds } = req.body;

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'productIds array is required' });
      }

      const suggestions = await batchSuggestRelationships(productIds, userId);
      res.json(suggestions);
    } catch (error: any) {
      logger.error({ module: 'RelationshipRAG', err: error }, 'Error batch suggesting');
      res.status(500).json({ error: 'Failed to batch suggest relationships' });
    }
  });

  // POST /api/relationships/auto-create - Auto-create relationships based on AI suggestions
  app.post('/api/relationships/auto-create', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { productId, minScore, maxToCreate, dryRun } = req.body;

      if (!productId) {
        return res.status(400).json({ error: 'productId is required' });
      }

      const result = await autoCreateRelationships(productId, userId, {
        minScore: minScore ?? 70,
        maxToCreate: maxToCreate ?? 5,
        dryRun: dryRun ?? false,
      });

      res.json(result);
    } catch (error: any) {
      logger.error({ module: 'RelationshipRAG', err: error }, 'Error auto-creating relationships');
      res.status(500).json({ error: 'Failed to auto-create relationships' });
    }
  });

  // ----- Brand Image Recommendation RAG -----

  // POST /api/brand-images/recommend - AI-powered image recommendations
  app.post('/api/brand-images/recommend', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { productIds, useCase, platform, mood, maxResults, aspectRatio, categoryFilter } = req.body;

      if (!useCase) {
        return res.status(400).json({ error: 'useCase is required' });
      }

      const recommendations = await brandImageRecommendationRAG.recommendImages({
        productIds,
        useCase,
        platform,
        mood,
        userId,
        maxResults: maxResults ?? 10,
        aspectRatio,
        categoryFilter,
      });

      res.json(recommendations);
    } catch (error: any) {
      logger.error({ module: 'BrandImageRAG', err: error }, 'Error recommending images');
      res.status(500).json({ error: 'Failed to recommend images' });
    }
  });

  // POST /api/brand-images/match-product/:productId - Match images to a specific product
  app.post('/api/brand-images/match-product/:productId', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const productId = String(req.params['productId']);
      const { maxResults, categoryFilter } = req.body;

      const matches = await brandImageRecommendationRAG.matchImagesForProduct(productId, userId, {
        maxResults: maxResults ?? 10,
        categoryFilter,
      });

      res.json(matches);
    } catch (error: any) {
      logger.error({ module: 'BrandImageRAG', err: error }, 'Error matching images');
      res.status(500).json({ error: 'Failed to match images for product' });
    }
  });

  // POST /api/brand-images/suggest-category - Suggest image categories based on use case
  app.post('/api/brand-images/suggest-category', requireAuth, async (req, res) => {
    try {
      const { useCase, platform, mood, maxSuggestions } = req.body;

      if (!useCase) {
        return res.status(400).json({ error: 'useCase is required' });
      }

      const suggestions = brandImageRecommendationRAG.suggestImageCategory(useCase, { platform, mood, maxSuggestions });

      res.json(suggestions);
    } catch (error: any) {
      logger.error({ module: 'BrandImageRAG', err: error }, 'Error suggesting category');
      res.status(500).json({ error: 'Failed to suggest image category' });
    }
  });

  // ----- Template Pattern RAG -----

  // POST /api/templates/match-context - Match templates to user context
  app.post('/api/templates/match-context', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { industry, objective, platform, aspectRatio, mood, style } = req.body;

      if (!industry || !objective || !platform || !aspectRatio) {
        return res.status(400).json({
          error: 'industry, objective, platform, and aspectRatio are required',
        });
      }

      const result = await matchTemplateForContext({
        industry,
        objective,
        platform,
        aspectRatio,
        mood,
        style,
        userId,
      });

      res.json(result);
    } catch (error: any) {
      logger.error({ module: 'TemplateRAG', err: error }, 'Error matching templates');
      res.status(500).json({ error: 'Failed to match templates' });
    }
  });

  // GET /api/templates/analyze-patterns/:templateId - Analyze visual patterns of a template
  app.get('/api/templates/analyze-patterns/:templateId', requireAuth, async (req, res) => {
    try {
      const templateId = String(req.params['templateId']);

      const template = await storage.getPerformingAdTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const analysis = await analyzeTemplatePatterns(template);

      res.json(analysis);
    } catch (error: any) {
      logger.error({ module: 'TemplateRAG', err: error }, 'Error analyzing patterns');
      res.status(500).json({ error: 'Failed to analyze template patterns' });
    }
  });

  // POST /api/templates/suggest-customizations - Suggest customizations for brand alignment
  app.post('/api/templates/suggest-customizations', requireAuth, async (req, res) => {
    try {
      const { templateId, brandGuidelines } = req.body;

      if (!templateId) {
        return res.status(400).json({ error: 'templateId is required' });
      }

      const suggestions = await suggestTemplateCustomizations(templateId, brandGuidelines || {});

      if (!suggestions) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json(suggestions);
    } catch (error: any) {
      logger.error({ module: 'TemplateRAG', err: error }, 'Error suggesting customizations');
      res.status(500).json({ error: 'Failed to suggest customizations' });
    }
  });

  // ===== END RAG API ENDPOINTS =====

  // ===== API KEY MANAGEMENT ENDPOINTS (Phase 7) =====

  /**
   * GET /api/settings/api-keys
   * List all API key configurations for the current user
   * Returns status and preview (not actual keys) for each supported service
   */
  app.get('/api/settings/api-keys', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const supportedServices = getSupportedServices();

      // Get all user's custom keys
      const userKeys = await storage.getAllUserApiKeys(userId);
      const userKeyMap = new Map(userKeys.map((k) => [k.service, k]));

      // Environment variable mapping for checking fallbacks
      const envVarMap: Record<string, string | undefined> = {
        gemini: process.env['GEMINI_API_KEY'] || process.env['GOOGLE_API_KEY'],
        cloudinary: process.env['CLOUDINARY_API_KEY'],
        firecrawl: process.env['FIRECRAWL_API_KEY'],
        redis: process.env['REDIS_URL'],
      };

      const keys = supportedServices.map((service) => {
        const userKey = userKeyMap.get(service);
        const hasEnvVar = !!envVarMap[service];

        if (userKey) {
          return {
            service,
            configured: true,
            source: 'user' as const,
            keyPreview: userKey.keyPreview,
            isValid: userKey.isValid,
            lastValidated: userKey.lastValidatedAt?.toISOString() || null,
          };
        } else if (hasEnvVar) {
          return {
            service,
            configured: true,
            source: 'environment' as const,
            keyPreview: null,
            isValid: null,
            lastValidated: null,
          };
        } else {
          return {
            service,
            configured: false,
            source: null,
            keyPreview: null,
            isValid: null,
            lastValidated: null,
          };
        }
      });

      res.json({ keys });
    } catch (error: any) {
      logger.error({ module: 'APIKeys', err: error }, 'Error listing keys');
      res.status(500).json({ error: 'Failed to retrieve API key configurations' });
    }
  });

  /**
   * POST /api/settings/api-keys/:service
   * Save or update an API key for a specific service
   * Flow: validate format -> test API -> encrypt -> save -> log audit -> return preview
   */
  app.post('/api/settings/api-keys/:service', requireAuth, async (req, res) => {
    const userId = (req as any).session.userId;
    const service = String(req.params['service']);
    const ipAddress = (req.ip ?? (req.headers['x-forwarded-for'] as string) ?? '').split(',')[0]?.trim() ?? '';
    const userAgent = req.headers['user-agent'] || '';

    try {
      // Validate service name
      if (!isValidService(service)) {
        return res.status(400).json({
          success: false,
          error: `Invalid service: ${service}`,
          solution: `Supported services: ${getSupportedServices().join(', ')}`,
        });
      }

      // Validate request body
      const parseResult = saveApiKeySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: parseResult.error.issues[0]?.message || 'Invalid request body',
        });
      }

      const { apiKey, cloudName, apiSecret } = parseResult.data;
      const trimmedKey = apiKey.trim();

      // Check if master encryption key is configured
      if (!validateMasterKeyConfigured()) {
        logger.error({ module: 'APIKeys' }, 'Master encryption key not configured');
        return res.status(500).json({
          success: false,
          error: 'Encryption not configured',
          solution: 'Contact administrator to configure API_KEY_ENCRYPTION_KEY',
        });
      }

      // Validate the API key with the service
      let validationResult;
      if (service === 'cloudinary') {
        // Cloudinary requires additional parameters
        if (!cloudName || !apiSecret) {
          return res.status(400).json({
            success: false,
            error: 'Cloudinary requires cloudName, apiKey, and apiSecret',
            solution: 'Provide all three Cloudinary credentials',
          });
        }
        validationResult = await validateApiKey(service as ServiceName, trimmedKey, {
          cloudName: cloudName.trim(),
          apiKey: trimmedKey,
          apiSecret: apiSecret.trim(),
        });
      } else {
        validationResult = await validateApiKey(service as ServiceName, trimmedKey);
      }

      if (!validationResult.valid) {
        // Log failed validation attempt
        await storage.logApiKeyAction({
          userId,
          service,
          action: 'validate',
          ipAddress,
          userAgent,
          success: false,
          ...(validationResult.error != null && { errorMessage: validationResult.error }),
        });

        return res.status(400).json({
          success: false,
          error: validationResult.error || 'API key validation failed',
          solution: validationResult.solution,
        });
      }

      // Encrypt the API key
      let encryptedData;
      try {
        // For Cloudinary, we store all credentials as a JSON object
        const keyToEncrypt =
          service === 'cloudinary'
            ? JSON.stringify({ cloudName: cloudName!.trim(), apiKey: trimmedKey, apiSecret: apiSecret!.trim() })
            : trimmedKey;
        encryptedData = encryptApiKey(keyToEncrypt);
      } catch (error: any) {
        logger.error({ module: 'APIKeys', err: error }, 'Encryption failed');
        return res.status(500).json({
          success: false,
          error: 'Encryption failed',
          solution: 'Contact support. This is an internal error.',
        });
      }

      // Generate key preview
      const keyPreview = generateKeyPreview(trimmedKey);

      // Check if this is a create or update operation
      const existingKey = await storage.getUserApiKey(userId, service);
      const action = existingKey ? 'update' : 'create';

      // Save to database
      await storage.saveUserApiKey({
        userId,
        service,
        encryptedKey: encryptedData.ciphertext,
        iv: encryptedData.iv,
        authTag: encryptedData.authTag,
        keyPreview,
        isValid: true,
      });

      // Update global Gemini client so ALL services use the new key immediately
      if (service === 'gemini') {
        const { setGlobalGeminiClient } = await import('./lib/geminiClient');
        const { createGeminiClient } = await import('./lib/gemini');
        setGlobalGeminiClient(createGeminiClient(trimmedKey));
      }

      // Log successful action
      await storage.logApiKeyAction({
        userId,
        service,
        action,
        ipAddress,
        userAgent,
        success: true,
      });

      const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
      res.json({
        success: true,
        keyPreview,
        message: `${serviceName} API key saved successfully`,
      });
    } catch (error: any) {
      logger.error({ module: 'APIKeys', err: error }, 'Error saving key');

      // Log error
      await storage.logApiKeyAction({
        userId,
        service,
        action: 'create',
        ipAddress,
        userAgent,
        success: false,
        errorMessage: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to save API key',
        solution: 'Please try again. If the problem persists, contact support.',
      });
    }
  });

  /**
   * DELETE /api/settings/api-keys/:service
   * Remove a user's custom API key for a service
   * Will fall back to environment variable if available
   */
  app.delete('/api/settings/api-keys/:service', requireAuth, async (req, res) => {
    const userId = (req as any).session.userId;
    const service = String(req.params['service']);
    const ipAddress = (req.ip ?? (req.headers['x-forwarded-for'] as string) ?? '').split(',')[0]?.trim() ?? '';
    const userAgent = req.headers['user-agent'] || '';

    try {
      // Validate service name
      if (!isValidService(service)) {
        return res.status(400).json({
          success: false,
          error: `Invalid service: ${service}`,
          solution: `Supported services: ${getSupportedServices().join(', ')}`,
        });
      }

      // Check if user has a custom key
      const existingKey = await storage.getUserApiKey(userId, service);
      if (!existingKey) {
        return res.status(404).json({
          success: false,
          error: 'No custom API key found for this service',
        });
      }

      // Delete the key
      await storage.deleteUserApiKey(userId, service);

      // Revert to env var fallback when user removes their Gemini key
      if (service === 'gemini') {
        const { setGlobalGeminiClient } = await import('./lib/geminiClient');
        setGlobalGeminiClient(null);
      }

      // Log the action
      await storage.logApiKeyAction({
        userId,
        service,
        action: 'delete',
        ipAddress,
        userAgent,
        success: true,
      });

      // Check if environment fallback exists
      const envVarMap: Record<string, string | undefined> = {
        gemini: process.env['GEMINI_API_KEY'] || process.env['GOOGLE_API_KEY'],
        cloudinary: process.env['CLOUDINARY_API_KEY'],
        firecrawl: process.env['FIRECRAWL_API_KEY'],
        redis: process.env['REDIS_URL'],
      };
      const hasEnvFallback = !!envVarMap[service];

      const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
      res.json({
        success: true,
        message: hasEnvFallback
          ? `${serviceName} custom key removed. Using environment variable.`
          : `${serviceName} API key removed.`,
        fallbackAvailable: hasEnvFallback,
      });
    } catch (error: any) {
      logger.error({ module: 'APIKeys', err: error }, 'Error deleting key');

      await storage.logApiKeyAction({
        userId,
        service,
        action: 'delete',
        ipAddress,
        userAgent,
        success: false,
        errorMessage: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to delete API key',
      });
    }
  });

  /**
   * POST /api/settings/api-keys/:service/validate
   * Re-validate an existing API key without updating it
   * Updates the lastValidatedAt and isValid fields in the database
   */
  app.post('/api/settings/api-keys/:service/validate', requireAuth, async (req, res) => {
    const userId = (req as any).session.userId;
    const service = String(req.params['service']);
    const ipAddress = (req.ip ?? (req.headers['x-forwarded-for'] as string) ?? '').split(',')[0]?.trim() ?? '';
    const userAgent = req.headers['user-agent'] || '';

    try {
      // Validate service name
      if (!isValidService(service)) {
        return res.status(400).json({
          valid: false,
          error: `Invalid service: ${service}`,
          solution: `Supported services: ${getSupportedServices().join(', ')}`,
        });
      }

      // Resolve the API key (user's key or environment fallback)
      const resolved = await storage.resolveApiKey(userId, service);

      if (resolved.source === 'none' || !resolved.key) {
        return res.status(404).json({
          valid: false,
          error: 'No API key configured for this service',
          solution: `Add a ${service} API key in settings or configure the environment variable`,
        });
      }

      // Validate the resolved key
      let validationResult;
      if (service === 'cloudinary' && resolved.source === 'user') {
        // For user-stored Cloudinary keys, they're stored as JSON with all credentials
        try {
          const credentials = JSON.parse(resolved.key);
          validationResult = await validateApiKey(service as ServiceName, credentials.apiKey, credentials);
        } catch {
          validationResult = {
            valid: false,
            error: 'Stored credentials are corrupted',
            solution: 'Re-enter your Cloudinary credentials',
          };
        }
      } else if (service === 'cloudinary' && resolved.source === 'environment') {
        // For environment Cloudinary, need all env vars
        validationResult = await validateApiKey(service as ServiceName, resolved.key, {
          cloudName: process.env['CLOUDINARY_CLOUD_NAME'] || '',
          apiKey: resolved.key,
          apiSecret: process.env['CLOUDINARY_API_SECRET'] || '',
        });
      } else {
        validationResult = await validateApiKey(service as ServiceName, resolved.key);
      }

      // Update validity in database if this is a user key
      if (resolved.source === 'user') {
        await storage.updateUserApiKeyValidity(userId, service, validationResult.valid);
      }

      // Log the validation attempt
      await storage.logApiKeyAction({
        userId,
        service,
        action: 'validate',
        ipAddress,
        userAgent,
        success: validationResult.valid,
        ...(validationResult.error != null && { errorMessage: validationResult.error }),
      });

      if (validationResult.valid) {
        res.json({
          valid: true,
          source: resolved.source,
          details: validationResult.details,
        });
      } else {
        res.json({
          valid: false,
          error: validationResult.error,
          solution: validationResult.solution,
          source: resolved.source,
        });
      }
    } catch (error: any) {
      logger.error({ module: 'APIKeys', err: error }, 'Error validating key');

      await storage.logApiKeyAction({
        userId,
        service,
        action: 'validate',
        ipAddress,
        userAgent,
        success: false,
        errorMessage: error.message,
      });

      res.status(500).json({
        valid: false,
        error: 'Failed to validate API key',
        solution: 'Please try again. If the problem persists, contact support.',
      });
    }
  });

  // ===== END API KEY MANAGEMENT ENDPOINTS =====

  // ========================================
  // N8N CONFIGURATION VAULT
  // ========================================

  /**
   * POST /api/settings/n8n
   * Save encrypted n8n configuration (base URL + API key)
   */
  app.post('/api/settings/n8n', requireAuth, validate(saveN8nConfigSchema), async (req, res) => {
    try {
      const { baseUrl, apiKey } = req.body;

      await storage.saveN8nConfig(req.user!.id, baseUrl, apiKey);

      res.json({
        success: true,
        message: 'n8n configuration saved securely',
      });
    } catch (error) {
      logger.error({ module: 'n8nVault', err: error }, 'Failed to save n8n config');
      res.status(500).json({
        success: false,
        error: 'Failed to save n8n configuration',
      });
    }
  });

  /**
   * GET /api/settings/n8n
   * Retrieve n8n configuration (returns base URL + whether API key exists)
   */
  app.get('/api/settings/n8n', requireAuth, async (req, res) => {
    try {
      const config = await storage.getN8nConfig(req.user!.id);

      if (!config) {
        return res.json({ configured: false });
      }

      // Never return the actual API key, only indicate if it exists
      res.json({
        configured: true,
        baseUrl: config.baseUrl,
        hasApiKey: !!config.apiKey,
      });
    } catch (error) {
      logger.error({ module: 'n8nVault', err: error }, 'Failed to fetch n8n config');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch n8n configuration',
      });
    }
  });

  /**
   * DELETE /api/settings/n8n
   * Delete n8n configuration from encrypted vault
   */
  app.delete('/api/settings/n8n', requireAuth, async (req, res) => {
    try {
      await storage.deleteN8nConfig(req.user!.id);

      res.json({
        success: true,
        message: 'n8n configuration deleted',
      });
    } catch (error) {
      logger.error({ module: 'n8nVault', err: error }, 'Failed to delete n8n config');
      res.status(500).json({
        success: false,
        error: 'Failed to delete n8n configuration',
      });
    }
  });

  // ========================================
  // SOCIAL ACCOUNTS MANAGEMENT - PHASE 8.1
  // ========================================

  /**
   * GET /api/social/accounts
   * List all connected social accounts for current user
   * Returns sanitized data (no OAuth tokens)
   */
  app.get('/api/social/accounts', requireAuth, async (req, res) => {
    try {
      const connections = await storage.getSocialConnections(req.user!.id);

      // Sanitize: Remove sensitive OAuth token data
      const safeConnections = connections.map((conn) => ({
        id: conn.id,
        userId: conn.userId,
        platform: conn.platform,
        platformUserId: conn.platformUserId,
        platformUsername: conn.platformUsername,
        profilePictureUrl: conn.profilePictureUrl,
        accountType: conn.accountType,
        scopes: conn.scopes,
        isActive: conn.isActive,
        tokenExpiresAt: conn.tokenExpiresAt,
        lastUsedAt: conn.lastUsedAt,
        lastErrorAt: conn.lastErrorAt,
        lastErrorMessage: conn.lastErrorMessage,
        connectedAt: conn.connectedAt,
        updatedAt: conn.updatedAt,
      }));

      res.json({ accounts: safeConnections });
    } catch (error) {
      logger.error({ module: 'SocialAccounts', err: error }, 'Failed to fetch accounts');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch social accounts',
      });
    }
  });

  /**
   * DELETE /api/social/accounts/:id
   * Disconnect a social account
   */
  app.delete('/api/social/accounts/:id', requireAuth, async (req, res) => {
    try {
      const id = String(req.params['id']);

      // Verify ownership
      const connection = await storage.getSocialConnectionById(id);

      if (!connection) {
        return res.status(404).json({
          success: false,
          error: 'Account not found',
        });
      }

      if (connection.userId !== req.user!.id) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: You do not own this account',
        });
      }

      await storage.deleteSocialConnection(id);

      logger.info(
        {
          userId: req.user!.id,
          platform: connection.platform,
        },
        'Social account disconnected',
      );

      res.json({
        success: true,
        message: `${connection.platform} account disconnected`,
      });
    } catch (error) {
      logger.error(
        {
          module: 'SocialAccounts',
          err: error,
          connectionId: String(req.params['id']),
        },
        'Failed to disconnect account',
      );

      res.status(500).json({
        success: false,
        error: 'Failed to disconnect account',
      });
    }
  });

  /**
   * POST /api/social/sync-accounts
   * Sync account from n8n to local database
   * Called after user configures OAuth in n8n
   */
  app.post('/api/social/sync-accounts', requireAuth, validate(syncAccountSchema), async (req, res) => {
    try {
      const { platform, platformUserId, platformUsername, accountType } = req.body;

      // Check if connection already exists
      const existing = await storage.getSocialConnectionByPlatform(req.user!.id, platform);

      if (existing) {
        // Update existing connection
        const updated = await storage.updateSocialConnection(existing.id, {
          platformUserId,
          platformUsername,
          accountType: accountType || 'personal',
          isActive: true,
          lastErrorAt: null,
          lastErrorMessage: null,
        });

        return res.json({
          success: true,
          data: updated,
          message: `${platform} account synced (updated)`,
        });
      }

      // Create new connection
      const connection = await storage.createSocialConnection({
        userId: req.user!.id,
        platform,
        platformUserId,
        platformUsername,
        accountType: accountType || 'personal',
        isActive: true,
        // OAuth fields (managed by n8n, placeholder values)
        accessToken: 'managed_by_n8n',
        tokenIv: 'n8n',
        tokenAuthTag: 'n8n',
        tokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      });

      res.json({
        success: true,
        data: connection,
        message: `${platform} account synced (new)`,
      });
    } catch (error) {
      logger.error(
        {
          module: 'SocialAccounts',
          err: error,
          platform: req.body.platform,
        },
        'Failed to sync account from n8n',
      );

      res.status(500).json({
        success: false,
        error: 'Failed to sync account from n8n',
      });
    }
  });

  /**
   * POST /api/n8n/callback
   * Webhook handler for n8n posting results
   * Called by n8n workflows after posting to social platforms.
   * NOTE: This legacy stub is superseded by n8n.router.ts (registered first).
   * Kept as a fallback; wired to handleN8nCallback for correctness.
   */
  app.post('/api/n8n/callback', validateN8nWebhook, validate(n8nCallbackSchema), async (req, res) => {
    try {
      const { scheduledPostId, platform, success, executionId } = req.body;

      logger.info(
        {
          scheduledPostId,
          platform,
          success,
          executionId,
        },
        'n8n callback received (legacy stub)',
      );

      await handleN8nCallback({
        scheduledPostId,
        success,
        platformPostId: req.body.platformPostId,
        platformPostUrl: req.body.platformPostUrl,
        error: req.body.error,
        errorCode: req.body.errorCode,
        postedAt: req.body.postedAt,
      });

      res.json({
        success: true,
        message: 'Callback received and processed',
      });
    } catch (error) {
      logger.error(
        {
          module: 'n8nCallback',
          err: error,
        },
        'Failed to process n8n callback',
      );

      res.status(500).json({
        success: false,
        error: 'Failed to process callback',
      });
    }
  });

  // ===== GENERATION PERFORMANCE WEBHOOK (Phase 5) =====

  /**
   * POST /api/webhooks/performance
   * Webhook for n8n to POST social media engagement data for a generation.
   * Requires webhook signature validation (same secret as n8n callbacks).
   */
  app.post('/api/webhooks/performance', validateN8nWebhook, validate(performanceWebhookSchema), async (req, res) => {
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
    } catch (error) {
      logger.error({ module: 'PerformanceWebhook', err: error }, 'Failed to save performance data');

      res.status(500).json({
        success: false,
        error: 'Failed to save performance data',
      });
    }
  });

  // ===== LEARN FROM WINNERS - AD PATTERN ENDPOINTS =====

  /**
   * POST /api/learned-patterns/upload
   * Upload an ad image for pattern extraction
   *
   * Rate limit: 10/hour per user
   * Auth: Required
   */
  app.post(
    '/api/learned-patterns/upload',
    requireAuth,
    uploadPatternLimiter,
    checkPatternQuota,
    upload.single('image'),
    validateFileType,
    async (req, res) => {
      try {
        const user = (req as any).user;
        const file = req.file;

        if (!file) {
          return res.status(400).json({ error: 'No image file provided' });
        }

        // Validate metadata
        const parseResult = uploadPatternSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({
            error: 'Invalid metadata',
            details: parseResult.error.flatten(),
          });
        }

        const metadata = parseResult.data;
        const validatedFileType = (req as any).validatedFileType;

        // Upload to Cloudinary for processing
        const uploadResult = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'ad-patterns',
              resource_type: 'image',
              tags: ['pattern-extraction', `user-${user.id}`],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          );
          uploadStream.end(file.buffer);
        });

        // Create upload record with 24-hour expiry
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const uploadRecord = await storage.createUploadRecord({
          userId: user.id,
          cloudinaryUrl: uploadResult.secure_url,
          cloudinaryPublicId: uploadResult.public_id,
          originalFilename: file.originalname,
          fileSizeBytes: file.size,
          mimeType: validatedFileType.mime,
          status: 'pending' as const,
          expiresAt,
          // Optional fields set to null
          privacyScanResult: null,
          errorMessage: null,
          extractedPatternId: null,
          processingStartedAt: null,
          processingCompletedAt: null,
          processingDurationMs: null,
        });

        // Process extraction asynchronously
        // In production, this would be a background job
        processUploadForPatterns(uploadRecord.id, file.buffer, validatedFileType.mime, {
          name: metadata.name,
          category: metadata.category,
          platform: metadata.platform,
          ...(metadata.industry != null && { industry: metadata.industry }),
          ...(metadata.engagementTier != null && { engagementTier: metadata.engagementTier }),
        }).catch((err: unknown) => {
          logger.error({ err, uploadId: uploadRecord.id }, 'Background pattern extraction failed');
        });

        res.status(202).json({
          message: 'Upload accepted for processing',
          uploadId: uploadRecord.id,
          status: 'pending',
          expiresAt: expiresAt.toISOString(),
        });
      } catch (error: any) {
        logger.error({ err: error }, 'Pattern upload failed');
        res.status(500).json({ error: 'Failed to upload pattern' });
      }
    },
  );

  /**
   * GET /api/learned-patterns/upload/:uploadId
   * Check upload/extraction status
   *
   * Auth: Required + Ownership
   */
  app.get('/api/learned-patterns/upload/:uploadId', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const uploadId = String(req.params['uploadId']);

      const upload = await storage.getUploadById(uploadId);

      if (!upload) {
        return res.status(404).json({ error: 'Upload not found' });
      }

      // Ownership check
      if (upload.userId !== user.id) {
        return res.status(403).json({ error: 'Not authorized to access this upload' });
      }

      res.json({
        id: upload.id,
        status: upload.status,
        errorMessage: upload.errorMessage,
        extractedPatternId: upload.extractedPatternId,
        processingStartedAt: upload.processingStartedAt,
        processingCompletedAt: upload.processingCompletedAt,
        processingDurationMs: upload.processingDurationMs,
        expiresAt: upload.expiresAt,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to get upload status');
      res.status(500).json({ error: 'Failed to get upload status' });
    }
  });

  /**
   * GET /api/learned-patterns
   * List user's learned patterns with optional filters
   *
   * Auth: Required
   */
  app.get('/api/learned-patterns', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;

      // Parse query parameters
      const parseResult = listPatternsQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: parseResult.error.flatten(),
        });
      }

      const filters = parseResult.data;

      // Get all patterns with filters, then apply limit/offset client-side for now
      let patterns = await storage.getLearnedPatterns(user.id, {
        ...(filters.category != null && { category: filters.category }),
        ...(filters.platform != null && { platform: filters.platform }),
        ...(filters.industry != null && { industry: filters.industry }),
        ...(filters.isActive != null && { isActive: filters.isActive }),
      });

      // Apply limit and offset if specified
      if (filters.offset) {
        patterns = patterns.slice(filters.offset);
      }
      if (filters.limit) {
        patterns = patterns.slice(0, filters.limit);
      }

      res.json({
        patterns,
        count: patterns.length,
        filters: {
          category: filters.category,
          platform: filters.platform,
          industry: filters.industry,
        },
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to list patterns');
      res.status(500).json({ error: 'Failed to list patterns' });
    }
  });

  /**
   * GET /api/learned-patterns/category/:category
   * List patterns by category
   *
   * Auth: Required
   */
  app.get('/api/learned-patterns/category/:category', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const category = String(req.params['category']);

      const patterns = await storage.getLearnedPatterns(user.id, {
        category,
        isActive: true,
      });

      res.json({
        patterns,
        count: patterns.length,
        category,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to list patterns by category');
      res.status(500).json({ error: 'Failed to list patterns by category' });
    }
  });

  /**
   * GET /api/learned-patterns/:patternId
   * Get a specific pattern
   *
   * Auth: Required + Ownership
   */
  app.get('/api/learned-patterns/:patternId', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const patternId = String(req.params['patternId']);

      const pattern = await storage.getLearnedPatternById(patternId);

      if (!pattern) {
        return res.status(404).json({ error: 'Pattern not found' });
      }

      // Ownership check
      if (pattern.userId !== user.id) {
        return res.status(403).json({ error: 'Not authorized to access this pattern' });
      }

      res.json(pattern);
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to get pattern');
      res.status(500).json({ error: 'Failed to get pattern' });
    }
  });

  /**
   * PUT /api/learned-patterns/:patternId
   * Update a pattern's metadata
   *
   * Auth: Required + Ownership
   */
  app.put('/api/learned-patterns/:patternId', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const patternId = String(req.params['patternId']);

      // Validate update data
      const parseResult = updatePatternSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid update data',
          details: parseResult.error.flatten(),
        });
      }

      const pattern = await storage.getLearnedPatternById(patternId);

      if (!pattern) {
        return res.status(404).json({ error: 'Pattern not found' });
      }

      // Ownership check
      if (pattern.userId !== user.id) {
        return res.status(403).json({ error: 'Not authorized to update this pattern' });
      }

      // Strip undefined values to satisfy exactOptionalPropertyTypes
      const strippedUpdates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(parseResult.data)) {
        if (v !== undefined) strippedUpdates[k] = v;
      }
      const updatedPattern = await storage.updateLearnedPattern(
        patternId,
        strippedUpdates as Parameters<typeof storage.updateLearnedPattern>[1],
      );

      res.json(updatedPattern);
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to update pattern');
      res.status(500).json({ error: 'Failed to update pattern' });
    }
  });

  /**
   * DELETE /api/learned-patterns/:patternId
   * Delete a pattern
   *
   * Auth: Required + Ownership
   */
  app.delete('/api/learned-patterns/:patternId', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const patternId = String(req.params['patternId']);

      const pattern = await storage.getLearnedPatternById(patternId);

      if (!pattern) {
        return res.status(404).json({ error: 'Pattern not found' });
      }

      // Ownership check
      if (pattern.userId !== user.id) {
        return res.status(403).json({ error: 'Not authorized to delete this pattern' });
      }

      await storage.deleteLearnedPattern(patternId);

      res.json({ message: 'Pattern deleted successfully' });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to delete pattern');
      res.status(500).json({ error: 'Failed to delete pattern' });
    }
  });

  /**
   * POST /api/learned-patterns/:patternId/apply
   * Apply a pattern to ad generation
   *
   * Auth: Required + Ownership
   * Rate limit: 20/hour (uses expensive limiter)
   */
  app.post('/api/learned-patterns/:patternId/apply', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const patternId = String(req.params['patternId']);

      // Validate apply request
      const parseResult = applyPatternSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid apply request',
          details: parseResult.error.flatten(),
        });
      }

      const pattern = await storage.getLearnedPatternById(patternId);

      if (!pattern) {
        return res.status(404).json({ error: 'Pattern not found' });
      }

      // Ownership check
      if (pattern.userId !== user.id) {
        return res.status(403).json({ error: 'Not authorized to use this pattern' });
      }

      const { productIds, targetPlatform } = parseResult.data;

      // Increment usage count
      await storage.incrementPatternUsage(patternId);

      // Format pattern for prompt
      const patternPrompt = formatPatternsForPrompt([pattern]);

      // Create application history record
      // Note: generatedAdId will be updated after generation
      const history = await storage.createApplicationHistory({
        userId: user.id,
        patternId,
        productId: productIds[0] ?? '', // Primary product
        targetPlatform,
        promptUsed: patternPrompt,
      });

      res.json({
        message: 'Pattern ready to apply',
        patternPrompt,
        historyId: history.id,
        pattern: {
          id: pattern.id,
          name: pattern.name,
          category: pattern.category,
          layoutPattern: pattern.layoutPattern,
          colorPsychology: pattern.colorPsychology,
          hookPatterns: pattern.hookPatterns,
          visualElements: pattern.visualElements,
        },
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to apply pattern');
      res.status(500).json({ error: 'Failed to apply pattern' });
    }
  });

  /**
   * POST /api/learned-patterns/:patternId/rate
   * Rate pattern effectiveness after using it
   *
   * Auth: Required + Ownership
   */
  app.post('/api/learned-patterns/:patternId/rate', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const patternId = String(req.params['patternId']);

      // Validate rating request
      const parseResult = ratePatternSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid rating',
          details: parseResult.error.flatten(),
        });
      }

      const pattern = await storage.getLearnedPatternById(patternId);

      if (!pattern) {
        return res.status(404).json({ error: 'Pattern not found' });
      }

      // Ownership check
      if (pattern.userId !== user.id) {
        return res.status(403).json({ error: 'Not authorized to rate this pattern' });
      }

      const { rating, wasUsed, feedback } = parseResult.data;

      // Get the most recent application history for this pattern
      const history = await storage.getPatternApplicationHistory(patternId);
      // Filter to this user's history and get the most recent
      const userHistory = history.filter((h) => h.userId === user.id);
      const latestHistory = userHistory[0];
      if (latestHistory) {
        await storage.updateApplicationFeedback(latestHistory.id, rating, wasUsed, feedback);
      }

      res.json({
        message: 'Rating recorded',
        patternId,
        rating,
        wasUsed,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to rate pattern');
      res.status(500).json({ error: 'Failed to rate pattern' });
    }
  });

  // ===== END LEARN FROM WINNERS ENDPOINTS =====

  // ============================================
  // CONTENT PLANNER ENDPOINTS
  // ============================================

  /**
   * GET /api/content-planner/templates
   * Returns all content templates with research data
   */
  app.get('/api/content-planner/templates', async (_req, res) => {
    try {
      const { contentCategories, getAllTemplates } = await import('@shared/contentTemplates');
      res.json({
        categories: contentCategories,
        templates: getAllTemplates(),
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to get content planner templates');
      res.status(500).json({ error: 'Failed to get templates' });
    }
  });

  /**
   * GET /api/content-planner/balance
   * Returns weekly post counts by category for the current user
   */
  app.get('/api/content-planner/balance', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { contentCategories, suggestNextCategory } = await import('@shared/contentTemplates');

      // Get posts from this week
      const weeklyPosts = await storage.getWeeklyBalance(userId);

      // Format for UI
      const balance: Record<string, { current: number; target: number; percentage: number }> = {};
      for (const category of contentCategories) {
        const postData = weeklyPosts.find((p) => p.category === category.id);
        const current = postData?.count || 0;
        balance[category.id] = {
          current,
          target: category.weeklyTarget,
          percentage: category.weeklyTarget > 0 ? Math.round((current / category.weeklyTarget) * 100) : 0,
        };
      }

      // Get suggested next category
      const postsForSuggestion = weeklyPosts.map((p) => ({ category: p.category }));
      const suggested = suggestNextCategory(postsForSuggestion);

      res.json({
        balance,
        suggested: {
          categoryId: suggested.id,
          categoryName: suggested.name,
          reason: `You've posted ${balance[suggested.id]?.current || 0} of ${suggested.weeklyTarget} ${suggested.name.toLowerCase()} posts this week.`,
        },
        totalPosts: weeklyPosts.reduce((sum, p) => sum + p.count, 0),
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to get content planner balance');
      res.status(500).json({ error: 'Failed to get balance' });
    }
  });

  /**
   * GET /api/content-planner/suggestion
   * Returns the suggested next post type based on balance
   */
  app.get('/api/content-planner/suggestion', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { suggestNextCategory, getRandomTemplate } = await import('@shared/contentTemplates');

      // Get posts from this week
      const weeklyPosts = await storage.getWeeklyBalance(userId);
      const postsForSuggestion = weeklyPosts.map((p) => ({ category: p.category }));

      // Get suggested category
      const suggested = suggestNextCategory(postsForSuggestion);

      // Get a random template from that category
      const template = getRandomTemplate(suggested.id);

      // Get current count for this category
      const currentCount = weeklyPosts.find((p) => p.category === suggested.id)?.count || 0;

      res.json({
        category: {
          id: suggested.id,
          name: suggested.name,
          percentage: suggested.percentage,
          weeklyTarget: suggested.weeklyTarget,
          currentCount,
          bestPractices: suggested.bestPractices,
        },
        suggestedTemplate: template
          ? {
              id: template.id,
              title: template.title,
              subType: template.subType,
              description: template.description,
              hookFormulas: template.hookFormulas.slice(0, 2), // Preview
            }
          : null,
        reason: `You've posted ${currentCount} of ${suggested.weeklyTarget} ${suggested.name.toLowerCase()} posts this week. This category needs attention.`,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to get content planner suggestion');
      res.status(500).json({ error: 'Failed to get suggestion' });
    }
  });

  /**
   * POST /api/content-planner/posts
   * Marks a post as completed (tracks in the balance)
   */
  app.post('/api/content-planner/posts', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { category, subType, platform, notes } = req.body;

      // Validate category
      const { contentCategories } = await import('@shared/contentTemplates');
      const validCategory = contentCategories.find((c) => c.id === category);
      if (!validCategory) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      // Create the post record
      const post = await storage.createContentPlannerPost({
        userId,
        category,
        subType: subType || 'general',
        platform: platform || null,
        notes: notes || null,
        postedAt: new Date(),
      });

      res.status(201).json({
        message: 'Post recorded',
        post,
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to create content planner post');
      res.status(500).json({ error: 'Failed to record post' });
    }
  });

  /**
   * GET /api/content-planner/posts
   * Returns the user's posts within a date range
   */
  app.get('/api/content-planner/posts', requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { startDate, endDate } = req.query;

      const posts = await storage.getContentPlannerPostsByUser(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
      );

      res.json({ posts });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to get content planner posts');
      res.status(500).json({ error: 'Failed to get posts' });
    }
  });

  /**
   * DELETE /api/content-planner/posts/:id
   * Deletes a post record (undo marking as completed)
   */
  app.delete('/api/content-planner/posts/:id', requireAuth, async (req, res) => {
    try {
      const id = String(req.params['id']);
      await storage.deleteContentPlannerPost(id);
      res.json({ message: 'Post deleted' });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to delete content planner post');
      res.status(500).json({ error: 'Failed to delete post' });
    }
  });

  /**
   * POST /api/content-planner/carousel-outline
   * Generates a structured carousel outline with slides
   *
   * 2026 Best Practices:
   * - 7 slides is the sweet spot (5-10 range optimal)
   * - First slide critical: 80% of engagement
   * - One idea per slide, mobile-first design
   * - Authentic > Polished
   */
  app.post('/api/content-planner/carousel-outline', requireAuth, async (req, res) => {
    try {
      const { templateId, topic, slideCount = 7, platform = 'linkedin', productNames = [] } = req.body;

      if (!templateId) {
        return res.status(400).json({ error: 'templateId is required' });
      }

      if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
        return res.status(400).json({ error: 'topic is required and must be a non-empty string' });
      }

      // Validate slideCount (5-10 range per 2026 best practices)
      const validSlideCount = Math.max(5, Math.min(10, parseInt(slideCount) || 7));

      const { carouselOutlineService } = await import('./services/carouselOutlineService');

      const outline = await carouselOutlineService.generateOutline({
        templateId,
        topic: topic.trim(),
        slideCount: validSlideCount,
        platform: platform.toLowerCase(),
        productNames: Array.isArray(productNames) ? productNames : [],
      });

      res.json({
        success: true,
        outline,
        metadata: {
          recommendedSlideCount: 7,
          slideCountUsed: validSlideCount,
          platform,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to generate carousel outline');
      res.status(500).json({ error: error.message || 'Failed to generate carousel outline' });
    }
  });

  /**
   * POST /api/content-planner/generate-post
   * Generates a complete post with copy and image in parallel
   *
   * 2026 AI-First Approach:
   * - Unified generation (copy + image in one action)
   * - Smart product detection based on template requirements
   * - Partial success handling (returns whatever succeeds)
   * - Unique content on every generation
   */
  app.post(
    '/api/content-planner/generate-post',
    requireAuth,
    validate(generateCompletePostSchema),
    async (req, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        // Body is already validated and transformed by Zod schema
        const { templateId, productIds, topic, platform } = req.body;

        const { contentPlannerService } = await import('./services/contentPlannerService');

        const result = await contentPlannerService.generateCompletePost({
          userId,
          templateId,
          productIds,
          topic: topic || undefined,
          platform,
        });

        res.json(result);
      } catch (error: any) {
        logger.error({ err: error }, 'Failed to generate complete post');
        res.status(500).json({
          success: false,
          copyError: error.message || 'Failed to generate post',
          imageError: error.message || 'Failed to generate post',
        });
      }
    },
  );

  // ===== END CONTENT PLANNER ENDPOINTS =====

  // Uses lazy-loading to prevent import-time errors
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
