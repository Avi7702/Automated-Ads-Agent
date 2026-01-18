import type { Request, Response, NextFunction } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import { storage } from '../storage';
import { logger } from '../lib/logger';

/**
 * Upload Infrastructure for Learn from Winners
 *
 * Provides:
 * 1. File type validation via magic bytes (not just MIME type)
 * 2. User-based rate limiting for pattern uploads (10/hour)
 * 3. User quota check (max 100 patterns)
 */

// Allowed image MIME types for ad pattern uploads
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

// Max file size for pattern uploads (5MB)
const MAX_PATTERN_FILE_SIZE = 5 * 1024 * 1024;

// User-based rate limit store for pattern uploads
interface UserUploadEntry {
  count: number;
  resetTime: number;
}

const userUploadStore: Map<string, UserUploadEntry> = new Map();

// Cleanup interval - runs every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_UPLOADS_PER_HOUR = 10;
const MAX_PATTERNS_PER_USER = 100;

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of userUploadStore.entries()) {
    if (entry.resetTime < now) {
      userUploadStore.delete(key);
    }
  }
}

// Start cleanup interval
setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL);

/**
 * Validates file type using magic bytes (not just MIME type from header)
 * This prevents attackers from uploading executables renamed to .jpg
 */
export async function validateFileType(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Check file size
  if (file.size > MAX_PATTERN_FILE_SIZE) {
    return res.status(400).json({
      error: 'File too large',
      maxSize: '5MB',
      actualSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`
    });
  }

  try {
    // Validate using magic bytes
    const fileInfo = await fileTypeFromBuffer(file.buffer);

    if (!fileInfo) {
      return res.status(400).json({
        error: 'Could not determine file type',
        message: 'The uploaded file does not appear to be a valid image'
      });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(fileInfo.mime)) {
      return res.status(400).json({
        error: 'Invalid file type',
        allowed: ALLOWED_EXTENSIONS,
        detected: fileInfo.ext
      });
    }

    // Attach validated file info to request
    (req as any).validatedFileType = fileInfo;
    next();
  } catch (error) {
    logger.error('File type validation error', { error });
    return res.status(500).json({ error: 'Failed to validate file type' });
  }
}

/**
 * User-based rate limiter for pattern uploads
 * Limits to 10 uploads per hour per user
 */
export function uploadPatternLimiter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as any).user;

  if (!user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = user.id;
  const now = Date.now();

  let entry = userUploadStore.get(userId);

  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired one
    entry = { count: 1, resetTime: now + UPLOAD_WINDOW_MS };
    userUploadStore.set(userId, entry);
  } else {
    entry.count++;
  }

  if (entry.count > MAX_UPLOADS_PER_HOUR) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return res.status(429).json({
      error: 'Upload rate limit exceeded',
      message: `Maximum ${MAX_UPLOADS_PER_HOUR} uploads per hour`,
      retryAfter,
      retryAfterMinutes: Math.ceil(retryAfter / 60),
    });
  }

  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', MAX_UPLOADS_PER_HOUR.toString());
  res.setHeader('X-RateLimit-Remaining', (MAX_UPLOADS_PER_HOUR - entry.count).toString());
  res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());

  next();
}

/**
 * Check user's pattern quota
 * Limits to 100 patterns per user
 */
export async function checkPatternQuota(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as any).user;

  if (!user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Get user's current pattern count
    const patterns = await storage.getLearnedPatterns(user.id, { isActive: true });
    const currentCount = patterns.length;

    if (currentCount >= MAX_PATTERNS_PER_USER) {
      return res.status(403).json({
        error: 'Pattern quota exceeded',
        message: `Maximum ${MAX_PATTERNS_PER_USER} patterns allowed per user`,
        currentCount,
        maxAllowed: MAX_PATTERNS_PER_USER,
        suggestion: 'Delete unused patterns to make room for new ones'
      });
    }

    // Attach quota info to request
    (req as any).patternQuota = {
      current: currentCount,
      max: MAX_PATTERNS_PER_USER,
      remaining: MAX_PATTERNS_PER_USER - currentCount
    };

    next();
  } catch (error) {
    logger.error('Pattern quota check error', { error });
    return res.status(500).json({ error: 'Failed to check pattern quota' });
  }
}

/**
 * Combined middleware that runs all upload validations
 * Use this for the pattern upload endpoint
 */
export const patternUploadValidation = [
  uploadPatternLimiter,
  checkPatternQuota,
  validateFileType,
];

// Export constants for testing
export const UPLOAD_LIMITS = {
  MAX_UPLOADS_PER_HOUR,
  MAX_PATTERNS_PER_USER,
  MAX_PATTERN_FILE_SIZE,
  UPLOAD_WINDOW_MS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_EXTENSIONS,
};
