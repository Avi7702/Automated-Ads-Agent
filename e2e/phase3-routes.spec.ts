import { test, expect } from '@playwright/test';
import { StudioPage } from './pages/studio.page';
import { LibraryPage } from './pages/library.page';
import { SettingsPage } from './pages/settings.page';

/**
 * Phase 3 Route Consolidation Tests
 *
 * Verifies that:
 * 1. Legacy routes redirect to consolidated routes
 * 2. URL parameters are preserved/transformed correctly
 * 3. Navigation highlights correct items
 * 4. No duplicate headers in embedded pages
 */

test.describe('Phase 3: Route Consolidation', () => {
  // Use the stored auth state from auth.setup.ts
  // No need to login before each test - Playwright handles this via storageState
  test.beforeEach(async ({ page }) => {
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Main Routes', () => {
    test('Studio page loads at root path', async ({ page }) => {
      const studioPage = new StudioPage(page);
      await studioPage.goto();

      expect(page.url()).toMatch(/\/$/);
      expect(await studioPage.isVisible()).toBe(true);
    });

    test('Library page loads with Products tab by default', async ({ page }) => {
      const libraryPage = new LibraryPage(page);
      await libraryPage.goto();

      expect(page.url()).toContain('/library');
      expect(await libraryPage.isVisible()).toBe(true);
    });

    test('Settings page loads with Brand section by default', async ({ page }) => {
      const settingsPage = new SettingsPage(page);
      await settingsPage.goto();

      expect(page.url()).toContain('/settings');
      expect(await settingsPage.isVisible()).toBe(true);
    });
  });

  test.describe('Library Route Redirects', () => {
    test('/products redirects to /library?tab=products', async ({ page }) => {
      await page.goto('/products');
      await page.waitForURL(/\/library.*tab=products/);

      const libraryPage = new LibraryPage(page);
      expect(await libraryPage.hasTabInUrl('products')).toBe(true);
    });

    test('/brand-images redirects to /library?tab=brand-images', async ({ page }) => {
      await page.goto('/brand-images');
      await page.waitForURL(/\/library.*tab=brand-images/);

      const libraryPage = new LibraryPage(page);
      expect(await libraryPage.hasTabInUrl('brand-images')).toBe(true);
    });

    test('/template-library redirects to /library?tab=templates', async ({ page }) => {
      await page.goto('/template-library');
      await page.waitForURL(/\/library.*tab=templates/);

      const libraryPage = new LibraryPage(page);
      expect(await libraryPage.hasTabInUrl('templates')).toBe(true);
    });

    test('/templates redirects to /library?tab=scene-templates', async ({ page }) => {
      await page.goto('/templates');
      await page.waitForURL(/\/library.*tab=scene-templates/);

      const libraryPage = new LibraryPage(page);
      expect(await libraryPage.hasTabInUrl('scene-templates')).toBe(true);
    });

    test('/installation-scenarios redirects to /library?tab=scenarios', async ({ page }) => {
      await page.goto('/installation-scenarios');
      await page.waitForURL(/\/library.*tab=scenarios/);

      const libraryPage = new LibraryPage(page);
      expect(await libraryPage.hasTabInUrl('scenarios')).toBe(true);
    });

    test('/learn-from-winners redirects to /library?tab=patterns', async ({ page }) => {
      await page.goto('/learn-from-winners');
      await page.waitForURL(/\/library.*tab=patterns/);

      const libraryPage = new LibraryPage(page);
      expect(await libraryPage.hasTabInUrl('patterns')).toBe(true);
    });
  });

  test.describe('Settings Route Redirects', () => {
    test('/brand-profile redirects to /settings', async ({ page }) => {
      await page.goto('/brand-profile');
      await page.waitForURL(/\/settings/);

      const settingsPage = new SettingsPage(page);
      expect(await settingsPage.isVisible()).toBe(true);
    });

    test('/settings/api-keys redirects to /settings?section=api-keys', async ({ page }) => {
      await page.goto('/settings/api-keys');
      await page.waitForURL(/\/settings.*section=api-keys/);

      const settingsPage = new SettingsPage(page);
      expect(await settingsPage.hasSectionInUrl('api-keys')).toBe(true);
    });

    test('/usage redirects to /settings?section=usage', async ({ page }) => {
      await page.goto('/usage');
      await page.waitForURL(/\/settings.*section=usage/);

      const settingsPage = new SettingsPage(page);
      expect(await settingsPage.hasSectionInUrl('usage')).toBe(true);
    });
  });

  test.describe('Studio Route Redirects', () => {
    test('/gallery redirects to /?view=history', async ({ page }) => {
      await page.goto('/gallery');
      await page.waitForURL(/\/\?.*view=history/);

      expect(page.url()).toContain('view=history');
    });
  });

  test.describe('Library Tab Navigation', () => {
    test('clicking tabs updates URL', async ({ page }) => {
      const libraryPage = new LibraryPage(page);
      await libraryPage.goto();

      // Click Brand Images tab
      await libraryPage.clickTab('brand-images');
      await page.waitForURL(/tab=brand-images/);
      expect(await libraryPage.hasTabInUrl('brand-images')).toBe(true);

      // Click Templates tab
      await libraryPage.clickTab('templates');
      await page.waitForURL(/tab=templates/);
      expect(await libraryPage.hasTabInUrl('templates')).toBe(true);
    });

    test('direct URL with tab parameter loads correct tab', async ({ page }) => {
      const libraryPage = new LibraryPage(page);
      await libraryPage.gotoTab('patterns');

      expect(await libraryPage.hasTabInUrl('patterns')).toBe(true);
      await libraryPage.waitForTabContent();
    });
  });

  test.describe('No Duplicate Headers', () => {
    test('Library page has single header', async ({ page }) => {
      const libraryPage = new LibraryPage(page);
      await libraryPage.goto();
      await libraryPage.waitForTabContent();

      expect(await libraryPage.hasDuplicateHeaders()).toBe(false);
    });

    test('Settings page has single header', async ({ page }) => {
      const settingsPage = new SettingsPage(page);
      await settingsPage.goto();
      await settingsPage.waitForSectionContent();

      expect(await settingsPage.hasDuplicateHeaders()).toBe(false);
    });

    test('Library tabs have no duplicate headers', async ({ page }) => {
      const libraryPage = new LibraryPage(page);

      // Check each tab
      const tabs = ['products', 'brand-images', 'templates', 'scene-templates', 'scenarios', 'patterns'] as const;

      for (const tab of tabs) {
        await libraryPage.gotoTab(tab);
        await libraryPage.waitForTabContent();
        expect(await libraryPage.hasDuplicateHeaders()).toBe(false);
      }
    });
  });

  test.describe('Navigation Highlighting', () => {
    test('Studio nav item is highlighted on root path', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // The active nav item has bg-primary/10 class for highlighting
      const studioNav = page.locator('nav span').filter({ hasText: 'Studio' });
      await expect(studioNav).toHaveClass(/bg-primary/);
    });

    test('Library nav item is highlighted on /library', async ({ page }) => {
      await page.goto('/library');
      await page.waitForLoadState('networkidle');

      const libraryNav = page.locator('nav span').filter({ hasText: 'Library' });
      await expect(libraryNav).toHaveClass(/bg-primary/);
    });

    test('Settings nav item is highlighted on /settings', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      const settingsNav = page.locator('nav span').filter({ hasText: 'Settings' });
      await expect(settingsNav).toHaveClass(/bg-primary/);
    });
  });
});
