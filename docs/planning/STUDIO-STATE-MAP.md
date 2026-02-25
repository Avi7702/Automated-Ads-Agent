# Studio State Consumption Map

> Generated 2026-02-25 for Sprint 2 Task S2-10.
> Purpose: Guide the state unification work in S2-11 through S2-13.

---

## State Sources

### 1. StudioContext (useReducer)

- **File:** `client/src/contexts/StudioContext.tsx`
- **Pattern:** React Context + `useReducer` (single reducer, single dispatch)
- **Provider:** `<StudioProvider>` wraps the entire Studio page (`client/src/pages/Studio.tsx:336-562`)
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
- `StudioProvider` used in `client/src/pages/Studio.tsx:336`

---

### 2. useStudioOrchestrator (useState via sub-hooks)

- **File:** `client/src/hooks/useStudioOrchestrator.ts`
- **Pattern:** Composer hook that combines 6 focused sub-hooks, each using `useState` internally
- **Sub-hooks:**
  - `useStudioProducts` (`client/src/hooks/studio/useStudioProducts.ts`) -- product/template queries & selection
  - `useStudioGeneration` (`client/src/hooks/studio/useStudioGeneration.ts`) -- image/video generation, editing, copy
  - `useStudioUI` (`client/src/hooks/studio/useStudioUI.ts`) -- collapsed sections, scroll, zoom, dialogs
  - `useStudioHistory` (`client/src/hooks/studio/useStudioHistory.ts`) -- history panel & URL state
  - `useStudioDeepLink` (`client/src/hooks/studio/useStudioDeepLink.ts`) -- query-param deep linking, plan context
  - `useStudioKeyboard` (`client/src/hooks/studio/useStudioKeyboard.ts`) -- keyboard shortcuts
- **Called in:** `client/src/pages/Studio.tsx:146` as `const orch = useStudioOrchestrator()`
- **Return type:** `StudioOrchestrator` (exported as `ReturnType<typeof useStudioOrchestrator>`)

#### Returned Surface (138 fields total)

The return block (`useStudioOrchestrator.ts:217-368`) exposes 138 named fields broken down as:

| Category        | Count | Description                                                    |
| --------------- | ----- | -------------------------------------------------------------- |
| State / data    | 67    | Read-only or read-write observable state                       |
| Setters         | 46    | State-update functions (`set*`)                                |
| Handlers        | 16    | Action functions (`handle*`)                                   |
| Other functions | 6     | `toggle*`, `navigate*`, `clear*`, `haptic`, `selectGeneration` |
| Refs            | 3     | `generateButtonRef`, `heroRef`, `zoomContainerRef`             |

**State / data fields (67):**

