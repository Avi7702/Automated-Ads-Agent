/**
 * Gemini Health Monitor
 *
 * Tracks Gemini API success/failure rates using Redis rolling counters.
 * Provides health status for the /api/health endpoint and enables
 * graceful degradation when Gemini is down.
 *
 * Redis keys used:
 * - gemini:failures:{minute_bucket} — failure count per minute (TTL 300s)
 * - gemini:successes:{minute_bucket} — success count per minute (TTL 300s)
 * - gemini:last_success — ISO timestamp of last successful call
 * - gemini:last_status — previous health status for change detection
 */

import { getRedisClient } from './redis';
import { geminiLogger } from './logger';
import { captureException, captureMessage } from './sentry';

export type GeminiHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface GeminiHealth {
  status: GeminiHealthStatus;
  failureRate: number;
  lastSuccess: string | null;
}

/** Rolling window size in minutes */
const WINDOW_MINUTES = 5;
/** TTL for each minute bucket in seconds */
const BUCKET_TTL_SECONDS = 300;

/** Thresholds for status classification */
const DEGRADED_THRESHOLD = 0.10; // 10% failure rate
const DOWN_THRESHOLD = 0.50; // 50% failure rate

/**
 * Get the current minute bucket key suffix.
 * Uses Math.floor(now / 60000) so all events within the same minute share a bucket.
 */
function getMinuteBucket(): string {
  return String(Math.floor(Date.now() / 60000));
}

/**
 * Get all minute bucket suffixes in the rolling window.
 */
function getWindowBuckets(): string[] {
  const currentBucket = Math.floor(Date.now() / 60000);
  const buckets: string[] = [];
  for (let i = 0; i < WINDOW_MINUTES; i++) {
    buckets.push(String(currentBucket - i));
  }
  return buckets;
}

/**
 * Record a successful Gemini API call.
 * Fire-and-forget — never blocks the caller.
 */
export function recordGeminiSuccess(): void {
  try {
    const redis = getRedisClient();
    const bucket = getMinuteBucket();
    const key = `gemini:successes:${bucket}`;

    // Fire-and-forget: pipeline INCR + EXPIRE
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, BUCKET_TTL_SECONDS);
    pipeline.set('gemini:last_success', new Date().toISOString());
    pipeline.exec().catch((err: unknown) => {
      geminiLogger.warn({ err }, 'Failed to record Gemini success in Redis');
    });
  } catch {
    // Redis unavailable — silently degrade
  }
}

/**
 * Record a failed Gemini API call.
 * Fire-and-forget — never blocks the caller.
 *
 * @param errorType - Classification of the failure (quota, unavailable, unknown)
 */
export function recordGeminiFailure(errorType: 'quota' | 'unavailable' | 'unknown'): void {
  try {
    const redis = getRedisClient();
    const bucket = getMinuteBucket();
    const key = `gemini:failures:${bucket}`;

    // Fire-and-forget: pipeline INCR + EXPIRE
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, BUCKET_TTL_SECONDS);
    pipeline.exec().catch((err: unknown) => {
      geminiLogger.warn({ err }, 'Failed to record Gemini failure in Redis');
    });

    // Check if status has transitioned to 'down' and fire alert
    checkAndAlertStatusChange(errorType).catch((err: unknown) => {
      geminiLogger.warn({ err }, 'Failed to check Gemini status change');
    });
  } catch {
    // Redis unavailable — silently degrade
  }
}

/**
 * Get the current Gemini health status based on rolling failure rate.
 *
 * Returns 'unknown' if Redis is unavailable or no data exists.
 */
export async function getGeminiHealthStatus(): Promise<GeminiHealth> {
  try {
    const redis = getRedisClient();
    const buckets = getWindowBuckets();

    // Build pipeline to fetch all failure and success buckets + last_success
    const pipeline = redis.pipeline();
    for (const bucket of buckets) {
      pipeline.get(`gemini:failures:${bucket}`);
    }
    for (const bucket of buckets) {
      pipeline.get(`gemini:successes:${bucket}`);
    }
    pipeline.get('gemini:last_success');

    const results = await pipeline.exec();
    if (!results) {
      return { status: 'unknown', failureRate: 0, lastSuccess: null };
    }

    // Parse failure counts (first WINDOW_MINUTES results)
    let totalFailures = 0;
    for (let i = 0; i < WINDOW_MINUTES; i++) {
      const result = results[i];
      if (result && !result[0]) {
        const val = result[1];
        totalFailures += parseInt(String(val ?? '0'), 10) || 0;
      }
    }

    // Parse success counts (next WINDOW_MINUTES results)
    let totalSuccesses = 0;
    for (let i = WINDOW_MINUTES; i < WINDOW_MINUTES * 2; i++) {
      const result = results[i];
      if (result && !result[0]) {
        const val = result[1];
        totalSuccesses += parseInt(String(val ?? '0'), 10) || 0;
      }
    }

    // Parse last_success timestamp
    const lastSuccessResult = results[WINDOW_MINUTES * 2];
    const lastSuccess = (lastSuccessResult && !lastSuccessResult[0])
      ? String(lastSuccessResult[1] ?? '')
      : null;

    const totalCalls = totalFailures + totalSuccesses;

    // No data = unknown (no calls made recently)
    if (totalCalls === 0) {
      return { status: 'unknown', failureRate: 0, lastSuccess: lastSuccess || null };
    }

    const failureRate = totalFailures / totalCalls;

    let status: GeminiHealthStatus;
    if (failureRate >= DOWN_THRESHOLD) {
      status = 'down';
    } else if (failureRate >= DEGRADED_THRESHOLD) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return { status, failureRate, lastSuccess: lastSuccess || null };
  } catch {
    // Redis unavailable — graceful fallback
    return { status: 'unknown', failureRate: 0, lastSuccess: null };
  }
}

/**
 * Quick check: is Gemini currently detected as down?
 *
 * Routes can call this before invoking AI services.
 * Returns false if Redis is unavailable (fail-open).
 */
export async function isGeminiDown(): Promise<boolean> {
  const health = await getGeminiHealthStatus();
  return health.status === 'down';
}

/**
 * Check if the health status has changed and fire alerts.
 * Only alerts on transitions to 'down' to avoid alert fatigue.
 */
async function checkAndAlertStatusChange(errorType: string): Promise<void> {
  const health = await getGeminiHealthStatus();

  if (health.status !== 'down') {
    return;
  }

  try {
    const redis = getRedisClient();
    const previousStatus = await redis.get('gemini:last_status');

    if (previousStatus !== 'down') {
      // Status just transitioned to 'down' — fire alert
      await redis.set('gemini:last_status', 'down', 'EX', BUCKET_TTL_SECONDS);

      const alertError = new Error(
        `Gemini API is DOWN — failure rate ${(health.failureRate * 100).toFixed(1)}% over ${WINDOW_MINUTES} minutes (trigger: ${errorType})`
      );
      alertError.name = 'GeminiServiceDown';

      captureException(alertError, {
        severity: 'critical',
        failureRate: health.failureRate,
        lastSuccess: health.lastSuccess,
        errorType,
      });

      captureMessage(
        `CRITICAL: Gemini API is DOWN (${(health.failureRate * 100).toFixed(1)}% failure rate)`,
        'error'
      );

      geminiLogger.error({
        status: health.status,
        failureRate: health.failureRate,
        lastSuccess: health.lastSuccess,
        errorType,
      }, 'CRITICAL: Gemini API status changed to DOWN');
    }
  } catch {
    // Redis unavailable during alert check — skip alerting
  }
}
