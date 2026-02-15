import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * Cross-Feature Flows E2E Tests
 *
 * Tests navigation and state preservation across multiple pages/features.
 * Verifies that the 4-route architecture (Studio, Gallery, Pipeline, Settings)
 * works cohesively and that legacy redirects function properly.
 */

test.describe('Cross-Feature Flows', { tag: '@cross-feature' }, () => {
  // --- Navigation Between Pages ---

  test('can navigate from Studio to Gallery via header nav', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForTimeout(2000);

    const galleryLink = page.getByRole('link', { name: /Gallery/i }).or(page.locator('header a[href="/gallery"]'));

    await expect(galleryLink).toBeVisible({ timeout: 10000 });
    await galleryLink.click();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/gallery');
  });

  test('can navigate from Gallery to Pipeline via header nav', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await page.waitForTimeout(2000);

    const pipelineLink = page.getByRole('link', { name: /Pipeline/i }).or(page.locator('header a[href="/pipeline"]'));

    await expect(pipelineLink).toBeVisible({ timeout: 10000 });
    await pipelineLink.click();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/pipeline');
  });

  test('can navigate from Pipeline to Settings via header nav', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline');
    await page.waitForTimeout(2000);

    const settingsLink = page.getByRole('link', { name: /Settings/i }).or(page.locator('header a[href="/settings"]'));

    await expect(settingsLink).toBeVisible({ timeout: 10000 });
    await settingsLink.click();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/settings');
  });

  test('can navigate from Settings back to Studio via header nav', async ({ page }) => {
    await gotoWithAuth(page, '/settings');
    await page.waitForTimeout(2000);

    const studioLink = page.getByRole('link', { name: 'Studio', exact: true });

    await expect(studioLink).toBeVisible({ timeout: 10000 });
    await studioLink.click();
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url.endsWith('/') || url.endsWith(':3000')).toBeTruthy();
  });

  // --- Legacy Route Redirects ---

  test('/content-planner redirects to /pipeline?tab=planner', async ({ page }) => {
    await gotoWithAuth(page, '/content-planner');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/pipeline');
    expect(page.url()).toContain('tab=planner');
  });

  test('/usage redirects to /settings?section=usage', async ({ page }) => {
    await gotoWithAuth(page, '/usage');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/settings');
    expect(page.url()).toContain('section=usage');
  });

  test('/brand-profile redirects to /settings', async ({ page }) => {
    await gotoWithAuth(page, '/brand-profile');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/settings');
  });

  test('/settings/api-keys redirects to /settings?section=api-keys', async ({ page }) => {
    await gotoWithAuth(page, '/settings/api-keys');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/settings');
    expect(page.url()).toContain('section=api-keys');
  });

  // --- Settings Section URL Preservation ---

  test('Settings section state preserved via URL when navigating away and back', async ({ page }) => {
    // Go to API Keys section
    await gotoWithAuth(page, '/settings?section=api-keys');
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('section=api-keys');

    // Navigate to Gallery
    const galleryLink = page.getByRole('link', { name: /Gallery/i }).or(page.locator('header a[href="/gallery"]'));

    await expect(galleryLink).toBeVisible({ timeout: 10000 });
    await galleryLink.click();
    await page.waitForLoadState('networkidle');

    // Navigate back to settings via browser back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // URL should still have the section param
    expect(page.url()).toContain('section=api-keys');
  });

  // --- Knowledge Base -> Library Flow ---

  test('KB stat card links navigate to Library with correct tab', async ({ page }) => {
    await gotoWithAuth(page, '/settings?section=knowledge-base');
    await page.waitForTimeout(3000);

    // Click the Products stat card link
    const productsLink = page.locator('a[href="/library?tab=products"]').first();
    await expect(productsLink).toBeVisible({ timeout: 10000 });
    await productsLink.click();
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/library');
    expect(page.url()).toContain('tab=products');
  });
});
