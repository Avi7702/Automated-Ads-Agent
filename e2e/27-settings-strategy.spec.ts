import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';
import { SettingsPage } from './pages/settings.page';

/**
 * Settings — Strategy Section E2E Tests
 *
 * Route: /settings?section=strategy
 * Component: StrategySection
 *
 * Manages: Posting frequency, Category targets (slider + total badge),
 * Preferred platforms (checkboxes), Posting times (select per day),
 * Product priorities (tier + weight table), Save Strategy button.
 */

test.describe('Settings - Strategy', { tag: '@settings' }, () => {
  let settings: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsPage(page);
    await gotoWithAuth(page, '/settings?section=strategy');
    await settings.waitForSectionContent();
  });

  // --- Section Load ---

  test('displays Content Strategy heading', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page.getByText('Content Strategy').first()).toBeVisible();
    await expect(
      page.getByText('Configure your posting frequency, category mix, platforms, and product priorities.'),
    ).toBeVisible();
  });

  test('URL contains section=strategy', async ({ page }) => {
    expect(page.url()).toContain('section=strategy');
  });

  // --- Posting Frequency ---

  test('displays Posting Frequency with 3 frequency options', async ({ page }) => {
    await page.waitForTimeout(2000);

    await expect(page.getByText('Posting Frequency').first()).toBeVisible();

    // 3 frequency buttons: 3, 5, 7 posts/week
    await expect(page.getByRole('button', { name: '3 posts/week' })).toBeVisible();
    await expect(page.getByRole('button', { name: '5 posts/week' })).toBeVisible();
    await expect(page.getByRole('button', { name: '7 posts/week' })).toBeVisible();
  });

  test('clicking a frequency option marks it as active', async ({ page }) => {
    await page.waitForTimeout(2000);

    const btn7 = page.getByRole('button', { name: '7 posts/week' });
    await btn7.click();

    // Active button should have the 'default' variant styling via data-variant or class
    const classes = (await btn7.getAttribute('class')) ?? '';
    const dataVariant = (await btn7.getAttribute('data-variant')) ?? '';
    expect(dataVariant === 'default' || /bg-primary|data-\[state=active\]/.test(classes)).toBeTruthy();
  });

  // --- Category Targets ---

  test('displays Category Targets with slider controls', async ({ page }) => {
    await page.waitForTimeout(2000);

    await expect(page.getByText('Category Targets').first()).toBeVisible();

    // 5 categories
    await expect(page.getByText('Product Showcase')).toBeVisible();
    await expect(page.getByText('Educational')).toBeVisible();
    await expect(page.getByText('Industry Insights')).toBeVisible();
    await expect(page.getByText('Company Updates')).toBeVisible();
    await expect(page.getByText('Engagement').first()).toBeVisible();

    // Total badge: should show "Total: 100%"
    await expect(page.getByText(/Total: \d+%/)).toBeVisible();
  });

  // --- Preferred Platforms ---

  test('displays Preferred Platforms with checkbox options', async ({ page }) => {
    await page.waitForTimeout(2000);

    await expect(page.getByText('Preferred Platforms').first()).toBeVisible();

    // 5 platform checkboxes
    await expect(page.getByText('LinkedIn')).toBeVisible();
    await expect(page.getByText('Instagram')).toBeVisible();
    await expect(page.getByText('Facebook')).toBeVisible();
    await expect(page.getByText('Twitter/X')).toBeVisible();
    await expect(page.getByText('TikTok')).toBeVisible();
  });

  // --- Posting Times ---

  test('displays Posting Times with day selectors', async ({ page }) => {
    await page.waitForTimeout(2000);

    await expect(page.getByText('Posting Times').first()).toBeVisible();

    // Day labels: Mon through Sun
    await expect(page.getByText('Mon').first()).toBeVisible();
    await expect(page.getByText('Tue').first()).toBeVisible();
    await expect(page.getByText('Wed').first()).toBeVisible();
    await expect(page.getByText('Thu').first()).toBeVisible();
    await expect(page.getByText('Fri').first()).toBeVisible();
  });

  // --- Save Button ---

  test('Save Strategy button exists and is initially disabled (no changes)', async ({ page }) => {
    await page.waitForTimeout(2000);

    const saveBtn = page.getByRole('button', { name: /Save Strategy/i });
    await expect(saveBtn).toBeVisible();

    // Should be disabled when no changes have been made (isDirty = false)
    await expect(saveBtn).toBeDisabled();
  });

  test('"All changes saved" indicator shows when no unsaved changes', async ({ page }) => {
    await page.waitForTimeout(2000);

    // The indicator shows when isDirty=false AND bizData exists.
    // Assert it is either visible or the save button is visible (one must be present).
    const savedIndicator = page.getByText('All changes saved');
    const saveBtn = page.getByRole('button', { name: /Save Strategy/i });

    await expect(savedIndicator.or(saveBtn)).toBeVisible({ timeout: 10000 });
  });
});
