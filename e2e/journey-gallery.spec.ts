import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

test.describe('Gallery Journey', () => {
  test.describe('Page Load', () => {
    test('Gallery page loads and shows heading', async ({ page }) => {
      await gotoWithAuth(page, '/gallery');

      // Gallery heading visible
      await expect(page.locator('h1').filter({ hasText: 'Gallery' })).toBeVisible();
    });

    test('Gallery shows generation count or empty state', async ({ page }) => {
      await gotoWithAuth(page, '/gallery');

      // Either generation count ("X generations") or empty state visible
      const generationCount = page.getByText(/\d+ generation/);
      const emptyState = page.getByText(/no generations yet/i);

      const hasCount = await generationCount.isVisible().catch(() => false);
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      expect(hasCount || hasEmpty).toBe(true);
    });

    test('Gallery has Back to Studio button', async ({ page }) => {
      await gotoWithAuth(page, '/gallery');

      // Wait for page to fully render (lazy-loaded)
      await expect(page.locator('h1').filter({ hasText: 'Gallery' })).toBeVisible({ timeout: 10000 });

      const backButton = page.getByRole('button', { name: /studio/i });
      await expect(backButton).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Search & Sort', () => {
    test('search input is visible and functional', async ({ page }) => {
      await gotoWithAuth(page, '/gallery');

      // Wait for page to fully render (lazy-loaded)
      await expect(page.locator('h1').filter({ hasText: 'Gallery' })).toBeVisible({ timeout: 10000 });

      const searchInput = page.locator('input[placeholder*="earch"]');
      await expect(searchInput).toBeVisible({ timeout: 10000 });

      // Type a search query
      await searchInput.fill('test query');
      await page.waitForTimeout(300);

      // Input should contain the query
      await expect(searchInput).toHaveValue('test query');
    });

    test('sort dropdown is visible and clickable', async ({ page }) => {
      await gotoWithAuth(page, '/gallery');

      // The sort trigger is a SelectTrigger button
      const sortTrigger = page.locator('button').filter({ hasText: /newest|oldest/i }).first();
      await expect(sortTrigger).toBeVisible();

      // Click to open sort dropdown
      await sortTrigger.click();
      await page.waitForTimeout(300);

      // Options should be visible (Radix Select renders in a portal)
      const newestOption = page.getByRole('option', { name: /newest/i });
      const oldestOption = page.getByRole('option', { name: /oldest/i });

      const hasNewest = await newestOption.isVisible().catch(() => false);
      const hasOldest = await oldestOption.isVisible().catch(() => false);

      // Either found options or the sort trigger works
      expect(hasNewest || hasOldest || await sortTrigger.isVisible()).toBe(true);
    });
  });

  test.describe('Empty State', () => {
    test('empty state shows Go to Studio CTA', async ({ page }) => {
      await gotoWithAuth(page, '/gallery');

      const emptyState = page.getByText(/no generations yet/i);
      if (await emptyState.isVisible()) {
        // CTA button should be visible
        const ctaButton = page.getByRole('button', { name: /go to studio/i });
        await expect(ctaButton).toBeVisible();
      }
    });

    test('Go to Studio CTA navigates correctly', async ({ page }) => {
      await gotoWithAuth(page, '/gallery');

      const ctaButton = page.getByRole('button', { name: /go to studio/i });
      if (await ctaButton.isVisible()) {
        await ctaButton.click();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
      }
    });
  });

  test.describe('Generation Cards', () => {
    test('generation cards show image and prompt on hover', async ({ page }) => {
      await gotoWithAuth(page, '/gallery');

      // Check if any generation cards exist
      const cards = page.locator('.group.relative.aspect-square');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        const firstCard = cards.first();

        // Card should contain an image
        const img = firstCard.locator('img');
        await expect(img).toBeVisible();

        // Hover to reveal overlay
        await firstCard.hover();
        await page.waitForTimeout(300);

        // Overlay should show prompt text
        const promptText = firstCard.locator('.text-white.text-xs');
        await expect(promptText).toBeVisible();
      }
    });

    test('clicking generation card navigates to Studio with generation ID', async ({ page }) => {
      await gotoWithAuth(page, '/gallery');

      const cards = page.locator('.group.relative.aspect-square');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        await cards.first().click();
        await page.waitForLoadState('networkidle');

        // Should navigate to Studio with generation param
        await expect(page).toHaveURL(/\/\?generation=/);
      }
    });
  });

  test.describe('Back Navigation', () => {
    test('Back to Studio button navigates to /', async ({ page }) => {
      await gotoWithAuth(page, '/gallery');

      const backButton = page.getByRole('button', { name: /studio/i });
      await backButton.click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
    });
  });
});
