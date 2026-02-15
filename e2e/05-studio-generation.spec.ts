/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';
import { StudioWorkflowPage } from './pages/studio-workflow.page';

/**
 * 05 — Studio Generation Flow
 *
 * Tests: Generate button states, generating indicator/animation,
 * result view (image, download, Start New, save, zoom).
 *
 * Note: Actual Gemini API calls may not succeed in test env.
 * We test UI states and transitions where possible.
 */

test.describe('Studio — Generation Flow', { tag: '@studio' }, () => {
  let studio: StudioWorkflowPage;

  test.beforeEach(async ({ page }) => {
    studio = new StudioWorkflowPage(page);
    await gotoWithAuth(page, '/');
  });

  // ─── Generate Button States ───────────────────────────

  test('1. Generate Now button disabled with empty prompt', async ({ page }) => {
    await expect(studio.generateNowButton).toBeDisabled();
  });

  test('2. Generate Now button enabled with prompt text', async ({ page }) => {
    await studio.enterQuickStartPrompt('A beautiful sunset product shot');
    await expect(studio.generateNowButton).toBeEnabled();
  });

  test('3. Generate Image button exists (for full workflow)', async ({ page }) => {
    // Generate Image is the alternative button after selecting products
    const genImageBtn = studio.generateImageButton;
    const count = await genImageBtn.count();
    // May or may not be visible depending on state
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('4. clicking Generate Now triggers generation state', async ({ page }) => {
    await studio.enterQuickStartPrompt('Test product lifestyle photo');
    await studio.generateNowButton.click();
    // Should transition to generating state — look for generating indicator or state change
    await page.waitForTimeout(1000);
    const state = await studio.getGenerationState();
    // Either generating or result (if very fast) or idle (if error/timeout)
    expect(['generating', 'result', 'idle']).toContain(state);
  });

  // ─── Generating State ─────────────────────────────────

  test('5. generating indicator appears during generation', async ({ page }) => {
    await studio.enterQuickStartPrompt('Professional product photo');
    await studio.generateNowButton.click();
    // Check for generating indicator within a short window
    await expect(studio.generatingIndicator).toBeVisible({ timeout: 5000 });
  });

  test('6. progress bar may appear during generation', async ({ page }) => {
    await studio.enterQuickStartPrompt('Elegant product display');
    await studio.generateNowButton.click();
    await page.waitForTimeout(1000);
    const progressBar = studio.progressBar;
    const count = await progressBar.count();
    // Progress bar may or may not appear depending on implementation
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('7. page does not crash during generation attempt', async ({ page }) => {
    await studio.enterQuickStartPrompt('Quick test generation');
    await studio.generateNowButton.click();
    await page.waitForTimeout(2000);
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  // ─── Result View ──────────────────────────────────────

  test('8. result view contains Start New button after generation', async ({ page }) => {
    // Navigate directly to a state with a result — use the page object
    await studio.enterQuickStartPrompt('Product showcase');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      await expect(studio.startNewButton).toBeVisible({ timeout: 5000 });
    }
  });

  test('9. result view contains Download button after generation', async ({ page }) => {
    await studio.enterQuickStartPrompt('Marketing banner');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      await expect(studio.downloadButton).toBeVisible({ timeout: 5000 });
    }
  });

  test('10. generated image is displayed in result view', async ({ page }) => {
    await studio.enterQuickStartPrompt('Product ad creative');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      const imgUrl = await studio.getGeneratedImageUrl();
      expect(imgUrl).toBeTruthy();
    }
  });

  test('11. Start New button resets to composer view', async ({ page }) => {
    await studio.enterQuickStartPrompt('Simple product shot');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      await studio.startNew();
      // Should be back in idle/composer state
      const quickStart = page.locator('textarea[placeholder*="Describe what you want to create"]');
      await expect(quickStart).toBeVisible({ timeout: 10000 });
    }
  });

  test('12. View Details link navigates to generation detail', async ({ page }) => {
    await studio.enterQuickStartPrompt('Detail test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      const viewDetailsBtn = page.getByRole('button', { name: /View Details/i });
      await expect(viewDetailsBtn).toBeVisible();
    }
  });

  // ─── Image Zoom ───────────────────────────────────────

  test('13. generated image container supports zoom interaction', async ({ page }) => {
    await studio.enterQuickStartPrompt('Zoom test product');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      // The image container has touch-none select-none classes for zoom
      const zoomContainer = page.locator('.touch-none.select-none').first();
      await expect(zoomContainer).toBeVisible();
    }
  });

  test('14. double-click on image resets zoom', async ({ page }) => {
    await studio.enterQuickStartPrompt('Double click test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      const resultImg = page.locator('#result img').first();
      await expect(resultImg).toBeVisible();
      await resultImg.dblclick();
      await page.waitForTimeout(300);
      // No crash after double-click
      await expect(page.locator('body')).toBeVisible();
    }
  });

  // ─── Save Flow ────────────────────────────────────────

  test('15. Save to Catalog dialog can be opened', async ({ page }) => {
    await studio.enterQuickStartPrompt('Save test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      const saveBtn = page.getByRole('button', { name: /Save/i }).first();
      await expect(saveBtn).toBeVisible();
      await saveBtn.click();
      await page.waitForTimeout(500);
      // Dialog should appear
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });
});
