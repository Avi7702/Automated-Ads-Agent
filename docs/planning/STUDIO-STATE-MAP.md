# Studio State Consumption Map

> Generated 2026-02-25 for Sprint 2 Task S2-10.
> Purpose: Guide the state unification work in S2-11 through S2-13.

---

## State Sources

### 1. StudioContext (useReducer)

- **File:** `client/src/contexts/StudioContext.tsx`
- **Pattern:** React Context + `useReducer` (single reducer, single dispatch)
- **Provider:** `<StudioProvider>` wraps the entire Studio page (`pages/Studio.tsx:336-562`)
- **Access hook:** `useStudioContext()` returns `{ state, dispatch }`

#### State Fields (16 fields)

| #   | Field                     | Type                                 | Default       |
| --- | ------------------------- | ------------------------------------ | ------------- |
| 1   | `generationState`         | `'idle' \| 'generating' \| 'result'` | `'idle'`      |
| 2   | `generatedImage`          | `string \| null`                     | `null`        |
| 3   | `generationId`            | `string \| null`                     | `null`        |
| 4   | `selectedProducts`        | `Product[]`                          | `[]`          |
| 5   | `selectedTemplate`        | `AdSceneTemplate \| null`            | `null`        |
| 6   | `tempUploads`             | `AnalyzedUpload[]`                   | `[]`          |
| 7   | `prompt`                  | `string`                             | `''`          |
| 8   | `selectedSuggestion`      | `SelectedSuggestion \| null`         | `null`        |
| 9   | `platform`                | `string`                             | `'LinkedIn'`  |
| 10  | `aspectRatio`             | `string`                             | `'1200x627'`  |
| 11  | `resolution`              | `'1K' \| '2K' \| '4K'`               | `'2K'`        |
| 12  | `ideaBankMode`            | `IdeaBankMode`                       | `'freestyle'` |
| 13  | `generationMode`          | `GenerationMode`                     | `'standard'`  |
| 14  | `selectedTemplateForMode` | `AdSceneTemplate \| null`            | `null`        |
| 15  | `generationRecipe`        | `GenerationRecipe \| undefined`      | `undefined`   |
| 16  | `generatedCopy`           | `string`                             | `''`          |

#### Actions (24 action types)

| Category        | Actions                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| Generation      | `SET_GENERATION_STATE`, `SET_GENERATED_IMAGE`, `CLEAR_GENERATION`                 |
| Products        | `SELECT_PRODUCT`, `DESELECT_PRODUCT`, `CLEAR_PRODUCTS`, `SET_PRODUCTS`            |
| Templates       | `SELECT_TEMPLATE`, `CLEAR_TEMPLATE`                                               |
| Uploads         | `SET_UPLOADS`, `ADD_UPLOAD`, `UPDATE_UPLOAD`, `REMOVE_UPLOAD`, `CLEAR_UPLOADS`    |
| Prompt          | `SET_PROMPT`, `SET_SUGGESTION`                                                    |
| Output Settings | `SET_PLATFORM`, `SET_ASPECT_RATIO`, `SET_RESOLUTION`                              |
| Modes           | `SET_IDEABANK_MODE`, `SET_GENERATION_MODE`, `SET_TEMPLATE_FOR_MODE`, `SET_RECIPE` |
| Copy            | `SET_GENERATED_COPY`                                                              |
| Utility         | `RESET`, `LOAD_FROM_HISTORY`                                                      |

#### Direct Consumers

- `useStudioState` hook (wraps it -- see Source 3 below)
- `StudioProvider` used in `pages/Studio.tsx:336`

---

### 2. useStudioOrchestrator (useState via sub-hooks)

- **File:** `client/src/hooks/useStudioOrchestrator.ts`
- **Pattern:** Composer hook that combines 6 focused sub-hooks, each using `useState` internally
- **Sub-hooks:**
  - `useStudioProducts` (`hooks/studio/useStudioProducts.ts`) -- product/template queries & selection
  - `useStudioGeneration` (`hooks/studio/useStudioGeneration.ts`) -- image/video generation, editing, copy
  - `useStudioUI` (`hooks/studio/useStudioUI.ts`) -- collapsed sections, scroll, zoom, dialogs
  - `useStudioHistory` (`hooks/studio/useStudioHistory.ts`) -- history panel & URL state
  - `useStudioDeepLink` (`hooks/studio/useStudioDeepLink.ts`) -- query-param deep linking, plan context
  - `useStudioKeyboard` (`hooks/studio/useStudioKeyboard.ts`) -- keyboard shortcuts
