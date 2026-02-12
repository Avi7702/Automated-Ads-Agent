import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * Full E2E test suite for the Pipeline page (/pipeline).
 *
 * Covers all 4 tabs: Content Planner, Calendar, Approval Queue,
 * Social Accounts. Tests are grouped by tab with cross-tab scenarios at the end.
 */
test.describe('Pipeline - Full App E2E', { tag: '@pipeline' }, () => {
  /* ================================================================== */
  /*  Tab Navigation                                                     */
  /* ================================================================== */

  test.describe('Tab Navigation', () => {
    test('defaults to Content Planner tab when no query param', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline');
      const activeTab = page.locator('[role="tab"][data-state="active"]');
      await expect(activeTab).toContainText('Content Planner');
    });

    test('clicking Content Planner tab updates URL to ?tab=planner', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline');
      await page.getByRole('tab', { name: /Content Planner/i }).click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('tab=planner');
    });

    test('clicking Calendar tab updates URL to ?tab=calendar', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline');
      await page.getByRole('tab', { name: /Calendar/i }).click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('tab=calendar');
    });

    test('clicking Approval Queue tab updates URL to ?tab=approval', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline');
      await page.getByRole('tab', { name: /Approval Queue/i }).click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('tab=approval');
    });

    test('clicking Social Accounts tab updates URL to ?tab=accounts', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline');
      await page.getByRole('tab', { name: /Social Accounts/i }).click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('tab=accounts');
    });

    test('Pipeline renders 4 tab triggers', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline');
      const tabs = page.locator('[role="tab"]');
      await expect(tabs).toHaveCount(4);
    });
  });

  /* ================================================================== */
  /*  Content Planner Tab                                                */
  /* ================================================================== */

  test.describe('Content Planner Tab', () => {
    test('loads and shows Content Planner heading', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=planner');
      await expect(page.getByText('Content Planner').first()).toBeVisible({ timeout: 15000 });
    });

    test('shows weekly balance card', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=planner');
      await expect(page.getByText(/This Week's Balance/i).first()).toBeVisible({ timeout: 15000 });
    });

    test('shows Suggested Next Post card', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=planner');
      await expect(page.getByText(/Suggested Next Post/i).first()).toBeVisible({ timeout: 15000 });
    });

    test('category header click expands/collapses content', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=planner');

      // Wait for categories to render
      await expect(page.getByText('Content Categories').first()).toBeVisible({ timeout: 15000 });

      // Find the first collapsible trigger and click to expand
      const firstCategoryTrigger = page.locator('[data-state="closed"] .cursor-pointer').first();
      if (await firstCategoryTrigger.isVisible()) {
        await firstCategoryTrigger.click();
        await page.waitForTimeout(500);

        // After expansion, "Best Practices" section should be visible
        await expect(page.getByText('Best Practices').first()).toBeVisible({ timeout: 5000 });

        // Click again to collapse
        await firstCategoryTrigger.click();
        await page.waitForTimeout(500);
      }
    });

    test('template card click opens template detail dialog', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=planner');

      // Expand a category first
      await expect(page.getByText('Content Categories').first()).toBeVisible({ timeout: 15000 });
      const categoryTrigger = page.locator('[data-state="closed"] .cursor-pointer').first();
      if (await categoryTrigger.isVisible()) {
        await categoryTrigger.click();
        await page.waitForTimeout(500);

        // Click a template card inside the expanded category
        const templateCard = page.locator('[data-state="open"] .cursor-pointer').first();
        if (await templateCard.isVisible()) {
          await templateCard.click();
          await page.waitForTimeout(500);

          // Dialog should appear with hook formulas or post structure
          await expect(page.getByText(/Hook Formulas|Post Structure|Best Platforms/i).first()).toBeVisible({
            timeout: 5000,
          });
        }
      }
    });

    test('Create in Studio button shows start fresh warning', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=planner');

      await expect(page.getByText('Content Categories').first()).toBeVisible({ timeout: 15000 });
      const categoryTrigger = page.locator('[data-state="closed"] .cursor-pointer').first();
      if (await categoryTrigger.isVisible()) {
        await categoryTrigger.click();
        await page.waitForTimeout(500);

        const templateCard = page.locator('[data-state="open"] .cursor-pointer').first();
        if (await templateCard.isVisible()) {
          await templateCard.click();
          await page.waitForTimeout(500);

          const createBtn = page.getByRole('button', { name: /Create in Studio/i });
          if (await createBtn.isVisible()) {
            await createBtn.click();
            await page.waitForTimeout(500);
            await expect(page.getByText(/Start Fresh with Template/i)).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });

    test('Mark as Posted button opens platform selector dialog', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=planner');

      // Wait for suggested post to load (it has a Mark as Posted button)
      const markBtn = page.getByRole('button', { name: /Mark as Posted/i }).first();
      await expect(markBtn).toBeVisible({ timeout: 15000 });
      await markBtn.click();
      await page.waitForTimeout(500);

      // The MarkAsPostedDialog should open
      await expect(page.getByText(/Mark Post as Complete/i)).toBeVisible({ timeout: 5000 });
      // Should show platform selection
      await expect(page.getByText(/Platform/i).first()).toBeVisible();
    });

    test('has no duplicate headers in embedded mode', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline?tab=planner');
      await page.waitForTimeout(2000);
      const headerCount = await page.locator('header').count();
      expect(headerCount).toBe(1);
    });
  });

  /* ================================================================== */
  /*  Calendar Tab                                                       */
  /* ================================================================== */

  test.describe('Calendar Tab', () => {
    test('shows Content Calendar heading', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=calendar');
      await expect(page.getByText('Content Calendar').first()).toBeVisible({ timeout: 15000 });
    });

    test('shows month name and year in navigation bar', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=calendar');
      // Current month and year should be visible
      const now = new Date();
      const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      await expect(page.getByText(monthYear).first()).toBeVisible({ timeout: 15000 });
    });

    test('previous month button navigates backwards', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=calendar');

      const now = new Date();
      const currentMonthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      await expect(page.getByText(currentMonthYear).first()).toBeVisible({ timeout: 15000 });

      // Click prev month button (ChevronLeft)
      const prevBtn = page
        .locator('button')
        .filter({ has: page.locator('svg.lucide-chevron-left') })
        .first();
      await prevBtn.click();
      await page.waitForTimeout(500);

      // Month should change
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthYear = prevMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      await expect(page.getByText(prevMonthYear).first()).toBeVisible({ timeout: 5000 });
    });

    test('next month button navigates forward', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=calendar');

      const now = new Date();
      const currentMonthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      await expect(page.getByText(currentMonthYear).first()).toBeVisible({ timeout: 15000 });

      // Click next month button (ChevronRight)
      const nextBtn = page
        .locator('button')
        .filter({ has: page.locator('svg.lucide-chevron-right') })
        .first();
      await nextBtn.click();
      await page.waitForTimeout(500);

      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextMonthYear = nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      await expect(page.getByText(nextMonthYear).first()).toBeVisible({ timeout: 5000 });
    });

    test('clicking month name returns to today (current month)', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=calendar');

      const now = new Date();
      const currentMonthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      await expect(page.getByText(currentMonthYear).first()).toBeVisible({ timeout: 15000 });

      // Navigate to previous month first
      const prevBtn = page
        .locator('button')
        .filter({ has: page.locator('svg.lucide-chevron-left') })
        .first();
      await prevBtn.click();
      await page.waitForTimeout(500);

      // Click the month name to go back to today
      const monthTitle = page.locator('button[title="Go to today"]');
      await monthTitle.click();
      await page.waitForTimeout(500);

      await expect(page.getByText(currentMonthYear).first()).toBeVisible({ timeout: 5000 });
    });

    test('weekday headers are rendered (Sun-Sat)', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=calendar');
      await page.waitForTimeout(3000);

      // Check for weekday abbreviations (desktop view)
      for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
        await expect(page.getByText(day).first()).toBeVisible();
      }
    });

    test('Schedule Post button is visible', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=calendar');
      await expect(page.getByRole('button', { name: /Schedule Post|New/i }).first()).toBeVisible({ timeout: 15000 });
    });

    test('Schedule Post button opens schedule dialog', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=calendar');

      const scheduleBtn = page.getByRole('button', { name: /Schedule Post/i }).first();
      await expect(scheduleBtn).toBeVisible({ timeout: 15000 });
      await scheduleBtn.click();
      await page.waitForTimeout(500);

      // Dialog should appear
      await expect(page.getByText(/Schedule|Caption|Platform/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('shows color legend below calendar grid', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=calendar');
      await page.waitForTimeout(3000);

      await expect(page.getByText('Scheduled').first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Published').first()).toBeVisible();
    });
  });

  /* ================================================================== */
  /*  Approval Queue Tab                                                 */
  /* ================================================================== */

  test.describe('Approval Queue Tab', () => {
    test('loads and shows Approval Queue heading', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=approval');
      await expect(page.getByText('Content Approval Queue').first()).toBeVisible({ timeout: 15000 });
    });

    test('shows quick stats cards (Pending, Avg Confidence, Urgent, High Priority)', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=approval');
      await expect(page.getByText('Pending Review').first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Avg Confidence').first()).toBeVisible();
      await expect(page.getByText('Urgent Items').first()).toBeVisible();
      await expect(page.getByText('High Priority').first()).toBeVisible();
    });

    test('shows Filters card with Status, Priority, Platform dropdowns', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=approval');
      await expect(page.getByText('Filters').first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Status').first()).toBeVisible();
      await expect(page.getByText('Priority').first()).toBeVisible();
      await expect(page.getByText('Platform').first()).toBeVisible();
    });

    test('status filter changes displayed items', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=approval');
      await page.waitForTimeout(2000);

      // Open the Status dropdown and select "Approved"
      const statusTrigger = page.locator('.space-y-2').filter({ hasText: 'Status' }).locator('[role="combobox"]');
      if (await statusTrigger.isVisible()) {
        await statusTrigger.click();
        await page.waitForTimeout(300);
        await page.getByRole('option', { name: /Approved/i }).click();
        await page.waitForTimeout(1000);
        // Queue should reload — either items or empty state
        await expect(
          page.getByText(/No items in queue|approved|STANDARD QUEUE|URGENT|HIGH PRIORITY/i).first(),
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('priority filter changes displayed items', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=approval');
      await page.waitForTimeout(2000);

      const priorityTrigger = page.locator('.space-y-2').filter({ hasText: 'Priority' }).locator('[role="combobox"]');
      if (await priorityTrigger.isVisible()) {
        await priorityTrigger.click();
        await page.waitForTimeout(300);
        await page.getByRole('option', { name: /High/i }).click();
        await page.waitForTimeout(1000);
        await expect(page.getByText(/No items in queue|HIGH PRIORITY|STANDARD QUEUE|URGENT/i).first()).toBeVisible({
          timeout: 10000,
        });
      }
    });

    test('Refresh button reloads the queue', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=approval');
      await page.waitForTimeout(2000);

      const refreshBtn = page.getByRole('button', { name: /Refresh/i }).first();
      await expect(refreshBtn).toBeVisible({ timeout: 10000 });
      await refreshBtn.click();
      // After refresh, queue should be visible (items or empty state)
      await page.waitForTimeout(2000);
      await expect(
        page.getByText(/No items in queue|STANDARD QUEUE|URGENT|HIGH PRIORITY|Pending Review/i).first(),
      ).toBeVisible({ timeout: 10000 });
    });

    test('empty queue shows "No items in queue" message', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=approval');
      await page.waitForTimeout(3000);

      // Select a filter combination likely to produce empty results
      const statusTrigger = page.locator('.space-y-2').filter({ hasText: 'Status' }).locator('[role="combobox"]');
      if (await statusTrigger.isVisible()) {
        await statusTrigger.click();
        await page.waitForTimeout(300);
        await page.getByRole('option', { name: /Scheduled/i }).click();
        await page.waitForTimeout(2000);

        // Check if empty state or items are shown
        const emptyOrItems = page.getByText(/No items in queue|STANDARD QUEUE|URGENT|HIGH PRIORITY/i).first();
        await expect(emptyOrItems).toBeVisible({ timeout: 10000 });
      }
    });

    test('has no duplicate headers in embedded mode', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline?tab=approval');
      await page.waitForTimeout(2000);
      const headerCount = await page.locator('header').count();
      expect(headerCount).toBe(1);
    });
  });

  /* ================================================================== */
  /*  Social Accounts Tab                                                */
  /* ================================================================== */

  test.describe('Social Accounts Tab', () => {
    test('loads and shows Social Media Accounts heading', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=accounts');
      await expect(page.getByText('Social Media Accounts').first()).toBeVisible({ timeout: 15000 });
    });

    test('shows Refresh button', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=accounts');
      await expect(page.getByRole('button', { name: /Refresh/i }).first()).toBeVisible({ timeout: 15000 });
    });

    test('Refresh button triggers account reload', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=accounts');
      await page.waitForTimeout(2000);

      const refreshBtn = page.getByRole('button', { name: /Refresh/i }).first();
      await refreshBtn.click();
      await page.waitForTimeout(2000);

      // After refresh, page should still show accounts or empty state
      await expect(
        page.getByText(/Social Media Accounts|Connected Accounts|No Connected Accounts/i).first(),
      ).toBeVisible({ timeout: 10000 });
    });

    test('shows Sync Accounts from n8n button', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=accounts');
      await page.waitForTimeout(2000);

      await expect(page.getByRole('button', { name: /Sync Accounts from n8n/i })).toBeVisible({ timeout: 10000 });
    });

    test('shows n8n Documentation external link', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=accounts');
      await page.waitForTimeout(2000);

      const docsLink = page.getByRole('link', { name: /n8n Documentation/i });
      await expect(docsLink).toBeVisible({ timeout: 10000 });
      await expect(docsLink).toHaveAttribute('target', '_blank');
    });

    test('shows empty state or connected accounts list', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=accounts');
      await page.waitForTimeout(3000);

      const hasAccounts = await page.getByText(/Connected Accounts \(\d+\)/i).isVisible();
      if (hasAccounts) {
        // At least one account card should be visible
        await expect(page.getByText(/Connected Accounts/i).first()).toBeVisible();
      } else {
        // Empty state should be visible
        await expect(page.getByText(/No Connected Accounts/i).first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('shows setup instructions section', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=accounts');
      await page.waitForTimeout(2000);

      await expect(page.getByText(/Connect Social Media Accounts via n8n/i).first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Setup Instructions:').first()).toBeVisible();
    });

    test('shows supported platforms info block', async ({ page }) => {
      test.slow();
      await gotoWithAuth(page, '/pipeline?tab=accounts');
      await page.waitForTimeout(2000);

      await expect(page.getByText('Supported Platforms:').first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/LinkedIn/i).first()).toBeVisible();
      await expect(page.getByText(/Instagram/i).first()).toBeVisible();
    });

    test('has no duplicate headers in embedded mode', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline?tab=accounts');
      await page.waitForTimeout(2000);
      const headerCount = await page.locator('header').count();
      expect(headerCount).toBe(1);
    });
  });

  /* ================================================================== */
  /*  Cross-tab & URL State                                              */
  /* ================================================================== */

  test.describe('Cross-tab Scenarios', () => {
    test('deep linking /pipeline?tab=approval loads Approval Queue directly', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline?tab=approval');
      const activeTab = page.locator('[role="tab"][data-state="active"]');
      await expect(activeTab).toContainText('Approval Queue');
    });

    test('deep linking /pipeline?tab=calendar loads Calendar directly', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline?tab=calendar');
      const activeTab = page.locator('[role="tab"][data-state="active"]');
      await expect(activeTab).toContainText('Calendar');
    });

    test('deep linking /pipeline?tab=accounts loads Social Accounts directly', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline?tab=accounts');
      const activeTab = page.locator('[role="tab"][data-state="active"]');
      await expect(activeTab).toContainText('Social Accounts');
    });

    test('deep linking /pipeline?tab=planner loads Content Planner directly', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline?tab=planner');
      const activeTab = page.locator('[role="tab"][data-state="active"]');
      await expect(activeTab).toContainText('Content Planner');
    });

    test('URL state persists after page refresh', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline');

      // Switch to Approval tab
      await page.getByRole('tab', { name: /Approval Queue/i }).click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('tab=approval');

      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Tab should still be approval
      expect(page.url()).toContain('tab=approval');
      const activeTab = page.locator('[role="tab"][data-state="active"]');
      await expect(activeTab).toContainText('Approval Queue');
    });

    test('legacy route /approval-queue redirects to /pipeline?tab=approval', async ({ page }) => {
      await gotoWithAuth(page, '/approval-queue');
      await expect(page).toHaveURL(/\/pipeline\?tab=approval/);
    });

    test('legacy route /social-accounts redirects to /pipeline?tab=accounts', async ({ page }) => {
      await gotoWithAuth(page, '/social-accounts');
      await expect(page).toHaveURL(/\/pipeline\?tab=accounts/);
    });

    test('rapid tab switching does not crash', async ({ page }) => {
      await gotoWithAuth(page, '/pipeline');

      // Rapidly switch between all tabs
      const tabNames = ['Calendar', 'Approval Queue', 'Social Accounts', 'Content Planner'];
      for (const name of tabNames) {
        await page.getByRole('tab', { name: new RegExp(name, 'i') }).click();
        await page.waitForTimeout(200);
      }

      // Page should still be functional
      await expect(page.locator('[role="tab"][data-state="active"]')).toContainText('Content Planner');
    });
  });
});
