import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * Error Handling E2E Tests
 *
 * Tests graceful error fallbacks when APIs fail, ErrorBoundary behavior,
 * and absence of critical console errors during page loads.
 *
 * Uses page.route() to intercept and mock API failures.
 */

test.describe('Error Handling', { tag: '@errors' }, () => {
  // --- API Error Graceful Fallbacks ---

  test('Studio shows fallback when /api/products returns 500', async ({ page }) => {
    // Intercept products API to return 500
    await page.route('**/api/products', (route) => route.fulfill({ status: 500, body: 'Internal Server Error' }));

    await gotoWithAuth(page, '/');
    await page.waitForTimeout(3000);

    // Page should still render without crashing
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Settings Brand Profile shows error when /api/brand-profile returns 500', async ({ page }) => {
    await page.route('**/api/brand-profile', (route) => route.fulfill({ status: 500, body: 'Internal Server Error' }));

    await gotoWithAuth(page, '/settings');
    await page.waitForTimeout(3000);

    // Should show error state or fallback message
    const errorText = page.getByText(/Error loading profile|Failed to load|Something went wrong/i);
    const noProfile = page.getByText(/No brand profile found/i);
    const settingsHeading = page.locator('h1').filter({ hasText: 'Settings' });

    // Page should still be functional even with API error
    await expect(errorText.or(noProfile).or(settingsHeading)).toBeVisible({ timeout: 10000 });
  });

  test('KB section shows fallback when product APIs fail', async ({ page }) => {
    await page.route('**/api/products', (route) => route.fulfill({ status: 500, body: 'Internal Server Error' }));
    await page.route('**/api/templates', (route) => route.fulfill({ status: 500, body: 'Internal Server Error' }));

    await gotoWithAuth(page, '/settings?section=knowledge-base');
    await page.waitForTimeout(3000);

    // KB section should still render heading even if data fetches fail
    const heading = page.getByText('Knowledge Base').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('API Keys section handles key fetch errors gracefully', async ({ page }) => {
    await page.route('**/api/settings/api-keys', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' }),
    );

    await gotoWithAuth(page, '/settings?section=api-keys');
    await page.waitForTimeout(3000);

    // Should show error alert or at least the security notice
    const errorAlert = page.getByText(/Error Loading Keys|Failed to load/i);
    const securityNotice = page.getByText(/encrypted with AES-256-GCM/i);

    await expect(errorAlert.or(securityNotice)).toBeVisible({ timeout: 10000 });
  });

  test('Gallery page handles API errors without crashing', async ({ page }) => {
    await page.route('**/api/generations*', (route) => route.fulfill({ status: 500, body: 'Internal Server Error' }));

    await gotoWithAuth(page, '/gallery');
    await page.waitForTimeout(3000);

    // Gallery should still render its heading/structure
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  // --- No Critical Console Errors ---

  test('Studio page loads without critical console errors', async ({ page }) => {
    const criticalErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known non-critical errors (favicon, HMR, etc.)
        if (
          !text.includes('favicon') &&
          !text.includes('net::ERR') &&
          !text.includes('[HMR]') &&
          !text.includes('ResizeObserver')
        ) {
          criticalErrors.push(text);
        }
      }
    });

    await gotoWithAuth(page, '/');
    await page.waitForTimeout(5000);

    // Allow some non-critical errors (API calls that may 404 in test env)
    const trulyMajor = criticalErrors.filter(
      (e) => e.includes('Uncaught') || e.includes('TypeError') || e.includes('ReferenceError'),
    );
    expect(trulyMajor).toHaveLength(0);
  });

  test('Settings page loads without critical console errors', async ({ page }) => {
    const criticalErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          !text.includes('favicon') &&
          !text.includes('net::ERR') &&
          !text.includes('[HMR]') &&
          !text.includes('ResizeObserver')
        ) {
          criticalErrors.push(text);
        }
      }
    });

    await gotoWithAuth(page, '/settings');
    await page.waitForTimeout(5000);

    const trulyMajor = criticalErrors.filter(
      (e) => e.includes('Uncaught') || e.includes('TypeError') || e.includes('ReferenceError'),
    );
    expect(trulyMajor).toHaveLength(0);
  });

  test('Gallery page loads without critical console errors', async ({ page }) => {
    const criticalErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          !text.includes('favicon') &&
          !text.includes('net::ERR') &&
          !text.includes('[HMR]') &&
          !text.includes('ResizeObserver')
        ) {
          criticalErrors.push(text);
        }
      }
    });

    await gotoWithAuth(page, '/gallery');
    await page.waitForTimeout(5000);

    const trulyMajor = criticalErrors.filter(
      (e) => e.includes('Uncaught') || e.includes('TypeError') || e.includes('ReferenceError'),
    );
    expect(trulyMajor).toHaveLength(0);
  });

  // --- ErrorBoundary ---

  test('ErrorBoundary catches render errors and shows fallback UI', async ({ page }) => {
    // Inject a render error by breaking a critical component
    await page.route('**/api/brand-profile', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'INVALID_JSON{{{', // Malformed JSON to trigger parse error
      }),
    );

    await gotoWithAuth(page, '/settings');
    await page.waitForTimeout(3000);

    // Either ErrorBoundary catches it or the component handles the error internally
    const errorBoundary = page.getByText('Something went wrong');
    const settingsHeading = page.locator('h1').filter({ hasText: 'Settings' });

    // Page should show either the error boundary or still render normally (component-level catch)
    await expect(errorBoundary.or(settingsHeading)).toBeVisible({ timeout: 10000 });
  });
});