- **Called in:** `pages/Studio.tsx:146` as `const orch = useStudioOrchestrator()`
- **Return type:** `StudioOrchestrator` (exported as `ReturnType<typeof useStudioOrchestrator>`)

#### Returned State Fields (70+ fields)

**Core state (4 local useState in orchestrator):**

| #   | Field         | Type                   | Default      | Source         |
| --- | ------------- | ---------------------- | ------------ | -------------- |
| 1   | `prompt`      | `string`               | `''`         | local useState |
| 2   | `platform`    | `string`               | `'LinkedIn'` | local useState |
| 3   | `aspectRatio` | `string`               | `'1200x627'` | local useState |
| 4   | `resolution`  | `'1K' \| '2K' \| '4K'` | `'2K'`       | local useState |

**From useStudioProducts:**

| #   | Field                        | Type                           | Access         |
| --- | ---------------------------- | ------------------------------ | -------------- |
| 5   | `selectedProducts`           | `Product[]`                    | read-write     |
| 6   | `selectedTemplate`           | `AdSceneTemplate \| null`      | read-write     |
| 7   | `templateCategory`           | `string`                       | read-write     |
| 8   | `searchQuery`                | `string`                       | read-write     |
| 9   | `categoryFilter`             | `string`                       | read-write     |
| 10  | `showTemplateInspiration`    | `boolean`                      | read-write     |
| 11  | `selectedPerformingTemplate` | `PerformingAdTemplate \| null` | read-write     |
| 12  | `authUser`                   | user object                    | read           |
| 13  | `products`                   | `Product[]`                    | read (query)   |
| 14  | `templates`                  | `AdSceneTemplate[]`            | read (query)   |
| 15  | `featuredAdTemplates`        | `PerformingAdTemplate[]`       | read (query)   |
| 16  | `isLoadingFeatured`          | `boolean`                      | read           |
| 17  | `filteredProducts`           | `Product[]`                    | read (derived) |
| 18  | `categories`                 | `string[]`                     | read (derived) |

**From useStudioGeneration:**

| #   | Field                | Type                 | Access     |
| --- | -------------------- | -------------------- | ---------- |
| 19  | `state`              | `GenerationState`    | read-write |
| 20  | `generatedImage`     | `string \| null`     | read-write |
| 21  | `generationId`       | `string \| null`     | read-write |
| 22  | `editPrompt`         | `string`             | read-write |
| 23  | `isEditing`          | `boolean`            | read       |
| 24  | `askAIQuestion`      | `string`             | read-write |
| 25  | `askAIResponse`      | `string`             | read       |
| 26  | `isAskingAI`         | `boolean`            | read       |
| 27  | `generatedCopy`      | `string`             | read-write |
| 28  | `isGeneratingCopy`   | `boolean`            | read-write |
| 29  | `generatedImageUrl`  | `string`             | read       |
| 30  | `generatedCopyFull`  | `CopyResult \| null` | read-write |
| 31  | `videoJobId`         | `string \| null`     | read-write |
| 32  | `generatedMediaType` | `'image' \| 'video'` | read-write |
| 33  | `justCopied`         | `boolean`            | read       |
| 34  | `isDownloading`      | `boolean`            | read       |

**From useStudioUI:**

