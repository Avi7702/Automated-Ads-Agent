import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Studio workflow
 * Handles the full generation flow: product selection, prompt, generation, editing, saving
 */
export class StudioWorkflowPage {
  readonly page: Page;

  // Header and navigation
  readonly header: Locator;
  readonly pageTitle: Locator;

  // Product selection section
  readonly productsSection: Locator;
  readonly productCards: Locator;
  readonly selectedProductsBadge: Locator;
  readonly searchProductsInput: Locator;
  readonly categoryFilter: Locator;

  // Template selection
  readonly templatesSection: Locator;
  readonly templateCards: Locator;
  readonly selectedTemplateBadge: Locator;

  // Prompt/Generation section
  readonly promptTextarea: Locator;
  readonly quickStartInput: Locator;
  readonly generateNowButton: Locator;
  readonly generateImageButton: Locator;

  // Platform & settings
  readonly platformSelect: Locator;
  readonly aspectRatioSelect: Locator;
  readonly resolutionSelect: Locator;

  // Idea Bank panel
  readonly ideaBankPanel: Locator;
  readonly ideaBankSuggestions: Locator;
  readonly useSuggestionButton: Locator;
  readonly generateFromSuggestionButton: Locator;

  // Generation state
  readonly generatingIndicator: Locator;
  readonly progressBar: Locator;

  // Result section
  readonly resultSection: Locator;
  readonly generatedImage: Locator;
  readonly downloadButton: Locator;
  readonly startNewButton: Locator;
  readonly editButton: Locator;
  readonly saveButton: Locator;

  // Edit mode
  readonly editPromptInput: Locator;
  readonly applyEditButton: Locator;
  readonly cancelEditButton: Locator;

  // Save to Catalog dialog
  readonly saveToCatalogDialog: Locator;
  readonly catalogNameInput: Locator;
  readonly catalogCategorySelect: Locator;
  readonly saveToLibraryButton: Locator;

  // History panel
  readonly historyToggle: Locator;
  readonly historyPanel: Locator;
  readonly historyItems: Locator;

  // LinkedIn Preview
  readonly linkedInPreview: Locator;
  readonly generateCopyButton: Locator;
  readonly copyCaption: Locator;

  // Error/loading states
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly toastNotification: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header
    this.header = page.locator('header').first();
    this.pageTitle = page.locator('h1').filter({ hasText: /Product Content Studio|Create stunning/i });

    // Product selection
    this.productsSection = page.locator('text=Your Products').locator('..').locator('..');
    this.productCards = page.locator('[class*="aspect-square"]').filter({ has: page.locator('img') });
    this.selectedProductsBadge = page.locator('text=/\\d+ product/i');
    this.searchProductsInput = page.locator('input[placeholder*="Search"]');
    this.categoryFilter = page.locator('[class*="Select"]').filter({ hasText: 'Category' });

    // Templates
    this.templatesSection = page.locator('text=Style & Template').locator('..').locator('..');
    this.templateCards = page.locator('[data-testid^="template-card-"]');
    this.selectedTemplateBadge = page.locator('[class*="Badge"]').filter({ hasText: /Selected/i });

    // Prompt
    this.promptTextarea = page.locator('textarea').filter({ has: page.locator('..').filter({ hasText: /prompt|describe/i }) });
    this.quickStartInput = page.locator('input[placeholder*="Just describe"]');
    this.generateNowButton = page.getByRole('button', { name: /Generate Now/i });
    this.generateImageButton = page.getByRole('button', { name: /Generate Image/i });

    // Platform & settings
    this.platformSelect = page.locator('[class*="Select"]').filter({ hasText: /LinkedIn|Instagram|Facebook/i });
    this.aspectRatioSelect = page.locator('[class*="Select"]').filter({ hasText: /1200x|1080x|aspect/i });
    this.resolutionSelect = page.locator('[class*="Select"]').filter({ hasText: /1K|2K|4K/i });

    // Idea Bank
    this.ideaBankPanel = page.locator('text=Intelligent Idea Bank').locator('..').locator('..');
    this.ideaBankSuggestions = page.locator('[data-testid^="button-use-suggestion-"]').locator('..');
    this.useSuggestionButton = page.locator('[data-testid^="button-use-suggestion-"]');
    this.generateFromSuggestionButton = page.locator('[data-testid^="button-generate-suggestion-"]');

    // Generation state
    this.generatingIndicator = page.locator('text=/Generating|Creating|Processing/i');
    this.progressBar = page.locator('[role="progressbar"]');

