/**
 * Cache Service Tests - TDD Approach
 *
 * These tests define the expected behavior of the CacheService before implementation.
 * The service wraps Redis with typed methods and handles connection failures gracefully.
 *
 * Cache Key Patterns (from plan):
 * - vision:{productId}:{imageHash} - Vision analysis (7-day TTL)
 * - ideas:{userId}:{productIds}:{timeBucket} - Idea suggestions (1-hour TTL)
 * - kb:{productId}:v1 - Product knowledge (24-hour TTL)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Create mock Redis instance with proper vitest mock functions
const createMockRedisInstance = () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  keys: vi.fn().mockResolvedValue([]),
  del: vi.fn().mockResolvedValue(0),
  ping: vi.fn().mockResolvedValue('PONG'),
  quit: vi.fn().mockResolvedValue('OK'),
  status: 'ready' as string,
  on: vi.fn().mockReturnThis(),
  once: vi.fn().mockReturnThis(),
});

let mockRedisInstance = createMockRedisInstance();

// Mock ioredis before importing the service
vi.mock('ioredis', () => {
  return {
    default: class MockRedis {
      get = mockRedisInstance.get;
      set = mockRedisInstance.set;
      keys = mockRedisInstance.keys;
      del = mockRedisInstance.del;
      ping = mockRedisInstance.ping;
      quit = mockRedisInstance.quit;
      on = mockRedisInstance.on;
      once = mockRedisInstance.once;
      get status() {
        return mockRedisInstance.status;
      }
    },
  };
});

// Mock logger
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Import after mocks are set up
import {
  CacheService,
  createCacheService,
  getCacheService,
  closeCacheService,
  CACHE_TTL,
} from '../lib/cacheService';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    // Create fresh mock instance for each test
    mockRedisInstance = createMockRedisInstance();

    // Create fresh cache service for each test
    cacheService = createCacheService();
  });

  afterEach(async () => {
    // Clean up
    await cacheService.close();
    vi.clearAllMocks();
  });

  describe('get()', () => {
    it('returns null for non-existent keys', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await cacheService.get<string>('nonexistent:key');

      expect(result).toBeNull();
      expect(mockRedisInstance.get).toHaveBeenCalledWith('nonexistent:key');
    });

    it('returns cached value for existing keys', async () => {
      const cachedValue = { name: 'test', count: 42 };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(cachedValue));

      const result = await cacheService.get<{ name: string; count: number }>('existing:key');

      expect(result).toEqual(cachedValue);
      expect(mockRedisInstance.get).toHaveBeenCalledWith('existing:key');
    });

    it('returns null and logs error when Redis fails', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Connection refused'));

      const result = await cacheService.get<string>('some:key');

      expect(result).toBeNull();
    });

    it('handles primitive types correctly', async () => {
      mockRedisInstance.get.mockResolvedValue('"simple string"');

      const result = await cacheService.get<string>('string:key');

      expect(result).toBe('simple string');
    });

    it('handles arrays correctly', async () => {
      const arrayValue = [1, 2, 3, 'four'];
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(arrayValue));

      const result = await cacheService.get<(number | string)[]>('array:key');

      expect(result).toEqual(arrayValue);
    });
  });

  describe('set()', () => {
    it('stores values with TTL correctly', async () => {
      const value = { product: 'test', price: 99.99 };
      const ttlSeconds = 3600; // 1 hour

      await cacheService.set('product:123', value, ttlSeconds);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'product:123',
        JSON.stringify(value),
        'EX',
        ttlSeconds
      );
    });

    it('serializes/deserializes JSON correctly', async () => {
      const complexValue = {
        nested: {
          deeply: {
            array: [1, 2, 3],
            date: '2025-01-26T00:00:00.000Z',
          },
        },
        special: 'characters: "\n\t\\',
      };

      await cacheService.set('complex:key', complexValue, 7200);

      const serializedCall = mockRedisInstance.set.mock.calls[0][1];
      expect(JSON.parse(serializedCall)).toEqual(complexValue);
    });

    it('throws error when Redis fails to set', async () => {
      mockRedisInstance.set.mockRejectedValue(new Error('Memory full'));

      await expect(
        cacheService.set('key', { value: 'test' }, 3600)
      ).rejects.toThrow('Memory full');
    });

    it('handles empty objects', async () => {
      await cacheService.set('empty:object', {}, 3600);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'empty:object',
        '{}',
        'EX',
        3600
      );
    });

    it('handles null values', async () => {
      await cacheService.set('null:value', null as unknown, 3600);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'null:value',
        'null',
        'EX',
        3600
      );
    });
  });

  describe('invalidate()', () => {
    it('deletes matching keys by pattern', async () => {
      mockRedisInstance.keys.mockResolvedValue([
        'vision:product1:hash1',
        'vision:product1:hash2',
        'vision:product1:hash3',
      ]);
      mockRedisInstance.del.mockResolvedValue(3);

      await cacheService.invalidate('vision:product1:*');

      expect(mockRedisInstance.keys).toHaveBeenCalledWith('vision:product1:*');
      expect(mockRedisInstance.del).toHaveBeenCalledWith(
        'vision:product1:hash1',
        'vision:product1:hash2',
        'vision:product1:hash3'
      );
    });

    it('returns count of deleted keys', async () => {
      mockRedisInstance.keys.mockResolvedValue(['key1', 'key2']);
      mockRedisInstance.del.mockResolvedValue(2);

      const count = await cacheService.invalidate('prefix:*');

      expect(count).toBe(2);
    });

    it('returns 0 when no keys match pattern', async () => {
      mockRedisInstance.keys.mockResolvedValue([]);

      const count = await cacheService.invalidate('nonexistent:*');

      expect(count).toBe(0);
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });

    it('handles Redis errors gracefully', async () => {
      mockRedisInstance.keys.mockRejectedValue(new Error('Connection lost'));

      const count = await cacheService.invalidate('some:*');

      expect(count).toBe(0);
    });

    it('handles exact key deletion (no wildcard)', async () => {
      mockRedisInstance.keys.mockResolvedValue(['exact:key']);
      mockRedisInstance.del.mockResolvedValue(1);

      const count = await cacheService.invalidate('exact:key');

      expect(count).toBe(1);
    });
  });

  describe('wrap()', () => {
    it('executes function and caches result on cache miss', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      const expensiveFunction = vi.fn().mockResolvedValue({ data: 'computed' });

      const result = await cacheService.wrap(
        'compute:key',
        3600,
        expensiveFunction
      );

      expect(result).toEqual({ data: 'computed' });
      expect(expensiveFunction).toHaveBeenCalledTimes(1);
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'compute:key',
        JSON.stringify({ data: 'computed' }),
        'EX',
        3600
      );
    });

    it('returns cached value without executing function on cache hit', async () => {
      const cachedData = { data: 'cached' };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(cachedData));
      const expensiveFunction = vi.fn().mockResolvedValue({ data: 'computed' });

      const result = await cacheService.wrap(
        'cached:key',
        3600,
        expensiveFunction
      );

      expect(result).toEqual({ data: 'cached' });
      expect(expensiveFunction).not.toHaveBeenCalled();
      expect(mockRedisInstance.set).not.toHaveBeenCalled();
    });

    it('handles function errors gracefully (does not cache errors)', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      const failingFunction = vi.fn().mockRejectedValue(new Error('Computation failed'));

      await expect(
        cacheService.wrap('failing:key', 3600, failingFunction)
      ).rejects.toThrow('Computation failed');

      expect(mockRedisInstance.set).not.toHaveBeenCalled();
    });

    it('falls back to executing function when Redis get fails', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Redis down'));
      const computeFunction = vi.fn().mockResolvedValue({ data: 'fallback' });

      const result = await cacheService.wrap(
        'fallback:key',
        3600,
        computeFunction
      );

      expect(result).toEqual({ data: 'fallback' });
      expect(computeFunction).toHaveBeenCalledTimes(1);
    });

    it('still caches result even if initial get failed', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Redis temporarily down'));
      mockRedisInstance.set.mockResolvedValue('OK'); // Redis recovered
      const computeFunction = vi.fn().mockResolvedValue({ data: 'computed' });

      await cacheService.wrap('recovery:key', 3600, computeFunction);

      // Should attempt to cache even after get failure
      expect(mockRedisInstance.set).toHaveBeenCalled();
    });

    it('handles async functions that return primitives', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      const computeNumber = vi.fn().mockResolvedValue(42);

      const result = await cacheService.wrap('number:key', 3600, computeNumber);

      expect(result).toBe(42);
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'number:key',
        '42',
        'EX',
        3600
      );
    });
  });

  describe('isHealthy()', () => {
    it('returns true when Redis is connected', () => {
      mockRedisInstance.status = 'ready';

      const healthy = cacheService.isHealthy();

      expect(healthy).toBe(true);
    });

    it('returns false when Redis is disconnected', () => {
      mockRedisInstance.status = 'end';

      const healthy = cacheService.isHealthy();

      expect(healthy).toBe(false);
    });

    it('returns false when Redis is connecting', () => {
      mockRedisInstance.status = 'connecting';

      const healthy = cacheService.isHealthy();

      expect(healthy).toBe(false);
    });

    it('returns false when Redis status is close', () => {
      mockRedisInstance.status = 'close';

      const healthy = cacheService.isHealthy();

      expect(healthy).toBe(false);
    });
  });

  describe('close()', () => {
    it('closes connection gracefully', async () => {
      await cacheService.close();

      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });

    it('handles errors during close gracefully', async () => {
      mockRedisInstance.quit.mockRejectedValue(new Error('Already closed'));

      // Should not throw
      await expect(cacheService.close()).resolves.not.toThrow();
    });

    it('can be called multiple times safely', async () => {
      await cacheService.close();
      await cacheService.close();

      // Second call should be a no-op (closed flag prevents second quit)
      expect(mockRedisInstance.quit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache TTL Constants', () => {
    it('exports correct TTL for vision analysis (7 days)', () => {
      expect(CACHE_TTL.VISION_ANALYSIS).toBe(7 * 24 * 60 * 60);
    });

    it('exports correct TTL for idea suggestions (1 hour)', () => {
      expect(CACHE_TTL.IDEA_SUGGESTIONS).toBe(60 * 60);
    });

    it('exports correct TTL for product knowledge (24 hours)', () => {
      expect(CACHE_TTL.PRODUCT_KNOWLEDGE).toBe(24 * 60 * 60);
    });
  });

  describe('Cache Key Helpers', () => {
    it('generates vision cache key correctly', () => {
      const key = cacheService.visionKey('product123', 'abc123hash');

      expect(key).toBe('vision:product123:abc123hash');
    });

    it('generates ideas cache key correctly with time bucket', () => {
      const key = cacheService.ideasKey('user456', ['prod1', 'prod2']);

      // Should include time bucket (5-minute granularity)
      expect(key).toMatch(/^ideas:user456:prod1,prod2:\d+$/);
    });

    it('generates product knowledge cache key correctly', () => {
      const key = cacheService.kbKey('product789');

      expect(key).toBe('kb:product789:v1');
    });
  });

  describe('Edge Cases', () => {
    it('handles very large objects', async () => {
      const largeObject = {
        data: 'x'.repeat(100000), // 100KB string
        array: new Array(1000).fill({ nested: 'value' }),
      };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(largeObject));

      const result = await cacheService.get<typeof largeObject>('large:key');

      expect(result).toEqual(largeObject);
    });

    it('handles special characters in keys', async () => {
      const specialKey = 'cache:user@example.com:product/item';
      mockRedisInstance.get.mockResolvedValue('"test"');

      await cacheService.get<string>(specialKey);

      expect(mockRedisInstance.get).toHaveBeenCalledWith(specialKey);
    });

    it('handles undefined values returned from Redis (treated as null)', async () => {
      mockRedisInstance.get.mockResolvedValue(undefined);

      const result = await cacheService.get<string>('undefined:key');

      expect(result).toBeNull();
    });

    it('handles malformed JSON in cache gracefully', async () => {
      mockRedisInstance.get.mockResolvedValue('not valid json {{{');

      const result = await cacheService.get<object>('malformed:key');

      // Should return null and not throw
      expect(result).toBeNull();
    });
  });

  describe('wrap() - cache set failure handling', () => {
    it('returns computed result even when cache set fails', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.set.mockRejectedValue(new Error('Redis write failed'));
      const computeFunction = vi.fn().mockResolvedValue({ data: 'result' });

      const result = await cacheService.wrap('set-fail:key', 3600, computeFunction);

      // Should still return the computed result
      expect(result).toEqual({ data: 'result' });
      expect(computeFunction).toHaveBeenCalledTimes(1);
      // Set was attempted but failed
      expect(mockRedisInstance.set).toHaveBeenCalled();
    });
  });

  describe('Singleton Pattern', () => {
    it('getCacheService returns a CacheService instance', () => {
      const instance = getCacheService();

      expect(instance).toBeInstanceOf(CacheService);
    });

    it('getCacheService returns the same instance on multiple calls', () => {
      const instance1 = getCacheService();
      const instance2 = getCacheService();

      expect(instance1).toBe(instance2);
    });

    it('closeCacheService closes the singleton and allows new instance', async () => {
      const instance1 = getCacheService();
      await closeCacheService();

      // After closing, getting cache service should create new instance
      const instance2 = getCacheService();
      expect(instance2).toBeInstanceOf(CacheService);
    });

    it('closeCacheService is safe to call when no instance exists', async () => {
      // First close any existing instance
      await closeCacheService();

      // Second close should be safe (no instance to close)
      await expect(closeCacheService()).resolves.not.toThrow();
    });
  });
});
