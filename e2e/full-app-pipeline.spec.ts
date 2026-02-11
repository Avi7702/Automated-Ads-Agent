import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

test.describe.configure({ mode: 'parallel' });

/**
 * Full Pipeline page E2E tests.
 *
 * The Pipeline page (/pipeline) hosts 4 lazy-loaded tabs controlled via
 * the `?tab=` URL parameter:
 *   1. Content Planner  (?tab=planner)  -- default
 *   2. Calendar          (?tab=calendar)
 *   3. Approval Queue    (?tab=approval)
 *   4. Social Accounts   (?tab=accounts)
 */

// ---------------------------------------------------------------------------
//  Tab Visibility
// ---------------------------------------------------------------------------

test.describe('Pipeline Tab Triggers Visible', () => {
  test('all 4 tab triggers are visible on load', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline');

    const plannerTab = page.getByRole('tab', { name: /Content Planner/i });
    const calendarTab = page.getByRole('tab', { name: /Calendar/i });
    const approvalTab = page.getByRole('tab', { name: /Approval Queue/i });
    const accountsTab = page.getByRole('tab', { name: /Social Accounts/i });

    await expect(plannerTab).toBeVisible({ timeout: 10000 });
    await expect(calendarTab).toBeVisible({ timeout: 10000 });
    await expect(approvalTab).toBeVisible({ timeout: 10000 });
    await expect(accountsTab).toBeVisible({ timeout: 10000 });
  });

  test('TabsList contains exactly 4 tab triggers', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline');

    const tabs = page.locator('[role="tab"]');
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });
    await expect(tabs).toHaveCount(4);
  });
});

// ---------------------------------------------------------------------------
//  Default Tab
// ---------------------------------------------------------------------------

