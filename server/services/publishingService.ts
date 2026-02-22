/**
 * Publishing Service
 *
 * Main dispatcher that routes posts to the correct platform publisher.
 * Replaces n8nPostingService as the entry point for the posting job.
 *
 * Responsibilities:
 * - Look up social connections and validate they are active
 * - Decrypt access tokens
 * - Idempotency check (skip if post already has a platformPostId)
 * - Route to linkedinPublisher or twitterPublisher
 * - Update DB via schedulingRepository after success/failure
 * - Update social connection metadata (lastUsedAt, token expiry)
 */

import { logger } from '../lib/logger';
import { decryptApiKey } from './encryptionService';
import { getSocialConnectionById, updateSocialConnection } from '../repositories/socialRepository';
import { updatePostAfterCallback, scheduleRetry } from './schedulingRepository';
import { publishToLinkedIn } from './platforms/linkedinPublisher';
import { publishToTwitter } from './platforms/twitterPublisher';
import type { PublishResult } from './platforms/types';

/* ------------------------------------------------------------------ */
/*  Error classification                                               */
/* ------------------------------------------------------------------ */

/** Errors that should NOT trigger a retry */
const NON_RETRYABLE_ERRORS = new Set([
  'content_policy_violation',
  'account_disconnected',
  'invalid_credentials',
  'insufficient_permissions',
]);

export function isRetryableError(errorCode?: string): boolean {
  if (!errorCode) return true; // unknown errors are retryable
  return !NON_RETRYABLE_ERRORS.has(errorCode);
}

/* ------------------------------------------------------------------ */
/*  Post shape (from claimDuePosts raw SQL rows)                       */
/* ------------------------------------------------------------------ */

export interface PostRecord {
  id: string;
  connection_id: string;
  caption: string;
  hashtags?: string[] | null;
  image_url?: string | null;
  user_id: string;
  platform_post_id?: string | null; // populated on already-published posts
}

/* ------------------------------------------------------------------ */
/*  Main publisher                                                      */
/* ------------------------------------------------------------------ */

/**
 * Publish a single scheduled post to the appropriate platform.
 *
 * Called by postingJob.ts for each claimed post.
 * Returns the PublishResult so the caller can log it.
 */
export async function publishPost(post: PostRecord): Promise<PublishResult> {
  const startTime = Date.now();
  const postId = post.id;
  const connectionId = post.connection_id;

  logger.info({ postId, connectionId }, 'publishPost: starting');

  // 1. Look up social connection
  const connection = await getSocialConnectionById(connectionId);

  if (!connection) {
    logger.warn({ postId, connectionId }, 'publishPost: social connection not found');
    await updatePostAfterCallback(postId, false, {
      errorMessage: `Social connection ${connectionId} not found`,
      failureReason: 'account_disconnected',
    });
    return {
      success: false,
      error: 'Social connection not found',
      errorCode: 'account_disconnected',
      isRetryable: false,
    };
  }

  // 2. Check connection is active
  if (!connection.isActive) {
    logger.warn({ postId, connectionId, platform: connection.platform }, 'publishPost: connection is inactive');
    await updatePostAfterCallback(postId, false, {
      errorMessage: 'Social account is disconnected or inactive',
      failureReason: 'account_disconnected',
    });
    return {
      success: false,
      error: 'Social account is disconnected',
      errorCode: 'account_disconnected',
      isRetryable: false,
    };
  }

  // 3. Idempotency check — skip if already published
  if (post.platform_post_id) {
    logger.info({ postId, platformPostId: post.platform_post_id }, 'publishPost: already published, skipping');
    return {
      success: true,
      platformPostId: post.platform_post_id,
      isRetryable: false,
    };
  }

  // 4. Decrypt access token
  let accessToken: string;
  try {
    accessToken = decryptApiKey({
      ciphertext: connection.accessToken,
      iv: connection.tokenIv,
      authTag: connection.tokenAuthTag,
    });
  } catch (decryptError) {
    logger.error({ postId, connectionId, err: decryptError }, 'publishPost: failed to decrypt access token');
    await updatePostAfterCallback(postId, false, {
      errorMessage: 'Failed to decrypt access token',
      failureReason: 'invalid_credentials',
    });
    return {
      success: false,
      error: 'Failed to decrypt access token',
      errorCode: 'invalid_credentials',
      isRetryable: false,
    };
  }

  // 5. Route to correct publisher
  const platform = connection.platform;
  const publishParams = {
    accessToken,
    platformUserId: connection.platformUserId ?? '',
    accountType: connection.accountType ?? 'personal',
    caption: post.caption,
    ...(post.image_url ? { imageUrl: post.image_url } : {}),
    hashtags: post.hashtags ?? [],
  };

  let result: PublishResult;

  switch (platform) {
    case 'linkedin':
      result = await publishToLinkedIn(publishParams);
      break;
    case 'twitter':
      result = await publishToTwitter(publishParams);
      break;
    default:
      logger.error({ postId, platform }, 'publishPost: unsupported platform');
      result = {
        success: false,
        error: `Unsupported platform: ${platform}`,
        errorCode: 'unknown',
        isRetryable: false,
      };
  }

  logger.info(
    {
      postId,
      platform,
      success: result.success,
      platformPostId: result.platformPostId,
      errorCode: result.errorCode,
      duration: Date.now() - startTime,
    },
    'publishPost: platform publish completed',
  );

  // 6. Update DB after result
  if (result.success) {
    await updatePostAfterCallback(postId, true, {
      ...(result.platformPostId !== undefined ? { platformPostId: result.platformPostId } : {}),
      ...(result.platformPostUrl !== undefined ? { platformPostUrl: result.platformPostUrl } : {}),
    });

    // Update social connection: mark last used
    await updateSocialConnection(connectionId, {
      lastUsedAt: new Date(),
    });
  } else {
    await updatePostAfterCallback(postId, false, {
      errorMessage: result.error ?? 'Publishing failed',
      ...(result.errorCode !== undefined ? { failureReason: result.errorCode } : {}),
    });

    // On token expiry: deactivate the connection
    if (result.errorCode === 'token_expired') {
      await updateSocialConnection(connectionId, {
        isActive: false,
        lastErrorAt: new Date(),
        lastErrorMessage: result.error ?? 'Token expired',
      });
      logger.warn({ connectionId, platform }, 'publishPost: connection deactivated due to expired token');
    } else {
      // Log the error on the connection even for non-expiry failures
      await updateSocialConnection(connectionId, {
        lastErrorAt: new Date(),
        lastErrorMessage: result.error ?? 'Publish failed',
      });
    }

    // Schedule retry if appropriate
    if (result.isRetryable && isRetryableError(result.errorCode)) {
      const scheduled = await scheduleRetry(postId);
      if (scheduled) {
        logger.info({ postId, errorCode: result.errorCode }, 'publishPost: retry scheduled');
      }
    }
  }

  return result;
}
