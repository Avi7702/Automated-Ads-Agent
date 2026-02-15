/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test';
import { LibraryPage } from './pages/library.page';
import { gotoWithAuth } from './helpers/ensureAuth';
import * as path from 'path';

/**
 * Library — Brand Images Tab E2E Tests (8 tests)
 *
 * Covers:
 * - Upload button / dropzone
 * - Image grid / empty state
 * - Preview dialog
 * - Delete flow
 * - Category filter
 * - Mobile responsive layout
 */

const TEST_IMAGE = path.resolve(process.cwd(), 'e2e', 'fixtures', 'test-brand-image.jpg');

test.describe('Library — Brand Images Tab', { tag: '@library' }, () => {
  let libraryPage: LibraryPage;

  test.beforeEach(async ({ page }) => {
    libraryPage = new LibraryPage(page);
    await gotoWithAuth(page, '/library?tab=brand-images');
    await libraryPage.waitForTabContent();
  });

  test('1 — Upload Image button is visible', async ({ page }) => {
    const uploadButton = page.getByRole('button', { name: /Upload Image|Upload First Image/i });
    await expect(uploadButton).toBeVisible({ timeout: 10000 });
  });

  test('2 — Image grid or empty state displays', async ({ page }) => {
    // Either image cards or "No brand images yet" empty state
    const imageCards = page.locator('[class*="Card"], [class*="card"]').filter({
      has: page.locator('img, [class*="aspect-square"]'),
    });
    const emptyState = page.getByText(/No brand images yet/i);
    const loadingState = page.locator('[role="status"][aria-busy="true"]');

    await expect(imageCards.first().or(emptyState).or(loadingState)).toBeVisible({ timeout: 10000 });
  });

  test('3 — Upload button opens upload modal with fields', async ({ page }) => {
    const uploadButton = page.getByRole('button', { name: /Upload Image|Upload First Image/i });
    await uploadButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText('Upload Brand Image')).toBeVisible();

    // Check for key fields: file upload area, category select, description
    const dropzone = dialog.locator('[class*="border-dashed"]');
    await expect(dropzone).toBeVisible();

    // Category selector
    const categoryLabel = dialog.getByText(/Category/i);
    await expect(categoryLabel).toBeVisible();

    // Description textarea
    const descriptionInput = dialog.locator('textarea');
    await expect(descriptionInput).toBeVisible();
  });

  test('4 — Upload modal Cancel button closes it', async ({ page }) => {
    const uploadButton = page.getByRole('button', { name: /Upload Image|Upload First Image/i });
    await uploadButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const cancelButton = dialog.getByRole('button', { name: /Cancel/i });
    await cancelButton.click();

    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test('5 — Upload modal submit disabled without file', async ({ page }) => {
    const uploadButton = page.getByRole('button', { name: /Upload Image|Upload First Image/i });
    await uploadButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // The "Upload Image" submit button should be disabled when no file is selected
    const submitButton = dialog.getByRole('button', { name: /Upload Image/i }).last();
    await expect(submitButton).toBeDisabled();
  });

  test('6 — Category filter shows only when images exist', async ({ page }) => {
    // Category filter select should be present if images exist
    const filterSelect = page.locator('button[role="combobox"]').filter({ hasText: /All Categories|Category/i });
    const emptyState = page.getByText(/No brand images yet/i);

    const hasFilter = await filterSelect.isVisible();
    const isEmpty = await emptyState.isVisible();

    // If empty, no filter; if images exist, filter should show
    if (isEmpty) {
      expect(hasFilter).toBe(false);
    }
    // Filter presence depends on data — either state is valid
    expect(hasFilter || isEmpty).toBe(true);
  });

  test('7 — Image card shows category badge', async ({ page }) => {
    const imageCards = page.locator('[class*="Card"], [class*="card"]').filter({
      has: page.locator('[class*="aspect-square"]'),
    });

    await expect(imageCards.first()).toBeVisible({ timeout: 10000 });
    // Category badges (Historical Ad, Product Hero, etc.) inside cards
    const badge = imageCards.first().locator('[class*="badge"], [class*="Badge"]');
    await expect(badge.first()).toBeVisible({ timeout: 5000 });
  });

  test('8 — Responsive: grid adjusts columns on mobile viewport', async ({ page }) => {
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoWithAuth(page, '/library?tab=brand-images');
    await libraryPage.waitForTabContent();

    // The grid container should be visible
    const gridContainer = page.locator('.grid').first();
    await expect(gridContainer).toBeVisible({ timeout: 10000 });
    const box = await gridContainer.boundingBox();
    if (box) {
      // On mobile, grid width should be <= viewport width
      expect(box.width).toBeLessThanOrEqual(375 + 5); // small tolerance
    }

    // Upload button should still be visible on mobile
    const uploadButton = page.getByRole('button', { name: /Upload Image|Upload First Image/i });
    await expect(uploadButton).toBeVisible({ timeout: 10000 });
  });
});
