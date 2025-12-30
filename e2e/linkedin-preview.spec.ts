import { test, expect } from '@playwright/test';

test.describe('LinkedIn Post Preview', () => {
  // Increase timeout for image generation tests
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    // Navigate to Studio
    await page.goto('/');
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
  });

  test('should show Preview button after image generation', async ({ page }) => {
    // Use Quick Start to generate an image
    const quickStartInput = page.locator('input[placeholder*="Just describe what you want"]');
    await quickStartInput.fill('Professional product shot of drainage system');

    // Click Generate Now
    await page.getByRole('button', { name: /Generate Now/i }).click();

    // Wait for generation to complete (may take 10-30 seconds)
    await expect(page.locator('text=Generating')).toBeVisible({ timeout: 5000 });

    // Wait for result state - look for the action buttons
    await expect(page.getByRole('button', { name: /Preview/i })).toBeVisible({ timeout: 60000 });

    // Verify all 4 action buttons are present
    await expect(page.getByRole('button', { name: /Edit/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Copy/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Preview/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Share/i })).toBeVisible();
  });

  test('should open LinkedIn Preview section when clicking Preview button', async ({ page }) => {
    // Quick generate
    const quickStartInput = page.locator('input[placeholder*="Just describe what you want"]');
    await quickStartInput.fill('Construction site drainage installation');
    await page.getByRole('button', { name: /Generate Now/i }).click();

    // Wait for result
    await expect(page.getByRole('button', { name: /Preview/i })).toBeVisible({ timeout: 60000 });

    // Click Preview button
    await page.getByRole('button', { name: /Preview/i }).click();

    // Verify LinkedIn Preview section is visible
    await expect(page.locator('text=Preview on LinkedIn')).toBeVisible();
  });

  test('should generate ad copy and show LinkedIn mockup', async ({ page }) => {
    // Quick generate
    const quickStartInput = page.locator('input[placeholder*="Just describe what you want"]');
    await quickStartInput.fill('NDS drainage product marketing image');
    await page.getByRole('button', { name: /Generate Now/i }).click();

    // Wait for result and click Preview
    await expect(page.getByRole('button', { name: /Preview/i })).toBeVisible({ timeout: 60000 });
    await page.getByRole('button', { name: /Preview/i }).click();

    // Should trigger copy generation - look for loading state or Generate button
    const generateCopyButton = page.getByRole('button', { name: /Generate Ad Copy/i });
    const loadingIndicator = page.locator('text=Generating...');

    // Either we see the generate button (need to click) or it's already generating
    if (await generateCopyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await generateCopyButton.click();
    }

    // Wait for copy generation to complete
    await expect(page.locator('text=Edit your post text')).toBeVisible({ timeout: 30000 });

    // Verify LinkedIn mockup elements
    await expect(page.locator('text=This is a preview simulation')).toBeVisible();

    // LinkedIn action buttons should be visible
    await expect(page.locator('text=Like')).toBeVisible();
    await expect(page.locator('text=Comment')).toBeVisible();
    await expect(page.locator('text=Repost')).toBeVisible();
  });

  test('should update preview when editing copy text', async ({ page }) => {
    // Quick generate
    const quickStartInput = page.locator('input[placeholder*="Just describe what you want"]');
    await quickStartInput.fill('Professional drainage system photo');
    await page.getByRole('button', { name: /Generate Now/i }).click();

    // Wait and open preview
    await expect(page.getByRole('button', { name: /Preview/i })).toBeVisible({ timeout: 60000 });
    await page.getByRole('button', { name: /Preview/i }).click();

    // Generate copy if needed
    const generateCopyButton = page.getByRole('button', { name: /Generate Ad Copy/i });
    if (await generateCopyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await generateCopyButton.click();
    }

    // Wait for textarea to appear
    const copyTextarea = page.locator('textarea').filter({ hasText: /.+/ }).first();
    await expect(copyTextarea).toBeVisible({ timeout: 30000 });

    // Clear and type new text
    await copyTextarea.clear();
    const testText = 'This is my custom LinkedIn post text for testing!';
    await copyTextarea.fill(testText);

    // Verify the preview updates - the text should appear in the LinkedIn mockup
    // The mockup is in a white background card
    const linkedInCard = page.locator('.bg-white');
    await expect(linkedInCard.locator(`text=${testText.slice(0, 30)}`)).toBeVisible();
  });

  test('should show author info in LinkedIn preview', async ({ page }) => {
    // Quick generate
    const quickStartInput = page.locator('input[placeholder*="Just describe what you want"]');
    await quickStartInput.fill('Product showcase image');
    await page.getByRole('button', { name: /Generate Now/i }).click();

    // Wait and open preview
    await expect(page.getByRole('button', { name: /Preview/i })).toBeVisible({ timeout: 60000 });
    await page.getByRole('button', { name: /Preview/i }).click();

    // Generate copy if needed
    const generateCopyButton = page.getByRole('button', { name: /Generate Ad Copy/i });
    if (await generateCopyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await generateCopyButton.click();
    }

    // Wait for preview to load
    await expect(page.locator('text=This is a preview simulation')).toBeVisible({ timeout: 30000 });

    // Should show author headline
    await expect(page.locator('text=Building Products')).toBeVisible();

    // Should show timestamp indicator
    await expect(page.locator('text=1h')).toBeVisible();
  });

  test('should allow regenerating copy', async ({ page }) => {
    // Quick generate
    const quickStartInput = page.locator('input[placeholder*="Just describe what you want"]');
    await quickStartInput.fill('Drainage installation photo');
    await page.getByRole('button', { name: /Generate Now/i }).click();

    // Wait and open preview
    await expect(page.getByRole('button', { name: /Preview/i })).toBeVisible({ timeout: 60000 });
    await page.getByRole('button', { name: /Preview/i }).click();

    // Generate initial copy
    const generateCopyButton = page.getByRole('button', { name: /Generate Ad Copy/i });
    if (await generateCopyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await generateCopyButton.click();
    }

    // Wait for copy
    await expect(page.locator('text=Edit your post text')).toBeVisible({ timeout: 30000 });

    // Get initial copy text
    const copyTextarea = page.locator('textarea').first();
    const initialText = await copyTextarea.inputValue();

    // Click Regenerate
    await page.getByRole('button', { name: /Regenerate Copy/i }).click();

    // Wait for regeneration (loading state)
    await expect(page.locator('button:has-text("Regenerate Copy") svg.animate-spin')).toBeVisible({ timeout: 5000 }).catch(() => {});

    // Wait for new copy (may be same or different, but button should be clickable again)
    await expect(page.getByRole('button', { name: /Regenerate Copy/i })).toBeEnabled({ timeout: 30000 });
  });
});