| #   | Field                   | Type                       | Access         |
| --- | ----------------------- | -------------------------- | -------------- |
| 35  | `collapsedSections`     | `Record<string, boolean>`  | read-write     |
| 36  | `currentSection`        | `string`                   | read           |
| 37  | `showContextBar`        | `boolean`                  | read           |
| 38  | `showStickyGenerate`    | `boolean`                  | read           |
| 39  | `activeActionButton`    | `string \| null`           | read-write     |
| 40  | `quickStartMode`        | `boolean`                  | read-write     |
| 41  | `quickStartPrompt`      | `string`                   | read-write     |
| 42  | `tempUploads`           | `AnalyzedUpload[]`         | read-write     |
| 43  | `priceEstimate`         | `PriceEstimate \| null`    | read           |
| 44  | `showSaveToCatalog`     | `boolean`                  | read-write     |
| 45  | `showCanvasEditor`      | `boolean`                  | read-write     |
| 46  | `mediaMode`             | `'image' \| 'video'`       | read-write     |
| 47  | `videoDuration`         | `number`                   | read-write     |
| 48  | `showKeyboardShortcuts` | `boolean`                  | read-write     |
| 49  | `imageScale`            | `number`                   | read-write     |
| 50  | `imagePosition`         | `{ x: number, y: number }` | read-write     |
| 51  | `canGenerate`           | `boolean`                  | read (derived) |
| 52  | `progressSections`      | computed                   | read           |

**From useStudioDeepLink:**

| #   | Field                     | Type                            | Access     |
| --- | ------------------------- | ------------------------------- | ---------- |
| 53  | `selectedSuggestion`      | `SelectedSuggestion \| null`    | read-write |
| 54  | `generationRecipe`        | `GenerationRecipe \| undefined` | read-write |
| 55  | `ideaBankMode`            | `IdeaBankMode`                  | read-write |
| 56  | `generationMode`          | `GenerationMode`                | read-write |
| 57  | `selectedTemplateForMode` | `AdSceneTemplate \| null`       | read-write |
| 58  | `planContext`             | `PlanContext \| null`           | read-write |
| 59  | `cpTemplate`              | `CPTemplate \| null`            | read-write |
| 60  | `showCarouselBuilder`     | `boolean`                       | read-write |
| 61  | `carouselTopic`           | `string`                        | read-write |
| 62  | `showBeforeAfterBuilder`  | `boolean`                       | read-write |
| 63  | `beforeAfterTopic`        | `string`                        | read-write |
| 64  | `showTextOnlyMode`        | `boolean`                       | read-write |
| 65  | `textOnlyTopic`           | `string`                        | read-write |

**From useStudioHistory:**

| #   | Field              | Type      | Access     |
| --- | ------------------ | --------- | ---------- |
| 66  | `historyPanelOpen` | `boolean` | read-write |

**Refs:**

| #   | Field               | Type        |
| --- | ------------------- | ----------- |
| 67  | `generateButtonRef` | `RefObject` |
| 68  | `heroRef`           | `RefObject` |
| 69  | `zoomContainerRef`  | `RefObject` |

**Handlers (20+):**

| Handler                          | Purpose                        |
| -------------------------------- | ------------------------------ |
| `toggleProductSelection`         | Add/remove product             |
| `toggleSection`                  | Collapse/expand section        |
| `navigateToSection`              | Scroll to section              |
| `handleGenerate`                 | Trigger image generation       |
| `handleGenerateVideo`            | Trigger video generation       |
| `handleCancelGeneration`         | Cancel in-progress generation  |
| `handleDownload`                 | Download generated image       |
| `handleDownloadWithFeedback`     | Download with toast feedback   |
| `handleReset`                    | Reset to idle state            |
| `handleApplyEdit`                | Apply edit prompt refinement   |
| `handleCanvasEditComplete`       | Finish canvas editor           |
| `handleSelectSuggestion`         | Select an IdeaBank suggestion  |
| `handlePromptChange`             | Update prompt text             |
| `handleGenerateCopy`             | Generate ad copy               |
| `handleLoadFromHistory`          | Load a previous generation     |
| `handleHistoryToggle`            | Toggle history panel           |
| `handleAskAI`                    | Send AI question               |
| `handleSelectPerformingTemplate` | Select performing template     |
| `handleCopyText`                 | Copy text to clipboard         |
| `selectGeneration`               | Select generation from history |
| `haptic`                         | Trigger haptic feedback        |

---

### 3. useStudioState (wrapper)

- **File:** `client/src/hooks/useStudioState.ts`
- **Pattern:** Convenience wrapper around `useStudioContext()`
- **Wraps:** `StudioContext` (calls `useStudioContext()` internally)
- **Adds:** Derived state + memoized action dispatchers

#### Derived State

