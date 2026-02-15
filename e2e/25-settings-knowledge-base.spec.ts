import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';
import { SettingsPage } from './pages/settings.page';

/**
 * Settings — Knowledge Base Section E2E Tests
 *
 * Route: /settings?section=knowledge-base
 * Component: KnowledgeBaseSection
 *
 * Displays: heading, 4 stat cards (Products, Brand Images, Installation Scenarios,
 * Gen Templates), links to Library tabs, Quick Actions (Add Products, Upload Brand
 * Images, Create Scenario)
 */

test.describe('Settings - Knowledge Base', { tag: '@settings' }, () => {
  let settings: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsPage(page);
    await gotoWithAuth(page, '/settings?section=knowledge-base');
    await settings.waitForSectionContent();
  });

  // --- Section Heading ---

  test('displays Knowledge Base heading with icon', async ({ page }) => {
    const heading = page.getByText('Knowledge Base').first();
    await expect(heading).toBeVisible();

    // Subtext description
    await expect(
      page.getByText('The AI uses this data to generate better, more relevant content for your products.'),
    ).toBeVisible();
  });

  test('URL contains section=knowledge-base', async ({ page }) => {
    expect(page.url()).toContain('section=knowledge-base');
  });

  // --- Status Indicator ---

  test('shows knowledge base status indicator', async ({ page }) => {
    // Wait for loading to finish
    await page.waitForTimeout(2000);

    // Must show one of the three status states
    await expect(
      page.getByText(/Knowledge base active|No products added yet|Loading knowledge base status/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  // --- 4 Stat Cards ---

  test('renders Products stat card', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page.getByText('Products').first()).toBeVisible();
  });

  test('renders Brand Images stat card', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page.getByText('Brand Images').first()).toBeVisible();
  });

  test('renders Installation Scenarios stat card', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page.getByText('Installation Scenarios').first()).toBeVisible();
  });

  test('renders Gen Templates stat card', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page.getByText('Gen Templates').first()).toBeVisible();
  });

  // --- Links to Library Tabs ---

  test('stat cards link to correct Library tabs', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Products card links to /library?tab=products
    const productsLink = page.locator('a[href="/library?tab=products"]');
    const brandImagesLink = page.locator('a[href="/library?tab=brand-images"]');
    const scenariosLink = page.locator('a[href="/library?tab=scenarios"]');
    const templatesLink = page.locator('a[href="/library?tab=scene-templates"]');

    await expect(productsLink.first()).toBeVisible();
    await expect(brandImagesLink.first()).toBeVisible();
    await expect(scenariosLink.first()).toBeVisible();
    await expect(templatesLink.first()).toBeVisible();
  });

  // --- Quick Actions ---

  test('renders Quick Actions section with 3 action buttons', async ({ page }) => {
    await page.waitForTimeout(2000);

    await expect(page.getByText('Quick Actions')).toBeVisible();

    const addProductsBtn = page
      .getByRole('button', { name: /Add Products/i })
      .or(page.locator('a[href="/library?tab=products"]').getByText('Add Products'));
    const uploadImagesBtn = page
      .getByRole('button', { name: /Upload Brand Images/i })
      .or(page.locator('a[href="/library?tab=brand-images"]').getByText('Upload Brand Images'));
    const createScenarioBtn = page
      .getByRole('button', { name: /Create Scenario/i })
      .or(page.locator('a[href="/library?tab=scenarios"]').getByText('Create Scenario'));

    await expect(addProductsBtn).toBeVisible();
    await expect(uploadImagesBtn).toBeVisible();
    await expect(createScenarioBtn).toBeVisible();
  });
});