| #   | Field                        | Type                            | Source              |
| --- | ---------------------------- | ------------------------------- | ------------------- |
| 1   | `state`                      | `GenerationState`               | useStudioGeneration |
| 2   | `generatedImage`             | `string \| null`                | useStudioGeneration |
| 3   | `generationId`               | `string \| null`                | useStudioGeneration |
| 4   | `selectedProducts`           | `Product[]`                     | useStudioProducts   |
| 5   | `selectedTemplate`           | `AdSceneTemplate \| null`       | useStudioProducts   |
| 6   | `templateCategory`           | `string`                        | useStudioProducts   |
| 7   | `prompt`                     | `string`                        | local useState      |
| 8   | `platform`                   | `string`                        | local useState      |
| 9   | `aspectRatio`                | `string`                        | local useState      |
| 10  | `resolution`                 | `'1K' \| '2K' \| '4K'`          | local useState      |
| 11  | `collapsedSections`          | `Record<string, boolean>`       | useStudioUI         |
| 12  | `currentSection`             | `string`                        | useStudioUI         |
| 13  | `showContextBar`             | `boolean`                       | useStudioUI         |
| 14  | `showStickyGenerate`         | `boolean`                       | useStudioUI         |
| 15  | `searchQuery`                | `string`                        | useStudioProducts   |
| 16  | `categoryFilter`             | `string`                        | useStudioProducts   |
| 17  | `activeActionButton`         | `string \| null`                | useStudioUI         |
| 18  | `quickStartMode`             | `boolean`                       | useStudioUI         |
| 19  | `quickStartPrompt`           | `string`                        | useStudioUI         |
| 20  | `tempUploads`                | `AnalyzedUpload[]`              | useStudioUI         |
| 21  | `priceEstimate`              | `PriceEstimate \| null`         | useStudioUI         |
| 22  | `editPrompt`                 | `string`                        | useStudioGeneration |
| 23  | `isEditing`                  | `boolean`                       | useStudioGeneration |
| 24  | `askAIQuestion`              | `string`                        | useStudioGeneration |
| 25  | `askAIResponse`              | `string`                        | useStudioGeneration |
| 26  | `isAskingAI`                 | `boolean`                       | useStudioGeneration |
| 27  | `generatedCopy`              | `string`                        | useStudioGeneration |
| 28  | `isGeneratingCopy`           | `boolean`                       | useStudioGeneration |
| 29  | `generatedImageUrl`          | `string`                        | useStudioGeneration |
| 30  | `generatedCopyFull`          | `CopyResult \| null`            | useStudioGeneration |
| 31  | `showSaveToCatalog`          | `boolean`                       | useStudioUI         |
| 32  | `showTemplateInspiration`    | `boolean`                       | useStudioProducts   |
| 33  | `selectedPerformingTemplate` | `PerformingAdTemplate \| null`  | useStudioProducts   |
| 34  | `selectedSuggestion`         | `SelectedSuggestion \| null`    | useStudioDeepLink   |
| 35  | `generationRecipe`           | `GenerationRecipe \| undefined` | useStudioDeepLink   |
| 36  | `ideaBankMode`               | `IdeaBankMode`                  | useStudioDeepLink   |
| 37  | `generationMode`             | `GenerationMode`                | useStudioDeepLink   |
| 38  | `selectedTemplateForMode`    | `AdSceneTemplate \| null`       | useStudioDeepLink   |
| 39  | `planContext`                | `PlanContext \| null`           | useStudioDeepLink   |
| 40  | `cpTemplate`                 | `CPTemplate \| null`            | useStudioDeepLink   |
| 41  | `showCarouselBuilder`        | `boolean`                       | useStudioDeepLink   |
| 42  | `carouselTopic`              | `string`                        | useStudioDeepLink   |
| 43  | `showBeforeAfterBuilder`     | `boolean`                       | useStudioDeepLink   |
| 44  | `beforeAfterTopic`           | `string`                        | useStudioDeepLink   |
| 45  | `showTextOnlyMode`           | `boolean`                       | useStudioDeepLink   |
| 46  | `textOnlyTopic`              | `string`                        | useStudioDeepLink   |
| 47  | `showCanvasEditor`           | `boolean`                       | useStudioUI         |
| 48  | `mediaMode`                  | `'image' \| 'video'`            | useStudioUI         |
| 49  | `videoDuration`              | `number`                        | useStudioUI         |
| 50  | `videoJobId`                 | `string \| null`                | useStudioGeneration |
| 51  | `generatedMediaType`         | `'image' \| 'video'`            | useStudioGeneration |
| 52  | `historyPanelOpen`           | `boolean`                       | useStudioHistory    |
| 53  | `justCopied`                 | `boolean`                       | useStudioGeneration |
| 54  | `isDownloading`              | `boolean`                       | useStudioGeneration |
| 55  | `showKeyboardShortcuts`      | `boolean`                       | useStudioUI         |
| 56  | `imageScale`                 | `number`                        | useStudioUI         |
| 57  | `imagePosition`              | `{ x: number, y: number }`      | useStudioUI         |
| 58  | `canGenerate`                | `boolean`                       | useStudioUI         |
| 59  | `shortcuts`                  | `ShortcutConfig[]`              | useStudioKeyboard   |
| 60  | `authUser`                   | user object                     | useStudioProducts   |
| 61  | `products`                   | `Product[]`                     | useStudioProducts   |
| 62  | `templates`                  | `AdSceneTemplate[]`             | useStudioProducts   |
| 63  | `featuredAdTemplates`        | `PerformingAdTemplate[]`        | useStudioProducts   |
| 64  | `isLoadingFeatured`          | `boolean`                       | useStudioProducts   |
| 65  | `filteredProducts`           | `Product[]`                     | useStudioProducts   |
| 66  | `categories`                 | `string[]`                      | useStudioProducts   |
| 67  | `progressSections`           | computed                        | useStudioUI         |

**Setters (46):**

`setState`, `setGeneratedImage`, `setGenerationId`, `setSelectedProducts`, `setSelectedTemplate`, `setTemplateCategory`, `setPrompt`, `setPlatform`, `setAspectRatio`, `setResolution`, `setSearchQuery`, `setCategoryFilter`, `setActiveActionButton`, `setQuickStartMode`, `setQuickStartPrompt`, `setTempUploads`, `setEditPrompt`, `setAskAIQuestion`, `setGeneratedCopy`, `setIsGeneratingCopy`, `setGeneratedCopyFull`, `setShowSaveToCatalog`, `setShowTemplateInspiration`, `setSelectedPerformingTemplate`, `setSelectedSuggestion`, `setGenerationRecipe`, `setIdeaBankMode`, `setGenerationMode`, `setSelectedTemplateForMode`, `setPlanContext`, `setCpTemplate`, `setShowCarouselBuilder`, `setCarouselTopic`, `setShowBeforeAfterBuilder`, `setBeforeAfterTopic`, `setShowTextOnlyMode`, `setTextOnlyTopic`, `setShowCanvasEditor`, `setMediaMode`, `setVideoDuration`, `setVideoJobId`, `setGeneratedMediaType`, `setHistoryPanelOpen`, `setShowKeyboardShortcuts`, `setImageScale`, `setImagePosition`

