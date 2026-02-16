/**
 * Style References Router
 * Character/style consistency reference image management
 *
 * Endpoints:
 * - POST /api/style-references - Upload and analyze a reference image
 * - GET /api/style-references - List user's style references
 * - GET /api/style-references/:id - Get single reference with details
 * - PUT /api/style-references/:id - Update reference metadata
 * - DELETE /api/style-references/:id - Soft-delete a reference
 * - POST /api/style-references/:id/reanalyze - Re-run vision analysis
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { analyzeStyleImage, generateStyleFingerprint } from '../services/styleAnalysisService';

const VALID_CATEGORIES = ['character', 'style', 'scene'] as const;

/**
 * Check if a database error is caused by a missing table (migration not yet applied).
 * PostgreSQL error code 42P01 = "undefined_table"
 */
function isTableMissingError(error: any): boolean {
  return (
    error?.code === '42P01' || (error?.message?.includes('relation') && error?.message?.includes('does not exist'))
  );
}

export const styleReferencesRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth } = ctx.middleware;
  const { single: uploadSingle } = ctx.uploads;

  /**
   * POST / - Upload a new style reference image
   */
  router.post(
    '/',
    uploadSingle('image'),
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const file = req.file;

        if (!file) {
          return res.status(400).json({ error: 'Image file is required' });
        }

        const name = req.body.name || 'Untitled Reference';
        const category = VALID_CATEGORIES.includes(req.body.category) ? req.body.category : 'style';
        const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

        // Upload to Cloudinary
        const cloudinary = (await import('cloudinary')).v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const uploadResult = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder: 'style-references',
                resource_type: 'image',
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              },
            )
            .end(file.buffer);
        });

        const fingerprint = generateStyleFingerprint(uploadResult.public_id);

        // Create DB record (pre-analysis)
        const ref = await storage.createStyleReference({
          userId,
          cloudinaryUrl: uploadResult.secure_url,
          cloudinaryPublicId: uploadResult.public_id,
          name,
          category,
          tags,
          imageFingerprint: fingerprint,
          isActive: true,
          confidence: 0,
        });

        // Run vision analysis async (don't block the response)
        analyzeStyleImage(uploadResult.secure_url, name)
          .then(async (analysis) => {
            await storage.updateStyleReference(ref.id, {
              styleDescription: analysis.styleDescription,
              extractedElements: analysis.extractedElements as any,
              confidence: analysis.confidence,
              analyzedAt: new Date(),
            });
            logger.info({ refId: ref.id, confidence: analysis.confidence }, 'Style reference analyzed');
          })
          .catch((err) => {
            logger.error({ refId: ref.id, err }, 'Style reference analysis failed');
          });

        res.status(201).json(ref);
      } catch (error: any) {
        if (isTableMissingError(error)) {
          logger.warn({ module: 'StyleReferences' }, 'style_references table not found. Run migrations to create it.');
          return res
            .status(503)
            .json({ error: 'Style references feature is not yet available. Database migration required.' });
        }
        logger.error({ module: 'StyleReferences', err: error }, 'Upload error');
        res.status(500).json({ error: 'Failed to upload style reference' });
      }
    }),
  );

  /**
   * GET / - List user's style references
   */
  router.get(
    '/',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const limit = Math.min(parseInt(String(req.query.limit)) || 50, 200);
        const offset = parseInt(String(req.query.offset)) || 0;
        const category = req.query.category as string | undefined;

        let refs;
        if (category && VALID_CATEGORIES.includes(category as any)) {
          refs = await storage.getStyleReferencesByCategory(userId, category);
        } else {
          refs = await storage.getStyleReferencesByUser(userId, limit, offset);
        }

        res.json(refs);
      } catch (error: any) {
        // Non-critical feature — return empty list on any error instead of 500
        logger.warn(
          { module: 'StyleReferences', err: error?.message || error },
          'Failed to list style references — returning empty list',
        );
        return res.json([]);
      }
    }),
  );

  /**
   * GET /:id - Get single reference
   */
  router.get(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const ref = await storage.getStyleReferenceById(req.params.id);

        if (!ref || ref.userId !== userId) {
          return res.status(404).json({ error: 'Style reference not found' });
        }

        res.json(ref);
      } catch (error: any) {
        if (isTableMissingError(error)) {
          logger.warn({ module: 'StyleReferences' }, 'style_references table not found. Run migrations to create it.');
          return res.status(404).json({ error: 'Style reference not found' });
        }
        logger.error({ module: 'StyleReferences', err: error }, 'Get error');
        res.status(500).json({ error: 'Failed to get style reference' });
      }
    }),
  );

  /**
   * PUT /:id - Update metadata
   */
  router.put(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const existing = await storage.getStyleReferenceById(req.params.id);

        if (!existing || existing.userId !== userId) {
          return res.status(404).json({ error: 'Style reference not found' });
        }

        const updates: Record<string, any> = {};
        if (req.body.name) updates.name = req.body.name;
        if (req.body.category && VALID_CATEGORIES.includes(req.body.category)) {
          updates.category = req.body.category;
        }
        if (req.body.tags) updates.tags = req.body.tags;

        const ref = await storage.updateStyleReference(req.params.id, updates);
        res.json(ref);
      } catch (error: any) {
        if (isTableMissingError(error)) {
          logger.warn({ module: 'StyleReferences' }, 'style_references table not found. Run migrations to create it.');
          return res
            .status(503)
            .json({ error: 'Style references feature is not yet available. Database migration required.' });
        }
        logger.error({ module: 'StyleReferences', err: error }, 'Update error');
        res.status(500).json({ error: 'Failed to update style reference' });
      }
    }),
  );

  /**
   * DELETE /:id - Soft-delete a reference
   */
  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const existing = await storage.getStyleReferenceById(req.params.id);

        if (!existing || existing.userId !== userId) {
          return res.status(404).json({ error: 'Style reference not found' });
        }

        // Soft delete in DB (keeps Cloudinary asset for potential recovery)
        await storage.deleteStyleReference(req.params.id);
        res.json({ success: true });
      } catch (error: any) {
        if (isTableMissingError(error)) {
          logger.warn({ module: 'StyleReferences' }, 'style_references table not found. Run migrations to create it.');
          return res
            .status(503)
            .json({ error: 'Style references feature is not yet available. Database migration required.' });
        }
        logger.error({ module: 'StyleReferences', err: error }, 'Delete error');
        res.status(500).json({ error: 'Failed to delete style reference' });
      }
    }),
  );

  /**
   * POST /:id/reanalyze - Re-run vision analysis on an existing reference
   */
  router.post(
    '/:id/reanalyze',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const existing = await storage.getStyleReferenceById(req.params.id);

        if (!existing || existing.userId !== userId) {
          return res.status(404).json({ error: 'Style reference not found' });
        }

        const analysis = await analyzeStyleImage(existing.cloudinaryUrl, existing.name);

        const updated = await storage.updateStyleReference(req.params.id, {
          styleDescription: analysis.styleDescription,
          extractedElements: analysis.extractedElements as any,
          confidence: analysis.confidence,
          analyzedAt: new Date(),
        });

        res.json(updated);
      } catch (error: any) {
        if (isTableMissingError(error)) {
          logger.warn({ module: 'StyleReferences' }, 'style_references table not found. Run migrations to create it.');
          return res
            .status(503)
            .json({ error: 'Style references feature is not yet available. Database migration required.' });
        }
        logger.error({ module: 'StyleReferences', err: error }, 'Reanalyze error');
        res.status(500).json({ error: 'Failed to reanalyze style reference' });
      }
    }),
  );

  return router;
};

export const styleReferencesRouterModule: RouterModule = {
  prefix: '/api/style-references',
  factory: styleReferencesRouter,
  description: 'Character/style reference image management',
  endpointCount: 6,
  requiresAuth: true,
  tags: ['style', 'references', 'images', 'consistency'],
};
