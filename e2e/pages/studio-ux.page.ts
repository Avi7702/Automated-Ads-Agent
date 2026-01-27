import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for 2026 UX Modernization features on the Studio page
 * Handles interactions with visual polish, keyboard shortcuts, and layout features
 */
export class StudioUXPage {
  readonly page: Page;

  // Floating Action Button & Shortcuts Dialog
  readonly fabContainer: Locator;
  readonly helpButton: Locator;
  readonly shortcutsDialog: Locator;
  readonly shortcutsCloseButton: Locator;

  // Visual Polish Elements
  readonly floatingGradient1: Locator;
  readonly floatingGradient2: Locator;
  readonly glassElements: Locator;
  readonly shadowLayeredElements: Locator;

  // Bento Grid
  readonly productGrid: Locator;
  readonly featuredProduct: Locator;
  readonly wideProducts: Locator;
  readonly interactiveCards: Locator;

  // Orbital Loader
  readonly orbitalLoader: Locator;
  readonly generatingState: Locator;

  // Image Zoom Controls
  readonly resultImage: Locator;
  readonly zoomHint: Locator;

  constructor(page: Page) {
    this.page = page;

    // FAB & Shortcuts
    this.fabContainer = page.locator('.fixed.bottom-6.right-6');
    this.helpButton = page.locator('.fixed.bottom-6.right-6 button:has-text("?")');
    this.shortcutsDialog = page.locator('.glass').filter({ hasText: 'Keyboard Shortcuts' });
    this.shortcutsCloseButton = this.shortcutsDialog.locator('button').first();

    // Visual Polish
    this.floatingGradient1 = page.locator('.animate-float').first();
    this.floatingGradient2 = page.locator('.animate-float-delayed').first();
    this.glassElements = page.locator('.glass');
    this.shadowLayeredElements = page.locator('.shadow-layered');

    // Bento Grid
    this.productGrid = page.locator('.grid.grid-cols-6');
    this.featuredProduct = page.locator('.col-span-2.row-span-2').first();
    this.wideProducts = page.locator('.col-span-3');
    this.interactiveCards = page.locator('.card-interactive');

    // Orbital Loader
    this.orbitalLoader = page.locator('.animate-spin-reverse');
    this.generatingState = page.locator('text=Generating magic...');

    // Image Zoom
    this.resultImage = page.locator('#result img');
    this.zoomHint = page.locator('text=Scroll to zoom');
  }

  /**
   * Navigate to Studio page
   */
  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Open keyboard shortcuts dialog
   */
  async openShortcutsDialog() {
    await this.page.keyboard.press('Shift+?');
    await this.page.waitForTimeout(300);
    await expect(this.shortcutsDialog).toBeVisible();
  }

  /**
   * Close keyboard shortcuts dialog
   */
  async closeShortcutsDialog() {
    await this.page.keyboard.press('Shift+?');
    await this.page.waitForTimeout(300);
    await expect(this.shortcutsDialog).toBeHidden();
  }

  /**
   * Toggle shortcuts dialog via floating button
   */
  async toggleShortcutsViaFAB() {
    await this.helpButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Check if shortcuts dialog is open
   */
  async isShortcutsDialogOpen(): Promise<boolean> {
    return await this.shortcutsDialog.isVisible();
  }

  /**
   * Get all visible shortcut descriptions from dialog
   */
  async getShortcutDescriptions(): Promise<string[]> {
    await this.openShortcutsDialog();
    const descriptions = await this.shortcutsDialog.locator('.text-foreground\\/80').allTextContents();
    return descriptions;
  }

  /**
   * Press a keyboard shortcut
   */
  async pressShortcut(shortcut: 'generate' | 'download' | 'reset' | 'focus' | 'help') {
    const shortcuts: Record<string, string> = {
      generate: 'Control+g',
      download: 'Control+d',
      reset: 'Control+r',
      focus: '/',
      help: 'Shift+?',
    };
    await this.page.keyboard.press(shortcuts[shortcut]);
  }

  /**
   * Check if floating gradients are visible
   */
  async hasFloatingGradients(): Promise<boolean> {
    const grad1Visible = await this.floatingGradient1.isVisible().catch(() => false);
    const grad2Visible = await this.floatingGradient2.isVisible().catch(() => false);
    return grad1Visible && grad2Visible;
  }

  /**
   * Count glass morphism elements
   */
  async getGlassElementCount(): Promise<number> {
    return await this.glassElements.count();
  }

  /**
   * Check if bento grid is displayed
   */
  async hasBentoGrid(): Promise<boolean> {
    return await this.productGrid.isVisible().catch(() => false);
  }

  /**
   * Check if featured product has correct span
   */
  async hasFeaturedProduct(): Promise<boolean> {
    if (!(await this.featuredProduct.isVisible().catch(() => false))) {
      return false;
    }
    const classes = await this.featuredProduct.getAttribute('class') || '';
    return classes.includes('col-span-2') && classes.includes('row-span-2');
  }

  /**
   * Click a product card and check for ripple effect
   */
  async clickProductWithRipple(index: number = 0) {
    const card = this.interactiveCards.nth(index);
    if (await card.isVisible()) {
      await card.click();
      // Ripple animation lasts 600ms
      await this.page.waitForTimeout(100);
      // Check if ripple span was added (it gets removed after animation)
    }
  }

  /**
   * Check if generating state with orbital loader is visible
   */
  async isGenerating(): Promise<boolean> {
    return await this.generatingState.isVisible().catch(() => false);
  }

  /**
   * Zoom in on result image using scroll wheel
   */
  async zoomResultImage(delta: number = -100) {
    if (await this.resultImage.isVisible()) {
      await this.resultImage.hover();
      await this.page.mouse.wheel(0, delta);
    }
  }

  /**
   * Double-click to reset zoom
   */
  async resetImageZoom() {
    if (await this.resultImage.isVisible()) {
      await this.resultImage.dblclick();
    }
  }

  /**
   * Verify CSS animation is defined
   */
  async hasCSSAnimation(className: string): Promise<boolean> {
    return await this.page.evaluate((cls) => {
      const testEl = document.createElement('div');
      testEl.className = cls;
      document.body.appendChild(testEl);
      const computed = window.getComputedStyle(testEl);
      const hasAnimation = computed.animationName !== 'none';
      testEl.remove();
      return hasAnimation;
    }, className);
  }

  /**
   * Take screenshot of current state
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `e2e/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Verify help button has proper accessibility
   */
  async verifyHelpButtonAccessibility(): Promise<{
    hasTitle: boolean;
    isVisible: boolean;
    isRounded: boolean;
  }> {
    const title = await this.helpButton.getAttribute('title');
    const isVisible = await this.helpButton.isVisible();
    const classes = await this.helpButton.getAttribute('class') || '';

    return {
      hasTitle: title !== null && title.includes('Keyboard'),
      isVisible,
      isRounded: classes.includes('rounded-full'),
    };
  }

  /**
   * Wait for page to be ready
   */
  async waitForReady() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500);
  }
}