| Field              | Derivation                                              |
| ------------------ | ------------------------------------------------------- |
| `hasProducts`      | `selectedProducts.length > 0`                           |
| `hasUploads`       | `tempUploads.length > 0`                                |
| `hasImages`        | `hasProducts \|\| hasUploads`                           |
| `hasPrompt`        | `prompt.trim().length > 0`                              |
| `canGenerate`      | `hasImages && hasPrompt`                                |
| `isGenerating`     | `generationState === 'generating'`                      |
| `hasResult`        | `generationState === 'result'`                          |
| `isIdle`           | `generationState === 'idle'`                            |
| `confirmedUploads` | `tempUploads.filter(u => u.status === 'confirmed')`     |
| `allImageUrls`     | product cloudinary URLs + confirmed upload preview URLs |

#### Action Dispatchers

Wraps each `StudioAction` in a `useCallback`:

| Dispatcher           | Dispatches                          |
| -------------------- | ----------------------------------- |
| `setGenerating`      | `SET_GENERATION_STATE` (generating) |
| `setResult`          | `SET_GENERATED_IMAGE`               |
| `clearGeneration`    | `CLEAR_GENERATION`                  |
| `selectProduct`      | `SELECT_PRODUCT`                    |
| `deselectProduct`    | `DESELECT_PRODUCT`                  |
| `clearProducts`      | `CLEAR_PRODUCTS`                    |
| `setProducts`        | `SET_PRODUCTS`                      |
| `selectTemplate`     | `SELECT_TEMPLATE`                   |
| `clearTemplate`      | `CLEAR_TEMPLATE`                    |
| `setUploads`         | `SET_UPLOADS`                       |
| `addUpload`          | `ADD_UPLOAD`                        |
| `updateUpload`       | `UPDATE_UPLOAD`                     |
| `removeUpload`       | `REMOVE_UPLOAD`                     |
| `clearUploads`       | `CLEAR_UPLOADS`                     |
| `setPrompt`          | `SET_PROMPT`                        |
| `setSuggestion`      | `SET_SUGGESTION`                    |
| `setPlatform`        | `SET_PLATFORM`                      |
| `setAspectRatio`     | `SET_ASPECT_RATIO`                  |
| `setResolution`      | `SET_RESOLUTION`                    |
| `setIdeaBankMode`    | `SET_IDEABANK_MODE`                 |
| `setGenerationMode`  | `SET_GENERATION_MODE`               |
| `setTemplateForMode` | `SET_TEMPLATE_FOR_MODE`             |
| `setRecipe`          | `SET_RECIPE`                        |
| `setGeneratedCopy`   | `SET_GENERATED_COPY`                |
| `reset`              | `RESET`                             |
| `loadFromHistory`    | `LOAD_FROM_HISTORY`                 |

#### Consumers

| Component                                 | Fields Used                                                                                                                                                                                         | Access     |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `SmartCanvas/SmartCanvas.tsx`             | `hasResult`                                                                                                                                                                                         | read       |
| `SmartCanvas/sections/PromptEditor.tsx`   | `state.{prompt, selectedSuggestion, selectedProducts, tempUploads, ideaBankMode}`, `setPrompt`, `setSuggestion`, `setRecipe`                                                                        | read-write |
| `SmartCanvas/sections/OutputSettings.tsx` | `state.{platform, aspectRatio, resolution}`, `setPlatform`, `setAspectRatio`, `setResolution`                                                                                                       | read-write |
| `SmartCanvas/sections/GenerateButton.tsx` | `state.{selectedProducts, tempUploads, prompt, platform, aspectRatio, resolution, generationMode, generationRecipe, selectedTemplate}`, `canGenerate`, `isGenerating`, `setGenerating`, `setResult` | read-write |
| `SmartCanvas/sections/ResultView.tsx`     | `state.{generatedImage, generationId, platform, generatedCopy}`, `clearGeneration`, `setGeneratedCopy`                                                                                              | read-write |
| `AssetDrawer/tabs/TemplatesTab.tsx`       | `state.{selectedTemplate}`, `selectTemplate`, `clearTemplate`                                                                                                                                       | read-write |
| `AssetDrawer/tabs/ProductsTab.tsx`        | `state.{selectedProducts}`, `selectProduct`, `deselectProduct`, `clearProducts`                                                                                                                     | read-write |

---

## Overlap Analysis

