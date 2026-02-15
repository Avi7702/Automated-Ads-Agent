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

  // InspectorPanel (right column — 4 tabs)
  readonly inspectorEditTab: Locator;
  readonly inspectorCopyTab: Locator;
  readonly inspectorAskAITab: Locator;
  readonly inspectorDetailsTab: Locator;

  // InspectorPanel — Edit tab
  readonly editTabTextarea: Locator;
  readonly editTabPresets: Locator;
  readonly editTabApplyButton: Locator;

  // InspectorPanel — Copy tab
  readonly copyTabQuickButton: Locator;
  readonly copyTabTextarea: Locator;
  readonly copyTabCopyClipboard: Locator;
  readonly copyTabAdvancedToggle: Locator;
  readonly copyTabPanel: Locator;

  // InspectorPanel — Ask AI tab
  readonly askAIInput: Locator;
  readonly askAISendButton: Locator;
  readonly askAIResponse: Locator;
  readonly askAIQuickChips: Locator;

  // InspectorPanel — Details tab
  readonly detailsPromptText: Locator;
  readonly detailsCopyPrompt: Locator;
  readonly detailsMetadataBadges: Locator;
  readonly detailsGenerationId: Locator;
  readonly detailsDownloadButton: Locator;
  readonly detailsSaveButton: Locator;
  readonly detailsLinkedInPreview: Locator;

  // IdeaBankBar (bottom bar)
  readonly ideaBankBar: Locator;
  readonly ideaBankBarChips: Locator;
  readonly ideaBankBarRefresh: Locator;
  readonly ideaBankBarEmptyChip: Locator;
  readonly ideaBankBarLoading: Locator;

  // Upload zone
  readonly uploadZone: Locator;
  readonly uploadInput: Locator;

  // Error/loading states
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly toastNotification: Locator;

  // ─── Asset Drawer (left panel tabs) ─────────────────────
  readonly assetDrawerProducts: Locator;
  readonly assetDrawerTemplates: Locator;
  readonly assetDrawerBrandAssets: Locator;
  readonly assetDrawerScenarios: Locator;
  readonly assetDrawerPatterns: Locator;

  // ─── Agent Chat Panel (collapsible at top of Studio) ────
  readonly agentChatToggle: Locator;
  readonly agentChatPanel: Locator;
  readonly agentChatInput: Locator;
  readonly agentChatSendButton: Locator;
  readonly agentChatMessages: Locator;
  readonly agentChatStopButton: Locator;
  readonly agentChatClearButton: Locator;
  readonly agentChatStreaming: Locator;

  // ─── Canvas Editor ──────────────────────────────────────
  readonly canvasEditorOverlay: Locator;
  readonly canvasEditorClose: Locator;
  readonly canvasEditorUndo: Locator;
  readonly canvasEditorRedo: Locator;
  readonly canvasEditorTools: Locator;

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
    this.promptTextarea = page.locator('textarea[placeholder*="Describe your ideal ad creative"]');
    this.quickStartInput = page.locator('textarea[placeholder*="Describe what you want to create"]');
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

    // History (use first() to avoid duplicate — header button + sidebar icon)
    this.historyToggle = page.getByRole('button', { name: /History/i }).first();
    this.historyPanel = page
      .locator('[class*="HistoryPanel"], [class*="history"]')
      .filter({ has: page.locator('img') });
    this.historyItems = page.locator('[class*="history"] [class*="Card"], [class*="HistoryItem"]');

    // LinkedIn Preview
    this.linkedInPreview = page.locator('text=LinkedIn Preview').locator('..');
    this.generateCopyButton = page.locator('[data-testid="generate-copy-button-linkedin"]');
    this.copyCaption = page.locator('[class*="CopywritingPanel"], [class*="copy-panel"]');

    // InspectorPanel tabs (match by icon + optional label)
    const inspectorContainer = page.locator('.sticky.top-24, .lg\\:block .rounded-2xl').first();
    this.inspectorEditTab = inspectorContainer.getByRole('button', { name: /Edit/i }).first();
    this.inspectorCopyTab = inspectorContainer.getByRole('button', { name: /Copy/i }).first();
    this.inspectorAskAITab = inspectorContainer.getByRole('button', { name: /Ask AI/i }).first();
    this.inspectorDetailsTab = inspectorContainer.getByRole('button', { name: /Details/i }).first();

    // InspectorPanel — Edit tab content (use .first() to avoid duplicate with inline edit)
    this.editTabTextarea = page.locator('textarea[placeholder*="Describe what changes"]').first();
    this.editTabPresets = page
      .locator('button')
      .filter({ hasText: /Warmer lighting|Cooler tones|More contrast|Softer look/i });
    this.editTabApplyButton = page.getByRole('button', { name: /Apply Changes/i }).first();

    // InspectorPanel — Copy tab content
    this.copyTabQuickButton = page.getByRole('button', { name: /Generate Quick Copy|Regenerate Quick Copy/i });
    this.copyTabTextarea = page.locator('.overflow-y-auto textarea').first();
    this.copyTabCopyClipboard = page.getByRole('button', { name: /Copy to Clipboard|Copied/i });
    this.copyTabAdvancedToggle = page.locator('button').filter({ hasText: /Advanced Copy Studio/i });
    this.copyTabPanel = page.locator('[data-testid="copywriting-panel"]');

    // InspectorPanel — Ask AI tab content
    this.askAIInput = page.locator('input[placeholder*="Ask about this generation"]');
    this.askAISendButton = page
      .locator('.flex.gap-2 button[class*="icon"], button')
      .filter({ has: page.locator('svg') })
      .last();
    this.askAIResponse = page.locator('.rounded-lg.bg-muted\\/50');
    this.askAIQuickChips = page
      .locator('button')
      .filter({ hasText: /What makes this image|Suggest improvements|What audience|Rate this/i });

    // InspectorPanel — Details tab content
    this.detailsPromptText = page.locator('text=/Prompt/i').locator('..').locator('p');
    this.detailsCopyPrompt = page
      .locator('button')
      .filter({ hasText: /^Copy$/i })
      .first();
    this.detailsMetadataBadges = page.locator('.flex.flex-wrap.gap-2 [class*="Badge"]');
    this.detailsGenerationId = page.locator('.font-mono.text-foreground\\/60');
    this.detailsDownloadButton = page.getByRole('button', { name: /Download Image/i });
    this.detailsSaveButton = page.getByRole('button', { name: /Save to Catalog/i });
    this.detailsLinkedInPreview = page.locator('text=/LinkedIn Preview/i').last();

    // IdeaBankBar (bottom horizontal bar)
    this.ideaBankBar = page.locator('.mt-6.hidden.lg\\:block').first();
    this.ideaBankBarChips = page
      .locator('.scrollbar-hide button.rounded-full')
      .filter({ has: page.locator('span.truncate, span.text-xs') });
    this.ideaBankBarRefresh = page
      .locator('.mt-6 button')
      .filter({ has: page.locator('svg') })
      .first();
    this.ideaBankBarEmptyChip = page.locator('button').filter({ hasText: /Get AI suggestions/i });
    this.ideaBankBarLoading = page.locator('text=/Generating ideas/i');

    // Upload zone
    this.uploadZone = page
      .locator('[class*="UploadZone"], [class*="upload-zone"], label')
      .filter({ hasText: /Upload|Drop|drag/i })
      .first();
    this.uploadInput = page.locator('input[type="file"]').first();

    // Loading/error
    this.loadingSpinner = page.locator('[class*="animate-spin"]');
    this.errorMessage = page.locator('.text-destructive, [class*="error"]');
    this.toastNotification = page.locator('[class*="toast"], [data-sonner-toast]');

    // Asset Drawer tab buttons (left panel)
    this.assetDrawerProducts = page
      .getByRole('button', { name: /Products/i })
      .or(page.getByRole('tab', { name: /Products/i }));
    this.assetDrawerTemplates = page
      .getByRole('button', { name: /Templates/i })
      .or(page.getByRole('tab', { name: /Templates/i }));
    this.assetDrawerBrandAssets = page
      .getByRole('button', { name: /Brand Assets/i })
      .or(page.getByRole('tab', { name: /Brand/i }));
    this.assetDrawerScenarios = page
      .getByRole('button', { name: /Scenarios/i })
      .or(page.getByRole('tab', { name: /Scenarios/i }));
    this.assetDrawerPatterns = page
      .getByRole('button', { name: /Patterns/i })
      .or(page.getByRole('tab', { name: /Patterns/i }));

    // Agent Chat Panel (collapsible panel at top of Studio — AgentChatPanel.tsx)
    this.agentChatToggle = page.locator('button').filter({ hasText: /Studio Assistant/i });
    this.agentChatPanel = page.locator('.border.border-t-0.border-border.rounded-b-xl');
    this.agentChatInput = page.locator('.rounded-b-xl input[placeholder*="Type a message"]');
    this.agentChatSendButton = page.locator('.rounded-b-xl button[type="submit"]');
    this.agentChatMessages = page.locator('.rounded-b-xl .max-h-\\[350px\\] .space-y-3');
    this.agentChatStopButton = page.locator('.rounded-b-xl button.text-destructive');
    this.agentChatClearButton = page.locator('.rounded-b-xl button[title="Clear chat"]');
    this.agentChatStreaming = page.locator('.rounded-b-xl').getByText('Thinking...');

    // Canvas Editor overlay
    this.canvasEditorOverlay = page.locator('[class*="canvas-editor"], [class*="CanvasEditor"]');
    this.canvasEditorClose = page.getByRole('button', { name: /Close Editor/i });
    this.canvasEditorUndo = page.getByRole('button', { name: /Undo/i });
    this.canvasEditorRedo = page.getByRole('button', { name: /Redo/i });
    this.canvasEditorTools = page.locator('[class*="toolbar"] button, [class*="ToolBar"] button');
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
    await this.productCards
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {});
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
   * Switch to template mode by clicking "Use Template" button.
   * Must be called before accessing templateCards.
   */
  async switchToTemplateMode() {
    const useTemplateBtn = this.page.locator('button').filter({ hasText: /Use Template/i });
    if (await useTemplateBtn.isVisible().catch(() => false)) {
      await useTemplateBtn.click();
      // Wait for TemplateLibrary to render
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Select a template by index (auto-switches to template mode first)
   */
  async selectTemplate(index: number = 0) {
    await this.switchToTemplateMode();
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
    // Wait briefly for view transitions after product selection
    await this.page.waitForTimeout(500);
    if (await this.promptTextarea.isVisible().catch(() => false)) {
      await this.promptTextarea.fill(prompt);
    } else if (await this.quickStartInput.isVisible().catch(() => false)) {
      await this.quickStartInput.fill(prompt);
    } else {
      // Fallback: try any visible textarea with id="prompt-textarea"
      await this.page.locator('#prompt-textarea').first().fill(prompt);
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
   * Wait for generation to complete via SSE.
   * Returns true if generation succeeded, false if error/timeout.
   */
  async waitForGenerationComplete(timeout: number = 120000): Promise<boolean> {
    // First wait for generating state to appear
    await this.generatingIndicator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    // Then wait for completion: result image, Start New button, or error toast
    try {
      await Promise.race([
        this.startNewButton.waitFor({ state: 'visible', timeout }),
        this.generatedImage.waitFor({ state: 'visible', timeout }),
        this.toastNotification.waitFor({ state: 'visible', timeout }),
      ]);
      // Check if we got a result or an error
      return await this.generatedImage.isVisible().catch(() => false);
    } catch {
      return false;
    }
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
    await expect(this.editPromptInput)
      .toBeVisible({ timeout: 5000 })
      .catch(() => {});
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
      await expect(this.historyPanel)
        .toBeVisible({ timeout: 5000 })
        .catch(() => {});
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
    await expect(this.ideaBankPanel)
      .toBeVisible({ timeout: 10000 })
      .catch(() => {});
    await this.useSuggestionButton.nth(index).click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Generate directly from Idea Bank suggestion
   */
  async generateFromIdeaBankSuggestion(index: number = 0) {
    await expect(this.ideaBankPanel)
      .toBeVisible({ timeout: 10000 })
      .catch(() => {});
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
  async runFullGenerationWorkflow(
    options: {
      productIndex?: number;
      templateIndex?: number;
      prompt?: string;
      quickStart?: boolean;
    } = {},
  ) {
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

  // ─── InspectorPanel helpers ────────────────────────────

  /**
   * Switch to an InspectorPanel tab
   */
  async switchInspectorTab(tab: 'edit' | 'copy' | 'ask-ai' | 'details') {
    const tabMap = {
      edit: this.inspectorEditTab,
      copy: this.inspectorCopyTab,
      'ask-ai': this.inspectorAskAITab,
      details: this.inspectorDetailsTab,
    };
    await tabMap[tab].click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Click an edit preset chip in the Edit tab
   */
  async clickEditPreset(presetText: string) {
    await this.switchInspectorTab('edit');
    await this.page
      .locator('button')
      .filter({ hasText: new RegExp(presetText, 'i') })
      .click();
  }

  /**
   * Generate quick copy from the Copy tab
   */
  async generateQuickCopy() {
    await this.switchInspectorTab('copy');
    await this.copyTabQuickButton.click();
    await this.page.waitForTimeout(3000);
  }

  /**
   * Ask AI a question from the Ask AI tab
   */
  async askAI(question: string) {
    await this.switchInspectorTab('ask-ai');
    await this.askAIInput.fill(question);
    await this.askAISendButton.click();
    // Wait for response
    await this.askAIResponse.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  }

  /**
   * Click an IdeaBankBar chip by index
   */
  async clickIdeaBankChip(index: number = 0) {
    await this.ideaBankBarChips.nth(index).waitFor({ state: 'visible', timeout: 15000 });
    await this.ideaBankBarChips.nth(index).click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Refresh IdeaBankBar suggestions
   */
  async refreshIdeaBank() {
    await this.ideaBankBarRefresh.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Upload a file to the upload zone
   */
  async uploadFile(filePath: string) {
    await this.uploadInput.setInputFiles(filePath);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if products are available in the DB
   */
  async hasProducts(): Promise<boolean> {
    await this.waitForProductsLoaded();
    const count = await this.productCards.count();
    return count > 0;
  }

  // ─── Asset Drawer helpers ──────────────────────────────

  /**
   * Switch between Asset Drawer tabs
   */
  async switchAssetDrawerTab(tab: 'products' | 'templates' | 'brand-assets' | 'scenarios' | 'patterns') {
    const tabMap = {
      products: this.assetDrawerProducts,
      templates: this.assetDrawerTemplates,
      'brand-assets': this.assetDrawerBrandAssets,
      scenarios: this.assetDrawerScenarios,
      patterns: this.assetDrawerPatterns,
    };
    await tabMap[tab].click();
    await this.page.waitForTimeout(500);
  }

  // ─── Agent Chat helpers ────────────────────────────────

  /**
   * Open the Agent Chat panel
   */
  async openAgentChat() {
    const isOpen = await this.agentChatPanel.isVisible().catch(() => false);
    if (!isOpen) {
      await this.agentChatToggle.click();
      await this.agentChatPanel.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    }
  }

  /**
   * Close the Agent Chat panel
   */
  async closeAgentChat() {
    const isOpen = await this.agentChatPanel.isVisible().catch(() => false);
    if (isOpen) {
      await this.agentChatToggle.click();
      await this.agentChatPanel.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  }

  /**
   * Send a message in the Agent Chat
   */
  async sendAgentChatMessage(text: string) {
    await this.openAgentChat();
    await this.agentChatInput.fill(text);
    await this.agentChatSendButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Wait for Agent Chat response to complete
   */
  async waitForAgentChatResponse(timeout: number = 30000) {
    await this.agentChatStreaming.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await this.agentChatStreaming.waitFor({ state: 'hidden', timeout }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  /**
   * Clear the Agent Chat messages
   */
  async clearAgentChat() {
    await this.openAgentChat();
    if (await this.agentChatClearButton.isVisible().catch(() => false)) {
      await this.agentChatClearButton.click();
      await this.page.waitForTimeout(300);
    }
  }
}
