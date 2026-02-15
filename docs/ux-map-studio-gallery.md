# UX Map: Studio + Gallery Pages

> Generated 2026-02-15. Exhaustive catalog of every interactive element across the Studio (v1), StudioOptimized (v2), and Gallery pages.

---

## P1: Studio (route: `/`)

File: `client/src/pages/Studio.tsx`

Uses `useStudioOrchestrator` hook for all state/handlers.
Sub-components: ComposerView, GeneratingView, ResultViewEnhanced, InspectorPanel, IdeaBankBar, HistoryPanel, AgentChatPanel, SaveToCatalogDialog, KeyboardShortcutsPanel.

---

### S1: Header (shared component)

File: `client/src/components/layout/Header.tsx`

| ID        | Type           | Label/Text                                               | Action                        | API Endpoint                            | Data Sent | Notes                               |
| --------- | -------------- | -------------------------------------------------------- | ----------------------------- | --------------------------------------- | --------- | ----------------------------------- |
| P1.S1.C1  | Link           | "V3" logo + "Product Content Studio"                     | Navigate to `/`               | None                                    | -         | Brand link                          |
| P1.S1.C2  | Button (icon)  | Hamburger menu                                           | Opens mobile nav Sheet        | None                                    | -         | Mobile only (`md:hidden`)           |
| P1.S1.C3  | Link           | "Studio"                                                 | Navigate to `/`               | None                                    | -         | Desktop nav, active state highlight |
| P1.S1.C4  | Link           | "Gallery"                                                | Navigate to `/gallery`        | None                                    | -         | Desktop nav                         |
| P1.S1.C5  | Link           | "Pipeline"                                               | Navigate to `/pipeline`       | None                                    | -         | Desktop nav                         |
| P1.S1.C6  | Link           | "Library"                                                | Navigate to `/library`        | None                                    | -         | Desktop nav                         |
| P1.S1.C7  | Link           | "Settings"                                               | Navigate to `/settings`       | None                                    | -         | Desktop nav                         |
| P1.S1.C8  | Button         | ThemeToggle                                              | Toggles dark/light theme      | None                                    | -         | Uses ThemeToggle component          |
| P1.S1.C9  | Button         | LogOut icon                                              | Calls `logout()`              | POST /api/auth/logout (via AuthContext) | -         | Only shown when user is logged in   |
| P1.S1.C10 | Sheet (mobile) | Nav items (Studio, Gallery, Pipeline, Library, Settings) | Navigate to respective routes | None                                    | -         | Each item closes the sheet on click |

---

### S2: Agent Chat Panel (collapsible)

File: `client/src/components/studio/AgentChat/AgentChatPanel.tsx`

| ID       | Type                | Label/Text                   | Action                             | API Endpoint                            | Data Sent              | Notes                                              |
| -------- | ------------------- | ---------------------------- | ---------------------------------- | --------------------------------------- | ---------------------- | -------------------------------------------------- |
| P1.S2.C1 | Button (full-width) | "Studio Assistant" + chevron | Toggles chat panel open/close      | None                                    | -                      | Persists to localStorage `agent-chat-open`         |
| P1.S2.C2 | Input (text)        | "Type a message..."          | Sets input state                   | None                                    | -                      | Submit on Enter                                    |
| P1.S2.C3 | Button              | Send icon                    | Sends message to agent chat API    | POST /api/agent/chat (via useAgentChat) | `{ message, history }` | Streaming response                                 |
| P1.S2.C4 | Button              | Square (stop) icon           | Stops streaming response           | None (aborts fetch)                     | -                      | Only visible while streaming                       |
| P1.S2.C5 | Button              | Trash2 icon                  | Clears all chat messages           | None                                    | -                      | Only visible when messages exist and not streaming |
| P1.S2.C6 | Button              | Mic/MicOff icon              | Toggles Web Speech API voice input | None                                    | -                      | Only shown if browser supports SpeechRecognition   |

**Agent UI Actions (dispatched from chat responses):**

| Action                | Effect                                                |
| --------------------- | ----------------------------------------------------- |
| `select_products`     | Sets `orch.selectedProducts`                          |
| `set_prompt`          | Sets `orch.prompt`                                    |
| `set_platform`        | Sets `orch.platform`                                  |
| `set_aspect_ratio`    | Sets `orch.aspectRatio`                               |
| `set_resolution`      | Sets `orch.resolution`                                |
| `generation_complete` | Sets `orch.generatedImage` + state to 'result'        |
| `copy_generated`      | Sets `orch.generatedCopyFull` or `orch.generatedCopy` |

---

### S3: Hero Section

File: `client/src/pages/Studio.tsx` (inline)

| ID       | Type   | Label/Text                 | Action                                               | API Endpoint | Data Sent | Notes                                            |
| -------- | ------ | -------------------------- | ---------------------------------------------------- | ------------ | --------- | ------------------------------------------------ |
| P1.S3.C1 | Button | "History" / "Hide History" | `orch.handleHistoryToggle()` — toggles history panel | None         | -         | History icon + label text changes based on state |

---

### S4: ComposerView (idle state, center panel)

File: `client/src/components/studio/MainCanvas/ComposerView.tsx`

#### S4.1: Weekly Plan Context Banner (conditional)

| ID         | Type   | Label/Text | Action                    | API Endpoint | Data Sent | Notes                         |
| ---------- | ------ | ---------- | ------------------------- | ------------ | --------- | ----------------------------- |
| P1.S4.1.C1 | Button | X icon     | `orch.clearPlanContext()` | None         | -         | Dismisses plan context banner |

#### S4.2: Quick Start

| ID         | Type     | Label/Text                            | Action                                     | API Endpoint          | Data Sent                                                                         | Notes                                   |
| ---------- | -------- | ------------------------------------- | ------------------------------------------ | --------------------- | --------------------------------------------------------------------------------- | --------------------------------------- |
| P1.S4.2.C1 | Textarea | "Describe what you want to create..." | Sets `orch.quickStartPrompt`               | None                  | -                                                                                 | id=`prompt-textarea`, Enter to generate |
| P1.S4.2.C2 | Button   | Mic/MicOff icon                       | Toggles voice input for quick start prompt | None (Web Speech API) | -                                                                                 | Only if `quickStartVoice.isSupported`   |
| P1.S4.2.C3 | Button   | "Generate Now"                        | `orch.handleGenerate()`                    | POST /api/transform   | FormData: prompt, resolution, images, recipe, mode, templateId, styleReferenceIds | Disabled if prompt empty                |

