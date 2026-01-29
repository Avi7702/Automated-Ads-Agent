/**
 * Redis-backed login lockout service
 *
 * Persists failed login counts in Redis so lockouts survive server restarts.
 * Key pattern: auth:lockout:{email}
 * TTL: 15 minutes (900 seconds) - matches LOCKOUT_DURATION_MS in authService
 */

import { getRedisClient } from '../lib/redis';
import { logger } from '../lib/logger';

const KEY_PREFIX = 'auth:lockout:';
const LOCKOUT_TTL_SECONDS = 900; // 15 minutes
const LOCKOUT_THRESHOLD = 5;

function lockoutKey(email: string): string {
  return `${KEY_PREFIX}${email}`;
}

/**
 * Record a failed login attempt in Redis.
 * Increments the counter and sets/refreshes TTL to 15 minutes.
 */
export async function recordFailedLogin(email: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = lockoutKey(email);
    const count = await redis.incr(key);
    // Set TTL on first failure or when threshold is reached
    // Always refresh TTL so the lockout window resets on each attempt
    if (count === 1 || count >= LOCKOUT_THRESHOLD) {
      await redis.expire(key, LOCKOUT_TTL_SECONDS);
    }
  } catch (err: unknown) {
    logger.error({ module: 'RedisAuthLockout', err, email }, 'Failed to record failed login in Redis');
    // Error is swallowed - caller falls back to in-memory
    throw err;
  }
}

/**
 * Check if an email is locked out (>= threshold failed attempts).
 */
export async function isLockedOut(email: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const key = lockoutKey(email);
    const value = await redis.get(key);
    if (value === null) return false;
    const count = parseInt(value, 10);
    return !isNaN(count) && count >= LOCKOUT_THRESHOLD;
  } catch (err: unknown) {
    logger.error({ module: 'RedisAuthLockout', err, email }, 'Failed to check lockout in Redis');
    throw err;
  }
}

/**
 * Clear failed login attempts after successful login.
 */
export async function clearFailedLogins(email: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = lockoutKey(email);
    await redis.del(key);
  } catch (err: unknown) {
    logger.error({ module: 'RedisAuthLockout', err, email }, 'Failed to clear failed logins in Redis');
    throw err;
  }
}

/**
 * Get the remaining lockout time in seconds.
 * Returns 0 if not locked out or key doesn't exist.
 */
export async function getLockoutTimeRemaining(email: string): Promise<number> {
  try {
    const redis = getRedisClient();
    const key = lockoutKey(email);
    const ttl = await redis.ttl(key);
    // ttl returns -2 if key doesn't exist, -1 if no TTL set
    return ttl > 0 ? ttl : 0;
  } catch (err: unknown) {
    logger.error({ module: 'RedisAuthLockout', err, email }, 'Failed to get lockout TTL from Redis');
    throw err;
  }
}

/**
 * Get the number of failed login attempts.
 * Returns 0 if no record exists.
 */
export async function getFailedAttempts(email: string): Promise<number> {
  try {
    const redis = getRedisClient();
    const key = lockoutKey(email);
    const value = await redis.get(key);
    if (value === null) return 0;
    const count = parseInt(value, 10);
    return isNaN(count) ? 0 : count;
  } catch (err: unknown) {
    logger.error({ module: 'RedisAuthLockout', err, email }, 'Failed to get failed attempts from Redis');
    throw err;
  }
}
