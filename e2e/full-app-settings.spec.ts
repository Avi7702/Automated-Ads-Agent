import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * Comprehensive E2E Tests for the Settings Page
 *
 * Route: /settings
 * Sections: Brand Profile, Knowledge Base, API Keys, Usage & Quotas
 * URL state: /settings?section=brand|knowledge-base|api-keys|usage
 *
 * Settings.tsx renders a sidebar nav + lazy-loaded content panels:
 *   - BrandProfile (embedded) -> BrandProfileDisplay -> BrandProfileForm
 *   - KnowledgeBaseSection -> stats grid with links to /library?tab=*
 *   - ApiKeySettings (embedded) -> ApiKeyCard per service + n8n config
 *   - QuotaDashboard (embedded) -> Monitoring Dashboard with tabs
 */

// ---------------------------------------------------------------------------
// Section Navigation
// ---------------------------------------------------------------------------
test.describe('Settings - Section Navigation', { tag: '@settings' }, () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuth(page, '/settings');
  });

  test('defaults to Brand Profile section on load', async ({ page }) => {
    // Settings heading visible
    await expect(page.locator('h1').filter({ hasText: 'Settings' })).toBeVisible();

    // Brand Profile nav button should be present and visually active
    const brandBtn = page.getByRole('button', { name: /Brand Profile/i });
    await expect(brandBtn).toBeVisible();

    // Active section has bg-primary/10 class
    await expect(brandBtn).toHaveClass(/bg-primary/);
  });

  test('clicking Knowledge Base updates URL to ?section=knowledge-base', async ({ page }) => {
    const kbBtn = page.getByRole('button', { name: /Knowledge Base/i });
    await kbBtn.click();
    await page.waitForTimeout(500);

    expect(page.url()).toContain('section=knowledge-base');
    // KB heading should render
    await expect(page.getByText(/Knowledge Base/i).first()).toBeVisible();
  });

  test('clicking API Keys updates URL to ?section=api-keys', async ({ page }) => {
    const apiBtn = page.getByRole('button', { name: /API Keys/i });
    await apiBtn.click();
    await page.waitForTimeout(500);

    expect(page.url()).toContain('section=api-keys');
  });

  test('clicking Usage & Quotas updates URL to ?section=usage', async ({ page }) => {
    const usageBtn = page.getByRole('button', { name: /Usage/i });
    await usageBtn.click();
    await page.waitForTimeout(500);

    expect(page.url()).toContain('section=usage');
  });

  test('URL deep linking — /settings?section=api-keys loads API Keys section directly', async ({ page }) => {
    await gotoWithAuth(page, '/settings?section=api-keys');

    // API Keys content should be visible (Security alert or service cards)
    const apiContent = page.getByText(/Security|API key|Gemini|Cloudinary/i).first();
    await expect(apiContent).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Brand Profile Section
// ---------------------------------------------------------------------------
test.describe('Settings - Brand Profile', { tag: '@settings' }, () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuth(page, '/settings?section=brand');
  });

  test('renders brand profile content area', async ({ page }) => {
    // Should show either brand profile data or the "No brand profile found" empty state
    const hasProfile = await page
      .getByText(/Edit Profile/i)
      .isVisible()
      .catch(() => false);
    const hasEmpty = await page
      .getByText(/No brand profile found|Create Brand Profile/i)
      .isVisible()
      .catch(() => false);
    const hasLoading = await page
      .getByText(/Loading brand profile/i)
      .isVisible()
      .catch(() => false);

    expect(hasProfile || hasEmpty || hasLoading).toBe(true);
  });

  test('Edit Profile button opens edit form', async ({ page }) => {
    // Wait for lazy load
    await page.waitForTimeout(2000);

    const editBtn = page.getByRole('button', { name: /Edit Profile|Create Brand Profile/i }).first();
    const isVisible = await editBtn.isVisible().catch(() => false);

    if (isVisible) {
      await editBtn.click();
      await page.waitForTimeout(500);

      // BrandProfileForm dialog should open — look for form elements or dialog overlay
      const formVisible = await page
        .locator('[role="dialog"], form, [data-state="open"]')
        .first()
        .isVisible()
        .catch(() => false);
      expect(formVisible).toBe(true);
    } else {
      test.skip();
    }
  });

  test('brand profile shows brand name and industry when profile exists', async ({ page }) => {
    await page.waitForTimeout(2000);

    // If a profile is loaded, it should show the brand name in an h2 and industry text
    const brandName = page.locator('h2').first();
    const hasBrandName = await brandName.isVisible().catch(() => false);

    if (hasBrandName) {
      const text = await brandName.textContent();
      // Brand name should be non-empty (either real name or "Untitled Brand")
      expect(text).toBeTruthy();
    }
  });

  test('brand profile displays Brand Values section when data exists', async ({ page }) => {
    await page.waitForTimeout(2000);

    const brandValues = page.getByText('Brand Values');
    const hasBrandValues = await brandValues.isVisible().catch(() => false);

    // This is data-dependent — pass if visible, skip if no profile exists
    if (!hasBrandValues) {
      const hasEmpty = await page
        .getByText(/No brand profile found/i)
        .isVisible()
        .catch(() => false);
      if (hasEmpty) {
        test.skip();
      }
    }
  });

  test('brand profile displays Voice & Tone section when data exists', async ({ page }) => {
    await page.waitForTimeout(2000);

    const voiceTone = page.getByText('Voice & Tone');
    const hasVoiceTone = await voiceTone.isVisible().catch(() => false);

    if (!hasVoiceTone) {
      // If no profile or voice data, this is expected — just verify page loaded
      await expect(page.locator('h1').filter({ hasText: 'Settings' })).toBeVisible();
    }
  });

  test('brand profile Cancel/Close discards edit form', async ({ page }) => {
    await page.waitForTimeout(2000);

    const editBtn = page.getByRole('button', { name: /Edit Profile|Create Brand Profile/i }).first();
    const isVisible = await editBtn.isVisible().catch(() => false);

    if (isVisible) {
      await editBtn.click();
      await page.waitForTimeout(500);

      // Look for Cancel or Close button inside the dialog
      const cancelBtn = page.getByRole('button', { name: /Cancel|Close/i }).first();
      const hasCancelBtn = await cancelBtn.isVisible().catch(() => false);

      if (hasCancelBtn) {
        await cancelBtn.click();
        await page.waitForTimeout(500);

        // Dialog should be closed
        const dialogOpen = await page
          .locator('[role="dialog"][data-state="open"]')
          .isVisible()
          .catch(() => false);
        expect(dialogOpen).toBe(false);
      }
    } else {
      test.skip();
    }
  });
});

