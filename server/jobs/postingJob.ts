/**
 * Posting Job
 *
 * Runs every 60 seconds to claim due scheduled posts and publish them
 * directly via publishingService (direct platform API calls).
 *
 *   Our app (interval) → claimDuePosts() → publishPost() → platform API
 *
 * Runs unconditionally — no external dependency (n8n) required.
 */

import { logger } from '../lib/logger';
import { claimDuePosts } from '../services/schedulingRepository';
import { publishPost } from '../services/publishingService';
import type { PostRecord } from '../services/publishingService';

const POSTING_INTERVAL_MS = 60_000; // 1 minute
const MODULE = 'PostingJob';

/**
 * Process a single claimed post: publish it directly to the social platform.
 * publishingService handles token decryption, API call, DB update, and retry scheduling.
 */
async function processPost(post: Record<string, unknown>): Promise<boolean> {
  const postId = post['id'] as string;

  try {
    const record: PostRecord = {
      id: postId,
      connection_id: post['connection_id'] as string,
      caption: post['caption'] as string,
      hashtags: (post['hashtags'] as string[] | null | undefined) ?? null,
      image_url: (post['image_url'] as string | null | undefined) ?? null,
      user_id: post['user_id'] as string,
      platform_post_id: (post['platform_post_id'] as string | null | undefined) ?? null,
    };

    const result = await publishPost(record);

    if (!result.success) {
      logger.error(
        { module: MODULE, postId, errorCode: result.errorCode, error: result.error },
        'Failed to publish post',
      );
      return false;
    }

    logger.info({ module: MODULE, postId, platformPostId: result.platformPostId }, 'Post published successfully');
    return true;
  } catch (error) {
    logger.error({ module: MODULE, postId, err: error }, 'Error processing post');
    return false;
  }
}

/**
 * Run one cycle of the posting job.
 */
export async function runPostingJob(): Promise<{ dispatched: number; failed: number }> {
  let dispatched = 0;
  let failed = 0;

  try {
    const posts = await claimDuePosts(10);

    if (posts.length === 0) return { dispatched: 0, failed: 0 };

    logger.info({ module: MODULE, count: posts.length }, 'Claimed due posts for dispatch');

    for (const post of posts) {
      const success = await processPost(post);
      if (success) {
        dispatched++;
      } else {
        failed++;
      }
    }

    logger.info({ module: MODULE, dispatched, failed }, 'Posting job cycle complete');
  } catch (error) {
    logger.error({ module: MODULE, err: error }, 'Posting job cycle failed');
  }

  return { dispatched, failed };
}

/**
 * Start the posting job scheduler.
 * Starts unconditionally — no external n8n dependency required.
 */
let postingInterval: NodeJS.Timeout | null = null;

export function startPostingJobScheduler(): void {
  if (postingInterval) {
    logger.warn({ module: MODULE }, 'Posting job scheduler already running');
    return;
  }

  // Schedule periodic runs
  postingInterval = setInterval(() => {
    runPostingJob().catch((err) => {
      logger.error({ module: MODULE, err }, 'Scheduled posting job failed');
    });
  }, POSTING_INTERVAL_MS);

  logger.info({ module: MODULE, intervalMs: POSTING_INTERVAL_MS }, 'Posting job scheduler started');
}

/**
 * Stop the posting job scheduler.
 */
export function stopPostingJobScheduler(): void {
  if (postingInterval) {
    clearInterval(postingInterval);
    postingInterval = null;
    logger.info({ module: MODULE }, 'Posting job scheduler stopped');
  }
}
