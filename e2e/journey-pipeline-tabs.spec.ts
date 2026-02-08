import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

test.describe('Pipeline Tabs Journey', () => {
  test.describe('Tab Navigation', () => {
    test('Pipeline defaults to Content Planner tab', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline');

      const activeTab = page.locator('[role="tab"][data-state="active"]');
      await expect(activeTab).toContainText('Content Planner');
    });

    test('tab clicks update URL state', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline');

      // Click Approval Queue tab
      const approvalTab = page.getByRole('tab', { name: /Approval Queue/i });
      await approvalTab.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('tab=approval');

      // Click Social Accounts tab
      const accountsTab = page.getByRole('tab', { name: /Social Accounts/i });
      await accountsTab.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('tab=accounts');

      // Click back to Planner
      const plannerTab = page.getByRole('tab', { name: /Content Planner/i });
      await plannerTab.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('tab=planner');
    });

    test('Pipeline shows 3 tab triggers', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline');

      const tabs = page.locator('[role="tab"]');
      await expect(tabs).toHaveCount(3);
    });
  });

  test.describe('Content Planner Tab', () => {
    test('planner loads with content categories or templates', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline?tab=planner');

      const content = page.locator('[role="tabpanel"][data-state="active"]');
      await expect(content).toBeVisible();
    });

    test('planner has no duplicate headers in embedded mode', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline?tab=planner');

      const headerCount = await page.locator('header').count();
      expect(headerCount).toBe(1);
    });
  });

  test.describe('Approval Queue Tab', () => {
    test('Approval Queue tab loads with queue or empty state', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline?tab=approval');
      await page.waitForTimeout(1000);

      // Should show Approval Queue content
      const approvalContent = page.getByText(/approval|queue|pending|review|no items/i).first();
      await expect(approvalContent).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Social Accounts Tab', () => {
    test('Social Accounts tab loads with account list or empty state', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline');

      const accountsTab = page.getByRole('tab', { name: /Social Accounts/i });
      await accountsTab.click();
      await page.waitForTimeout(1000);

      const accountContent = page.getByText(/social|account|connect|no.*account/i).first();
      await expect(accountContent).toBeVisible({ timeout: 10000 });
    });

    test('Social Accounts has no duplicate headers', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline');

      const accountsTab = page.getByRole('tab', { name: /Social Accounts/i });
      await accountsTab.click();
      await page.waitForTimeout(1000);

      const headerCount = await page.locator('header').count();
      expect(headerCount).toBe(1);
    });
  });

  test.describe('Legacy Redirects', () => {
    test('/approval-queue redirects to /pipeline?tab=approval', async ({ page }) => {
      await gotoWithAuth(page, '/approval-queue');
      await expect(page).toHaveURL(/\/pipeline\?tab=approval/);
    });

    test('/social-accounts redirects to /pipeline?tab=accounts', async ({ page }) => {
      await gotoWithAuth(page, '/social-accounts');
      await expect(page).toHaveURL(/\/pipeline\?tab=accounts/);
    });
  });
});
