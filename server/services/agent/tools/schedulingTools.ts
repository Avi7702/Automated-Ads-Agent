// @ts-nocheck
/**
 * Agent Tools — Scheduling & Calendar
 * Tools for scheduling posts and viewing the content calendar
 */

import { Type } from '@google/genai';
import type { FunctionDeclaration } from '@google/genai';
import type { IStorage } from '../../../storage';
import { logger } from '../../../lib/logger';
import type { ToolExecutor } from './types';

/** Tool declarations for Gemini function calling */
export const declarations: FunctionDeclaration[] = [
  {
    name: 'schedule_post',
    description:
      'Schedule a post for publishing at a specific date and time on a social platform. Requires a valid social connection ID. Use get_calendar first to check for scheduling conflicts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        connectionId: { type: Type.STRING, description: 'The social connection ID (from social accounts)' },
        caption: { type: Type.STRING, description: 'Post caption text' },
        scheduledFor: {
          type: Type.STRING,
          description: 'ISO 8601 date-time string for when to publish (e.g. "2026-03-15T10:00:00Z")',
        },
        timezone: { type: Type.STRING, description: 'Timezone (default: UTC, e.g. "America/New_York")' },
        imageUrl: { type: Type.STRING, description: 'Cloudinary image URL to attach to the post' },
        hashtags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Hashtags to include',
        },
      },
      required: ['connectionId', 'caption', 'scheduledFor'],
    },
  },
  {
    name: 'get_calendar',
    description:
      'View scheduled and published posts for a date range to understand what is already planned. Useful before scheduling new posts to avoid conflicts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        startDate: {
          type: Type.STRING,
          description: 'Start date in ISO 8601 format (default: start of current month)',
        },
        endDate: { type: Type.STRING, description: 'End date in ISO 8601 format (default: end of current month)' },
      },
    },
  },
  {
    name: 'get_social_connections',
    description: 'List all connected social media accounts. Use this to find connection IDs before scheduling posts.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

/** Create executor map (keyed by tool name) */
export function createExecutors(storage: IStorage): Map<string, ToolExecutor> {
  const map = new Map<string, ToolExecutor>();

  map.set('schedule_post', async (args, userId) => {
    if (!userId) {
      return { status: 'error', message: 'Authentication required. Please refresh the page.' };
    }

    try {
      const connectionId = args['connectionId'] as string;
      const caption = args['caption'] as string;
      const scheduledFor = args['scheduledFor'] as string;
      const timezone = (args['timezone'] as string | undefined) ?? 'UTC';
      const imageUrl = args['imageUrl'] as string | undefined;
      const hashtags = (args['hashtags'] as string[] | undefined) ?? [];

      // Validate the connection belongs to this user
      const connection = await storage.getSocialConnectionById(connectionId);
      if (!connection || connection.userId !== userId) {
        return { status: 'error', message: 'Social connection not found or unauthorized.' };
      }

      const { schedulePost: createPost } = await import('../../schedulingRepository');

      const scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        return { status: 'error', message: 'Invalid date format. Use ISO 8601 (e.g. "2026-03-15T10:00:00Z").' };
      }

      if (scheduledDate.getTime() < Date.now()) {
        return { status: 'error', message: 'Cannot schedule a post in the past.' };
      }

      const post = await createPost({
        userId,
        connectionId,
        caption,
        hashtags,
        imageUrl: imageUrl ?? undefined,
        scheduledFor: scheduledDate,
        timezone,
      });

      return {
        status: 'success',
        uiActions: [{ type: 'post_scheduled', payload: { postId: post.id, scheduledFor } }],
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
  });

  map.set('get_calendar', async (args, userId) => {
    if (!userId) {
      return { status: 'error', message: 'Authentication required. Please refresh the page.' };
    }

    try {
      const startDateStr = args['startDate'] as string | undefined;
      const endDateStr = args['endDate'] as string | undefined;

      const { getScheduledPostsByDateRange } = await import('../../schedulingRepository');

      const now = new Date();
      const start = startDateStr ? new Date(startDateStr) : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = endDateStr
        ? new Date(endDateStr)
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
  });

  map.set('get_social_connections', async (_args, userId) => {
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
  });

  return map;
}
