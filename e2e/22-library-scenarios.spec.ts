/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test';
import { LibraryPage } from './pages/library.page';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * Library — Scenarios (Installation Scenarios) Tab E2E Tests (10 tests)
 *
 * Covers:
 * - List / empty state
 * - New Scenario button
 * - Add Scenario form (title, description, type, room types, style tags, steps)
 * - Edit scenario
 * - Delete scenario with confirmation
 * - Scenario card details (type badge, room types, style tags, steps count)
 */

test.describe('Library — Scenarios Tab', { tag: '@library' }, () => {
  let libraryPage: LibraryPage;

  test.beforeEach(async ({ page }) => {
    libraryPage = new LibraryPage(page);
    await gotoWithAuth(page, '/library?tab=scenarios');
    await libraryPage.waitForTabContent();
  });

  // ----------------------------------------------------------------
  // List View (tests 1-3)
  // ----------------------------------------------------------------
  test('1 — Scenario list or empty state is visible', async ({ page }) => {
    // Either scenario cards or "No scenarios yet" empty state
    const scenarioCards = page.locator('[class*="Card"], [class*="card"]').filter({
      has: page.locator('h3, [class*="CardTitle"]'),
    });
    const emptyState = page.getByText(/No scenarios yet/i);
    const loadingState = page.locator('[role="status"][aria-busy="true"]');

    await expect(scenarioCards.first().or(emptyState).or(loadingState)).toBeVisible({ timeout: 10000 });
  });

  test('2 — New Scenario button is visible', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /New Scenario|Create First Scenario/i });
    await expect(newButton).toBeVisible({ timeout: 10000 });
  });

  test('3 — Scenario cards display type badge and description', async ({ page }) => {
    const scenarioCards = page.locator('[class*="Card"]').filter({
      has: page.locator('[class*="CardTitle"]'),
    });

    await expect(scenarioCards.first()).toBeVisible({ timeout: 10000 });
    const firstCard = scenarioCards.first();

    // Type badge (Room Type, Application, Before/After) or Description text
    const badge = firstCard.locator('[class*="badge"], [class*="Badge"]');
    const description = firstCard.locator('p');

    await expect(badge.first().or(description.first())).toBeVisible({ timeout: 5000 });
  });

  // ----------------------------------------------------------------
  // Create Scenario Form (tests 4-7)
  // ----------------------------------------------------------------
  test('4 — New Scenario button opens form dialog', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /New Scenario|Create First Scenario/i });
    await newButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText(/Create Installation Scenario/i)).toBeVisible();
  });

  test('5 — Form has title, description, scenario type, room types, style tags', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /New Scenario|Create First Scenario/i });
    await newButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Title input
    const titleInput = dialog.locator('input').first();
    await expect(titleInput).toBeVisible();

    // Description textarea
    const descriptionTextarea = dialog.locator('textarea');
    await expect(descriptionTextarea).toBeVisible();

    // Scenario Type dropdown
    const typeLabel = dialog.getByText(/Scenario Type/i);
    await expect(typeLabel).toBeVisible();

    // Room Types section with toggleable badges
    const roomTypesLabel = dialog.getByText(/Room Types/i);
    await expect(roomTypesLabel).toBeVisible();

    // Style Tags section with toggleable badges
    const styleTagsLabel = dialog.getByText(/Style Tags/i);
    await expect(styleTagsLabel).toBeVisible();
  });

  test('6 — Room type badges are toggleable', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /New Scenario|Create First Scenario/i });
    await newButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Find a room type badge (e.g., "living room")
    const livingRoomBadge = dialog
      .locator('[class*="badge"], [class*="Badge"]')
      .filter({ hasText: /living room/i })
      .first();

    await expect(livingRoomBadge).toBeVisible({ timeout: 5000 });
    // Click to toggle on
    await livingRoomBadge.click();
    await page.waitForTimeout(200);

    // Click again to toggle off
    await livingRoomBadge.click();
    await page.waitForTimeout(200);
  });

  test('7 — Cancel button closes the form dialog', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /New Scenario|Create First Scenario/i });
    await newButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const cancelButton = dialog.getByRole('button', { name: /Cancel/i });
    await cancelButton.click();

    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  // ----------------------------------------------------------------
  // Edit & Delete (tests 8-10)
  // ----------------------------------------------------------------
  test('8 — Scenario card edit button opens form with prefilled data', async ({ page }) => {
    const scenarioCards = page.locator('[class*="Card"]').filter({
      has: page.locator('[class*="CardTitle"]'),
    });

    await expect(scenarioCards.first()).toBeVisible({ timeout: 10000 });
    // Hover to reveal edit button
    await scenarioCards.first().hover();
    await page.waitForTimeout(300);

    // Click the edit (pencil) button
    const editButton = scenarioCards
      .first()
      .locator('button')
      .filter({
        has: page.locator('svg'),
      })
      .first();

    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    // Dialog title should say "Edit Scenario"
    await expect(dialog.getByText(/Edit Scenario/i)).toBeVisible();

    // Title field should be pre-filled
    const titleInput = dialog.locator('input').first();
    const titleValue = await titleInput.inputValue();
    expect(titleValue.length).toBeGreaterThan(0);
  });

  test('9 — Delete button opens confirmation dialog', async ({ page }) => {
    const scenarioCards = page.locator('[class*="Card"]').filter({
      has: page.locator('[class*="CardTitle"]'),
    });

    await expect(scenarioCards.first()).toBeVisible({ timeout: 10000 });
    await scenarioCards.first().hover();
    await page.waitForTimeout(300);

    // Delete button is the second button (trash icon)
    const buttons = scenarioCards
      .first()
      .locator('button')
      .filter({
        has: page.locator('svg'),
      });
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThanOrEqual(2);

    // Second button is typically delete
    await buttons.nth(1).click();
    await page.waitForTimeout(500);

    // Confirmation dialog
    const confirmDialog = page.locator('[role="dialog"]').filter({
      hasText: /Delete Scenario/i,
    });
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await expect(confirmDialog.getByText(/cannot be undone/i)).toBeVisible();
  });

  test('10 — Delete confirmation Cancel closes dialog without deleting', async ({ page }) => {
    const scenarioCards = page.locator('[class*="Card"]').filter({
      has: page.locator('[class*="CardTitle"]'),
    });

    await expect(scenarioCards.first()).toBeVisible({ timeout: 10000 });
    await scenarioCards.first().hover();
    await page.waitForTimeout(300);

    const buttons = scenarioCards
      .first()
      .locator('button')
      .filter({
        has: page.locator('svg'),
      });
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThanOrEqual(2);

    await buttons.nth(1).click();
    await page.waitForTimeout(500);

    const confirmDialog = page.locator('[role="dialog"]').filter({
      hasText: /Delete Scenario/i,
    });
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });

    const cancelButton = confirmDialog.getByRole('button', { name: /Cancel/i });
    await cancelButton.click();

    await expect(confirmDialog).not.toBeVisible({ timeout: 3000 });
  });
});
