import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * E2E Tests for Pipeline - Content Planner Tab (/pipeline?tab=planner)
 *
 * Covers:
 * 1. Page heading and layout
 * 2. Weekly balance card
 * 3. Suggested Next Post card
 * 4. View Guide dialog
 * 5. Mark as Posted dialog
 * 6. Category expand/collapse
 * 7. Template card dialog
 * 8. Create in Studio navigation
 * 9. Recent Posts section
 * 10. Embedded mode (no duplicate headers)
 */

test.describe('Pipeline - Content Planner', { tag: '@pipeline' }, () => {
  test.beforeEach(async ({ page }) => {
    test.slow();
    await gotoWithAuth(page, '/pipeline?tab=planner');
    // Wait for the planner content to load (heading or loading spinner)
    await expect(page.getByText('Content Planner').first()).toBeVisible({ timeout: 15000 });
  });

  // -- Heading & Layout --

  test('displays Content Planner heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Content Planner/i }).first()).toBeVisible();
  });

  test('displays subtitle about NDS posting strategy', async ({ page }) => {
    await expect(page.getByText(/NDS posting strategy/i).first()).toBeVisible({ timeout: 10000 });
  });

  // -- Weekly Balance Card --

  test("displays This Week's Balance card", async ({ page }) => {
    await expect(page.getByText(/This Week's Balance/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('weekly balance card shows Total Posts count', async ({ page }) => {
    await expect(page.getByText(/Total Posts This Week/i).first()).toBeVisible({ timeout: 15000 });
  });

  // -- Suggested Next Post Card --

  test('displays Suggested Next Post card', async ({ page }) => {
    await expect(page.getByText(/Suggested Next Post/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('Suggested Next Post shows View Guide button or suggestion text', async ({ page }) => {
    // Wait for suggestion data to load
    const viewGuideBtn = page.getByRole('button', { name: /View Guide/i });
    const suggestionText = page.getByText(/Suggested Next Post/i).first();

    // Either the View Guide button is visible or the suggestion section is visible
    await expect(viewGuideBtn.or(suggestionText)).toBeVisible({ timeout: 15000 });
  });

  // -- View Guide Dialog --

  test('View Guide button opens template detail dialog', async ({ page }) => {
    const viewGuideBtn = page.getByRole('button', { name: /View Guide/i });

    // Use test.skip for conditional skipping instead of catch
    const isVisible = await viewGuideBtn.isVisible();
    if (!isVisible) {
      test.skip(true, 'No View Guide button visible -- suggestion may not have loaded');
      return;
    }

    await viewGuideBtn.click();
    await page.waitForTimeout(500);

    // Dialog should show Hook Formulas, Post Structure, or Best Platforms
    await expect(page.getByText(/Hook Formulas|Post Structure|Best Platforms/i).first()).toBeVisible({ timeout: 5000 });
  });

  // -- Mark as Posted Dialog --

  test('Mark as Posted button opens platform selector dialog', async ({ page }) => {
    const markBtn = page.getByRole('button', { name: /Mark as Posted/i }).first();

    const isVisible = await markBtn.isVisible();
    if (!isVisible) {
      test.skip(true, 'No Mark as Posted button visible');
      return;
    }

    await markBtn.click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/Mark Post as Complete/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Platform/i).first()).toBeVisible();
  });

  // -- Category Expand/Collapse --

  test('Content Categories section is visible', async ({ page }) => {
    await expect(page.getByText('Content Categories').first()).toBeVisible({ timeout: 15000 });
  });

  test('category header click expands and shows Best Practices', async ({ page }) => {
    await expect(page.getByText('Content Categories').first()).toBeVisible({ timeout: 15000 });

    const trigger = page.locator('[data-state="closed"] .cursor-pointer').first();
    const hasTrigger = await trigger.isVisible();

    if (!hasTrigger) {
      test.skip(true, 'No collapsed category trigger found');
      return;
    }

    await trigger.click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Best Practices').first()).toBeVisible({ timeout: 5000 });
  });

  // -- Template Card Dialog --

  test('template card click opens template detail dialog with content sections', async ({ page }) => {
    await expect(page.getByText('Content Categories').first()).toBeVisible({ timeout: 15000 });

    // Expand a category first
    const categoryTrigger = page.locator('[data-state="closed"] .cursor-pointer').first();
    const hasCategoryTrigger = await categoryTrigger.isVisible();
    if (!hasCategoryTrigger) {
      test.skip(true, 'No category to expand');
      return;
    }

    await categoryTrigger.click();
    await page.waitForTimeout(500);

    // Click a template card inside the expanded category
    const templateCard = page.locator('[data-state="open"] .cursor-pointer').first();
    const hasTemplateCard = await templateCard.isVisible();
    if (!hasTemplateCard) {
      test.skip(true, 'No template card visible in expanded category');
      return;
    }

    await templateCard.click();
    await page.waitForTimeout(500);

    // Dialog should have sections: Hook Formulas, Post Structure, Best Platforms
    await expect(page.getByText(/Hook Formulas|Post Structure|Best Platforms/i).first()).toBeVisible({ timeout: 5000 });
  });

  // -- Create in Studio Navigation --

  test('Create in Studio button shows Start Fresh warning dialog', async ({ page }) => {
    await expect(page.getByText('Content Categories').first()).toBeVisible({ timeout: 15000 });

    const categoryTrigger = page.locator('[data-state="closed"] .cursor-pointer').first();
    const hasCategoryTrigger = await categoryTrigger.isVisible();
    if (!hasCategoryTrigger) {
      test.skip(true, 'No category to expand');
      return;
    }

    await categoryTrigger.click();
    await page.waitForTimeout(500);

    const templateCard = page.locator('[data-state="open"] .cursor-pointer').first();
    const hasTemplateCard = await templateCard.isVisible();
    if (!hasTemplateCard) {
      test.skip(true, 'No template card visible');
      return;
    }

    await templateCard.click();
    await page.waitForTimeout(500);

    const createBtn = page.getByRole('button', { name: /Create in Studio/i });
    const hasCreateBtn = await createBtn.isVisible();
    if (!hasCreateBtn) {
      test.skip(true, 'No Create in Studio button in template dialog');
      return;
    }

    await createBtn.click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/Start Fresh with Template/i)).toBeVisible({ timeout: 5000 });
  });

  // -- Recent Posts --

  test('Recent Posts section appears when posts exist', async ({ page }) => {
    // Recent Posts section is conditionally rendered
    const recentPostsHeading = page.getByText(/Recent Posts/i).first();
    const isVisible = await recentPostsHeading.isVisible();

    if (isVisible) {
      await expect(recentPostsHeading).toBeVisible();
      // Should show "Last 7 Days" subtitle
      await expect(page.getByText(/Last 7 Days/i).first()).toBeVisible();
    } else {
      // No recent posts — skip rather than silently pass
      test.skip(true, 'No recent posts section visible');
    }
  });

  // -- Embedded Mode --

  test('has no duplicate headers in embedded mode', async ({ page }) => {
    await page.waitForTimeout(2000);
    const headerCount = await page.locator('header').count();
    expect(headerCount).toBe(1);
  });
});
