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
import type { GenerateCopyInput } from '../validation/schemas';
import { buildFallbackCopyVariations } from '../lib/aiFallbacks';
import { isLikelyGeminiError } from '../lib/geminiResilience';

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
      const userId = req.session?.userId || 'demo-user';
      let validatedData: GenerateCopyInput | undefined;

      const toClientVariation = (variation: {
        headline?: string | null;
        hook?: string | null;
        bodyText?: string | null;
        cta?: string | null;
        caption?: string | null;
        hashtags?: string[] | null;
        framework?: string | null;
      }) => ({
        copy: variation.caption || variation.bodyText || '',
        caption: variation.caption || variation.bodyText || '',
        headline: variation.headline || '',
        hook: variation.hook || '',
        cta: variation.cta || '',
        hashtags: variation.hashtags || [],
        framework: variation.framework || 'fallback',
      });

      try {
        // Validate request
        const { generateCopySchema } = await import('../validation/schemas');
        const parsed = generateCopySchema.parse(req.body);
        validatedData = parsed;

        // Verify generation exists
        const generation = await storage.getGenerationById(parsed.generationId);
        if (!generation) {
          return res.status(404).json({ error: 'Generation not found' });
        }

        // Get user's brand voice if not provided
        let brandVoice = parsed.brandVoice;
        if (!brandVoice) {
          const user = await storage.getUserById(userId);
          if (user?.brandVoice) {
            brandVoice = user.brandVoice as unknown as typeof brandVoice;
          }
        }

        // Generate copy variations
        const { copywritingService } = await import('../services/copywritingService');
        const variations = await copywritingService.generateCopy({
          ...parsed,
          brandVoice,
        });

        // Save all variations to database - use allSettled to handle partial failures
        const saveResults = await Promise.allSettled(
          variations.map((variation, index) =>
            storage.saveAdCopy({
              generationId: parsed.generationId,
              userId,
              headline: variation.headline,
              hook: variation.hook,
              bodyText: variation.bodyText,
              cta: variation.cta,
              caption: variation.caption,
              hashtags: variation.hashtags,
              platform: parsed.platform,
              tone: parsed.tone,
              framework: variation.framework.toLowerCase(),
              campaignObjective: parsed.campaignObjective,
              productName: parsed.productName,
              productDescription: parsed.productDescription,
              productBenefits: parsed.productBenefits,
              uniqueValueProp: parsed.uniqueValueProp,
              industry: parsed.industry,
              targetAudience: parsed.targetAudience,
              brandVoice: brandVoice,
              socialProof: parsed.socialProof,
              qualityScore: variation.qualityScore,
              characterCounts: variation.characterCounts,
              variationNumber: index + 1,
              parentCopyId: null,
            }),
          ),
        );

        // Extract successful saves and log any failures
        const savedCopies = saveResults
          .filter((result) => result.status === 'fulfilled')
          .map((result) => (result as PromiseFulfilledResult<Awaited<ReturnType<typeof storage.saveAdCopy>>>).value);

        const failedCount = saveResults.filter((r) => r.status === 'rejected').length;
        if (failedCount > 0) {
          logger.warn(
            { module: 'GenerateCopy', failedCount, totalCount: variations.length },
            'Some variations failed to save',
          );
        }

        if (savedCopies.length === 0) {
          const fallbackVariations = variations.map(toClientVariation);
          return res.status(200).json({
            success: true,
            fallback: true,
            meta: { provider: 'fallback', reason: 'save_failed' },
            copies: [],
            variations: fallbackVariations,
            recommended: 0,
          });
        }

        const clientVariations = savedCopies.map(toClientVariation);

        res.json({
          success: true,
          copies: savedCopies,
          variations: clientVariations,
          recommended: 0, // First variation is recommended
        });
      } catch (err: unknown) {
        logger.error({ module: 'GenerateCopy', err }, 'Error generating copy');
        if (err instanceof Error && err.name === 'ZodError') {
          return res
            .status(400)
            .json({ error: 'Validation failed', details: (err as unknown as { issues: unknown }).issues });
        }

        const fallbackData = validatedData;
        if (fallbackData && isLikelyGeminiError(err)) {
          const fallbackVariations = buildFallbackCopyVariations({
            productName: fallbackData.productName,
            productDescription: fallbackData.productDescription,
            platform: fallbackData.platform,
            industry: fallbackData.industry,
            count: fallbackData.variations,
          });

          const saveResults = await Promise.allSettled(
            fallbackVariations.map((variation, index) =>
              storage.saveAdCopy({
                generationId: fallbackData.generationId,
                userId,
                headline: variation.headline,
                hook: variation.hook,
                bodyText: variation.bodyText,
                cta: variation.cta,
                caption: variation.caption,
                hashtags: variation.hashtags,
                platform: fallbackData.platform,
                tone: fallbackData.tone,
                framework: variation.framework.toLowerCase(),
                campaignObjective: fallbackData.campaignObjective,
                productName: fallbackData.productName,
                productDescription: fallbackData.productDescription,
                productBenefits: fallbackData.productBenefits,
                uniqueValueProp: fallbackData.uniqueValueProp,
                industry: fallbackData.industry,
                targetAudience: fallbackData.targetAudience,
                brandVoice: fallbackData.brandVoice,
                socialProof: fallbackData.socialProof,
                qualityScore: variation.qualityScore,
                characterCounts: variation.characterCounts,
                variationNumber: index + 1,
                parentCopyId: null,
              }),
            ),
          );

          const savedCopies = saveResults
            .filter((result) => result.status === 'fulfilled')
            .map((result) => (result as PromiseFulfilledResult<Awaited<ReturnType<typeof storage.saveAdCopy>>>).value);

          return res.status(200).json({
            success: true,
            fallback: true,
            meta: { provider: 'fallback', reason: 'gemini_unavailable' },
            copies: savedCopies,
            variations: fallbackVariations.map(toClientVariation),
            recommended: 0,
          });
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