**Handlers (16):**

`handleGenerate`, `handleGenerateVideo`, `handleCancelGeneration`, `handleDownload`, `handleDownloadWithFeedback`, `handleReset`, `handleApplyEdit`, `handleCanvasEditComplete`, `handleSelectSuggestion`, `handlePromptChange`, `handleGenerateCopy`, `handleLoadFromHistory`, `handleHistoryToggle`, `handleAskAI`, `handleSelectPerformingTemplate`, `handleCopyText`

**Other functions (6):**

`toggleProductSelection`, `toggleSection`, `navigateToSection`, `clearPlanContext`, `selectGeneration`, `haptic`

**Refs (3):**

`generateButtonRef`, `heroRef`, `zoomContainerRef`

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

| Component          | File                                                                   | Fields Used                                                                                                                                                                                                                         | Access     |
| ------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **SmartCanvas**    | `client/src/components/studio/SmartCanvas/SmartCanvas.tsx`             | `hasResult` (derived)                                                                                                                                                                                                               | read-only  |
| **PromptEditor**   | `client/src/components/studio/SmartCanvas/sections/PromptEditor.tsx`   | `state.prompt`, `state.selectedSuggestion`, `state.selectedProducts`, `state.tempUploads`, `state.ideaBankMode`                                                                                                                     | read-write |
| **OutputSettings** | `client/src/components/studio/SmartCanvas/sections/OutputSettings.tsx` | `state.platform`, `state.aspectRatio`, `state.resolution`                                                                                                                                                                           | read-write |
| **GenerateButton** | `client/src/components/studio/SmartCanvas/sections/GenerateButton.tsx` | `state.selectedProducts`, `state.tempUploads`, `state.prompt`, `state.platform`, `state.aspectRatio`, `state.resolution`, `state.generationMode`, `state.generationRecipe`, `state.selectedTemplate`, `canGenerate`, `isGenerating` | read-write |
| **ResultView**     | `client/src/components/studio/SmartCanvas/sections/ResultView.tsx`     | `state.generatedImage`, `state.generationId`, `state.platform`, `state.generatedCopy`                                                                                                                                               | read-write |
| **TemplatesTab**   | `client/src/components/studio/AssetDrawer/tabs/TemplatesTab.tsx`       | `state.selectedTemplate`                                                                                                                                                                                                            | read-write |
| **ProductsTab**    | `client/src/components/studio/AssetDrawer/tabs/ProductsTab.tsx`        | `state.selectedProducts`                                                                                                                                                                                                            | read-write |

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

These 51 state/data fields exist only in the orchestrator's sub-hooks:

- **useStudioUI:** `collapsedSections`, `currentSection`, `showContextBar`, `showStickyGenerate`, `activeActionButton`, `quickStartMode`, `quickStartPrompt`, `priceEstimate`, `showSaveToCatalog`, `showCanvasEditor`, `mediaMode`, `videoDuration`, `showKeyboardShortcuts`, `imageScale`, `imagePosition`, `canGenerate`, `progressSections`
- **useStudioGeneration:** `editPrompt`, `isEditing`, `askAIQuestion`, `askAIResponse`, `isAskingAI`, `isGeneratingCopy`, `generatedImageUrl`, `generatedCopyFull`, `videoJobId`, `generatedMediaType`, `justCopied`, `isDownloading`
- **useStudioProducts:** `templateCategory`, `searchQuery`, `categoryFilter`, `showTemplateInspiration`, `selectedPerformingTemplate`, `authUser`, `products`, `templates`, `featuredAdTemplates`, `isLoadingFeatured`, `filteredProducts`, `categories`
- **useStudioDeepLink:** `planContext`, `cpTemplate`, `showCarouselBuilder`, `carouselTopic`, `showBeforeAfterBuilder`, `beforeAfterTopic`, `showTextOnlyMode`, `textOnlyTopic`
- **useStudioHistory:** `historyPanelOpen`
- **useStudioKeyboard:** `shortcuts`
- All 46 setters, 16 handlers, 6 utility functions, and 3 refs

---

## Component Consumption Matrix

### Components Using `useStudioOrchestrator` (via `orch` prop) -- 11 components

All of these receive the full `StudioOrchestrator` type as a prop (or call the hook directly in the case of Studio). The orchestrator is called once in `client/src/pages/Studio.tsx:146` and passed down.

