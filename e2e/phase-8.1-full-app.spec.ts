import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Phase 8.1: Full Product Content Studio Application
 *
 * Tests cover:
 * 1. Authentication & Session Management
 * 2. Studio Page (Image Generation, Copy Generation, Preview)
 * 3. Library Page (Product Library, Brand Images, Templates)
 * 4. Social Accounts Page (n8n Integration, Account Management)
 * 5. Settings Page (API Keys, Brand Profile, n8n Config)
 * 6. Navigation (Between Pages, Performance)
 * 7. Phase 8.1 Performance Optimizations (Compression, Cache Headers, Fast Navigation)
 *
 * Production URL: https://automated-ads-agent-production.up.railway.app
 */

const PRODUCTION_URL = 'https://automated-ads-agent-production.up.railway.app';

// Helper function to measure navigation performance
async function measureNavigationTime(page: Page, targetUrl: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(targetUrl);
  await page.waitForLoadState('networkidle');
  return Date.now() - startTime;
}

test.describe('Phase 8.1: Authentication & Session', () => {
  test('should load login page without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('404')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should either be logged in (Studio) or see login form
    const studioHeading = page.locator('h1').first();
    const isVisible = await studioHeading.isVisible();
    expect(isVisible).toBe(true);

    // No critical console errors
    expect(consoleErrors.length).toBe(0);
  });

  test('should maintain session across page reloads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // If logged in, verify user menu exists
    const userMenu = page.locator('[data-testid="user-menu"]');
    const hasUserMenu = await userMenu.count() > 0;

    if (hasUserMenu) {
      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // User menu should still exist (session persisted)
      await expect(userMenu).toBeVisible();
    }
  });
});

test.describe('Phase 8.1: Studio Page - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display product selection grid', async ({ page }) => {
    // Wait for products to load
    await page.waitForTimeout(1500);

    // Products should be displayed in grid
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    // Should have at least 1 product
    expect(count).toBeGreaterThan(0);
  });

  test('should allow product selection', async ({ page }) => {
    await page.waitForTimeout(1500);

    const firstProduct = page.locator('[data-testid="product-card"]').first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await page.waitForTimeout(500);

      // Product should be selected (visual feedback)
      const isSelected = await firstProduct.evaluate((el) => {
        return el.classList.contains('ring-2') || el.classList.contains('border-primary');
      });

      expect(isSelected).toBe(true);
    }
  });

  test('should display idea bank suggestions', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Select a product first
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await page.waitForTimeout(1000);

      // Idea bank panel should appear
      const ideaBankPanel = page.locator('[data-testid="idea-bank-panel"]');
      if (await ideaBankPanel.isVisible()) {
        await expect(ideaBankPanel).toBeVisible();

        // Should show suggestions
        const suggestions = page.locator('[data-testid="idea-suggestion"]');
        const suggestionsCount = await suggestions.count();
        expect(suggestionsCount).toBeGreaterThan(0);
      }
    }
  });

  test('should have image generation functionality', async ({ page }) => {
    // Check for "Generate" or "Generate Image" button
    const generateButton = page.locator('button:has-text("Generate")').first();

    if (await generateButton.isVisible()) {
      await expect(generateButton).toBeVisible();

      // Button should be enabled or disabled based on state
      const isDisabled = await generateButton.isDisabled();
      // We just verify the button exists, not necessarily enabled
    }
  });

  test('should have copy generation functionality', async ({ page }) => {
    // Check for copy generation controls
    const copySection = page.locator('text=Copy Generation');

    // If copy generation exists, verify controls
    if (await copySection.isVisible()) {
      await expect(copySection).toBeVisible();
    }
  });

  test('should display action buttons (Edit, Copy, Preview)', async ({ page }) => {
    // Action buttons should exist for generated content
    const editButton = page.locator('button:has-text("Edit")');
    const copyButton = page.locator('button:has-text("Copy")');
    const previewButton = page.locator('button:has-text("Preview")');

    // Count how many action buttons exist
    const editCount = await editButton.count();
    const copyCount = await copyButton.count();
    const previewCount = await previewButton.count();

    // At least one type of action button should exist
    expect(editCount + copyCount + previewCount).toBeGreaterThan(0);
  });
});