#### S4.3: Path Selection

| ID         | Type            | Label/Text                                     | Action                                      | API Endpoint | Data Sent | Notes                              |
| ---------- | --------------- | ---------------------------------------------- | ------------------------------------------- | ------------ | --------- | ---------------------------------- |
| P1.S4.3.C1 | Button (card)   | "Freestyle" — "Describe freely, AI interprets" | `orch.setIdeaBankMode('freestyle')`         | None         | -         | Active state: border-primary       |
| P1.S4.3.C2 | Button (card)   | "Use Template" — "Pick a proven ad format"     | `orch.setIdeaBankMode('template')`          | None         | -         | Active state: border-primary       |
| P1.S4.3.C3 | TemplateLibrary | Template grid (conditional)                    | `orch.setSelectedTemplateForMode(template)` | None         | -         | Only shown when mode is 'template' |

#### S4.4: Upload Section (collapsible)

| ID         | Type       | Label/Text                     | Action                         | API Endpoint            | Data Sent | Notes                                   |
| ---------- | ---------- | ------------------------------ | ------------------------------ | ----------------------- | --------- | --------------------------------------- |
| P1.S4.4.C1 | Button     | Section header "Upload Images" | `orch.toggleSection('upload')` | None                    | -         | Collapsible section toggle              |
| P1.S4.4.C2 | UploadZone | Drag & drop / file picker      | Sets `orch.tempUploads`        | None (client-side only) | -         | Max files = 6 - selectedProducts.length |

#### S4.5: Products Section (collapsible)

| ID         | Type                           | Label/Text                     | Action                                       | API Endpoint | Data Sent | Notes                                               |
| ---------- | ------------------------------ | ------------------------------ | -------------------------------------------- | ------------ | --------- | --------------------------------------------------- |
| P1.S4.5.C1 | Button                         | Section header "Your Products" | `orch.toggleSection('products')`             | None         | -         | Badge shows selected count                          |
| P1.S4.5.C2 | Button (per product thumbnail) | X overlay on hover             | `orch.toggleProductSelection(p)` — deselects | None         | -         | Selected products preview                           |
| P1.S4.5.C3 | Button                         | "Clear all"                    | `orch.setSelectedProducts([])`               | None         | -         | Clears all product selections                       |
| P1.S4.5.C4 | Input                          | "Search products..."           | `orch.setSearchQuery(value)`                 | None         | -         | Filters product grid                                |
| P1.S4.5.C5 | Select                         | Category filter                | `orch.setCategoryFilter(value)`              | None         | -         | Options: 'All Categories', ...dynamic from products |
| P1.S4.5.C6 | Button (per product card)      | Product image tile             | `orch.toggleProductSelection(product)`       | None         | -         | Max 6 selected, creates ripple effect               |

**Data queries:**

- `GET /api/products` — fetches product list (queryKey: `['products']`)

#### S4.6: Templates Section (collapsible)

| ID         | Type                       | Label/Text                                          | Action                                                                | API Endpoint | Data Sent | Notes                                  |
| ---------- | -------------------------- | --------------------------------------------------- | --------------------------------------------------------------------- | ------------ | --------- | -------------------------------------- |
| P1.S4.6.C1 | Button                     | Section header "Style & Template"                   | `orch.toggleSection('templates')`                                     | None         | -         | Badge: "1 selected" if template chosen |
| P1.S4.6.C2 | Button (per category)      | Category name (e.g., "All", "Product", "Lifestyle") | `orch.setTemplateCategory(cat)`                                       | None         | -         | Filters template list                  |
| P1.S4.6.C3 | Button (per template card) | Template title + description                        | Selects/deselects template, sets prompt to `template.promptBlueprint` | None         | -         | Horizontally scrollable                |
| P1.S4.6.C4 | Button                     | X icon on "Using: [template]"                       | `orch.setSelectedTemplate(null)`                                      | None         | -         | Clears template selection              |
| P1.S4.6.C5 | Button                     | "Template Inspiration"                              | `orch.setShowTemplateInspiration(true)`                               | None         | -         | Opens Template Inspiration Dialog      |

**Data queries:**

- `GET /api/templates` — fetches template list (queryKey: `['templates']`)

#### S4.7: Prompt Section ("Describe Your Vision")

| ID         | Type                   | Label/Text                           | Action                                                        | API Endpoint                | Data Sent                                       | Notes                                  |
| ---------- | ---------------------- | ------------------------------------ | ------------------------------------------------------------- | --------------------------- | ----------------------------------------------- | -------------------------------------- |
| P1.S4.7.C1 | Button                 | X on "Selected Suggestion" card      | Clears suggestion + prompt                                    | None                        | -                                               | Only shown when suggestion is selected |
| P1.S4.7.C2 | ContentPlannerGuidance | Topic buttons                        | Launches CarouselBuilder, BeforeAfterBuilder, or TextOnlyMode | None                        | -                                               | Only shown when cpTemplate exists      |
| P1.S4.7.C3 | Textarea               | "Describe your ideal ad creative..." | `orch.handlePromptChange(value)`                              | None                        | -                                               | id=`prompt-textarea`, rows=5           |
| P1.S4.7.C4 | Button                 | Mic/MicOff icon (main prompt)        | Toggles voice input for main prompt                           | None (Web Speech API)       | -                                               | Absolute positioned in textarea        |
| P1.S4.7.C5 | IdeaBankPanel          | Suggestion cards                     | `orch.handleSelectSuggestion()`, `orch.setGenerationRecipe()` | POST /api/idea-bank/suggest | `{ productIds, tempUploads, mode, templateId }` | ErrorBoundary wrapped                  |

#### S4.8: Output Type Selection