### Fields That Exist in Both StudioContext and Orchestrator

| #   | Field                       | StudioContext             | Orchestrator                                        | Synchronized? | Notes                                                            |
| --- | --------------------------- | ------------------------- | --------------------------------------------------- | ------------- | ---------------------------------------------------------------- |
| 1   | `generationState` / `state` | `generationState`         | `state` (via `useStudioGeneration`)                 | **No**        | Context uses `GenerationState`, orchestrator has its own `state` |
| 2   | `generatedImage`            | `generatedImage`          | `generatedImage` (via `useStudioGeneration`)        | **No**        | Both track independently                                         |
| 3   | `generationId`              | `generationId`            | `generationId` (via `useStudioGeneration`)          | **No**        | Both track independently                                         |
| 4   | `selectedProducts`          | `selectedProducts`        | `selectedProducts` (via `useStudioProducts`)        | **No**        | Context uses dispatch, orchestrator uses its own state           |
| 5   | `selectedTemplate`          | `selectedTemplate`        | `selectedTemplate` (via `useStudioProducts`)        | **No**        | Different state stores                                           |
| 6   | `tempUploads`               | `tempUploads`             | `tempUploads` (via `useStudioUI`)                   | **No**        | Context dispatch vs. useState                                    |
| 7   | `prompt`                    | `prompt`                  | `prompt` (local useState)                           | **No**        | Both have their own prompt state                                 |
| 8   | `selectedSuggestion`        | `selectedSuggestion`      | `selectedSuggestion` (via `useStudioDeepLink`)      | **No**        | Different shape possible                                         |
| 9   | `platform`                  | `platform`                | `platform` (local useState)                         | **No**        | Both track independently                                         |
| 10  | `aspectRatio`               | `aspectRatio`             | `aspectRatio` (local useState)                      | **No**        | Both track independently                                         |
| 11  | `resolution`                | `resolution`              | `resolution` (local useState)                       | **No**        | Both track independently                                         |
| 12  | `ideaBankMode`              | `ideaBankMode`            | `ideaBankMode` (via `useStudioDeepLink`)            | **No**        | Both track independently                                         |
| 13  | `generationMode`            | `generationMode`          | `generationMode` (via `useStudioDeepLink`)          | **No**        | Both track independently                                         |
| 14  | `selectedTemplateForMode`   | `selectedTemplateForMode` | `selectedTemplateForMode` (via `useStudioDeepLink`) | **No**        | Both track independently                                         |
| 15  | `generationRecipe`          | `generationRecipe`        | `generationRecipe` (via `useStudioDeepLink`)        | **No**        | Both track independently                                         |
| 16  | `generatedCopy`             | `generatedCopy`           | `generatedCopy` (via `useStudioGeneration`)         | **No**        | Both track independently                                         |

**All 16 context fields overlap with orchestrator fields. None are synchronized.**

### Fields Only in Orchestrator (no Context equivalent)

These 50+ fields exist only in the orchestrator's sub-hooks:

- All `useStudioUI` fields: `collapsedSections`, `currentSection`, `showContextBar`, `showStickyGenerate`, `activeActionButton`, `quickStartMode`, `quickStartPrompt`, `priceEstimate`, `showSaveToCatalog`, `showCanvasEditor`, `mediaMode`, `videoDuration`, `showKeyboardShortcuts`, `imageScale`, `imagePosition`, `canGenerate`, `progressSections`
- All `useStudioGeneration` unique fields: `editPrompt`, `isEditing`, `askAIQuestion`, `askAIResponse`, `isAskingAI`, `isGeneratingCopy`, `generatedImageUrl`, `generatedCopyFull`, `videoJobId`, `generatedMediaType`, `justCopied`, `isDownloading`
- All `useStudioProducts` unique fields: `templateCategory`, `searchQuery`, `categoryFilter`, `showTemplateInspiration`, `selectedPerformingTemplate`, `authUser`, `products`, `templates`, `featuredAdTemplates`, `isLoadingFeatured`, `filteredProducts`, `categories`
- All `useStudioDeepLink` unique fields: `planContext`, `cpTemplate`, `showCarouselBuilder`, `carouselTopic`, `showBeforeAfterBuilder`, `beforeAfterTopic`, `showTextOnlyMode`, `textOnlyTopic`
- All `useStudioHistory` fields: `historyPanelOpen`
- All handlers and refs