| #   | Component              | File                                                              | State Source       | Orch Fields Read                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Orch Handlers/Setters Used                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Notes                                                                                                                                   |
| --- | ---------------------- | ----------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Studio (page)**      | `client/src/pages/Studio.tsx`                                     | orch (direct call) | `state`, `generatedImage`, `selectedProducts`, `selectedTemplate`, `platform`, `showContextBar`, `historyPanelOpen`, `showTemplateInspiration`, `isLoadingFeatured`, `featuredAdTemplates`, `showKeyboardShortcuts`, `shortcuts`, `showSaveToCatalog`, `generatedMediaType`, `heroRef`                                                                                                                                                                              | `handleHistoryToggle`, `handleLoadFromHistory`, `selectGeneration`, `handleSelectPerformingTemplate`, `handleCancelGeneration`, `setShowKeyboardShortcuts`, `setShowSaveToCatalog`, `setShowTemplateInspiration`, `haptic` + passes `orch` to children                                                                                                                                                                                                                                                     | Calls `useStudioOrchestrator()`; `generationId` and `tempUploads` are NOT read here — consumed transitively by children via `orch` prop |
| 2   | **ComposerView**       | `client/src/components/studio/MainCanvas/ComposerView.tsx`        | orch prop          | `ideaBankMode`, `selectedTemplateForMode`, `planContext`, `collapsedSections`, `selectedProducts`, `searchQuery`, `categoryFilter`, `categories`, `filteredProducts`, `selectedSuggestion`, `cpTemplate`, `showCarouselBuilder`, `carouselTopic`, `showBeforeAfterBuilder`, `beforeAfterTopic`, `showTextOnlyMode`, `textOnlyTopic`, `prompt`, `platform`, `aspectRatio`, `resolution`, `priceEstimate`, `canGenerate`, `state`, `tempUploads`, `generateButtonRef` | `setIdeaBankMode`, `setSelectedTemplateForMode`, `toggleSection`, `toggleProductSelection`, `setSelectedProducts`, `setSearchQuery`, `setCategoryFilter`, `setSelectedSuggestion`, `setPrompt`, `handlePromptChange`, `setCarouselTopic`, `setShowCarouselBuilder`, `setBeforeAfterTopic`, `setShowBeforeAfterBuilder`, `setTextOnlyTopic`, `setShowTextOnlyMode`, `clearPlanContext`, `setPlatform`, `setAspectRatio`, `setResolution`, `handleGenerate`, `handleSelectSuggestion`, `setGenerationRecipe` | Heaviest consumer                                                                                                                       |
| 3   | **ResultViewEnhanced** | `client/src/components/studio/MainCanvas/ResultViewEnhanced.tsx`  | orch prop          | `generatedImage`, `generationId`, `planContext`, `isDownloading`, `generatedMediaType`, `zoomContainerRef`, `imageScale`, `imagePosition`, `showCanvasEditor`, `generatedCopy`, `justCopied`                                                                                                                                                                                                                                                                        | `handleReset`, `handleDownloadWithFeedback`, `haptic`, `setShowCanvasEditor`, `setShowSaveToCatalog`, `setImageScale`, `setImagePosition`, `handleCanvasEditComplete`, `handleCopyText`                                                                                                                                                                                                                                                                                                                    | Result display                                                                                                                          |
| 4   | **InspectorPanel**     | `client/src/components/studio/InspectorPanel/InspectorPanel.tsx`  | orch prop          | (none directly)                                                                                                                                                                                                                                                                                                                                                                                                                                                     | (none directly)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Pure pass-through to tabs                                                                                                               |
| 5   | **EditTab**            | `client/src/components/studio/InspectorPanel/tabs/EditTab.tsx`    | orch prop          | `generatedImage`, `editPrompt`, `isEditing`                                                                                                                                                                                                                                                                                                                                                                                                                         | `setEditPrompt`, `handleApplyEdit`                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | read-write                                                                                                                              |
| 6   | **CopyTab**            | `client/src/components/studio/InspectorPanel/tabs/CopyTab.tsx`    | orch prop          | `generatedImage`, `generatedCopy`, `isGeneratingCopy`, `generationId`, `prompt`                                                                                                                                                                                                                                                                                                                                                                                     | `handleGenerateCopy`, `setGeneratedCopy`                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | read-write                                                                                                                              |
| 7   | **AskAITab**           | `client/src/components/studio/InspectorPanel/tabs/AskAITab.tsx`   | orch prop          | `generatedImage`, `askAIQuestion`, `askAIResponse`, `isAskingAI`                                                                                                                                                                                                                                                                                                                                                                                                    | `setAskAIQuestion`, `handleAskAI`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | read-write                                                                                                                              |
| 8   | **DetailsTab**         | `client/src/components/studio/InspectorPanel/tabs/DetailsTab.tsx` | orch prop          | `generatedImage`, `prompt`, `platform`, `aspectRatio`, `resolution`, `selectedProducts`, `selectedTemplate`, `generationId`, `generationMode`, `selectedTemplateForMode`, `isDownloading`, `authUser`, `generatedCopy`, `generatedCopyFull`, `isGeneratingCopy`                                                                                                                                                                                                     | `handleDownloadWithFeedback`, `setShowSaveToCatalog`, `setGeneratedCopy`, `handleGenerateCopy`, `handleLoadFromHistory`                                                                                                                                                                                                                                                                                                                                                                                    | Most metadata                                                                                                                           |
| 9   | **IdeaBankBar**        | `client/src/components/studio/IdeaBankBar/IdeaBankBar.tsx`        | orch prop          | `selectedProducts`, `tempUploads`, `ideaBankMode`, `selectedTemplate`, `selectedSuggestion`                                                                                                                                                                                                                                                                                                                                                                         | `setGenerationRecipe`, `handleSelectSuggestion`                                                                                                                                                                                                                                                                                                                                                                                                                                                            | read-write                                                                                                                              |
| 10  | **AgentChatPanel**     | `client/src/components/studio/AgentChat/AgentChatPanel.tsx`       | orch prop          | `selectedProducts`, `tempUploads`, `products`                                                                                                                                                                                                                                                                                                                                                                                                                       | `setSelectedProducts`, `setPrompt`, `setPlatform`, `setAspectRatio`, `setResolution`, `setGeneratedImage`, `setState`, `setGeneratedCopy`, `setGeneratedCopyFull`, `setTempUploads`                                                                                                                                                                                                                                                                                                                        | read-write (via UI actions)                                                                                                             |
| 11  | **AgentModePanel**     | `client/src/components/studio/AgentMode/AgentModePanel.tsx`       | orch prop          | `selectedProducts`, `products`                                                                                                                                                                                                                                                                                                                                                                                                                                      | (none)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | read-only (typed narrowly)                                                                                                              |

