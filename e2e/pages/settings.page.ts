import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the consolidated Settings page (/settings)
 * Handles all interactions with the settings interface
 */
export class SettingsPage {
  readonly page: Page;
  readonly header: Locator;
  readonly pageTitle: Locator;
  readonly brandSection: Locator;
  readonly apiKeysSection: Locator;
  readonly usageSection: Locator;
  readonly brandNav: Locator;
  readonly apiKeysNav: Locator;
  readonly usageNav: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header').first();
    this.pageTitle = page.locator('h1').filter({ hasText: /Settings|Brand Profile/i });
    this.brandSection = page.locator('[data-section="brand"]');
    this.apiKeysSection = page.locator('[data-section="api-keys"]');
    this.usageSection = page.locator('[data-section="usage"]');
    // Navigation buttons/links
    this.brandNav = page.getByRole('button', { name: /Brand/i }).or(page.getByRole('tab', { name: /Brand/i }));
    this.apiKeysNav = page.getByRole('button', { name: /API Keys/i }).or(page.getByRole('tab', { name: /API Keys/i }));
    this.usageNav = page.getByRole('button', { name: /Usage/i }).or(page.getByRole('tab', { name: /Usage/i }));
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
      const brandFormVisible = await this.page.locator('form').first().isVisible().catch(() => false);
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
   * Click on a specific section
   */
  async clickSection(section: 'brand' | 'api-keys' | 'usage') {
    const sectionMap = {
      'brand': this.brandNav,
      'api-keys': this.apiKeysNav,
      'usage': this.usageNav,
    };
    if (await sectionMap[section].isVisible().catch(() => false)) {
      await sectionMap[section].click();
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
