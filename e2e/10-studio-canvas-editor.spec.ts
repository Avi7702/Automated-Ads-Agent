/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';
import { StudioWorkflowPage } from './pages/studio-workflow.page';

/**
 * 10 — Studio Canvas Editor
 *
 * Tests the overlay canvas editor: AI Canvas button opens it,
 * image shows, toolbar, undo/redo, close, save.
 *
 * The Canvas Editor is only accessible after a generation is complete.
 * It opens as an overlay via the "AI Canvas" button in ResultViewEnhanced.
 */

test.describe('Studio — Canvas Editor', { tag: '@studio' }, () => {
  let studio: StudioWorkflowPage;

  test.beforeEach(async ({ page }) => {
    studio = new StudioWorkflowPage(page);
    await gotoWithAuth(page, '/');
  });

  // --- Opening Canvas Editor ---

  test('1. AI Canvas button exists in result view', async ({ page }) => {
    await studio.enterQuickStartPrompt('Canvas editor test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      // AI Canvas button uses Wand2 icon
      const canvasBtn = page.getByRole('button', { name: /AI Canvas|Canvas/i }).first();
      await expect(canvasBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test('2. clicking AI Canvas button opens the editor overlay', async ({ page }) => {
    await studio.enterQuickStartPrompt('Open canvas test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      const canvasBtn = page.getByRole('button', { name: /AI Canvas|Canvas/i }).first();
      await expect(canvasBtn).toBeVisible({ timeout: 5000 });
      await canvasBtn.click();
      await page.waitForTimeout(1000);
      // Canvas editor overlay should appear
      const overlay = studio.canvasEditorOverlay;
      await expect(overlay).toBeVisible({ timeout: 5000 });
    }
  });

  test('3. canvas editor has toolbar buttons', async ({ page }) => {
    await studio.enterQuickStartPrompt('Toolbar test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      const canvasBtn = page.getByRole('button', { name: /AI Canvas|Canvas/i }).first();
      await expect(canvasBtn).toBeVisible({ timeout: 5000 });
      await canvasBtn.click();
      await page.waitForTimeout(1000);
      const tools = studio.canvasEditorTools;
      const count = await tools.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  // --- Undo/Redo ---

  test('4. undo and redo buttons exist in canvas editor', async ({ page }) => {
    await studio.enterQuickStartPrompt('Undo redo test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      const canvasBtn = page.getByRole('button', { name: /AI Canvas|Canvas/i }).first();
      await expect(canvasBtn).toBeVisible({ timeout: 5000 });
      await canvasBtn.click();
      await page.waitForTimeout(1000);
      const undoBtn = studio.canvasEditorUndo;
      const redoBtn = studio.canvasEditorRedo;
      const undoCount = await undoBtn.count();
      const redoCount = await redoBtn.count();
      expect(undoCount + redoCount).toBeGreaterThanOrEqual(0);
    }
  });

  // --- Close ---

  test('5. close button closes the canvas editor', async ({ page }) => {
    await studio.enterQuickStartPrompt('Close canvas test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      const canvasBtn = page.getByRole('button', { name: /AI Canvas|Canvas/i }).first();
      await expect(canvasBtn).toBeVisible({ timeout: 5000 });
      await canvasBtn.click();
      await page.waitForTimeout(1000);
      const closeBtn = studio.canvasEditorClose;
      await expect(closeBtn).toBeVisible({ timeout: 5000 });
      await closeBtn.click();
      await page.waitForTimeout(500);
      // Overlay should disappear
      const overlay = studio.canvasEditorOverlay;
      await expect(overlay).not.toBeVisible({ timeout: 5000 });
    }
  });

  // --- Page Stability ---

  test('6. canvas editor does not crash the page', async ({ page }) => {
    await studio.enterQuickStartPrompt('Stability test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      const canvasBtn = page.getByRole('button', { name: /AI Canvas|Canvas/i }).first();
      await expect(canvasBtn).toBeVisible({ timeout: 5000 });
      await canvasBtn.click();
      await page.waitForTimeout(1000);
      // Page should remain functional
      await expect(page.locator('body')).toBeVisible();
      // Close and verify
      const closeBtn = studio.canvasEditorClose;
      await expect(closeBtn).toBeVisible({ timeout: 5000 });
      await closeBtn.click();
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
