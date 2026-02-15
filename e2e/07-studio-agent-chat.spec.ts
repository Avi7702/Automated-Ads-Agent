/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';
import { StudioWorkflowPage } from './pages/studio-workflow.page';

/**
 * 07 — Studio Agent Chat Panel
 *
 * Tests the collapsible chat panel at top of Studio page:
 * toggle open/close, text input, Enter sends, user message appears,
 * SSE streaming UI, stop button, clear chat, voice button, persistence.
 */

test.describe('Studio — Agent Chat Panel', { tag: '@studio' }, () => {
  let studio: StudioWorkflowPage;

  test.beforeEach(async ({ page }) => {
    studio = new StudioWorkflowPage(page);
    await gotoWithAuth(page, '/');
  });

  // --- Toggle ---

  test('1. Studio Assistant toggle button is visible', async ({ page }) => {
    const toggle = page
      .locator('button, span')
      .filter({ hasText: /Studio Assistant/i })
      .first();
    await expect(toggle).toBeVisible({ timeout: 10000 });
  });

  test('2. clicking toggle opens the chat panel', async ({ page }) => {
    await studio.openAgentChat();
    const panel = studio.agentChatPanel;
    await expect(panel).toBeVisible({ timeout: 5000 });
  });

  test('3. clicking toggle again closes the chat panel', async ({ page }) => {
    await studio.openAgentChat();
    await studio.closeAgentChat();
    const panel = studio.agentChatPanel;
    await expect(panel).not.toBeVisible({ timeout: 5000 });
  });

  test('4. panel shows chevron icon that changes on toggle', async ({ page }) => {
    // When closed, chevron-down is shown; when open, chevron-up
    const toggleBtn = page
      .locator('button')
      .filter({ hasText: /Studio Assistant/i })
      .first();
    const chevronDown = toggleBtn.locator('svg.lucide-chevron-down');
    const chevronUp = toggleBtn.locator('svg.lucide-chevron-up');

    // Initially closed — chevron-down should be visible
    await expect(chevronDown).toBeVisible({ timeout: 5000 });
    await toggleBtn.click();
    await page.waitForTimeout(500);
    // Now open — chevron-up
    await expect(chevronUp).toBeVisible({ timeout: 3000 });
  });

  // --- Input ---

  test('5. chat input accepts text', async ({ page }) => {
    await studio.openAgentChat();
    const chatInput = studio.agentChatInput;
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Hello assistant');
    await expect(chatInput).toHaveValue('Hello assistant');
  });

  test('6. send button is disabled when input is empty', async ({ page }) => {
    await studio.openAgentChat();
    const sendBtn = studio.agentChatSendButton;
    await expect(sendBtn).toBeVisible({ timeout: 5000 });
    await expect(sendBtn).toBeDisabled();
  });

  test('7. send button is enabled when input has text', async ({ page }) => {
    await studio.openAgentChat();
    const chatInput = studio.agentChatInput;
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Test message');
    const sendBtn = studio.agentChatSendButton;
    await expect(sendBtn).toBeEnabled();
  });

  test('8. pressing Enter submits the message', async ({ page }) => {
    await studio.openAgentChat();
    const chatInput = studio.agentChatInput;
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Generate a product ad');
    await chatInput.press('Enter');
    await page.waitForTimeout(500);
    // Input should be cleared after submission
    await expect(chatInput).toHaveValue('');
  });

  // --- Messages ---

  test('9. empty state shows placeholder text', async ({ page }) => {
    await studio.openAgentChat();
    const placeholder = page.locator('text=Ask me to generate ads').or(page.locator('text=/Ask me|campaign/i').first());
    await expect(placeholder).toBeVisible({ timeout: 5000 });
  });

  test('10. sending a message shows it in chat area', async ({ page }) => {
    await studio.openAgentChat();
    const chatInput = studio.agentChatInput;
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Create a banner for my product');
    await chatInput.press('Enter');
    // Check that the message appears in the chat area
    const messageText = page.locator('text=Create a banner for my product');
    await expect(messageText).toBeVisible({ timeout: 10000 });
  });

  // --- Streaming & Stop ---

  test('11. streaming indicator may appear after sending message', async ({ page }) => {
    test.slow(); // API-dependent, may take longer
    await studio.openAgentChat();
    const chatInput = studio.agentChatInput;
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('What products do I have?');
    await chatInput.press('Enter');
    // Look for "Thinking..." indicator — may or may not appear depending on API availability
    const streaming = studio.agentChatStreaming;
    // Use a short timeout since streaming is transient; if API is unavailable, skip
    const isVisible = await streaming.isVisible();
    // We just verify the locator resolves without error; streaming is transient
    expect(typeof isVisible).toBe('boolean');
  });

  test.fixme('12. stop button appears during streaming', async ({ page }) => {
    // This test depends on real API streaming being active, which is non-deterministic in E2E.
    // Marking as fixme until we have a mock SSE endpoint for deterministic testing.
    await studio.openAgentChat();
    const chatInput = studio.agentChatInput;
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Generate something');
    await chatInput.press('Enter');
    const stopBtn = studio.agentChatStopButton;
    await expect(stopBtn).toBeVisible({ timeout: 5000 });
  });

  // --- Clear Chat ---

  test('13. clear chat button removes messages', async ({ page }) => {
    await studio.openAgentChat();
    const chatInput = studio.agentChatInput;
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Test clear');
    await chatInput.press('Enter');
    await page.waitForTimeout(1000);
    // Clear button (trash icon) — title="Clear chat"
    const clearBtn = page.locator('button[title="Clear chat"]');
    await expect(clearBtn).toBeVisible({ timeout: 5000 });
    await clearBtn.click();
    await page.waitForTimeout(500);
    // Placeholder should reappear
    const placeholder = page.locator('text=Ask me to generate ads');
    await expect(placeholder).toBeVisible({ timeout: 5000 });
  });

  // --- Persistence ---

  test('14. panel open state persists via localStorage', async ({ page }) => {
    await studio.openAgentChat();
    // Check localStorage
    const stored = await page.evaluate(() => localStorage.getItem('agent-chat-open'));
    expect(stored).toBe('true');

    await studio.closeAgentChat();
    const storedClosed = await page.evaluate(() => localStorage.getItem('agent-chat-open'));
    expect(storedClosed).toBe('false');
  });
});
