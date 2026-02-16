import { Page, Locator } from '@playwright/test';

/**
 * Page Object for the consolidated Library page (/library)
 * Handles all interactions with the tabbed library interface
 */
export class LibraryPage {
  readonly page: Page;
  readonly header: Locator;
  readonly pageTitle: Locator;
  readonly tabsList: Locator;
  readonly productsTab: Locator;
  readonly brandImagesTab: Locator;
  readonly templatesTab: Locator;
  readonly sceneTemplatesTab: Locator;
  readonly scenariosTab: Locator;
  readonly patternsTab: Locator;

  // Admin mode toggle (Templates tab)
  readonly adminModeToggle: Locator;

  // Product management
  readonly addProductButton: Locator;
  readonly productCards: Locator;
  readonly productSearchInput: Locator;
  readonly deleteProductButton: Locator;

  // Product enrichment form
  readonly enrichmentForm: Locator;
  readonly enrichmentUrlInput: Locator;
  readonly enrichmentSubmitButton: Locator;

  // Scenario CRUD
  readonly addScenarioButton: Locator;
  readonly scenarioCards: Locator;
  readonly editScenarioButton: Locator;
  readonly deleteScenarioButton: Locator;
  readonly scenarioDialog: Locator;
  readonly scenarioNameInput: Locator;
  readonly scenarioSaveButton: Locator;

  // Generic content area
  readonly tabContent: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header').first();
    this.pageTitle = page.locator('h1').filter({ hasText: 'Library' });
    this.tabsList = page.locator('[role="tablist"]');
    // Select tabs by accessible name (text content)
    this.productsTab = page.getByRole('tab', { name: 'Products' });
    this.brandImagesTab = page.getByRole('tab', { name: 'Brand Images' });
    this.templatesTab = page.getByRole('tab', { name: 'Templates' });
    this.sceneTemplatesTab = page.getByRole('tab', { name: 'Scenes' });
    this.scenariosTab = page.getByRole('tab', { name: 'Scenarios' });
    this.patternsTab = page.getByRole('tab', { name: 'Patterns' });

    // Admin mode (toggle switch or button in Templates tab)
    this.adminModeToggle = page
      .getByRole('button', { name: /Admin|Edit Mode/i })
      .or(page.locator('[role="switch"]').filter({ hasText: /Admin/i }));

    // Product management
    this.addProductButton = page.getByRole('button', { name: /Add Product|New Product/i });
    this.productCards = page.locator('[class*="Card"], [class*="card"]').filter({ has: page.locator('img') });
    this.productSearchInput = page.getByPlaceholder(/Search products/i);
    this.deleteProductButton = page.getByRole('button', { name: /Delete/i });

    // Product enrichment
    this.enrichmentForm = page.locator('form').filter({ hasText: /Enrich|URL/i });
    this.enrichmentUrlInput = page.getByPlaceholder(/URL|website/i);
    this.enrichmentSubmitButton = page.getByRole('button', { name: /Enrich|Fetch/i });

    // Scenario CRUD
    this.addScenarioButton = page.getByRole('button', { name: /Add Scenario|New Scenario|Create/i });
    this.scenarioCards = page.locator('[class*="Card"]').filter({ hasText: /scenario/i });
    this.editScenarioButton = page.getByRole('button', { name: /Edit/i });
    this.deleteScenarioButton = page.getByRole('button', { name: /Delete/i });
    this.scenarioDialog = page.locator('[role="dialog"]');
    this.scenarioNameInput = page.locator('[role="dialog"] input').first();
    this.scenarioSaveButton = page.locator('[role="dialog"]').getByRole('button', { name: /Save|Create/i });

    // Generic
    this.tabContent = page.locator('[role="tabpanel"]');
    this.emptyState = page.getByText(/No .* found|Empty|Get started/i);
  }

  /**
   * Navigate to the Library page
   */
  async goto() {
    await this.page.goto('/library');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a specific tab
   */
  async gotoTab(tab: string) {
    await this.page.goto(`/library?tab=${tab}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if the Library page is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      await this.page.waitForSelector('h1', { timeout: 10000 });
      return await this.pageTitle.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get the currently active tab
   */
  async getActiveTab(): Promise<string | null> {
    const activeTab = this.page.locator('[role="tab"][data-state="active"]');
    return await activeTab.textContent();
  }

  /**
   * Click on a specific tab
   */
  async clickTab(tabName: 'products' | 'brand-images' | 'templates' | 'scene-templates' | 'scenarios' | 'patterns') {
    const tabMap = {
      products: this.productsTab,
      'brand-images': this.brandImagesTab,
      templates: this.templatesTab,
      'scene-templates': this.sceneTemplatesTab,
      scenarios: this.scenariosTab,
      patterns: this.patternsTab,
    };
    await tabMap[tabName].click();
  }

  /**
   * Check if the URL contains the expected tab parameter
   */
  async hasTabInUrl(tab: string): Promise<boolean> {
    const url = this.page.url();
    return url.includes(`tab=${tab}`);
  }

  /**
   * Verify tab content is loaded (no loading spinner)
   */
  async waitForTabContent() {
    // Wait for any loading spinners to disappear
    const spinner = this.page.locator('[class*="animate-spin"]');
    if (await spinner.isVisible().catch(() => false)) {
      await spinner.waitFor({ state: 'hidden', timeout: 10000 });
    }
  }

  /**
   * Check if there are duplicate headers (for embedded mode testing)
   */
  async hasDuplicateHeaders(): Promise<boolean> {
    const headers = await this.page.locator('header').count();
    return headers > 1;
  }

  /**
   * Get the current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }
}
