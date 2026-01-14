/**
 * Sentry Error Monitoring
 *
 * Captures unhandled errors and sends them to Sentry for alerting/debugging.
 * Only active when SENTRY_DSN is configured.
 */

import * as Sentry from '@sentry/node';
import { logger } from './logger';

const SENTRY_DSN = process.env.SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Initialize Sentry SDK
 * Call this early in app startup, before other middleware
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    logger.info({ module: 'Sentry' }, 'Sentry disabled (SENTRY_DSN not set)');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',

    // Only send errors in production by default
    enabled: IS_PRODUCTION || process.env.SENTRY_ENABLED === 'true',

    // Sample rate for performance monitoring (0-1)
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,

    // Don't send PII
    sendDefaultPii: false,

    // Ignore common non-actionable errors
    ignoreErrors: [
      // Network errors users can't control
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      // User cancelled
      'AbortError',
      // Auth errors (expected)
      'Unauthorized',
      'Invalid session',
    ],

    // Add useful context
    beforeSend(event, hint) {
      // Don't send 4xx errors (client errors)
      const statusCode = (hint.originalException as any)?.statusCode;
      if (statusCode && statusCode >= 400 && statusCode < 500) {
        return null;
      }

      return event;
    },
  });

  logger.info({ module: 'Sentry', environment: process.env.NODE_ENV }, 'Sentry initialized');
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (!SENTRY_DSN) return;

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Capture a message (for non-error events)
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (!SENTRY_DSN) return;
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  if (!SENTRY_DSN) return;
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging context
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}): void {
  if (!SENTRY_DSN) return;
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Express error handler middleware
 * Add this AFTER all routes but BEFORE your custom error handler
 */
// @ts-expect-error - Sentry Handlers API varies by version, fallback provided
export const sentryErrorHandler = Sentry.Handlers?.errorHandler?.() ?? ((err: any, _req: any, _res: any, next: any) => next(err));

/**
 * Express request handler middleware
 * Add this BEFORE all routes
 */
// @ts-expect-error - Sentry Handlers API varies by version, fallback provided
export const sentryRequestHandler = Sentry.Handlers?.requestHandler?.() ?? ((_req: any, _res: any, next: any) => next());

// Re-export Sentry for advanced usage
export { Sentry };
