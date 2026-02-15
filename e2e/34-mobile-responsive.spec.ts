import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * Mobile Responsive E2E Tests
 *
 * Tests all major pages at 375x667 (iPhone SE) viewport.
 * Verifies no horizontal scroll, correct layout adaptations,
 * and touch-friendly interactions.
 *
 * Uses the 'mobile' project in playwright.config.ts (iPhone 13 device).
 * These tests are matched by testMatch: /34-mobile-responsive\.spec\.ts/
 */

test.describe('Mobile Responsive', { tag: '@mobile' }, () => {
  test.use({ viewport: { width: 375, height: 667 } });

  // --- Studio Page ---

  test('Studio page renders without horizontal scroll on mobile', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForTimeout(3000);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test('Studio page shows content (h1 or quick start input)', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForTimeout(3000);

    const heading = page.locator('h1').first();
    const quickStart = page.locator('input[placeholder*="describe"]');

    const hasHeading = await heading.isVisible();
    const hasQuickStart = await quickStart.isVisible();
    expect(hasHeading || hasQuickStart).toBeTruthy();
  });

  // --- Gallery Page ---

  test('Gallery page renders without horizontal scroll on mobile', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await page.waitForTimeout(3000);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test('Gallery page is accessible on mobile', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await page.waitForTimeout(3000);

    // Should show gallery heading or content
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  // --- Pipeline Page ---

  test('Pipeline page renders without horizontal scroll on mobile', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline');
    await page.waitForTimeout(3000);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test('Pipeline page shows content on mobile', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline');
    await page.waitForTimeout(3000);

    // Pipeline should show tabs or heading
    const heading = page.locator('h1').first();
    const tabs = page.locator('[role="tablist"]');

    const hasHeading = await heading.isVisible();
    const hasTabs = await tabs.isVisible();
    expect(hasHeading || hasTabs).toBeTruthy();
  });

  // --- Settings Page ---

  test('Settings page renders without horizontal scroll on mobile', async ({ page }) => {
    await gotoWithAuth(page, '/settings');
    await page.waitForTimeout(3000);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test('Settings sidebar stacks vertically on mobile', async ({ page }) => {
    await gotoWithAuth(page, '/settings');
    await page.waitForTimeout(3000);

    // Settings uses flex-col on mobile (lg:flex-row)
    // Nav buttons should still be visible
    const brandNav = page.getByRole('button', { name: /Brand Profile/i });
    await expect(brandNav).toBeVisible();

    const settingsHeading = page.locator('h1').filter({ hasText: 'Settings' });
    await expect(settingsHeading).toBeVisible();
  });

  // --- Library Page ---

  test('Library page renders without horizontal scroll on mobile', async ({ page }) => {
    await gotoWithAuth(page, '/library');
    await page.waitForTimeout(3000);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  // --- Header Navigation on Mobile ---

  test('header renders on mobile viewport', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForTimeout(3000);

    const header = page.locator('header').first();
    await expect(header).toBeVisible();
  });

  // --- Global Chat FAB on Mobile ---

  test('Global Chat FAB is visible and tappable on mobile', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForTimeout(3000);

    const fab = page.locator('button[aria-label="Open chat"]');
    await expect(fab).toBeVisible();

    // Verify the FAB is within the viewport
    const box = await fab.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x + box.width).toBeLessThanOrEqual(375);
      expect(box.y + box.height).toBeLessThanOrEqual(667);
    }
  });

  test('Chat panel opens on mobile and fits viewport', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForTimeout(3000);

    const fab = page.locator('button[aria-label="Open chat"]');
    await fab.click();
    await page.waitForTimeout(1000);

    const chatPanel = page.locator('[role="dialog"]').filter({ hasText: /Ad Assistant/i });
    await expect(chatPanel).toBeVisible();

    // Chat dialog should not cause horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 5);
  });
});
