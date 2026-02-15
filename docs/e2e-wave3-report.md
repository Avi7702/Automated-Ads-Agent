# E2E Wave 3 Report — Studio Spec Files

**Date:** 2026-02-15
**Scope:** 9 Studio E2E spec files covering all major Studio page sections

## Summary

Created 9 Playwright E2E spec files with **117 tests total** covering the entire Studio page (`/`). All tests use the existing `StudioWorkflowPage` and `StudioUXPage` page objects, `gotoWithAuth` for authentication, and viewport helpers for responsive testing.

## Files Created

| #   | File                                       | Tests | Description                                                                                                                                                                                    |
| --- | ------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `e2e/03-studio-composer.spec.ts`           | 14    | Composer view: Quick Start prompt, path selection, upload zone, products section, output settings, voice input                                                                                 |
| 2   | `e2e/04-studio-asset-drawer.spec.ts`       | 20    | Left panel: Products tab (load, select, deselect, multi-select, search, filter, clear), Templates tab, Brand Assets tab, Scenarios tab, Patterns tab, section collapse                         |
| 3   | `e2e/05-studio-generation.spec.ts`         | 15    | Generation flow: button states, generating indicator, progress bar, result view (image, download, Start New, View Details, zoom, save)                                                         |
| 4   | `e2e/06-studio-inspector.spec.ts`          | 22    | Right panel: tab switching (4 tabs), Edit tab (textarea, presets, Apply), Copy tab (generate, clipboard, advanced), Ask AI tab (input, send, quick chips), Details tab (metadata, copy prompt) |
| 5   | `e2e/07-studio-agent-chat.spec.ts`         | 14    | Chat panel: toggle open/close, chevron icon, text input, send button states, Enter submits, empty state, messages, streaming indicator, stop button, clear chat, localStorage persistence      |
| 6   | `e2e/08-studio-idea-bank.spec.ts`          | 10    | Bottom bar: visible on desktop, hidden on mobile, chips load, click applies, refresh, loading state, empty state, accessibility (role, aria-labels)                                            |
| 7   | `e2e/09-studio-history.spec.ts`            | 8     | Side panel: toggle open/close, Recent/All tabs, empty state, thumbnail click, generation count footer                                                                                          |
| 8   | `e2e/10-studio-canvas-editor.spec.ts`      | 6     | Canvas: AI Canvas button, editor overlay opens, toolbar buttons, undo/redo, close, page stability                                                                                              |
| 9   | `e2e/11-studio-keyboard-shortcuts.spec.ts` | 8     | Shift+? opens/closes dialog, ? button toggle, shortcut descriptions listed, / focuses prompt, Ctrl+G generates, Ctrl+D downloads, shortcuts suppressed in input fields                         |

**Total: 117 tests**

## Test Design Principles

1. **Real selectors from source code** — All locators derived from actual component DOM structure (read from `ComposerView.tsx`, `InspectorPanel.tsx`, `AgentChatPanel.tsx`, `IdeaBankBar.tsx`, `HistoryPanel.tsx`, `ResultViewEnhanced.tsx`, `Studio.tsx`)

2. **Page object reuse** — Uses existing `StudioWorkflowPage` (~820 lines) and `StudioUXPage` for all interactions

3. **Graceful degradation** — Tests that depend on generation completing handle the case where API is unavailable (timeouts, `catch` blocks, conditional assertions)

4. **Independent tests** — Each test uses `beforeEach` to navigate fresh; no inter-test dependencies

5. **Viewport-aware** — IdeaBankBar and History tests set viewport to `DESKTOP`; mobile visibility tests use `MOBILE`

6. **Tag organization** — All tests tagged `@studio` for selective execution

## Selector Strategy

| Component                 | Primary Selector Strategy                                   |
| ------------------------- | ----------------------------------------------------------- |
| Quick Start textarea      | `textarea[placeholder*="Describe what you want to create"]` |
| Inspector tabs            | `[role="tab"][aria-label="Edit/Copy/Ask AI/Details"]`       |
| Agent Chat toggle         | `button` filter `hasText: /Studio Assistant/i`              |
| Agent Chat input          | `input[placeholder*="Type a message"]`                      |
| IdeaBankBar wrapper       | `.mt-6.hidden.lg\\:block`                                   |
| IdeaBankBar region        | `[role="region"][aria-label="Idea suggestions"]`            |
| History panel             | `getByRole('button', { name: /History/i })`                 |
| Keyboard shortcuts dialog | `.glass` filter `hasText: 'Keyboard Shortcuts'`             |
| Canvas editor overlay     | `[class*="canvas-editor"], [class*="CanvasEditor"]`         |

## Running the Tests

```bash
# Run all Studio spec files
npx playwright test e2e/03-studio-composer.spec.ts e2e/04-studio-asset-drawer.spec.ts e2e/05-studio-generation.spec.ts e2e/06-studio-inspector.spec.ts e2e/07-studio-agent-chat.spec.ts e2e/08-studio-idea-bank.spec.ts e2e/09-studio-history.spec.ts e2e/10-studio-canvas-editor.spec.ts e2e/11-studio-keyboard-shortcuts.spec.ts

# Run by tag
npx playwright test --grep @studio

# Run a single file
npx playwright test e2e/06-studio-inspector.spec.ts
```

## Notes

- Tests 05, 06 (generation-dependent), 10 (canvas editor) require a working Gemini API for full coverage. When the API is unavailable, these tests gracefully skip the generation-dependent assertions.
- Agent Chat tests (07) test UI interaction only; SSE streaming response depends on backend availability.
- IdeaBankBar tests (08) require at least one product in the database to trigger suggestion loading.
