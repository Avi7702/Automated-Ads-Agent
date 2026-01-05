import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Studio page (main page at /)
 * Handles all interactions with the Product Content Studio
 */
export class StudioPage {
  readonly page: Page;
  readonly header: Locator;
  readonly pageTitle: Locator;
  readonly quickStartInput: Locator;
  readonly generateNowButton: Locator;
  readonly productsSection: Locator;
  readonly templatesSection: Locator;
  readonly promptTextarea: Locator;
  readonly generateImageButton: Locator;
  readonly linkedInPreview: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header').first();
    this.pageTitle = page.locator('h1').filter({ hasText: 'Create stunning product visuals' });
    this.quickStartInput = page.locator('input[placeholder*="Just describe what you want"]');
    this.generateNowButton = page.getByRole('button', { name: /Generate Now/i });
    this.productsSection = page.locator('text=Your Products');
    this.templatesSection = page.locator('text=Style & Template');
    this.promptTextarea = page.locator('textarea[placeholder*="Professional construction"]');
    this.generateImageButton = page.getByRole('button', { name: /Generate Image/i }).first();
    this.linkedInPreview = page.getByRole('heading', { name: 'LinkedIn Preview' });
  }

  /**
   * Navigate to the Studio page
   */
  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if the Studio page is fully loaded and visible
   */
  async isVisible(): Promise<boolean> {
    try {
      // Wait for the main title or quick start input to be visible
      await this.page.waitForSelector('h1', { timeout: 10000 });

      // Check for either the main title or any indication we're on the Studio
      const titleVisible = await this.pageTitle.isVisible().catch(() => false);
      const quickStartVisible = await this.quickStartInput.isVisible().catch(() => false);

      return titleVisible || quickStartVisible;
    } catch {
      return false;
    }
  }

  /**
   * Get the header component locator
   */
  getHeader(): Locator {
    return this.header;
  }

  /**
   * Use quick start to generate content
   */
  async quickStartGenerate(prompt: string) {
    await this.quickStartInput.fill(prompt);
    await this.generateNowButton.click();
  }

  /**
   * Wait for the page to be in idle state (ready for new generation)
   */
  async waitForIdleState() {
    await expect(this.quickStartInput).toBeVisible({ timeout: 10000 });
  }

  /**
   * Wait for generation to complete
   */
  async waitForGenerationComplete() {
    // Wait for "Start New" button which appears after generation
    await this.page.locator('text=Start New').waitFor({ state: 'visible', timeout: 90000 });
  }

  /**
   * Check if we're in the generating state
   */
  async isGenerating(): Promise<boolean> {
    return await this.page.locator('text=Generating content').isVisible().catch(() => false);
  }

  /**
   * Check if LinkedIn Preview is visible (desktop layout)
   */
  async isLinkedInPreviewVisible(): Promise<boolean> {
    try {
      await expect(this.linkedInPreview).toBeVisible({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Check if user is redirected to login
   */
  async isRedirectedToLogin(): Promise<boolean> {
    try {
      await this.page.waitForURL('/login', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
