import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../lib/logger';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      log: typeof logger;
    }
  }
}

/**
 * Adds unique request ID for tracing across logs
 * Uses incoming x-request-id header or generates new UUID
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  // Attach child logger with request context for all subsequent logs
  req.log = logger.child({ requestId, path: req.path, method: req.method });

  next();
}