| ID         | Type            | Label/Text            | Action                         | API Endpoint | Data Sent | Notes                    |
| ---------- | --------------- | --------------------- | ------------------------------ | ------------ | --------- | ------------------------ |
| P1.S4.8.C1 | Button (toggle) | "Image"               | `orch.setMediaMode('image')`   | None         | -         | Active: bg-primary       |
| P1.S4.8.C2 | Button (toggle) | "Video"               | `orch.setMediaMode('video')`   | None         | -         | Active: bg-primary       |
| P1.S4.8.C3 | Select          | Duration (4s, 6s, 8s) | `orch.setVideoDuration(value)` | None         | -         | Only shown in video mode |

#### S4.9: Output Settings

| ID         | Type   | Label/Text                                                  | Action                       | API Endpoint | Data Sent | Notes             |
| ---------- | ------ | ----------------------------------------------------------- | ---------------------------- | ------------ | --------- | ----------------- |
| P1.S4.9.C1 | Select | Platform (LinkedIn, Instagram, Facebook, Twitter, TikTok)   | `orch.setPlatform(value)`    | None         | -         | Default: LinkedIn |
| P1.S4.9.C2 | Select | Size (1200x627, 1200x1200, 1080x1350, 1920x1080, 1080x1920) | `orch.setAspectRatio(value)` | None         | -         | Default: 1200x627 |
| P1.S4.9.C3 | Select | Quality (1K, 2K, 4K)                                        | `orch.setResolution(value)`  | None         | -         | Default: 2K       |

#### S4.10: Style References (collapsible)

| ID          | Type                   | Label/Text                       | Action                             | API Endpoint              | Data Sent | Notes                              |
| ----------- | ---------------------- | -------------------------------- | ---------------------------------- | ------------------------- | --------- | ---------------------------------- |
| P1.S4.10.C1 | Button                 | Section header "Style Reference" | `orch.toggleSection('styleRefs')`  | None                      | -         | Badge shows count of selected refs |
| P1.S4.10.C2 | StyleReferenceSelector | Reference image tiles            | `orch.setSelectedStyleRefIds(ids)` | GET /api/style-references | -         | Multi-select style references      |

#### S4.11: Generate Button

| ID          | Type   | Label/Text                                | Action                                                  | API Endpoint                                                       | Data Sent                        | Notes                                        |
| ----------- | ------ | ----------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------- | -------------------------------------------- |
| P1.S4.11.C1 | Button | "Generate Image" or "Generate Video (Xs)" | `orch.handleGenerate()` or `orch.handleGenerateVideo()` | POST /api/transform (image) or POST /api/generations/video (video) | FormData (image) or JSON (video) | Full-width, h-16, disabled if `!canGenerate` |

**API calls from handleGenerate:**

- `POST /api/transform` — main generation (sends FormData with images, prompt, resolution, mode, templateId, recipe, styleReferenceIds)
- Includes CSRF token via `x-csrf-token` header

**API calls from handleGenerateVideo:**

- `POST /api/generations/video` — video generation (JSON: prompt, duration, aspectRatio, videoResolution)
- Polls `GET /api/jobs/{jobId}` every 5s for completion
- Safety timeout: 12 minutes

**Auto-update on plan context:**

- `PATCH /api/planner/weekly/{planId}/posts/{postIndex}` — updates post status to 'generated'

---

### S5: GeneratingView (generating state)

File: `client/src/components/studio/MainCanvas/GeneratingView.tsx`

| ID       | Type   | Label/Text        | Action                                         | API Endpoint | Data Sent | Notes                                 |
| -------- | ------ | ----------------- | ---------------------------------------------- | ------------ | --------- | ------------------------------------- |
| P1.S5.C1 | Button | "Stop Generating" | `orch.handleCancelGeneration()` — aborts fetch | None         | -         | Appears after 2s delay (5s for video) |

---

### S6: ResultViewEnhanced (result state, center panel)

File: `client/src/components/studio/MainCanvas/ResultViewEnhanced.tsx`

#### S6.1: Plan Context Banner (conditional)

| ID         | Type   | Label/Text     | Action                                | API Endpoint | Data Sent | Notes                                     |
| ---------- | ------ | -------------- | ------------------------------------- | ------------ | --------- | ----------------------------------------- |
| P1.S6.1.C1 | Button | "Back to Plan" | Navigate to `/pipeline?tab=dashboard` | None         | -         | Only shown when `orch.planContext` exists |

#### S6.2: Result Header

| ID         | Type          | Label/Text                    | Action                                   | API Endpoint         | Data Sent | Notes                                |
| ---------- | ------------- | ----------------------------- | ---------------------------------------- | -------------------- | --------- | ------------------------------------ |
| P1.S6.2.C1 | Button        | "Start New"                   | `orch.handleReset()`                     | None                 | -         | Resets all generation state          |
| P1.S6.2.C2 | Button        | "Download" / "Downloading..." | `orch.handleDownloadWithFeedback()`      | None (blob download) | -         | Creates download link from image URL |
| P1.S6.2.C3 | Link + Button | "View Details"                | Navigate to `/generation/{generationId}` | None                 | -         | History icon                         |

#### S6.3: Generated Image/Video

| ID         | Type             | Label/Text      | Action                                      | API Endpoint | Data Sent | Notes                                            |
| ---------- | ---------------- | --------------- | ------------------------------------------- | ------------ | --------- | ------------------------------------------------ |
| P1.S6.3.C1 | Image (zoomable) | Generated image | Scroll to zoom, double-click to reset       | None         | -         | `orch.zoomContainerRef`, scale range 0.5-3x      |
| P1.S6.3.C2 | Video            | Generated video | Standard video controls (play, pause, etc.) | None         | -         | Only shown when `generatedMediaType === 'video'` |

#### S6.4: Action Buttons (6-button grid)

