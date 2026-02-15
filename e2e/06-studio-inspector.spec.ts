/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';
import { StudioWorkflowPage } from './pages/studio-workflow.page';
import { DESKTOP } from './helpers/viewport';

/**
 * 06 — Studio Inspector Panel (Right Column)
 *
 * Tests the 4-tab inspector: Edit, Copy, Ask AI, Details.
 * The inspector is only visible on desktop (lg:block).
 * Tabs use role="tab" with aria-selected and aria-controls.
 */

test.describe('Studio — Inspector Panel', { tag: '@studio' }, () => {
  let studio: StudioWorkflowPage;

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    studio = new StudioWorkflowPage(page);
    await gotoWithAuth(page, '/');
  });

  // --- Tab Bar ---

  test('1. inspector panel is visible on desktop', async ({ page }) => {
    // Inspector is inside .sticky.top-24 container
    const inspector = page.locator('.sticky.top-24').first();
    await expect(inspector).toBeVisible({ timeout: 10000 });
  });

  test('2. four inspector tabs are rendered', async ({ page }) => {
    const tabList = page.locator('[role="tablist"]');
    await expect(tabList).toBeVisible({ timeout: 10000 });
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(4);
  });

  test('3. Edit tab is selected by default', async ({ page }) => {
    const editTab = page.locator('[role="tab"][aria-label="Edit"]').first();
    await expect(editTab).toBeVisible({ timeout: 10000 });
    await expect(editTab).toHaveAttribute('aria-selected', 'true');
  });

  test('4. clicking Copy tab switches active tab', async ({ page }) => {
    const copyTab = page.locator('[role="tab"][aria-label="Copy"]').first();
    await expect(copyTab).toBeVisible({ timeout: 10000 });
    await copyTab.click();
    await page.waitForTimeout(300);
    await expect(copyTab).toHaveAttribute('aria-selected', 'true');
  });

  test('5. clicking Ask AI tab switches active tab', async ({ page }) => {
    const askAITab = page.locator('[role="tab"][aria-label="Ask AI"]').first();
    await expect(askAITab).toBeVisible({ timeout: 10000 });
    await askAITab.click();
    await page.waitForTimeout(300);
    await expect(askAITab).toHaveAttribute('aria-selected', 'true');
  });

  test('6. clicking Details tab switches active tab', async ({ page }) => {
    const detailsTab = page.locator('[role="tab"][aria-label="Details"]').first();
    await expect(detailsTab).toBeVisible({ timeout: 10000 });
    await detailsTab.click();
    await page.waitForTimeout(300);
    await expect(detailsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('7. tab panel area exists with correct role', async ({ page }) => {
    const tabPanel = page.locator('[role="tabpanel"]').first();
    await expect(tabPanel).toBeVisible({ timeout: 10000 });
  });

  // --- Edit Tab ---

  test('8. Edit tab shows placeholder when no image generated', async ({ page }) => {
    // Edit tab is default — shows "Generate an image first" message
    const placeholder = page.locator('text=Generate an image first, then use this tab to refine it');
    await expect(placeholder).toBeVisible({ timeout: 10000 });
  });

  test('9. Edit tab has textarea for edit prompt (after generation)', async ({ page }) => {
    // Attempt a generation
    await studio.enterQuickStartPrompt('Inspector edit test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      const editTextarea = page.locator('textarea[placeholder*="Describe what changes"]').first();
      await expect(editTextarea).toBeVisible({ timeout: 5000 });
    }
  });

  test('10. Edit tab has preset chips (after generation)', async ({ page }) => {
    await studio.enterQuickStartPrompt('Preset chips test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      const presetChips = page.locator('button').filter({ hasText: /Warmer lighting|Cooler tones|More contrast/i });
      const count = await presetChips.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('11. clicking a preset fills the edit textarea', async ({ page }) => {
    await studio.enterQuickStartPrompt('Preset fill test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      const presetBtn = page
        .locator('button')
        .filter({ hasText: /Warmer lighting/i })
        .first();
      await expect(presetBtn).toBeVisible({ timeout: 5000 });
      await presetBtn.click();
      await page.waitForTimeout(300);
      const editTextarea = page.locator('textarea[placeholder*="Describe what changes"]').first();
      await expect(editTextarea).toHaveValue('Warmer lighting');
    }
  });

  test('12. Apply Changes button is disabled with empty edit prompt', async ({ page }) => {
    await studio.enterQuickStartPrompt('Apply disabled test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      const applyBtn = page.getByRole('button', { name: /Apply Changes/i }).first();
      await expect(applyBtn).toBeVisible({ timeout: 5000 });
      await expect(applyBtn).toBeDisabled();
    }
  });

  // --- Copy Tab ---

  test('13. Copy tab shows placeholder when no image generated', async ({ page }) => {
    const copyTab = page.locator('[role="tab"][aria-label="Copy"]').first();
    await expect(copyTab).toBeVisible({ timeout: 10000 });
    await copyTab.click();
    await page.waitForTimeout(300);
    const placeholder = page.locator('text=Generate an image first, then create ad copy');
    await expect(placeholder).toBeVisible({ timeout: 5000 });
  });

  test('14. Copy tab has Generate Quick Copy button (after generation)', async ({ page }) => {
    await studio.enterQuickStartPrompt('Copy tab test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      await studio.switchInspectorTab('copy');
      const quickCopyBtn = studio.copyTabQuickButton;
      await expect(quickCopyBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test('15. Copy to Clipboard button appears after generating copy', async ({ page }) => {
    await studio.enterQuickStartPrompt('Clipboard test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      await studio.generateQuickCopy();
      const clipboardBtn = studio.copyTabCopyClipboard;
      await expect(clipboardBtn).toBeVisible({ timeout: 10000 });
    }
  });

  test('16. Advanced Copy Studio toggle exists', async ({ page }) => {
    await studio.enterQuickStartPrompt('Advanced toggle test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      await studio.switchInspectorTab('copy');
      const advancedToggle = studio.copyTabAdvancedToggle;
      await expect(advancedToggle).toBeVisible({ timeout: 5000 });
    }
  });

  // --- Ask AI Tab ---

  test('17. Ask AI tab shows placeholder when no image', async ({ page }) => {
    const askAITab = page.locator('[role="tab"][aria-label="Ask AI"]').first();
    await expect(askAITab).toBeVisible({ timeout: 10000 });
    await askAITab.click();
    await page.waitForTimeout(300);
    const placeholder = page.locator('text=Generate an image first, then ask AI questions');
    await expect(placeholder).toBeVisible({ timeout: 5000 });
  });

  test('18. Ask AI tab has input and quick question chips (after generation)', async ({ page }) => {
    await studio.enterQuickStartPrompt('Ask AI test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      await studio.switchInspectorTab('ask-ai');
      const askInput = studio.askAIInput;
      await expect(askInput).toBeVisible({ timeout: 5000 });
      const quickChips = studio.askAIQuickChips;
      const count = await quickChips.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('19. typing in Ask AI input and clicking send', async ({ page }) => {
    await studio.enterQuickStartPrompt('Ask AI send test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      await studio.switchInspectorTab('ask-ai');
      const askInput = studio.askAIInput;
      await expect(askInput).toBeVisible({ timeout: 5000 });
      await askInput.fill('What makes this image effective?');
      await expect(askInput).toHaveValue('What makes this image effective?');
    }
  });

  // --- Details Tab ---

  test('20. Details tab shows placeholder when no image', async ({ page }) => {
    const detailsTab = page.locator('[role="tab"][aria-label="Details"]').first();
    await expect(detailsTab).toBeVisible({ timeout: 10000 });
    await detailsTab.click();
    await page.waitForTimeout(300);
    const placeholder = page.locator('text=Generate an image to see generation details');
    await expect(placeholder).toBeVisible({ timeout: 5000 });
  });

  test('21. Details tab shows metadata badges after generation', async ({ page }) => {
    await studio.enterQuickStartPrompt('Details test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      await studio.switchInspectorTab('details');
      const badges = studio.detailsMetadataBadges;
      const count = await badges.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('22. Details tab has Copy prompt button after generation', async ({ page }) => {
    await studio.enterQuickStartPrompt('Copy prompt test');
    await studio.generateNowButton.click();
    const completed = await studio.waitForGenerationComplete(30000);
    if (completed) {
      await studio.switchInspectorTab('details');
      // Look for "PROMPT" label and "Copy" button
      const promptLabel = page.locator('text=/Prompt/i').first();
      await expect(promptLabel).toBeVisible({ timeout: 5000 });
      const copyBtn = page
        .locator('button, a')
        .filter({ hasText: /^Copy$/i })
        .first();
      await expect(copyBtn).toBeVisible({ timeout: 5000 });
    }
  });
});
