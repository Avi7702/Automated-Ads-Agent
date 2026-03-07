import { Page, Locator } from '@playwright/test';

/**
 * Page Object for the Pipeline page (/pipeline)
 * Handles tab navigation between Dashboard, Content Planner, Calendar, Approval, and Accounts.
 */
export class PipelinePage {
  readonly page: Page;

  // Header
  readonly header: Locator;

  // Tab buttons (inside TabsList)
  readonly tabsList: Locator;
  readonly dashboardTab: Locator;
  readonly plannerTab: Locator;
  readonly calendarTab: Locator;
  readonly approvalTab: Locator;
  readonly accountsTab: Locator;

  // Tab content areas
  readonly dashboardContent: Locator;
  readonly plannerContent: Locator;
  readonly calendarContent: Locator;
  readonly approvalContent: Locator;
  readonly accountsContent: Locator;

  // Loading indicator (Suspense fallback)
  readonly tabLoader: Locator;

  constructor(page: Page) {
    this.page = page;

    this.header = page.locator('header').first();

    // Tab list and individual tab triggers
    this.tabsList = page.locator('[role="tablist"]');
    this.dashboardTab = page.getByRole('tab', { name: /Dashboard/i });
    this.plannerTab = page.getByRole('tab', { name: /Content Planner/i });
    this.calendarTab = page.getByRole('tab', { name: /Calendar/i });
    this.approvalTab = page.getByRole('tab', { name: /Approval Queue/i });
    this.accountsTab = page.getByRole('tab', { name: /Social Accounts/i });

    // Tab content panels
    this.dashboardContent = page
      .locator('[role="tabpanel"]')
      .filter({ has: page.locator('text=/Weekly|Plan|Dashboard/i') });
    this.plannerContent = page
      .locator('[role="tabpanel"]')
      .filter({ has: page.locator('text=/Content Planner|Planner/i') });
    this.calendarContent = page.locator('[role="tabpanel"]').filter({ has: page.locator('text=/Calendar/i') });
    this.approvalContent = page.locator('[role="tabpanel"]').filter({ has: page.locator('text=/Approval|Queue/i') });
    this.accountsContent = page
      .locator('[role="tabpanel"]')
      .filter({ has: page.locator('text=/Social Accounts|Accounts/i') });

    // Suspense loading spinner
    this.tabLoader = page.locator('.animate-spin');
  }

  /**
   * Navigate to the Pipeline page (default tab: dashboard)
   */
  async goto() {
    await this.page.goto('/pipeline');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a specific tab via URL
   */
  async gotoTab(tab: 'dashboard' | 'planner' | 'calendar' | 'approval' | 'accounts') {
    await this.page.goto(`/pipeline?tab=${tab}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Switch to a tab by clicking it
   */
  async switchTab(tab: 'dashboard' | 'planner' | 'calendar' | 'approval' | 'accounts') {
    const tabMap = {
      dashboard: this.dashboardTab,
      planner: this.plannerTab,
      calendar: this.calendarTab,
      approval: this.approvalTab,
      accounts: this.accountsTab,
    };
    await tabMap[tab].click();
    await this.waitForTabContent();
  }

  /**
   * Get the currently active tab name from the URL
   */
  getCurrentTab(): string {
    const url = new URL(this.page.url());
    return url.searchParams.get('tab') || 'dashboard';
  }

  /**
   * Check if the Pipeline page is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      await this.tabsList.waitFor({ state: 'visible', timeout: 10000 });
      return await this.tabsList.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Wait for tab content to finish loading (Suspense spinner disappears)
   */
  async waitForTabContent() {
    if (await this.tabLoader.isVisible().catch(() => false)) {
      await this.tabLoader.waitFor({ state: 'hidden', timeout: 15000 });
    }
    // Give lazy-loaded component time to render
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if a tab is currently active (data-state="active")
   */
  async isTabActive(tab: 'dashboard' | 'planner' | 'calendar' | 'approval' | 'accounts'): Promise<boolean> {
    const tabMap = {
      dashboard: this.dashboardTab,
      planner: this.plannerTab,
      calendar: this.calendarTab,
      approval: this.approvalTab,
      accounts: this.accountsTab,
    };
    const state = await tabMap[tab].getAttribute('data-state');
    return state === 'active';
  }
}
