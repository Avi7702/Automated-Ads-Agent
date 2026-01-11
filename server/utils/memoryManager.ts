/**
 * Memory Manager Utility
 *
 * Provides bounded Map implementations with:
 * - Maximum size limits (prevents unbounded growth)
 * - Automatic cleanup of expired entries
 * - LRU eviction when at capacity
 * - Memory usage monitoring
 */

export interface BoundedMapOptions<V> {
  /** Maximum number of entries (default: 10000) */
  maxSize?: number;
  /** Cleanup interval in ms (default: 5 minutes) */
  cleanupIntervalMs?: number;
  /** Function to determine if entry is expired */
  isExpired?: (value: V, key: string) => boolean;
  /** Name for logging purposes */
  name?: string;
}

export interface BoundedMapStats {
  size: number;
  maxSize: number;
  evictions: number;
  cleanups: number;
  lastCleanup: Date | null;
}

/**
 * A Map with bounded size, automatic cleanup, and LRU eviction
 */
export class BoundedMap<K, V> {
  private map: Map<K, { value: V; lastAccess: number }>;
  private readonly maxSize: number;
  private readonly cleanupIntervalMs: number;
  private readonly isExpired?: (value: V, key: string) => boolean;
  private readonly name: string;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private evictionCount = 0;
  private cleanupCount = 0;
  private lastCleanupTime: Date | null = null;

  constructor(options: BoundedMapOptions<V> = {}) {
    this.maxSize = options.maxSize ?? 10000;
    this.cleanupIntervalMs = options.cleanupIntervalMs ?? 5 * 60 * 1000; // 5 minutes
    this.isExpired = options.isExpired;
    this.name = options.name ?? 'BoundedMap';
    this.map = new Map();

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get a value, updating last access time
   */
  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    // Check if expired
    if (this.isExpired && this.isExpired(entry.value, String(key))) {
      this.map.delete(key);
      return undefined;
    }

    // Update last access for LRU
    entry.lastAccess = Date.now();
    return entry.value;
  }

  /**
   * Set a value, evicting LRU entry if at capacity
   */
  set(key: K, value: V): this {
    // If key exists, just update
    if (this.map.has(key)) {
      this.map.set(key, { value, lastAccess: Date.now() });
      return this;
    }

    // Evict if at capacity
    if (this.map.size >= this.maxSize) {
      this.evictLRU();
    }

    this.map.set(key, { value, lastAccess: Date.now() });
    return this;
  }

  /**
   * Check if key exists (without updating access time)
   */
  has(key: K): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;

    // Check if expired
    if (this.isExpired && this.isExpired(entry.value, String(key))) {
      this.map.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key
   */
  delete(key: K): boolean {
    return this.map.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.map.clear();
  }

  /**
   * Get current size
   */
  get size(): number {
    return this.map.size;
  }

  /**
   * Iterate over entries
   */
  forEach(callback: (value: V, key: K) => void): void {
    this.map.forEach((entry, key) => {
      callback(entry.value, key);
    });
  }

  /**
   * Get all keys
   */
  keys(): IterableIterator<K> {
    return this.map.keys();
  }

  /**
   * Get statistics
   */
  getStats(): BoundedMapStats {
    return {
      size: this.map.size,
      maxSize: this.maxSize,
      evictions: this.evictionCount,
      cleanups: this.cleanupCount,
      lastCleanup: this.lastCleanupTime,
    };
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: K | null = null;
    let oldestTime = Infinity;

    this.map.forEach((entry, key) => {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    });

    if (oldestKey !== null) {
      this.map.delete(oldestKey);
      this.evictionCount++;
    }
  }

  /**
   * Run cleanup to remove expired entries
   */
  private cleanup(): void {
    if (!this.isExpired) return;

    let removed = 0;
    const keysToDelete: K[] = [];

    this.map.forEach((entry, key) => {
      if (this.isExpired!(entry.value, String(key))) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.map.delete(key);
      removed++;
    });

    this.cleanupCount++;
    this.lastCleanupTime = new Date();

    if (removed > 0) {
      console.log(`[${this.name}] Cleanup removed ${removed} expired entries. Size: ${this.map.size}/${this.maxSize}`);
    }
  }

  /**
   * Start the cleanup interval
   */
  private startCleanupInterval(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);

    // Don't keep process alive just for cleanup
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop the cleanup interval (for testing/shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Force a cleanup now (for testing)
   */
  forceCleanup(): void {
    this.cleanup();
  }
}

/**
 * Factory function to create a BoundedMap with rate-limit semantics
 * Automatically expires entries based on resetAt timestamp
 */
export function createRateLimitMap<V extends { resetAt: number }>(
  name: string,
  maxSize: number = 10000
): BoundedMap<string, V> {
  return new BoundedMap<string, V>({
    name,
    maxSize,
    cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
    isExpired: (value) => value.resetAt < Date.now(),
  });
}

/**
 * Factory function for quota metrics map
 * Expires entries when windowStart is older than 2 minutes
 */
export function createQuotaMetricsMap<V extends { windowStart: number }>(
  name: string,
  maxSize: number = 5000
): BoundedMap<string, V> {
  return new BoundedMap<string, V>({
    name,
    maxSize,
    cleanupIntervalMs: 5 * 60 * 1000,
    isExpired: (value) => {
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      return value.windowStart < twoMinutesAgo;
    },
  });
}

/**
 * Factory function for auth failed logins map
 * Expires entries when lockedUntil has passed (or never locked)
 */
export function createAuthFailedLoginsMap(
  maxSize: number = 5000
): BoundedMap<string, { count: number; lockedUntil?: number }> {
  return new BoundedMap<string, { count: number; lockedUntil?: number }>({
    name: 'AuthFailedLogins',
    maxSize,
    cleanupIntervalMs: 5 * 60 * 1000,
    isExpired: (value) => {
      // Expire if not locked and count is stale (> 30 minutes old)
      // Or if lock has expired
      if (value.lockedUntil) {
        return value.lockedUntil < Date.now();
      }
      // No lock, keep for 30 minutes of inactivity (handled by LRU)
      return false;
    },
  });
}

/**
 * Memory monitoring utility
 * Logs warnings when heap usage exceeds threshold
 */
export function startMemoryMonitoring(
  warningThresholdPercent: number = 80,
  checkIntervalMs: number = 60 * 1000 // 1 minute
): () => void {
  const timer = setInterval(() => {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const heapPercent = Math.round((usage.heapUsed / usage.heapTotal) * 100);

    if (heapPercent >= warningThresholdPercent) {
      console.warn(
        `[MemoryManager] HIGH MEMORY WARNING: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercent}%)`
      );
    }
  }, checkIntervalMs);

  // Don't keep process alive
  if (timer.unref) {
    timer.unref();
  }

  // Return cleanup function
  return () => clearInterval(timer);
}

/**
 * Get current memory stats
 */
export function getMemoryStats(): {
  heapUsedMB: number;
  heapTotalMB: number;
  heapPercent: number;
  rssMB: number;
  externalMB: number;
} {
  const usage = process.memoryUsage();
  return {
    heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
    heapPercent: Math.round((usage.heapUsed / usage.heapTotal) * 100),
    rssMB: Math.round(usage.rss / 1024 / 1024),
    externalMB: Math.round(usage.external / 1024 / 1024),
  };
}
