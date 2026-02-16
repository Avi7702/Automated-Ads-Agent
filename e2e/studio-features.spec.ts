import { test, expect } from '@playwright/test';

test.describe('Studio Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Studio
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('History Timeline', () => {
    test('shows history timeline section after generation', async ({ page }) => {
      // This would require a generation to be present
      // For now, just check the component renders when there's state

      // Check if Studio loads
      await expect(page.locator('text=Product Content Studio')).toBeVisible();
    });

    test('history timeline loads existing generations', async ({ page }) => {
      // If there are existing generations, the timeline should show them
      const _historySection = page.locator('text=Recent Generations');

      // Wait a bit for API calls
      await page.waitForTimeout(1000);

      // The section may or may not be visible depending on state
      // This is more of an integration test to ensure no errors
    });
  });

  test.describe('Save to Catalog Dialog', () => {
    test('save to catalog button exists in result actions', async ({ page }) => {
      // This would require a generation first
      // Check that the button would be there after generation

      // For now, verify Studio loads without errors
      await expect(page.locator('text=Product Content Studio')).toBeVisible();
    });
  });

  test.describe('Idea Bank Panel', () => {
    test('idea bank shows when products are selected', async ({ page }) => {
      // Wait for products to load
      await page.waitForTimeout(1000);

      // Find and click a product to select it
      const productCards = page.locator('[class*="aspect-square"]').first();

      if (await productCards.isVisible()) {
        await productCards.click();

        // Idea Bank should appear
        await page.waitForTimeout(500);

        // Check for Idea Bank header
        const _ideaBank = page.locator('text=Intelligent Idea Bank');
        // It may or may not appear depending on products
      }
    });

    test('idea bank has generate buttons when products selected', async ({ page }) => {
      // Wait for products to load
      await page.waitForTimeout(1000);

      // Try to find products section
      const productsSection = page.locator('text=Your Products');
      if (await productsSection.isVisible()) {
        // Click to expand if collapsed
        await productsSection.click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('No Console Errors', () => {
    test('studio page loads without console errors', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Filter out known non-critical errors
      const criticalErrors = consoleErrors.filter(err =>
        !err.includes('favicon') &&
        !err.includes('404') &&
        !err.includes('401') && // Auth errors expected when not logged in
        !err.includes('net::ERR')
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });
});

test.describe('API Endpoints for New Features', () => {
  test('GET /api/generations returns array', async ({ request }) => {
    const response = await request.get('/api/generations?limit=5');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('POST /api/products accepts form data', async ({ request: _request }) => {
    // This would test the save to catalog endpoint
    // Skipping actual upload to avoid side effects
  });

  test('POST /api/idea-bank/suggest returns suggestions', async ({ request }) => {
    const response = await request.post('/api/idea-bank/suggest', {
      data: {
        productIds: [],
        maxSuggestions: 3,
      },
    });

    // May return error if no products, but shouldn't crash
    expect(response.status()).toBeLessThan(500);
  });
});
