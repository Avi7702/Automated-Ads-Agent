/**
 * Pattern Cleanup Job
 *
 * Runs periodically to clean up expired ad analysis uploads.
 * Follows privacy-first approach:
 * 1. Delete Cloudinary images FIRST
 * 2. Then delete database records
 *
 * TTL: 24 hours (reduced from 7 days for privacy)
 */

import { storage } from '../storage';
import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../lib/logger';

// Run cleanup every hour
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Clean up a single expired upload
 */
async function cleanupUpload(upload: { id: string; cloudinaryPublicId: string }): Promise<boolean> {
  try {
    // Step 1: Delete from Cloudinary first (privacy-first)
    try {
      await cloudinary.uploader.destroy(upload.cloudinaryPublicId);
      logger.debug({ uploadId: upload.id, publicId: upload.cloudinaryPublicId }, 'Deleted image from Cloudinary');
    } catch (cloudinaryError: any) {
      // If image doesn't exist in Cloudinary, continue with DB cleanup
      if (cloudinaryError.http_code !== 404) {
        logger.error({ err: cloudinaryError, uploadId: upload.id }, 'Failed to delete from Cloudinary');
        // Don't delete DB record if Cloudinary fails - retry on next run
        return false;
      }
    }

    // Step 2: Delete database record
    await storage.deleteUpload(upload.id);
    logger.debug({ uploadId: upload.id }, 'Deleted upload record from database');

    return true;
  } catch (error) {
    logger.error({ err: error, uploadId: upload.id }, 'Failed to clean up upload');
    return false;
  }
}

/**
 * Run the cleanup job
 */
export async function runPatternCleanup(): Promise<{ deleted: number; failed: number }> {
  logger.info({ module: 'PatternCleanup' }, 'Starting pattern cleanup job');

  const expiredUploads = await storage.getExpiredUploads();

  if (expiredUploads.length === 0) {
    logger.info({ module: 'PatternCleanup' }, 'No expired uploads to clean up');
    return { deleted: 0, failed: 0 };
  }

  logger.info({ module: 'PatternCleanup', count: expiredUploads.length }, 'Found expired uploads to clean up');

  let deleted = 0;
  let failed = 0;

  for (const upload of expiredUploads) {
    const success = await cleanupUpload({
      id: upload.id,
      cloudinaryPublicId: upload.cloudinaryPublicId,
    });

    if (success) {
      deleted++;
    } else {
      failed++;
    }
  }

  logger.info({ module: 'PatternCleanup', deleted, failed }, 'Pattern cleanup job completed');

  return { deleted, failed };
}

/**
 * Start the cleanup job scheduler
 */
let cleanupInterval: NodeJS.Timeout | null = null;

export function startPatternCleanupScheduler(): void {
  if (cleanupInterval) {
    logger.warn({ module: 'PatternCleanup' }, 'Cleanup scheduler already running');
    return;
  }

  // Run immediately on startup
  runPatternCleanup().catch(err => {
    logger.error({ module: 'PatternCleanup', err }, 'Initial cleanup failed');
  });

  // Schedule periodic cleanup
  cleanupInterval = setInterval(() => {
    runPatternCleanup().catch(err => {
      logger.error({ module: 'PatternCleanup', err }, 'Scheduled cleanup failed');
    });
  }, CLEANUP_INTERVAL_MS);

  logger.info({ module: 'PatternCleanup', intervalMs: CLEANUP_INTERVAL_MS }, 'Pattern cleanup scheduler started');
}

/**
 * Stop the cleanup job scheduler
 */
export function stopPatternCleanupScheduler(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info({ module: 'PatternCleanup' }, 'Pattern cleanup scheduler stopped');
  }
}
