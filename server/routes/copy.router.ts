/**
 * Copy Router
 * Ad copy generation and CRUD for copy variations
 *
 * Endpoints:
 * - POST /api/copy/generate - Generate ad copy with multiple variations
 * - GET /api/copy/generation/:generationId - Get copy by generation ID
 * - GET /api/copy/:id - Get specific copy by ID
 * - DELETE /api/copy/:id - Delete copy
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { promptInjectionGuard } from '../middleware/promptInjectionGuard';

export const copyRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;

  /**
   * POST /generate - Generate ad copy with multiple variations
   */
  router.post(
    '/generate',
    promptInjectionGuard,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        // Use session userId if available, otherwise use a default for demo
        const userId = req.session?.userId || 'demo-user';

        // Validate request
        const { generateCopySchema } = await import('../validation/schemas');
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
            brandVoice = user.brandVoice as typeof brandVoice;
          }
        }

        // Generate copy variations
        const { copywritingService } = await import('../services/copywritingService');
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
          .filter((result): result is PromiseFulfilledResult<unknown> => result.status === 'fulfilled')
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
      } catch (err: unknown) {
        logger.error({ module: 'GenerateCopy', err }, 'Error generating copy');
        if (err instanceof Error && err.name === 'ZodError') {
          return res.status(400).json({ error: 'Validation failed', details: (err as { issues: unknown }).issues });
        }
        res
          .status(500)
          .json({ error: 'Failed to generate copy', details: err instanceof Error ? err.message : String(err) });
      }
    }),
  );

  /**
   * GET /generation/:generationId - Get copy by generation ID
   */
  router.get(
    '/generation/:generationId',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const copies = await storage.getAdCopyByGenerationId(String(req.params['generationId']));
        res.json({ copies });
      } catch (err: unknown) {
        logger.error({ module: 'GetCopyByGeneration', err }, 'Error fetching copy');
        res.status(500).json({ error: 'Failed to fetch copy' });
      }
    }),
  );

  /**
   * GET /:id - Get specific copy by ID
   */
  router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const copy = await storage.getAdCopyById(String(req.params['id']));
        if (!copy) {
          return res.status(404).json({ error: 'Copy not found' });
        }
        res.json({ copy });
      } catch (err: unknown) {
        logger.error({ module: 'GetCopy', err }, 'Error fetching copy');
        res.status(500).json({ error: 'Failed to fetch copy' });
      }
    }),
  );

  /**
   * DELETE /:id - Delete copy
   */
  router.delete(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        await storage.deleteAdCopy(String(req.params['id']));
        res.json({ success: true });
      } catch (err: unknown) {
        logger.error({ module: 'DeleteCopy', err }, 'Error deleting copy');
        res.status(500).json({ error: 'Failed to delete copy' });
      }
    }),
  );

  return router;
};

export const copyRouterModule: RouterModule = {
  prefix: '/api/copy',
  factory: copyRouter,
  description: 'Ad copy generation and CRUD for copy variations',
  endpointCount: 4,
  requiresAuth: false, // Mixed - generate uses session, reads are public
  tags: ['copywriting', 'ai', 'content'],
};
