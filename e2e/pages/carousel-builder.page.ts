import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Carousel Builder workflow
 * Handles interactions with carousel creation and editing features
 */
export class CarouselBuilderPage {
  readonly page: Page;

  // Main carousel builder elements
  readonly carouselBuilder: Locator;
  readonly carouselTitle: Locator;
  readonly carouselDescription: Locator;
  readonly slideCountBadge: Locator;
  readonly imagesCountBadge: Locator;
  readonly closeButton: Locator;

  // Mode toggle
  readonly editModeButton: Locator;
  readonly previewModeButton: Locator;

  // Action buttons
  readonly generateAllImagesButton: Locator;
  readonly downloadZipButton: Locator;

  // Slide thumbnails
  readonly slideThumbnails: Locator;
  readonly activeSlide: Locator;

  // Slide editor fields
  readonly headlineInput: Locator;
  readonly bodyTextarea: Locator;
  readonly imagePromptTextarea: Locator;
  readonly generateImageButton: Locator;
  readonly regenerateImageButton: Locator;
  readonly downloadSlideButton: Locator;

  // Preview carousel
  readonly carouselPreview: Locator;
  readonly carouselPrevButton: Locator;
  readonly carouselNextButton: Locator;

  // Caption section
  readonly captionSection: Locator;
  readonly captionTextarea: Locator;
  readonly hashtagBadges: Locator;
  readonly copyCaptionButton: Locator;

  // Loading states
  readonly loadingSpinner: Locator;
  readonly generatingState: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main builder elements
    this.carouselBuilder = page.locator('[class*="Card"]').filter({ hasText: 'Carousel Builder' });
    this.carouselTitle = page.locator('[class*="CardTitle"]');
    this.carouselDescription = page.locator('[class*="CardHeader"] p');
    this.slideCountBadge = page.locator('text=/\\d+ slides/');
    this.imagesCountBadge = page.locator('text=/\\d+\\/\\d+ images/');
    this.closeButton = page.locator('button').filter({ has: page.locator('[class*="X"]') }).first();

    // Mode toggle
    this.editModeButton = page.getByRole('button', { name: /Edit Mode/i });
    this.previewModeButton = page.getByRole('button', { name: /Preview/i });

    // Action buttons
    this.generateAllImagesButton = page.getByRole('button', { name: /Generate All Images/i });
    this.downloadZipButton = page.getByRole('button', { name: /Download ZIP/i });

    // Slide thumbnails
    this.slideThumbnails = page.locator('[class*="rounded-lg border"][class*="cursor-pointer"]');
    this.activeSlide = page.locator('[class*="border-primary"]');

    // Slide editor
    this.headlineInput = page.locator('input').filter({ has: page.locator('..').filter({ hasText: 'Headline' }) });
    this.bodyTextarea = page.locator('textarea').filter({ has: page.locator('..').filter({ hasText: 'Body' }) });
    this.imagePromptTextarea = page.locator('textarea').filter({ has: page.locator('..').filter({ hasText: 'Image Prompt' }) });
    this.generateImageButton = page.getByRole('button', { name: /Generate Image/i });
    this.regenerateImageButton = page.locator('button').filter({ has: page.locator('[class*="RefreshCw"]') });
    this.downloadSlideButton = page.locator('button').filter({ has: page.locator('[class*="Download"]') });

    // Preview carousel
    this.carouselPreview = page.locator('[class*="CarouselContent"]');
    this.carouselPrevButton = page.locator('button[class*="CarouselPrevious"], button').filter({ has: page.locator('[class*="ChevronLeft"]') });
    this.carouselNextButton = page.locator('button[class*="CarouselNext"], button').filter({ has: page.locator('[class*="ChevronRight"]') });