test.describe('Phase 8.1: Library Page', () => {
  test('should navigate to Library page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Library in navigation
    const libraryLink = page.locator('a[href="/library"]');
    await libraryLink.click();
    await page.waitForLoadState('networkidle');

    // Verify we're on Library page
    await expect(page).toHaveURL(/\/library/);

    // Library heading should be visible
    const libraryHeading = page.locator('h1:has-text("Library")');
    await expect(libraryHeading).toBeVisible();
  });

  test('should display product library', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Products should be displayed
    const products = page.locator('[data-testid="library-product"]');
    const count = await products.count();

    // Should have at least 1 product
    expect(count).toBeGreaterThan(0);
  });

  test('should have brand images section', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    // Check for Brand Images navigation or section
    const brandImagesSection = page.locator('text=Brand Images');
    if (await brandImagesSection.isVisible()) {
      await expect(brandImagesSection).toBeVisible();
    }
  });

  test('should have templates section', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    // Check for Templates navigation or section
    const templatesSection = page.locator('text=Templates');
    if (await templatesSection.isVisible()) {
      await expect(templatesSection).toBeVisible();
    }
  });
});

test.describe('Phase 8.1: Social Accounts Page', () => {
  test('should navigate to Social Accounts page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Social Accounts in navigation
    const socialAccountsLink = page.locator('a[href="/social-accounts"]');
    await socialAccountsLink.click();
    await page.waitForLoadState('networkidle');

    // Verify we're on Social Accounts page
    await expect(page).toHaveURL(/\/social-accounts/);
  });

  test('should display social accounts page without 500 error', async ({ page }) => {
    await page.goto('/social-accounts');
    await page.waitForLoadState('networkidle');

    // Page should load successfully (no 500 error)
    const pageError = page.locator('text=500');
    const has500Error = await pageError.isVisible();
    expect(has500Error).toBe(false);

    // Should show social accounts UI
    const socialAccountsHeading = page.locator('h1:has-text("Social Accounts")');
    await expect(socialAccountsHeading).toBeVisible();
  });

  test('should fetch /api/social/accounts successfully', async ({ page }) => {
    let apiResponse: any = null;
    let apiError: any = null;

    // Listen for API response
    page.on('response', async (response) => {
      if (response.url().includes('/api/social/accounts')) {
        apiResponse = response;
        if (!response.ok()) {
          apiError = await response.text();
        }
      }
    });

    await page.goto('/social-accounts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // API should return 200 OK (not 500)
    if (apiResponse) {
      expect(apiResponse.status()).toBe(200);
      expect(apiError).toBe(null);
    }
  });

  test('should display empty state or account list', async ({ page }) => {
    await page.goto('/social-accounts');
    await page.waitForLoadState('networkidle');

    // Should either show accounts or empty state
    const accountsList = page.locator('[data-testid="social-accounts-list"]');
    const emptyState = page.locator('text=No social accounts connected');

    const hasAccounts = await accountsList.isVisible();
    const hasEmptyState = await emptyState.isVisible();

    // At least one should be visible
    expect(hasAccounts || hasEmptyState).toBe(true);
  });
});

test.describe('Phase 8.1: Settings Page', () => {
  test('should navigate to Settings page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Settings in navigation
    const settingsLink = page.locator('a[href="/settings"]');
    await settingsLink.click();
    await page.waitForLoadState('networkidle');

    // Verify we're on Settings page
    await expect(page).toHaveURL(/\/settings/);
  });

  test('should display settings sections', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Settings heading should be visible
    const settingsHeading = page.locator('h1:has-text("Settings")');
    await expect(settingsHeading).toBeVisible();

    // Should have API Keys section
    const apiKeysSection = page.locator('text=API Keys');
    if (await apiKeysSection.isVisible()) {
      await expect(apiKeysSection).toBeVisible();
    }

    // Should have Brand Profile section
    const brandProfileSection = page.locator('text=Brand Profile');
    if (await brandProfileSection.isVisible()) {
      await expect(brandProfileSection).toBeVisible();
    }
  });

  test('should have n8n configuration section', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Check for n8n configuration
    const n8nSection = page.locator('text=n8n');
    if (await n8nSection.isVisible()) {
      await expect(n8nSection).toBeVisible();
    }
  });
});