test.describe('LinkedIn Preview - Component Display', () => {
  test.setTimeout(120000);

  test('LinkedIn mockup has correct visual elements', async ({ page }) => {
    // This test assumes we have a generated image with copy
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Quick generate
    const quickStartInput = page.locator('input[placeholder*="Just describe what you want"]');
    await quickStartInput.fill('Product image for social media');
    await page.getByRole('button', { name: /Generate Now/i }).click();

    // Wait and open preview
    await expect(page.getByRole('button', { name: /Preview/i })).toBeVisible({ timeout: 60000 });
    await page.getByRole('button', { name: /Preview/i }).click();

    // Generate copy
    const generateCopyButton = page.getByRole('button', { name: /Generate Ad Copy/i });
    if (await generateCopyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await generateCopyButton.click();
    }

    await expect(page.locator('text=This is a preview simulation')).toBeVisible({ timeout: 30000 });

    // Check LinkedIn card structure
    const linkedInCard = page.locator('.bg-white.rounded-lg');
    await expect(linkedInCard).toBeVisible();

    // Check for avatar (either image or initials div)
    const avatar = linkedInCard.locator('.rounded-full').first();
    await expect(avatar).toBeVisible();

    // Check for engagement section
    await expect(linkedInCard.locator('text=Like')).toBeVisible();
    await expect(linkedInCard.locator('text=Comment')).toBeVisible();
    await expect(linkedInCard.locator('text=Repost')).toBeVisible();
    await expect(linkedInCard.locator('text=Send')).toBeVisible();

    // Check for more options button (three dots)
    const moreButton = linkedInCard.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(moreButton).toBeVisible();
  });
});