    // Result
    this.resultSection = page.locator('#result, [class*="result"]').filter({ has: page.locator('img') });
    this.generatedImage = page.locator('#result img, [class*="result"] img').first();
    this.downloadButton = page.getByRole('button', { name: /Download/i });
    this.startNewButton = page.getByRole('button', { name: /Start New|New Generation/i });
    this.editButton = page.getByRole('button', { name: /Edit/i });
    this.saveButton = page.getByRole('button', { name: /Save/i });

    // Edit mode
    this.editPromptInput = page.locator('input[placeholder*="edit"], textarea[placeholder*="edit"]');
    this.applyEditButton = page.getByRole('button', { name: /Apply|Update/i });
    this.cancelEditButton = page.getByRole('button', { name: /Cancel/i });

    // Save to Catalog
    this.saveToCatalogDialog = page.locator('[role="dialog"]').filter({ hasText: /Save to|Catalog/i });
    this.catalogNameInput = page.locator('input[placeholder*="name"]');
    this.catalogCategorySelect = page.locator('[class*="Select"]').filter({ hasText: /category/i });
    this.saveToLibraryButton = page.getByRole('button', { name: /Save to Library/i });

    // History
    this.historyToggle = page.getByRole('button', { name: /History/i });
    this.historyPanel = page.locator('[class*="HistoryPanel"], [class*="history"]').filter({ has: page.locator('img') });
    this.historyItems = page.locator('[class*="history"] [class*="Card"], [class*="HistoryItem"]');

    // LinkedIn Preview
    this.linkedInPreview = page.locator('text=LinkedIn Preview').locator('..');
    this.generateCopyButton = page.locator('[data-testid="generate-copy-button-linkedin"]');
    this.copyCaption = page.locator('[class*="CopywritingPanel"], [class*="copy-panel"]');