### Components Using `useStudioState` (Context-based) -- 7 components

These components consume StudioContext via the `useStudioState` wrapper hook. They do NOT receive orch.

| #   | Component          | File                                                                   | State Source   | Fields Read                                                                                                                                                                                                                         | Fields Written                                      | Notes      |
| --- | ------------------ | ---------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------- |
| 1   | **SmartCanvas**    | `client/src/components/studio/SmartCanvas/SmartCanvas.tsx`             | useStudioState | `hasResult` (derived)                                                                                                                                                                                                               | (none)                                              | read-only  |
| 2   | **PromptEditor**   | `client/src/components/studio/SmartCanvas/sections/PromptEditor.tsx`   | useStudioState | `state.prompt`, `state.selectedSuggestion`, `state.selectedProducts`, `state.tempUploads`, `state.ideaBankMode`                                                                                                                     | `setPrompt`, `setSuggestion`, `setRecipe`           | read-write |
| 3   | **OutputSettings** | `client/src/components/studio/SmartCanvas/sections/OutputSettings.tsx` | useStudioState | `state.platform`, `state.aspectRatio`, `state.resolution`                                                                                                                                                                           | `setPlatform`, `setAspectRatio`, `setResolution`    | read-write |
| 4   | **GenerateButton** | `client/src/components/studio/SmartCanvas/sections/GenerateButton.tsx` | useStudioState | `state.selectedProducts`, `state.tempUploads`, `state.prompt`, `state.platform`, `state.aspectRatio`, `state.resolution`, `state.generationMode`, `state.generationRecipe`, `state.selectedTemplate`, `canGenerate`, `isGenerating` | `setGenerating`, `setResult`                        | read-write |
| 5   | **ResultView**     | `client/src/components/studio/SmartCanvas/sections/ResultView.tsx`     | useStudioState | `state.generatedImage`, `state.generationId`, `state.platform`, `state.generatedCopy`                                                                                                                                               | `clearGeneration`, `setGeneratedCopy`               | read-write |
| 6   | **TemplatesTab**   | `client/src/components/studio/AssetDrawer/tabs/TemplatesTab.tsx`       | useStudioState | `state.selectedTemplate`                                                                                                                                                                                                            | `selectTemplate`, `clearTemplate`                   | read-write |
| 7   | **ProductsTab**    | `client/src/components/studio/AssetDrawer/tabs/ProductsTab.tsx`        | useStudioState | `state.selectedProducts`                                                                                                                                                                                                            | `selectProduct`, `deselectProduct`, `clearProducts` | read-write |

### Components Using Props Only -- 9 components

These components receive all data through props from their parent. They do not access orch or StudioContext.

