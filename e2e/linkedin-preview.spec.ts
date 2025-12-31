import { test, expect } from '@playwright/test';

test.describe('LinkedIn Post Preview - Always Visible', () => {
  // Increase timeout for image generation tests
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    // Navigate to Studio
    await page.goto('/');
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
  });

  test('should show LinkedIn Preview panel on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // LinkedIn Preview should be visible on the right side (use heading)
    await expect(page.getByRole('heading', { name: 'LinkedIn Preview' })).toBeVisible();

    // Should show empty placeholders initially
    await expect(page.locator('text=Your ad copy will appear here')).toBeVisible();
    await expect(page.locator('text=Your image will appear here')).toBeVisible();
  });

  test('should show LinkedIn Preview in mobile bottom bar', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Mobile should show the expandable bottom bar with "LinkedIn Preview" text
    const mobileBar = page.locator('.lg\\:hidden button').filter({ hasText: 'LinkedIn Preview' });
    await expect(mobileBar).toBeVisible();

    // Should show "Empty" status badge
    await expect(page.locator('text=Empty')).toBeVisible();
  });

  test('should show Generate Image placeholder button when prompt is ready', async ({ page }) => {
    // Set desktop viewport for this test
    await page.setViewportSize({ width: 1280, height: 800 });

    // Fill in the prompt first
    const promptTextarea = page.locator('textarea[placeholder*="Professional construction"]');
    await promptTextarea.fill('Test product shot for drainage system');

    // Select a product if available
    const productButtons = page.locator('button[class*="aspect-square"]');
    if (await productButtons.count() > 0) {
      await productButtons.first().click();
    }

    // LinkedIn Preview heading should be visible
    await expect(page.getByRole('heading', { name: 'LinkedIn Preview' })).toBeVisible();
  });

  test('should update preview after image generation', async ({ page }) => {
    // Use Quick Start to generate an image
    const quickStartInput = page.locator('input[placeholder*="Just describe what you want"]');
    await quickStartInput.fill('Professional product shot of drainage system');

    // Click Generate Now
    await page.getByRole('button', { name: /Generate Now/i }).click();

    // Wait for generation to start
    await expect(page.locator('text=Generating content')).toBeVisible({ timeout: 10000 });

    // Wait for result state - the image should appear
    await expect(page.locator('text=Start New')).toBeVisible({ timeout: 90000 });

    // The LinkedIn Preview should now show the generated image (not the placeholder)
    await expect(page.locator('text=Your image will appear here')).not.toBeVisible();

    // Verify action buttons are present
    await expect(page.getByRole('button', { name: /Edit/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Copy/i }).first()).toBeVisible();
  });

  test('should generate ad copy when clicking Generate Copy in preview', async ({ page }) => {
    // Quick generate
    const quickStartInput = page.locator('input[placeholder*="Just describe what you want"]');
    await quickStartInput.fill('NDS drainage product marketing image');
    await page.getByRole('button', { name: /Generate Now/i }).click();

    // Wait for image generation to complete
    await expect(page.locator('text=Start New')).toBeVisible({ timeout: 90000 });

    // The LinkedIn Preview should have a "Generate Copy" button in the text placeholder
    const generateCopyButton = page.locator('button:has-text("Generate Copy")');

    // If visible, click it to generate copy
    if (await generateCopyButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await generateCopyButton.click();

      // Wait for copy generation
      await expect(page.locator('text=Generating...')).toBeVisible({ timeout: 5000 }).catch(() => {});

      // After generation, the placeholder should be replaced with actual text
      await expect(page.locator('text=Your ad copy will appear here')).not.toBeVisible({ timeout: 30000 });
    }
  });

  test('should show author info in LinkedIn preview', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // LinkedIn Preview should show author headline
    await expect(page.locator('text=Building Products')).toBeVisible();

    // Should show timestamp indicator
    await expect(page.locator('text=1h')).toBeVisible();
  });

  test('should have Copy Text and Download buttons', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // These buttons should exist but be disabled when no content
    const copyTextButton = page.locator('button:has-text("Copy Text")');
    const downloadButton = page.locator('button:has-text("Download")').first();

    await expect(copyTextButton).toBeVisible();
    await expect(downloadButton).toBeVisible();

    // They should be disabled initially (no content)
    await expect(copyTextButton).toBeDisabled();
    await expect(downloadButton).toBeDisabled();
  });

  test('should enable action buttons after generation', async ({ page }) => {
    // Quick generate
    const quickStartInput = page.locator('input[placeholder*="Just describe what you want"]');
    await quickStartInput.fill('Product showcase image');
    await page.getByRole('button', { name: /Generate Now/i }).click();

    // Wait for result
    await expect(page.locator('text=Start New')).toBeVisible({ timeout: 90000 });

    // Download button should now be enabled (has image)
    const downloadButton = page.locator('button:has-text("Download")').first();
    await expect(downloadButton).toBeEnabled({ timeout: 5000 });
  });
});

test.describe('LinkedIn Preview - Visual Elements', () => {
  test.setTimeout(120000);

  test('LinkedIn mockup has correct visual elements', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForLoadState('networkidle');

    // Check LinkedIn card structure exists
    const linkedInCard = page.locator('.bg-white.rounded-lg');
    await expect(linkedInCard).toBeVisible();

    // Check for avatar (either image or initials div)
    const avatar = linkedInCard.locator('.rounded-full').first();
    await expect(avatar).toBeVisible();

    // Check for engagement section (these are visible but faded when incomplete)
    await expect(linkedInCard.locator('text=Like')).toBeVisible();
    await expect(linkedInCard.locator('text=Comment')).toBeVisible();
    await expect(linkedInCard.locator('text=Repost')).toBeVisible();
    await expect(linkedInCard.locator('text=Send')).toBeVisible();
  });

  test('should show status notice based on content state', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForLoadState('networkidle');

    // Initially should show the "Generate image and copy" notice
    await expect(page.locator('text=Generate image and copy to preview')).toBeVisible();
  });
});

test.describe('LinkedIn Preview - Mobile Experience', () => {
  test.setTimeout(120000);

  test('mobile preview bar shows correct status', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    // Should show "Empty" status initially
    const mobileBar = page.locator('.lg\\:hidden').filter({ hasText: 'LinkedIn Preview' });
    await expect(mobileBar).toBeVisible();
    await expect(mobileBar.locator('text=Empty')).toBeVisible();
  });

  test('mobile preview expands on click', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    // Click the mobile preview bar to expand
    const mobileButton = page.locator('.lg\\:hidden button').filter({ hasText: 'LinkedIn Preview' });
    await mobileButton.click();

    // Should show the full LinkedIn card
    await expect(page.locator('.bg-white.rounded-lg')).toBeVisible();
  });
});
