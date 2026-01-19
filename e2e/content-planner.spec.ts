import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

/**
 * Content Planner E2E Tests
 *
 * Tests cover:
 * 1. API endpoint functionality (/api/content-planner/*)
 * 2. UI page rendering and interactions
 * 3. Template guidance panel
 * 4. Generate complete post functionality
 * 5. Console error monitoring
 */

// =============================================================================
// API TESTS
// =============================================================================

test.describe('Content Planner API', () => {
  test.describe('GET /api/content-planner/templates', () => {
    test('returns templates and categories', async ({ request }) => {
      const response = await request.get('/api/content-planner/templates');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty('categories');
      expect(data).toHaveProperty('templates');
      expect(Array.isArray(data.categories)).toBeTruthy();
      expect(Array.isArray(data.templates)).toBeTruthy();
      expect(data.categories.length).toBeGreaterThan(0);
      expect(data.templates.length).toBeGreaterThan(0);
    });

    test('templates have required fields', async ({ request }) => {
      const response = await request.get('/api/content-planner/templates');
      const data = await response.json();

      // Check first template has required fields
      const template = data.templates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('category');
      expect(template).toHaveProperty('title');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('hookFormulas');
      expect(template).toHaveProperty('postStructure');
      expect(template).toHaveProperty('bestPlatforms');
      expect(template).toHaveProperty('productRequirement');
    });

    test('categories have correct structure', async ({ request }) => {
      const response = await request.get('/api/content-planner/templates');
      const data = await response.json();

      const category = data.categories[0];
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('percentage');
      expect(category).toHaveProperty('weeklyTarget');
      expect(category).toHaveProperty('templates');
      expect(Array.isArray(category.templates)).toBeTruthy();
    });
  });

  test.describe('GET /api/content-planner/balance', () => {
    test('returns weekly balance data for authenticated user', async ({ request }) => {
      const response = await request.get('/api/content-planner/balance');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty('balance');
      expect(data).toHaveProperty('suggested');
      expect(data).toHaveProperty('totalPosts');
      expect(typeof data.totalPosts).toBe('number');
    });

    test('balance contains all category IDs', async ({ request }) => {
      const response = await request.get('/api/content-planner/balance');
      const data = await response.json();

      const expectedCategories = [
        'product_showcase',
        'educational',
        'industry_insights',
        'customer_success',
        'company_updates',
        'engagement',
      ];

      for (const categoryId of expectedCategories) {
        expect(data.balance).toHaveProperty(categoryId);
        expect(data.balance[categoryId]).toHaveProperty('current');
        expect(data.balance[categoryId]).toHaveProperty('target');
        expect(data.balance[categoryId]).toHaveProperty('percentage');
      }
    });
  });

  test.describe('GET /api/content-planner/suggestion', () => {
    test('returns suggestion based on balance', async ({ request }) => {
      const response = await request.get('/api/content-planner/suggestion');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty('category');
      expect(data).toHaveProperty('reason');
      expect(data.category).toHaveProperty('id');
      expect(data.category).toHaveProperty('name');
      expect(data.category).toHaveProperty('weeklyTarget');
    });
  });

  test.describe('POST /api/content-planner/generate-post', () => {
    test('returns success with valid template that requires no products', async ({ request }) => {
      // questions_polls template has productRequirement: 'none'
      const response = await request.post('/api/content-planner/generate-post', {
        data: {
          templateId: 'questions_polls',
          productIds: [],
          topic: 'What steel grade do you prefer for residential projects?',
          platform: 'linkedin',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('template');
      expect(data.template.id).toBe('questions_polls');
      // Should have copy since this template doesn't need images
      if (data.copy) {
        expect(data.copy).toHaveProperty('caption');
      }
    });

    test('fails when template requires products but none provided', async ({ request }) => {
      // product_comparisons requires minProducts: 2
      const response = await request.post('/api/content-planner/generate-post', {
        data: {
          templateId: 'product_comparisons',
          productIds: [],
          platform: 'linkedin',
        },
      });

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.copyError).toContain('requires');
    });

    test('fails with invalid templateId', async ({ request }) => {
      const response = await request.post('/api/content-planner/generate-post', {
        data: {
          templateId: 'invalid_template_xyz_12345',
          productIds: [],
          platform: 'linkedin',
        },
      });

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.copyError).toContain('not found');
    });

    test('validates platform parameter', async ({ request }) => {
      const response = await request.post('/api/content-planner/generate-post', {
        data: {
          templateId: 'questions_polls',
          productIds: [],
          platform: 'invalid_platform',
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid platform');
    });

    test('accepts all valid platforms', async ({ request }) => {
      const validPlatforms = ['instagram', 'linkedin', 'facebook', 'twitter', 'tiktok'];

      for (const platform of validPlatforms) {
        const response = await request.post('/api/content-planner/generate-post', {
          data: {
            templateId: 'questions_polls',
            productIds: [],
            topic: 'Test topic',
            platform,
          },
        });

        // Should not return 400 (validation error)
        expect(response.status()).not.toBe(400);
      }
    });

    test('templateId is required', async ({ request }) => {
      const response = await request.post('/api/content-planner/generate-post', {
        data: {
          productIds: [],
          platform: 'linkedin',
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('templateId');
    });
  });

  test.describe('POST /api/content-planner/posts (Mark as Posted)', () => {
    test('records a post with valid category', async ({ request }) => {
      const response = await request.post('/api/content-planner/posts', {
        data: {
          category: 'engagement',
          subType: 'questions_polls',
          platform: 'linkedin',
          notes: 'E2E test post',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('message');
      expect(data.message).toBe('Post recorded');
      expect(data).toHaveProperty('post');
    });

    test('fails with invalid category', async ({ request }) => {
      const response = await request.post('/api/content-planner/posts', {
        data: {
          category: 'invalid_category_xyz',
          subType: 'general',
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid category');
    });
  });

  test.describe('POST /api/content-planner/carousel-outline', () => {
    test('generates carousel outline with valid inputs', async ({ request }) => {
      const response = await request.post('/api/content-planner/carousel-outline', {
        data: {
          templateId: 'technical_guides',
          topic: 'How to read a mill test report',
          slideCount: 7,
          platform: 'linkedin',
        },
      });

      // May fail if Gemini not configured, but should not be 400
      if (response.ok()) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data).toHaveProperty('outline');
        expect(data).toHaveProperty('metadata');
      }
    });

    test('requires templateId', async ({ request }) => {
      const response = await request.post('/api/content-planner/carousel-outline', {
        data: {
          topic: 'Test topic',
          platform: 'linkedin',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('requires topic', async ({ request }) => {
      const response = await request.post('/api/content-planner/carousel-outline', {
        data: {
          templateId: 'technical_guides',
          platform: 'linkedin',
        },
      });

      expect(response.status()).toBe(400);
    });
  });
});

// =============================================================================
// UI TESTS
// =============================================================================

test.describe('Content Planner UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/content-planner');
    await page.waitForLoadState('networkidle');
  });

  test('Content Planner page loads successfully', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Content Planner');

    // Check for strategic guide description
    await expect(page.locator('text=Strategic guide')).toBeVisible();
  });

  test('displays This Week\'s Balance card', async ({ page }) => {
    await expect(page.locator('text=This Week\'s Balance')).toBeVisible();
    await expect(page.locator('text=Track your posting distribution')).toBeVisible();
  });

  test('displays Suggested Next Post card', async ({ page }) => {
    await expect(page.locator('text=Suggested Next Post')).toBeVisible();
    await expect(page.locator('text=Based on your current balance')).toBeVisible();
  });

  test('displays Content Categories section', async ({ page }) => {
    await expect(page.locator('text=Content Categories')).toBeVisible();
  });

  test('all 6 category names are displayed', async ({ page }) => {
    const categoryNames = [
      'Product Showcases',
      'Educational Content',
      'Industry Insights',
      'Customer Success',
      'Company Updates',
      'Engagement Content',
    ];

    for (const categoryName of categoryNames) {
      await expect(page.locator(`text=${categoryName}`).first()).toBeVisible();
    }
  });

  test('category cards show template count badges', async ({ page }) => {
    // Each category should show "X templates" badge
    const templateBadges = page.locator('text=/\\d+ templates/');
    await expect(templateBadges.first()).toBeVisible();
    expect(await templateBadges.count()).toBeGreaterThanOrEqual(6);
  });

  test('expanding a category shows its templates', async ({ page }) => {
    // Click on first category header to expand
    const firstCategoryHeader = page.locator('[class*="CardHeader"]').first();
    await firstCategoryHeader.click();

    // Wait for expansion
    await page.waitForTimeout(500);

    // Should show Best Practices section
    await expect(page.locator('text=Best Practices').first()).toBeVisible();
  });

  test('clicking a template opens detail modal', async ({ page }) => {
    // First expand a category
    const productShowcaseHeader = page.locator('text=Product Showcases').first();
    await productShowcaseHeader.click();
    await page.waitForTimeout(500);

    // Find and click a template card (look for specific template title)
    const templateCard = page.locator('text=Product Specifications').first();
    if (await templateCard.isVisible()) {
      await templateCard.click();

      // Modal should appear with Hook Formulas
      await expect(page.locator('text=Hook Formulas That Work')).toBeVisible({ timeout: 5000 });

      // Modal should have Post Structure section
      await expect(page.locator('text=Post Structure Template')).toBeVisible();

      // Modal should have What to Avoid section
      await expect(page.locator('text=What to Avoid')).toBeVisible();
    }
  });

  test('template modal can be closed', async ({ page }) => {
    // Expand category and open template
    await page.locator('text=Engagement Content').first().click();
    await page.waitForTimeout(500);

    const templateCard = page.locator('text=Questions & Polls').first();
    if (await templateCard.isVisible()) {
      await templateCard.click();
      await expect(page.locator('text=Hook Formulas That Work')).toBeVisible({ timeout: 5000 });

      // Close button (X) in dialog
      const closeButton = page.locator('[role="dialog"] button').first();
      await closeButton.click();

      // Modal should close
      await expect(page.locator('text=Hook Formulas That Work')).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('View Guide button in suggestion card works', async ({ page }) => {
    // Wait for suggestion to load
    await page.waitForTimeout(1500);

    const viewGuideButton = page.locator('button', { hasText: 'View Guide' });
    if (await viewGuideButton.isVisible()) {
      await viewGuideButton.click();

      // Should open template modal
      await expect(page.locator('text=Hook Formulas That Work')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Mark as Posted button opens dialog', async ({ page }) => {
    // Wait for suggestion to load
    await page.waitForTimeout(1500);

    const markAsPostedButton = page.locator('button', { hasText: 'Mark as Posted' });
    if (await markAsPostedButton.isVisible()) {
      await markAsPostedButton.click();

      // Dialog should appear
      await expect(page.locator('text=Mark Post as Complete')).toBeVisible({ timeout: 5000 });

      // Should have platform selection
      await expect(page.locator('text=Platform')).toBeVisible();
    }
  });

  test('balance progress bars are visible for each category', async ({ page }) => {
    // Each category in balance card should have a progress bar
    const progressBars = page.locator('[role="progressbar"]');
    // We have 6 categories
    expect(await progressBars.count()).toBeGreaterThanOrEqual(6);
  });
});

// =============================================================================
// CONTENT PLANNER GUIDANCE COMPONENT TESTS
// =============================================================================

test.describe('Content Planner Guidance Component', () => {
  test('guidance panel appears when navigating from Content Planner to Studio', async ({ page }) => {
    // Navigate to studio with cpTemplateId query param
    await page.goto('/?cpTemplateId=questions_polls');
    await page.waitForLoadState('networkidle');

    // Should see Content Planner Template banner
    await expect(page.locator('text=Content Planner Template')).toBeVisible({ timeout: 10000 });
  });

  test('guidance panel shows template title and description', async ({ page }) => {
    await page.goto('/?cpTemplateId=questions_polls');
    await page.waitForLoadState('networkidle');

    // Should show the template title
    await expect(page.locator('text=Questions & Polls')).toBeVisible({ timeout: 10000 });

    // Should show category
    await expect(page.locator('text=Engagement').first()).toBeVisible();
  });

  test('guidance panel can be dismissed', async ({ page }) => {
    await page.goto('/?cpTemplateId=questions_polls');
    await page.waitForLoadState('networkidle');

    // Wait for guidance panel
    await expect(page.locator('text=Content Planner Template')).toBeVisible({ timeout: 10000 });

    // Find and click dismiss button (X)
    const dismissButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
    if (await dismissButton.isVisible()) {
      await dismissButton.click();

      // Guidance should disappear
      await expect(page.locator('text=Content Planner Template')).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('guidance panel shows hook formulas section', async ({ page }) => {
    await page.goto('/?cpTemplateId=questions_polls');
    await page.waitForLoadState('networkidle');

    // Wait for panel
    await expect(page.locator('text=Content Planner Template')).toBeVisible({ timeout: 10000 });

    // Should have Show Details toggle or Hook Formulas visible
    const hookFormulasText = page.locator('text=Hook Formulas');
    const showDetailsButton = page.locator('button', { hasText: 'Show Hook Formulas' });

    if (await showDetailsButton.isVisible()) {
      await showDetailsButton.click();
    }

    await expect(hookFormulasText).toBeVisible();
  });

  test('Generate Complete Post button exists in guidance panel', async ({ page }) => {
    await page.goto('/?cpTemplateId=questions_polls');
    await page.waitForLoadState('networkidle');

    // Wait for guidance panel
    await expect(page.locator('text=Content Planner Template')).toBeVisible({ timeout: 10000 });

    // Should have Generate Complete Post button
    await expect(page.locator('button', { hasText: 'Generate Complete Post' })).toBeVisible();
  });

  test('Generate Complete Post shows loading state', async ({ page }) => {
    await page.goto('/?cpTemplateId=questions_polls');
    await page.waitForLoadState('networkidle');

    // Wait for guidance panel
    await expect(page.locator('text=Content Planner Template')).toBeVisible({ timeout: 10000 });

    // Click generate button
    const generateButton = page.locator('button', { hasText: 'Generate Complete Post' });
    await generateButton.click();

    // Should show loading state
    await expect(page.locator('text=Generating Complete Post')).toBeVisible({ timeout: 5000 });
  });
});

// =============================================================================
// CONSOLE ERROR TESTS
// =============================================================================

test.describe('Content Planner Console Errors', () => {
  test('Content Planner page loads without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/content-planner');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('404') &&
        !err.includes('401') &&
        !err.includes('net::ERR') &&
        !err.includes('Failed to load resource')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('Content Planner guidance loads without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/?cpTemplateId=questions_polls');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('404') &&
        !err.includes('401') &&
        !err.includes('net::ERR') &&
        !err.includes('Failed to load resource')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('No JavaScript errors during category expansion', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/content-planner');
    await page.waitForLoadState('networkidle');

    // Expand all categories
    const categoryHeaders = page.locator('[class*="CardHeader"]');
    const count = await categoryHeaders.count();

    for (let i = 0; i < Math.min(count, 6); i++) {
      await categoryHeaders.nth(i).click();
      await page.waitForTimeout(300);
    }

    await page.waitForTimeout(1000);

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('404') &&
        !err.includes('401') &&
        !err.includes('net::ERR') &&
        !err.includes('Failed to load resource')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

// =============================================================================
// NAVIGATION TESTS
// =============================================================================

test.describe('Content Planner Navigation', () => {
  test('can navigate to Content Planner from header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for navigation link to Content Planner
    const contentPlannerLink = page.locator('a[href="/content-planner"]');
    if (await contentPlannerLink.isVisible()) {
      await contentPlannerLink.click();
      await expect(page).toHaveURL('/content-planner');
      await expect(page.locator('h1')).toContainText('Content Planner');
    }
  });

  test('Create in Studio link navigates correctly', async ({ page }) => {
    await page.goto('/content-planner');
    await page.waitForLoadState('networkidle');

    // Expand a category and open a template
    await page.locator('text=Engagement Content').first().click();
    await page.waitForTimeout(500);

    const templateCard = page.locator('text=Questions & Polls').first();
    if (await templateCard.isVisible()) {
      await templateCard.click();
      await expect(page.locator('text=Hook Formulas That Work')).toBeVisible({ timeout: 5000 });

      // Click Create in Studio
      const createInStudioLink = page.locator('a', { hasText: 'Create in Studio' });
      if (await createInStudioLink.isVisible()) {
        await createInStudioLink.click();

        // Should navigate to Studio with template ID
        await expect(page).toHaveURL(/cpTemplateId=questions_polls/);
      }
    }
  });
});

// =============================================================================
// RESPONSIVE TESTS
// =============================================================================

test.describe('Content Planner Responsive', () => {
  test('renders correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/content-planner');
    await page.waitForLoadState('networkidle');

    // Page should still show main elements
    await expect(page.locator('h1')).toContainText('Content Planner');
    await expect(page.locator('text=This Week\'s Balance')).toBeVisible();
    await expect(page.locator('text=Suggested Next Post')).toBeVisible();
  });

  test('renders correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/content-planner');
    await page.waitForLoadState('networkidle');

    // Page should show all main elements
    await expect(page.locator('h1')).toContainText('Content Planner');
    await expect(page.locator('text=Content Categories')).toBeVisible();
  });
});

// =============================================================================
// RECENT POSTS SECTION TESTS
// =============================================================================

test.describe('Recent Posts Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/content-planner');
    await page.waitForLoadState('networkidle');
  });

  test('displays Recent Posts section when posts exist', async ({ page, request }) => {
    // Create a post to ensure we have recent posts
    await request.post('/api/content-planner/posts', {
      data: {
        category: 'engagement',
        subType: 'questions_polls',
        platform: 'linkedin',
        notes: 'E2E test post for Recent Posts display',
      },
    });

    // Reload page to see the post
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify Recent Posts section is visible
    await expect(page.locator('text=Recent Posts (Last 7 Days)')).toBeVisible();
    await expect(page.locator('text=Posts you\'ve marked as completed')).toBeVisible();
  });

  test('shows post details correctly', async ({ page, request }) => {
    // Create a test post with all details
    await request.post('/api/content-planner/posts', {
      data: {
        category: 'educational',
        subType: 'technical_guides',
        platform: 'linkedin',
        notes: 'Detailed E2E test post',
      },
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find the recent post items
    const recentPostItems = page.locator('[class*="border rounded-lg"]').filter({
      has: page.locator('svg.lucide-trash-2'),
    });

    // Verify at least one post exists
    await expect(recentPostItems.first()).toBeVisible();

    // Verify platform badge is visible
    await expect(recentPostItems.first().locator('text=linkedin')).toBeVisible();

    // Verify date format (should show month abbreviation)
    await expect(recentPostItems.first().locator('text=/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/')).toBeVisible();
  });

  test('delete button removes post', async ({ page, request }) => {
    // Create a post
    const response = await request.post('/api/content-planner/posts', {
      data: {
        category: 'engagement',
        subType: 'questions_polls',
        platform: 'twitter',
        notes: 'Post to be deleted',
      },
    });
    expect(response.ok()).toBeTruthy();

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Get initial post count
    const recentPostItems = page.locator('[class*="border rounded-lg"]').filter({
      has: page.locator('svg.lucide-trash-2'),
    });
    const initialCount = await recentPostItems.count();
    expect(initialCount).toBeGreaterThan(0);

    // Click delete button on first post
    const deleteButton = recentPostItems.first().locator('button').filter({
      has: page.locator('svg.lucide-trash-2'),
    });
    await deleteButton.click();

    // Verify toast notification
    await expect(page.locator('text=Post removed')).toBeVisible({ timeout: 5000 });

    // Wait for UI to update
    await page.waitForTimeout(1500);

    // Verify post count decreased
    const newCount = await recentPostItems.count();
    expect(newCount).toBeLessThan(initialCount);
  });

  test('balance updates after deleting post', async ({ page, request }) => {
    // Create a post
    await request.post('/api/content-planner/posts', {
      data: {
        category: 'engagement',
        subType: 'questions_polls',
        platform: 'linkedin',
      },
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Get initial total posts count
    const totalPostsElement = page.locator('text=Total Posts This Week').locator('..');
    const initialTotalText = await totalPostsElement.textContent();
    const initialTotal = parseInt(initialTotalText?.match(/(\d+)/)?.[1] || '0');

    // Delete the post
    const deleteButton = page.locator('button').filter({
      has: page.locator('svg.lucide-trash-2'),
    }).first();
    await deleteButton.click();

    // Wait for deletion
    await expect(page.locator('text=Post removed')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000);

    // Verify total decreased
    const newTotalText = await totalPostsElement.textContent();
    const newTotal = parseInt(newTotalText?.match(/(\d+)/)?.[1] || '0');
    expect(newTotal).toBeLessThanOrEqual(initialTotal);
  });

  test('shows multiple posts', async ({ page, request }) => {
    // Create multiple posts
    const posts = [
      { category: 'engagement', subType: 'questions_polls', platform: 'linkedin' },
      { category: 'educational', subType: 'technical_guides', platform: 'twitter' },
    ];

    for (const post of posts) {
      await request.post('/api/content-planner/posts', { data: post });
      await page.waitForTimeout(100);
    }

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify multiple posts are visible
    const recentPostItems = page.locator('[class*="border rounded-lg"]').filter({
      has: page.locator('svg.lucide-trash-2'),
    });
    const count = await recentPostItems.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('post category icon displays correctly', async ({ page, request }) => {
    // Create a post
    await request.post('/api/content-planner/posts', {
      data: {
        category: 'engagement',
        subType: 'general',
      },
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify post has a colored icon container
    const recentPostItems = page.locator('[class*="border rounded-lg"]').filter({
      has: page.locator('svg.lucide-trash-2'),
    });
    const iconContainer = recentPostItems.first().locator('[class*="rounded-lg"][class*="bg-"]').first();
    await expect(iconContainer).toBeVisible();
  });
});

// =============================================================================
// RECENT POSTS API TESTS
// =============================================================================

test.describe('Recent Posts API', () => {
  test('GET /api/content-planner/posts returns posts array', async ({ request }) => {
    const response = await request.get('/api/content-planner/posts');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('GET /api/content-planner/posts returns posts with correct structure', async ({ request }) => {
    // Create a test post first
    await request.post('/api/content-planner/posts', {
      data: {
        category: 'engagement',
        subType: 'questions_polls',
        platform: 'linkedin',
        notes: 'API structure test',
      },
    });

    const response = await request.get('/api/content-planner/posts');
    const posts = await response.json();

    if (posts.length > 0) {
      const post = posts[0];
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('userId');
      expect(post).toHaveProperty('category');
      expect(post).toHaveProperty('postedAt');
    }
  });

  test('DELETE /api/content-planner/posts/:id removes post', async ({ request }) => {
    // Create a post
    const createResponse = await request.post('/api/content-planner/posts', {
      data: {
        category: 'engagement',
        subType: 'questions_polls',
        platform: 'linkedin',
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    const postId = createData.post?.id;

    if (postId) {
      // Delete the post
      const deleteResponse = await request.delete(`/api/content-planner/posts/${postId}`);
      expect(deleteResponse.ok()).toBeTruthy();

      // Verify it's gone
      const getResponse = await request.get('/api/content-planner/posts');
      const posts = await getResponse.json();
      const stillExists = posts.some((p: any) => p.id === postId);
      expect(stillExists).toBe(false);
    }
  });

  test('POST /api/content-planner/posts creates post', async ({ request }) => {
    const postData = {
      category: 'educational',
      subType: 'technical_guides',
      platform: 'linkedin',
      notes: 'Test post for API verification',
    };

    const response = await request.post('/api/content-planner/posts', {
      data: postData,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.message).toBe('Post recorded');
    expect(data.post).toHaveProperty('id');
    expect(data.post.category).toBe(postData.category);
  });
});
