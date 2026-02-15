/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test';
import { LibraryPage } from './pages/library.page';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * Library — Ad References (Templates) Tab E2E Tests (8 tests)
 *
 * Covers:
 * - Grid / empty state
 * - Template card with detail dialog
 * - Use Template action
 * - Search and filter (category, platform)
 * - Platform badges on cards
 * - Add Reference button
 */

test.describe('Library — Ad References Tab', { tag: '@library' }, () => {
  let libraryPage: LibraryPage;

  test.beforeEach(async ({ page }) => {
    libraryPage = new LibraryPage(page);
    await gotoWithAuth(page, '/library?tab=templates');
    await libraryPage.waitForTabContent();
  });

  test('1 — Template grid or empty state is visible', async ({ page }) => {
    // Either template cards or "No ad references yet" empty state
    const templateCards = page.locator('[class*="rounded-2xl"][class*="border"]').filter({
      has: page.locator('[class*="aspect-"]'),
    });
    const emptyState = page.getByText(/No ad references yet|No matching ad references/i);
    const skeletons = page.locator('[class*="Skeleton"]');

    await expect(templateCards.first().or(emptyState).or(skeletons.first())).toBeVisible({ timeout: 10000 });
  });

  test('2 — Add Reference button is visible', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /Add Reference|Add First Reference/i });
    await expect(addButton).toBeVisible({ timeout: 10000 });
  });

  test('3 — Clicking a template card opens detail dialog', async ({ page }) => {
    // Find any template card
    const cards = page.locator('[class*="rounded-2xl"][class*="border"]').filter({
      has: page.locator('[class*="aspect-"]'),
    });

    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    await cards.first().click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Dialog should show template details: performance metrics, style, platforms
    const performanceSection = dialog.getByText(/Performance Metrics/i);
    const styleSection = dialog.getByText(/Style/i);
    await expect(performanceSection.or(styleSection)).toBeVisible({ timeout: 5000 });
  });

  test('4 — Detail dialog has Use This Template button', async ({ page }) => {
    const cards = page.locator('[class*="rounded-2xl"][class*="border"]').filter({
      has: page.locator('[class*="aspect-"]'),
    });

    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    await cards.first().click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const useButton = dialog.getByRole('button', { name: /Use This Template/i });
    await expect(useButton).toBeVisible();
  });

  test('5 — Search input filters templates', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search ad references"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    await searchInput.fill('zzz_nonexistent_template_xyz');
    await page.waitForTimeout(600);

    // Should show no matching results or empty grid
    const emptyState = page.getByText(/No matching ad references/i);
    const cards = page.locator('[class*="rounded-2xl"][class*="border"]').filter({
      has: page.locator('[class*="aspect-"]'),
    });
    const cardCount = await cards.count();
    const hasEmpty = await emptyState.isVisible();

    expect(cardCount === 0 || hasEmpty).toBe(true);
  });

  test('6 — Category filter dropdown is functional', async ({ page }) => {
    // Category select trigger
    const categorySelect = page.locator('button[role="combobox"]').filter({
      hasText: /All Categories|Category/i,
    });

    await expect(categorySelect).toBeVisible({ timeout: 10000 });
    await categorySelect.click();
    await page.waitForTimeout(300);

    // Dropdown should show category options
    const dropdownContent = page.locator('[role="listbox"], [data-radix-select-content]');
    await expect(dropdownContent).toBeVisible({ timeout: 3000 });

    // Should have at least "All Categories" and one other category
    const options = dropdownContent.locator('[role="option"]');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(0);

    // Close by pressing Escape
    await page.keyboard.press('Escape');
  });

  test('7 — Platform filter dropdown is functional', async ({ page }) => {
    // Platform select trigger
    const platformSelect = page.locator('button[role="combobox"]').filter({
      hasText: /All Platforms|Platform/i,
    });

    await expect(platformSelect).toBeVisible({ timeout: 10000 });
    await platformSelect.click();
    await page.waitForTimeout(300);

    const dropdownContent = page.locator('[role="listbox"], [data-radix-select-content]');
    await expect(dropdownContent).toBeVisible({ timeout: 3000 });

    const options = dropdownContent.locator('[role="option"]');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(0);

    await page.keyboard.press('Escape');
  });

  test('8 — Template cards show platform icons', async ({ page }) => {
    const cards = page.locator('[class*="rounded-2xl"][class*="border"]').filter({
      has: page.locator('[class*="aspect-"]'),
    });

    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const firstCard = cards.first();

    // Each card should have category badges and possibly platform icons (svg)
    const badges = firstCard.locator('[class*="badge"], [class*="Badge"]');
    const svgIcons = firstCard.locator('svg');

    await expect(badges.first().or(svgIcons.first())).toBeVisible({ timeout: 5000 });
  });
});
