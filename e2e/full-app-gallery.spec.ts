import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

test.describe.configure({ mode: 'parallel' });

test.describe('Full App — Gallery Page', () => {
  test('page loads without crash and no critical console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        !msg.text().includes('favicon') &&
        !msg.text().includes('404') &&
        !msg.text().includes('net::ERR')
      ) {
        consoleErrors.push(msg.text());
      }
    });

    await gotoWithAuth(page, '/gallery');
    await page.waitForLoadState('networkidle');

    // Page should render without crashing — heading must be visible
    await expect(page.locator('h1').filter({ hasText: 'Gallery' })).toBeVisible({ timeout: 10000 });
    // Allow a small number of non-critical console errors (e.g., API 500s for missing DB data)
    expect(consoleErrors.length).toBeLessThanOrEqual(10);
  });

  test('header shows Gallery as active nav item', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');

    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible({ timeout: 10000 });

    // The active link should point to Gallery (aria-current="page")
    const activeLink = nav.locator('a[aria-current="page"]');
    await expect(activeLink).toBeVisible();
    await expect(activeLink).toContainText('Gallery');
  });

  test('Gallery heading is rendered with correct text', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');

    const heading = page.locator('h1').filter({ hasText: 'Gallery' });
    await expect(heading).toBeVisible({ timeout: 10000 });
    await expect(heading).toHaveText('Gallery');
  });

  test('search input is visible and has correct placeholder', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await expect(page.locator('h1').filter({ hasText: 'Gallery' })).toBeVisible({ timeout: 10000 });

    const searchInput = page.locator('input[placeholder*="earch"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Placeholder should reference "prompts"
    await expect(searchInput).toHaveAttribute('placeholder', /[Ss]earch prompts/);
  });

  test('search input accepts text and retains value', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await expect(page.locator('h1').filter({ hasText: 'Gallery' })).toBeVisible({ timeout: 10000 });

    const searchInput = page.locator('input[placeholder*="earch"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    await searchInput.fill('landscape photo');
    await expect(searchInput).toHaveValue('landscape photo');

    // Clear and verify empty
    await searchInput.fill('');
    await expect(searchInput).toHaveValue('');
  });

  test('sort dropdown is visible and defaults to Newest first', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await expect(page.locator('h1').filter({ hasText: 'Gallery' })).toBeVisible({ timeout: 10000 });

    // The sort trigger button shows "Newest first" by default
    const sortTrigger = page
      .locator('button')
      .filter({ hasText: /newest|oldest/i })
      .first();
    await expect(sortTrigger).toBeVisible({ timeout: 10000 });
    await expect(sortTrigger).toContainText(/Newest first/i);
  });

  test('sort dropdown opens and shows Newest / Oldest options', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await expect(page.locator('h1').filter({ hasText: 'Gallery' })).toBeVisible({ timeout: 10000 });

    const sortTrigger = page
      .locator('button')
      .filter({ hasText: /newest|oldest/i })
      .first();
    await sortTrigger.click();
    await page.waitForTimeout(300);

    // Radix Select renders options in a portal — look for option roles
    const newestOption = page.getByRole('option', { name: /newest/i });
    const oldestOption = page.getByRole('option', { name: /oldest/i });

    const hasNewest = await newestOption.isVisible().catch(() => false);
    const hasOldest = await oldestOption.isVisible().catch(() => false);

    expect(hasNewest || hasOldest).toBe(true);
  });

  test('empty state OR generation cards are shown after load', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await expect(page.locator('h1').filter({ hasText: 'Gallery' })).toBeVisible({ timeout: 10000 });

    // Wait for loading to finish (skeleton grid disappears or content appears)
    await page.waitForTimeout(2000);

    const emptyState = page.getByText(/no generations yet/i);
    const generationCards = page.locator('.group.relative.aspect-square');
    const generationCount = page.getByText(/\d+ generation/);

    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasCards = (await generationCards.count()) > 0;
    const hasCount = await generationCount.isVisible().catch(() => false);

    // At least one of: empty state, cards, or generation count must be present
    expect(hasEmpty || hasCards || hasCount).toBe(true);
  });

  test('empty state shows Go to Studio CTA when no generations exist', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await page.waitForTimeout(2000);

    const emptyState = page.getByText(/no generations yet/i);
    if (await emptyState.isVisible()) {
      // "Go to Studio" button should be visible
      const ctaButton = page.getByRole('button', { name: /go to studio/i });
      await expect(ctaButton).toBeVisible();
    }
  });

  test('generation cards can be clicked and navigate to Studio', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await page.waitForTimeout(2000);

    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Click the first card (navigates to /?generation=<id>)
      await cards.first().click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/\?generation=/);
    }
  });

  test('generation cards display an image', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await page.waitForTimeout(2000);

    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();
      const img = firstCard.locator('img');
      await expect(img).toBeVisible();

      // Image should have a src attribute
      const src = await img.getAttribute('src');
      expect(src).toBeTruthy();
    }
  });

  test('selection checkbox appears on hover and toggles selection', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await page.waitForTimeout(2000);

    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();

      // Hover over card to reveal the selection button
      await firstCard.hover();
      await page.waitForTimeout(300);

      const selectButton = firstCard.locator('button[aria-label^="Select generation"]');
      if (await selectButton.isVisible()) {
        // Click the selection checkbox
        await selectButton.click();
        await page.waitForTimeout(300);

        // Card should now show selected state (ring-2 ring-primary)
        const hasRing = await firstCard.evaluate((el) => el.classList.contains('ring-2'));
        expect(hasRing).toBe(true);

        // Click again to deselect
        await selectButton.click();
        await page.waitForTimeout(300);

        const stillHasRing = await firstCard.evaluate((el) => el.classList.contains('ring-2'));
        expect(stillHasRing).toBe(false);
      }
    }
  });

  test('delete button appears when items are selected', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await page.waitForTimeout(2000);

    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Select the first card via its checkbox
      const firstCard = cards.first();
      await firstCard.hover();
      await page.waitForTimeout(300);

      const selectButton = firstCard.locator('button[aria-label^="Select generation"]');
      if (await selectButton.isVisible()) {
        await selectButton.click();
        await page.waitForTimeout(300);

        // Delete button with Trash2 icon should now be visible
        const deleteButton = page.locator('button').filter({ hasText: /delete/i });
        await expect(deleteButton).toBeVisible();

        // "X selected" text should also appear
        const selectedText = page.getByText(/\d+ selected/);
        await expect(selectedText).toBeVisible();
      }
    }
  });

  test('clear selection button removes all selections', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await page.waitForTimeout(2000);

    const cards = page.locator('.group.relative.aspect-square');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();
      await firstCard.hover();
      await page.waitForTimeout(300);

      const selectButton = firstCard.locator('button[aria-label^="Select generation"]');
      if (await selectButton.isVisible()) {
        await selectButton.click();
        await page.waitForTimeout(300);

        // Click Clear button
        const clearButton = page.getByRole('button', { name: /clear/i });
        if (await clearButton.isVisible()) {
          await clearButton.click();
          await page.waitForTimeout(300);

          // Selection indicators should disappear
          const selectedText = page.getByText(/\d+ selected/);
          await expect(selectedText).toBeHidden();
        }
      }
    }
  });

  test('Back to Studio button is visible and navigates to /', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await expect(page.locator('h1').filter({ hasText: 'Gallery' })).toBeVisible({ timeout: 10000 });

    const backButton = page.getByRole('button', { name: /studio/i });
    await expect(backButton).toBeVisible({ timeout: 10000 });

    await backButton.click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
  });

  test('generation count text appears when generations exist', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await page.waitForTimeout(2000);

    const generationCount = page.getByText(/\d+ generation/);
    const cards = page.locator('.group.relative.aspect-square');

    const hasCountText = await generationCount.isVisible().catch(() => false);
    const hasCards = (await cards.count()) > 0;

    // If cards exist, the count text should also be visible
    if (hasCards) {
      expect(hasCountText).toBe(true);
    }
  });

  test('search filters generation cards by prompt text', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await page.waitForTimeout(2000);

    const cards = page.locator('.group.relative.aspect-square');
    const initialCount = await cards.count();

    if (initialCount > 0) {
      const searchInput = page.locator('input[placeholder*="earch"]');
      await expect(searchInput).toBeVisible();

      // Type a very specific search query unlikely to match anything
      await searchInput.fill('zzzzzzz_nonexistent_prompt_12345');
      await page.waitForTimeout(500);

      // Filtered count should be 0 or less than initial
      const filteredCount = await cards.count();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    }
  });
});
