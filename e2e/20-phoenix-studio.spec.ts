import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * 20 — Phoenix Studio (Unified Workspace)
 *
 * Tests the new Phoenix Studio unified layout:
 * - 3-column layout: Asset Drawer | Canvas | Chat+Approval+Calendar
 * - Navigation redirects / to /phoenix
 * - Right panel tab switching
 * - Chat panel visibility toggle
 * - Asset drawer toggle
 */
test.describe('Phoenix Studio — Unified Workspace', { tag: '@phoenix' }, () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuth(page, '/phoenix');
  });

  // ─── Layout & Navigation ──────────────────────────────

  test('1. root URL redirects to /phoenix', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForURL('**/phoenix', { timeout: 10000 });
    expect(page.url()).toContain('/phoenix');
  });

  test('2. Phoenix Studio page loads with header', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('3. Studio nav link is active', async ({ page }) => {
    const studioLink = page.locator('nav a[aria-current="page"]');
    await expect(studioLink).toBeVisible({ timeout: 10000 });
    await expect(studioLink).toContainText('Studio');
  });

  // ─── 3-Column Layout ─────────────────────────────────

  test('4. main canvas area is visible', async ({ page }) => {
    // The center column should contain the composer or a product selection prompt
    const centerArea = page.locator('main');
    await expect(centerArea).toBeVisible({ timeout: 10000 });
  });

  test('5. asset drawer toggle button exists', async ({ page }) => {
    const toggleBtn = page.locator('button[title*="assets"]').first();
    await expect(toggleBtn).toBeVisible({ timeout: 10000 });
  });

  test('6. chat panel toggle button exists', async ({ page }) => {
    const toggleBtn = page.locator('button[title*="chat"]').first();
    await expect(toggleBtn).toBeVisible({ timeout: 10000 });
  });

  // ─── Right Panel Tabs ─────────────────────────────────

  test('7. right panel has Chat, Approval, and Calendar tabs', async ({ page }) => {
    // Look for the tab buttons in the right panel
    const chatTab = page.locator('button:text-is("Chat")').first();
    const approvalTab = page.locator('button:text-is("Approval")').first();
    const calendarTab = page.locator('button:text-is("Calendar")').first();

    await expect(chatTab).toBeVisible({ timeout: 10000 });
    await expect(approvalTab).toBeVisible({ timeout: 10000 });
    await expect(calendarTab).toBeVisible({ timeout: 10000 });
  });

  test('8. clicking Approval tab shows approval queue', async ({ page }) => {
    const approvalTab = page.locator('button:text-is("Approval")').first();
    await approvalTab.click();

    // Should show the approval queue header
    const queueHeader = page.locator('text=Approval Queue');
    await expect(queueHeader).toBeVisible({ timeout: 5000 });
  });

  test('9. clicking Calendar tab shows content calendar', async ({ page }) => {
    const calendarTab = page.locator('button:text-is("Calendar")').first();
    await calendarTab.click();

    // Should show the content calendar header
    const calendarHeader = page.locator('text=Content Calendar');
    await expect(calendarHeader).toBeVisible({ timeout: 5000 });
  });

  test('10. clicking Chat tab returns to agent chat', async ({ page }) => {
    // Switch to Approval first
    const approvalTab = page.locator('button:text-is("Approval")').first();
    await approvalTab.click();

    // Switch back to Chat
    const chatTab = page.locator('button:text-is("Chat")').first();
    await chatTab.click();

    // Should show the agent chat panel with the title
    const chatTitle = page.locator('text=Ad Assistant');
    await expect(chatTitle).toBeVisible({ timeout: 5000 });
  });

  // ─── Toolbar ──────────────────────────────────────────

  test('11. toolbar shows product selection count', async ({ page }) => {
    const productCount = page.locator('text=Select products to get started');
    await expect(productCount).toBeVisible({ timeout: 10000 });
  });

  test('12. history button exists in toolbar', async ({ page }) => {
    const historyBtn = page.locator('button:has-text("History")').first();
    await expect(historyBtn).toBeVisible({ timeout: 10000 });
  });

  // ─── Mobile Responsiveness ────────────────────────────

  test('13. mobile chat FAB is visible on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoWithAuth(page, '/phoenix');

    const chatFab = page.locator('button:has(svg.lucide-message-square)').last();
    await expect(chatFab).toBeVisible({ timeout: 10000 });
  });
});
