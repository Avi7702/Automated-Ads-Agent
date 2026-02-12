// @ts-nocheck
/**
 * Agent Tools — Scheduling & Calendar
 * Tools for scheduling posts and viewing the content calendar
 */

import { FunctionTool } from '@google/adk';
import type { ToolContext } from '@google/adk';
import { z } from 'zod';
import type { IStorage } from '../../../storage';
import { logger } from '../../../lib/logger';

export function createSchedulingTools(storage: IStorage) {
  const schedulePost = new FunctionTool({
    name: 'schedule_post',
    description:
      'Schedule a post for publishing at a specific date and time on a social platform. Requires a valid social connection ID. Use get_calendar first to check for scheduling conflicts.',
    parameters: z.object({
      connectionId: z.string().describe('The social connection ID (from social accounts)'),
      caption: z.string().min(1).describe('Post caption text'),
      scheduledFor: z.string().describe('ISO 8601 date-time string for when to publish (e.g. "2026-03-15T10:00:00Z")'),
      timezone: z.string().optional().describe('Timezone (default: UTC, e.g. "America/New_York")'),
      imageUrl: z.string().optional().describe('Cloudinary image URL to attach to the post'),
      hashtags: z.array(z.string()).optional().describe('Hashtags to include'),
    }),
    execute: async (input, tool_context?: ToolContext) => {
      const userId = tool_context?.state?.get<string>('authenticatedUserId');
      if (!userId) {
        return { status: 'error', message: 'Authentication required. Please refresh the page.' };
      }

      try {
        // Validate the connection belongs to this user
        const connection = await storage.getSocialConnectionById(input.connectionId);
        if (!connection || connection.userId !== userId) {
          return { status: 'error', message: 'Social connection not found or unauthorized.' };
        }

        const { schedulePost: createPost } = await import('../../schedulingRepository');

        const scheduledDate = new Date(input.scheduledFor);
        if (isNaN(scheduledDate.getTime())) {
          return { status: 'error', message: 'Invalid date format. Use ISO 8601 (e.g. "2026-03-15T10:00:00Z").' };
        }

        if (scheduledDate.getTime() < Date.now()) {
          return { status: 'error', message: 'Cannot schedule a post in the past.' };
        }

        const post = await createPost({
          userId,
          connectionId: input.connectionId,
          caption: input.caption,
          hashtags: input.hashtags ?? [],
          imageUrl: input.imageUrl ?? undefined,
          scheduledFor: scheduledDate,
          timezone: input.timezone ?? 'UTC',
        });

        return {
          status: 'success',
          uiActions: [{ type: 'post_scheduled', payload: { postId: post.id, scheduledFor: input.scheduledFor } }],
          message: `Post scheduled for ${scheduledDate.toLocaleString()} on ${connection.platform}.`,
          post: {
            id: post.id,
            caption: post.caption,
            scheduledFor: post.scheduledFor,
            status: post.status,
            platform: connection.platform,
          },
        };
      } catch (err: unknown) {
        logger.error({ module: 'AgentTools', err }, 'Failed to schedule post');
        return { status: 'error', message: 'Failed to schedule post. Please try again.' };
      }
    },
  });

  const getCalendar = new FunctionTool({
    name: 'get_calendar',
    description:
      'View scheduled and published posts for a date range to understand what is already planned. Useful before scheduling new posts to avoid conflicts.',
    parameters: z.object({
      startDate: z.string().optional().describe('Start date in ISO 8601 format (default: start of current month)'),
      endDate: z.string().optional().describe('End date in ISO 8601 format (default: end of current month)'),
    }),
    execute: async (input, tool_context?: ToolContext) => {
      const userId = tool_context?.state?.get<string>('authenticatedUserId');
      if (!userId) {
        return { status: 'error', message: 'Authentication required. Please refresh the page.' };
      }

      try {
        const { getScheduledPostsByDateRange } = await import('../../schedulingRepository');

        const now = new Date();
        const start = input.startDate ? new Date(input.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = input.endDate
          ? new Date(input.endDate)
          : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return { status: 'error', message: 'Invalid date format. Use ISO 8601.' };
        }

        const posts = await getScheduledPostsByDateRange(userId, start, end);

        return {
          status: 'success',
          posts: posts.map((p) => ({
            id: p.id,
            caption: p.caption?.slice(0, 120) + (p.caption && p.caption.length > 120 ? '...' : ''),
            scheduledFor: p.scheduledFor,
            status: p.status,
            connectionId: p.connectionId,
            hasImage: Boolean(p.imageUrl),
          })),
          total: posts.length,
          dateRange: { start: start.toISOString(), end: end.toISOString() },
          message: `Found ${posts.length} post(s) between ${start.toLocaleDateString()} and ${end.toLocaleDateString()}.`,
        };
      } catch (err: unknown) {
        logger.error({ module: 'AgentTools', err }, 'Failed to get calendar');
        return { status: 'error', message: 'Failed to load calendar. Please try again.' };
      }
    },
  });

  const getSocialConnections = new FunctionTool({
    name: 'get_social_connections',
    description: 'List all connected social media accounts. Use this to find connection IDs before scheduling posts.',
    parameters: z.object({}),
    execute: async (_input, tool_context?: ToolContext) => {
      const userId = tool_context?.state?.get<string>('authenticatedUserId');
      if (!userId) {
        return { status: 'error', message: 'Authentication required. Please refresh the page.' };
      }

      try {
        const connections = await storage.getSocialConnections(userId);

        return {
          status: 'success',
          connections: connections.map((c) => ({
            id: c.id,
            platform: c.platform,
            accountName: c.accountName,
            status: c.status,
          })),
          total: connections.length,
          message:
            connections.length > 0
              ? `Found ${connections.length} connected account(s).`
              : 'No social accounts connected. The user needs to connect an account in Settings first.',
        };
      } catch (err: unknown) {
        logger.error({ module: 'AgentTools', err }, 'Failed to get social connections');
        return { status: 'error', message: 'Failed to load social connections.' };
      }
    },
  });

  return [schedulePost, getCalendar, getSocialConnections];
}