---

## Component Consumption Matrix

### Components Using `useStudioOrchestrator` (via `orch` prop)

All of these receive the full `StudioOrchestrator` type as a prop. The orchestrator is called once in `pages/Studio.tsx:146` and passed down.

| Component              | File                                        | Orch Fields Read                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Orch Fields/Handlers Written                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Notes                           |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Studio (page)**      | `pages/Studio.tsx`                          | `state`, `generatedImage`, `generationId`, `selectedProducts`, `selectedTemplate`, `platform`, `showContextBar`, `historyPanelOpen`, `showTemplateInspiration`, `isLoadingFeatured`, `featuredAdTemplates`, `showKeyboardShortcuts`, `shortcuts`, `showSaveToCatalog`, `tempUploads`, `generatedMediaType`                                                                                                                                                          | `handleHistoryToggle`, `handleLoadFromHistory`, `selectGeneration`, `handleSelectPerformingTemplate`, `setShowKeyboardShortcuts`, `setShowSaveToCatalog`, `setShowTemplateInspiration`, `haptic` + passes `orch` to children                                                                                                                                                                                                                                                                               | Calls `useStudioOrchestrator()` |
| **ComposerView**       | `studio/MainCanvas/ComposerView.tsx`        | `ideaBankMode`, `selectedTemplateForMode`, `planContext`, `collapsedSections`, `selectedProducts`, `searchQuery`, `categoryFilter`, `categories`, `filteredProducts`, `selectedSuggestion`, `cpTemplate`, `showCarouselBuilder`, `carouselTopic`, `showBeforeAfterBuilder`, `beforeAfterTopic`, `showTextOnlyMode`, `textOnlyTopic`, `prompt`, `platform`, `aspectRatio`, `resolution`, `priceEstimate`, `canGenerate`, `state`, `tempUploads`, `generateButtonRef` | `setIdeaBankMode`, `setSelectedTemplateForMode`, `toggleSection`, `toggleProductSelection`, `setSelectedProducts`, `setSearchQuery`, `setCategoryFilter`, `setSelectedSuggestion`, `setPrompt`, `handlePromptChange`, `setCarouselTopic`, `setShowCarouselBuilder`, `setBeforeAfterTopic`, `setShowBeforeAfterBuilder`, `setTextOnlyTopic`, `setShowTextOnlyMode`, `clearPlanContext`, `setPlatform`, `setAspectRatio`, `setResolution`, `handleGenerate`, `handleSelectSuggestion`, `setGenerationRecipe` | Heaviest consumer               |
| **ResultViewEnhanced** | `studio/MainCanvas/ResultViewEnhanced.tsx`  | `generatedImage`, `generationId`, `planContext`, `isDownloading`, `generatedMediaType`, `zoomContainerRef`, `imageScale`, `imagePosition`, `showCanvasEditor`, `generatedCopy`, `justCopied`                                                                                                                                                                                                                                                                        | `handleReset`, `handleDownloadWithFeedback`, `haptic`, `setShowCanvasEditor`, `setShowSaveToCatalog`, `setImageScale`, `setImagePosition`, `handleCanvasEditComplete`, `handleCopyText`                                                                                                                                                                                                                                                                                                                    | Result display                  |
| **InspectorPanel**     | `studio/InspectorPanel/InspectorPanel.tsx`  | (none directly)                                                                                                                                                                                                                                                                                                                                                                                                                                                     | (none directly)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Pure pass-through to tabs       |
| **EditTab**            | `studio/InspectorPanel/tabs/EditTab.tsx`    | `generatedImage`, `editPrompt`, `isEditing`                                                                                                                                                                                                                                                                                                                                                                                                                         | `setEditPrompt`, `handleApplyEdit`                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | read-write                      |
| **CopyTab**            | `studio/InspectorPanel/tabs/CopyTab.tsx`    | `generatedImage`, `generatedCopy`, `isGeneratingCopy`, `generationId`, `prompt`                                                                                                                                                                                                                                                                                                                                                                                     | `handleGenerateCopy`, `setGeneratedCopy`                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | read-write                      |
| **AskAITab**           | `studio/InspectorPanel/tabs/AskAITab.tsx`   | `generatedImage`, `askAIQuestion`, `askAIResponse`, `isAskingAI`                                                                                                                                                                                                                                                                                                                                                                                                    | `setAskAIQuestion`, `handleAskAI`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | read-write                      |
| **DetailsTab**         | `studio/InspectorPanel/tabs/DetailsTab.tsx` | `generatedImage`, `prompt`, `platform`, `aspectRatio`, `resolution`, `selectedProducts`, `selectedTemplate`, `generationId`, `generationMode`, `selectedTemplateForMode`, `isDownloading`, `authUser`, `generatedCopy`, `generatedCopyFull`, `isGeneratingCopy`                                                                                                                                                                                                     | `handleDownloadWithFeedback`, `setShowSaveToCatalog`, `setGeneratedCopy`, `handleGenerateCopy`, `handleLoadFromHistory`                                                                                                                                                                                                                                                                                                                                                                                    | Most metadata                   |
| **IdeaBankBar**        | `studio/IdeaBankBar/IdeaBankBar.tsx`        | `selectedProducts`, `tempUploads`, `ideaBankMode`, `selectedTemplate`, `selectedSuggestion`                                                                                                                                                                                                                                                                                                                                                                         | `setGenerationRecipe`, `handleSelectSuggestion`                                                                                                                                                                                                                                                                                                                                                                                                                                                            | read-write                      |
| **AgentChatPanel**     | `studio/AgentChat/AgentChatPanel.tsx`       | `selectedProducts`, `tempUploads`, `products`                                                                                                                                                                                                                                                                                                                                                                                                                       | `setSelectedProducts`, `setPrompt`, `setPlatform`, `setAspectRatio`, `setResolution`, `setGeneratedImage`, `setState`, `setGeneratedCopy`, `setGeneratedCopyFull`, `setTempUploads`                                                                                                                                                                                                                                                                                                                        | read-write (via UI actions)     |
| **AgentModePanel**     | `studio/AgentMode/AgentModePanel.tsx`       | `selectedProducts`, `products`                                                                                                                                                                                                                                                                                                                                                                                                                                      | (none)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | read-only (typed narrowly)      |

