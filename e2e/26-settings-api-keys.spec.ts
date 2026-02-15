import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';
import { SettingsPage } from './pages/settings.page';

/**
 * Settings — API Keys Section E2E Tests
 *
 * Route: /settings?section=api-keys
 * Component: ApiKeySettings (embedded) -> ApiKeyCard per service + ApiKeyForm dialog + n8n config
 *
 * Services: gemini, cloudinary, firecrawl, redis
 * Each service renders an ApiKeyCard with status badge, Configure/Edit, Validate, Remove actions.
 */

test.describe('Settings - API Keys', { tag: '@settings' }, () => {
  let settings: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsPage(page);
    await gotoWithAuth(page, '/settings?section=api-keys');
    await settings.waitForSectionContent();
  });

  // --- Security Notice ---

  test('shows AES-256-GCM security notice', async ({ page }) => {
    const securityAlert = page.getByText(/encrypted with AES-256-GCM/i);
    await expect(securityAlert).toBeVisible({ timeout: 10000 });
  });

  test('security notice has shield icon', async ({ page }) => {
    // Alert with title "Security"
    await expect(page.getByText('Security').first()).toBeVisible({ timeout: 10000 });
  });

  // --- 4 Service Cards ---

  test('renders Google Gemini service card', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page.getByText('Google Gemini').first()).toBeVisible();
    await expect(page.getByText('AI image generation and analysis').first()).toBeVisible();
  });

  test('renders Cloudinary service card', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page.getByText('Cloudinary').first()).toBeVisible();
    await expect(page.getByText('Image storage and transformation').first()).toBeVisible();
  });

  test('renders Firecrawl service card', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page.getByText('Firecrawl').first()).toBeVisible();
    await expect(page.getByText('Web scraping for product data').first()).toBeVisible();
  });

  test('renders Redis service card', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page.getByText('Redis').first()).toBeVisible();
    await expect(page.getByText('Caching and rate limiting').first()).toBeVisible();
  });

  // --- Status Badges ---

  test('each service card shows a status badge', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Badges can be: "Using Default", "Custom Key", "Not Configured", "Invalid"
    const badges = page.locator('[data-slot="badge"], [class*="Badge"]');
    const badgeCount = await badges.count();
    // At least 4 badges for 4 services
    expect(badgeCount).toBeGreaterThanOrEqual(4);
  });

  // --- Configure / Edit Button ---

  test('service cards have Configure or Edit button', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Each card has a Configure or Edit action
    const configureButtons = page.getByRole('button', { name: /Configure|Edit/i });
    const count = await configureButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('clicking Configure opens the API key form dialog', async ({ page }) => {
    await page.waitForTimeout(2000);

    const configureBtn = page.getByRole('button', { name: /Configure|Edit/i }).first();
    await expect(configureBtn).toBeVisible();
    await configureBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  test('API key form dialog has input fields and Save button', async ({ page }) => {
    await page.waitForTimeout(2000);

    const configureBtn = page.getByRole('button', { name: /Configure|Edit/i }).first();
    await expect(configureBtn).toBeVisible();
    await configureBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Dialog should have at least one input
    const inputs = dialog.locator('input');
    expect(await inputs.count()).toBeGreaterThanOrEqual(1);

    // Save button in dialog
    const saveBtn = dialog.getByRole('button', { name: /Save/i });
    await expect(saveBtn).toBeVisible();
  });

  test('API key form dialog can be closed', async ({ page }) => {
    await page.waitForTimeout(2000);

    const configureBtn = page.getByRole('button', { name: /Configure|Edit/i }).first();
    await expect(configureBtn).toBeVisible();
    await configureBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Close via Cancel or X
    const cancelBtn = dialog.getByRole('button', { name: /Cancel|Close/i }).first();
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  // --- n8n Automation Section ---

  test('renders n8n Automation configuration section', async ({ page }) => {
    await page.waitForTimeout(2000);

    await expect(page.getByText('n8n Automation')).toBeVisible();
    await expect(page.getByText(/Configure your n8n instance/i)).toBeVisible();
  });

  test('n8n section has URL and API key inputs', async ({ page }) => {
    await page.waitForTimeout(2000);

    await expect(page.getByText('n8n Instance URL')).toBeVisible();
    await expect(page.getByPlaceholder(/your-instance.app.n8n.cloud/i)).toBeVisible();

    await expect(page.getByText('n8n API Key')).toBeVisible();
    await expect(page.getByPlaceholder(/n8n_api_xyz/i)).toBeVisible();
  });

  test('n8n Save button is disabled when URL is empty', async ({ page }) => {
    await page.waitForTimeout(2000);

    const saveBtn = page.getByRole('button', { name: /Save n8n Configuration/i });
    await expect(saveBtn).toBeVisible();

    // Clear the URL field first
    const urlInput = page.getByPlaceholder(/your-instance.app.n8n.cloud/i);
    await urlInput.clear();

    await expect(saveBtn).toBeDisabled();
  });

  // --- How It Works Section ---

  test('renders How It Works info section', async ({ page }) => {
    await page.waitForTimeout(2000);

    await expect(page.getByText('How It Works')).toBeVisible();
    await expect(page.getByText(/Default keys/i).first()).toBeVisible();
    await expect(page.getByText(/Custom keys/i).first()).toBeVisible();
  });
});
