/**
 * LinkedIn Publisher
 *
 * Publishes posts to LinkedIn via the REST Posts API (v202502).
 * Supports text-only posts and image posts (personal + company pages).
 *
 * API docs: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
 */

import { logger } from '../../lib/logger';
import type { PublishParams, PublishResult, PublishErrorCode } from './types';

const LINKEDIN_API_BASE = 'https://api.linkedin.com/rest';
const LINKEDIN_VERSION = '202502';
const TIMEOUT_MS = 30_000;

/**
 * Create a fetch call with a 30-second timeout and LinkedIn headers.
 */
function linkedinFetch(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

/**
 * Map an HTTP status code (and optional response body) to a PublishErrorCode.
 */
function mapLinkedInError(status: number, body: string): PublishErrorCode {
  switch (status) {
    case 401:
      return 'token_expired';
    case 403:
      return 'insufficient_permissions';
    case 422:
      // Check for policy violation signals
      if (body.includes('policy') || body.includes('Policy') || body.includes('POLICY')) {
        return 'content_policy_violation';
      }
      return 'platform_error';
    case 429:
      return 'rate_limited';
    default:
      if (status >= 500) return 'platform_error';
      return 'unknown';
  }
}

/**
 * Upload an image to LinkedIn and return the image URN.
 *
 * Flow:
 *   1. Initialize upload -> get uploadUrl + image URN
 *   2. Fetch image bytes from Cloudinary URL
 *   3. PUT binary to uploadUrl
 *   4. Return image URN for use in the post body
 */
async function uploadImageToLinkedIn(imageUrl: string, accessToken: string, ownerUrn: string): Promise<string> {
  const startTime = Date.now();

  logger.info({ imageUrl, ownerUrn }, 'Initializing LinkedIn image upload');

  // Step 1: Initialize upload
  const initResponse = await linkedinFetch(`${LINKEDIN_API_BASE}/images?action=initializeUpload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': LINKEDIN_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: ownerUrn,
      },
    }),
  });

  if (!initResponse.ok) {
    const errorBody = await initResponse.text();
    logger.error({ status: initResponse.status, error: errorBody }, 'LinkedIn image upload initialization failed');
    throw new Error(`Image upload init failed: ${initResponse.status} ${errorBody}`);
  }

  const initData = (await initResponse.json()) as {
    value: { uploadUrl: string; image: string };
  };

  const uploadUrl = initData.value.uploadUrl;
  const imageUrn = initData.value.image;

  if (!uploadUrl || !imageUrn) {
    throw new Error('LinkedIn upload init response missing uploadUrl or image URN');
  }

  // Step 2: Fetch image bytes from Cloudinary
  logger.info({ imageUrl }, 'Fetching image bytes from Cloudinary');

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image from URL: ${imageResponse.status}`);
  }

  const imageBuffer = await imageResponse.arrayBuffer();

  // Step 3: PUT binary to LinkedIn's upload URL
  logger.info({ uploadUrl, bytes: imageBuffer.byteLength }, 'Uploading image binary to LinkedIn');

  const putResponse = await linkedinFetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: imageBuffer,
  });

  if (!putResponse.ok) {
    const errorBody = await putResponse.text();
    throw new Error(`Image binary upload failed: ${putResponse.status} ${errorBody}`);
  }

  logger.info({ imageUrn, duration: Date.now() - startTime }, 'LinkedIn image uploaded successfully');

  return imageUrn;
}

/**
 * Publish a post to LinkedIn.
 *
 * Supports:
 * - Text-only posts
 * - Image posts (upload image then create post with image content)
 * - Personal accounts (urn:li:person) and company pages (urn:li:organization)
 */
export async function publishToLinkedIn(params: PublishParams): Promise<PublishResult> {
  const startTime = Date.now();
  const { accessToken, platformUserId, accountType, caption, imageUrl } = params;

  // Determine owner URN based on account type
  const ownerUrn =
    accountType === 'business' ? `urn:li:organization:${platformUserId}` : `urn:li:person:${platformUserId}`;

  logger.info(
    {
      platform: 'linkedin',
      ownerUrn,
      hasImage: Boolean(imageUrl),
    },
    'Publishing to LinkedIn',
  );

  try {
    // Upload image if provided
    let imageUrn: string | undefined;

    if (imageUrl) {
      try {
        imageUrn = await uploadImageToLinkedIn(imageUrl, accessToken, ownerUrn);
      } catch (uploadError) {
        logger.error({ err: uploadError }, 'LinkedIn image upload failed');
        return {
          success: false,
          error: uploadError instanceof Error ? uploadError.message : 'Image upload failed',
          errorCode: 'media_upload_failed',
          isRetryable: true,
        };
      }
    }

    // Build post body
    const postBody: Record<string, unknown> = {
      author: ownerUrn,
      commentary: caption,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
    };

    if (imageUrn) {
      postBody['content'] = {
        media: {
          title: 'Image',
          id: imageUrn,
        },
      };
    }

    // Create post
    const response = await linkedinFetch(`${LINKEDIN_API_BASE}/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': LINKEDIN_VERSION,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    });

    const responseBody = await response.text();

    logger.info(
      {
        platform: 'linkedin',
        status: response.status,
        duration: Date.now() - startTime,
      },
      'LinkedIn API response received',
    );

    if (!response.ok) {
      const errorCode = mapLinkedInError(response.status, responseBody);
      logger.error(
        {
          platform: 'linkedin',
          status: response.status,
          errorCode,
          body: responseBody,
        },
        'LinkedIn post creation failed',
      );
      return {
        success: false,
        error: `LinkedIn API error ${response.status}: ${responseBody}`,
        errorCode,
        isRetryable: errorCode === 'rate_limited' || errorCode === 'platform_error',
      };
    }

    // Extract post ID from Location header (LinkedIn returns it there)
    const locationHeader = response.headers.get('x-restli-id') ?? response.headers.get('location') ?? '';
    // The post ID is typically the last segment of the URN / location path
    const platformPostId = locationHeader.split('/').pop() ?? locationHeader;

    logger.info(
      {
        platform: 'linkedin',
        platformPostId,
        duration: Date.now() - startTime,
      },
      'Published to LinkedIn successfully',
    );

    if (platformPostId) {
      return {
        success: true,
        platformPostId,
        platformPostUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(platformPostId)}`,
        isRetryable: false,
      };
    }

    return {
      success: true,
      isRetryable: false,
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';

    logger.error(
      {
        platform: 'linkedin',
        err: error,
        duration: Date.now() - startTime,
      },
      isAbort ? 'LinkedIn API request timed out' : 'LinkedIn publishing threw unexpected error',
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: isAbort ? 'platform_error' : 'unknown',
      isRetryable: true,
    };
  }
}
