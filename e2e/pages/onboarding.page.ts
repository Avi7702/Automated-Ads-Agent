import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the BusinessOnboarding wizard overlay.
 * A 7-step full-screen overlay that appears for first-time users.
 *
 * Steps: Welcome, Industry & Niche, Differentiator, Target Customer,
 *        Product Ranking, Content Themes, Review & Confirm
 */
export class OnboardingPage {
  readonly page: Page;

  // Overlay container (fixed inset-0 z-50)
  readonly overlay: Locator;

  // Card wrapper
  readonly card: Locator;

  // Step indicator
  readonly stepIndicator: Locator;

  // Navigation buttons
  readonly skipButton: Locator;
  readonly backButton: Locator;
  readonly nextButton: Locator;
  readonly completeSetupButton: Locator;

  // Progress bar
  readonly progressBar: Locator;

  // Step 1: Welcome
  readonly welcomeHeading: Locator;

  // Step 2: Industry & Niche
  readonly industrySelect: Locator;
  readonly nicheInput: Locator;

  // Step 3: Differentiator
  readonly differentiatorTextarea: Locator;

  // Step 4: Target Customer
  readonly b2bButton: Locator;
  readonly b2cButton: Locator;
  readonly bothButton: Locator;
  readonly demographicsInput: Locator;
  readonly painPointInput: Locator;
  readonly painPointAddButton: Locator;
  readonly decisionFactorInput: Locator;
  readonly decisionFactorAddButton: Locator;

  // Step 5: Product Ranking
  readonly productRankingHeading: Locator;
  readonly noProductsMessage: Locator;

  // Step 6: Content Themes
  readonly contentThemesHeading: Locator;
  readonly suggestedThemes: Locator;
  readonly customThemeInput: Locator;
  readonly customThemeAddButton: Locator;
  readonly selectedThemes: Locator;

  // Step 7: Review & Confirm
  readonly reviewHeading: Locator;
  readonly reviewRows: Locator;
  readonly reviewEditButtons: Locator;

  // Loading state
  readonly savingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;

    // The overlay is a fixed full-screen div with z-50
    this.overlay = page.locator('.fixed.inset-0.z-50');
    this.card = this.overlay.locator('.max-w-2xl');

    // Step indicator: "Step X of 7"
    this.stepIndicator = this.overlay.locator('span').filter({ hasText: /Step \d+ of \d+/ });

    // Buttons
    this.skipButton = this.overlay.getByRole('button', { name: /Skip for now/i });
    this.backButton = this.overlay.getByRole('button', { name: /Back/i });
    this.nextButton = this.overlay.getByRole('button', { name: /Next/i });
    this.completeSetupButton = this.overlay.getByRole('button', { name: /Complete Setup/i });

    // Progress bar
    this.progressBar = this.overlay.locator('[role="progressbar"]');

    // Step 1: Welcome
    this.welcomeHeading = this.overlay.getByText("Let's set up your content strategy");

    // Step 2: Industry & Niche
    this.industrySelect = this.overlay.locator('button[role="combobox"]');
    this.nicheInput = this.overlay.getByPlaceholder(/Residential flooring/i);

    // Step 3: Differentiator
    this.differentiatorTextarea = this.overlay.locator('textarea');

    // Step 4: Target Customer
    this.b2bButton = this.overlay.getByRole('button', { name: 'B2B', exact: true });
    this.b2cButton = this.overlay.getByRole('button', { name: 'B2C', exact: true });
    this.bothButton = this.overlay.getByRole('button', { name: 'Both', exact: true });
    this.demographicsInput = this.overlay.getByPlaceholder(/Small business owners/i);
    this.painPointInput = this.overlay.getByPlaceholder(/Type a pain point/i);
    this.painPointAddButton = this.overlay
      .locator('.flex.gap-2')
      .filter({ has: page.getByPlaceholder(/pain point/i) })
      .getByRole('button');
    this.decisionFactorInput = this.overlay.getByPlaceholder(/buying decisions/i);
    this.decisionFactorAddButton = this.overlay
      .locator('.flex.gap-2')
      .filter({ has: page.getByPlaceholder(/buying decisions/i) })
      .getByRole('button');

    // Step 5: Product Ranking
    this.productRankingHeading = this.overlay.getByText('Product Ranking');
    this.noProductsMessage = this.overlay.getByText('No products found');

    // Step 6: Content Themes
    this.contentThemesHeading = this.overlay.getByText('Content Themes');
    this.suggestedThemes = this.overlay.locator('.cursor-pointer').filter({ has: page.locator('svg') });
    this.customThemeInput = this.overlay.getByPlaceholder(/Type a theme/i);
    this.customThemeAddButton = this.overlay
      .locator('.flex.gap-2')
      .filter({ has: page.getByPlaceholder(/theme/i) })
      .getByRole('button');
    this.selectedThemes = this.overlay.locator('[class*="Badge"]').filter({ has: page.locator('button') });

    // Step 7: Review & Confirm
    this.reviewHeading = this.overlay.getByText('Review & Confirm');
    this.reviewRows = this.overlay.locator('.rounded-lg.border.border-border.bg-muted\\/30');
    this.reviewEditButtons = this.overlay.locator('.rounded-lg.border').getByRole('button', { name: /Edit/i });

    // Loading
    this.savingSpinner = this.overlay.locator('.animate-spin');
  }

  /**
   * Check if the onboarding overlay is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.overlay.isVisible().catch(() => false);
  }

  /**
   * Get the current step number
   */
  async getCurrentStep(): Promise<number> {
    const text = await this.stepIndicator.textContent();
    const match = text?.match(/Step (\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Skip the entire onboarding wizard
   */
  async skip() {
    await this.skipButton.click();
    await expect(this.overlay).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Go to the next step
   */
  async goNext() {
    await this.nextButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Go to the previous step
   */
  async goBack() {
    await this.backButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Complete step 2: select industry and optionally fill niche
   */
  async completeIndustryStep(industry: string, niche?: string) {
    await this.industrySelect.click();
    await this.page.getByRole('option', { name: industry }).click();
    if (niche) {
      await this.nicheInput.fill(niche);
    }
  }

  /**
   * Complete step 3: fill differentiator
   */
  async completeDifferentiatorStep(text: string) {
    await this.differentiatorTextarea.fill(text);
  }

  /**
   * Complete step 4: set customer type
   */
  async completeCustomerStep(type: 'B2B' | 'B2C' | 'both') {
    const typeMap = {
      B2B: this.b2bButton,
      B2C: this.b2cButton,
      both: this.bothButton,
    };
    await typeMap[type].click();
  }

  /**
   * Complete the entire onboarding (all 7 steps) with minimal data
   */
  async completeAll(options?: { industry?: string; differentiator?: string; customerType?: 'B2B' | 'B2C' | 'both' }) {
    const {
      industry = 'Technology',
      differentiator = 'We offer the best service',
      customerType = 'B2B',
    } = options || {};

    // Step 1: Welcome — just click Next
    await this.goNext();

    // Step 2: Industry
    await this.completeIndustryStep(industry);
    await this.goNext();

    // Step 3: Differentiator
    await this.completeDifferentiatorStep(differentiator);
    await this.goNext();

    // Step 4: Customer
    await this.completeCustomerStep(customerType);
    await this.goNext();

    // Step 5: Product Ranking — skip (optional)
    await this.goNext();

    // Step 6: Content Themes — skip (optional)
    await this.goNext();

    // Step 7: Review — click Complete Setup
    await this.completeSetupButton.click();
    await expect(this.overlay).not.toBeVisible({ timeout: 15000 });
  }
}
