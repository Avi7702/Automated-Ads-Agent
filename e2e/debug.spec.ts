/* eslint-disable no-console */
import { test, expect } from '@playwright/test';

test('page should load without errors', async ({ page }) => {
  test.setTimeout(60000); // 60s timeout for slow startup

  // Go to home page
  await page.goto('/', { timeout: 45000 });

  // Wait for page to load
  await page.waitForTimeout(5000);

  // Take a screenshot
  await page.screenshot({ path: 'test-results/debug-screenshot.png' });

  // Check for runtime error overlay
  const errorOverlay = page.locator('text=Cannot read properties of null');
  const hasError = await errorOverlay.isVisible().catch(() => false);

  if (hasError) {
    console.log('ERROR: React useEffect error detected');
    // Log page content for debugging
    const content = await page.content();
    console.log('Page has error overlay');
  }

  // Expect no error overlay
  await expect(errorOverlay).not.toBeVisible({ timeout: 1000 });

  // Check that the main app loaded
  const quickStartInput = page.locator('input[placeholder*="Just describe what you want"]');
  await expect(quickStartInput).toBeVisible({ timeout: 10000 });
});
