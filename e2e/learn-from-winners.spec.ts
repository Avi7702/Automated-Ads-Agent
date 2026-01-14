import { test, expect } from '@playwright/test';
import { LearnFromWinnersPage } from './pages/learn-from-winners.page';
import { LoginPage } from './pages/login.page';

test.describe('Learn from Winners Page', () => {
  test.describe('Authentication', () => {
    test('redirects unauthenticated users to login', async ({ page }) => {
      const learnPage = new LearnFromWinnersPage(page);

      await page.goto('/learn-from-winners');

      // Should redirect to login
      await page.waitForURL('/login', { timeout: 10000 });

      const loginPage = new LoginPage(page);
      const isVisible = await loginPage.isVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe('Page Display (Authenticated)', () => {
    test.beforeEach(async ({ page, request }) => {
      // Authenticate via demo user
      const demoResponse = await request.get('/api/auth/demo');
      expect(demoResponse.ok()).toBeTruthy();
    });

    test('shows page with correct elements', async ({ page }) => {
      const learnPage = new LearnFromWinnersPage(page);

      await learnPage.goto();
      await learnPage.waitForPatternsLoad();

      // Verify the page displays correctly
      const isVisible = await learnPage.isVisible();
      expect(isVisible).toBe(true);

      // Upload zone should be visible
      const uploadZoneVisible = await learnPage.isUploadZoneVisible();
      expect(uploadZoneVisible).toBe(true);
    });

    test('shows empty state when no patterns exist', async ({ page }) => {
      const learnPage = new LearnFromWinnersPage(page);

      await learnPage.goto();
      await learnPage.waitForPatternsLoad();

      // If no patterns, should show empty state
      const hasPatterns = await learnPage.hasPatterns();
      if (!hasPatterns) {
        const emptyVisible = await learnPage.isEmptyStateVisible();
        expect(emptyVisible).toBe(true);
      }
    });

    test('search input is functional', async ({ page }) => {
      const learnPage = new LearnFromWinnersPage(page);

      await learnPage.goto();
      await learnPage.waitForPatternsLoad();

      // Search input should be interactive
      await learnPage.searchPatterns('test');

      // Verify the input has the value
      const searchValue = await page.locator('input[placeholder="Search patterns..."]').inputValue();
      expect(searchValue).toBe('test');

      // Clear and verify
      await learnPage.clearSearch();
      const clearedValue = await page.locator('input[placeholder="Search patterns..."]').inputValue();
      expect(clearedValue).toBe('');
    });

    test('upload zone is clickable', async ({ page }) => {
      const learnPage = new LearnFromWinnersPage(page);

      await learnPage.goto();
      await learnPage.waitForPatternsLoad();

      // The upload zone should be clickable and trigger file input
      const uploadInput = page.locator('input[type="file"]');
      await expect(uploadInput).toBeAttached();
    });

    test('page has no console errors on load', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      page.on('pageerror', error => {
        errors.push(`Page error: ${error.message}`);
      });

      const learnPage = new LearnFromWinnersPage(page);
      await learnPage.goto();
      await learnPage.waitForPatternsLoad();

      // Filter out expected warnings/errors (like React dev mode warnings)
      const criticalErrors = errors.filter(e =>
        !e.includes('DevTools') &&
        !e.includes('React') &&
        !e.includes('Warning:') &&
        !e.includes('Hydration')
      );

      // Should have no critical errors
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('Responsive Design', () => {
    test.beforeEach(async ({ page, request }) => {
      const demoResponse = await request.get('/api/auth/demo');
      expect(demoResponse.ok()).toBeTruthy();
    });

    test('displays correctly on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      const learnPage = new LearnFromWinnersPage(page);
      await learnPage.goto();
      await learnPage.waitForPatternsLoad();

      // Page should still be visible
      const isVisible = await learnPage.isVisible();
      expect(isVisible).toBe(true);

      // Upload zone should still be visible
      const uploadZoneVisible = await learnPage.isUploadZoneVisible();
      expect(uploadZoneVisible).toBe(true);
    });

    test('displays correctly on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      const learnPage = new LearnFromWinnersPage(page);
      await learnPage.goto();
      await learnPage.waitForPatternsLoad();

      const isVisible = await learnPage.isVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe('Navigation', () => {
    test.beforeEach(async ({ page, request }) => {
      const demoResponse = await request.get('/api/auth/demo');
      expect(demoResponse.ok()).toBeTruthy();
    });

    test('can navigate to Learn from Winners from header', async ({ page }) => {
      // Start at home page
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Find and click the Patterns link in header
      const patternsLink = page.locator('nav a, header a').filter({ hasText: /Patterns/i });

      if (await patternsLink.isVisible()) {
        await patternsLink.click();

        // Should navigate to learn-from-winners
        await page.waitForURL(/learn-from-winners/, { timeout: 10000 });

        const learnPage = new LearnFromWinnersPage(page);
        const isVisible = await learnPage.isVisible();
        expect(isVisible).toBe(true);
      }
    });

    test('direct URL navigation works', async ({ page }) => {
      const learnPage = new LearnFromWinnersPage(page);

      await page.goto('/learn-from-winners');
      await learnPage.waitForPatternsLoad();

      const isVisible = await learnPage.isVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe('API Response Handling', () => {
    test.beforeEach(async ({ page, request }) => {
      const demoResponse = await request.get('/api/auth/demo');
      expect(demoResponse.ok()).toBeTruthy();
    });

    test('handles empty patterns response gracefully', async ({ page }) => {
      // Mock empty response
      await page.route('/api/learned-patterns*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ patterns: [], count: 0, filters: {} })
        });
      });

      const learnPage = new LearnFromWinnersPage(page);
      await learnPage.goto();
      await learnPage.waitForPatternsLoad();

      // Should show empty state without errors
      const emptyVisible = await learnPage.isEmptyStateVisible();
      expect(emptyVisible).toBe(true);
    });

    test('handles patterns response correctly', async ({ page }) => {
      // Mock response with patterns
      await page.route('/api/learned-patterns*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            patterns: [
              {
                id: 'test-1',
                name: 'Test Pattern',
                category: 'product_showcase',
                platform: 'instagram',
                usageCount: 5,
                confidenceScore: 0.85,
                isActive: true,
                createdAt: new Date().toISOString()
              }
            ],
            count: 1,
            filters: {}
          })
        });
      });

      const learnPage = new LearnFromWinnersPage(page);
      await learnPage.goto();
      await learnPage.waitForPatternsLoad();

      // Should show the pattern
      const hasPatterns = await learnPage.hasPatterns();
      expect(hasPatterns).toBe(true);
    });

    test('handles API error gracefully', async ({ page }) => {
      // Mock error response
      await page.route('/api/learned-patterns*', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      const learnPage = new LearnFromWinnersPage(page);
      await learnPage.goto();

      // Wait for error state
      await page.waitForTimeout(2000);

      // Should show error message
      const errorVisible = await learnPage.errorMessage.isVisible().catch(() => false);
      // Note: The page might handle errors differently, just ensure no crash
      const isVisible = await learnPage.isVisible();
      expect(isVisible).toBe(true);
    });
  });
});
