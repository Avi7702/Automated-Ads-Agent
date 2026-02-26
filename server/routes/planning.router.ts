/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Planning Router
 * Content planner endpoints for post scheduling and balance tracking
 *
 * Endpoints:
 * - GET /api/content-planner/templates - Get content templates
 * - GET /api/content-planner/balance - Get weekly balance
 * - GET /api/content-planner/suggestion - Get suggested next post
 * - POST /api/content-planner/posts - Create post record
 * - GET /api/content-planner/posts - Get posts by date range
 * - DELETE /api/content-planner/posts/:id - Delete post record
 * - POST /api/content-planner/carousel-outline - Generate carousel outline
 * - POST /api/content-planner/generate-post - Generate complete post
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { validate as validateMiddleware } from '../middleware/validate';
import { planningPostsQuerySchema } from '../validation/schemas';

export const planningRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth, validate } = ctx.middleware;
  const { generateCompletePost } = ctx.schemas;

  /**
   * GET /templates - Get content templates
   */
  router.get(
    '/templates',
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const { contentCategories, getAllTemplates } = await import('@shared/contentTemplates');
        res.json({
          categories: contentCategories,
          templates: getAllTemplates(),
        });
      } catch (err: unknown) {
        logger.error({ err }, 'Failed to get content planner templates');
        res.status(500).json({ error: 'Failed to get templates' });
      }
    }),
  );

  /**
   * GET /balance - Get weekly post counts by category
   */
  router.get(
    '/balance',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const { contentCategories, suggestNextCategory } = await import('@shared/contentTemplates');

        // Get posts from this week
        const weeklyPosts = await storage.getWeeklyBalance(userId);

        // Format for UI
        const balance: Record<string, { current: number; target: number; percentage: number }> = {};
        for (const category of contentCategories) {
          const postData = weeklyPosts.find((p: { category: string; count: number }) => p.category === category.id);
          const current = postData?.count || 0;
          balance[category.id] = {
            current,
            target: category.weeklyTarget,
            percentage: category.weeklyTarget > 0 ? Math.round((current / category.weeklyTarget) * 100) : 0,
          };
        }

        // Get suggested next category
        const postsForSuggestion = weeklyPosts.map((p: { category: string; count: number }) => ({
          category: p.category,
        }));
        const suggested = suggestNextCategory(postsForSuggestion);

        res.json({
          balance,
          suggested: {
            categoryId: suggested.id,
            categoryName: suggested.name,
            reason: `You've posted ${balance[suggested.id]?.current || 0} of ${suggested.weeklyTarget} ${suggested.name.toLowerCase()} posts this week.`,
          },
          totalPosts: weeklyPosts.reduce((sum: number, p: { category: string; count: number }) => sum + p.count, 0),
        });
      } catch (err: unknown) {
        logger.error({ err }, 'Failed to get content planner balance');
        res.status(500).json({ error: 'Failed to get balance' });
      }
    }),
  );

  /**
   * GET /suggestion - Get suggested next post type
   */
  router.get(
    '/suggestion',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const { suggestNextCategory, getRandomTemplate } = await import('@shared/contentTemplates');

        // Get posts from this week
        const weeklyPosts = await storage.getWeeklyBalance(userId);
        const postsForSuggestion = weeklyPosts.map((p: { category: string; count: number }) => ({
          category: p.category,
        }));

        // Get suggested category
        const suggested = suggestNextCategory(postsForSuggestion);

        // Get a random template from that category
        const template = getRandomTemplate(suggested.id);

        // Get current count for this category
        const currentCount =
          weeklyPosts.find((p: { category: string; count: number }) => p.category === suggested.id)?.count || 0;

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
      } catch (err: unknown) {
        logger.error({ err }, 'Failed to get content planner suggestion');
        res.status(500).json({ error: 'Failed to get suggestion' });
      }
    }),
  );

  /**
   * POST /posts - Create post record
   */
  router.post(
    '/posts',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const { category, subType, platform, notes } = req.body;

        // Validate category
        const { contentCategories } = await import('@shared/contentTemplates');
        const validCategory = contentCategories.find((c: { id: string }) => c.id === category);
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
      } catch (err: unknown) {
        logger.error({ err }, 'Failed to create content planner post');
        res.status(500).json({ error: 'Failed to record post' });
      }
    }),
  );

  /**
   * GET /posts - Get posts by date range
   */
  router.get(
    '/posts',
    requireAuth,
    validateMiddleware(planningPostsQuerySchema, 'query'),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const validated = (req as unknown as Record<string, unknown>)['validatedQuery'] as
          | { startDate?: string; endDate?: string }
          | undefined;

        const posts = await storage.getContentPlannerPostsByUser(
          userId,
          validated?.startDate ? new Date(validated.startDate) : undefined,
          validated?.endDate ? new Date(validated.endDate) : undefined,
        );

        res.json({ posts });
      } catch (err: unknown) {
        logger.error({ err }, 'Failed to get content planner posts');
        res.status(500).json({ error: 'Failed to get posts' });
      }
    }),
  );

  /**
   * DELETE /posts/:id - Delete post record
   */
  router.delete(
    '/posts/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const id = String(req.params['id']);

        // Verify ownership before deleting
        const post = await storage.getContentPlannerPostById(id);
        if (!post) {
          return res.status(404).json({ error: 'Post not found' });
        }
        if (post.userId !== userId) {
          return res.status(403).json({ error: 'Not authorized to delete this post' });
        }

        await storage.deleteContentPlannerPost(id);
        res.json({ message: 'Post deleted' });
      } catch (err: unknown) {
        logger.error({ err }, 'Failed to delete content planner post');
        res.status(500).json({ error: 'Failed to delete post' });
      }
    }),
  );

  /**
   * POST /carousel-outline - Generate carousel outline
   */
  router.post(
    '/carousel-outline',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
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

        const { carouselOutlineService } = await import('../services/carouselOutlineService');

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
      } catch (err: unknown) {
        logger.error({ err }, 'Failed to generate carousel outline');
        res.status(500).json({ error: 'Failed to generate carousel outline' });
      }
    }),
  );

  /**
   * POST /generate-post - Generate complete post with copy and image
   */
  router.post(
    '/generate-post',
    requireAuth,
    validate(generateCompletePost),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        // Body is already validated and transformed by Zod schema
        const { templateId, productIds, topic, platform } = req.body;

        const { contentPlannerService } = await import('../services/contentPlannerService');

        const result = await contentPlannerService.generateCompletePost({
          userId,
          templateId,
          productIds,
          topic: topic || undefined,
          platform,
        });

        res.json(result);
      } catch (err: unknown) {
        logger.error({ err }, 'Failed to generate complete post');
        res.status(500).json({
          success: false,
          copyError: 'Failed to generate post',
          imageError: 'Failed to generate post',
        });
      }
    }),
  );

  return router;
};

export const planningRouterModule: RouterModule = {
  prefix: '/api/content-planner',
  factory: planningRouter,
  description: 'Content planner and post scheduling',
  endpointCount: 8,
  requiresAuth: false,
  tags: ['content', 'planning', 'scheduling'],
};
