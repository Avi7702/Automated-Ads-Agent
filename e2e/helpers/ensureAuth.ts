import { Page } from '@playwright/test';

/**
 * Ensures the page is authenticated. If the page redirects to /login,
 * re-authenticates via the /api/auth/demo endpoint.
 *
 * Use this in beforeEach hooks for test files that are affected by
 * parallel session load on the dev server.
 */
export async function ensureAuth(page: Page) {
  // Check if we ended up on the login page
  if (page.url().includes('/login')) {
    // Re-authenticate via demo endpoint
    await page.goto('/api/auth/demo');
    await page.waitForLoadState('domcontentloaded');
  }
}

/**
 * Navigate to a page with auth fallback and retry on resource errors.
 * Handles:
 * - Auth redirect to /login → re-authenticates via demo endpoint
 * - ERR_INSUFFICIENT_RESOURCES → waits and retries (server overloaded under parallel test load)
 */
export async function gotoWithAuth(page: Page, url: string, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');

      // If redirected to login, re-auth and retry
      if (page.url().includes('/login')) {
        await page.goto('/api/auth/demo');
        await page.waitForLoadState('domcontentloaded');
        await page.goto(url);
        await page.waitForLoadState('domcontentloaded');
      }

      // Success
      return;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Retry on resource exhaustion or network errors (common under parallel load)
      if (attempt < retries && (message.includes('ERR_INSUFFICIENT_RESOURCES') || message.includes('ERR_CONNECTION'))) {
        await page.waitForTimeout(2000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
}
