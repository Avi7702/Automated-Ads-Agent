import type { Request, Response, NextFunction } from "express";
import { getRedisClient } from "../lib/redis";

interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
  useRedis?: boolean;
}

const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(config: RateLimitConfig = {}) {
  const windowMs = config.windowMs || 15 * 60 * 1000; // 15 minutes
  const maxRequests = config.maxRequests || 100;
  const useRedis = config.useRedis || false;

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `ratelimit:${ip}`;

    try {
      if (useRedis) {
        const redis = getRedisClient();
        if (redis) {
          const current = await redis.incr(key);
          if (current === 1) {
            await redis.pexpire(key, windowMs);
          }

          if (current > maxRequests) {
            const ttl = await redis.pttl(key);
            res.set("Retry-After", String(Math.ceil(ttl / 1000)));
            return res.status(429).json({
              error: "Too many requests",
              retryAfter: Math.ceil(ttl / 1000),
            });
          }

          res.set("X-RateLimit-Limit", String(maxRequests));
          res.set("X-RateLimit-Remaining", String(maxRequests - current));
          return next();
        }
      }

      // In-memory fallback
      const now = Date.now();
      const record = inMemoryStore.get(key);

      if (!record || now > record.resetTime) {
        inMemoryStore.set(key, { count: 1, resetTime: now + windowMs });
        res.set("X-RateLimit-Limit", String(maxRequests));
        res.set("X-RateLimit-Remaining", String(maxRequests - 1));
        return next();
      }

      record.count++;

      if (record.count > maxRequests) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        res.set("Retry-After", String(retryAfter));
        return res.status(429).json({
          error: "Too many requests",
          retryAfter,
        });
      }

      res.set("X-RateLimit-Limit", String(maxRequests));
      res.set("X-RateLimit-Remaining", String(maxRequests - record.count));
      next();
    } catch (error) {
      console.error("[RateLimit] Error:", error);
      next();
    }
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  const keys = Array.from(inMemoryStore.keys());
  for (const key of keys) {
    const record = inMemoryStore.get(key);
    if (record && now > record.resetTime) {
      inMemoryStore.delete(key);
    }
  }
}, 60000);
