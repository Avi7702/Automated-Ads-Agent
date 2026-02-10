// @ts-nocheck
/**
 * Gemini Video Generation Service
 *
 * Uses Google Veo 3.1 via the @google/genai SDK to generate short-form
 * ad videos from text prompts (and optionally a source image).
 *
 * Key differences from image generation:
 * - Uses genAI.models.generateVideos() (NOT responseModalities)
 * - Returns a long-running operation that must be polled
 * - Videos take 2-10 minutes to generate (vs 15-30s for images)
 * - Result is video bytes (MP4), not inline base64 image data
 */

import { getGlobalGeminiClient } from '../lib/geminiClient';
import { logger } from '../lib/logger';
import { telemetry } from '../instrumentation';

const VIDEO_MODEL = process.env.VEO_MODEL || 'veo-2.0-generate-001';

const POLL_INTERVAL_MS = 10_000; // 10 seconds between polls
const MAX_POLL_ATTEMPTS = 60; // 10 minutes max (60 * 10s)

export interface VideoGenerateOptions {
  duration?: '4' | '6' | '8';
  aspectRatio?: '16:9' | '9:16';
  resolution?: '720p' | '1080p' | '4k';
  /** Base64 source image for image-to-video */
  sourceImageBase64?: string;
  sourceImageMimeType?: string;
}

export interface VideoGenerateResult {
  /** Raw video bytes as base64 */
  videoBase64: string;
  /** MIME type of the video (typically video/mp4) */
  mimeType: string;
  /** Duration in seconds */
  durationSec: number;
  /** Model used */
  model: string;
}

/**
 * Generate a video using Veo via the Gemini API.
 *
 * @param prompt - Text description of the desired video
 * @param options - Video configuration options
 * @param onProgress - Callback for progress updates
 * @param userId - User ID for telemetry
 */
export async function generateVideo(
  prompt: string,
  options: VideoGenerateOptions = {},
  onProgress?: (pct: number, message: string) => void,
  userId?: string,
): Promise<VideoGenerateResult> {
  const startTime = Date.now();
  let success = false;
  let errorType: string | undefined;

  try {
    const client = getGlobalGeminiClient();

    // Build the generate request
    const generateParams: Record<string, unknown> = {
      model: VIDEO_MODEL,
      prompt,
      config: {
        aspectRatio: options.aspectRatio || '16:9',
        durationSeconds: options.duration || '8',
      },
    };

    // Image-to-video: attach source image
    if (options.sourceImageBase64) {
      generateParams.image = {
        imageBytes: options.sourceImageBase64,
        mimeType: options.sourceImageMimeType || 'image/png',
      };
    }

    onProgress?.(5, 'Starting video generation...');
    logger.info({ model: VIDEO_MODEL, prompt: prompt.substring(0, 100) }, 'Starting Veo video generation');

    // Start generation — returns a long-running operation
    let operation = await client.models.generateVideos(generateParams);

    onProgress?.(10, 'Video generation queued, waiting for processing...');

    // Poll until complete
    let pollCount = 0;
    while (!operation.done) {
      if (pollCount >= MAX_POLL_ATTEMPTS) {
        throw new Error('Video generation timed out after 10 minutes');
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      pollCount++;

      // Progress estimation: ramp from 10% → 90% over the polling period
      const progressPct = Math.min(90, 10 + Math.round((pollCount / MAX_POLL_ATTEMPTS) * 80));
      onProgress?.(progressPct, `Generating video... (${pollCount * 10}s elapsed)`);

      operation = await client.operations.getVideosOperation({ operation });
    }

    onProgress?.(90, 'Video generated, downloading result...');

    // Extract video from the result
    if (operation.error) {
      throw new Error(`Video generation failed: ${operation.error.message || JSON.stringify(operation.error)}`);
    }

    const generatedVideos = operation.response?.generatedVideos;
    if (!generatedVideos || generatedVideos.length === 0) {
      throw new Error('No video was generated');
    }

    const videoResult = generatedVideos[0];
    const video = videoResult.video;

    if (!video) {
      throw new Error('Video result is empty');
    }

    // Get video bytes — the SDK provides videoBytes as base64
    let videoBase64: string;
    if (video.videoBytes) {
      videoBase64 =
        typeof video.videoBytes === 'string' ? video.videoBytes : Buffer.from(video.videoBytes).toString('base64');
    } else if (video.uri) {
      // Fallback: download from URI
      const resp = await fetch(video.uri);
      if (!resp.ok) throw new Error(`Failed to download video from ${video.uri}`);
      const buffer = await resp.arrayBuffer();
      videoBase64 = Buffer.from(buffer).toString('base64');
    } else {
      throw new Error('No video data in response (no videoBytes or uri)');
    }

    const mimeType = video.mimeType || 'video/mp4';
    const durationSec = parseInt(options.duration || '8', 10);

    success = true;
    onProgress?.(100, 'Video generation complete');

    logger.info(
      { model: VIDEO_MODEL, durationSec, elapsedMs: Date.now() - startTime },
      'Video generation completed successfully',
    );

    return {
      videoBase64,
      mimeType,
      durationSec,
      model: VIDEO_MODEL,
    };
  } catch (error) {
    errorType = error instanceof Error ? error.name : 'unknown';
    logger.error({ err: error, model: VIDEO_MODEL }, 'Video generation failed');
    throw error;
  } finally {
    const durationMs = Date.now() - startTime;
    telemetry.trackGeminiUsage({
      model: VIDEO_MODEL,
      operation: 'video_generate',
      inputTokens: prompt.length * 0.25,
      outputTokens: 0,
      durationMs,
      userId,
      success,
      errorType,
    });
  }
}

export const geminiVideoService = {
  generateVideo,
};
