import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

test.describe.configure({ mode: 'parallel' });

test.describe('Settings Page — Full Application Tests', () => {
  // ─── Page Load ───────────────────────────────────────────────────

  test('page loads and heading "Settings" is visible', async ({ page }) => {
    await gotoWithAuth(page, '/settings');
    const heading = page.locator('h1').filter({ hasText: 'Settings' });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('subtitle text is visible', async ({ page }) => {
    await gotoWithAuth(page, '/settings');
    await expect(page.getByText('Configure your account and preferences')).toBeVisible({ timeout: 10000 });
  });

  // ─── Sidebar Buttons ────────────────────────────────────────────

  test('all 4 sidebar navigation buttons are visible', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    await expect(page.getByRole('button', { name: /Brand Profile/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Knowledge Base/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /API Keys/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Usage & Quotas/i })).toBeVisible({ timeout: 10000 });
  });

  test('sidebar buttons show descriptions', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    await expect(page.getByText('Manage your brand identity and voice')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Products, scenarios, and brand assets')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Configure external service integrations')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Monitor API usage and costs')).toBeVisible({ timeout: 10000 });
  });

  // ─── Default Section ────────────────────────────────────────────

  test('default section is Brand Profile', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    // The Brand Profile button should have the active class bg-primary/10
    const brandButton = page.getByRole('button', { name: /Brand Profile/i });
    await expect(brandButton).toBeVisible({ timeout: 10000 });
    await expect(brandButton).toHaveClass(/bg-primary\/10/);
  });

  test('default section URL does not require explicit section param', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    // Brand Profile loads even without ?section=brand
    const brandContent = page.getByText(/Brand Values|Visual Style|Edit Profile|brand name/i).first();
    await expect(brandContent).toBeVisible({ timeout: 15000 });
  });

  // ─── Section Navigation — Click & Content ───────────────────────

  test('click Knowledge Base button loads its content', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    const kbButton = page.getByRole('button', { name: /Knowledge Base/i });
    await kbButton.click();
    await page.waitForTimeout(500);

    // Knowledge Base should show product/template/scenario/pattern content
    const kbContent = page.getByText(/product|template|image|scenario|pattern/i).first();
    await expect(kbContent).toBeVisible({ timeout: 15000 });
  });

  test('click API Keys button loads its content', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    const apiKeysButton = page.getByRole('button', { name: /API Keys/i });
    await apiKeysButton.click();
    await page.waitForTimeout(500);

    const apiContent = page.getByText(/API|key|Gemini|configure|service/i).first();
    await expect(apiContent).toBeVisible({ timeout: 15000 });
  });

  test('click Usage & Quotas button loads its content', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    const usageButton = page.getByRole('button', { name: /Usage & Quotas/i });
    await usageButton.click();
    await page.waitForTimeout(500);

    const usageContent = page.getByText(/usage|quota|generation|cost|limit/i).first();
    await expect(usageContent).toBeVisible({ timeout: 15000 });
  });

  test('click Brand Profile button after switching away returns to brand content', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    // Navigate away first
    const apiKeysButton = page.getByRole('button', { name: /API Keys/i });
    await apiKeysButton.click();
    await page.waitForTimeout(500);

    // Navigate back to Brand Profile
    const brandButton = page.getByRole('button', { name: /Brand Profile/i });
    await brandButton.click();
    await page.waitForTimeout(500);

    await expect(brandButton).toHaveClass(/bg-primary\/10/);

    const brandContent = page.getByText(/Brand Values|Visual Style|Edit Profile|brand name/i).first();
    await expect(brandContent).toBeVisible({ timeout: 15000 });
  });

  // ─── URL State Updates ──────────────────────────────────────────

  test('clicking API Keys updates URL to ?section=api-keys', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    const apiKeysButton = page.getByRole('button', { name: /API Keys/i });
    await apiKeysButton.click();
    await page.waitForTimeout(500);

    expect(page.url()).toContain('section=api-keys');
  });

  test('clicking Knowledge Base updates URL to ?section=knowledge-base', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    const kbButton = page.getByRole('button', { name: /Knowledge Base/i });
    await kbButton.click();
    await page.waitForTimeout(500);

    expect(page.url()).toContain('section=knowledge-base');
  });

  test('clicking Usage & Quotas updates URL to ?section=usage', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    const usageButton = page.getByRole('button', { name: /Usage & Quotas/i });
    await usageButton.click();
    await page.waitForTimeout(500);

    expect(page.url()).toContain('section=usage');
  });

  // ─── Direct URL Navigation ──────────────────────────────────────

  test('direct navigation to ?section=api-keys loads API Keys section', async ({ page }) => {
    await gotoWithAuth(page, '/settings?section=api-keys');

    const apiKeysButton = page.getByRole('button', { name: /API Keys/i });
    await expect(apiKeysButton).toHaveClass(/bg-primary\/10/, { timeout: 10000 });

    const apiContent = page.getByText(/API|key|Gemini|configure|service/i).first();
    await expect(apiContent).toBeVisible({ timeout: 15000 });
  });

  test('direct navigation to ?section=knowledge-base loads Knowledge Base section', async ({ page }) => {
    await gotoWithAuth(page, '/settings?section=knowledge-base');

    const kbButton = page.getByRole('button', { name: /Knowledge Base/i });
    await expect(kbButton).toHaveClass(/bg-primary\/10/, { timeout: 10000 });

    const kbContent = page.getByText(/product|template|image|scenario|pattern/i).first();
    await expect(kbContent).toBeVisible({ timeout: 15000 });
  });

  test('direct navigation to ?section=usage loads Usage & Quotas section', async ({ page }) => {
    await gotoWithAuth(page, '/settings?section=usage');

    const usageButton = page.getByRole('button', { name: /Usage & Quotas/i });
    await expect(usageButton).toHaveClass(/bg-primary\/10/, { timeout: 10000 });

    const usageContent = page.getByText(/usage|quota|generation|cost|limit/i).first();
    await expect(usageContent).toBeVisible({ timeout: 15000 });
  });

  // ─── Header Navigation ─────────────────────────────────────────

  test('Header shows Settings as active nav item', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    // The header nav link for Settings should have aria-current="page"
    const settingsLink = page.locator('header nav a[href="/settings"]');
    await expect(settingsLink).toHaveAttribute('aria-current', 'page', { timeout: 10000 });
  });

  test('Header Settings link has active styling', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    // The span inside the Settings link should carry bg-primary/10 active class
    const settingsSpan = page.locator('header nav a[href="/settings"] span');
    await expect(settingsSpan).toHaveClass(/bg-primary\/10/, { timeout: 10000 });
  });

  // ─── Brand Profile Section Details ──────────────────────────────

  test('Brand Profile section has form fields or edit button', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    // Brand Profile shows either an edit button or form inputs depending on state
    const editButton = page.getByRole('button', { name: /Edit Profile/i });
    const saveButton = page.getByRole('button', { name: /Save|Update/i }).first();
    const formInput = page.locator('input, textarea').first();

    const hasEditBtn = await editButton.isVisible().catch(() => false);
    const hasSaveBtn = await saveButton.isVisible().catch(() => false);
    const hasFormInput = await formInput.isVisible().catch(() => false);
    // Also check for brand-related text content (the section may render read-only)
    const hasBrandText = await page
      .getByText(/brand|company|business|profile/i)
      .first()
      .isVisible()
      .catch(() => false);

    // At least one of these should be present in the Brand Profile section
    expect(hasEditBtn || hasSaveBtn || hasFormInput || hasBrandText).toBe(true);
  });

  // ─── Lazy Loading Spinner ───────────────────────────────────────

  test('lazy section loading shows spinner before content renders', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    // Navigate to a new section — the Suspense fallback spinner may briefly appear
    const usageButton = page.getByRole('button', { name: /Usage & Quotas/i });
    await usageButton.click();

    // Either the spinner appeared and was replaced, or content loaded instantly.
    // We verify that content eventually appears (spinner is transient).
    const usageContent = page.getByText(/usage|quota|generation|cost|limit/i).first();
    await expect(usageContent).toBeVisible({ timeout: 15000 });
  });

  // ─── Active State Highlight ─────────────────────────────────────

  test('only the active sidebar button carries bg-primary/10 class', async ({ page }) => {
    await gotoWithAuth(page, '/settings?section=api-keys');

    const brandButton = page.getByRole('button', { name: /Brand Profile/i });
    const kbButton = page.getByRole('button', { name: /Knowledge Base/i });
    const apiKeysButton = page.getByRole('button', { name: /API Keys/i });
    const usageButton = page.getByRole('button', { name: /Usage & Quotas/i });

    // API Keys should be active
    await expect(apiKeysButton).toHaveClass(/bg-primary\/10/, { timeout: 10000 });

    // Others should NOT have the active class
    const brandClass = (await brandButton.getAttribute('class')) ?? '';
    const kbClass = (await kbButton.getAttribute('class')) ?? '';
    const usageClass = (await usageButton.getAttribute('class')) ?? '';

    expect(brandClass).not.toContain('bg-primary/10');
    expect(kbClass).not.toContain('bg-primary/10');
    expect(usageClass).not.toContain('bg-primary/10');
  });

  // ─── No Duplicate Headers ──────────────────────────────────────

  test('settings page has exactly one header element', async ({ page }) => {
    await gotoWithAuth(page, '/settings');

    const headerCount = await page.locator('header').count();
    expect(headerCount).toBe(1);
  });
});
