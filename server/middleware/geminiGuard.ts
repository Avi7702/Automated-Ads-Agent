/**
 * Gemini Availability Guard Middleware
 *
 * Checks if Gemini AI service is currently detected as 'down' before
 * allowing the request to proceed. Returns 503 with Retry-After header
 * when Gemini is unavailable.
 *
 * Usage:
 *   import { requireGeminiAvailable } from '../middleware/geminiGuard';
 *   router.post('/generate', requireGeminiAvailable, asyncHandler(...));
 *
 * Non-AI endpoints (CRUD, auth, products) should NOT use this middleware.
 */

import type { Request, Response, NextFunction } from 'express';
import { isGeminiDown } from '../lib/geminiHealthMonitor';
import { geminiLogger } from '../lib/logger';

const RETRY_AFTER_SECONDS = 30;

/**
 * Middleware that returns 503 if Gemini is detected as down.
 * Fails open: if Redis is unavailable, the request proceeds normally.
 */
export async function requireGeminiAvailable(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const down = await isGeminiDown();
    if (down) {
      geminiLogger.warn({
        path: req.path,
        method: req.method,
        requestId: req.requestId,
      }, 'Request rejected: Gemini AI service is down');

      res.set('Retry-After', String(RETRY_AFTER_SECONDS));
      res.status(503).json({
        error: 'AI service temporarily unavailable',
        retryAfter: RETRY_AFTER_SECONDS,
      });
      return;
    }
  } catch {
    // Fail open: if health check itself errors, let the request through
  }

  next();
}
