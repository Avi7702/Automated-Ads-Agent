import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Learn from Winners page (/learn-from-winners)
 * Handles pattern upload, viewing, and management
 */
export class LearnFromWinnersPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly pageDescription: Locator;
  readonly uploadZone: Locator;
  readonly uploadInput: Locator;
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly platformFilter: Locator;
  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;
  readonly patternCards: Locator;
  readonly emptyState: Locator;
  readonly loadingSkeletons: Locator;
  readonly errorMessage: Locator;
  readonly retryButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1').filter({ hasText: 'Learn from Winners' });
    this.pageDescription = page.locator('text=Extract success patterns from high-performing ads');
    this.uploadZone = page.locator('[class*="border-dashed"]').first();
    this.uploadInput = page.locator('input[type="file"]');
    this.searchInput = page.locator('input[placeholder="Search patterns..."]');
    this.categoryFilter = page.locator('button[role="combobox"]').filter({ hasText: /All Categories|Category/i });
    this.platformFilter = page.locator('button[role="combobox"]').filter({ hasText: /All Platforms|Platform/i });
    this.gridViewButton = page.locator('button').filter({ has: page.locator('svg[class*="lucide-grid"]') });
    this.listViewButton = page.locator('button').filter({ has: page.locator('svg[class*="lucide-list"]') });
    this.patternCards = page.locator('[class*="group"]').filter({ has: page.locator('[class*="card"]') });
    this.emptyState = page.locator('text=Learn from Your Winners');
    this.loadingSkeletons = page.locator('[class*="skeleton"]');
    this.errorMessage = page.locator('text=Failed to load patterns');
    this.retryButton = page.getByRole('button', { name: /Retry/i });
  }

  /**
   * Navigate to the Learn from Winners page
   */
  async goto() {
    await this.page.goto('/learn-from-winners');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if the page is fully loaded and visible
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
   * Wait for patterns to load (either show patterns, empty state, or error)
   */
  async waitForPatternsLoad() {
    await this.page.waitForSelector('[class*="skeleton"], [class*="card"], text=Learn from Your Winners, text=Failed to load patterns', {
      state: 'visible',
      timeout: 15000
    });
    // Wait for skeletons to disappear
    await this.loadingSkeletons.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  /**
   * Check if the upload zone is visible
   */
  async isUploadZoneVisible(): Promise<boolean> {
    try {
      return await this.uploadZone.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Check if the page shows empty state
   */
  async isEmptyStateVisible(): Promise<boolean> {
    try {
      return await this.emptyState.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Check if patterns are displayed
   */
  async hasPatterns(): Promise<boolean> {
    try {
      const count = await this.patternCards.count();
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get the count of displayed patterns
   */
  async getPatternCount(): Promise<number> {
    return await this.patternCards.count();
  }

  /**
   * Search for patterns
   */
  async searchPatterns(query: string) {
    await this.searchInput.fill(query);
    // Wait for filter to apply
    await this.page.waitForTimeout(300);
  }

  /**
   * Clear search
   */
  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(300);
  }

  /**
   * Click the upload zone to trigger file input
   */
  async clickUploadZone() {
    await this.uploadZone.click();
  }

  /**
   * Check if metadata dialog is visible
   */
  async isMetadataDialogVisible(): Promise<boolean> {
    const dialog = this.page.locator('[role="dialog"]');
    return await dialog.isVisible();
  }

  /**
   * Wait for metadata dialog
   */
  async waitForMetadataDialog() {
    await this.page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Fill the pattern metadata form
   */
  async fillPatternMetadata(metadata: {
    name?: string;
    category?: string;
    platform?: string;
    industry?: string;
    engagementTier?: string;
  }) {
    if (metadata.name) {
      await this.page.locator('input[placeholder*="Pattern Name"]').fill(metadata.name);
    }
    // Other fields would use select dropdowns
  }

  /**
   * Close any open dialog
   */
  async closeDialog() {
    const closeButton = this.page.locator('[role="dialog"] button').filter({ hasText: /Cancel|Close/i });
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }

  /**
   * Check for accessibility - page title
   */
  async hasAccessibleTitle(): Promise<boolean> {
    const title = await this.page.title();
    return title.length > 0;
  }

  /**
   * Check if unauthenticated user is redirected to login
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
