# E2E Foundation Report

## Summary

Created the shared E2E testing foundation: helper utilities, page objects, test fixtures, and Playwright config updates. All spec files depend on this foundation layer.

## Files Created

### Helper Files

| File                       | Purpose                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `e2e/helpers/api.ts`       | Authenticated API request wrappers (`apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiPostMultipart`) with `x-e2e-test` header for rate-limit bypass                                               |
| `e2e/helpers/test-data.ts` | Test data seeding helpers: `seedProduct`, `seedGeneration`, `seedBrandProfile`, `deleteAllTestProducts`, `getProductCount`, `getProducts`, `getGenerations`, `deleteProduct`, `deleteGeneration` |
| `e2e/helpers/viewport.ts`  | Viewport presets: `MOBILE` (375x667), `TABLET` (768x1024), `DESKTOP` (1280x800), `WIDE` (1920x1080)                                                                                              |

### New Page Objects

| File                            | Class            | Maps to Component                                                                |
| ------------------------------- | ---------------- | -------------------------------------------------------------------------------- |
| `e2e/pages/gallery.page.ts`     | `GalleryPage`    | `client/src/pages/GalleryPage.tsx`                                               |
| `e2e/pages/pipeline.page.ts`    | `PipelinePage`   | `client/src/pages/Pipeline.tsx`                                                  |
| `e2e/pages/global-chat.page.ts` | `GlobalChatPage` | `client/src/components/chat/GlobalChatButton.tsx` + `ChatSlideOver.tsx`          |
| `e2e/pages/onboarding.page.ts`  | `OnboardingPage` | `client/src/components/onboarding/OnboardingGate.tsx` + `BusinessOnboarding.tsx` |
| `e2e/pages/not-found.page.ts`   | `NotFoundPage`   | `client/src/pages/not-found.tsx`                                                 |

### Test Fixtures

| File                                | Purpose                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| `e2e/fixtures/test-brand-image.jpg` | Brand image fixture for upload tests (copy of test-upload.png) |

## Files Modified

### Updated Page Objects

| File                                | Changes                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/pages/settings.page.ts`        | Added `knowledgeBaseNav`, `strategyNav`, brand profile form locators (company name, industry, brand voice), API key dialog locators, section content areas. Updated `clickSection()` to support all 5 sections.                                                                                                                                                                                             |
| `e2e/pages/library.page.ts`         | Added `adminModeToggle`, product management locators (add, search, cards, delete), product enrichment form locators, scenario CRUD locators (add, edit, delete, dialog), `tabContent`, `emptyState`.                                                                                                                                                                                                        |
| `e2e/pages/studio-workflow.page.ts` | Added Asset Drawer tab locators (Products, Templates, Brand Assets, Scenarios, Patterns), Agent Chat panel locators (toggle, input, send, messages, stop, clear, streaming), Canvas Editor locators (overlay, close, undo, redo, tools). Added helper methods: `switchAssetDrawerTab()`, `openAgentChat()`, `closeAgentChat()`, `sendAgentChatMessage()`, `waitForAgentChatResponse()`, `clearAgentChat()`. |

### Config Updates

| File                   | Changes                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `playwright.config.ts` | Added `mobile` project using iPhone 13 device profile, matching `34-mobile-responsive.spec.ts` test file pattern. |

## Architecture Decisions

1. **Page objects match real DOM** - Every locator was derived from reading the actual React component source code, not guessed.
2. **Playwright best practices** - Used `getByRole()`, `getByText()`, `getByPlaceholder()`, `getByLabel()` where possible; CSS selectors only as fallback.
3. **No assertions in page objects** - Page objects contain only locators and helper methods, assertions belong in spec files.
4. **API helpers use existing auth pattern** - All API helpers include `x-e2e-test` header matching the existing `ensureAuth.ts` pattern.
5. **Viewport presets are plain objects** - Can be used with `page.setViewportSize()` or as Playwright config values.
