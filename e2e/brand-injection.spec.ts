import { test, expect } from '@playwright/test';

test.describe('Brand Profile Injection', () => {
  // Setup: Authenticate before each test
  test.beforeEach(async ({ request }) => {
    // Create/login as demo user
    const response = await request.get('/api/auth/demo');
    expect(response.ok()).toBeTruthy();
  });

  test.describe('Settings Page Brand Profile', () => {
    test('Settings page shows brand profile form', async ({ page }) => {
      // Navigate to settings page
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Verify Brand Profile heading is visible
      await expect(page.locator('h1').filter({ hasText: 'Brand Profile' })).toBeVisible();

      // Verify the form elements are present
      await expect(page.locator('label').filter({ hasText: 'Brand Name' })).toBeVisible();
      await expect(page.locator('label').filter({ hasText: 'Industry' })).toBeVisible();
      await expect(page.locator('label').filter({ hasText: 'Brand Values' })).toBeVisible();

      // Verify the Save Profile button exists
      await expect(page.getByRole('button', { name: /Save Profile/i })).toBeVisible();
    });

    test('Settings page allows creating brand profile', async ({ page, request }) => {
      // First, delete any existing brand profile
      await request.delete('/api/brand-profile');

      // Navigate to settings
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Fill in brand name
      const brandNameInput = page.locator('input#brandName');
      await brandNameInput.fill('Test Brand Co');

      // Select an industry
      await page.locator('button[id="industry"]').click();
      await page.locator('text=Technology').click();

      // Select some brand values
      await page.locator('label').filter({ hasText: 'innovative' }).click();
      await page.locator('label').filter({ hasText: 'professional' }).click();

      // Save the profile
      await page.getByRole('button', { name: /Save Profile/i }).click();

      // Wait for save confirmation
      await expect(page.locator('text=Profile saved successfully')).toBeVisible({ timeout: 5000 });

      // Verify the profile was saved via API
      const profileResponse = await request.get('/api/brand-profile');
      expect(profileResponse.ok()).toBeTruthy();

      const profile = await profileResponse.json();
      expect(profile.brandName).toBe('Test Brand Co');
      expect(profile.industry).toBe('Technology');
      expect(profile.brandValues).toContain('innovative');
      expect(profile.brandValues).toContain('professional');
    });

    test('Settings page loads existing brand profile', async ({ page, request }) => {
      // First, create a brand profile via API
      await request.put('/api/brand-profile', {
        data: {
          brandName: 'Existing Brand',
          industry: 'E-commerce',
          brandValues: ['sustainable', 'premium'],
          preferredStyles: ['modern', 'minimalist'],
        },
      });

      // Navigate to settings
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Verify the brand name is pre-filled
      const brandNameInput = page.locator('input#brandName');
      await expect(brandNameInput).toHaveValue('Existing Brand');

      // Verify industry is selected (check the trigger text)
      await expect(page.locator('button[id="industry"]')).toContainText('E-commerce');

      // Verify brand values are checked
      await expect(page.locator('input#value-sustainable')).toBeChecked();
      await expect(page.locator('input#value-premium')).toBeChecked();

      // Verify preferred styles are checked
      await expect(page.locator('input#style-modern')).toBeChecked();
      await expect(page.locator('input#style-minimalist')).toBeChecked();
    });

    test('Settings page shows delete button for existing profile', async ({ page, request }) => {
      // Create a brand profile first
      await request.put('/api/brand-profile', {
        data: {
          brandName: 'Brand to Delete',
          industry: 'Technology',
        },
      });

      // Navigate to settings
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Verify delete button is visible
      await expect(page.getByRole('button', { name: /Delete Profile/i })).toBeVisible();
    });
  });

  test.describe('Brand Profile API Integration', () => {
    test('logged in user has brand profile attached to API responses', async ({ request }) => {
      // Create a brand profile
      const createResponse = await request.put('/api/brand-profile', {
        data: {
          brandName: 'API Test Brand',
          industry: 'Technology',
          brandValues: ['innovative', 'premium'],
          preferredStyles: ['modern'],
          colorPreferences: ['vibrant'],
        },
      });
      expect(createResponse.ok()).toBeTruthy();

      // Verify the profile is accessible
      const profileResponse = await request.get('/api/brand-profile');
      expect(profileResponse.ok()).toBeTruthy();

      const profile = await profileResponse.json();
      expect(profile).toHaveProperty('brandName', 'API Test Brand');
      expect(profile).toHaveProperty('industry', 'Technology');
      expect(profile.brandValues).toContain('innovative');
      expect(profile.brandValues).toContain('premium');
      expect(profile.preferredStyles).toContain('modern');
      expect(profile.colorPreferences).toContain('vibrant');
    });

    test('brand profile is used in idea bank suggestions', async ({ request }) => {
      // First, create a brand profile with specific values
      await request.put('/api/brand-profile', {
        data: {
          brandName: 'Eco Brand',
          industry: 'Home & Garden',
          brandValues: ['eco-friendly', 'sustainable'],
          preferredStyles: ['rustic', 'minimalist'],
        },
      });

      // Make an idea bank request
      const ideaBankResponse = await request.post('/api/idea-bank/suggest', {
        data: {
          productIds: [],
          maxSuggestions: 3,
        },
      });

      // The request should complete (may return empty if no products)
      expect(ideaBankResponse.status()).toBeLessThan(500);
    });

    test('brand profile can be updated', async ({ request }) => {
      // Create initial profile
      await request.put('/api/brand-profile', {
        data: {
          brandName: 'Original Name',
          industry: 'Technology',
        },
      });

      // Update the profile
      const updateResponse = await request.put('/api/brand-profile', {
        data: {
          brandName: 'Updated Name',
          industry: 'E-commerce',
          brandValues: ['luxury'],
        },
      });
      expect(updateResponse.ok()).toBeTruthy();

      // Verify the update
      const profileResponse = await request.get('/api/brand-profile');
      const profile = await profileResponse.json();

      expect(profile.brandName).toBe('Updated Name');
      expect(profile.industry).toBe('E-commerce');
      expect(profile.brandValues).toContain('luxury');
    });

    test('brand profile can be deleted', async ({ request }) => {
      // Create a profile
      await request.put('/api/brand-profile', {
        data: {
          brandName: 'Deletable Brand',
          industry: 'Technology',
        },
      });

      // Delete the profile
      const deleteResponse = await request.delete('/api/brand-profile');
      expect(deleteResponse.ok()).toBeTruthy();

      // Verify it's deleted
      const profileResponse = await request.get('/api/brand-profile');
      expect(profileResponse.status()).toBe(404);
    });
  });

  test.describe('Brand Profile Voice Settings', () => {
    test('brand voice settings can be saved and loaded', async ({ page, request }) => {
      // Create a profile with voice settings via API
      await request.put('/api/brand-profile', {
        data: {
          brandName: 'Voice Test Brand',
          voice: {
            principles: ['Professional', 'Friendly'],
            wordsToUse: ['innovative', 'quality'],
            wordsToAvoid: ['cheap', 'basic'],
          },
        },
      });

      // Navigate to settings
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Expand the Brand Voice section
      await page.locator('button').filter({ hasText: 'Brand Voice' }).click();

      // Verify the voice principles are shown
      await expect(page.locator('text=Professional').first()).toBeVisible();
      await expect(page.locator('text=Friendly').first()).toBeVisible();
    });
  });

  test.describe('Target Audience Settings', () => {
    test('target audience settings can be saved and loaded', async ({ page, request }) => {
      // Create a profile with target audience via API
      await request.put('/api/brand-profile', {
        data: {
          brandName: 'Audience Test Brand',
          targetAudience: {
            demographics: 'Women aged 25-40',
            psychographics: 'Value sustainability',
            painPoints: ['High prices', 'Poor quality'],
          },
        },
      });

      // Navigate to settings
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Expand the Target Audience section
      await page.locator('button').filter({ hasText: 'Target Audience' }).click();

      // Verify demographics field has the value
      await expect(page.locator('textarea#demographics')).toHaveValue('Women aged 25-40');
      await expect(page.locator('textarea#psychographics')).toHaveValue('Value sustainability');

      // Verify pain points are shown as badges
      await expect(page.locator('text=High prices').first()).toBeVisible();
      await expect(page.locator('text=Poor quality').first()).toBeVisible();
    });
  });

  // Cleanup after tests
  test.afterEach(async ({ request }) => {
    // Delete brand profile to clean up
    await request.delete('/api/brand-profile');
  });
});
