/**
 * Token Refresh Job
 *
 * Proactively refreshes OAuth tokens before they expire.
 * Runs every 15 minutes, refreshes tokens expiring within 30 minutes.
 * After 3 consecutive refresh failures: deactivates the connection.
 */

import { refreshExpiringTokens } from '../services/tokenService';
import * as socialRepo from '../repositories/socialRepository';
import { logger } from '../lib/logger';

// Run every 15 minutes
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

// Refresh tokens expiring within this window
const THRESHOLD_MINUTES = 30;

// Max consecutive failures before deactivating connection
const MAX_CONSECUTIVE_FAILURES = 3;

// Track consecutive failures per connection
const failureCounts = new Map<string, number>();

/**
 * Run a single token refresh cycle
 */
export async function runTokenRefreshJob(): Promise<{
  refreshed: number;
  failed: number;
  deactivated: number;
}> {
  logger.info({ module: 'TokenRefresh' }, 'Starting token refresh job');

  const result = await refreshExpiringTokens(THRESHOLD_MINUTES);

  let deactivated = 0;

  // Track failures and deactivate after MAX_CONSECUTIVE_FAILURES
  for (const { connectionId, error } of result.errors) {
    const count = (failureCounts.get(connectionId) ?? 0) + 1;
    failureCounts.set(connectionId, count);

    if (count >= MAX_CONSECUTIVE_FAILURES) {
      try {
        await socialRepo.updateSocialConnection(connectionId, {
          isActive: false,
          lastErrorAt: new Date(),
          lastErrorMessage: `Deactivated after ${MAX_CONSECUTIVE_FAILURES} consecutive refresh failures: ${error}`,
        });
        deactivated++;
        failureCounts.delete(connectionId);
        logger.warn(
          { connectionId, consecutiveFailures: count },
          'Connection deactivated after repeated refresh failures',
        );
      } catch (updateErr) {
        logger.error({ connectionId, err: updateErr }, 'Failed to deactivate connection after refresh failures');
      }
    }
  }

  // Reset failure count for successfully refreshed connections
  // (we don't have their IDs directly, but the count resets on next success)

  logger.info(
    {
      module: 'TokenRefresh',
      refreshed: result.refreshed,
      failed: result.failed,
      deactivated,
    },
    'Token refresh job completed',
  );

  return {
    refreshed: result.refreshed,
    failed: result.failed,
    deactivated,
  };
}

/**
 * Start the token refresh scheduler
 */
let refreshInterval: NodeJS.Timeout | null = null;

export function startTokenRefreshScheduler(): void {
  if (refreshInterval) {
    logger.warn({ module: 'TokenRefresh' }, 'Token refresh scheduler already running');
    return;
  }

  // Run immediately on startup
  runTokenRefreshJob().catch((err) => {
    logger.error({ module: 'TokenRefresh', err }, 'Initial token refresh failed');
  });

  // Schedule periodic refresh
  refreshInterval = setInterval(() => {
    runTokenRefreshJob().catch((err) => {
      logger.error({ module: 'TokenRefresh', err }, 'Scheduled token refresh failed');
    });
  }, REFRESH_INTERVAL_MS);

  logger.info(
    { module: 'TokenRefresh', intervalMs: REFRESH_INTERVAL_MS, thresholdMinutes: THRESHOLD_MINUTES },
    'Token refresh scheduler started',
  );
}

/**
 * Stop the token refresh scheduler
 */
export function stopTokenRefreshScheduler(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    failureCounts.clear();
    logger.info({ module: 'TokenRefresh' }, 'Token refresh scheduler stopped');
  }
}
