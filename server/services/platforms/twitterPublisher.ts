/**
 * Twitter/X Publisher
 *
 * Publishes tweets via the X API v2.
 * Supports text-only tweets and tweets with images (chunked upload for >5MB).
 *
 * API docs: https://developer.x.com/en/docs/x-api/tweets/manage-tweets/api-reference/post-tweets
 * Media upload: https://developer.x.com/en/docs/x-api/media/upload-media/api-reference
 */

import { logger } from '../../lib/logger';
import type { PublishParams, PublishResult, PublishErrorCode } from './types';

const TWITTER_API_BASE = 'https://api.x.com/2';
const TWITTER_MEDIA_UPLOAD_BASE = 'https://api.x.com/2/media/upload';
const TIMEOUT_MS = 30_000;
const CHUNKED_UPLOAD_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Create a fetch call with a 30-second timeout.
 */
function twitterFetch(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

/**
 * Map HTTP status codes to PublishErrorCode values.
 */
function mapTwitterError(status: number): PublishErrorCode {
  switch (status) {
    case 401:
      return 'token_expired';
    case 403:
      return 'insufficient_permissions';
    case 429:
      return 'rate_limited';
    default:
      if (status >= 500) return 'platform_error';
      return 'unknown';
  }
}

/**
 * Perform a simple (non-chunked) media upload for images <= 5MB.
 * Returns the media_id string.
 */
async function uploadMediaSimple(imageBuffer: ArrayBuffer, accessToken: string): Promise<string> {
  const base64Data = Buffer.from(imageBuffer).toString('base64');

  const formData = new URLSearchParams();
  formData.set('media_data', base64Data);

  const response = await twitterFetch(TWITTER_MEDIA_UPLOAD_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Twitter simple media upload failed: ${response.status} ${body}`);
  }

  const data = JSON.parse(body) as { data?: { id?: string }; media_id_string?: string };
  // v2 API returns data.id; legacy v1.1 returns media_id_string
  const mediaId = data.data?.id ?? data.media_id_string;

  if (!mediaId) {
    throw new Error('Twitter media upload response missing media_id');
  }

  return mediaId;
}

/**
 * Perform a chunked media upload for images > 5MB.
 *
 * Flow: INIT -> APPEND (chunks) -> FINALIZE
 * Returns the media_id string.
 */
async function uploadMediaChunked(imageBuffer: ArrayBuffer, accessToken: string): Promise<string> {
  const CHUNK_SIZE = 1024 * 1024; // 1 MB chunks
  const totalBytes = imageBuffer.byteLength;

  // INIT
  const initParams = new URLSearchParams({
    command: 'INIT',
    total_bytes: String(totalBytes),
    media_type: 'image/jpeg',
  });

  const initResponse = await twitterFetch(TWITTER_MEDIA_UPLOAD_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: initParams.toString(),
  });

  const initBody = await initResponse.text();
  if (!initResponse.ok) {
    throw new Error(`Twitter chunked upload INIT failed: ${initResponse.status} ${initBody}`);
  }

  const initData = JSON.parse(initBody) as { data?: { id?: string }; media_id_string?: string };
  const mediaId = initData.data?.id ?? initData.media_id_string;

  if (!mediaId) {
    throw new Error('Twitter chunked upload INIT response missing media_id');
  }

  // APPEND chunks
  let segmentIndex = 0;
  let offset = 0;

  while (offset < totalBytes) {
    const chunkEnd = Math.min(offset + CHUNK_SIZE, totalBytes);
    const chunk = imageBuffer.slice(offset, chunkEnd);
    const base64Chunk = Buffer.from(chunk).toString('base64');

    const appendParams = new URLSearchParams({
      command: 'APPEND',
      media_id: mediaId,
      segment_index: String(segmentIndex),
      media_data: base64Chunk,
    });

    const appendResponse = await twitterFetch(TWITTER_MEDIA_UPLOAD_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: appendParams.toString(),
    });

    if (!appendResponse.ok) {
      const appendBody = await appendResponse.text();
      throw new Error(
        `Twitter chunked upload APPEND failed at segment ${segmentIndex}: ${appendResponse.status} ${appendBody}`,
      );
    }

    offset = chunkEnd;
    segmentIndex++;
  }

  // FINALIZE
  const finalizeParams = new URLSearchParams({
    command: 'FINALIZE',
    media_id: mediaId,
  });

  const finalizeResponse = await twitterFetch(TWITTER_MEDIA_UPLOAD_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: finalizeParams.toString(),
  });

  const finalizeBody = await finalizeResponse.text();
  if (!finalizeResponse.ok) {
    throw new Error(`Twitter chunked upload FINALIZE failed: ${finalizeResponse.status} ${finalizeBody}`);
  }

  logger.info({ mediaId, totalBytes, segments: segmentIndex }, 'Twitter chunked media upload finalized');

  return mediaId;
}

/**
 * Upload an image to Twitter/X and return the media_id.
 *
 * Uses chunked upload for images > 5MB, simple upload otherwise.
 */
async function uploadImageToTwitter(imageUrl: string, accessToken: string): Promise<string> {
  const startTime = Date.now();

  logger.info({ imageUrl }, 'Fetching image for Twitter upload');

  // Fetch the image bytes
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image from URL: ${imageResponse.status}`);
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const bytes = imageBuffer.byteLength;

  logger.info({ bytes }, 'Image fetched, uploading to Twitter');

  let mediaId: string;

  if (bytes > CHUNKED_UPLOAD_THRESHOLD_BYTES) {
    mediaId = await uploadMediaChunked(imageBuffer, accessToken);
  } else {
    mediaId = await uploadMediaSimple(imageBuffer, accessToken);
  }

  logger.info({ mediaId, bytes, duration: Date.now() - startTime }, 'Twitter image uploaded successfully');

  return mediaId;
}

/**
 * Publish a tweet to Twitter/X.
 *
 * Supports text-only tweets and tweets with media.
 */
export async function publishToTwitter(params: PublishParams): Promise<PublishResult> {
  const startTime = Date.now();
  const { accessToken, caption, imageUrl } = params;

  logger.info(
    {
      platform: 'twitter',
      hasImage: Boolean(imageUrl),
    },
    'Publishing to Twitter/X',
  );

  try {
    // Upload image if provided
    let mediaId: string | undefined;

    if (imageUrl) {
      try {
        mediaId = await uploadImageToTwitter(imageUrl, accessToken);
      } catch (uploadError) {
        logger.error({ err: uploadError }, 'Twitter image upload failed');
        return {
          success: false,
          error: uploadError instanceof Error ? uploadError.message : 'Image upload failed',
          errorCode: 'media_upload_failed',
          isRetryable: true,
        };
      }
    }

    // Build tweet body
    const tweetBody: Record<string, unknown> = {
      text: caption,
    };

    if (mediaId) {
      tweetBody['media'] = {
        media_ids: [mediaId],
      };
    }

    // Create tweet
    const response = await twitterFetch(`${TWITTER_API_BASE}/tweets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetBody),
    });

    const responseBody = await response.text();

    logger.info(
      {
        platform: 'twitter',
        status: response.status,
        duration: Date.now() - startTime,
      },
      'Twitter API response received',
    );

    if (!response.ok) {
      const errorCode = mapTwitterError(response.status);
      logger.error(
        {
          platform: 'twitter',
          status: response.status,
          errorCode,
          body: responseBody,
        },
        'Twitter tweet creation failed',
      );
      return {
        success: false,
        error: `Twitter API error ${response.status}: ${responseBody}`,
        errorCode,
        isRetryable: errorCode === 'rate_limited' || errorCode === 'platform_error',
      };
    }

    // Parse response
    const data = JSON.parse(responseBody) as { data?: { id?: string } };
    const tweetId = data.data?.id;

    logger.info(
      {
        platform: 'twitter',
        tweetId,
        duration: Date.now() - startTime,
      },
      'Published to Twitter/X successfully',
    );

    if (tweetId) {
      return {
        success: true,
        platformPostId: tweetId,
        platformPostUrl: `https://x.com/i/status/${tweetId}`,
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
        platform: 'twitter',
        err: error,
        duration: Date.now() - startTime,
      },
      isAbort ? 'Twitter API request timed out' : 'Twitter publishing threw unexpected error',
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: isAbort ? 'platform_error' : 'unknown',
      isRetryable: true,
    };
  }
}