    // Caption section
    this.captionSection = page.locator('[class*="Collapsible"]').filter({ hasText: 'Caption & Hashtags' });
    this.captionTextarea = page.locator('textarea[readonly]');
    this.hashtagBadges = page.locator('[class*="Badge"]').filter({ hasText: /^#/ });
    this.copyCaptionButton = page.getByRole('button', { name: /Copy Caption|Copied/i });

    // Loading states
    this.loadingSpinner = page.locator('[class*="animate-spin"]');
    this.generatingState = page.locator('text=/Generating|Uploading/i');
  }

  /**
   * Navigate to Studio page with carousel template
   * Note: Carousel Builder is opened from the Studio page
   */
  async gotoStudioWithCarousel() {
    // Navigate to studio with a Content Planner template that supports carousel
    await this.page.goto('/?cpTemplateId=technical_guides');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Open the Carousel Builder from Studio
   */
  async openCarouselBuilder() {
    // Look for carousel-related button in the UI
    const carouselButton = this.page.getByRole('button', { name: /Carousel|Create Carousel/i });
    if (await carouselButton.isVisible()) {
      await carouselButton.click();
    }

    // Wait for builder to be visible
    await this.waitForBuilderLoaded();
  }

  /**
   * Wait for the carousel builder to load
   */
  async waitForBuilderLoaded() {
    await expect(this.carouselBuilder).toBeVisible({ timeout: 30000 });
    // Wait for outline generation to complete
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
  }

  /**
   * Check if carousel builder is visible
   */
  async isBuilderVisible(): Promise<boolean> {
    try {
      await expect(this.carouselBuilder).toBeVisible({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the number of slides
   */
  async getSlideCount(): Promise<number> {
    const text = await this.slideCountBadge.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Get the number of generated images
   */
  async getGeneratedImagesCount(): Promise<{ generated: number; total: number }> {
    const text = await this.imagesCountBadge.textContent();
    const match = text?.match(/(\d+)\/(\d+)/);
    return {
      generated: match ? parseInt(match[1]) : 0,
      total: match ? parseInt(match[2]) : 0,
    };
  }

  /**
   * Switch to edit mode
   */
  async switchToEditMode() {
    if (await this.editModeButton.isVisible()) {
      await this.editModeButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Switch to preview mode
   */
  async switchToPreviewMode() {
    if (await this.previewModeButton.isVisible()) {
      await this.previewModeButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Select a slide by index
   */
  async selectSlide(index: number) {
    await this.slideThumbnails.nth(index).click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Edit the headline of the current slide
   */
  async editHeadline(text: string) {
    await this.headlineInput.fill(text);
  }

  /**
   * Edit the body text of the current slide
   */
  async editBody(text: string) {
    await this.bodyTextarea.fill(text);
  }

  /**
   * Edit the image prompt of the current slide
   */
  async editImagePrompt(text: string) {
    await this.imagePromptTextarea.fill(text);
  }

  /**
   * Generate image for the current slide
   */
  async generateCurrentSlideImage() {
    await this.generateImageButton.click();

    // Wait for generation to complete
    await this.loadingSpinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 120000 });
  }

  /**
   * Generate all slide images
   */
  async generateAllImages() {
    await this.generateAllImagesButton.click();

    // Wait for all generations to complete (this can take a while)
    await this.page.waitForTimeout(5000);

    // Keep waiting until button is enabled again or ZIP button appears
    await Promise.race([
      this.downloadZipButton.waitFor({ state: 'visible', timeout: 300000 }),
      this.generateAllImagesButton.waitFor({ state: 'visible', timeout: 300000 }),
    ]);
  }

  /**
   * Check if all images are generated
   */
  async areAllImagesGenerated(): Promise<boolean> {
    try {
      await expect(this.downloadZipButton).toBeVisible({ timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Navigate to next slide in preview
   */
  async nextSlide() {
    await this.carouselNextButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Navigate to previous slide in preview
   */
  async previousSlide() {
    await this.carouselPrevButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Reorder slides by drag and drop (if supported)
   */
  async reorderSlide(fromIndex: number, toIndex: number) {
    const sourceSlide = this.slideThumbnails.nth(fromIndex);
    const targetSlide = this.slideThumbnails.nth(toIndex);

    const sourceBounding = await sourceSlide.boundingBox();
    const targetBounding = await targetSlide.boundingBox();

    if (sourceBounding && targetBounding) {
      await sourceSlide.hover();
      await this.page.mouse.down();
      await this.page.mouse.move(targetBounding.x + targetBounding.width / 2, targetBounding.y + targetBounding.height / 2);
      await this.page.mouse.up();
    }
  }

  /**
   * Download a single slide
   */
  async downloadSlide(index: number) {
    await this.selectSlide(index);
    await this.downloadSlideButton.click();
  }

  /**
   * Download all slides as ZIP
   */
  async downloadAllAsZip() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadZipButton.click();
    return await downloadPromise;
  }

  /**
   * Expand the caption section
   */
  async expandCaptionSection() {
    const trigger = this.captionSection.locator('button').first();
    if (await trigger.isVisible()) {
      await trigger.click();
      await this.page.waitForTimeout(200);
    }
  }

  /**
   * Get the caption text
   */
  async getCaptionText(): Promise<string> {
    await this.expandCaptionSection();
    return await this.captionTextarea.inputValue();
  }

  /**
   * Get the hashtags
   */
  async getHashtags(): Promise<string[]> {
    await this.expandCaptionSection();
    const hashtags: string[] = [];
    const count = await this.hashtagBadges.count();
    for (let i = 0; i < count; i++) {
      const text = await this.hashtagBadges.nth(i).textContent();
      if (text) hashtags.push(text);
    }
    return hashtags;
  }

  /**
   * Copy caption to clipboard
   */
  async copyCaption() {
    await this.expandCaptionSection();
    await this.copyCaptionButton.click();

    // Verify copy success
    await expect(this.page.locator('text=Copied!')).toBeVisible({ timeout: 3000 });
  }

  /**
   * Close the carousel builder
   */
  async close() {
    await this.closeButton.click();
    await expect(this.carouselBuilder).not.toBeVisible({ timeout: 3000 });
  }

  /**
   * Get slide purpose/type
   */
  async getSlidePurpose(index: number): Promise<string> {
    const slide = this.slideThumbnails.nth(index);
    const badge = slide.locator('[class*="Badge"]').first();
    return await badge.textContent() || '';
  }

  /**
   * Check if a specific slide has an image
   */
  async slideHasImage(index: number): Promise<boolean> {
    await this.selectSlide(index);
    const imageElement = this.page.locator('[class*="aspect-"] img').first();
    try {
      await expect(imageElement).toBeVisible({ timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Take screenshot of carousel builder
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `e2e/screenshots/carousel-${name}.png`,
      fullPage: true,
    });
  }
}
