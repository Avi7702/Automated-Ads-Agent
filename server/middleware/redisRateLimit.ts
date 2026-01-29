import type Redis from 'ioredis';
import { getRedisClient } from '../lib/redis';
import { logger } from '../lib/logger';

interface RedisRateLimitResult {
  count: number;
  resetTime: number;
  allowed: boolean;
}

const rateLimitLogger = logger.child({ module: 'redisRateLimit' });

/**
 * Check and increment a rate limit counter in Redis using INCR + EXPIRE.
 *
 * Key format: `ratelimit:{storeName}:{key}`
 *
 * Uses a fixed-window counter approach:
 * - INCR atomically increments the counter
 * - EXPIRE sets TTL only on first request (count === 1)
 * - TTL provides the reset time
 *
 * @returns The current count, reset time, and whether the request is allowed.
 *          Returns null if Redis is unavailable.
 */
export async function checkRedisRateLimit(
  storeName: string,
  key: string,
  windowMs: number,
  maxRequests: number,
): Promise<RedisRateLimitResult | null> {
  let redis: Redis;
  try {
    redis = getRedisClient();
  } catch {
    rateLimitLogger.warn(
      { storeName, key },
      'Redis client unavailable for rate limiting',
    );
    return null;
  }

  const redisKey = `ratelimit:${storeName}:${key}`;
  const windowSeconds = Math.ceil(windowMs / 1000);

  try {
    // Atomic increment
    const count = await redis.incr(redisKey);

    // Set expiry only on first request in the window
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    // Get TTL to calculate reset time
    const ttl = await redis.ttl(redisKey);
    // ttl can be -1 (no expiry) or -2 (key doesn't exist).
    // If no expiry is set (edge case), set it now.
    if (ttl < 0) {
      await redis.expire(redisKey, windowSeconds);
    }

    const effectiveTtl = ttl > 0 ? ttl : windowSeconds;
    const resetTime = Date.now() + effectiveTtl * 1000;

    return {
      count,
      resetTime,
      allowed: count <= maxRequests,
    };
  } catch (err: unknown) {
    rateLimitLogger.warn(
      { storeName, key, err },
      'Redis rate limit check failed, falling back to in-memory',
    );
    return null;
  }
}

/**
 * Test whether the Redis client is connected and responsive.
 * Returns true if Redis is reachable, false otherwise.
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