### Components Using `useStudioState` (Context-based)

These components consume StudioContext via the `useStudioState` wrapper hook. They do NOT receive orch.

| Component          | File                                             | Fields Read                                                                                                                                                                                                                         | Fields Written                                      | Notes      |
| ------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------- |
| **SmartCanvas**    | `studio/SmartCanvas/SmartCanvas.tsx`             | `hasResult` (derived)                                                                                                                                                                                                               | (none)                                              | read-only  |
| **PromptEditor**   | `studio/SmartCanvas/sections/PromptEditor.tsx`   | `state.prompt`, `state.selectedSuggestion`, `state.selectedProducts`, `state.tempUploads`, `state.ideaBankMode`                                                                                                                     | `setPrompt`, `setSuggestion`, `setRecipe`           | read-write |
| **OutputSettings** | `studio/SmartCanvas/sections/OutputSettings.tsx` | `state.platform`, `state.aspectRatio`, `state.resolution`                                                                                                                                                                           | `setPlatform`, `setAspectRatio`, `setResolution`    | read-write |
| **GenerateButton** | `studio/SmartCanvas/sections/GenerateButton.tsx` | `state.selectedProducts`, `state.tempUploads`, `state.prompt`, `state.platform`, `state.aspectRatio`, `state.resolution`, `state.generationMode`, `state.generationRecipe`, `state.selectedTemplate`, `canGenerate`, `isGenerating` | `setGenerating`, `setResult`                        | read-write |
| **ResultView**     | `studio/SmartCanvas/sections/ResultView.tsx`     | `state.generatedImage`, `state.generationId`, `state.platform`, `state.generatedCopy`                                                                                                                                               | `clearGeneration`, `setGeneratedCopy`               | read-write |
| **TemplatesTab**   | `studio/AssetDrawer/tabs/TemplatesTab.tsx`       | `state.selectedTemplate`                                                                                                                                                                                                            | `selectTemplate`, `clearTemplate`                   | read-write |
| **ProductsTab**    | `studio/AssetDrawer/tabs/ProductsTab.tsx`        | `state.selectedProducts`                                                                                                                                                                                                            | `selectProduct`, `deselectProduct`, `clearProducts` | read-write |