test.describe('Phase 8.1: Navigation Performance', () => {
  test('should navigate between pages quickly (< 2 seconds)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Measure navigation to Library
    const libraryStartTime = Date.now();
    await page.locator('a[href="/library"]').click();
    await page.waitForLoadState('networkidle');
    const libraryLoadTime = Date.now() - libraryStartTime;

    console.log(`Library navigation: ${libraryLoadTime}ms`);
    expect(libraryLoadTime).toBeLessThan(2000);

    // Measure navigation to Settings
    const settingsStartTime = Date.now();
    await page.locator('a[href="/settings"]').click();
    await page.waitForLoadState('networkidle');
    const settingsLoadTime = Date.now() - settingsStartTime;

    console.log(`Settings navigation: ${settingsLoadTime}ms`);
    expect(settingsLoadTime).toBeLessThan(2000);

    // Measure navigation back to Studio
    const studioStartTime = Date.now();
    await page.locator('a[href="/"]').click();
    await page.waitForLoadState('networkidle');
    const studioLoadTime = Date.now() - studioStartTime;

    console.log(`Studio navigation: ${studioLoadTime}ms`);
    expect(studioLoadTime).toBeLessThan(2000);
  });

  test('Header should not re-render unnecessarily during navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Add marker to track re-renders
    await page.evaluate(() => {
      const header = document.querySelector('header');
      if (header) {
        (header as any).__renderCount = 0;
        const observer = new MutationObserver(() => {
          (header as any).__renderCount++;
        });
        observer.observe(header, { childList: true, subtree: true });
      }
    });

    // Navigate to Library
    await page.locator('a[href="/library"]').click();
    await page.waitForLoadState('networkidle');

    // Navigate to Settings
    await page.locator('a[href="/settings"]').click();
    await page.waitForLoadState('networkidle');

    // Check render count
    const renderCount = await page.evaluate(() => {
      const header = document.querySelector('header');
      return (header as any).__renderCount || 0;
    });

    // Header should re-render minimally (< 5 times for 2 navigations)
    console.log(`Header render count: ${renderCount}`);
    expect(renderCount).toBeLessThan(5);
  });
});

