import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

test.describe('First-Time User Journey', () => {
  test.describe('Empty State Discovery', () => {
    test('Studio page loads for authenticated user', async ({ page }) => {
      await gotoWithAuth(page, '/');

      // Should not redirect to login (we have auth state from setup)
      await expect(page).not.toHaveURL(/\/login/);

      // Should show Studio content
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible();
    });

    test('Gallery shows empty state or generation list', async ({ page }) => {
      await gotoWithAuth(page, '/gallery');

      // Either empty state or generation grid
      const galleryHeading = page.locator('h1').filter({ hasText: 'Gallery' });
      await expect(galleryHeading).toBeVisible();
    });

    test('Library page is accessible from nav', async ({ page }) => {
      await gotoWithAuth(page, '/');

      // Click Library in nav
      const nav = page.locator('nav[aria-label="Main navigation"]');
      await nav.getByText('Library').click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/library/);
      await expect(page.locator('h1').filter({ hasText: 'Library' })).toBeVisible();
    });
  });

  test.describe('Explore All Pages', () => {
    test('user can visit all 5 main pages without errors', async ({ page }) => {
      const routes = ['/', '/gallery', '/pipeline', '/library', '/settings'];

      for (const route of routes) {
        await gotoWithAuth(page, route);

        // Page should have a heading (confirms page loaded)
        const heading = page.locator('h1').first();
        await expect(heading).toBeVisible({ timeout: 15000 });

        // No error boundary should be visible (use specific ErrorBoundary component text)
        const errorBoundary = page.locator('[data-testid="error-boundary"]').first();
        const hasError = await errorBoundary.isVisible().catch(() => false);
        expect(hasError).toBe(false);
      }
    });
  });

  test.describe('Settings Exploration', () => {
    test('user can navigate to Brand Profile settings', async ({ page }) => {
      await gotoWithAuth(page, '/settings');

      // Brand profile content should be visible (default section)
      const brandContent = page.getByText(/brand|company|profile|settings/i).first();
      await expect(brandContent).toBeVisible({ timeout: 10000 });
    });

    test('user can navigate to API Keys settings', async ({ page }) => {
      await gotoWithAuth(page, '/settings?section=api-keys');

      // API keys content should be visible
      const apiContent = page.getByText(/API|key|gemini|configure/i).first();
      await expect(apiContent).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Library Tab Exploration', () => {
    test('user can browse all 6 Library tabs', async ({ page }) => {
      const tabs = ['products', 'brand-images', 'templates', 'scene-templates', 'scenarios', 'patterns'];

      for (const tab of tabs) {
        await gotoWithAuth(page, `/library?tab=${tab}`);

        // Active tab panel should be visible (Radix renders all panels, only active is visible)
        const tabPanel = page.locator('[role="tabpanel"][data-state="active"]');
        await expect(tabPanel).toBeVisible({ timeout: 10000 });

        // Main page header should exist
        const mainHeader = page.locator('header').first();
        await expect(mainHeader).toBeVisible();
      }
    });
  });

  test.describe('Pipeline Tab Exploration', () => {
    test('user can browse all 3 Pipeline tabs', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline');

      const tabNames = [/Content Planner/i, /Approval/i, /Social Accounts/i];

      for (const name of tabNames) {
        const tab = page.getByRole('tab', { name });
        if (await tab.isVisible()) {
          await tab.click();
          await page.waitForTimeout(1000);

          // Tab content should load
          const tabPanel = page.locator('[role="tabpanel"][data-state="active"]');
          await expect(tabPanel).toBeVisible();
        }
      }
    });
  });

  test.describe('Cross-Page Navigation', () => {
    test('full navigation loop: Studio -> Gallery -> Pipeline -> Library -> Settings -> Studio', { timeout: 120000 }, async ({ page }) => {
      const routes = [
        { path: '/', name: 'Studio' },
        { path: '/gallery', name: 'Gallery' },
        { path: '/pipeline', name: 'Pipeline' },
        { path: '/library', name: 'Library' },
        { path: '/settings', name: 'Settings' },
        { path: '/', name: 'Studio' },
      ];

      for (const route of routes) {
        await gotoWithAuth(page, route.path);

        // Page loaded without error
        const heading = page.locator('h1').first();
        await expect(heading).toBeVisible({ timeout: 10000 });
      }
    });
  });
});
