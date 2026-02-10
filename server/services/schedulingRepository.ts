/**
 * Scheduling Repository — DB queries for the content calendar
 *
 * Handles CRUD operations on the `scheduled_posts` table:
 * - Date-range queries for calendar grid
 * - Post-count aggregation for dot indicators
 * - Schedule / reschedule / cancel mutations
 * - Atomic claim for n8n due-post polling
 */

import { db, pool } from '../db';
import { scheduledPosts } from '@shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { logger } from '../lib/logger';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SchedulePostInput {
  userId: string;
  connectionId: string;
  caption: string;
  hashtags?: string[];
  imageUrl?: string;
  imagePublicId?: string;
  scheduledFor: Date;
  timezone?: string;
  generationId?: string;
  templateId?: string;
}

export interface DayCount {
  date: string; // YYYY-MM-DD
  total: number;
  scheduled: number;
  published: number;
  failed: number;
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

/**
 * Get all scheduled posts for a user within a date range.
 * Used by the calendar grid to render post cards.
 */
export async function getScheduledPostsByDateRange(userId: string, startDate: Date, endDate: Date) {
  return db
    .select()
    .from(scheduledPosts)
    .where(
      and(
        eq(scheduledPosts.userId, userId),
        gte(scheduledPosts.scheduledFor, startDate),
        lte(scheduledPosts.scheduledFor, endDate),
      ),
    )
    .orderBy(scheduledPosts.scheduledFor);
}

/**
 * Get a single scheduled post by ID (with ownership check).
 */
export async function getScheduledPostById(postId: string, userId: string) {
  const rows = await db
    .select()
    .from(scheduledPosts)
    .where(and(eq(scheduledPosts.id, postId), eq(scheduledPosts.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Aggregate post counts per day for a given month.
 * Returns one row per day that has at least one post.
 */
export async function getPostCountsByMonth(userId: string, year: number, month: number): Promise<DayCount[]> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const result = await pool.query(
    `SELECT
       TO_CHAR(scheduled_for, 'YYYY-MM-DD') AS date,
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
       COUNT(*) FILTER (WHERE status = 'published')::int AS published,
       COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
     FROM scheduled_posts
     WHERE user_id = $1
       AND scheduled_for >= $2
       AND scheduled_for <= $3
     GROUP BY TO_CHAR(scheduled_for, 'YYYY-MM-DD')
     ORDER BY date`,
    [userId, startDate.toISOString(), endDate.toISOString()],
  );

  return result.rows as DayCount[];
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

/**
 * Create a new scheduled post (status = 'scheduled').
 */
export async function schedulePost(input: SchedulePostInput) {
  const rows = await db
    .insert(scheduledPosts)
    .values({
      userId: input.userId,
      connectionId: input.connectionId,
      caption: input.caption,
      hashtags: input.hashtags ?? [],
      imageUrl: input.imageUrl ?? null,
      imagePublicId: input.imagePublicId ?? null,
      scheduledFor: input.scheduledFor,
      timezone: input.timezone ?? 'UTC',
      status: 'scheduled',
      generationId: input.generationId ?? null,
      templateId: input.templateId ?? null,
    })
    .returning();

  return rows[0]!;
}

/**
 * Reschedule a post to a new date/time.
 */
export async function reschedulePost(postId: string, userId: string, newDate: Date) {
  const rows = await db
    .update(scheduledPosts)
    .set({
      scheduledFor: newDate,
      updatedAt: new Date(),
    })
    .where(and(eq(scheduledPosts.id, postId), eq(scheduledPosts.userId, userId)))
    .returning();

  return rows[0] ?? null;
}

/**
 * Cancel a scheduled post.
 */
export async function cancelScheduledPost(postId: string, userId: string) {
  const rows = await db
    .update(scheduledPosts)
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
    })
    .where(and(eq(scheduledPosts.id, postId), eq(scheduledPosts.userId, userId)))
    .returning();

  return rows[0] ?? null;
}

/* ------------------------------------------------------------------ */
/*  n8n Integration                                                    */
/* ------------------------------------------------------------------ */

/**
 * Atomically claim due posts for publishing.
 *
 * Uses `FOR UPDATE SKIP LOCKED` to prevent double-claiming
 * when multiple n8n polling instances exist.
 *
 * @returns Array of posts that have been claimed (status → 'publishing')
 */
export async function claimDuePosts(limit: number = 10) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Select posts that are due and lock them
    const { rows: duePosts } = await client.query(
      `SELECT id, user_id, connection_id, caption, hashtags,
              image_url, scheduled_for, timezone,
              generation_id, template_id
       FROM scheduled_posts
       WHERE status = 'scheduled'
         AND scheduled_for <= NOW()
       ORDER BY scheduled_for ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit],
    );

    if (duePosts.length === 0) {
      await client.query('COMMIT');
      return [];
    }

    // Update status to 'publishing'
    const ids = duePosts.map((r: { id: string }) => r.id);
    await client.query(
      `UPDATE scheduled_posts
       SET status = 'publishing', updated_at = NOW()
       WHERE id = ANY($1::text[])`,
      [ids],
    );

    await client.query('COMMIT');

    logger.info({ claimedCount: duePosts.length, ids }, 'Claimed due posts for publishing');
    return duePosts;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error }, 'Failed to claim due posts');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update a post after n8n callback (success or failure).
 */
export async function updatePostAfterCallback(
  postId: string,
  success: boolean,
  data: {
    platformPostId?: string;
    platformPostUrl?: string;
    errorMessage?: string;
    failureReason?: string;
  },
) {
  if (success) {
    return db
      .update(scheduledPosts)
      .set({
        status: 'published',
        publishedAt: new Date(),
        platformPostId: data.platformPostId ?? null,
        platformPostUrl: data.platformPostUrl ?? null,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(scheduledPosts.id, postId))
      .returning();
  }

  // Failure — increment retry count
  return db
    .update(scheduledPosts)
    .set({
      status: 'failed',
      errorMessage: data.errorMessage ?? 'Unknown error',
      failureReason: data.failureReason ?? null,
      retryCount: sql`retry_count + 1`,
      updatedAt: new Date(),
    })
    .where(eq(scheduledPosts.id, postId))
    .returning();
}
