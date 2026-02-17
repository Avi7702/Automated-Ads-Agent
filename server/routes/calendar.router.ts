/**
 * Calendar Router
 * Content calendar API for scheduling, viewing, and managing posts
 *
 * Endpoints:
 * - GET  /api/calendar/posts       — Posts in date range (calendar grid)
 * - GET  /api/calendar/counts      — Post counts per day (dot indicators)
 * - GET  /api/calendar/posts/:id   — Single post details
 * - POST /api/calendar/schedule    — Schedule a new post
 * - PATCH /api/calendar/posts/:id/reschedule — Change scheduled date
 * - PATCH /api/calendar/posts/:id/cancel     — Cancel a scheduled post
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler, handleRouteError } from './utils/createRouter';
import {
  getScheduledPostsByDateRange,
  getScheduledPostById,
  getPostCountsByMonth,
  schedulePost,
  reschedulePost,
  cancelScheduledPost,
} from '../services/schedulingRepository';

export const calendarRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger } = ctx.services;
  const { requireAuth } = ctx.middleware;

  // All calendar endpoints require authentication
  router.use(requireAuth);

  /**
   * GET /posts — Posts in a date range
   * Query: ?start=ISO&end=ISO
   */
  router.get(
    '/posts',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user?.id;
        const { start, end } = req.query;

        if (!start || !end) {
          return res.status(400).json({ error: 'start and end query params required' });
        }

        const startDate = new Date(start as string);
        const endDate = new Date(end as string);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ error: 'Invalid date format. Use ISO 8601.' });
        }

        const posts = await getScheduledPostsByDateRange(userId, startDate, endDate);
        res.json(posts);
      } catch (error) {
        handleRouteError(res, error, 'calendar.getPosts');
      }
    }),
  );

  /**
   * GET /counts — Post counts per day for dot indicators
   * Query: ?year=2026&month=2
   */
  router.get(
    '/counts',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user?.id;
        const year = parseInt(String(req.query['year']), 10);
        const month = parseInt(String(req.query['month']), 10);

        if (!year || !month || month < 1 || month > 12) {
          return res.status(400).json({ error: 'Valid year and month (1-12) query params required' });
        }

        const counts = await getPostCountsByMonth(userId, year, month);
        res.json(counts);
      } catch (error) {
        handleRouteError(res, error, 'calendar.getCounts');
      }
    }),
  );

  /**
   * GET /posts/:id — Single post detail
   */
  router.get(
    '/posts/:id',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user?.id;
        const post = await getScheduledPostById(String(req.params['id']), userId);

        if (!post) {
          return res.status(404).json({ error: 'Post not found' });
        }

        res.json(post);
      } catch (error) {
        handleRouteError(res, error, 'calendar.getPost');
      }
    }),
  );

  /**
   * POST /schedule — Schedule a new post
   * Body: { connectionId, caption, hashtags?, imageUrl?, scheduledFor, timezone?, generationId?, templateId? }
   */
  router.post(
    '/schedule',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user?.id;
        const {
          connectionId,
          caption,
          hashtags,
          imageUrl,
          imagePublicId,
          scheduledFor,
          timezone,
          generationId,
          templateId,
        } = req.body;

        if (!connectionId || !caption || !scheduledFor) {
          return res.status(400).json({ error: 'connectionId, caption, and scheduledFor are required' });
        }

        const scheduledDate = new Date(scheduledFor);
        if (isNaN(scheduledDate.getTime())) {
          return res.status(400).json({ error: 'Invalid scheduledFor date format' });
        }

        if (scheduledDate <= new Date()) {
          return res.status(400).json({ error: 'scheduledFor must be in the future' });
        }

        const post = await schedulePost({
          userId,
          connectionId,
          caption,
          hashtags,
          imageUrl,
          imagePublicId,
          scheduledFor: scheduledDate,
          timezone,
          generationId,
          templateId,
        });

        logger.info({ postId: post.id, scheduledFor: post.scheduledFor }, 'Post scheduled');
        res.status(201).json(post);
      } catch (error) {
        handleRouteError(res, error, 'calendar.schedule');
      }
    }),
  );

  /**
   * PATCH /posts/:id/reschedule — Change scheduled date
   * Body: { scheduledFor: ISO }
   */
  router.patch(
    '/posts/:id/reschedule',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user?.id;
        const { scheduledFor } = req.body;

        if (!scheduledFor) {
          return res.status(400).json({ error: 'scheduledFor is required' });
        }

        const newDate = new Date(scheduledFor);
        if (isNaN(newDate.getTime())) {
          return res.status(400).json({ error: 'Invalid scheduledFor date format' });
        }

        const post = await reschedulePost(String(req.params['id']), userId, newDate);

        if (!post) {
          return res.status(404).json({ error: 'Post not found' });
        }

        logger.info({ postId: post.id, newDate: post.scheduledFor }, 'Post rescheduled');
        res.json(post);
      } catch (error) {
        handleRouteError(res, error, 'calendar.reschedule');
      }
    }),
  );

  /**
   * PATCH /posts/:id/cancel — Cancel a scheduled post
   */
  router.patch(
    '/posts/:id/cancel',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user?.id;
        const post = await cancelScheduledPost(String(req.params['id']), userId);

        if (!post) {
          return res.status(404).json({ error: 'Post not found' });
        }

        logger.info({ postId: post.id }, 'Post cancelled');
        res.json(post);
      } catch (error) {
        handleRouteError(res, error, 'calendar.cancel');
      }
    }),
  );

  return router;
};

export const calendarRouterModule: RouterModule = {
  prefix: '/api/calendar',
  factory: calendarRouter,
  description: 'Content calendar scheduling and management',
  endpointCount: 6,
  requiresAuth: true,
  tags: ['calendar', 'scheduling', 'content'],
};