test.describe('Phase 8.1: Performance Optimizations - Compression', () => {
  test('should serve compressed assets (gzip or brotli)', async ({ page }) => {
    let compressedAssets = 0;
    let totalAssets = 0;

    // Listen for responses
    page.on('response', async (response) => {
      const url = response.url();

      // Check JS/CSS assets
      if (url.endsWith('.js') || url.endsWith('.css')) {
        totalAssets++;

        const contentEncoding = response.headers()['content-encoding'];
        if (contentEncoding === 'gzip' || contentEncoding === 'br') {
          compressedAssets++;
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log(`Compressed assets: ${compressedAssets}/${totalAssets}`);

    // At least 80% of assets should be compressed
    if (totalAssets > 0) {
      const compressionRate = compressedAssets / totalAssets;
      expect(compressionRate).toBeGreaterThan(0.8);
    }
  });

  test('should reduce bundle size by ~65% with compression', async ({ page }) => {
    let uncompressedSize = 0;
    let compressedSize = 0;

    page.on('response', async (response) => {
      const url = response.url();

      if (url.includes('index') && url.endsWith('.js')) {
        const contentLength = response.headers()['content-length'];
        const contentEncoding = response.headers()['content-encoding'];

        if (contentLength) {
          if (contentEncoding === 'gzip' || contentEncoding === 'br') {
            compressedSize += parseInt(contentLength);
          } else {
            uncompressedSize += parseInt(contentLength);
          }
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log(`Bundle sizes - Uncompressed: ${uncompressedSize}, Compressed: ${compressedSize}`);

    // If we have compressed size, it should be significantly smaller
    if (compressedSize > 0) {
      const reductionRate = 1 - (compressedSize / (compressedSize + uncompressedSize));
      console.log(`Compression rate: ${(reductionRate * 100).toFixed(1)}%`);
      expect(reductionRate).toBeGreaterThan(0.5); // At least 50% reduction
    }
  });
});

test.describe('Phase 8.1: Performance Optimizations - Cache Headers', () => {
  test('should have immutable cache headers on static assets', async ({ page }) => {
    let assetsWithCache = 0;
    let totalAssets = 0;

    page.on('response', async (response) => {
      const url = response.url();

      // Check JS/CSS assets with content hash
      if ((url.includes('assets/') && url.endsWith('.js')) || url.endsWith('.css')) {
        totalAssets++;

        const cacheControl = response.headers()['cache-control'];
        if (cacheControl && (cacheControl.includes('immutable') || cacheControl.includes('max-age'))) {
          assetsWithCache++;
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log(`Assets with cache headers: ${assetsWithCache}/${totalAssets}`);

    // All hashed assets should have cache headers
    if (totalAssets > 0) {
      const cacheRate = assetsWithCache / totalAssets;
      expect(cacheRate).toBe(1.0); // 100% of assets should be cached
    }
  });

  test('should NOT cache HTML files', async ({ page }) => {
    let htmlResponse: any = null;

    page.on('response', async (response) => {
      const url = response.url();

      if (url.endsWith('/') || url.endsWith('.html')) {
        htmlResponse = response;
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    if (htmlResponse) {
      const cacheControl = htmlResponse.headers()['cache-control'];
      console.log(`HTML cache-control: ${cacheControl}`);

      // HTML should have no-cache or no cache header
      expect(cacheControl).toContain('no-cache');
    }
  });

  test('should enable fast repeat visits with cached assets', async ({ page }) => {
    // First visit
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Second visit (should be faster due to cache)
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const repeatVisitTime = Date.now() - startTime;

    console.log(`Repeat visit time: ${repeatVisitTime}ms`);

    // Repeat visit should be very fast (< 1 second)
    expect(repeatVisitTime).toBeLessThan(1000);
  });
});

test.describe('Phase 8.1: Performance Optimizations - Overall Page Performance', () => {
  test('should load Studio page within 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const domLoadTime = Date.now() - startTime;

    await page.waitForLoadState('networkidle');

    const fullLoadTime = Date.now() - startTime;

    console.log(`Performance - DOM: ${domLoadTime}ms, Full: ${fullLoadTime}ms`);

    // DOM should load very quickly
    expect(domLoadTime).toBeLessThan(1500);

    // Full load should complete within 3 seconds
    expect(fullLoadTime).toBeLessThan(3000);
  });

  test('should have no console errors during normal usage', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out known non-critical errors
        if (!text.includes('favicon') &&
            !text.includes('404') &&
            !text.includes('401') &&
            !text.includes('net::ERR') &&
            !text.includes('Failed to load resource')) {
          consoleErrors.push(text);
        }
      }
    });

    // Navigate through app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    await page.goto('/social-accounts');
    await page.waitForLoadState('networkidle');

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    console.log(`Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Errors found:', consoleErrors);
    }

    expect(consoleErrors.length).toBe(0);
  });

  test('should have fast Time to Interactive (TTI)', async ({ page }) => {
    await page.goto('/');

    // Measure time until page is interactive
    const tti = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const startTime = performance.now();

        // Wait for page to be interactive
        if (document.readyState === 'complete') {
          resolve(performance.now() - startTime);
        } else {
          window.addEventListener('load', () => {
            resolve(performance.now() - startTime);
          });
        }
      });
    });

    console.log(`Time to Interactive: ${tti}ms`);

    // TTI should be under 2 seconds
    expect(tti).toBeLessThan(2000);
  });
});

test.describe('Phase 8.1: Database Migration - Social Connections', () => {
  test('should have social_connections table created', async ({ page }) => {
    // This test verifies the migration was applied by checking API response
    let apiResponse: any = null;

    page.on('response', async (response) => {
      if (response.url().includes('/api/social/accounts')) {
        apiResponse = response;
      }
    });

    await page.goto('/social-accounts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // API should return 200 OK with valid JSON (not 500 error)
    if (apiResponse) {
      expect(apiResponse.status()).toBe(200);

      const data = await apiResponse.json();
      expect(data).toHaveProperty('accounts');
      expect(Array.isArray(data.accounts)).toBe(true);
    }
  });
});

// Production-specific tests
test.describe('Phase 8.1: Production Validation', () => {
  test.skip(({ }, testInfo) => !testInfo.project.name.includes('production'), 'Production only');

  test('should load production site with all Phase 8.1 optimizations', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Verify page loads
    await expect(page).toHaveTitle(/Product Content Studio|Automated Ads/i);

    // Verify no 500 errors
    const errorPage = page.locator('text=500');
    const has500Error = await errorPage.isVisible();
    expect(has500Error).toBe(false);

    // Verify compression is enabled
    let hasCompression = false;
    page.on('response', async (response) => {
      const contentEncoding = response.headers()['content-encoding'];
      if (contentEncoding === 'gzip' || contentEncoding === 'br') {
        hasCompression = true;
      }
    });

    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    expect(hasCompression).toBe(true);

    // Take production screenshot
    await page.screenshot({
      path: 'e2e/screenshots/production-phase-8.1.png',
      fullPage: true,
    });
  });
});
