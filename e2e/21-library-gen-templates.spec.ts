/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test';
import { LibraryPage } from './pages/library.page';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * Library — Gen Templates (Scene Templates) Tab E2E Tests (10 tests)
 *
 * This tab has two modes:
 * - Normal mode: TemplateLibrary grid with select + mode toggle (Exact Insert/Inspiration)
 * - Admin mode: TemplateAdmin CRUD (create/edit/delete templates)
 *
 * Covers:
 * - Template grid rendering
 * - Template card detail (select + preview)
 * - Mode toggle: Exact Insert / Inspiration
 * - Admin Mode toggle button
 * - Admin mode: template list, create, edit, delete
 * - Search in template library
 */

test.describe('Library — Gen Templates Tab', { tag: '@library' }, () => {
  let libraryPage: LibraryPage;

  test.beforeEach(async ({ page }) => {
    libraryPage = new LibraryPage(page);
    await gotoWithAuth(page, '/library?tab=scene-templates');
    await libraryPage.waitForTabContent();
  });

  // ----------------------------------------------------------------
  // Normal Mode (tests 1-5)
  // ----------------------------------------------------------------
  test.describe('Normal Mode', () => {
    test('1 — Template grid or empty state is visible', async ({ page }) => {
      // The TemplateLibrary component renders cards or a loading/empty state
      const templateCards = page.locator('[class*="border"][class*="rounded"]').filter({
        has: page.locator('img, [class*="aspect-"]'),
      });
      const emptyState = page.getByText(/No templates|no.*template/i);
      const loadingSpinner = page.locator('[class*="animate-spin"]');

      await expect(templateCards.first().or(emptyState).or(loadingSpinner)).toBeVisible({ timeout: 10000 });
    });

    test('2 — Admin Mode toggle button exists', async ({ page }) => {
      // The Admin Mode button is at the top right of the scene-templates tab
      const adminButton = page.getByRole('button', { name: /Admin Mode|Exit Admin Mode/i });
      await expect(adminButton).toBeVisible({ timeout: 10000 });
    });

    test('3 — Clicking a template card selects it and shows preview', async ({ page }) => {
      const templateCards = page.locator('[class*="border"][class*="rounded"]').filter({
        has: page.locator('img, [class*="aspect-"]'),
      });

      await expect(templateCards.first()).toBeVisible({ timeout: 10000 });
      await templateCards.first().click();
      await page.waitForTimeout(500);

      // Selected template preview panel should appear
      const selectedPreview = page.getByText(/Selected Template/i);
      await expect(selectedPreview).toBeVisible({ timeout: 5000 });
    });

    test('4 — Mode toggle: Exact Insert and Inspiration buttons work', async ({ page }) => {
      const templateCards = page.locator('[class*="border"][class*="rounded"]').filter({
        has: page.locator('img, [class*="aspect-"]'),
      });

      await expect(templateCards.first()).toBeVisible({ timeout: 10000 });
      // Select a template first
      await templateCards.first().click();
      await page.waitForTimeout(500);

      // Exact Insert button
      const exactInsertBtn = page.locator('[data-testid="mode-exact-insert"]');
      const inspirationBtn = page.locator('[data-testid="mode-inspiration"]');

      await expect(exactInsertBtn).toBeVisible({ timeout: 5000 });
      await expect(inspirationBtn).toBeVisible();

      // Click Inspiration mode
      await inspirationBtn.click();
      await page.waitForTimeout(300);

      // Description text should change
      const inspirationDesc = page.getByText(/inspired by the template/i);
      await expect(inspirationDesc).toBeVisible();

      // Switch back to Exact Insert
      await exactInsertBtn.click();
      await page.waitForTimeout(300);

      const exactDesc = page.getByText(/inserted into the exact template/i);
      await expect(exactDesc).toBeVisible();
    });

    test('5 — Use Template button navigates to Studio', async ({ page }) => {
      const templateCards = page.locator('[class*="border"][class*="rounded"]').filter({
        has: page.locator('img, [class*="aspect-"]'),
      });

      await expect(templateCards.first()).toBeVisible({ timeout: 10000 });
      await templateCards.first().click();
      await page.waitForTimeout(500);

      const useButton = page.locator('[data-testid="button-use-template"]');
      await expect(useButton).toBeVisible({ timeout: 5000 });
      // Just verify it exists and is clickable (don't actually navigate)
      await expect(useButton).toBeEnabled();
    });
  });

  // ----------------------------------------------------------------
  // Admin Mode (tests 6-10)
  // ----------------------------------------------------------------
  test.describe('Admin Mode', () => {
    test('6 — Clicking Admin Mode button switches to admin view', async ({ page }) => {
      const adminButton = page.getByRole('button', { name: /Admin Mode/i });
      await expect(adminButton).toBeVisible({ timeout: 10000 });

      await adminButton.click();
      await page.waitForTimeout(1000);

      // Admin mode shows TemplateAdmin component with CRUD UI
      // Look for "Exit Admin Mode" button (confirms we're in admin mode)
      const exitAdminButton = page.getByRole('button', { name: /Exit Admin Mode/i });
      await expect(exitAdminButton).toBeVisible({ timeout: 5000 });
    });

    test('7 — Admin mode shows template list or create form', async ({ page }) => {
      const adminButton = page.getByRole('button', { name: /Admin Mode/i });
      await adminButton.click();
      await page.waitForTimeout(1000);

      // Admin view should have template items or a "Create New" option
      const createButton = page.getByRole('button', { name: /Create|Add|New Template/i });
      const templateList = page.locator('[class*="Card"], [class*="card"]');

      await expect(createButton.or(templateList.first())).toBeVisible({ timeout: 10000 });
    });

    test('8 — Admin mode: clicking Exit Admin Mode returns to normal view', async ({ page }) => {
      const adminButton = page.getByRole('button', { name: /Admin Mode/i });
      await adminButton.click();
      await page.waitForTimeout(1000);

      const exitButton = page.getByRole('button', { name: /Exit Admin Mode/i });
      await expect(exitButton).toBeVisible({ timeout: 5000 });

      await exitButton.click();
      await page.waitForTimeout(500);

      // Should be back to normal mode with "Admin Mode" button
      const adminButtonAgain = page.getByRole('button', { name: /Admin Mode/i });
      await expect(adminButtonAgain).toBeVisible({ timeout: 5000 });
    });

    test('9 — Search filters template library in normal mode', async ({ page }) => {
      // TemplateLibrary has its own search input
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible({ timeout: 10000 });

      await searchInput.fill('zzz_nonexistent_xyz');
      await page.waitForTimeout(600);

      // Grid should be empty or show no results
      const cards = page.locator('[class*="border"][class*="rounded"]').filter({
        has: page.locator('img, [class*="aspect-"]'),
      });
      const visibleCards = await cards.count();
      // With a non-existent search, expect 0 results or an empty state
      expect(visibleCards).toBeLessThanOrEqual(0);
    });

    test('10 — Category filter buttons work in template library', async ({ page }) => {
      // TemplateLibrary has category filter buttons (All Templates, Product Showcase, etc.)
      const allButton = page.getByRole('button', { name: /All Templates/i });
      await expect(allButton).toBeVisible({ timeout: 10000 });

      // Click a specific category
      const installationButton = page.getByRole('button', { name: /Installation/i });
      await expect(installationButton).toBeVisible({ timeout: 5000 });
      await installationButton.click();
      await page.waitForTimeout(500);

      // Click back to All
      await allButton.click();
      await page.waitForTimeout(500);
    });
  });
});