| ID         | Type   | Label/Text              | Action                                  | API Endpoint     | Data Sent | Notes                            |
| ---------- | ------ | ----------------------- | --------------------------------------- | ---------------- | --------- | -------------------------------- |
| P1.S6.4.C1 | Button | "Edit"                  | `orch.setActiveActionButton('edit')`    | None             | -         | Toggles Edit section visibility  |
| P1.S6.4.C2 | Button | "AI Canvas"             | `orch.setShowCanvasEditor(true)`        | None             | -         | Opens CanvasEditor overlay       |
| P1.S6.4.C3 | Button | "Copy"                  | `orch.setActiveActionButton('copy')`    | None             | -         | Toggles Copy/Ask AI section      |
| P1.S6.4.C4 | Button | "Preview"               | `orch.setActiveActionButton('preview')` | None             | -         | Toggles LinkedIn Preview section |
| P1.S6.4.C5 | Button | "Save"                  | `orch.setShowSaveToCatalog(true)`       | None             | -         | Opens Save to Catalog dialog     |
| P1.S6.4.C6 | Button | "Copy Text" / "Copied!" | `orch.handleCopyText()`                 | None (clipboard) | -         | Disabled if no `generatedCopy`   |

#### S6.5: HistoryTimeline

| ID         | Type                   | Label/Text            | Action                                   | API Endpoint | Data Sent | Notes                      |
| ---------- | ---------------------- | --------------------- | ---------------------------------------- | ------------ | --------- | -------------------------- |
| P1.S6.5.C1 | Button (per thumbnail) | Generation thumbnails | `orch.handleLoadFromHistory(generation)` | None         | -         | Inline horizontal timeline |

#### S6.6: Edit Section (conditional: activeActionButton === 'edit')

| ID         | Type                | Label/Text                                                                               | Action                       | API Endpoint                    | Data Sent        | Notes                                         |
| ---------- | ------------------- | ---------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------- | ---------------- | --------------------------------------------- |
| P1.S6.6.C1 | Textarea            | "Describe what changes you'd like..."                                                    | `orch.setEditPrompt(value)`  | None                            | -                | rows=3                                        |
| P1.S6.6.C2 | Button (x5 presets) | "Warmer lighting", "Cooler tones", "More contrast", "Softer look", "Brighter background" | `orch.setEditPrompt(preset)` | None                            | -                | Quick preset chips                            |
| P1.S6.6.C3 | Button              | "Apply Changes" / "Applying..."                                                          | `orch.handleApplyEdit()`     | POST /api/generations/{id}/edit | `{ editPrompt }` | Navigates to `/generation/{newId}` on success |

#### S6.7: Ask AI / Copy Section (conditional: activeActionButton === 'copy')

| ID         | Type          | Label/Text                                                       | Action                          | API Endpoint                       | Data Sent                                                                                            | Notes                       |
| ---------- | ------------- | ---------------------------------------------------------------- | ------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------- |
| P1.S6.7.C1 | Input         | "Ask a question about this generation..."                        | `orch.setAskAIQuestion(value)`  | None                               | -                                                                                                    | Enter to submit             |
| P1.S6.7.C2 | Button (icon) | Send                                                             | `orch.handleAskAI()`            | POST /api/generations/{id}/analyze | `{ question }`                                                                                       | Returns AI analysis         |
| P1.S6.7.C3 | Button        | "Generate Ad Copy" / "Regenerate Ad Copy" / "Generating copy..." | `orch.handleGenerateCopy()`     | POST /api/copy/generate            | `{ generationId, platform, tone, productName, productDescription, industry, framework, variations }` | Full copy generation        |
| P1.S6.7.C4 | Textarea      | Generated copy (editable)                                        | `orch.setGeneratedCopy(value)`  | None                               | -                                                                                                    | Only shown when copy exists |
| P1.S6.7.C5 | Button        | "Read Aloud"                                                     | `speakText(orch.generatedCopy)` | None (Web Speech API)              | -                                                                                                    | Text-to-speech              |

#### S6.8: LinkedIn Preview (conditional: activeActionButton === 'preview')

| ID         | Type                | Label/Text            | Action                                                                                | API Endpoint            | Data Sent   | Notes                               |
| ---------- | ------------------- | --------------------- | ------------------------------------------------------------------------------------- | ----------------------- | ----------- | ----------------------------------- |
| P1.S6.8.C1 | LinkedInPostPreview | Editable post preview | `orch.setGeneratedCopy(text)` on text change, `orch.handleGenerateCopy()` on generate | POST /api/copy/generate | See S6.7.C3 | Shows author, text, image, hashtags |

#### S6.9: AI Canvas Editor (overlay, conditional)

| ID         | Type         | Label/Text                 | Action                                                                                           | API Endpoint                  | Data Sent | Notes             |
| ---------- | ------------ | -------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------- | --------- | ----------------- |
| P1.S6.9.C1 | CanvasEditor | Full canvas editor overlay | `orch.handleCanvasEditComplete(newImageUrl)` on save, `orch.setShowCanvasEditor(false)` on close | Various (canvas-specific API) | -         | Overlay component |

---

### S7: InspectorPanel (right column, desktop)

File: `client/src/components/studio/InspectorPanel/InspectorPanel.tsx`

#### S7.0: Tab Bar

| ID         | Type         | Label/Text | Action                    | API Endpoint | Data Sent | Notes              |
| ---------- | ------------ | ---------- | ------------------------- | ------------ | --------- | ------------------ |
| P1.S7.0.C1 | Button (tab) | "Edit"     | `setActiveTab('edit')`    | None         | -         | Pencil icon        |
| P1.S7.0.C2 | Button (tab) | "Copy"     | `setActiveTab('copy')`    | None         | -         | MessageCircle icon |
| P1.S7.0.C3 | Button (tab) | "Ask AI"   | `setActiveTab('ask-ai')`  | None         | -         | Sparkles icon      |
| P1.S7.0.C4 | Button (tab) | "Details"  | `setActiveTab('details')` | None         | -         | Info icon          |

#### S7.1: Edit Tab

File: `client/src/components/studio/InspectorPanel/tabs/EditTab.tsx`

| ID         | Type                | Label/Text                                                                                                                                                     | Action                       | API Endpoint                    | Data Sent        | Notes                                  |
| ---------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------- | ---------------- | -------------------------------------- |
| P1.S7.1.C1 | Textarea            | "Describe what changes you'd like..."                                                                                                                          | `orch.setEditPrompt(value)`  | None                            | -                | Only active when generatedImage exists |
| P1.S7.1.C2 | Button (x8 presets) | "Warmer lighting", "Cooler tones", "More contrast", "Softer look", "Brighter background", "More vibrant colors", "Add subtle shadows", "Professional lighting" | `orch.setEditPrompt(preset)` | None                            | -                | Rounded chips                          |
| P1.S7.1.C3 | Button              | "Apply Changes" / "Applying..."                                                                                                                                | `orch.handleApplyEdit()`     | POST /api/generations/{id}/edit | `{ editPrompt }` | Disabled if no edit prompt or editing  |

