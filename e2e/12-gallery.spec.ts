import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';
import { MOBILE } from './helpers/viewport';

/**
 * E2E Tests for Gallery Page (/gallery)
 *
 * Covers:
 * 1. Page load — heading, Back to Studio button, generation count
 * 2. Search/filter — search input, clear search, sort dropdown
 * 3. Gallery items — grid rendering, click to Studio, select checkbox, multi-select
 * 4. Delete — per-card delete (via selection), bulk delete, confirmation dialog
 * 5. Empty state — message + CTA
 * 6. Mobile — 2-column grid at 375px
 */

test.describe('Gallery Page', { tag: '@gallery' }, () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await expect(page.locator('h1').filter({ hasText: 'Gallery' })).toBeVisible({ timeout: 10000 });
  });

  // -- Page Load --

  test('displays Gallery heading', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Gallery' })).toBeVisible();
  });

  test('displays Back to Studio button', async ({ page }) => {
    const backBtn = page.getByRole('button', { name: /Studio/i }).first();
    await expect(backBtn).toBeVisible();
  });

  test('Back to Studio button navigates to /', async ({ page }) => {
    const backBtn = page.getByRole('button', { name: /Studio/i }).first();
    await backBtn.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
  });

  test('shows generation count when items exist', async ({ page }) => {
    // Either we see a count like "N generation(s)" or the empty state
    const countSpan = page.locator('span').filter({ hasText: /\d+ generation/ });
    const emptyState = page.getByText(/no generations yet/i);

    await expect(countSpan.or(emptyState)).toBeVisible({ timeout: 10000 });
  });

  // -- Search & Filter --

  test('search input is visible and accepts text', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search prompts...');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('test query');
    await expect(searchInput).toHaveValue('test query');
  });

  test('search input filters gallery items by prompt', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search prompts...');
    await searchInput.fill('xyznonexistentquery');
    await page.waitForTimeout(300);

    const cards = page.locator('.group.relative.aspect-square');
    const emptyState = page.getByText(/no generations yet/i);

    const cardCount = await cards.count();
    const hasEmpty = await emptyState.isVisible();

    // With a nonsense query we expect either 0 cards or the empty state
    expect(cardCount === 0 || hasEmpty).toBe(true);
  });

  test('clearing search input restores results', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search prompts...');
    const cards = page.locator('.group.relative.aspect-square');
    const initialCount = await cards.count();

    await searchInput.fill('xyznonexistent');
    await page.waitForTimeout(300);

    await searchInput.fill('');
    await page.waitForTimeout(300);

    const restoredCount = await cards.count();
    expect(restoredCount).toBe(initialCount);
  });

  test('sort dropdown displays Newest first and Oldest first options', async ({ page }) => {
    const sortTrigger = page
      .locator('button')
      .filter({ hasText: /newest|oldest/i })
      .first();
    await expect(sortTrigger).toBeVisible();

    await sortTrigger.click();
    await page.waitForTimeout(300);

    const newestOption = page.getByRole('option', { name: /Newest first/i });
    const oldestOption = page.getByRole('option', { name: /Oldest first/i });

    await expect(newestOption.or(oldestOption)).toBeVisible({ timeout: 5000 });
  });

  // -- Gallery Items --

  test('renders gallery grid when items exist', async ({ page }) => {
    const cards = page.locator('.group.relative.aspect-square');
    const emptyState = page.getByText(/no generations yet/i);

    const cardCount = await cards.count();
    const hasEmpty = await emptyState.isVisible();

    // Either grid has items or empty state is shown
    expect(cardCount > 0 || hasEmpty).toBe(true);
  });

  test('clicking a gallery card navigates to Studio with generation param', async ({ page }) => {
    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      test.skip(true, 'No gallery items to test');
      return;
    }

    await cards.first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/\?generation=/);
  });

  test('select checkbox selects item and shows bulk actions', async ({ page }) => {
    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      test.skip(true, 'No gallery items to test');
      return;
    }

    await cards.first().hover();
    await page.waitForTimeout(300);

    const selectBtn = cards.first().locator('button[aria-label^="Select generation"]');
    await selectBtn.click();
    await page.waitForTimeout(300);

    await expect(page.getByText(/1 selected/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Clear/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Delete/i })).toBeVisible();
  });

  test('multi-select shows correct count', async ({ page }) => {
    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount < 2) {
      test.skip(true, 'Need 2+ gallery items for multi-select');
      return;
    }

    await cards.nth(0).hover();
    await page.waitForTimeout(200);
    await cards.nth(0).locator('button[aria-label^="Select generation"]').click();
    await page.waitForTimeout(200);

    await cards.nth(1).hover();
    await page.waitForTimeout(200);
    await cards.nth(1).locator('button[aria-label^="Select generation"]').click();
    await page.waitForTimeout(200);

    await expect(page.getByText(/2 selected/i)).toBeVisible();
  });

  // -- Delete --

  test('bulk delete button triggers confirmation dialog', async ({ page }) => {
    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      test.skip(true, 'No gallery items to test deletion');
      return;
    }

    await cards.first().hover();
    await page.waitForTimeout(200);
    await cards.first().locator('button[aria-label^="Select generation"]').click();
    await page.waitForTimeout(200);

    const deleteBtn = page.getByRole('button', { name: /Delete/i });
    await deleteBtn.click();
    await page.waitForTimeout(500);

    // Confirmation dialog should appear
    await expect(page.getByText('Delete Generations')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/cannot be undone/i)).toBeVisible();
  });

  test('delete confirmation dialog has Cancel and Delete buttons', async ({ page }) => {
    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      test.skip(true, 'No gallery items to test deletion');
      return;
    }

    await cards.first().hover();
    await page.waitForTimeout(200);
    await cards.first().locator('button[aria-label^="Select generation"]').click();
    await page.waitForTimeout(200);

    await page.getByRole('button', { name: /Delete/i }).click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByRole('button', { name: /Cancel/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /^Delete$|^Deleting/ })).toBeVisible();
  });

  test('clear selection button deselects all items', async ({ page }) => {
    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      test.skip(true, 'No gallery items to test');
      return;
    }

    await cards.first().hover();
    await page.waitForTimeout(200);
    await cards.first().locator('button[aria-label^="Select generation"]').click();
    await page.waitForTimeout(200);

    await expect(page.getByText(/1 selected/i)).toBeVisible();

    await page.getByRole('button', { name: /Clear/i }).click();
    await page.waitForTimeout(200);

    await expect(page.getByText(/selected/i)).not.toBeVisible();
  });

  // -- Empty State --

  test('empty state shows message and Go to Studio CTA', async ({ page }) => {
    const emptyState = page.getByText(/no generations yet/i);
    const isEmptyVisible = await emptyState.isVisible();

    if (!isEmptyVisible) {
      // Gallery has items — verify we see the grid
      const cards = page.locator('.group.relative.aspect-square');
      expect(await cards.count()).toBeGreaterThan(0);
      return;
    }

    await expect(emptyState).toBeVisible();
    await expect(page.getByText(/create your first image/i)).toBeVisible();

    const ctaButton = page.getByRole('button', { name: /Go to Studio/i });
    await expect(ctaButton).toBeVisible();

    await ctaButton.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
  });
});

// -- Mobile --

test.describe('Gallery - Mobile', { tag: '@gallery' }, () => {
  test.use({ viewport: MOBILE });

  test('gallery grid adapts to 2-column layout at 375px', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await expect(page.locator('h1').filter({ hasText: 'Gallery' })).toBeVisible({ timeout: 10000 });

    // The grid should use grid-cols-2 at mobile width
    const grid = page.locator('.grid.grid-cols-2');
    const emptyState = page.getByText(/no generations yet/i);

    // One of: grid visible or empty state
    await expect(grid.or(emptyState)).toBeVisible({ timeout: 10000 });

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });
});
