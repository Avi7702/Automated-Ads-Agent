import { Page, Locator } from '@playwright/test';

/**
 * Page Object for the consolidated Settings page (/settings)
 * Handles all interactions with the settings interface.
 *
 * Sections: Brand Profile, Knowledge Base, API Keys, Strategy, Usage & Quotas
 */
export class SettingsPage {
  readonly page: Page;
  readonly header: Locator;
  readonly pageTitle: Locator;
  readonly pageDescription: Locator;

  // Section navigation buttons (sidebar)
  readonly brandNav: Locator;
  readonly knowledgeBaseNav: Locator;
  readonly apiKeysNav: Locator;
  readonly strategyNav: Locator;
  readonly usageNav: Locator;

  // Content area
  readonly contentArea: Locator;
  readonly sectionLoading: Locator;

  // Brand Profile form locators
  readonly brandCompanyNameInput: Locator;
  readonly brandIndustryInput: Locator;
  readonly brandVoiceTextarea: Locator;
  readonly brandSaveButton: Locator;

  // API Keys section locators
  readonly addApiKeyButton: Locator;
  readonly apiKeyDialog: Locator;
  readonly apiKeyNameInput: Locator;
  readonly apiKeyValueInput: Locator;
  readonly apiKeySaveButton: Locator;

  // Strategy section locators
  readonly strategyContent: Locator;

  // Knowledge Base section locators
  readonly knowledgeBaseContent: Locator;

  // Usage section locators
  readonly usageContent: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header').first();
    this.pageTitle = page.locator('h1').filter({ hasText: /Settings/i });
    this.pageDescription = page.getByText('Configure your account and preferences');

    // Navigation sidebar buttons — match the Settings.tsx sections array
    this.brandNav = page.getByRole('button', { name: /Brand Profile/i });
    this.knowledgeBaseNav = page.getByRole('button', { name: /Knowledge Base/i });
    this.apiKeysNav = page.getByRole('button', { name: /API Keys/i });
    this.strategyNav = page.getByRole('button', { name: /Strategy/i });
    this.usageNav = page.getByRole('button', { name: /Usage/i });

    // Content area (right side)
    this.contentArea = page.locator('.bg-card.rounded-lg.border');
    this.sectionLoading = page.locator('.animate-spin');

    // Brand Profile form fields (rendered inside BrandProfile component)
    this.brandCompanyNameInput = page
      .getByLabel(/Company Name/i)
      .or(page.locator('input[name="companyName"]'))
      .or(page.getByPlaceholder(/company name/i));
    this.brandIndustryInput = page
      .getByLabel(/Industry/i)
      .or(page.locator('input[name="industry"]'))
      .or(page.getByPlaceholder(/industry/i));
    this.brandVoiceTextarea = page
      .getByLabel(/Brand Voice/i)
      .or(page.locator('textarea[name="brandVoice"]'))
      .or(page.getByPlaceholder(/brand voice/i));
    this.brandSaveButton = page.getByRole('button', { name: /Save|Update/i });

    // API Keys section
    this.addApiKeyButton = page.getByRole('button', { name: /Add|New/i }).filter({ hasText: /Key|API/i });
    this.apiKeyDialog = page.locator('[role="dialog"]').filter({ hasText: /API Key/i });
    this.apiKeyNameInput = page.locator('[role="dialog"] input').first();
    this.apiKeyValueInput = page.locator('[role="dialog"] input').last();
    this.apiKeySaveButton = page.locator('[role="dialog"]').getByRole('button', { name: /Save|Add/i });

    // Section content areas
    this.strategyContent = this.contentArea;
    this.knowledgeBaseContent = this.contentArea;
    this.usageContent = this.contentArea;
  }

  /**
   * Navigate to the Settings page
   */
  async goto() {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a specific section
   */
  async gotoSection(section: string) {
    await this.page.goto(`/settings?section=${section}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if the Settings page is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      await this.page.waitForSelector('h1', { timeout: 10000 });
      const titleVisible = await this.pageTitle.isVisible().catch(() => false);
      // Also check for Brand Profile content which is the default section
      const brandFormVisible = await this.page
        .locator('form')
        .first()
        .isVisible()
        .catch(() => false);
      return titleVisible || brandFormVisible;
    } catch {
      return false;
    }
  }

  /**
   * Get the currently active section from URL
   */
  async getActiveSection(): Promise<string> {
    const url = new URL(this.page.url());
    return url.searchParams.get('section') || 'brand';
  }

  /**
   * Click on a specific section in the sidebar
   */
  async clickSection(section: 'brand' | 'knowledge-base' | 'api-keys' | 'strategy' | 'usage') {
    const sectionMap = {
      brand: this.brandNav,
      'knowledge-base': this.knowledgeBaseNav,
      'api-keys': this.apiKeysNav,
      strategy: this.strategyNav,
      usage: this.usageNav,
    };
    if (await sectionMap[section].isVisible().catch(() => false)) {
      await sectionMap[section].click();
      await this.waitForSectionContent();
    }
  }

  /**
   * Check if the URL contains the expected section parameter
   */
  async hasSectionInUrl(section: string): Promise<boolean> {
    const url = this.page.url();
    return url.includes(`section=${section}`);
  }

  /**
   * Wait for section content to load
   */
  async waitForSectionContent() {
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