---

## Dual-System Problem

The two systems coexist but are **completely independent**:

1. **Studio.tsx** calls `useStudioOrchestrator()` inside `<StudioProvider>`, so both systems are active simultaneously.
2. **Orchestrator components** (ComposerView, ResultViewEnhanced, InspectorPanel tabs, IdeaBankBar, AgentChatPanel) all receive `orch` as a prop and read/write orchestrator state.
3. **SmartCanvas components** (PromptEditor, OutputSettings, GenerateButton, ResultView, TemplatesTab, ProductsTab) use `useStudioState()` and read/write Context state.
4. **Neither system dispatches to the other.** When the user sets `platform` via ComposerView (orchestrator), the SmartCanvas OutputSettings (context) still shows the old value, and vice versa.

### Why This Hasn't Caused Obvious Bugs (Yet)

- The SmartCanvas component tree and the orchestrator component tree are **not rendered at the same time in the same workspace mode**. Studio.tsx renders either the orchestrator-based `renderStudioCanvas()` or the SmartCanvas tree (via different workspace modes or screen sizes), reducing visible conflicts.
- However, both state systems are initialized on mount, consuming memory and creating confusion for developers.

---

## Recommended Unification Target

### Keep: useStudioOrchestrator (sub-hook composer)

**Rationale:**

1. **Covers more ground.** The orchestrator manages 70+ fields across 6 sub-hooks, while StudioContext covers only 16 fields (all of which the orchestrator also manages).
2. **Already adopted by the primary UI.** The main Studio page, ComposerView, InspectorPanel (4 tabs), IdeaBankBar, AgentChatPanel, and AgentModePanel all use `orch`.
3. **Better scalability.** Sub-hooks (`useStudioProducts`, `useStudioGeneration`, `useStudioUI`, etc.) allow modular growth. Adding a new feature means adding or extending one sub-hook, not inflating a monolithic reducer.
4. **Handles side effects.** The orchestrator sub-hooks already integrate with React Query, localStorage, URL state, and keyboard events. The Context/reducer is pure state with no side effect handling.

### Retire: StudioContext + useStudioState

**Migration plan (S2-11 through S2-13):**

1. **S2-11: Migrate SmartCanvas components** -- Replace all `useStudioState()` calls in `SmartCanvas/`, `AssetDrawer/tabs/` with `orch` prop drilling or a slimmer context that proxies from the orchestrator.
2. **S2-12: Remove StudioContext** -- Delete `contexts/StudioContext.tsx`, `hooks/useStudioState.ts`, and the `<StudioProvider>` wrapper in `Studio.tsx`.
3. **S2-13: Verify** -- Confirm no dead imports, run type checks, run all tests.

### Alternative: If prop drilling is undesirable

Instead of passing `orch` as a prop through every level, create a **new** thin React Context that holds the orchestrator return value:

```tsx
const StudioOrchestratorContext = createContext<StudioOrchestrator | null>(null);

export function StudioOrchestratorProvider({ children }: { children: ReactNode }) {
  const orch = useStudioOrchestrator();
  return <StudioOrchestratorContext.Provider value={orch}>{children}</StudioOrchestratorContext.Provider>;
}

export function useOrch() {
  const ctx = useContext(StudioOrchestratorContext);
  if (!ctx) throw new Error('useOrch must be used within StudioOrchestratorProvider');
  return ctx;
}
```

This preserves the convenience of context-based access (no prop drilling) while ensuring a single source of truth. SmartCanvas components would call `useOrch()` instead of `useStudioState()`.

---

## Summary Statistics

| Metric                                    | Value                       |
| ----------------------------------------- | --------------------------- |
| StudioContext fields                      | 16                          |
| StudioContext actions                     | 24                          |
| Orchestrator returned fields              | 70+                         |
| Orchestrator handlers                     | 20+                         |
| Overlapping fields                        | 16 (100% of Context fields) |
| Synchronized overlaps                     | 0                           |
| Components using orch (prop)              | 10                          |
| Components using useStudioState (context) | 7                           |
| Total unique consumer components          | 17                          |