#### S7.2: Copy Tab

File: `client/src/components/studio/InspectorPanel/tabs/CopyTab.tsx`

| ID         | Type             | Label/Text                                                             | Action                            | API Endpoint                    | Data Sent                                            | Notes                                            |
| ---------- | ---------------- | ---------------------------------------------------------------------- | --------------------------------- | ------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| P1.S7.2.C1 | Button           | "Generate Quick Copy" / "Regenerate Quick Copy" / "Generating copy..." | `orch.handleGenerateCopy()`       | POST /api/copy/generate         | `{ generationId, platform, tone, productName, ... }` | Only active when generatedImage exists           |
| P1.S7.2.C2 | Textarea         | Generated copy (editable)                                              | `orch.setGeneratedCopy(value)`    | None                            | -                                                    | Only shown when copy exists                      |
| P1.S7.2.C3 | Button           | "Copy to Clipboard" / "Copied!"                                        | `navigator.clipboard.writeText()` | None                            | -                                                    | Copies generated copy                            |
| P1.S7.2.C4 | Button           | "Advanced Copy Studio" (toggle)                                        | Toggles `showAdvanced` state      | None                            | -                                                    | Expands CopywritingPanel                         |
| P1.S7.2.C5 | CopywritingPanel | Full copywriting interface                                             | Various                           | Multiple /api/copy/\* endpoints | Various                                              | Only shown when generationId exists and expanded |

#### S7.3: Ask AI Tab

File: `client/src/components/studio/InspectorPanel/tabs/AskAITab.tsx`

| ID         | Type                        | Label/Text                                                                                                                  | Action                                          | API Endpoint                       | Data Sent      | Notes                       |
| ---------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------- | -------------- | --------------------------- |
| P1.S7.3.C1 | Button (x4 quick questions) | "What makes this image effective?", "Suggest improvements", "What audience would this appeal to?", "Rate this for LinkedIn" | Sets question + auto-sends `orch.handleAskAI()` | POST /api/generations/{id}/analyze | `{ question }` | Quick question chips        |
| P1.S7.3.C2 | Input                       | "Ask about this generation..."                                                                                              | `orch.setAskAIQuestion(value)`                  | None                               | -              | Enter to submit             |
| P1.S7.3.C3 | Button (icon)               | Send                                                                                                                        | `orch.handleAskAI()`                            | POST /api/generations/{id}/analyze | `{ question }` | Disabled if empty or asking |

#### S7.4: Details Tab

File: `client/src/components/studio/InspectorPanel/tabs/DetailsTab.tsx`

| ID         | Type                | Label/Text                          | Action                                                     | API Endpoint            | Data Sent   | Notes              |
| ---------- | ------------------- | ----------------------------------- | ---------------------------------------------------------- | ----------------------- | ----------- | ------------------ |
| P1.S7.4.C1 | Button              | "Copy" (prompt)                     | `navigator.clipboard.writeText(orch.prompt)`               | None                    | -           | Copies prompt text |
| P1.S7.4.C2 | Button              | "Download Image" / "Downloading..." | `orch.handleDownloadWithFeedback()`                        | None (blob download)    | -           |                    |
| P1.S7.4.C3 | Button              | "Save to Catalog"                   | `orch.setShowSaveToCatalog(true)`                          | None                    | -           | Opens save dialog  |
| P1.S7.4.C4 | LinkedInPostPreview | Editable post preview               | `orch.setGeneratedCopy(text)`, `orch.handleGenerateCopy()` | POST /api/copy/generate | See S7.2.C1 | Embedded preview   |

---

### S8: HistoryPanel (right column, collapsible)

File: `client/src/components/studio/HistoryPanel/HistoryPanel.tsx`

| ID       | Type                              | Label/Text               | Action                                            | API Endpoint                                  | Data Sent | Notes                          |
| -------- | --------------------------------- | ------------------------ | ------------------------------------------------- | --------------------------------------------- | --------- | ------------------------------ |
| P1.S8.C1 | Button (icon)                     | ChevronRight/ChevronLeft | `onToggle()` — toggles panel width                | None                                          | -         | Collapse/expand toggle         |
| P1.S8.C2 | Button (icon)                     | History icon             | `onToggle()`                                      | None                                          | -         | Shown in collapsed state only  |
| P1.S8.C3 | TabsTrigger                       | "Recent"                 | Sets activeTab to 'recent'                        | None                                          | -         | Filters to last 24h            |
| P1.S8.C4 | TabsTrigger                       | "Favorites"              | Sets activeTab to 'favorites'                     | None                                          | -         | Currently returns empty (TODO) |
| P1.S8.C5 | TabsTrigger                       | "All"                    | Sets activeTab to 'all'                           | None                                          | -         | Shows all generations          |
| P1.S8.C6 | Button (per generation thumbnail) | Generation image         | `selectGeneration(id)` + `onSelectGeneration(id)` | None (parent fetches `/api/generations/{id}`) | -         | Grid of 2 columns              |

**Data queries:**

- `GET /api/generations` — fetches all generations (queryKey: `['generations']`)

---

### S9: IdeaBankBar (bottom bar, desktop only)

File: `client/src/components/studio/IdeaBankBar/IdeaBankBar.tsx`

