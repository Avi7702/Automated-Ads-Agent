import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { checkRedisRateLimit } from './redisRateLimit';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitStore {
  [key: string]: RateLimitEntry;
}

interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  useRedis?: boolean;
}

const rateLimitLogger = logger.child({ module: 'rateLimit' });

const stores: { [name: string]: RateLimitStore } = {};

// Cleanup interval - runs every 5 minutes to remove expired entries
const CLEANUP_INTERVAL = 5 * 60 * 1000;

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const storeName of Object.keys(stores)) {
    const store = stores[storeName];
    if (store) {
      for (const key of Object.keys(store)) {
        const entry = store[key];
        if (entry && entry.resetTime < now) {
          delete store[key];
        }
      }
    }
  }
}

// Start cleanup interval
setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL);

/**
 * Determine whether Redis should be used for rate limiting.
 * - Explicit `useRedis: true/false` takes precedence
 * - Otherwise, auto-detect based on REDIS_URL environment variable
 */
function shouldUseRedis(useRedis: boolean | undefined): boolean {
  if (useRedis !== undefined) {
    return useRedis;
  }
  return Boolean(process.env['REDIS_URL']);
}

/**
 * In-memory rate limit check (original logic, used as fallback).
 */
function checkInMemoryRateLimit(
  store: RateLimitStore,
  key: string,
  windowMs: number,
  maxRequests: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const existing = store[key];

  if (!existing || existing.resetTime < now) {
    store[key] = { count: 1, resetTime: now + windowMs };
  } else {
    existing.count++;
  }

  const entry = store[key];
  if (entry && entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true, retryAfter: 0 };
}

/**
 * Build a human-readable store name from window/max values.
 * Used both as the in-memory store key and Redis key prefix.
 */
function buildStoreName(windowMs: number, maxRequests: number): string {
  if (windowMs === 15 * 60 * 1000 && maxRequests === 100) return 'api';
  if (windowMs === 60 * 60 * 1000 && maxRequests === 20) return 'expensive';
  if (windowMs === 60 * 60 * 1000 && maxRequests === 30) return 'edit';
  if (windowMs === 60 * 1000 && maxRequests === 10) return 'login';
  return `limiter_${windowMs}_${maxRequests}`;
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const maxRequests = options.maxRequests ?? 100;
  const storeName = buildStoreName(windowMs, maxRequests);
  const redisEnabled = shouldUseRedis(options.useRedis);

  // Always initialise in-memory store (used as fallback even when Redis is primary)
  if (!stores[storeName]) {
    stores[storeName] = {};
  }

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting in test environment only
    // BUG-022b fix: Only allow x-e2e-test header bypass in non-production environments
    if (
      process.env['NODE_ENV'] === 'test' ||
      (process.env['NODE_ENV'] !== 'production' && req.headers['x-e2e-test'] === 'true')
    ) {
      return next();
    }

    // Use user ID for authenticated requests (per-user limiting), fall back to IP
    const userId = (req.session as any)?.userId;
    const key = userId ? `user:${userId}` : (req.ip ?? req.socket.remoteAddress ?? 'unknown');

    if (redisEnabled) {
      // Attempt Redis-backed rate limiting
      checkRedisRateLimit(storeName, key, windowMs, maxRequests)
        .then((result) => {
          if (result === null) {
            // Redis unavailable — fall back to in-memory
            rateLimitLogger.warn({ storeName, key }, 'Redis rate limit unavailable, using in-memory fallback');
            const memResult = checkInMemoryRateLimit(stores[storeName] as RateLimitStore, key, windowMs, maxRequests);
            if (!memResult.allowed) {
              return res.status(429).json({
                error: 'Too many requests',
                retryAfter: memResult.retryAfter,
                limit: maxRequests,
                windowMs,
              });
            }
            return next();
          }

          if (!result.allowed) {
            const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
            return res.status(429).json({
              error: 'Too many requests',
              retryAfter: Math.max(retryAfter, 1),
              limit: maxRequests,
              windowMs,
            });
          }

          return next();
        })
        .catch((err: unknown) => {
          // Unexpected error — fall back to in-memory rather than crashing
          rateLimitLogger.error(
            { storeName, key, err },
            'Unexpected error in Redis rate limit, using in-memory fallback',
          );
          const memResult = checkInMemoryRateLimit(stores[storeName] as RateLimitStore, key, windowMs, maxRequests);
          if (!memResult.allowed) {
            return res.status(429).json({
              error: 'Too many requests',
              retryAfter: memResult.retryAfter,
              limit: maxRequests,
              windowMs,
            });
          }
          return next();
        });
    } else {
      // Pure in-memory rate limiting (original behaviour)
      const store = stores[storeName] as RateLimitStore;
      const memResult = checkInMemoryRateLimit(store, key, windowMs, maxRequests);
      if (!memResult.allowed) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: memResult.retryAfter,
          limit: maxRequests,
          windowMs,
        });
      }
      return next();
    }
  };
}

export const apiLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 100 });
export const expensiveLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 20 });
export const editLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 30 });
export const loginLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 10 });
