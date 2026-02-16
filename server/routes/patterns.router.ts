/**
 * Patterns Router
 * Learned ad patterns management endpoints (Learn from Winners feature)
 *
 * Endpoints:
 * - POST /api/learned-patterns/upload - Upload pattern for analysis
 * - GET /api/learned-patterns/upload/:uploadId - Check upload status
 * - GET /api/learned-patterns - List patterns with filters
 * - GET /api/learned-patterns/category/:category - List by category
 * - GET /api/learned-patterns/:patternId - Get single pattern
 * - PUT /api/learned-patterns/:patternId - Update pattern
 * - DELETE /api/learned-patterns/:patternId - Delete pattern
 * - POST /api/learned-patterns/:patternId/apply - Apply pattern to generation
 * - POST /api/learned-patterns/:patternId/rate - Rate pattern effectiveness
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import type { InsertLearnedAdPattern } from '../../shared/schema';
import { createRouter, asyncHandler } from './utils/createRouter';

/** Shape of parsed upload-pattern metadata */
interface UploadPatternMeta {
  name?: string;
  category?: string;
  platform?: string;
  industry?: string;
  engagementTier?: string;
}

/** Shape of parsed list-patterns query filters */
interface ListPatternsFilters {
  category?: string;
  platform?: string;
  industry?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

/** Shape of parsed apply-pattern body */
interface ApplyPatternBody {
  productIds: string[];
  targetPlatform: string;
}

/** Shape of parsed rate-pattern body */
interface RatePatternBody {
  rating: number;
  wasUsed: boolean;
  feedback?: string;
}

export const patternsRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger, cloudinary } = ctx.services;
  const { patternExtraction } = ctx.domainServices;
  const { requireAuth, uploadPatternLimiter, checkPatternQuota, validateFileType } = ctx.middleware;
  const { single: uploadSingle } = ctx.uploads;
  const { uploadPattern, updatePattern, applyPattern, ratePattern, listPatternsQuery } = ctx.schemas;

  /**
   * POST /upload - Upload pattern for analysis
   * Rate limited and quota checked
   */
  router.post(
    '/upload',
    requireAuth,
    uploadPatternLimiter,
    checkPatternQuota,
    uploadSingle('image'),
    validateFileType,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const user = (req as unknown as Record<string, unknown>)['user'] as { id: string };
        const file = req.file;

        if (!file) {
          return res.status(400).json({ error: 'No image file provided' });
        }

        // Validate metadata
        const parseResult = uploadPattern.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({
            error: 'Invalid metadata',
            details: parseResult.error.flatten(),
          });
        }

        const metadata = parseResult.data as UploadPatternMeta;
        const validatedFileType = (req as unknown as Record<string, unknown>)['validatedFileType'] as { mime: string };

        if (!cloudinary) {
          return res.status(503).json({ error: 'Image storage not configured' });
        }

        // Upload to Cloudinary for processing
        const uploadResult = await new Promise<Record<string, unknown>>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'ad-patterns',
              resource_type: 'image',
              tags: ['pattern-extraction', `user-${user.id}`],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as unknown as Record<string, unknown>);
            },
          );
          uploadStream.end(file.buffer);
        });

        // Create upload record with 24-hour expiry
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const uploadRecord = await storage.createUploadRecord({
          userId: user.id,
          cloudinaryUrl: uploadResult['secure_url'] as string,
          cloudinaryPublicId: uploadResult['public_id'] as string,
          originalFilename: file.originalname,
          fileSizeBytes: file.size,
          mimeType: validatedFileType.mime,
          status: 'pending' as const,
          expiresAt,
          privacyScanResult: null,
          errorMessage: null,
          extractedPatternId: null,
          processingStartedAt: null,
          processingCompletedAt: null,
          processingDurationMs: null,
        });

        // Process extraction asynchronously
        const extractionMeta = {
          name: metadata.name ?? '',
          category: metadata.category ?? 'product_showcase',
          platform: metadata.platform ?? 'general',
          ...(metadata.industry != null ? { industry: metadata.industry } : {}),
          ...(metadata.engagementTier != null ? { engagementTier: metadata.engagementTier } : {}),
        } as Parameters<typeof patternExtraction.processUploadForPatterns>[3];
        patternExtraction
          .processUploadForPatterns(uploadRecord.id, file.buffer, validatedFileType.mime, extractionMeta)
          .catch((err) => {
            logger.error({ err, uploadId: uploadRecord.id }, 'Background pattern extraction failed');
          });

        res.status(202).json({
          message: 'Upload accepted for processing',
          uploadId: uploadRecord.id,
          status: 'pending',
          expiresAt: expiresAt.toISOString(),
        });
      } catch (error: unknown) {
        logger.error({ err: error }, 'Pattern upload failed');
        res.status(500).json({ error: 'Failed to upload pattern' });
      }
    }),
  );

  /**
   * GET /upload/:uploadId - Check upload/extraction status
   */
  router.get(
    '/upload/:uploadId',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const user = (req as unknown as Record<string, unknown>)['user'] as { id: string };
        const uploadId = String(req.params['uploadId'] ?? '');

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
      } catch (error: unknown) {
        logger.error({ err: error }, 'Failed to get upload status');
        res.status(500).json({ error: 'Failed to get upload status' });
      }
    }),
  );

  /**
   * GET / - List patterns with filters
   */
  router.get(
    '/',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const user = (req as unknown as Record<string, unknown>)['user'] as { id: string };

        // Parse query parameters
        const parseResult = listPatternsQuery.safeParse(req.query);
        if (!parseResult.success) {
          return res.status(400).json({
            error: 'Invalid query parameters',
            details: parseResult.error.flatten(),
          });
        }

        const filters = parseResult.data as ListPatternsFilters;

        // Get all patterns with filters — only include defined properties (exactOptionalPropertyTypes)
        const storageFilters: {
          category?: string;
          platform?: string;
          industry?: string;
          isActive?: boolean;
        } = {};
        if (filters.category != null) storageFilters.category = filters.category;
        if (filters.platform != null) storageFilters.platform = filters.platform;
        if (filters.industry != null) storageFilters.industry = filters.industry;
        if (filters.isActive != null) storageFilters.isActive = filters.isActive;

        let patterns = await storage.getLearnedPatterns(user.id, storageFilters);

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
      } catch (error: unknown) {
        logger.error({ err: error }, 'Failed to list patterns');
        res.status(500).json({ error: 'Failed to list patterns' });
      }
    }),
  );

  /**
   * GET /category/:category - List patterns by category
   */
  router.get(
    '/category/:category',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const user = (req as unknown as Record<string, unknown>)['user'] as { id: string };
        const category = String(req.params['category'] ?? '');

        const patterns = await storage.getLearnedPatterns(user.id, {
          category,
          isActive: true,
        });

        res.json({
          patterns,
          count: patterns.length,
          category,
        });
      } catch (error: unknown) {
        logger.error({ err: error }, 'Failed to list patterns by category');
        res.status(500).json({ error: 'Failed to list patterns by category' });
      }
    }),
  );

  /**
   * GET /:patternId - Get a specific pattern
   */
  router.get(
    '/:patternId',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const user = (req as unknown as Record<string, unknown>)['user'] as { id: string };
        const patternId = String(req.params['patternId'] ?? '');

        const pattern = await storage.getLearnedPatternById(patternId);

        if (!pattern) {
          return res.status(404).json({ error: 'Pattern not found' });
        }

        // Ownership check
        if (pattern.userId !== user.id) {
          return res.status(403).json({ error: 'Not authorized to access this pattern' });
        }

        res.json(pattern);
      } catch (error: unknown) {
        logger.error({ err: error }, 'Failed to get pattern');
        res.status(500).json({ error: 'Failed to get pattern' });
      }
    }),
  );

  /**
   * PUT /:patternId - Update a pattern's metadata
   */
  router.put(
    '/:patternId',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const user = (req as unknown as Record<string, unknown>)['user'] as { id: string };
        const patternId = String(req.params['patternId'] ?? '');

        // Validate update data
        const parseResult = updatePattern.safeParse(req.body);
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

        const updatedPattern = await storage.updateLearnedPattern(
          patternId,
          parseResult.data as Partial<InsertLearnedAdPattern>,
        );

        res.json(updatedPattern);
      } catch (error: unknown) {
        logger.error({ err: error }, 'Failed to update pattern');
        res.status(500).json({ error: 'Failed to update pattern' });
      }
    }),
  );

  /**
   * DELETE /:patternId - Delete a pattern
   */
  router.delete(
    '/:patternId',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const user = (req as unknown as Record<string, unknown>)['user'] as { id: string };
        const patternId = String(req.params['patternId'] ?? '');

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
      } catch (error: unknown) {
        logger.error({ err: error }, 'Failed to delete pattern');
        res.status(500).json({ error: 'Failed to delete pattern' });
      }
    }),
  );

  /**
   * POST /:patternId/apply - Apply a pattern to ad generation
   */
  router.post(
    '/:patternId/apply',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const user = (req as unknown as Record<string, unknown>)['user'] as { id: string };
        const patternId = String(req.params['patternId'] ?? '');

        // Validate apply request
        const parseResult = applyPattern.safeParse(req.body);
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

        const applyData = parseResult.data as ApplyPatternBody;
        const { productIds, targetPlatform } = applyData;

        // Increment usage count
        await storage.incrementPatternUsage(patternId);

        // Format pattern for prompt
        const patternPrompt = patternExtraction.formatPatternsForPrompt([pattern]);

        // Create application history record
        const history = await storage.createApplicationHistory({
          userId: user.id,
          patternId,
          productId: productIds[0] ?? '',
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
      } catch (error: unknown) {
        logger.error({ err: error }, 'Failed to apply pattern');
        res.status(500).json({ error: 'Failed to apply pattern' });
      }
    }),
  );

  /**
   * POST /:patternId/rate - Rate pattern effectiveness
   */
  router.post(
    '/:patternId/rate',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const user = (req as unknown as Record<string, unknown>)['user'] as { id: string };
        const patternId = String(req.params['patternId'] ?? '');

        // Validate rating request
        const parseResult = ratePattern.safeParse(req.body);
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

        const rateData = parseResult.data as RatePatternBody;
        const { rating, wasUsed, feedback } = rateData;

        // Get the most recent application history for this pattern
        const history = await storage.getPatternApplicationHistory(patternId);
        // Filter to this user's history and get the most recent
        const userHistory = history.filter((h: Record<string, unknown>) => h['userId'] === user.id);
        const firstEntry = userHistory[0];
        if (firstEntry) {
          await storage.updateApplicationFeedback((firstEntry as { id: string }).id, rating, wasUsed, feedback);
        }

        res.json({
          message: 'Rating recorded',
          patternId,
          rating,
          wasUsed,
        });
      } catch (error: unknown) {
        logger.error({ err: error }, 'Failed to rate pattern');
        res.status(500).json({ error: 'Failed to rate pattern' });
      }
    }),
  );

  return router;
};

export const patternsRouterModule: RouterModule = {
  prefix: '/api/learned-patterns',
  factory: patternsRouter,
  description: 'Learned ad patterns management (Learn from Winners)',
  endpointCount: 9,
  requiresAuth: true,
  tags: ['patterns', 'learning', 'ai'],
};
