import { Page, Locator, expect } from '@playwright/test';

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
      'products': this.productsTab,
      'brand-images': this.brandImagesTab,
      'templates': this.templatesTab,
      'scene-templates': this.sceneTemplatesTab,
      'scenarios': this.scenariosTab,
      'patterns': this.patternsTab,
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
