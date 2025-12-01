import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response } from 'express';
import { getRedisClient } from '../lib/redis';

// Extend Express Request type to include rateLimit info
declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetTime?: Date;
      };
    }
  }
}

// Determine if we should use Redis or in-memory store
const useRedis = process.env.NODE_ENV === 'production' || process.env.USE_REDIS === 'true';

// Create store based on environment
function createStore(prefix: string) {
  if (useRedis) {
    const client = getRedisClient();
    return new RedisStore({
      // Type assertion needed due to ioredis/rate-limit-redis type mismatch
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendCommand: (async (...args: string[]) => {
        return await client.call(...(args as [string, ...string[]]));
      }) as any,
      prefix: `rate_limit:${prefix}:`,
    });
  }
  return undefined; // Use default in-memory store for development/testing
}

// Skip rate limiting in test environment when not explicitly testing
const shouldSkip = (req: Request): boolean => {
  if (process.env.NODE_ENV !== 'test') return false;
  return req.headers['x-test-rate-limit'] !== 'true';
};

// Standard API rate limiter - 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  store: createStore('api'),
  skip: shouldSkip,
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    const retryAfter = Math.ceil(
      (req.rateLimit?.resetTime?.getTime() ?? Date.now() + 900000 - Date.now()) / 1000
    );
    res.status(429).json({
      error: 'Too many requests',
      retryAfter,
      limit: 100,
      windowMs: 900000,
    });
  },
});

// Expensive operations limiter - 20 requests per hour
export const expensiveLimiter = rateLimit({
  store: createStore('expensive'),
  skip: shouldSkip,
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return userId || req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    const retryAfter = Math.ceil(
      (req.rateLimit?.resetTime?.getTime() ?? Date.now() + 3600000 - Date.now()) / 1000
    );
    res.status(429).json({
      error: 'Generation limit reached',
      retryAfter,
      limit: 20,
      windowMs: 3600000,
    });
  },
});

// Edit operations limiter - 30 requests per hour
export const editLimiter = rateLimit({
  store: createStore('edit'),
  skip: shouldSkip,
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return userId || req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    const retryAfter = Math.ceil(
      (req.rateLimit?.resetTime?.getTime() ?? Date.now() + 3600000 - Date.now()) / 1000
    );
    res.status(429).json({
      error: 'Edit limit reached',
      retryAfter,
      limit: 30,
      windowMs: 3600000,
    });
  },
});

// Login limiter - 10 attempts per minute
export const loginLimiter = rateLimit({
  store: createStore('login'),
  skip: shouldSkip,
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = req.body?.email || '';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `${email}:${ip}`;
  },
  handler: (req: Request, res: Response) => {
    const retryAfter = Math.ceil(
      (req.rateLimit?.resetTime?.getTime() ?? Date.now() + 60000 - Date.now()) / 1000
    );
    res.status(429).json({
      error: 'Too many login attempts',
      retryAfter,
      limit: 10,
      windowMs: 60000,
    });
  },
});
