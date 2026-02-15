import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';
import { SettingsPage } from './pages/settings.page';
import { MOBILE } from './helpers/viewport';

/**
 * Settings — Usage & Quotas Section E2E Tests
 *
 * Route: /settings?section=usage
 * Component: QuotaDashboard -> Tabs (API Quota, System Health, Performance, Errors)
 *            -> QuotaDashboardContent, SystemHealthTab, PerformanceTab, ErrorTrackingTab
 *
 * Tests: heading, 4 dashboard tabs, tab switching, quota content, mobile
 */

test.describe('Settings - Usage & Quotas', { tag: '@settings' }, () => {
  let settings: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsPage(page);
    await gotoWithAuth(page, '/settings?section=usage');
    await settings.waitForSectionContent();
  });

  // --- Heading ---

  test('displays Monitoring Dashboard heading', async ({ page }) => {
    await page.waitForTimeout(2000);

    await expect(page.getByText('Monitoring Dashboard').first()).toBeVisible();
    await expect(page.getByText('Monitor API usage, system health, performance metrics, and errors')).toBeVisible();
  });

  test('URL contains section=usage', async ({ page }) => {
    expect(page.url()).toContain('section=usage');
  });

  // --- 4 Dashboard Tabs ---

  test('renders API Quota tab', async ({ page }) => {
    await page.waitForTimeout(2000);

    const quotaTab = page
      .getByRole('tab', { name: /Quota/i })
      .or(page.locator('[role="tab"]').filter({ hasText: /Quota/i }));
    await expect(quotaTab).toBeVisible();
  });

  test('renders System Health tab', async ({ page }) => {
    await page.waitForTimeout(2000);

    const healthTab = page
      .getByRole('tab', { name: /Health/i })
      .or(page.locator('[role="tab"]').filter({ hasText: /Health/i }));
    await expect(healthTab).toBeVisible();
  });

  test('renders Performance tab', async ({ page }) => {
    await page.waitForTimeout(2000);

    const perfTab = page
      .getByRole('tab', { name: /Performance|Perf/i })
      .or(page.locator('[role="tab"]').filter({ hasText: /Performance|Perf/i }));
    await expect(perfTab).toBeVisible();
  });

  test('renders Errors tab', async ({ page }) => {
    await page.waitForTimeout(2000);

    const errorsTab = page
      .getByRole('tab', { name: /Errors/i })
      .or(page.locator('[role="tab"]').filter({ hasText: /Errors/i }));
    await expect(errorsTab).toBeVisible();
  });

  // --- Tab Switching ---

  test('clicking System Health tab shows health content', async ({ page }) => {
    await page.waitForTimeout(2000);

    const healthTab = page
      .getByRole('tab', { name: /Health/i })
      .or(page.locator('[role="tab"]').filter({ hasText: /Health/i }));

    await healthTab.click();
    await page.waitForTimeout(1000);

    // The active tab panel should change
    const activePanel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(activePanel).toBeVisible();
  });

  test('clicking Performance tab shows performance content', async ({ page }) => {
    await page.waitForTimeout(2000);

    const perfTab = page
      .getByRole('tab', { name: /Performance|Perf/i })
      .or(page.locator('[role="tab"]').filter({ hasText: /Performance|Perf/i }));

    await perfTab.click();
    await page.waitForTimeout(1000);

    const activePanel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(activePanel).toBeVisible();
  });

  test('clicking Errors tab shows error tracking content', async ({ page }) => {
    await page.waitForTimeout(2000);

    const errorsTab = page
      .getByRole('tab', { name: /Errors/i })
      .or(page.locator('[role="tab"]').filter({ hasText: /Errors/i }));

    await errorsTab.click();
    await page.waitForTimeout(1000);

    const activePanel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(activePanel).toBeVisible();
  });

  // --- Quota Content ---

  test('API Quota tab is selected by default and shows content', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Default tab is "quota"
    const quotaTab = page
      .getByRole('tab', { name: /Quota/i })
      .or(page.locator('[role="tab"]').filter({ hasText: /Quota/i }));

    // Active tab should have data-state="active"
    await expect(quotaTab).toHaveAttribute('data-state', 'active');

    // Content panel should be visible
    const activePanel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(activePanel).toBeVisible();
  });

  // --- Mobile ---

  test('usage section renders without overflow on mobile viewport', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await gotoWithAuth(page, '/settings?section=usage');
    await page.waitForTimeout(3000);

    // Verify no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance
  });
});
