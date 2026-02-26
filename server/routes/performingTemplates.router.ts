/**
 * Performing Ad Templates Router
 * CRUD and search for performing ad templates with Cloudinary preview uploads
 *
 * Endpoints:
 * - POST /api/performing-ad-templates - Create performing ad template
 * - GET /api/performing-ad-templates - List templates for user
 * - GET /api/performing-ad-templates/featured - Get featured templates
 * - GET /api/performing-ad-templates/top - Get top performing templates
 * - POST /api/performing-ad-templates/search - Search templates with filters
 * - GET /api/performing-ad-templates/category/:category - Get by category
 * - GET /api/performing-ad-templates/platform/:platform - Get by platform
 * - GET /api/performing-ad-templates/:id - Get single template
 * - PUT /api/performing-ad-templates/:id - Update template
 * - DELETE /api/performing-ad-templates/:id - Delete template
 */

import type { Router, Request, Response } from 'express';
import type { UploadApiResponse } from 'cloudinary';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const performingTemplatesRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth } = ctx.middleware;
  const { single: uploadSingle } = ctx.uploads;

  /**
   * POST / - Create performing ad template
   */
  router.post(
    '/',
    uploadSingle('preview'),
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;
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

          const result = await new Promise<UploadApiResponse>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'performing-ad-templates',
                resource_type: 'image',
              },
              (error, uploadResult) => {
                if (error) reject(error);
                else resolve(uploadResult);
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
      } catch (err: unknown) {
        logger.error({ module: 'PerformingTemplates', err }, 'Create error');
        res.status(500).json({ error: 'Failed to create performing ad template' });
      }
    }),
  );

  /**
   * GET / - List all performing ad templates for user
   */
  router.get(
    '/',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;
        const templates = await storage.getPerformingAdTemplates(userId);
        res.json(templates);
      } catch (err: unknown) {
        logger.error({ module: 'PerformingTemplates', err }, 'List error');
        res.status(500).json({ error: 'Failed to fetch performing ad templates' });
      }
    }),
  );

  /**
   * GET /featured - Get featured templates (MUST be before :id catch-all)
   */
  router.get(
    '/featured',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;
        const templates = await storage.getFeaturedPerformingAdTemplates(userId);
        res.json(templates);
      } catch (err: unknown) {
        logger.error({ module: 'PerformingTemplates', err }, 'Get featured error');
        res.status(500).json({ error: 'Failed to fetch featured templates' });
      }
    }),
  );

  /**
   * GET /top - Get top performing templates (MUST be before :id catch-all)
   */
  router.get(
    '/top',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;
        const limit = parseInt(String(req.query['limit'] ?? '')) || 10;
        const templates = await storage.getTopPerformingAdTemplates(userId, limit);
        res.json(templates);
      } catch (err: unknown) {
        logger.error({ module: 'PerformingTemplates', err }, 'Get top error');
        res.status(500).json({ error: 'Failed to fetch top templates' });
      }
    }),
  );

  /**
   * POST /search - Search templates with filters (MUST be before :id catch-all)
   */
  router.post(
    '/search',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;
        const filters = req.body;
        const templates = await storage.searchPerformingAdTemplates(userId, filters);
        res.json(templates);
      } catch (err: unknown) {
        logger.error({ module: 'PerformingTemplates', err }, 'Search error');
        res.status(500).json({ error: 'Failed to search templates' });
      }
    }),
  );

  /**
   * GET /category/:category - Get templates by category (MUST be before :id catch-all)
   */
  router.get(
    '/category/:category',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;
        const templates = await storage.getPerformingAdTemplatesByCategory(userId, String(req.params['category']));
        res.json(templates);
      } catch (err: unknown) {
        logger.error({ module: 'PerformingTemplates', err }, 'Get by category error');
        res.status(500).json({ error: 'Failed to fetch templates by category' });
      }
    }),
  );

  /**
   * GET /platform/:platform - Get templates by platform (MUST be before :id catch-all)
   */
  router.get(
    '/platform/:platform',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;
        const templates = await storage.getPerformingAdTemplatesByPlatform(userId, String(req.params['platform']));
        res.json(templates);
      } catch (err: unknown) {
        logger.error({ module: 'PerformingTemplates', err }, 'Get by platform error');
        res.status(500).json({ error: 'Failed to fetch templates by platform' });
      }
    }),
  );

  /**
   * GET /:id - Get single performing ad template (catch-all - must be after specific routes)
   */
  router.get(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const template = await storage.getPerformingAdTemplate(String(req.params['id']));
        if (!template) {
          return res.status(404).json({ error: 'Template not found' });
        }
        res.json(template);
      } catch (err: unknown) {
        logger.error({ module: 'PerformingTemplates', err }, 'Get error');
        res.status(500).json({ error: 'Failed to fetch performing ad template' });
      }
    }),
  );

  /**
   * PUT /:id - Update performing ad template
   */
  router.put(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const template = await storage.updatePerformingAdTemplate(String(req.params['id']), req.body);
        res.json(template);
      } catch (err: unknown) {
        logger.error({ module: 'PerformingTemplates', err }, 'Update error');
        res.status(500).json({ error: 'Failed to update performing ad template' });
      }
    }),
  );

  /**
   * DELETE /:id - Delete performing ad template
   */
  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
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
      } catch (err: unknown) {
        logger.error({ module: 'PerformingTemplates', err }, 'Delete error');
        res.status(500).json({ error: 'Failed to delete performing ad template' });
      }
    }),
  );

  return router;
};

export const performingTemplatesRouterModule: RouterModule = {
  prefix: '/api/performing-ad-templates',
  factory: performingTemplatesRouter,
  description: 'Performing ad template CRUD, search, and filtering',
  endpointCount: 10,
  requiresAuth: true,
  tags: ['templates', 'performing-ads', 'cloudinary'],
};