| ID       | Type                            | Label/Text                  | Action                                               | API Endpoint                | Data Sent                          | Notes                                           |
| -------- | ------------------------------- | --------------------------- | ---------------------------------------------------- | --------------------------- | ---------------------------------- | ----------------------------------------------- |
| P1.S9.C1 | Button (icon)                   | RefreshCw                   | `fetchSuggestions()`                                 | POST /api/idea-bank/suggest | `{ productIds, mode, templateId }` | Refresh suggestions                             |
| P1.S9.C2 | Button (icon)                   | ChevronLeft                 | Scrolls chip container left                          | None                        | -                                  | Only shown when can scroll left                 |
| P1.S9.C3 | Button (icon)                   | ChevronRight                | Scrolls chip container right                         | None                        | -                                  | Only shown when can scroll right                |
| P1.S9.C4 | SuggestionChip (per suggestion) | Summary text + confidence % | `orch.handleSelectSuggestion(prompt, id, reasoning)` | None                        | -                                  | Max width 280px, color-coded by mode            |
| P1.S9.C5 | Button                          | "Get AI suggestions"        | `fetchSuggestions()`                                 | POST /api/idea-bank/suggest | `{ productIds, mode, templateId }` | Shown when no suggestions and products selected |

**Data queries:**

- `POST /api/idea-bank/suggest` — fetches AI suggestions (via `useIdeaBankFetch` hook)

---

### S10: SaveToCatalogDialog (modal)

File: `client/src/components/SaveToCatalogDialog.tsx`

| ID         | Type                     | Label/Text                                 | Action                   | API Endpoint       | Data Sent                                    | Notes                                      |
| ---------- | ------------------------ | ------------------------------------------ | ------------------------ | ------------------ | -------------------------------------------- | ------------------------------------------ |
| P1.S10.C1  | Button (X icon)          | Close dialog                               | `onClose()`              | None               | -                                            |                                            |
| P1.S10.C2  | Input                    | "Product Name"                             | Sets `name` state        | None               | -                                            | Default: "Generated - {date}"              |
| P1.S10.C3  | Select                   | Category dropdown                          | Sets `category` state    | None               | -                                            | Populated from existing product categories |
| P1.S10.C4  | Button                   | "+ New"                                    | Shows new category input | None               | -                                            | Toggles between select and text input      |
| P1.S10.C5  | Input                    | "New category name..."                     | Sets `newCategory` state | None               | -                                            | Only shown when creating new category      |
| P1.S10.C6  | Button                   | "Cancel" (new category)                    | Hides new category input | None               | -                                            |                                            |
| P1.S10.C7  | Input                    | "Add tags..."                              | Sets `tagInput` state    | None               | -                                            | Enter to add tag                           |
| P1.S10.C8  | Button                   | Tag icon                                   | Adds tag from input      | None               | -                                            | Disabled if input empty                    |
| P1.S10.C9  | Button (per tag, X icon) | Remove tag                                 | Removes tag from list    | None               | -                                            |                                            |
| P1.S10.C10 | Button                   | "Cancel"                                   | `onClose()`              | None               | -                                            |                                            |
| P1.S10.C11 | Button                   | "Save to Catalog" / "Saving..." / "Saved!" | `saveMutation.mutate()`  | POST /api/products | FormData: `{ image (blob), name, category }` | Invalidates products query on success      |

---

### S11: Template Inspiration Dialog (modal)

File: `client/src/pages/Studio.tsx` (inline)

| ID        | Type                       | Label/Text                    | Action                                          | API Endpoint | Data Sent | Notes                                           |
| --------- | -------------------------- | ----------------------------- | ----------------------------------------------- | ------------ | --------- | ----------------------------------------------- |
| P1.S11.C1 | Button (per template card) | Template name + preview image | `orch.handleSelectPerformingTemplate(template)` | None         | -         | Sets platform, aspect ratio, prompt style hints |
| P1.S11.C2 | Link + Button              | "Browse template library"     | Navigate to `/templates`                        | None         | -         | Shown when no templates exist                   |

**Data queries:**

- `GET /api/performing-ad-templates/featured` — fetches featured templates (queryKey: `['performing-ad-templates-featured']`, enabled only when dialog is open)

---

### S12: Keyboard Shortcuts Panel

File: `client/src/pages/Studio.tsx` (inline `KeyboardShortcutsPanel` component)

| ID        | Type   | Label/Text | Action                             | API Endpoint | Data Sent | Notes                       |
| --------- | ------ | ---------- | ---------------------------------- | ------------ | --------- | --------------------------- |
| P1.S12.C1 | Button | X icon     | Closes shortcuts panel             | None         | -         |                             |
| P1.S12.C2 | Button | "?" circle | Toggles shortcuts panel visibility | None         | -         | Fixed bottom-right position |

**Keyboard Shortcuts (registered via `useKeyboardShortcuts`):**

| Shortcut | Action                         | Condition                               |
| -------- | ------------------------------ | --------------------------------------- |
| Ctrl+G   | `handleGenerate()`             | state=idle && canGenerate               |
| Ctrl+D   | `handleDownloadWithFeedback()` | generatedImage exists                   |
| Ctrl+R   | `handleReset()`                | state !== idle or generatedImage exists |
| /        | Focus prompt textarea          | Always                                  |
| Shift+?  | Toggle shortcuts panel         | Always                                  |

---

### S13: Context Bar (floating, conditional)

File: `client/src/pages/Studio.tsx` (inline `ContextBar` component)

| ID  | Type         | Label/Text                              | Action               | API Endpoint | Data Sent | Notes                                   |
| --- | ------------ | --------------------------------------- | -------------------- | ------------ | --------- | --------------------------------------- |
| -   | Display only | "{N} products", template name, platform | None (informational) | None         | -         | Shows when scrollY > 200 and state=idle |

---

### S14: Mobile Inspector (bottom sheet, mobile only)

File: `client/src/pages/Studio.tsx` (conditional render)

| ID  | Type           | Label/Text | Action     | API Endpoint | Data Sent  | Notes                                                   |
| --- | -------------- | ---------- | ---------- | ------------ | ---------- | ------------------------------------------------------- |
| -   | InspectorPanel | Same as S7 | Same as S7 | Same as S7   | Same as S7 | Shown only when `generatedImage` exists and screen < lg |

---

### Auto-Fetched Data (useStudioOrchestrator effects)

