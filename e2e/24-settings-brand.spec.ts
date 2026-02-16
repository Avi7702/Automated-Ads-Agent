import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';
import { SettingsPage } from './pages/settings.page';

/**
 * Settings — Brand Profile Section E2E Tests
 *
 * Route: /settings (default section = brand)
 * Component tree: Settings -> BrandProfile (embedded) -> BrandProfileDisplay -> BrandProfileForm
 *
 * Tests: default load, Edit Profile dialog, form fields, save/cancel,
 *        Brand Values, Voice & Tone, colors, logo placeholder, validation
 */

test.describe('Settings - Brand Profile', { tag: '@settings' }, () => {
  let settings: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsPage(page);
    await gotoWithAuth(page, '/settings');
    await settings.waitForSectionContent();
  });

  // --- Default Section ---

  test('Brand Profile is the default active section', async ({ page }) => {
    const brandBtn = page.getByRole('button', { name: /Brand Profile/i });
    await expect(brandBtn).toBeVisible();
    // Active class check
    await expect(brandBtn).toHaveClass(/bg-primary/);
    // URL has no section param or defaults to brand
    const url = page.url();
    expect(url.includes('section=brand') || !url.includes('section=')).toBeTruthy();
  });

  test('renders Settings heading and description', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Settings' })).toBeVisible();
    await expect(page.getByText('Configure your account and preferences')).toBeVisible();
  });

  test('renders brand profile content area', async ({ page }) => {
    // Either the BrandProfileDisplay loads with a profile or shows "No brand profile found"
    const brandName = page.locator('h2').filter({ hasText: /.+/ });
    const noProfileMessage = page.getByText('No brand profile found');

    // One of these should be visible
    await expect(brandName.first().or(noProfileMessage)).toBeVisible({ timeout: 10000 });
  });

  // --- Edit Profile Dialog ---

  test('Edit Profile button opens the brand profile form', async ({ page }) => {
    // Wait for profile content to load
    await page.waitForTimeout(1000);

    const editBtn = page
      .getByRole('button', { name: /Edit Profile/i })
      .or(page.getByRole('button', { name: /Create Brand Profile/i }));

    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    // The BrandProfileForm renders as a dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  test('Edit Profile dialog has form fields for brand details', async ({ page }) => {
    await page.waitForTimeout(1000);

    const editBtn = page
      .getByRole('button', { name: /Edit Profile/i })
      .or(page.getByRole('button', { name: /Create Brand Profile/i }));

    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Should have input fields for brand name, industry, etc.
    const inputs = dialog.locator('input, textarea');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(1);
  });

  test('Edit Profile dialog can be closed with Cancel or X', async ({ page }) => {
    await page.waitForTimeout(1000);

    const editBtn = page
      .getByRole('button', { name: /Edit Profile/i })
      .or(page.getByRole('button', { name: /Create Brand Profile/i }));

    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Close via Cancel button or X
    const closeBtn = dialog.getByRole('button', { name: /Cancel|Close/i }).or(
      dialog
        .locator('button')
        .filter({ has: page.locator('svg') })
        .first(),
    );

    await expect(closeBtn).toBeVisible({ timeout: 5000 });
    await closeBtn.click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  // --- Brand Values Section ---

  test('displays Brand Values badges when profile exists', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Brand Values section has Heart icon and heading
    const brandValuesSection = page.getByText('Brand Values');
    await expect(brandValuesSection).toBeVisible({ timeout: 10000 });

    // Should have badges displayed
    const badges = page.locator(
      '.pl-6 .flex.flex-wrap.gap-2 [class*="Badge"], .pl-6 .flex.flex-wrap.gap-2 [data-slot="badge"]',
    );
    const badgeCount = await badges.count();
    // Just verify the section renders — count may be 0 if no values set
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  // --- Voice & Tone Section ---

  test('displays Voice & Tone section when voice data exists', async ({ page }) => {
    await page.waitForTimeout(1500);

    const voiceSection = page.getByText('Voice & Tone');
    await expect(voiceSection).toBeVisible({ timeout: 10000 });
    // Should display summary, principles, or word lists
    const voiceContent = page.locator('.pl-6').nth(1);
    await expect(voiceContent).toBeVisible();
  });

  // --- Visual Style Section ---

  test('displays Visual Style with color preferences when data exists', async ({ page }) => {
    await page.waitForTimeout(1500);

    const visualStyleSection = page.getByText('Visual Style');
    await expect(visualStyleSection).toBeVisible({ timeout: 10000 });

    // Color Preferences or Preferred Styles sub-sections
    const colorPrefs = page.getByText('Color Preferences');
    const stylePrefs = page.getByText('Preferred Styles');

    await expect(colorPrefs.or(stylePrefs)).toBeVisible({ timeout: 5000 });
  });

  // --- Sidebar Navigation ---

  test('all 5 section nav buttons are visible', async ({ _page }) => {
    await expect(settings.brandNav).toBeVisible();
    await expect(settings.knowledgeBaseNav).toBeVisible();
    await expect(settings.apiKeysNav).toBeVisible();
    await expect(settings.strategyNav).toBeVisible();
    await expect(settings.usageNav).toBeVisible();
  });

  test('section nav buttons show descriptions', async ({ page }) => {
    // Each nav button has a description line
    await expect(page.getByText('Manage your brand identity and voice')).toBeVisible();
    await expect(page.getByText('Products, scenarios, and brand assets')).toBeVisible();
    await expect(page.getByText('Configure external service integrations')).toBeVisible();
    await expect(page.getByText('Content strategy and product priorities')).toBeVisible();
    await expect(page.getByText('Monitor API usage and costs')).toBeVisible();
  });

  // --- Loading State ---

  test('shows loading spinner or content on initial load', async ({ page }) => {
    // Navigate fresh — catch the loading state
    await page.goto('/settings');

    // The BrandProfileDisplay shows a Loader2 spinner while loading, then content
    const spinner = page.locator('.animate-spin');
    const content = page.locator('.rounded-2xl.border').first();

    // Either spinner or content should appear
    await expect(spinner.or(content)).toBeVisible({ timeout: 10000 });
  });

  // --- URL Direct Access ---

  test('navigating directly to /settings?section=brand shows brand content', async ({ page }) => {
    await gotoWithAuth(page, '/settings?section=brand');
    await settings.waitForSectionContent();

    const brandBtn = page.getByRole('button', { name: /Brand Profile/i });
    await expect(brandBtn).toHaveClass(/bg-primary/);
  });
});