| #   | Component                  | File                                                             | Parent Component | Props Received                                                                             | Notes                                                      |
| --- | -------------------------- | ---------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 1   | **ChatMessage**            | `client/src/components/studio/AgentChat/ChatMessage.tsx`         | AgentChatPanel   | `message: ChatMessageType`                                                                 | Pure presentational                                        |
| 2   | **ClarifyingQuestions**    | `client/src/components/studio/AgentMode/ClarifyingQuestions.tsx` | AgentModePanel   | `questions`, `answers`, `onAnswer`, `onBack`, `onContinue`, `isLoading`, `suggestionTitle` | Pure presentational with callbacks                         |
| 3   | **ExecutionView**          | `client/src/components/studio/AgentMode/ExecutionView.tsx`       | AgentModePanel   | `steps`, `isComplete`, `onRetry`, `onDone`                                                 | Pure presentational with callbacks                         |
| 4   | **SuggestionCards**        | `client/src/components/studio/AgentMode/SuggestionCards.tsx`     | AgentModePanel   | `suggestions`, `isLoading`, `onSelect`, `hasProducts`                                      | Pure presentational                                        |
| 5   | **CollaborationPresence**  | `client/src/components/studio/CollaborationPresence.tsx`         | Studio (page)    | `isConnected`, `onlineUsers`, `typingUsers`, `remoteGenerations`                           | Pure presentational; renders collaboration avatars         |
| 6   | **SuggestionChip**         | `client/src/components/studio/IdeaBankBar/SuggestionChip.tsx`    | IdeaBankBar      | `id`, `summary`, `prompt`, `confidence`, `mode`, `reasoning`, `isSelected`, `onUse`        | Memo-wrapped presentational chip                           |
| 7   | **GeneratingView**         | `client/src/components/studio/MainCanvas/GeneratingView.tsx`     | Studio (page)    | `onCancel`, `mediaType`                                                                    | Animated loading display                                   |
| 8   | **ContextBar**             | `client/src/pages/Studio.tsx` (inline)                           | Studio (page)    | `selectedProducts`, `selectedTemplate`, `platform`, `visible`                              | Inline component; receives orch fields as individual props |
| 9   | **KeyboardShortcutsPanel** | `client/src/pages/Studio.tsx` (inline)                           | Studio (page)    | `visible`, `shortcuts`, `onClose`, `onToggle`, `haptic`                                    | Inline component; receives orch fields as individual props |

### Components Using Local State + React Query (self-contained) -- 7 components

These components manage their own internal state via `useState` and/or `useQuery`. They do not consume orch or StudioContext.

| #   | Component          | File                                                               | Local State                                                                                                                         | External Data Source                                           | Notes                                                          |
| --- | ------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | **PlanBriefCard**  | `client/src/components/studio/AgentMode/PlanBriefCard.tsx`         | `isEditing`, `feedback` (both useState)                                                                                             | Props from AgentModePanel                                      | Props + local state for edit-feedback UX                       |
| 2   | **AssetDrawer**    | `client/src/components/studio/AssetDrawer/AssetDrawer.tsx`         | `activeTab` (useState)                                                                                                              | Props: `isOpen`, `onToggle`                                    | Tab state is local; children use useStudioState                |
| 3   | **BrandAssetsTab** | `client/src/components/studio/AssetDrawer/tabs/BrandAssetsTab.tsx` | `selectedImages` (useState)                                                                                                         | `useQuery(['brandImages'])`                                    | Fully self-contained; fetches own data                         |
| 4   | **PatternsTab**    | `client/src/components/studio/AssetDrawer/tabs/PatternsTab.tsx`    | `selectedPattern` (useState)                                                                                                        | `useQuery(['learnedPatterns'])`                                | Fully self-contained; fetches own data                         |
| 5   | **ScenariosTab**   | `client/src/components/studio/AssetDrawer/tabs/ScenariosTab.tsx`   | `selectedScenario` (useState)                                                                                                       | `useQuery(['installationScenarios'])`                          | Fully self-contained; fetches own data                         |
| 6   | **HistoryPanel**   | `client/src/components/studio/HistoryPanel/HistoryPanel.tsx`       | `activeTab` (useState)                                                                                                              | `useQuery(['generations'])`, `useHistoryPanelUrl`              | Props for open/toggle; own data fetching + URL state           |
| 7   | **CanvasEditor**   | `client/src/components/studio/CanvasEditor/CanvasEditor.tsx`       | `activeTool`, `editInstruction`, `isEditing`, `sam2Status`, `clickPoints`, `currentMask`, `brushSize`, `imgSize`, `history`, + refs | Props: `imageUrl`, `generationId`, `onEditComplete`, `onClose` | Extensive local state for canvas editing; fully self-contained |

### Components Using Local State + External Hooks (self-contained) -- 1 component

| #   | Component                  | File                                                      | Local State                                                  | External Hooks                                                             | Notes                                                  |
| --- | -------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | **StyleReferenceSelector** | `client/src/components/studio/StyleReferenceSelector.tsx` | `showUpload`, `uploadName`, `uploadCategory`, `selectedFile` | `useStyleReferences`, `useUploadStyleReference`, `useDeleteStyleReference` | Props for selection state; own upload/delete mutations |

---

## Summary: All Studio Components (35 total)