| Trigger                           | API Endpoint                                                                                 | Purpose                           |
| --------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------- |
| Mount + products change           | `GET /api/pricing/estimate?resolution=X&operation=generate&inputImagesCount=X&promptChars=X` | Price estimate (debounced 300ms)  |
| URL param `?generation=X`         | `GET /api/generations/{id}`                                                                  | Load generation from URL          |
| URL param `?planId=X&postIndex=Y` | `GET /api/planner/weekly/current`                                                            | Load weekly plan context          |
| URL param `?cpTemplateId=X`       | `getTemplateById()` (client-side)                                                            | Load content planner template     |
| Mount                             | `GET /api/auth/me`                                                                           | Fetch authenticated user          |
| Prompt change                     | `localStorage.setItem('studio-prompt-draft', prompt)`                                        | Auto-save draft (debounced 500ms) |

---

## P2: StudioOptimized (route: `/studio-v2`)

File: `client/src/pages/StudioOptimized.tsx`

> StudioOptimized is a performance-optimized version of Studio.tsx. It manages its own state (not using `useStudioOrchestrator`) and delegates to memoized sub-components: StudioHeader, StudioSidebar, StudioCanvas, StudioToolbar. The interactive elements are functionally identical to Studio (P1) with the following structural differences:

### Key Differences from Studio (P1)

1. **No AgentChatPanel** — not included
2. **No IdeaBankBar** — bottom bar not included
3. **Progress Rail** — vertical dot navigation on right side (not in Studio v1)
4. **LinkedIn Preview** — always visible in right column (not behind InspectorPanel tabs)
5. **Mobile LinkedIn Preview** — collapsible bottom sheet with Collapsible component
6. **State management** — all inline useState (not extracted to useStudioOrchestrator)
7. **Components are memoized** — StudioHeader, StudioSidebar, StudioCanvas, StudioToolbar

### S1: Header (shared)

Same as P1.S1.

### S2: Progress Rail (right side, desktop only)

| ID       | Type                     | Label/Text                                        | Action                                       | API Endpoint | Data Sent | Notes                                   |
| -------- | ------------------------ | ------------------------------------------------- | -------------------------------------------- | ------------ | --------- | --------------------------------------- |
| P2.S2.C1 | Button (per section dot) | Upload, Products, Style, Prompt, Generate, Result | `navigateToSection(id)` — scrolls to section | None         | -         | Tooltip on hover, filled when completed |

### S3: Quick Start

| ID       | Type     | Label/Text                            | Action                                               | API Endpoint        | Data Sent                    | Notes                    |
| -------- | -------- | ------------------------------------- | ---------------------------------------------------- | ------------------- | ---------------------------- | ------------------------ |
| P2.S3.C1 | Textarea | "Describe what you want to create..." | Sets `quickStartPrompt`                              | None                | -                            | Enter to generate        |
| P2.S3.C2 | Button   | "Generate Now"                        | Sets `quickStartMode=true`, calls `handleGenerate()` | POST /api/transform | FormData: prompt, resolution | Disabled if prompt empty |

### S4-S11: (Same functional elements as P1)

StudioSidebar covers: Upload, Products (search, category filter, product grid), Templates (category filter, template cards, template inspiration).

StudioCanvas covers: Path selection, Prompt (with suggestion card), Output settings (platform, aspect ratio, resolution), Idea bank, Content planner guidance, Builders.

StudioToolbar covers: Generate button (idle), Result header + action buttons (result state).

### S12: LinkedIn Preview (right column, always visible)

| ID        | Type                | Label/Text                    | Action                                  | API Endpoint            | Data Sent                               | Notes                                |
| --------- | ------------------- | ----------------------------- | --------------------------------------- | ----------------------- | --------------------------------------- | ------------------------------------ |
| P2.S12.C1 | LinkedInPostPreview | Editable post                 | `setGeneratedCopy(text)` on text change | None                    | -                                       | Editable text field                  |
| P2.S12.C2 | Button              | "Generate Copy"               | `handleGenerateCopy()`                  | POST /api/copy/generate | `{ generationId, platform, tone, ... }` | Only when generationId exists        |
| P2.S12.C3 | Button              | "Generate Image"              | `handleGenerate()`                      | POST /api/transform     | FormData                                | Only when products selected + prompt |
| P2.S12.C4 | Button              | "Copy Text" / "Copied!"       | `handleCopyText()`                      | None (clipboard)        | -                                       | Disabled if no image or copy         |
| P2.S12.C5 | Button              | "Download" / "Downloading..." | `handleDownloadWithFeedback()`          | None (blob)             | -                                       | Disabled if no image                 |

### S13: Mobile LinkedIn Preview (bottom sheet)

| ID        | Type                | Label/Text                        | Action                         | API Endpoint     | Data Sent | Notes                                  |
| --------- | ------------------- | --------------------------------- | ------------------------------ | ---------------- | --------- | -------------------------------------- |
| P2.S13.C1 | CollapsibleTrigger  | "LinkedIn Preview" + status badge | Toggles bottom sheet           | None             | -         | Shows Ready/Need copy/Need image/Empty |
| P2.S13.C2 | LinkedInPostPreview | Same as S12.C1-C3                 | Same                           | Same             | Same      | Inside collapsible content             |
| P2.S13.C3 | Button              | "Copy" / "Copied!"                | `handleCopyText()`             | None (clipboard) | -         |                                        |
| P2.S13.C4 | Button              | "Download" / "Downloading..."     | `handleDownloadWithFeedback()` | None (blob)      | -         |                                        |

### S14: HistoryPanel

Same as P1.S8.

### S15: SaveToCatalogDialog

Same as P1.S10.

### S16: Template Inspiration Dialog

Same as P1.S11 but with enhanced template cards including:

- Platform icons (Instagram, Linkedin, Facebook, Twitter)
- Engagement tier badges
- "View Full Library" link
- "Close" button

### Keyboard Shortcuts

Same as P1.S12 shortcuts.

### Unique API Calls

| Trigger                           | API Endpoint                    | Purpose                          |
| --------------------------------- | ------------------------------- | -------------------------------- |
| Products selected + prompt change | `GET /api/pricing/estimate?...` | Price estimate (debounced 300ms) |
| URL `?generation=X`               | `GET /api/generations/{id}`     | Load from URL                    |
| URL `?templateId=X&mode=Y`        | Inline lookup                   | Deep-link template mode          |
| URL `?cpTemplateId=X`             | `getTemplateById()`             | Content planner integration      |
| URL `?suggestedPrompt=X`          | Inline set                      | Pre-fill prompt                  |