    // Loading/error
    this.loadingSpinner = page.locator('[class*="animate-spin"]');
    this.errorMessage = page.locator('.text-destructive, [class*="error"]');
    this.toastNotification = page.locator('[class*="toast"], [data-sonner-toast]');
  }

  /**
   * Navigate to the Studio page
   */
  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to Studio with specific parameters
   */
  async gotoWithParams(params: { cpTemplateId?: string; view?: string; mode?: string }) {
    const searchParams = new URLSearchParams();
    if (params.cpTemplateId) searchParams.set('cpTemplateId', params.cpTemplateId);
    if (params.view) searchParams.set('view', params.view);
    if (params.mode) searchParams.set('mode', params.mode);

    const url = `/?${searchParams.toString()}`;
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if Studio page is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      await this.page.waitForSelector('h1', { timeout: 10000 });
      const titleVisible = await this.pageTitle.isVisible().catch(() => false);
      const quickStartVisible = await this.quickStartInput.isVisible().catch(() => false);
      return titleVisible || quickStartVisible;
    } catch {
      return false;
    }
  }

  /**
   * Wait for products to load
   */
  async waitForProductsLoaded() {
    await this.productCards.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  }

  /**
   * Select a product by index
   */
  async selectProduct(index: number = 0) {
    await this.waitForProductsLoaded();
    await this.productCards.nth(index).click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Select multiple products
   */
  async selectProducts(indices: number[]) {
    for (const index of indices) {
      await this.selectProduct(index);
    }
  }

  /**
   * Deselect a product
   */
  async deselectProduct(index: number = 0) {
    await this.productCards.nth(index).click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Get the count of selected products
   */
  async getSelectedProductCount(): Promise<number> {
    const text = await this.selectedProductsBadge.textContent().catch(() => '');
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Select a template by index
   */
  async selectTemplate(index: number = 0) {
    await this.templateCards.nth(index).click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Enter generation prompt using quick start
   */
  async enterQuickStartPrompt(prompt: string) {
    await this.quickStartInput.fill(prompt);
  }

  /**
   * Enter detailed generation prompt
   */
  async enterPrompt(prompt: string) {
    if (await this.promptTextarea.isVisible()) {
      await this.promptTextarea.fill(prompt);
    } else {
      await this.quickStartInput.fill(prompt);
    }
  }

  /**
   * Start generation using Quick Start
   */
  async startQuickGeneration(prompt: string) {
    await this.enterQuickStartPrompt(prompt);
    await this.generateNowButton.click();
  }

  /**
   * Start generation using Generate Image button
   */
  async startGeneration() {
    await this.generateImageButton.first().click();
  }

  /**
   * Wait for generation to complete via SSE
   */
  async waitForGenerationComplete(timeout: number = 120000) {
    // First wait for generating state to appear
    await this.generatingIndicator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    // Then wait for it to complete (Start New button appears, or generated image visible)
    await Promise.race([
      this.startNewButton.waitFor({ state: 'visible', timeout }),
      this.generatedImage.waitFor({ state: 'visible', timeout }),
    ]);
  }

  /**
   * Check if generation is in progress
   */
  async isGenerating(): Promise<boolean> {
    return await this.generatingIndicator.isVisible().catch(() => false);
  }

  /**
   * Get the generated image URL
   */
  async getGeneratedImageUrl(): Promise<string | null> {
    try {
      await expect(this.generatedImage).toBeVisible({ timeout: 5000 });
      return await this.generatedImage.getAttribute('src');
    } catch {
      return null;
    }
  }

  /**
   * Download the generated image
   */
  async downloadGeneratedImage() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadButton.click();
    return await downloadPromise;
  }

  /**
   * Open edit mode
   */
  async openEditMode() {
    await this.editButton.click();
    await expect(this.editPromptInput).toBeVisible({ timeout: 5000 }).catch(() => {});
  }

  /**
   * Edit the generated image
   */
  async editImage(editPrompt: string) {
    await this.openEditMode();
    await this.editPromptInput.fill(editPrompt);
    await this.applyEditButton.click();

    // Wait for edit to complete
    await this.waitForGenerationComplete();
  }

  /**
   * Cancel editing
   */
  async cancelEdit() {
    await this.cancelEditButton.click();
  }

  /**
   * Open Save to Catalog dialog
   */
  async openSaveToCatalog() {
    await this.saveButton.click();
    await expect(this.saveToCatalogDialog).toBeVisible({ timeout: 5000 });
  }

  /**
   * Save the generated image to catalog/history
   */
  async saveToHistory(name?: string, category?: string) {
    await this.openSaveToCatalog();

    if (name) {
      await this.catalogNameInput.fill(name);
    }
    if (category) {
      await this.catalogCategorySelect.click();
      await this.page.locator(`text=${category}`).click();
    }

    await this.saveToLibraryButton.click();

    // Wait for save to complete
    await expect(this.saveToCatalogDialog).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Start a new generation
   */
  async startNew() {
    await this.startNewButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Open history panel
   */
  async openHistory() {
    if (await this.historyToggle.isVisible()) {
      await this.historyToggle.click();
      await expect(this.historyPanel).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  }

  /**
   * View a history item
   */
  async viewHistoryItem(index: number = 0) {
    await this.openHistory();
    await this.historyItems.nth(index).click();
  }

  /**
   * Get history item count
   */
  async getHistoryItemCount(): Promise<number> {
    await this.openHistory();
    return await this.historyItems.count();
  }

  /**
   * Use an Idea Bank suggestion
   */
  async useIdeaBankSuggestion(index: number = 0) {
    await expect(this.ideaBankPanel).toBeVisible({ timeout: 10000 }).catch(() => {});
    await this.useSuggestionButton.nth(index).click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Generate directly from Idea Bank suggestion
   */
  async generateFromIdeaBankSuggestion(index: number = 0) {
    await expect(this.ideaBankPanel).toBeVisible({ timeout: 10000 }).catch(() => {});
    await this.generateFromSuggestionButton.nth(index).click();
    await this.waitForGenerationComplete();
  }

  /**
   * Generate LinkedIn copy
   */
  async generateLinkedInCopy() {
    await this.generateCopyButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Select platform
   */
  async selectPlatform(platform: string) {
    if (await this.platformSelect.isVisible()) {
      await this.platformSelect.click();
      await this.page.locator(`text=${platform}`).click();
    }
  }

  /**
   * Get the current state of generation
   */
  async getGenerationState(): Promise<'idle' | 'generating' | 'result'> {
    if (await this.isGenerating()) return 'generating';
    if (await this.generatedImage.isVisible().catch(() => false)) return 'result';
    return 'idle';
  }

  /**
   * Run the full generation workflow
   */
  async runFullGenerationWorkflow(options: {
    productIndex?: number;
    templateIndex?: number;
    prompt?: string;
    quickStart?: boolean;
  } = {}) {
    const { productIndex = 0, templateIndex, prompt, quickStart = false } = options;

    // Select product
    await this.selectProduct(productIndex);

    // Select template (optional)
    if (templateIndex !== undefined) {
      await this.selectTemplate(templateIndex);
    }

    // Start generation
    if (quickStart && prompt) {
      await this.startQuickGeneration(prompt);
    } else if (prompt) {
      await this.enterPrompt(prompt);
      await this.startGeneration();
    } else {
      await this.startGeneration();
    }

    // Wait for completion
    await this.waitForGenerationComplete();
  }

  /**
   * Check for console errors
   */
  async monitorConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `e2e/screenshots/studio-${name}.png`,
      fullPage: true,
    });
  }
}
