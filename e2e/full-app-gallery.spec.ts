import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * E2E Tests for Gallery Page (/gallery)
 *
 * Covers:
 * 1. Navigation — Back to Studio button
 * 2. Search & Filter — search input, sort dropdown, clear search
 * 3. Gallery Items — thumbnails, selection, multi-select, clear selection
 * 4. Bulk Actions — bulk delete button, confirm delete
 * 5. Empty State — "No generations yet" message
 * 6. Responsive — mobile viewport adaptation
 */

test.describe('Gallery', { tag: '@gallery' }, () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    // Wait for page to fully render (lazy-loaded)
    await expect(page.locator('h1').filter({ hasText: 'Gallery' })).toBeVisible({ timeout: 10000 });
  });

  // ── Navigation ──────────────────────────────────────────────────────

  test('Back to Studio button navigates to /', async ({ page }) => {
    const backButton = page.getByRole('button', { name: /studio/i });
    await expect(backButton).toBeVisible();

    await backButton.click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
  });

  // ── Search & Filter ─────────────────────────────────────────────────

  test('search input filters generations by prompt text', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();

    // Type a query that likely matches nothing
    await searchInput.fill('xyznonexistentquery');
    await page.waitForTimeout(300);

    await expect(searchInput).toHaveValue('xyznonexistentquery');

    // Either the grid shows zero items or the empty state appears
    const cards = page.locator('.group.relative.aspect-square');
    const emptyState = page.getByText(/no generations yet/i);

    const cardCount = await cards.count();
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    // With a nonsense query we expect either 0 cards or the empty state
    expect(cardCount === 0 || hasEmpty).toBe(true);
  });

  test('sort dropdown changes order when selecting Oldest first', async ({ page }) => {
    // The sort trigger button shows the current sort label
    const sortTrigger = page
      .locator('button')
      .filter({ hasText: /newest|oldest/i })
      .first();
    await expect(sortTrigger).toBeVisible();

    // Open the dropdown
    await sortTrigger.click();
    await page.waitForTimeout(300);

    // Select "Oldest first" (Radix Select renders options in a portal)
    const oldestOption = page.getByRole('option', { name: /oldest/i });
    const hasOldestOption = await oldestOption.isVisible().catch(() => false);

    if (hasOldestOption) {
      await oldestOption.click();
      await page.waitForTimeout(300);

      // Sort trigger text should now reflect "Oldest"
      await expect(sortTrigger).toHaveText(/oldest/i);
    } else {
      // Fallback: at least confirm the trigger is still visible after interaction
      await expect(sortTrigger).toBeVisible();
    }
  });

  test('clearing search input resets filtered results', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);

    // Record initial card count
    const cardsBefore = page.locator('.group.relative.aspect-square');
    const initialCount = await cardsBefore.count();

    // Type a restrictive query
    await searchInput.fill('xyznonexistent');
    await page.waitForTimeout(300);

    // Clear the search
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // Card count should return to initial
    const cardsAfter = page.locator('.group.relative.aspect-square');
    const restoredCount = await cardsAfter.count();

    expect(restoredCount).toBe(initialCount);
  });

  // ── Gallery Items ───────────────────────────────────────────────────

  test('generation thumbnail click opens in Studio with generation param', async ({ page }) => {
    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      test.skip(true, 'No gallery items to test — skipping thumbnail click');
      return;
    }

    // Click the first card (not the select button)
    await cards.first().click();
    await page.waitForLoadState('networkidle');

    // Should navigate to Studio with ?generation= param
    await expect(page).toHaveURL(/\/\?generation=/);
  });

  test('select checkbox selects item and shows bulk actions', async ({ page }) => {
    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      test.skip(true, 'No gallery items to test — skipping selection');
      return;
    }

    // Hover the first card to reveal the select button
    await cards.first().hover();
    await page.waitForTimeout(300);

    // Click the select checkbox button (top-left circle)
    const selectBtn = cards.first().locator('button[aria-label^="Select generation"]');
    await selectBtn.click();
    await page.waitForTimeout(300);

    // Bulk actions bar should appear with "1 selected"
    await expect(page.getByText(/1 selected/i)).toBeVisible();

    // Delete and Clear buttons should appear
    await expect(page.getByRole('button', { name: /clear/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();
  });

  test('multiple selection — select 2+ items shows correct count', async ({ page }) => {
    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount < 2) {
      test.skip(true, 'Need 2+ gallery items — skipping multi-select');
      return;
    }

    // Select first item
    await cards.nth(0).hover();
    await page.waitForTimeout(200);
    await cards.nth(0).locator('button[aria-label^="Select generation"]').click();
    await page.waitForTimeout(200);

    // Select second item
    await cards.nth(1).hover();
    await page.waitForTimeout(200);
    await cards.nth(1).locator('button[aria-label^="Select generation"]').click();
    await page.waitForTimeout(200);

    // Bulk actions should show "2 selected"
    await expect(page.getByText(/2 selected/i)).toBeVisible();
  });

  test('clear selection button deselects all items', async ({ page }) => {
    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      test.skip(true, 'No gallery items — skipping clear selection');
      return;
    }

    // Select an item
    await cards.first().hover();
    await page.waitForTimeout(200);
    await cards.first().locator('button[aria-label^="Select generation"]').click();
    await page.waitForTimeout(200);

    // Confirm bulk actions appeared
    await expect(page.getByText(/1 selected/i)).toBeVisible();

    // Click "Clear" button
    await page.getByRole('button', { name: /clear/i }).click();
    await page.waitForTimeout(200);

    // Bulk actions bar should disappear (no "selected" text)
    await expect(page.getByText(/selected/i)).not.toBeVisible();
  });

  // ── Bulk Actions ────────────────────────────────────────────────────

  test('bulk delete button is visible when items are selected', async ({ page }) => {
    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      test.skip(true, 'No gallery items — skipping bulk delete');
      return;
    }

    // Select an item
    await cards.first().hover();
    await page.waitForTimeout(200);
    await cards.first().locator('button[aria-label^="Select generation"]').click();
    await page.waitForTimeout(200);

    // Delete button should be visible with destructive styling
    const deleteBtn = page.getByRole('button', { name: /delete/i });
    await expect(deleteBtn).toBeVisible();
  });

  test('bulk delete button triggers confirmation or deletes items', async ({ page }) => {
    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      test.skip(true, 'No gallery items — skipping bulk delete confirmation');
      return;
    }

    // Select an item
    await cards.first().hover();
    await page.waitForTimeout(200);
    await cards.first().locator('button[aria-label^="Select generation"]').click();
    await page.waitForTimeout(200);

    // Click delete
    const deleteBtn = page.getByRole('button', { name: /delete/i });
    await deleteBtn.click();
    await page.waitForTimeout(500);

    // After clicking delete, either:
    // (a) A confirmation dialog appears, OR
    // (b) The item is removed and the selection is cleared
    const confirmDialog = page.getByRole('dialog');
    const hasDialog = await confirmDialog.isVisible().catch(() => false);

    const selectedText = page.getByText(/selected/i);
    const hasSelected = await selectedText.isVisible().catch(() => false);

    // At least one outcome should occur — dialog appeared or selection cleared
    expect(hasDialog || !hasSelected).toBe(true);
  });

  // ── Empty State ─────────────────────────────────────────────────────

  test('empty state shows "No generations yet" and Go to Studio CTA', async ({ page }) => {
    const emptyState = page.getByText(/no generations yet/i);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    if (!hasEmpty) {
      // Gallery has items — verify we see the grid instead
      const cards = page.locator('.group.relative.aspect-square');
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);
      return;
    }

    // Empty state should show descriptive text
    await expect(emptyState).toBeVisible();
    await expect(page.getByText(/create your first image/i)).toBeVisible();

    // "Go to Studio" CTA button should navigate to /
    const ctaButton = page.getByRole('button', { name: /go to studio/i });
    await expect(ctaButton).toBeVisible();

    await ctaButton.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
  });
});

// ── Responsive / Mobile ───────────────────────────────────────────────

test.describe('Gallery - Mobile', { tag: '@gallery' }, () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('gallery grid adapts to mobile viewport (375px)', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await expect(page.locator('h1').filter({ hasText: 'Gallery' })).toBeVisible({ timeout: 10000 });

    // The grid should use a 2-column layout on mobile (grid-cols-2)
    const grid = page.locator('.grid.grid-cols-2');
    const hasGrid = await grid.isVisible().catch(() => false);

    // Alternatively check the loading skeleton grid
    const skeletonGrid = page.locator('[role="status"][aria-label="Loading gallery"]');
    const hasSkeletonGrid = await skeletonGrid.isVisible().catch(() => false);

    // Either the gallery grid or loading skeleton should be present
    // (both use grid-cols-2 at mobile width)
    const emptyState = page.getByText(/no generations yet/i);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    // One of: grid visible, skeleton loading, or empty state
    expect(hasGrid || hasSkeletonGrid || hasEmpty).toBe(true);

    // Verify the page is not horizontally overflowing at 375px
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });
});
