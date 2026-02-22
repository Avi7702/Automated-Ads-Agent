/**
 * Server-side Analytics — PostHog Integration
 *
 * Tracks server-side events (generation started/completed, API usage, etc.).
 * Initialized lazily on first use. No-op if POSTHOG_API_KEY is not set.
 */

import { logger } from './logger';

let posthogClient: any = null;
let initialized = false;

/**
 * Lazily initialize PostHog server client.
 */
async function getClient(): Promise<any> {
  if (initialized) return posthogClient;
  initialized = true;

  const apiKey = process.env['POSTHOG_API_KEY'];
  if (!apiKey) {
    logger.debug({ module: 'Analytics' }, 'PostHog disabled (POSTHOG_API_KEY not set)');
    return null;
  }

  try {
    const moduleName = 'posthog-node';
    const { PostHog } = await import(/* webpackIgnore: true */ moduleName);
    posthogClient = new PostHog(apiKey, {
      host: process.env['POSTHOG_HOST'] || 'https://us.i.posthog.com',
      flushAt: 20,
      flushInterval: 10000,
    });
    logger.info({ module: 'Analytics' }, 'PostHog server analytics initialized');
    return posthogClient;
  } catch {
    logger.debug({ module: 'Analytics' }, 'posthog-node not installed — analytics disabled');
    return null;
  }
}

/**
 * Track a server-side event.
 */
export async function trackEvent(userId: string, event: string, properties?: Record<string, unknown>): Promise<void> {
  const client = await getClient();
  if (!client) return;

  try {
    client.capture({
      distinctId: userId,
      event,
      properties: {
        ...properties,
        $set: { lastSeen: new Date().toISOString() },
      },
    });
  } catch (error) {
    logger.error({ err: error, event }, 'Failed to track PostHog event');
  }
}

/**
 * Identify a user (set user properties).
 */
export async function identifyUser(userId: string, properties: Record<string, unknown>): Promise<void> {
  const client = await getClient();
  if (!client) return;

  try {
    client.identify({
      distinctId: userId,
      properties,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to identify PostHog user');
  }
}

/**
 * Flush pending events. Call during graceful shutdown.
 */
export async function flushAnalytics(): Promise<void> {
  if (posthogClient) {
    try {
      await posthogClient.shutdown();
      logger.info({ module: 'Analytics' }, 'PostHog flushed on shutdown');
    } catch {
      // Ignore flush errors on shutdown
    }
  }
}
