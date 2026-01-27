/**
 * Redis Cache Service
 *
 * A typed Redis wrapper for caching with automatic serialization,
 * TTL management, and graceful error handling.
 *
 * Cache Key Patterns:
 * - vision:{productId}:{imageHash} - Vision analysis (7-day TTL)
 * - ideas:{userId}:{productIds}:{timeBucket} - Idea suggestions (1-hour TTL)
 * - kb:{productId}:v1 - Product knowledge (24-hour TTL)
 *
 * @example
 * ```typescript
 * const cache = createCacheService();
 *
 * // Simple get/set
 * await cache.set('key', { data: 'value' }, 3600);
 * const value = await cache.get<MyType>('key');
 *
 * // Wrap expensive operations
 * const result = await cache.wrap('key', 3600, async () => {
 *   return await expensiveComputation();
 * });
 *
 * // Invalidate by pattern
 * await cache.invalidate('vision:product123:*');
 * ```
 */

import Redis from 'ioredis';
import { logger } from './logger';

/**
 * Cache TTL constants in seconds
 */
export const CACHE_TTL = {
  /** Vision analysis cache - 7 days */
  VISION_ANALYSIS: 7 * 24 * 60 * 60, // 604800 seconds
  /** Idea suggestions cache - 1 hour */
  IDEA_SUGGESTIONS: 60 * 60, // 3600 seconds
  /** Product knowledge cache - 24 hours */
  PRODUCT_KNOWLEDGE: 24 * 60 * 60, // 86400 seconds
} as const;

/**
 * Time bucket granularity for idea suggestions (5 minutes)
 */
const TIME_BUCKET_GRANULARITY_MS = 5 * 60 * 1000;

export class CacheService {
  private redis: Redis;
  private closed: boolean = false;

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

    this.redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error(
            { module: 'CacheService', retries: times },
            'Redis connection failed after 3 retries'
          );
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    this.redis.on('error', (err) => {
      logger.error({ module: 'CacheService', err }, 'Redis error occurred');
    });

    this.redis.on('connect', () => {
      logger.info({ module: 'CacheService' }, 'Redis connected');
    });
  }

  /**
   * Get a value from the cache
   *
   * @param key - The cache key
   * @returns The cached value or null if not found/error
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);

      if (value === null || value === undefined) {
        return null;
      }

      try {
        return JSON.parse(value) as T;
      } catch (parseError) {
        logger.warn(
          { module: 'CacheService', key, parseError },
          'Failed to parse cached value as JSON'
        );
        return null;
      }
    } catch (error) {
      logger.error(
        { module: 'CacheService', key, error },
        'Failed to get value from cache'
      );
      return null;
    }
  }

  /**
   * Set a value in the cache with TTL
   *
   * @param key - The cache key
   * @param value - The value to cache (will be JSON serialized)
   * @param ttlSeconds - Time to live in seconds
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.redis.set(key, serialized, 'EX', ttlSeconds);
    logger.debug(
      { module: 'CacheService', key, ttlSeconds },
      'Value cached'
    );
  }

  /**
   * Invalidate cache keys matching a pattern
   *
   * @param pattern - Redis glob pattern (e.g., 'vision:product123:*')
   * @returns Number of keys deleted
   */
  async invalidate(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.redis.del(...keys);
      logger.info(
        { module: 'CacheService', pattern, keysDeleted: deleted },
        'Cache keys invalidated'
      );
      return deleted;
    } catch (error) {
      logger.error(
        { module: 'CacheService', pattern, error },
        'Failed to invalidate cache keys'
      );
      return 0;
    }
  }

  /**
   * Wrap an async function with caching
   *
   * On cache hit, returns cached value without executing the function.
   * On cache miss, executes the function, caches the result, and returns it.
   * Errors from the function are NOT cached and are propagated.
   *
   * @param key - The cache key
   * @param ttlSeconds - Time to live in seconds
   * @param fn - The async function to execute on cache miss
   * @returns The cached or computed value
   */
  async wrap<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>
  ): Promise<T> {
    // Try to get from cache
    let cached: T | null = null;
    try {
      cached = await this.get<T>(key);
    } catch (error) {
      // Cache get failed, will execute function
      logger.debug(
        { module: 'CacheService', key, error },
        'Cache get failed, executing function'
      );
    }

    if (cached !== null) {
      logger.debug({ module: 'CacheService', key }, 'Cache hit');
      return cached;
    }

    // Cache miss - execute the function
    logger.debug({ module: 'CacheService', key }, 'Cache miss, executing function');
    const result = await fn();

    // Cache the result (don't await to not block return)
    // But we still want errors logged, so we handle it
    try {
      await this.set(key, result, ttlSeconds);
    } catch (cacheError) {
      logger.warn(
        { module: 'CacheService', key, error: cacheError },
        'Failed to cache result'
      );
    }

    return result;
  }

  /**
   * Check if Redis is connected and healthy
   *
   * @returns true if connected and ready
   */
  isHealthy(): boolean {
    return this.redis.status === 'ready';
  }

  /**
   * Close the Redis connection gracefully
   */
  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    try {
      await this.redis.quit();
      this.closed = true;
      logger.info({ module: 'CacheService' }, 'Redis connection closed');
    } catch (error) {
      logger.warn(
        { module: 'CacheService', error },
        'Error closing Redis connection'
      );
      this.closed = true;
    }
  }

  // ============================================
  // Cache Key Helper Methods
  // ============================================

  /**
   * Generate a cache key for vision analysis
   *
   * @param productId - The product ID
   * @param imageHash - Hash of the image content
   * @returns Cache key in format: vision:{productId}:{imageHash}
   */
  visionKey(productId: string, imageHash: string): string {
    return `vision:${productId}:${imageHash}`;
  }

  /**
   * Generate a cache key for idea suggestions
   *
   * Time-bucketed to 5-minute granularity to allow some cache hits
   * while still providing fresh suggestions.
   *
   * @param userId - The user ID
   * @param productIds - Array of product IDs
   * @returns Cache key in format: ideas:{userId}:{productIds}:{timeBucket}
   */
  ideasKey(userId: string, productIds: string[]): string {
    const sortedProductIds = [...productIds].sort().join(',');
    const timeBucket = Math.floor(Date.now() / TIME_BUCKET_GRANULARITY_MS);
    return `ideas:${userId}:${sortedProductIds}:${timeBucket}`;
  }

  /**
   * Generate a cache key for product knowledge
   *
   * @param productId - The product ID
   * @returns Cache key in format: kb:{productId}:v1
   */
  kbKey(productId: string): string {
    return `kb:${productId}:v1`;
  }
}

// Singleton instance for convenience
let cacheServiceInstance: CacheService | null = null;

/**
 * Create a new CacheService instance
 *
 * Use this for testing or when you need a fresh instance.
 * For production, prefer getCacheService() for the singleton.
 *
 * @param redisUrl - Optional Redis URL override
 * @returns New CacheService instance
 */
export function createCacheService(redisUrl?: string): CacheService {
  return new CacheService(redisUrl);
}

/**
 * Get the singleton CacheService instance
 *
 * Creates the instance on first call. Use this in production
 * to share a single Redis connection.
 *
 * @returns Singleton CacheService instance
 */
export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService();
  }
  return cacheServiceInstance;
}

/**
 * Close the singleton CacheService instance
 *
 * Call this during graceful shutdown.
 */
export async function closeCacheService(): Promise<void> {
  if (cacheServiceInstance) {
    await cacheServiceInstance.close();
    cacheServiceInstance = null;
  }
}

export default CacheService;
