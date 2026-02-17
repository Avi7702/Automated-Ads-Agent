/**
 * Posting Job
 *
 * Runs every 60 seconds to claim due scheduled posts and dispatch them
 * to n8n webhooks for publishing. This replaces the n8n-polls-our-API
 * pattern with a simpler push model:
 *
 *   Our app (interval) → claimDuePosts() → postToN8n() → n8n webhook
 *   n8n publishes → POST /api/n8n/callback → updatePostAfterCallback()
 *
 * Only runs if N8N_BASE_URL is configured.
 */

import { logger } from '../lib/logger';
import { claimDuePosts } from '../services/schedulingRepository';
import { postToN8n, validateN8nConfig } from '../services/n8nPostingService';
import { formatContentForPlatform } from '../services/contentFormatterService';
import { storage } from '../storage';

const POSTING_INTERVAL_MS = 60_000; // 1 minute
const MODULE = 'PostingJob';

/**
 * Process a single claimed post: look up its social connection,
 * format the content, and send it to the n8n webhook.
 */
async function processPost(post: Record<string, unknown>): Promise<boolean> {
  const postId = post['id'] as string;
  const connectionId = post['connection_id'] as string;
  const caption = post['caption'] as string;
  const hashtags = (post['hashtags'] as string[]) ?? [];
  const imageUrl = post['image_url'] as string | undefined;
  const userId = post['user_id'] as string;
  const generationId = post['generation_id'] as string | undefined;
  const templateId = post['template_id'] as string | undefined;

  try {
    // Look up the social connection to get the platform
    const connection = await storage.getSocialConnectionById(connectionId);
    if (!connection) {
      logger.warn({ module: MODULE, postId, connectionId }, 'Social connection not found — skipping post');
      return false;
    }

    const platform = connection.platform;

    // Format content for the target platform
    const formatted = await formatContentForPlatform(caption, hashtags, platform);

    // Send to n8n webhook
    const result = await postToN8n(platform, formatted, imageUrl, userId, postId, {
      ...(generationId !== undefined && { generationId }),
      ...(templateId !== undefined && { templateId }),
    });

    if (!result.success) {
      logger.error({ module: MODULE, postId, platform, error: result.error }, 'Failed to dispatch post to n8n');
      return false;
    }

    logger.info(
      { module: MODULE, postId, platform, executionId: result.workflowExecutionId },
      'Post dispatched to n8n',
    );
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
 * Only starts if N8N_BASE_URL is configured.
 */
let postingInterval: NodeJS.Timeout | null = null;

export function startPostingJobScheduler(): void {
  if (postingInterval) {
    logger.warn({ module: MODULE }, 'Posting job scheduler already running');
    return;
  }

  // Only start if n8n is configured
  const config = validateN8nConfig();
  if (!config.isValid) {
    logger.info({ module: MODULE, errors: config.errors }, 'n8n not configured — posting job disabled');
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
