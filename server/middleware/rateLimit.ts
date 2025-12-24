import type { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  useRedis?: boolean;
}

const stores: { [name: string]: RateLimitStore } = {};

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const maxRequests = options.maxRequests || 100;
  const storeName = `limiter_${windowMs}_${maxRequests}`;
  
  if (!stores[storeName]) {
    stores[storeName] = {};
  }
  const store = stores[storeName];

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = { count: 1, resetTime: now + windowMs };
    } else {
      store[key].count++;
    }

    if (store[key].count > maxRequests) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter,
        limit: maxRequests,
        windowMs,
      });
    }

    next();
  };
}

export const apiLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 100 });
export const expensiveLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 20 });
export const editLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 30 });
export const loginLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 10 });
