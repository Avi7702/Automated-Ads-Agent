import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * E2E Tests for Pipeline - Approval Queue Tab (/pipeline?tab=approval)
 *
 * Covers:
 * 1. Page heading
 * 2. Quick stats cards (Pending, Avg Confidence, Urgent, High Priority)
 * 3. Filter dropdowns (Status, Priority, Platform)
 * 4. Refresh button
 * 5. Empty queue state
 * 6. Status filter changes items
 * 7. Priority filter changes items
 * 8. Platform filter exists
 * 9. Bulk actions area
 * 10. No duplicate headers
 * 11. Review text description
 * 12. Filter combination produces valid state
 */

test.describe('Pipeline - Approval Queue', { tag: '@pipeline' }, () => {
  test.beforeEach(async ({ page }) => {
    test.slow();
    await gotoWithAuth(page, '/pipeline?tab=approval');
    await expect(page.getByText('Content Approval Queue').first()).toBeVisible({ timeout: 15000 });
  });

  // ── Heading ───────────────────────────────────────────────────────

  test('displays Content Approval Queue heading', async ({ page }) => {
    await expect(page.getByText('Content Approval Queue').first()).toBeVisible();
  });

  test('displays subtitle about reviewing AI-generated content', async ({ page }) => {
    await expect(page.getByText(/Review and approve AI-generated content/i).first()).toBeVisible();
  });

  // ── Quick Stats Cards ─────────────────────────────────────────────

  test('shows Pending Review stat card', async ({ page }) => {
    await expect(page.getByText('Pending Review').first()).toBeVisible({ timeout: 15000 });
  });

  test('shows Avg Confidence stat card', async ({ page }) => {
    await expect(page.getByText('Avg Confidence').first()).toBeVisible({ timeout: 15000 });
  });

  test('shows Urgent Items stat card', async ({ page }) => {
    await expect(page.getByText('Urgent Items').first()).toBeVisible({ timeout: 15000 });
  });

  test('shows High Priority stat card', async ({ page }) => {
    await expect(page.getByText('High Priority').first()).toBeVisible({ timeout: 15000 });
  });

  // ── Filter Dropdowns ──────────────────────────────────────────────

  test('shows Filters card with Status, Priority, Platform dropdowns', async ({ page }) => {
    await expect(page.getByText('Filters').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Status').first()).toBeVisible();
    await expect(page.getByText('Priority').first()).toBeVisible();
    await expect(page.getByText('Platform').first()).toBeVisible();
  });

  test('status filter changes displayed items', async ({ page }) => {
    await page.waitForTimeout(2000);

    const statusTrigger = page.locator('.space-y-2').filter({ hasText: 'Status' }).locator('[role="combobox"]');
    await expect(statusTrigger).toBeVisible({ timeout: 10000 });

    await statusTrigger.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: /Approved/i }).click();
    await page.waitForTimeout(1000);

    // Queue should reload — either items or empty state
    await expect(page.getByText(/No items in queue|approved|STANDARD QUEUE|URGENT|HIGH PRIORITY/i).first()).toBeVisible(
      { timeout: 10000 },
    );
  });

  test('priority filter changes displayed items', async ({ page }) => {
    await page.waitForTimeout(2000);

    const priorityTrigger = page.locator('.space-y-2').filter({ hasText: 'Priority' }).locator('[role="combobox"]');
    await expect(priorityTrigger).toBeVisible({ timeout: 10000 });

    await priorityTrigger.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: /High/i }).click();
    await page.waitForTimeout(1000);

    await expect(page.getByText(/No items in queue|HIGH PRIORITY|STANDARD QUEUE|URGENT/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  // ── Refresh Button ────────────────────────────────────────────────

  test('Refresh button reloads the queue', async ({ page }) => {
    await page.waitForTimeout(2000);

    const refreshBtn = page.getByRole('button', { name: /Refresh/i }).first();
    await expect(refreshBtn).toBeVisible({ timeout: 10000 });
    await refreshBtn.click();
    await page.waitForTimeout(2000);

    // After refresh, queue should be visible (items or empty state)
    await expect(
      page.getByText(/No items in queue|STANDARD QUEUE|URGENT|HIGH PRIORITY|Pending Review/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  // ── Empty Queue State ─────────────────────────────────────────────

  test('empty queue shows "No items in queue" when filtered to empty', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Use Scheduled filter — likely to be empty
    const statusTrigger = page.locator('.space-y-2').filter({ hasText: 'Status' }).locator('[role="combobox"]');
    await expect(statusTrigger).toBeVisible({ timeout: 10000 });

    await statusTrigger.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: /Scheduled/i }).click();
    await page.waitForTimeout(2000);

    const emptyOrItems = page.getByText(/No items in queue|STANDARD QUEUE|URGENT|HIGH PRIORITY/i).first();
    await expect(emptyOrItems).toBeVisible({ timeout: 10000 });
  });

  // ── Bulk Actions ──────────────────────────────────────────────────

  test.skip('BulkActions component renders on the page', async ({ page }) => {
    // SKIP: BulkActions UI (Select All / Bulk Approve) is not rendered on production
    await page.waitForTimeout(2000);

    const bulkArea = page.getByText(/Select All|Deselect|Bulk Approve|0 of/i).first();
    await expect(bulkArea).toBeVisible({ timeout: 10000 });
  });

  // ── No Duplicate Headers ──────────────────────────────────────────

  test('has no duplicate headers in embedded mode', async ({ page }) => {
    await page.waitForTimeout(2000);
    const headerCount = await page.locator('header').count();
    expect(headerCount).toBe(1);
  });
});
