/**
 * Client-side Analytics — PostHog Integration
 *
 * Tracks user interactions (generation started, copy generated, template selected, etc.).
 * Initialized lazily. No-op if VITE_POSTHOG_API_KEY is not set.
 */

let posthogInstance: any = null;
let initialized = false;

/**
 * Initialize PostHog client-side tracking.
 * Call once during app initialization.
 */
export async function initAnalytics(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
  if (!apiKey) return;

  try {
    const posthog = await import('posthog-js');
    posthog.default.init(apiKey, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
      loaded: (ph) => {
        if (import.meta.env.DEV) {
          ph.opt_out_capturing(); // Don't track in development
        }
      },
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false, // Manual tracking only
    });
    posthogInstance = posthog.default;
  } catch {
    // posthog-js not installed — analytics disabled
  }
}

/**
 * Identify user after login.
 */
export function identify(userId: string, properties?: Record<string, unknown>): void {
  posthogInstance?.identify(userId, properties);
}

/**
 * Track a custom event.
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  posthogInstance?.capture(event, properties);
}

/**
 * Reset tracking on logout.
 */
export function resetAnalytics(): void {
  posthogInstance?.reset();
}
