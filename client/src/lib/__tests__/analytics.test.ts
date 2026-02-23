// @ts-nocheck
/**
 * Tests for lib/analytics.ts
 * Tests the no-op behavior when posthog-js is not available.
 * posthog-js is not installed in this project, so initAnalytics catches
 * the import error and posthogInstance stays null — track/identify/reset
 * all become safe no-ops via optional chaining (posthogInstance?.method).
 */
import { describe, it, expect, vi } from 'vitest';

// Suppress unresolved import error from posthog-js dynamic import
// by mocking it before the test module loads
vi.mock('posthog-js', () => ({}), { virtual: true });

import { initAnalytics, track, identify, resetAnalytics, _resetCsrfToken } from '../analytics';

describe('analytics — safe no-ops when posthog unavailable', () => {
  it('track() does not throw', () => {
    expect(() => track('test_event')).not.toThrow();
  });

  it('track() with properties does not throw', () => {
    expect(() => track('test_event', { foo: 'bar', count: 1 })).not.toThrow();
  });

  it('identify() does not throw', () => {
    expect(() => identify('user-123')).not.toThrow();
  });

  it('identify() with properties does not throw', () => {
    expect(() => identify('user-456', { plan: 'pro' })).not.toThrow();
  });

  it('resetAnalytics() does not throw', () => {
    expect(() => resetAnalytics()).not.toThrow();
  });
});

describe('analytics — initAnalytics', () => {
  it('resolves without throwing when called', async () => {
    await expect(initAnalytics()).resolves.toBeUndefined();
  });

  it('is idempotent — second call also resolves without error', async () => {
    await initAnalytics();
    await expect(initAnalytics()).resolves.toBeUndefined();
  });
});
