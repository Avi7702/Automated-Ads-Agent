import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Global Chat (FAB + Slide-over panel)
 * The GlobalChatButton is a fixed FAB at bottom-right that opens a Sheet-based chat panel.
 */
export class GlobalChatPage {
  readonly page: Page;

  // FAB button (fixed bottom-right)
  readonly fabButton: Locator;

  // Sheet-based chat panel
  readonly chatPanel: Locator;
  readonly chatTitle: Locator;
  readonly chatDescription: Locator;

  // Chat input
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly stopButton: Locator;
  readonly newChatButton: Locator;

  // Messages
  readonly messagesContainer: Locator;
  readonly userMessages: Locator;
  readonly assistantMessages: Locator;
  readonly streamingIndicator: Locator;
  readonly errorMessage: Locator;

  // Empty state
  readonly emptyState: Locator;
  readonly quickStartSuggestions: Locator;

  // Voice input
  readonly voiceButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // FAB — the fixed button with aria-label "Open chat" or "Close chat"
    this.fabButton = page.locator('button[aria-label="Open chat"], button[aria-label="Close chat"]');

    // Sheet panel content
    this.chatPanel = page.locator('[role="dialog"]').filter({ hasText: /Ad Assistant/i });
    this.chatTitle = page.getByText('Ad Assistant');
    this.chatDescription = page.getByText('Ask anything about your ads');

    // Input form at the bottom of the sheet
    this.chatInput = page.locator('input[placeholder*="Type a message"]');
    this.sendButton = page.locator('[role="dialog"] form button[type="submit"]');
    this.stopButton = page.locator('[role="dialog"] button.text-destructive');
    this.newChatButton = page.getByRole('button', { name: /New chat/i });

    // Messages area
    this.messagesContainer = page.locator('[role="dialog"] .overflow-y-auto');
    this.userMessages = page.locator('[role="dialog"] .bg-primary.text-primary-foreground.rounded-2xl');
    this.assistantMessages = page.locator('[role="dialog"] .bg-muted.text-foreground.rounded-2xl');
    this.streamingIndicator = page.locator('[role="dialog"]').getByText('Thinking...');
    this.errorMessage = page.locator('[role="dialog"] .text-destructive.bg-destructive\\/10');

    // Empty state
    this.emptyState = page.locator('[role="dialog"]').getByText('How can I help?');
    this.quickStartSuggestions = page.locator('[role="dialog"] .flex-wrap.gap-1\\.5 button');

    // Voice input button
    this.voiceButton = page
      .locator('[role="dialog"] button')
      .filter({ has: page.locator('svg') })
      .first();
  }

  /**
   * Open the chat slide-over by clicking the FAB
   */
  async open() {
    const label = await this.fabButton.getAttribute('aria-label');
    if (label === 'Close chat') return; // Already open
    await this.fabButton.click();
    await expect(this.chatPanel).toBeVisible({ timeout: 5000 });
  }

  /**
   * Close the chat slide-over
   */
  async close() {
    const label = await this.fabButton.getAttribute('aria-label');
    if (label === 'Open chat') return; // Already closed
    await this.fabButton.click();
    await expect(this.chatPanel).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if the FAB is visible on the page
   */
  async isFabVisible(): Promise<boolean> {
    return await this.fabButton.isVisible().catch(() => false);
  }

  /**
   * Check if the chat panel is open
   */
  async isOpen(): Promise<boolean> {
    return await this.chatPanel.isVisible().catch(() => false);
  }

  /**
   * Send a message in the chat
   */
  async sendMessage(text: string) {
    await this.chatInput.fill(text);
    await this.sendButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Wait for the assistant to finish responding
   */
  async waitForResponse(timeout: number = 30000) {
    // Wait for streaming to start
    await this.streamingIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    // Wait for streaming to finish
    await this.streamingIndicator.waitFor({ state: 'hidden', timeout }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  /**
   * Click a quick-start suggestion button
   */
  async clickSuggestion(index: number) {
    await this.quickStartSuggestions.nth(index).click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get the message count (user + assistant)
   */
  async getMessageCount(): Promise<number> {
    const user = await this.userMessages.count();
    const assistant = await this.assistantMessages.count();
    return user + assistant;
  }

  /**
   * Clear the chat by clicking New Chat
   */
  async clearChat() {
    if (await this.newChatButton.isVisible().catch(() => false)) {
      await this.newChatButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Stop the current streaming response
   */
  async stopStreaming() {
    if (await this.stopButton.isVisible().catch(() => false)) {
      await this.stopButton.click();
      await this.page.waitForTimeout(300);
    }
  }
}
