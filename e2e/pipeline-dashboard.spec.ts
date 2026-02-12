import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

test.describe('Pipeline Dashboard', () => {
  test('dashboard tab is the default when navigating to /pipeline', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline');

    // Pipeline now defaults to dashboard (first tab in TAB_CONFIG)
    const activeTab = page.locator('[role="tab"][data-state="active"]');
    await expect(activeTab).toContainText('Dashboard');
  });

  test('dashboard tab shows all 4 stat card labels', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=dashboard');

    // Wait for lazy-loaded PipelineDashboard to render
    await page.waitForTimeout(1000);

    // The 4 stat labels from STATS_CONFIG
    await expect(page.getByText('Upcoming')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Publishing', { exact: false }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Published')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Failed')).toBeVisible({ timeout: 10000 });
  });

  test('stat cards show numeric values', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=dashboard');
    await page.waitForTimeout(1500);

    // Each stat card renders a <p> with text-3xl font-bold containing a number.
    // After loading, skeleton cards are replaced by real stats (even if all 0).
    const statValues = page.locator('.text-3xl.font-bold');
    await expect(statValues).toHaveCount(4, { timeout: 10000 });

    // Each value should be a non-negative integer
    for (let i = 0; i < 4; i++) {
      const text = await statValues.nth(i).textContent();
      expect(Number(text)).toBeGreaterThanOrEqual(0);
    }
  });

  test('Publishing Activity section exists', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=dashboard');
    await page.waitForTimeout(1000);

    // CardTitle "Publishing Activity"
    await expect(page.getByText('Publishing Activity')).toBeVisible({ timeout: 10000 });
  });

  test('empty state or activity items render in the feed', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=dashboard');
    await page.waitForTimeout(1500);

    // Either we see the empty state text OR activity items (cursor-pointer rows)
    const emptyState = page.getByText('No publishing activity yet');
    const activityItems = page.locator('.cursor-pointer');

    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const activityCount = await activityItems.count();

    // One of these must be true
    expect(hasEmpty || activityCount > 0).toBeTruthy();
  });

  test('Quick Actions section has buttons', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=dashboard');
    await page.waitForTimeout(1000);

    // Quick Actions card title
    await expect(page.getByText('Quick Actions')).toBeVisible({ timeout: 10000 });

    // Schedule Post button
    await expect(page.getByRole('button', { name: /Schedule Post/i })).toBeVisible({ timeout: 10000 });

    // Publish Now button
    await expect(page.getByRole('button', { name: /Publish Now/i })).toBeVisible({ timeout: 10000 });

    // View Calendar link button
    await expect(page.getByRole('button', { name: /View Calendar/i })).toBeVisible({ timeout: 10000 });
  });

  test('tab navigation between Dashboard and Calendar works', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=dashboard');

    // Confirm Dashboard tab is active
    const dashboardTab = page.getByRole('tab', { name: /Dashboard/i });
    await expect(dashboardTab).toHaveAttribute('data-state', 'active');

    // Click Calendar tab
    const calendarTab = page.getByRole('tab', { name: /Calendar/i });
    await calendarTab.click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('tab=calendar');

    // Click back to Dashboard
    await dashboardTab.click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('tab=dashboard');
  });

  test('Pipeline page shows 5 tab triggers', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline');

    // TAB_CONFIG has 5 entries: Dashboard, Content Planner, Calendar, Approval Queue, Social Accounts
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(5);
  });

  test('clicking activity item opens detail sheet', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=dashboard');
    await page.waitForTimeout(1500);

    // Check if there are activity items to click
    const activityItems = page.locator('.cursor-pointer');
    const count = await activityItems.count();

    if (count > 0) {
      // Click the first activity item
      await activityItems.first().click();
      await page.waitForTimeout(1000);

      // PostDetailSheet opens as a Sheet (role=dialog)
      const sheet = page.locator('[role="dialog"]');
      await expect(sheet).toBeVisible({ timeout: 10000 });

      // Should show "Post Lifecycle" timeline heading
      await expect(page.getByText('Post Lifecycle')).toBeVisible({ timeout: 5000 });
    } else {
      // No activity items — this is valid for a fresh account (empty state)
      const emptyState = page.getByText('No publishing activity yet');
      await expect(emptyState).toBeVisible();
    }
  });
});
