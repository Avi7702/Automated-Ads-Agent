import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * E2E Tests for Pipeline - Social Accounts Tab (/pipeline?tab=accounts)
 *
 * Covers:
 * 1. Page heading
 * 2. Refresh button
 * 3. n8n Documentation link
 * 4. Empty/connected states
 * 5. Setup instructions
 * 6. Supported platforms info
 * 7. Platform names listed
 * 8. No duplicate headers
 * 9. Refresh triggers reload
 * 10. Setup section card heading
 */

test.describe('Pipeline - Social Accounts', { tag: '@pipeline' }, () => {
  test.beforeEach(async ({ page }) => {
    test.slow();
    await gotoWithAuth(page, '/pipeline?tab=accounts');
    await expect(page.getByText('Social Media Accounts').first()).toBeVisible({ timeout: 15000 });
  });

  // ── Heading ───────────────────────────────────────────────────────

  test('displays Social Media Accounts heading', async ({ page }) => {
    await expect(page.getByText('Social Media Accounts').first()).toBeVisible();
  });

  test('displays subtitle about n8n automated posting', async ({ page }) => {
    await expect(page.getByText(/Manage your social media accounts connected via n8n/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  // ── Refresh Button ────────────────────────────────────────────────

  test('shows Refresh button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Refresh/i }).first()).toBeVisible({ timeout: 15000 });
  });

  test('Refresh button triggers account reload', async ({ page }) => {
    await page.waitForTimeout(2000);

    const refreshBtn = page.getByRole('button', { name: /Refresh/i }).first();
    await refreshBtn.click();
    await page.waitForTimeout(2000);

    // After refresh, page should still show accounts content
    await expect(page.getByText(/Social Media Accounts|Connected Accounts|No Connected Accounts/i).first()).toBeVisible(
      { timeout: 10000 },
    );
  });

  // ── n8n Documentation Link ────────────────────────────────────────

  test('shows n8n Documentation external link', async ({ page }) => {
    await page.waitForTimeout(2000);

    const docsLink = page.getByRole('link', { name: /n8n Documentation/i });
    await expect(docsLink).toBeVisible({ timeout: 10000 });
    await expect(docsLink).toHaveAttribute('target', '_blank');
    await expect(docsLink).toHaveAttribute('href', 'https://docs.n8n.io/integrations/builtin/credentials/');
  });

  // ── Empty/Connected States ────────────────────────────────────────

  test('shows empty state or connected accounts list', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Must show either connected accounts or the empty state — not silently pass
    await expect(page.getByText(/Connected Accounts|No Connected Accounts/i).first()).toBeVisible({ timeout: 10000 });
  });

  // ── Setup Instructions ────────────────────────────────────────────

  test('shows setup instructions card heading', async ({ page }) => {
    await page.waitForTimeout(2000);

    await expect(page.getByText(/Connect Social Media Accounts via n8n/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows Setup Instructions section with ordered steps', async ({ page }) => {
    await page.waitForTimeout(2000);

    await expect(page.getByText('Setup Instructions:').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Configure OAuth in n8n/i).first()).toBeVisible();
    await expect(page.getByText(/Complete OAuth flow/i).first()).toBeVisible();
    await expect(page.getByText(/Sync accounts to this app/i).first()).toBeVisible();
  });

  // ── Supported Platforms ───────────────────────────────────────────

  test('shows Supported Platforms info block with platform names', async ({ page }) => {
    await page.waitForTimeout(2000);

    await expect(page.getByText('Supported Platforms:').first()).toBeVisible({ timeout: 10000 });

    // Check for key platform names
    await expect(page.getByText(/LinkedIn/i).first()).toBeVisible();
    await expect(page.getByText(/Instagram/i).first()).toBeVisible();
    await expect(page.getByText(/Facebook/i).first()).toBeVisible();
    await expect(page.getByText(/Twitter\/X/i).first()).toBeVisible();
    await expect(page.getByText(/TikTok/i).first()).toBeVisible();
  });

  // ── No Duplicate Headers ──────────────────────────────────────────

  test('has no duplicate headers in embedded mode', async ({ page }) => {
    await page.waitForTimeout(2000);
    const headerCount = await page.locator('header').count();
    expect(headerCount).toBe(1);
  });
});
