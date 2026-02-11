/**
 * n8n Posting Service
 *
 * Handles posting to n8n webhooks for multi-platform social media automation.
 * Manages callbacks, error handling, and post status tracking.
 *
 * Usage:
 *   import { postToN8n, handleN8nCallback } from './services/n8nPostingService';
 *   const result = await postToN8n('instagram', content, imageUrl, userId, scheduledPostId);
 */

import { logger } from '../lib/logger';
import type { FormattedContent } from './contentFormatterService';
import { updatePostAfterCallback, scheduleRetry } from './schedulingRepository';

/**
 * n8n webhook configuration
 */
interface N8nWebhookConfig {
  baseUrl: string;
  webhooks: Record<string, string>;
}

/**
 * Get n8n webhook configuration from environment
 */
function getN8nConfig(): N8nWebhookConfig {
  const baseUrl = process.env.N8N_BASE_URL;

  if (!baseUrl) {
    throw new Error('N8N_BASE_URL not configured. Set this environment variable to use n8n posting.');
  }

  // Webhook paths for each platform
  const webhooks: Record<string, string> = {
    linkedin: `${baseUrl}/webhook/post/linkedin`,
    'linkedin-company': `${baseUrl}/webhook/post/linkedin-company`,
    instagram: `${baseUrl}/webhook/post/instagram`,
    'instagram-story': `${baseUrl}/webhook/post/instagram-story`,
    'instagram-reel': `${baseUrl}/webhook/post/instagram-reel`,
    facebook: `${baseUrl}/webhook/post/facebook`,
    'facebook-page': `${baseUrl}/webhook/post/facebook-page`,
    twitter: `${baseUrl}/webhook/post/twitter`,
    tiktok: `${baseUrl}/webhook/post/tiktok`,
    youtube: `${baseUrl}/webhook/post/youtube`,
    'youtube-shorts': `${baseUrl}/webhook/post/youtube-shorts`,
    pinterest: `${baseUrl}/webhook/post/pinterest`,
  };

  return { baseUrl, webhooks };
}

/**
 * n8n post payload
 */
export interface N8nPostPayload {
  platform: string;
  userId: string;
  content: {
    caption: string;
    hashtags: string[];
    imageUrl?: string;
    videoUrl?: string;
  };
  metadata: {
    scheduledPostId: string;
    generationId?: string;
    templateId?: string;
    scheduledFor?: string; // ISO 8601 timestamp
  };
  formatting?: {
    characterCount: number;
    hashtagCount: number;
    truncated: boolean;
    warnings: string[];
  };
  callbackUrl?: string; // URL for n8n to post results back
}

/**
 * n8n callback data (received from n8n after posting)
 */
export interface N8nCallbackData {
  scheduledPostId: string;
  success: boolean;
  platformPostId?: string; // e.g., Instagram post ID
  platformPostUrl?: string; // e.g., https://instagram.com/p/ABC123
  error?: string;
  errorCode?: string;
  postedAt?: string; // ISO 8601 timestamp
  metadata?: Record<string, any>;
}

/**
 * Result from posting to n8n
 */
export interface N8nPostResult {
  success: boolean;
  workflowExecutionId?: string;
  error?: string;
  webhookUrl: string;
}

/**
 * Post content to n8n webhook
 *
 * @param platform - Platform identifier (e.g., 'instagram', 'linkedin')
 * @param content - Formatted content from contentFormatterService
 * @param imageUrl - Cloudinary image URL (optional)
 * @param userId - User ID for tracking
 * @param scheduledPostId - Scheduled post ID for callback matching
 * @param options - Additional options
 * @returns Post result with workflow execution ID
 */
