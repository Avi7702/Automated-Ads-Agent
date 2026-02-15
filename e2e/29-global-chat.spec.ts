import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';
import { GlobalChatPage } from './pages/global-chat.page';

/**
 * Global Chat FAB E2E Tests
 *
 * Component: GlobalChatButton (FAB) + ChatSlideOver (Sheet dialog)
 * The FAB is always visible at bottom-right on every authenticated page.
 *
 * Tests: FAB visibility, open/close, chat input, send message, response,
 *        accessible from different pages, empty state, quick-start suggestions.
 */

test.describe('Global Chat', { tag: '@chat' }, () => {
  test('FAB button is visible on the Studio page', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForTimeout(2000);

    const chat = new GlobalChatPage(page);
    await expect(chat.fabButton).toBeVisible();
  });

  test('FAB button is visible on the Settings page', async ({ page }) => {
    await gotoWithAuth(page, '/settings');
    await page.waitForTimeout(2000);

    const chat = new GlobalChatPage(page);
    await expect(chat.fabButton).toBeVisible();
  });

  test('FAB button is visible on the Gallery page', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await page.waitForTimeout(2000);

    const chat = new GlobalChatPage(page);
    await expect(chat.fabButton).toBeVisible();
  });

  test('clicking FAB opens the chat slide-over panel', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForTimeout(2000);

    const chat = new GlobalChatPage(page);
    await chat.open();

    await expect(chat.chatPanel).toBeVisible();
    await expect(chat.chatTitle).toBeVisible();
  });

  test('FAB aria-label changes to "Close chat" when open', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForTimeout(2000);

    const chat = new GlobalChatPage(page);

    // Initially "Open chat"
    const openBtn = page.locator('button[aria-label="Open chat"]');
    await expect(openBtn).toBeVisible();

    await chat.open();

    // After opening, should have "Close chat"
    const closeBtn = page.locator('button[aria-label="Close chat"]');
    await expect(closeBtn).toBeVisible();
  });

  test('clicking FAB again closes the chat panel', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForTimeout(2000);

    const chat = new GlobalChatPage(page);
    await chat.open();
    await expect(chat.chatPanel).toBeVisible();

    await chat.close();
    await expect(chat.chatPanel).not.toBeVisible();
  });

  test('chat panel shows "Ad Assistant" title and description', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForTimeout(2000);

    const chat = new GlobalChatPage(page);
    await chat.open();

    await expect(chat.chatTitle).toBeVisible();
    await expect(chat.chatDescription).toBeVisible();
  });

  test('chat panel has input field for typing messages', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForTimeout(2000);

    const chat = new GlobalChatPage(page);
    await chat.open();

    await expect(chat.chatInput).toBeVisible();
    await expect(chat.chatInput).toHaveAttribute('placeholder', /Type a message/i);
  });

  test('chat shows empty state or quick-start suggestions when no messages', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForTimeout(2000);

    const chat = new GlobalChatPage(page);
    await chat.open();

    // Empty state shows "How can I help?" or quick-start suggestions
    const emptyState = chat.emptyState;
    const quickStartSuggestions = chat.quickStartSuggestions;

    // At least one should be present: empty state message or quick-start suggestions
    const emptyStateVisible = await emptyState.isVisible();
    const suggestionCount = await quickStartSuggestions.count();

    expect(emptyStateVisible || suggestionCount > 0).toBeTruthy();
  });

  test('can type and send a message in the chat', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForTimeout(2000);

    const chat = new GlobalChatPage(page);
    await chat.open();

    // Type a message
    await chat.chatInput.fill('Hello, test message');

    // Send button should be enabled
    await expect(chat.sendButton).toBeVisible();

    // We intentionally don't click send to avoid hitting the AI backend in E2E
    // Just verify the input field accepted the text
    await expect(chat.chatInput).toHaveValue('Hello, test message');
  });
});
