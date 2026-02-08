import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

// All tests in this file run at iPhone SE viewport
test.use({ viewport: { width: 375, height: 667 } });

test.describe('Mobile Experience Journey', () => {
  test.describe('Studio Mobile', () => {
    test('Studio loads without horizontal overflow', async ({ page }) => {
      await gotoWithAuth(page, '/');

      // Check body doesn't have horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
    });

    test('desktop nav is hidden on mobile', async ({ page }) => {
      await gotoWithAuth(page, '/');

      const desktopNav = page.locator('nav[aria-label="Main navigation"]');
      await expect(desktopNav).toBeHidden();
    });
  });

  test.describe('Hamburger Menu', () => {
    test('hamburger menu opens and shows all nav items', async ({ page }) => {
      await gotoWithAuth(page, '/');

      // Wait for page to fully render
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

      // Hamburger button visible (use .first() for stability under parallel load)
      const menuButton = page.getByRole('button', { name: 'Open navigation menu' }).first();
      await expect(menuButton).toBeVisible({ timeout: 10000 });

      // Open menu
      await menuButton.click();
      await page.waitForTimeout(500);

      // Sheet with 5 items (scope to nav to avoid matching SheetDescription)
      const sheet = page.locator('[role="dialog"]');
      await expect(sheet).toBeVisible({ timeout: 5000 });
      const sheetNav = sheet.locator('nav');

      await expect(sheetNav.getByText('Studio')).toBeVisible();
      await expect(sheetNav.getByText('Gallery')).toBeVisible();
      await expect(sheetNav.getByText('Pipeline')).toBeVisible();
      await expect(sheetNav.getByText('Library')).toBeVisible();
      await expect(sheetNav.getByText('Settings')).toBeVisible();
    });

    test('mobile nav navigation works for all pages', { timeout: 120000 }, async ({ page }) => {
      const navTargets = [
        { label: 'Library', url: /\/library/ },
        { label: 'Gallery', url: /\/gallery/ },
        { label: 'Settings', url: /\/settings/ },
        { label: 'Pipeline', url: /\/pipeline/ },
      ];

      for (const target of navTargets) {
        await gotoWithAuth(page, '/');

        // Wait for page render then open menu
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: 'Open navigation menu' }).first().click();
        const sheet = page.locator('[role="dialog"]');
        await expect(sheet).toBeVisible();

        // Click target
        await sheet.getByText(target.label).click();
        await page.waitForLoadState('networkidle');

        // Handle potential auth redirect
        if (page.url().includes('/login')) {
          await page.goto('/api/auth/demo');
          await page.waitForLoadState('networkidle');
          // Re-navigate to target from Studio
          await page.goto('/');
          await page.waitForLoadState('networkidle');
          await page.getByRole('button', { name: 'Open navigation menu' }).click();
          await page.locator('[role="dialog"]').getByText(target.label).click();
          await page.waitForLoadState('networkidle');
        }

        // Should navigate
        await expect(page).toHaveURL(target.url);

        // Sheet should close
        await expect(sheet).toBeHidden();
      }
    });
  });

  test.describe('Library Mobile', () => {
    test('Library tabs are accessible on mobile', async ({ page }) => {
      await gotoWithAuth(page, '/library');

      // Tab list should be visible
      const tabList = page.locator('[role="tablist"]');
      await expect(tabList).toBeVisible();

      // All 6 tabs should exist (even if some text is hidden)
      const tabs = page.locator('[role="tab"]');
      await expect(tabs).toHaveCount(6);

      // First tab (Products) should be clickable
      const firstTab = tabs.first();
      await expect(firstTab).toBeVisible();
    });

    test('Library content fits mobile viewport', async ({ page }) => {
      await gotoWithAuth(page, '/library');

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
    });
  });

  test.describe('Gallery Mobile', () => {
    test('Gallery page fits mobile viewport', async ({ page }) => {
      await gotoWithAuth(page, '/gallery');

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
    });

    test('Gallery search input is accessible on mobile', async ({ page }) => {
      await gotoWithAuth(page, '/gallery');

      const searchInput = page.locator('input[placeholder*="earch"]');
      await expect(searchInput).toBeVisible();

      // Should be able to type
      await searchInput.fill('test');
      await expect(searchInput).toHaveValue('test');
    });
  });

  test.describe('Settings Mobile', () => {
    test('Settings page fits mobile viewport', async ({ page }) => {
      await gotoWithAuth(page, '/settings');

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
    });

    test('Settings section buttons are accessible', async ({ page }) => {
      await gotoWithAuth(page, '/settings');

      // Wait for settings content to load — scope to main content area (not hidden desktop nav)
      // The desktop nav has hidden "Settings" text that matches first, so look in main area only
      const mainContent = page.locator('main').first();
      await expect(mainContent).toBeVisible({ timeout: 15000 });

      // Settings page should have loaded (check for any content in main)
      const settingsContent = mainContent.getByText(/brand|profile|edit|api|key|knowledge|usage/i).first();
      await expect(settingsContent).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Pipeline Mobile', () => {
    test('Pipeline tabs are accessible on mobile', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline');

      const tabs = page.locator('[role="tab"]');
      await expect(tabs).toHaveCount(3);

      // All tabs should be clickable
      for (let i = 0; i < 3; i++) {
        const tab = tabs.nth(i);
        await expect(tab).toBeVisible();
      }
    });
  });

  test.describe('Landscape Mode', () => {
    test.use({ viewport: { width: 667, height: 375 } });

    test('landscape layout does not break', async ({ page }) => {
      await gotoWithAuth(page, '/');

      // Page should render without horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

      // Header should still be visible
      const header = page.locator('header').first();
      await expect(header).toBeVisible();
    });
  });
});
