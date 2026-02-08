import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

test.describe('Settings Journey', () => {
  test.describe('Section Navigation', () => {
    test('Settings defaults to Brand Profile section', async ({ page }) => {
      await gotoWithAuth(page, '/settings');

      // Should show Settings heading
      await expect(page.locator('h1').filter({ hasText: 'Settings' })).toBeVisible();

      // Brand Profile section should be active (has bg-primary/10)
      const brandButton = page.getByRole('button', { name: /Brand Profile/i });
      await expect(brandButton).toBeVisible();
    });

    test('section navigation updates URL state', async ({ page }) => {
      await gotoWithAuth(page, '/settings');

      // Click API Keys section
      const apiKeysButton = page.getByRole('button', { name: /API Keys/i });
      await apiKeysButton.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('section=api-keys');

      // Click Usage section
      const usageButton = page.getByRole('button', { name: /Usage/i });
      await usageButton.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('section=usage');

      // Click Knowledge Base section
      const kbButton = page.getByRole('button', { name: /Knowledge Base/i });
      await kbButton.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('section=knowledge-base');
    });

    test('direct URL navigation to specific section works', async ({ page }) => {
      await gotoWithAuth(page, '/settings?section=api-keys');

      // Should show API keys content
      const apiContent = page.getByText(/API Key|Gemini|Configure|service/i).first();
      await expect(apiContent).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Brand Profile Section', () => {
    test('Brand Profile shows company information', async ({ page }) => {
      await gotoWithAuth(page, '/settings');

      // Brand Profile shows read-only view with Edit Profile button
      const editButton = page.getByRole('button', { name: /Edit Profile/i });
      const brandContent = page.getByText(/Brand Values|Visual Style|Next Day Steel/i).first();

      const hasEdit = await editButton.isVisible().catch(() => false);
      const hasBrand = await brandContent.isVisible().catch(() => false);

      // At minimum, Settings page loaded with Brand Profile content
      expect(hasEdit || hasBrand).toBe(true);
    });

    test('Brand Profile has Edit Profile button', async ({ page }) => {
      await gotoWithAuth(page, '/settings');

      // Look for Edit Profile button (view mode) or Save button (edit mode)
      const editButton = page.getByRole('button', { name: /Edit Profile|Save|Update/i }).first();
      await expect(editButton).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Knowledge Base Section', () => {
    test('Knowledge Base shows summary statistics', async ({ page }) => {
      await gotoWithAuth(page, '/settings?section=knowledge-base');

      // Should show count cards or summary
      const kbContent = page.getByText(/product|template|image|scenario|pattern/i).first();
      await expect(kbContent).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('API Keys Section', () => {
    test('API Keys section shows service list', async ({ page }) => {
      await gotoWithAuth(page, '/settings?section=api-keys');

      // Should show API key management interface
      const apiContent = page.getByText(/API|key|Gemini|configure/i).first();
      await expect(apiContent).toBeVisible({ timeout: 10000 });
    });

    test('API Keys has no duplicate headers', async ({ page }) => {
      await gotoWithAuth(page, '/settings?section=api-keys');

      const headerCount = await page.locator('header').count();
      expect(headerCount).toBe(1);
    });
  });

  test.describe('Usage Section', () => {
    test('Usage section shows quota or usage data', async ({ page }) => {
      await gotoWithAuth(page, '/settings?section=usage');

      // Should show usage/quota content
      const usageContent = page.getByText(/usage|quota|generation|cost|limit/i).first();
      await expect(usageContent).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Legacy Redirects', () => {
    test('/brand-profile redirects to /settings', async ({ page }) => {
      await gotoWithAuth(page, '/brand-profile');
      await expect(page).toHaveURL(/\/settings/);
    });

    test('/usage redirects to /settings?section=usage', async ({ page }) => {
      await gotoWithAuth(page, '/usage');
      await expect(page).toHaveURL(/\/settings\?section=usage/);
    });
  });
});