export async function postToN8n(
  platform: string,
  content: FormattedContent,
  imageUrl: string | undefined,
  userId: string,
  scheduledPostId: string,
  options?: {
    videoUrl?: string;
    generationId?: string;
    templateId?: string;
    scheduledFor?: Date;
    callbackUrl?: string;
  },
): Promise<N8nPostResult> {
  const startTime = Date.now();

  try {
    // Get n8n configuration
    const config = getN8nConfig();
    const webhookUrl = config.webhooks[platform];

    if (!webhookUrl) {
      throw new Error(`No webhook configured for platform '${platform}'`);
    }

    // Build payload
    const payload: N8nPostPayload = {
      platform,
      userId,
      content: {
        caption: content.caption,
        hashtags: content.hashtags,
        imageUrl,
        videoUrl: options?.videoUrl,
      },
      metadata: {
        scheduledPostId,
        generationId: options?.generationId,
        templateId: options?.templateId,
        scheduledFor: options?.scheduledFor?.toISOString(),
      },
      formatting: {
        characterCount: content.characterCount,
        hashtagCount: content.hashtagCount,
        truncated: content.truncated,
        warnings: content.warnings,
      },
      callbackUrl: options?.callbackUrl,
    };

    // Log outgoing request
    logger.info(
      {
        platform,
        userId,
        scheduledPostId,
        webhookUrl,
        hasImage: !!imageUrl,
        hasVideo: !!options?.videoUrl,
      },
      'Posting to n8n webhook',
    );

    // Send POST request to n8n webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Automated-Ads-Agent/1.0',
      },
      body: JSON.stringify(payload),
    });

    // Check response
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        {
          platform,
          webhookUrl,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        },
        'n8n webhook request failed',
      );

      return {
        success: false,
        error: `Webhook returned ${response.status}: ${response.statusText}`,
        webhookUrl,
      };
    }

    // Parse response (n8n returns execution ID)
    const responseData = await response.json();
    const workflowExecutionId = responseData.executionId || responseData.id;

    logger.info(
      {
        platform,
        userId,
        scheduledPostId,
        workflowExecutionId,
        duration: Date.now() - startTime,
      },
      'Successfully posted to n8n',
    );

    return {
      success: true,
      workflowExecutionId,
      webhookUrl,
    };
  } catch (error) {
    logger.error(
      {
        error,
        platform,
        userId,
        scheduledPostId,
        duration: Date.now() - startTime,
      },
      'Failed to post to n8n',
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      webhookUrl: config.webhooks[platform] || 'unknown',
    };
  }
}

/**
 * Handle callback from n8n after post completion
 *
 * This endpoint should be called by n8n workflows after posting completes.
 * Updates the scheduled post record with platform-specific post ID and URL.
 *
 * @param data - Callback data from n8n
 */
/** Errors that should NOT be retried */
const NON_RETRYABLE_ERRORS = new Set([
  'content_policy_violation',
  'account_disconnected',
  'invalid_credentials',
  'insufficient_permissions',
]);

function isRetryableError(errorCode?: string): boolean {
  if (!errorCode) return true; // unknown errors are retryable
  return !NON_RETRYABLE_ERRORS.has(errorCode);
}

export async function handleN8nCallback(data: N8nCallbackData): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info(
      {
        scheduledPostId: data.scheduledPostId,
        success: data.success,
        platformPostId: data.platformPostId,
        platformPostUrl: data.platformPostUrl,
      },
      'Received n8n callback',
    );

    // Update the scheduled post in the database
    try {
      const result = await updatePostAfterCallback(data.scheduledPostId, data.success, {
        platformPostId: data.platformPostId,
        platformPostUrl: data.platformPostUrl,
        errorMessage: data.error,
        failureReason: data.errorCode,
      });

      if (!result || (Array.isArray(result) && result.length === 0)) {
        logger.warn(
          { scheduledPostId: data.scheduledPostId },
          'No scheduled post found with this ID — callback acknowledged but no DB update',
        );
      }

      // If failed and the error is retryable, schedule a retry
      if (!data.success && isRetryableError(data.errorCode) && Array.isArray(result) && result.length > 0) {
        await scheduleRetry(data.scheduledPostId);
        logger.info(
          { scheduledPostId: data.scheduledPostId, errorCode: data.errorCode },
          'Retry scheduled for failed post',
        );
      }
    } catch (dbError) {
      // DB error (e.g. table doesn't exist yet) — log but don't fail the callback
      logger.warn(
        { scheduledPostId: data.scheduledPostId, err: dbError },
        'DB update failed for callback — acknowledging anyway',
      );
    }

    logger.info(
      {
        scheduledPostId: data.scheduledPostId,
        duration: Date.now() - startTime,
      },
      'n8n callback processed successfully',
    );
  } catch (error) {
    logger.error(
      {
        error,
        scheduledPostId: data.scheduledPostId,
      },
      'Failed to process n8n callback',
    );
    throw error;
  }
}

/**
 * Post to multiple platforms
 *
 * @param platforms - Array of platform identifiers
 * @param formattedContent - Map of platform to formatted content
 * @param platformImages - Map of platform to image URLs
 * @param userId - User ID
 * @param baseScheduledPostId - Base ID (will append platform suffix)
 * @param options - Additional options
 * @returns Map of platform to post result
 */
