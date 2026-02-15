import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * Navigation E2E Tests
 *
 * Tests the desktop header nav links, active states, theme toggle,
 * logout flow, and mobile navigation sheet.
 *
 * Uses authenticated storageState from the setup project.
 */

test.describe('Navigation', { tag: '@navigation' }, () => {
  test.describe('Desktop Header Nav', () => {
    test('logo click navigates to Studio /', async ({ page }) => {
      await gotoWithAuth(page, '/gallery');

      // Click the logo link (contains "V3" badge and links to "/")
      const logoLink = page.locator('header a[href="/"]').first();
      await expect(logoLink).toBeVisible();
      await logoLink.click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL('/');
    });

    test('Studio nav link has active state on /', async ({ page }) => {
      await gotoWithAuth(page, '/');

      const nav = page.locator('nav[aria-label="Main navigation"]');
      const studioLink = nav.locator('a[aria-current="page"]');
      await expect(studioLink).toBeVisible();
      await expect(studioLink).toContainText('Studio');
    });

    test('Gallery nav navigates to /gallery', async ({ page }) => {
      await gotoWithAuth(page, '/');

      const nav = page.locator('nav[aria-label="Main navigation"]');
      await nav.getByText('Gallery').click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/gallery/);

      // Verify Gallery is now active
      const activeLink = nav.locator('a[aria-current="page"]');
      await expect(activeLink).toContainText('Gallery');
    });

    test('Pipeline nav navigates to /pipeline', async ({ page }) => {
      await gotoWithAuth(page, '/');

      const nav = page.locator('nav[aria-label="Main navigation"]');
      await nav.getByText('Pipeline').click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/pipeline/);

      const activeLink = nav.locator('a[aria-current="page"]');
      await expect(activeLink).toContainText('Pipeline');
    });

    test('Library nav navigates to /library', async ({ page }) => {
      await gotoWithAuth(page, '/');

      const nav = page.locator('nav[aria-label="Main navigation"]');
      await nav.getByText('Library').click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/library/);

      const activeLink = nav.locator('a[aria-current="page"]');
      await expect(activeLink).toContainText('Library');
    });

    test('Settings nav navigates to /settings', async ({ page }) => {
      await gotoWithAuth(page, '/');

      const nav = page.locator('nav[aria-label="Main navigation"]');
      await nav.getByText('Settings').click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/settings/);

      const activeLink = nav.locator('a[aria-current="page"]');
      await expect(activeLink).toContainText('Settings');
    });
  });

  test.describe('Theme Toggle', () => {
    test('toggle to Dark adds dark class to html', async ({ page }) => {
      await gotoWithAuth(page, '/');

      // Open theme dropdown
      const themeToggle = page.getByRole('button', { name: /toggle theme/i }).first();
      await expect(themeToggle).toBeVisible({ timeout: 10000 });
      await themeToggle.click();

      // Select Dark
      const darkOption = page.getByRole('menuitem', { name: /dark/i });
      await expect(darkOption).toBeVisible({ timeout: 5000 });
      await darkOption.click();
      await page.waitForTimeout(300);

      const htmlClass = (await page.locator('html').getAttribute('class')) || '';
      expect(htmlClass).toContain('dark');
    });

    test('toggle to Light removes dark class', async ({ page }) => {
      await gotoWithAuth(page, '/');

      // First set to Dark to ensure a known state
      const themeToggle = page.getByRole('button', { name: /toggle theme/i }).first();
      await themeToggle.click();
      const darkOption = page.getByRole('menuitem', { name: /dark/i });
      await expect(darkOption).toBeVisible({ timeout: 5000 });
      await darkOption.click();
      await page.waitForTimeout(300);

      // Now toggle to Light
      await themeToggle.click();
      const lightOption = page.getByRole('menuitem', { name: /light/i });
      await expect(lightOption).toBeVisible({ timeout: 5000 });
      await lightOption.click();
      await page.waitForTimeout(300);

      const htmlClass = (await page.locator('html').getAttribute('class')) || '';
      expect(htmlClass).toContain('light');
      expect(htmlClass).not.toContain('dark');
    });

    test('toggle to System mode', async ({ page }) => {
      await gotoWithAuth(page, '/');

      const themeToggle = page.getByRole('button', { name: /toggle theme/i }).first();
      await themeToggle.click();

      const systemOption = page.getByRole('menuitem', { name: /system/i });
      await expect(systemOption).toBeVisible({ timeout: 5000 });
      await systemOption.click();
      await page.waitForTimeout(300);

      // System mode applies the OS preference — just verify no error occurred
      // and the html element still has a valid theme class
      const htmlClass = (await page.locator('html').getAttribute('class')) || '';
      expect(htmlClass.length).toBeGreaterThan(0);
    });
  });

  test.describe('Auth', () => {
    test('logout button destroys session and redirects to /login', async ({ page }) => {
      await gotoWithAuth(page, '/');

      // Click logout (aria-label="Sign out")
      const logoutButton = page.getByRole('button', { name: /sign out/i });
      await expect(logoutButton).toBeVisible({ timeout: 10000 });
      await logoutButton.click();

      // Should redirect to /login
      await page.waitForURL(/\/login/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/login/);

      // Verify login form is visible (session destroyed)
      const emailInput = page.locator('input#email');
      await expect(emailInput).toBeVisible();
    });
  });

  test.describe('Mobile Nav (375px)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('hamburger button opens navigation sheet', async ({ page }) => {
      await gotoWithAuth(page, '/');

      // Desktop nav should be hidden
      const desktopNav = page.locator('nav[aria-label="Main navigation"]');
      await expect(desktopNav).toBeHidden();

      // Hamburger button should be visible
      const menuButton = page.getByRole('button', { name: 'Open navigation menu' }).first();
      await expect(menuButton).toBeVisible({ timeout: 10000 });

      await menuButton.click();
      await page.waitForTimeout(500);

      // Sheet dialog should open
      const sheet = page.locator('[role="dialog"]');
      await expect(sheet).toBeVisible({ timeout: 5000 });

      // Sheet should contain all 5 nav items
      const sheetNav = sheet.locator('nav');
      await expect(sheetNav.getByText('Studio')).toBeVisible();
      await expect(sheetNav.getByText('Gallery')).toBeVisible();
      await expect(sheetNav.getByText('Pipeline')).toBeVisible();
      await expect(sheetNav.getByText('Library')).toBeVisible();
      await expect(sheetNav.getByText('Settings')).toBeVisible();
    });

    test('mobile nav items navigate correctly', async ({ page }) => {
      await gotoWithAuth(page, '/');

      // Open hamburger
      const menuButton = page.getByRole('button', { name: 'Open navigation menu' }).first();
      await menuButton.click();

      const sheet = page.locator('[role="dialog"]');
      await expect(sheet).toBeVisible();

      // Click Gallery in sheet
      await sheet.getByText('Gallery').click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/gallery/);
    });

    test('sheet closes after navigation', async ({ page }) => {
      await gotoWithAuth(page, '/');

      const menuButton = page.getByRole('button', { name: 'Open navigation menu' }).first();
      await menuButton.click();

      const sheet = page.locator('[role="dialog"]');
      await expect(sheet).toBeVisible();

      // Navigate via sheet
      await sheet.getByText('Settings').click();
      await page.waitForLoadState('networkidle');

      // Sheet should close after clicking a nav item
      await expect(sheet).toBeHidden({ timeout: 5000 });
    });
  });
});
