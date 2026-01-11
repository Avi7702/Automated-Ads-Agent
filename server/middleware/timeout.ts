import timeout from 'connect-timeout';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/**
 * Request timeout middleware
 * Default: 30 seconds for most routes
 * Extended: 120 seconds for image generation
 */
export const defaultTimeout = timeout('30s', { respond: false });
export const extendedTimeout = timeout('120s', { respond: false });

/**
 * Halt middleware - stops processing if request timed out
 */
export function haltOnTimeout(req: Request, res: Response, next: NextFunction): void {
  if (!req.timedout) {
    next();
  } else {
    logger.warn({
      path: req.path,
      method: req.method,
      requestId: req.requestId
    }, 'Request timed out');

    if (!res.headersSent) {
      res.status(503).json({
        error: 'Request timeout',
        message: 'The request took too long to process'
      });
    }
  }
}