---

## P3: Gallery (route: `/gallery`)

File: `client/src/pages/GalleryPage.tsx`

### S1: Header (shared)

Same as P1.S1.

### S2: Top Bar

| ID       | Type   | Label/Text                | Action          | API Endpoint | Data Sent | Notes           |
| -------- | ------ | ------------------------- | --------------- | ------------ | --------- | --------------- |
| P3.S2.C1 | Button | "Studio" (with ArrowLeft) | `navigate('/')` | None         | -         | Back navigation |

### S3: Bulk Actions (conditional: selectedIds.size > 0)

| ID       | Type   | Label/Text | Action                                                          | API Endpoint | Data Sent | Notes                                                          |
| -------- | ------ | ---------- | --------------------------------------------------------------- | ------------ | --------- | -------------------------------------------------------------- |
| P3.S3.C1 | Button | "Clear"    | `clearSelection()` — empties selectedIds Set                    | None         | -         | Outline variant                                                |
| P3.S3.C2 | Button | "Delete"   | (No handler implemented — button exists but onClick is missing) | None         | -         | Destructive variant, Trash2 icon. **NOTE: no action wired up** |

### S4: Filters

| ID       | Type   | Label/Text          | Action                  | API Endpoint | Data Sent | Notes                                      |
| -------- | ------ | ------------------- | ----------------------- | ------------ | --------- | ------------------------------------------ |
| P3.S4.C1 | Input  | "Search prompts..." | `setSearchQuery(value)` | None         | -         | Search icon prefix, filters by prompt text |
| P3.S4.C2 | Select | Sort dropdown       | `setSortBy(value)`      | None         | -         | Options: "Newest first", "Oldest first"    |

### S5: Generation Grid

| ID       | Type                        | Label/Text                 | Action                                          | API Endpoint | Data Sent | Notes                                                              |
| -------- | --------------------------- | -------------------------- | ----------------------------------------------- | ------------ | --------- | ------------------------------------------------------------------ |
| P3.S5.C1 | Div (per card, clickable)   | Generation image thumbnail | `navigate('/?generation={id}')`                 | None         | -         | Grid: 2/3/4/5 cols responsive, hover overlay shows prompt + date   |
| P3.S5.C2 | Button (per card, checkbox) | Select circle              | `toggleSelect(id)` — toggles in selectedIds Set | None         | -         | `e.stopPropagation()` to prevent card click, opacity-0 until hover |

### S6: Empty State

| ID       | Type   | Label/Text     | Action          | API Endpoint | Data Sent | Notes                                |
| -------- | ------ | -------------- | --------------- | ------------ | --------- | ------------------------------------ |
| P3.S6.C1 | Button | "Go to Studio" | `navigate('/')` | None         | -         | Only shown when no generations exist |

### Data Queries

| Query Key         | API Endpoint           | Purpose                                  |
| ----------------- | ---------------------- | ---------------------------------------- |
| `['generations']` | `GET /api/generations` | Fetches all generations for gallery grid |

---

## API Endpoint Summary (All Pages)

| Method | Endpoint                                         | Used By                                                      | Purpose                         |
| ------ | ------------------------------------------------ | ------------------------------------------------------------ | ------------------------------- |
| GET    | `/api/auth/me`                                   | Studio, StudioOptimized                                      | Get authenticated user          |
| POST   | `/api/auth/logout`                               | Header (via AuthContext)                                     | Sign out                        |
| GET    | `/api/products`                                  | Studio, StudioOptimized, SaveToCatalogDialog                 | Fetch product catalog           |
| POST   | `/api/products`                                  | SaveToCatalogDialog                                          | Save generated image as product |
| GET    | `/api/templates`                                 | Studio, StudioOptimized                                      | Fetch ad scene templates        |
| GET    | `/api/performing-ad-templates/featured`          | Template Inspiration Dialog                                  | Fetch featured templates        |
| POST   | `/api/transform`                                 | Studio, StudioOptimized                                      | Main image generation           |
| POST   | `/api/generations/video`                         | Studio (video mode)                                          | Video generation via Veo        |
| GET    | `/api/jobs/{jobId}`                              | Studio (video polling)                                       | Check video job status          |
| GET    | `/api/generations`                               | Gallery, HistoryPanel                                        | Fetch all generations           |
| GET    | `/api/generations/{id}`                          | Studio, StudioOptimized, HistoryPanel                        | Fetch single generation details |
| POST   | `/api/generations/{id}/edit`                     | EditTab, ResultViewEnhanced                                  | Apply edit to generation        |
| POST   | `/api/generations/{id}/analyze`                  | AskAITab, ResultViewEnhanced                                 | AI analysis of generation       |
| POST   | `/api/copy/generate`                             | CopyTab, ResultViewEnhanced, DetailsTab, LinkedInPostPreview | Generate ad copy                |
| POST   | `/api/idea-bank/suggest`                         | IdeaBankPanel, IdeaBankBar                                   | Get AI prompt suggestions       |
| GET    | `/api/pricing/estimate`                          | Studio, StudioOptimized                                      | Get cost estimate               |
| GET    | `/api/planner/weekly/current`                    | Studio (plan deep-link)                                      | Fetch weekly plan               |
| PATCH  | `/api/planner/weekly/{planId}/posts/{postIndex}` | Studio (after generation)                                    | Update plan post status         |
| POST   | `/api/agent/chat`                                | AgentChatPanel                                               | Agent chat messaging            |
| GET    | `/api/style-references`                          | StyleReferenceSelector                                       | Fetch style reference images    |

---

## Total Interactive Element Count

| Page                 | Buttons | Inputs | Selects | Links | Other Interactive                    | Total        |
| -------------------- | ------- | ------ | ------- | ----- | ------------------------------------ | ------------ |
| Studio (P1)          | ~85+    | ~10    | ~7      | ~8    | ~15 (tabs, chips, cards, thumbnails) | ~125+        |
| StudioOptimized (P2) | ~80+    | ~10    | ~7      | ~8    | ~12                                  | ~117+        |
| Gallery (P3)         | ~5      | 1      | 1       | ~1    | ~N (generation cards)                | ~8 + N cards |