export async function postToMultiplePlatforms(
  platforms: string[],
  formattedContent: Record<string, FormattedContent>,
  platformImages: Record<string, string>,
  userId: string,
  baseScheduledPostId: string,
  options?: {
    videoUrls?: Record<string, string>;
    generationId?: string;
    templateId?: string;
    scheduledFor?: Date;
    callbackUrl?: string;
  },
): Promise<Record<string, N8nPostResult>> {
  const startTime = Date.now();
  const results: Record<string, N8nPostResult> = {};

  try {
    logger.info(
      {
        platforms,
        userId,
        baseScheduledPostId,
        scheduledFor: options?.scheduledFor,
      },
      'Starting multi-platform post',
    );

    // Post to all platforms in parallel
    const postPromises = platforms.map(async (platform) => {
      const content = formattedContent[platform];
      const imageUrl = platformImages[platform];
      const videoUrl = options?.videoUrls?.[platform];

      if (!content) {
        logger.warn({ platform }, 'No formatted content for platform, skipping');
        return {
          platform,
          result: {
            success: false,
            error: 'No formatted content provided',
            webhookUrl: 'N/A',
          },
        };
      }

      const scheduledPostId = `${baseScheduledPostId}_${platform}`;

      const result = await postToN8n(platform, content, imageUrl, userId, scheduledPostId, {
        videoUrl,
        generationId: options?.generationId,
        templateId: options?.templateId,
        scheduledFor: options?.scheduledFor,
        callbackUrl: options?.callbackUrl,
      });

      return { platform, result };
    });

    const postResults = await Promise.all(postPromises);

    // Build result object
    postResults.forEach(({ platform, result }) => {
      results[platform] = result;
    });

    const successCount = Object.values(results).filter((r) => r.success).length;

    logger.info(
      {
        platforms,
        totalPosts: platforms.length,
        successCount,
        failedCount: platforms.length - successCount,
        duration: Date.now() - startTime,
      },
      'Multi-platform post completed',
    );

    return results;
  } catch (error) {
    logger.error(
      {
        error,
        platforms,
        userId,
      },
      'Multi-platform post failed',
    );
    throw error;
  }
}

/**
 * Retry failed post
 *
 * @param platform - Platform identifier
 * @param scheduledPostId - Original scheduled post ID
 * @param retryCount - Current retry attempt
 * @returns Post result
 */
export async function retryFailedPost(
  platform: string,
  scheduledPostId: string,
  retryCount: number,
): Promise<N8nPostResult> {
  const MAX_RETRIES = 3;

  logger.info(
    {
      platform,
      scheduledPostId,
      retryCount,
    },
    'Retrying failed post',
  );

  if (retryCount >= MAX_RETRIES) {
    logger.warn({ scheduledPostId, retryCount }, 'Max retries exceeded');
    return { success: false, error: `Max retries (${MAX_RETRIES}) exceeded`, webhookUrl: 'N/A' };
  }

  // Retry is handled automatically: scheduleRetry() sets the post back to
  // status='scheduled' with a future scheduledFor. The posting job picks it
  // up again when the time arrives. This function exists for manual retries.
  await scheduleRetry(scheduledPostId);

  return { success: true, webhookUrl: 'retry-scheduled' };
}

/**
 * Get post status from n8n
 *
 * Queries n8n API to check workflow execution status.
 *
 * @param workflowExecutionId - n8n workflow execution ID
 * @returns Execution status
 */
export async function getPostStatus(workflowExecutionId: string): Promise<{
  status: 'running' | 'success' | 'error' | 'waiting' | 'unknown';
  error?: string;
  finishedAt?: string;
}> {
  const config = getN8nConfig();
  const apiUrl = `${config.baseUrl}/api/v1/executions/${workflowExecutionId}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        // Note: May require API key authentication
        // 'X-N8N-API-KEY': process.env.N8N_API_KEY,
      },
    });

    if (!response.ok) {
      logger.warn(
        {
          workflowExecutionId,
          status: response.status,
        },
        'Failed to get post status from n8n',
      );

      return { status: 'unknown' };
    }

    const data = await response.json();

    return {
      status: data.finished ? (data.stoppedAt ? 'error' : 'success') : 'running',
      error: data.error,
      finishedAt: data.stoppedAt || data.finishedAt,
    };
  } catch (error) {
    logger.error({ error, workflowExecutionId }, 'Failed to query n8n API');
    return { status: 'unknown' };
  }
}

/**
 * Validate n8n configuration
 *
 * @returns Validation result
 */
export function validateN8nConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check base URL
  if (!process.env.N8N_BASE_URL) {
    errors.push('N8N_BASE_URL environment variable not set');
  } else {
    try {
      const url = new URL(process.env.N8N_BASE_URL);
      if (!url.protocol.startsWith('http')) {
        errors.push('N8N_BASE_URL must be an HTTP(S) URL');
      }
    } catch {
      errors.push('N8N_BASE_URL is not a valid URL');
    }
  }

  // Check API key (optional, but recommended)
  if (!process.env.N8N_API_KEY) {
    warnings.push('N8N_API_KEY not set. Some features may not work (e.g., status checking)');
  }

  const isValid = errors.length === 0;

  return { isValid, errors, warnings };
}

/**
 * Export types
 */
export type { N8nPostPayload, N8nCallbackData, N8nPostResult };