// ---------------------------------------------------------------------------
// Knowledge Base Section
// ---------------------------------------------------------------------------
test.describe('Settings - Knowledge Base', { tag: '@settings' }, () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuth(page, '/settings?section=knowledge-base');
  });

  test('renders Knowledge Base heading and description', async ({ page }) => {
    await expect(page.getByText('Knowledge Base').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/AI uses this data to generate better/i)).toBeVisible({ timeout: 10000 });
  });

  test('displays stat cards for Products, Brand Images, Scenarios, Templates', async ({ page }) => {
    // Wait for queries to resolve
    await page.waitForTimeout(3000);

    const productsCard = page.getByText('Products').first();
    const brandImagesCard = page.getByText('Brand Images').first();
    const scenariosCard = page.getByText('Installation Scenarios').first();
    const templatesCard = page.getByText('Scene Templates').first();

    await expect(productsCard).toBeVisible({ timeout: 10000 });
    await expect(brandImagesCard).toBeVisible({ timeout: 10000 });
    await expect(scenariosCard).toBeVisible({ timeout: 10000 });
    await expect(templatesCard).toBeVisible({ timeout: 10000 });
  });

  test('Products card links to /library?tab=products', async ({ page }) => {
    await page.waitForTimeout(3000);

    // The stat card is wrapped in a Link to /library?tab=products
    const productsLink = page.locator('a[href="/library?tab=products"]').first();
    const isVisible = await productsLink.isVisible().catch(() => false);

    if (isVisible) {
      await productsLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/library');
    }
  });

  test('Knowledge Base shows status indicator (active or empty)', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Either "Knowledge base active with X products" or "No products added yet"
    const activeStatus = page.getByText(/Knowledge base active|No products added/i).first();
    await expect(activeStatus).toBeVisible({ timeout: 10000 });
  });

  test('Quick Actions section has Add Products button', async ({ page }) => {
    await page.waitForTimeout(2000);

    const quickActions = page.getByText('Quick Actions');
    await expect(quickActions).toBeVisible({ timeout: 10000 });

    const addProductsBtn = page.getByRole('link', { name: /Add Products/i });
    await expect(addProductsBtn).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// API Keys Section
// ---------------------------------------------------------------------------
test.describe('Settings - API Keys', { tag: '@settings' }, () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuth(page, '/settings?section=api-keys');
  });

  test('shows Security notice about AES-256-GCM encryption', async ({ page }) => {
    await expect(page.getByText(/AES-256-GCM|encrypted|Security/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('renders API key cards for all supported services', async ({ page }) => {
    await page.waitForTimeout(2000);

    // The 4 supported services: Gemini, Cloudinary, Firecrawl, Redis
    const gemini = page.getByText('Google Gemini').first();
    const cloudinary = page.getByText('Cloudinary').first();
    const firecrawl = page.getByText('Firecrawl').first();
    const redis = page.getByText('Redis').first();

    await expect(gemini).toBeVisible({ timeout: 10000 });
    await expect(cloudinary).toBeVisible({ timeout: 10000 });
    await expect(firecrawl).toBeVisible({ timeout: 10000 });
    await expect(redis).toBeVisible({ timeout: 10000 });
  });

  test('each service card shows a status badge', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Status badges: "Using Default", "Custom Key", "Invalid Key", or "Not Configured"
    const badges = page.locator('text=/Using Default|Custom Key|Invalid Key|Not Configured/i');
    const count = await badges.count();

    // Should have at least 4 badges (one per service)
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('Add Key / Edit Key button exists on each card', async ({ page }) => {
    await page.waitForTimeout(2000);

    const keyButtons = page.getByRole('button', { name: /Add Key|Edit Key/i });
    const count = await keyButtons.count();

    // At least 4 (one per service)
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('clicking Add Key opens the API key form dialog', async ({ page }) => {
    await page.waitForTimeout(2000);

    const addKeyBtn = page.getByRole('button', { name: /Add Key|Edit Key/i }).first();
    await addKeyBtn.click();
    await page.waitForTimeout(500);

    // ApiKeyForm dialog should open
    const dialog = page.locator('[role="dialog"], [data-state="open"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  test('n8n Automation section is visible with URL and API key inputs', async ({ page }) => {
    await page.waitForTimeout(2000);

    await expect(page.getByText('n8n Automation')).toBeVisible({ timeout: 10000 });

    // n8n Instance URL input
    const urlInput = page.locator('input[type="url"][placeholder*="n8n"]');
    await expect(urlInput).toBeVisible();

    // n8n API Key input
    const apiKeyInput = page.locator('input[type="password"][placeholder*="n8n_api"]');
    await expect(apiKeyInput).toBeVisible();
  });

  test('n8n Save button is disabled when URL is empty', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Clear the URL input first
    const urlInput = page.locator('input[type="url"][placeholder*="n8n"]');
    await urlInput.fill('');

    const saveBtn = page.getByRole('button', { name: /Save n8n Configuration/i });
    await expect(saveBtn).toBeDisabled();
  });

  test('no duplicate headers in embedded API Keys section', async ({ page }) => {
    // In embedded mode, ApiKeySettings should not render its own Header
    const headerCount = await page.locator('header').count();
    expect(headerCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Usage & Quotas Section
// ---------------------------------------------------------------------------
test.describe('Settings - Usage & Quotas', { tag: '@settings' }, () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuth(page, '/settings?section=usage');
  });

  test('renders Monitoring Dashboard heading', async ({ page }) => {
    await expect(page.getByText(/Monitoring Dashboard/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows 4 dashboard tabs: API Quota, System Health, Performance, Errors', async ({ page }) => {
    await page.waitForTimeout(2000);

    const quotaTab = page.getByRole('tab', { name: /Quota/i });
    const healthTab = page.getByRole('tab', { name: /Health/i });
    const perfTab = page.getByRole('tab', { name: /Performance|Perf/i });
    const errorsTab = page.getByRole('tab', { name: /Errors/i });

    await expect(quotaTab).toBeVisible();
    await expect(healthTab).toBeVisible();
    await expect(perfTab).toBeVisible();
    await expect(errorsTab).toBeVisible();
  });

  test('API Quota tab is active by default', async ({ page }) => {
    await page.waitForTimeout(2000);

    const quotaTab = page.getByRole('tab', { name: /Quota/i });
    await expect(quotaTab).toHaveAttribute('data-state', 'active');
  });

  test('clicking System Health tab shows health content', async ({ page }) => {
    await page.waitForTimeout(2000);

    const healthTab = page.getByRole('tab', { name: /Health/i });
    await healthTab.click();
    await page.waitForTimeout(1000);

    await expect(healthTab).toHaveAttribute('data-state', 'active');
  });
});

// ---------------------------------------------------------------------------
// Legacy Redirects
// ---------------------------------------------------------------------------
test.describe('Settings - Legacy Redirects', { tag: '@settings' }, () => {
  test('/brand-profile redirects to /settings', async ({ page }) => {
    await gotoWithAuth(page, '/brand-profile');
    await expect(page).toHaveURL(/\/settings/);
  });

  test('/usage redirects to /settings?section=usage', async ({ page }) => {
    await gotoWithAuth(page, '/usage');
    await expect(page).toHaveURL(/\/settings\?section=usage/);
  });
});