| #   | Component              | File Path                                                              | State Source Taxonomy                              |
| --- | ---------------------- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | Studio (page)          | `client/src/pages/Studio.tsx`                                          | orch (direct call) + local useState                |
| 2   | ContextBar             | `client/src/pages/Studio.tsx` (inline)                                 | props-only (from orch fields)                      |
| 3   | KeyboardShortcutsPanel | `client/src/pages/Studio.tsx` (inline)                                 | props-only (from orch fields)                      |
| 4   | ComposerView           | `client/src/components/studio/MainCanvas/ComposerView.tsx`             | orch prop                                          |
| 5   | ResultViewEnhanced     | `client/src/components/studio/MainCanvas/ResultViewEnhanced.tsx`       | orch prop                                          |
| 6   | GeneratingView         | `client/src/components/studio/MainCanvas/GeneratingView.tsx`           | props-only                                         |
| 7   | InspectorPanel         | `client/src/components/studio/InspectorPanel/InspectorPanel.tsx`       | orch prop (pass-through)                           |
| 8   | EditTab                | `client/src/components/studio/InspectorPanel/tabs/EditTab.tsx`         | orch prop                                          |
| 9   | CopyTab                | `client/src/components/studio/InspectorPanel/tabs/CopyTab.tsx`         | orch prop                                          |
| 10  | AskAITab               | `client/src/components/studio/InspectorPanel/tabs/AskAITab.tsx`        | orch prop                                          |
| 11  | DetailsTab             | `client/src/components/studio/InspectorPanel/tabs/DetailsTab.tsx`      | orch prop                                          |
| 12  | IdeaBankBar            | `client/src/components/studio/IdeaBankBar/IdeaBankBar.tsx`             | orch prop                                          |
| 13  | SuggestionChip         | `client/src/components/studio/IdeaBankBar/SuggestionChip.tsx`          | props-only                                         |
| 14  | AgentChatPanel         | `client/src/components/studio/AgentChat/AgentChatPanel.tsx`            | orch prop                                          |
| 15  | ChatMessage            | `client/src/components/studio/AgentChat/ChatMessage.tsx`               | props-only                                         |
| 16  | AgentModePanel         | `client/src/components/studio/AgentMode/AgentModePanel.tsx`            | orch prop                                          |
| 17  | ClarifyingQuestions    | `client/src/components/studio/AgentMode/ClarifyingQuestions.tsx`       | props-only                                         |
| 18  | ExecutionView          | `client/src/components/studio/AgentMode/ExecutionView.tsx`             | props-only                                         |
| 19  | PlanBriefCard          | `client/src/components/studio/AgentMode/PlanBriefCard.tsx`             | props-only + local useState                        |
| 20  | SuggestionCards        | `client/src/components/studio/AgentMode/SuggestionCards.tsx`           | props-only                                         |
| 21  | AssetDrawer            | `client/src/components/studio/AssetDrawer/AssetDrawer.tsx`             | props-only + local useState                        |
| 22  | ProductsTab            | `client/src/components/studio/AssetDrawer/tabs/ProductsTab.tsx`        | useStudioState (context)                           |
| 23  | TemplatesTab           | `client/src/components/studio/AssetDrawer/tabs/TemplatesTab.tsx`       | useStudioState (context)                           |
| 24  | BrandAssetsTab         | `client/src/components/studio/AssetDrawer/tabs/BrandAssetsTab.tsx`     | local useState + useQuery                          |
| 25  | PatternsTab            | `client/src/components/studio/AssetDrawer/tabs/PatternsTab.tsx`        | local useState + useQuery                          |
| 26  | ScenariosTab           | `client/src/components/studio/AssetDrawer/tabs/ScenariosTab.tsx`       | local useState + useQuery                          |
| 27  | CanvasEditor           | `client/src/components/studio/CanvasEditor/CanvasEditor.tsx`           | props-only + extensive local useState              |
| 28  | CollaborationPresence  | `client/src/components/studio/CollaborationPresence.tsx`               | props-only                                         |
| 29  | HistoryPanel           | `client/src/components/studio/HistoryPanel/HistoryPanel.tsx`           | props-only + local useState + useQuery + URL state |
| 30  | SmartCanvas            | `client/src/components/studio/SmartCanvas/SmartCanvas.tsx`             | useStudioState (context)                           |
| 31  | PromptEditor           | `client/src/components/studio/SmartCanvas/sections/PromptEditor.tsx`   | useStudioState (context)                           |
| 32  | OutputSettings         | `client/src/components/studio/SmartCanvas/sections/OutputSettings.tsx` | useStudioState (context)                           |
| 33  | GenerateButton         | `client/src/components/studio/SmartCanvas/sections/GenerateButton.tsx` | useStudioState (context)                           |
| 34  | ResultView             | `client/src/components/studio/SmartCanvas/sections/ResultView.tsx`     | useStudioState (context)                           |
| 35  | StyleReferenceSelector | `client/src/components/studio/StyleReferenceSelector.tsx`              | props-only + local useState + custom hooks         |

---

## Dual-System Problem

The two systems coexist but are **completely independent**:

1. **Studio.tsx** calls `useStudioOrchestrator()` inside `<StudioProvider>`, so both systems are active simultaneously.
2. **Orchestrator components** (ComposerView, ResultViewEnhanced, InspectorPanel tabs, IdeaBankBar, AgentChatPanel, AgentModePanel) all receive `orch` as a prop and read/write orchestrator state.
3. **SmartCanvas components** (PromptEditor, OutputSettings, GenerateButton, ResultView, TemplatesTab, ProductsTab) use `useStudioState()` and read/write Context state.
4. **Neither system dispatches to the other.** When the user sets `platform` via ComposerView (orchestrator), the SmartCanvas OutputSettings (context) still shows the old value, and vice versa.

### Why This Hasn't Caused Obvious Bugs (Yet)

- The SmartCanvas component tree and the orchestrator component tree are **not rendered at the same time in the same workspace mode**. Studio.tsx renders either the orchestrator-based `renderStudioCanvas()` or the SmartCanvas tree (via different workspace modes or screen sizes), reducing visible conflicts.
- However, both state systems are initialized on mount, consuming memory and creating confusion for developers.

---

## Recommended Unification Target

### Keep: useStudioOrchestrator (sub-hook composer)

**Rationale:**

1. **Covers more ground.** The orchestrator manages 67 state fields + 46 setters + 16 handlers across 6 sub-hooks, while StudioContext covers only 16 fields (all of which the orchestrator also manages).
2. **Already adopted by the primary UI.** The main Studio page, ComposerView, InspectorPanel (4 tabs), IdeaBankBar, AgentChatPanel, and AgentModePanel all use `orch` (11 components).
3. **Better scalability.** Sub-hooks (`useStudioProducts`, `useStudioGeneration`, `useStudioUI`, etc.) allow modular growth. Adding a new feature means adding or extending one sub-hook, not inflating a monolithic reducer.
4. **Handles side effects.** The orchestrator sub-hooks already integrate with React Query, localStorage, URL state, and keyboard events. The Context/reducer is pure state with no side effect handling.

### Retire: StudioContext + useStudioState

**Migration plan (S2-11 through S2-13):**

1. **S2-11: Expand the orchestrator reducer.** Migrate the orchestrator's internal sub-hooks to a single `useReducer` for the core 16 overlapping fields, keeping the sub-hook composition pattern. This gives atomic state updates and prepares the ground for removing StudioContext.
2. **S2-12: Migrate SmartCanvas + AssetDrawer consumers.** Replace all `useStudioState()` calls in the 7 context-consumer components (SmartCanvas, PromptEditor, OutputSettings, GenerateButton, ResultView, TemplatesTab, ProductsTab) with `orch` prop drilling or a new thin context that proxies from the orchestrator (see alternative below).
3. **S2-13: Remove StudioContext.** Delete `client/src/contexts/StudioContext.tsx`, `client/src/hooks/useStudioState.ts`, and the `<StudioProvider>` wrapper in `client/src/pages/Studio.tsx`. Confirm no dead imports; run type checks and all tests.

### S2-12 Migration Targets (7 components)

| Component      | File                                                                   | Current Source | Migrate To |
| -------------- | ---------------------------------------------------------------------- | -------------- | ---------- |
| SmartCanvas    | `client/src/components/studio/SmartCanvas/SmartCanvas.tsx`             | useStudioState | orch prop  |
| PromptEditor   | `client/src/components/studio/SmartCanvas/sections/PromptEditor.tsx`   | useStudioState | orch prop  |
| OutputSettings | `client/src/components/studio/SmartCanvas/sections/OutputSettings.tsx` | useStudioState | orch prop  |
| GenerateButton | `client/src/components/studio/SmartCanvas/sections/GenerateButton.tsx` | useStudioState | orch prop  |
| ResultView     | `client/src/components/studio/SmartCanvas/sections/ResultView.tsx`     | useStudioState | orch prop  |
| TemplatesTab   | `client/src/components/studio/AssetDrawer/tabs/TemplatesTab.tsx`       | useStudioState | orch prop  |
| ProductsTab    | `client/src/components/studio/AssetDrawer/tabs/ProductsTab.tsx`        | useStudioState | orch prop  |

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

| Metric                                       | Value                       |
| -------------------------------------------- | --------------------------- |
| StudioContext fields                         | 16                          |
| StudioContext actions                        | 24                          |
| Orchestrator total return surface            | 138                         |
| Orchestrator state/data fields               | 67                          |
| Orchestrator setters                         | 46                          |
| Orchestrator handlers                        | 16                          |
| Orchestrator other functions                 | 6                           |
| Orchestrator refs                            | 3                           |
| Overlapping fields (context vs orchestrator) | 16 (100% of Context fields) |
| Synchronized overlaps                        | 0                           |
| Components using orch (prop/direct call)     | 11                          |
| Components using useStudioState (context)    | 7                           |
| Components using props-only                  | 9                           |
| Components using local state / React Query   | 8                           |
| Total unique Studio components mapped        | 35                          |