test.describe('Pipeline Default Tab', () => {
  test('defaults to planner tab when no query param', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline');

    const activeTab = page.locator('[role="tab"][data-state="active"]');
    await expect(activeTab).toContainText('Content Planner', { timeout: 10000 });
  });

  test('active tabpanel is visible on default load', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline');

    const panel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(panel).toBeVisible({ timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
//  Tab Click & URL Update
// ---------------------------------------------------------------------------

test.describe('Pipeline Tab Navigation and URL Updates', () => {
  test('clicking Calendar tab updates URL to ?tab=calendar', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline');

    const calendarTab = page.getByRole('tab', { name: /Calendar/i });
    await calendarTab.click();
    await page.waitForTimeout(500);

    expect(page.url()).toContain('tab=calendar');

    const activeTab = page.locator('[role="tab"][data-state="active"]');
    await expect(activeTab).toContainText('Calendar');
  });

  test('clicking Approval Queue tab updates URL to ?tab=approval', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline');

    const approvalTab = page.getByRole('tab', { name: /Approval Queue/i });
    await approvalTab.click();
    await page.waitForTimeout(500);

    expect(page.url()).toContain('tab=approval');

    const activeTab = page.locator('[role="tab"][data-state="active"]');
    await expect(activeTab).toContainText('Approval Queue');
  });

  test('clicking Social Accounts tab updates URL to ?tab=accounts', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline');

    const accountsTab = page.getByRole('tab', { name: /Social Accounts/i });
    await accountsTab.click();
    await page.waitForTimeout(500);

    expect(page.url()).toContain('tab=accounts');

    const activeTab = page.locator('[role="tab"][data-state="active"]');
    await expect(activeTab).toContainText('Social Accounts');
  });

  test('clicking Content Planner tab updates URL to ?tab=planner', async ({ page }) => {
    // Start on a different tab, then navigate back to planner
    await gotoWithAuth(page, '/pipeline?tab=approval');

    const plannerTab = page.getByRole('tab', { name: /Content Planner/i });
    await plannerTab.click();
    await page.waitForTimeout(500);

    expect(page.url()).toContain('tab=planner');

    const activeTab = page.locator('[role="tab"][data-state="active"]');
    await expect(activeTab).toContainText('Content Planner');
  });
});

// ---------------------------------------------------------------------------
//  Direct URL Navigation (deep-link each tab)
// ---------------------------------------------------------------------------

test.describe('Pipeline Direct URL Tab Activation', () => {
  test('navigating to ?tab=calendar activates Calendar tab', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=calendar');

    const activeTab = page.locator('[role="tab"][data-state="active"]');
    await expect(activeTab).toContainText('Calendar', { timeout: 10000 });
  });

  test('navigating to ?tab=approval activates Approval Queue tab', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=approval');

    const activeTab = page.locator('[role="tab"][data-state="active"]');
    await expect(activeTab).toContainText('Approval Queue', { timeout: 10000 });
  });

  test('navigating to ?tab=accounts activates Social Accounts tab', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=accounts');

    const activeTab = page.locator('[role="tab"][data-state="active"]');
    await expect(activeTab).toContainText('Social Accounts', { timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
//  Tab Content Loads (lazy-loaded, no crash)
// ---------------------------------------------------------------------------

test.describe('Pipeline Tab Content Loading', () => {
  test('Content Planner tab renders planner content', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=planner');

    // ContentPlanner shows "Content Planner" h1 and category-related content
    const heading = page.getByText('Content Planner').first();
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test('Calendar tab renders calendar content', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=calendar');

    // CalendarView renders "Content Calendar" heading or weekday headers
    const calendarContent = page.getByText(/Content Calendar|Sun|Mon|Tue|Wed|Thu|Fri|Sat/i).first();
    await expect(calendarContent).toBeVisible({ timeout: 15000 });
  });

  test('Approval Queue tab renders approval content', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=approval');

    // ApprovalQueue shows "Content Approval Queue" heading or queue-related text
    const approvalContent = page.getByText(/Content Approval Queue|approval|queue|pending|review/i).first();
    await expect(approvalContent).toBeVisible({ timeout: 15000 });
  });

  test('Social Accounts tab renders accounts content', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=accounts');

    // SocialAccounts shows "Social Media Accounts" heading or account-related text
    const accountsContent = page.getByText(/Social Media Accounts|social|account|connect/i).first();
    await expect(accountsContent).toBeVisible({ timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
//  Header Active State
// ---------------------------------------------------------------------------

test.describe('Pipeline Header Active State', () => {
  test('Header shows Pipeline as the active nav item', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline');

    // The Header uses aria-current="page" for the active nav link
    const pipelineLink = page.locator('a[aria-current="page"]');
    await expect(pipelineLink).toBeVisible({ timeout: 10000 });
    await expect(pipelineLink).toContainText('Pipeline');
  });

  test('Pipeline nav link has active styling (bg-primary class)', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline');

    // The active link's child span gets the 'bg-primary/10 text-primary' classes
    const activeSpan = page.locator('a[aria-current="page"] span').first();
    await expect(activeSpan).toBeVisible({ timeout: 10000 });

    const className = await activeSpan.getAttribute('class');
    expect(className).toContain('text-primary');
  });
});

// ---------------------------------------------------------------------------
//  No Duplicate Headers (embedded mode)
// ---------------------------------------------------------------------------

test.describe('Pipeline Embedded Mode (No Duplicate Headers)', () => {
  test('Content Planner in embedded mode has only one header element', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=planner');
    await page.waitForTimeout(1500);

    const headerCount = await page.locator('header').count();
    expect(headerCount).toBe(1);
  });

  test('Approval Queue in embedded mode has only one header element', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=approval');
    await page.waitForTimeout(1500);

    const headerCount = await page.locator('header').count();
    expect(headerCount).toBe(1);
  });

  test('Social Accounts in embedded mode has only one header element', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline?tab=accounts');
    await page.waitForTimeout(1500);

    const headerCount = await page.locator('header').count();
    expect(headerCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
//  No Console Errors During Tab Switching
// ---------------------------------------------------------------------------

test.describe('Pipeline Stability', () => {
  test('switching through all tabs produces no critical console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out known non-critical errors (network, favicon, etc.)
        if (
          !text.includes('favicon') &&
          !text.includes('404') &&
          !text.includes('401') &&
          !text.includes('net::ERR') &&
          !text.includes('Failed to load resource')
        ) {
          consoleErrors.push(text);
        }
      }
    });

    await gotoWithAuth(page, '/pipeline');
    await page.waitForTimeout(1000);

    // Switch to Calendar
    await page.getByRole('tab', { name: /Calendar/i }).click();
    await page.waitForTimeout(1500);

    // Switch to Approval Queue
    await page.getByRole('tab', { name: /Approval Queue/i }).click();
    await page.waitForTimeout(1500);

    // Switch to Social Accounts
    await page.getByRole('tab', { name: /Social Accounts/i }).click();
    await page.waitForTimeout(1500);

    // Switch back to Content Planner
    await page.getByRole('tab', { name: /Content Planner/i }).click();
    await page.waitForTimeout(1000);

    expect(consoleErrors).toEqual([]);
  });
});
