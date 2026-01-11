import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BoundedMap,
  createRateLimitMap,
  createQuotaMetricsMap,
  createAuthFailedLoginsMap,
  getMemoryStats,
} from '../utils/memoryManager';

describe('BoundedMap', () => {
  let map: BoundedMap<string, { value: number }>;

  afterEach(() => {
    if (map) {
      map.stopCleanup();
    }
  });

  describe('basic operations', () => {
    beforeEach(() => {
      map = new BoundedMap<string, { value: number }>({
        maxSize: 5,
        cleanupIntervalMs: 60000, // Long interval for tests
      });
    });

    it('should set and get values', () => {
      map.set('key1', { value: 1 });
      expect(map.get('key1')).toEqual({ value: 1 });
    });

    it('should return undefined for non-existent keys', () => {
      expect(map.get('nonexistent')).toBeUndefined();
    });

    it('should check if key exists with has()', () => {
      map.set('key1', { value: 1 });
      expect(map.has('key1')).toBe(true);
      expect(map.has('nonexistent')).toBe(false);
    });

    it('should delete keys', () => {
      map.set('key1', { value: 1 });
      expect(map.delete('key1')).toBe(true);
      expect(map.has('key1')).toBe(false);
    });

    it('should clear all entries', () => {
      map.set('key1', { value: 1 });
      map.set('key2', { value: 2 });
      map.clear();
      expect(map.size).toBe(0);
    });

    it('should track size correctly', () => {
      expect(map.size).toBe(0);
      map.set('key1', { value: 1 });
      expect(map.size).toBe(1);
      map.set('key2', { value: 2 });
      expect(map.size).toBe(2);
      map.delete('key1');
      expect(map.size).toBe(1);
    });

    it('should iterate with forEach', () => {
      map.set('key1', { value: 1 });
      map.set('key2', { value: 2 });

      const values: number[] = [];
      map.forEach((value) => {
        values.push(value.value);
      });

      expect(values).toContain(1);
      expect(values).toContain(2);
    });

    it('should iterate keys', () => {
      map.set('key1', { value: 1 });
      map.set('key2', { value: 2 });

      const keys = Array.from(map.keys());
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });

  describe('LRU eviction', () => {
    beforeEach(() => {
      map = new BoundedMap<string, { value: number }>({
        maxSize: 3,
        cleanupIntervalMs: 60000,
      });
    });

    it('should evict LRU entry when at capacity', () => {
      map.set('key1', { value: 1 });
      map.set('key2', { value: 2 });
      map.set('key3', { value: 3 });

      // key1 is now LRU (oldest)
      map.set('key4', { value: 4 });

      expect(map.size).toBe(3);
      expect(map.has('key1')).toBe(false); // Evicted
      expect(map.has('key2')).toBe(true);
      expect(map.has('key3')).toBe(true);
      expect(map.has('key4')).toBe(true);
    });

    it('should update access time on get()', async () => {
      // Add delays to ensure distinct timestamps
      map.set('key1', { value: 1 });
      await new Promise((r) => setTimeout(r, 10));

      map.set('key2', { value: 2 });
      await new Promise((r) => setTimeout(r, 10));

      map.set('key3', { value: 3 });
      await new Promise((r) => setTimeout(r, 10));

      // Access key1 to make it recently used (updates lastAccess)
      map.get('key1');
      await new Promise((r) => setTimeout(r, 10));

      // Now key2 should be LRU (oldest that wasn't accessed)
      map.set('key4', { value: 4 });

      expect(map.has('key1')).toBe(true); // Still here (recently accessed)
      expect(map.has('key2')).toBe(false); // Evicted (LRU)
    });

    it('should not evict when updating existing key', () => {
      map.set('key1', { value: 1 });
      map.set('key2', { value: 2 });
      map.set('key3', { value: 3 });

      // Update existing key - no eviction
      map.set('key1', { value: 100 });

      expect(map.size).toBe(3);
      expect(map.get('key1')).toEqual({ value: 100 });
    });

    it('should track eviction count', () => {
      map.set('key1', { value: 1 });
      map.set('key2', { value: 2 });
      map.set('key3', { value: 3 });
      map.set('key4', { value: 4 }); // Evicts key1
      map.set('key5', { value: 5 }); // Evicts key2

      const stats = map.getStats();
      expect(stats.evictions).toBe(2);
    });
  });

  describe('expiration', () => {
    it('should expire entries based on isExpired function', () => {
      const expiredMap = new BoundedMap<string, { value: number; expiresAt: number }>({
        maxSize: 10,
        cleanupIntervalMs: 60000,
        isExpired: (entry) => entry.expiresAt < Date.now(),
      });

      try {
        const now = Date.now();
        expiredMap.set('expired', { value: 1, expiresAt: now - 1000 }); // Already expired
        expiredMap.set('valid', { value: 2, expiresAt: now + 60000 }); // Valid

        expect(expiredMap.get('expired')).toBeUndefined();
        expect(expiredMap.get('valid')).toEqual({ value: 2, expiresAt: now + 60000 });
      } finally {
        expiredMap.stopCleanup();
      }
    });

    it('should remove expired entries on has() check', () => {
      const expiredMap = new BoundedMap<string, { value: number; expiresAt: number }>({
        maxSize: 10,
        cleanupIntervalMs: 60000,
        isExpired: (entry) => entry.expiresAt < Date.now(),
      });

      try {
        expiredMap.set('expired', { value: 1, expiresAt: Date.now() - 1000 });
        expect(expiredMap.has('expired')).toBe(false);
        expect(expiredMap.size).toBe(0);
      } finally {
        expiredMap.stopCleanup();
      }
    });

    it('should remove expired entries on forceCleanup()', () => {
      const expiredMap = new BoundedMap<string, { value: number; expiresAt: number }>({
        maxSize: 10,
        cleanupIntervalMs: 60000,
        isExpired: (entry) => entry.expiresAt < Date.now(),
      });

      try {
        const now = Date.now();
        expiredMap.set('expired1', { value: 1, expiresAt: now - 1000 });
        expiredMap.set('expired2', { value: 2, expiresAt: now - 500 });
        expiredMap.set('valid', { value: 3, expiresAt: now + 60000 });

        // Force cleanup
        expiredMap.forceCleanup();

        expect(expiredMap.size).toBe(1);
        expect(expiredMap.has('valid')).toBe(true);
      } finally {
        expiredMap.stopCleanup();
      }
    });
  });

  describe('statistics', () => {
    it('should return correct stats', () => {
      map = new BoundedMap<string, { value: number }>({
        maxSize: 100,
        cleanupIntervalMs: 60000,
        name: 'TestMap',
      });

      map.set('key1', { value: 1 });
      map.set('key2', { value: 2 });

      const stats = map.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);
      expect(stats.evictions).toBe(0);
      expect(stats.cleanups).toBe(0);
    });
  });
});

describe('Factory Functions', () => {
  describe('createRateLimitMap', () => {
    it('should create a map that expires entries based on resetAt', () => {
      const map = createRateLimitMap<{ count: number; resetAt: number }>('TestRateLimit', 100);

      try {
        const now = Date.now();

        // Expired entry
        map.set('expired-user', { count: 5, resetAt: now - 1000 });

        // Valid entry
        map.set('valid-user', { count: 3, resetAt: now + 60000 });

        expect(map.get('expired-user')).toBeUndefined();
        expect(map.get('valid-user')).toBeDefined();
        expect(map.get('valid-user')?.count).toBe(3);
      } finally {
        map.stopCleanup();
      }
    });
  });

  describe('createQuotaMetricsMap', () => {
    it('should create a map that expires entries older than 2 minutes', () => {
      const map = createQuotaMetricsMap<{
        requestsThisMinute: number;
        tokensThisMinute: number;
        windowStart: number;
      }>('TestQuota', 100);

      try {
        const now = Date.now();

        // Old entry (> 2 minutes)
        map.set('old-brand', {
          requestsThisMinute: 10,
          tokensThisMinute: 1000,
          windowStart: now - 3 * 60 * 1000, // 3 minutes ago
        });

        // Recent entry
        map.set('recent-brand', {
          requestsThisMinute: 5,
          tokensThisMinute: 500,
          windowStart: now - 30 * 1000, // 30 seconds ago
        });

        expect(map.get('old-brand')).toBeUndefined();
        expect(map.get('recent-brand')).toBeDefined();
      } finally {
        map.stopCleanup();
      }
    });
  });

  describe('createAuthFailedLoginsMap', () => {
    it('should create a map that expires entries with passed lockedUntil', () => {
      const map = createAuthFailedLoginsMap(100);

      try {
        const now = Date.now();

        // Expired lock
        map.set('expired-lock', { count: 5, lockedUntil: now - 1000 });

        // Active lock
        map.set('active-lock', { count: 3, lockedUntil: now + 60000 });

        // No lock (should persist for LRU eviction)
        map.set('no-lock', { count: 2 });

        expect(map.get('expired-lock')).toBeUndefined();
        expect(map.get('active-lock')).toBeDefined();
        expect(map.get('no-lock')).toBeDefined();
      } finally {
        map.stopCleanup();
      }
    });
  });
});

describe('Memory Stats', () => {
  it('should return memory statistics', () => {
    const stats = getMemoryStats();

    expect(stats.heapUsedMB).toBeGreaterThan(0);
    expect(stats.heapTotalMB).toBeGreaterThan(0);
    expect(stats.heapPercent).toBeGreaterThanOrEqual(0);
    expect(stats.heapPercent).toBeLessThanOrEqual(100);
    expect(stats.rssMB).toBeGreaterThan(0);
  });
});

describe('Edge Cases', () => {
  it('should handle maxSize of 1', () => {
    const map = new BoundedMap<string, number>({ maxSize: 1 });

    try {
      map.set('key1', 1);
      expect(map.size).toBe(1);

      map.set('key2', 2);
      expect(map.size).toBe(1);
      expect(map.has('key1')).toBe(false);
      expect(map.has('key2')).toBe(true);
    } finally {
      map.stopCleanup();
    }
  });

  it('should handle rapid set/get operations', () => {
    const map = new BoundedMap<string, number>({ maxSize: 100 });

    try {
      for (let i = 0; i < 1000; i++) {
        map.set(`key${i}`, i);
      }

      expect(map.size).toBe(100);

      // Most recent 100 keys should be present
      for (let i = 900; i < 1000; i++) {
        expect(map.has(`key${i}`)).toBe(true);
      }
    } finally {
      map.stopCleanup();
    }
  });

  it('should handle concurrent access patterns', async () => {
    const map = new BoundedMap<string, number>({ maxSize: 50 });

    try {
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise((resolve) => {
            setTimeout(() => {
              map.set(`key${i}`, i);
              map.get(`key${Math.floor(Math.random() * 100)}`);
              resolve();
            }, Math.random() * 10);
          })
        );
      }

      await Promise.all(promises);

      expect(map.size).toBeLessThanOrEqual(50);
    } finally {
      map.stopCleanup();
    }
  });
});
