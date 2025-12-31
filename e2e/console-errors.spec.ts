import { test, expect } from '@playwright/test';

test('capture console errors', async ({ page }) => {
  test.setTimeout(60000); // 60s timeout for slow startup

  const errors: string[] = [];

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    errors.push(`Page error: ${error.message}\n${error.stack}`);
  });

  // Go to home page
  await page.goto('/', { timeout: 45000 });

  // Wait for page to attempt load
  await page.waitForTimeout(5000);

  // Log all captured errors
  console.log('=== Console Errors ===');
  errors.forEach((err, i) => {
    console.log(`Error ${i + 1}: ${err}`);
  });
  console.log('======================');

  // Take a screenshot
  await page.screenshot({ path: 'test-results/console-errors.png' });
});
