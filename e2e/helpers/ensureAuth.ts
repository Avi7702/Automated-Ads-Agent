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
 * Waits for React to hydrate and decide whether the user is authenticated.
 * After the SPA shell loads (domcontentloaded), React boots, checks auth,
 * and either renders the app (header visible) or redirects to /login.
 *
 * Returns true if redirected to /login, false if the app loaded.
 */
async function waitForAuthDecision(page: Page): Promise<boolean> {
  if (page.url().includes('/login')) return true;

  try {
    const redirected = await Promise.race([
      // Login redirect — React Router navigates to /login after auth check fails
      page.waitForURL(/\/login/, { timeout: 10_000 }).then(() => true),
      // App rendered — header element means authenticated shell loaded
      page
        .locator('header')
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => false),
    ]);
    return redirected;
  } catch {
    // Neither happened within timeout — check URL as fallback
    return page.url().includes('/login');
  }
}

/**
 * Navigate to a page with auth fallback and retry on resource errors.
 * Handles:
 * - Auth redirect to /login → re-authenticates via demo endpoint
 * - Race condition: domcontentloaded fires before React hydrates and redirects
 * - ERR_INSUFFICIENT_RESOURCES → waits and retries (server overloaded under parallel test load)
 */
export async function gotoWithAuth(page: Page, url: string, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');

      // Wait for React to hydrate — either the app renders or redirects to /login
      const onLogin = await waitForAuthDecision(page);

      if (!onLogin) return; // Authenticated — page loaded successfully

      // Session expired — re-authenticate via demo endpoint
      await page.goto('/api/auth/demo');
      await page.waitForLoadState('domcontentloaded');

      // Navigate back to target
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');

      const stillOnLogin = await waitForAuthDecision(page);
      if (!stillOnLogin) return; // Re-auth succeeded

      // Re-auth didn't work — wait and retry
      if (attempt < retries) {
        await page.waitForTimeout(2000 * (attempt + 1));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Retry on resource exhaustion, network errors, or navigation failures
      const retryable =
        message.includes('ERR_INSUFFICIENT_RESOURCES') ||
        message.includes('ERR_CONNECTION') ||
        message.includes('net::') ||
        message.includes('Navigation');
      if (attempt < retries && retryable) {
        await page.waitForTimeout(3000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`gotoWithAuth: could not reach ${url} after ${retries + 1} attempts (stuck on login)`);
}
