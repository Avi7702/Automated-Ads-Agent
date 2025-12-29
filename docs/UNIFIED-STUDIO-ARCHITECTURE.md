# Unified Studio Architecture

**Final Plan** - Merging consolidation analysis with Single-Screen Studio vision

---

## Overview

This plan combines:
1. **UNIFIED_UI_PLAN.md** - Single-Screen Studio concept
2. **Consolidation Analysis** - Feature mapping and page reduction strategy

**Result**: 3 routes total (down from 9), with the Studio as the primary workspace.

---

## Route Structure

| Route | Purpose |
|-------|---------|
| `/` | **Studio** - Primary workspace (generate, edit, copy, everything) |
| `/gallery` | **Gallery** - Browse all generations, bulk actions |
| `/settings` | **Settings** - Account, Brand Voice, Knowledge Base |

---

## Page 1: Studio (`/`)

The **Single-Screen Studio** where all creative work happens.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ☰  Product Content Studio                              [Gallery] [⚙️]  │
├────────────────┬────────────────────────────────┬───────────────────────┤
│                │                                │                       │
│  LEFT PANEL    │       CENTER CANVAS            │    RIGHT PANEL        │
│  (Collapsible) │                                │    (Inspector)        │
│                │                                │                       │
│  ┌──────────┐  │  ┌──────────────────────────┐  │  ┌─────────────────┐  │
│  │ Products │  │  │                          │  │  │ [Edit] [Copy]   │  │
│  │ ────────-│  │  │                          │  │  │ [Ask AI] [Info] │  │
│  │ 📦 Prod 1│  │  │     Generated Image      │  │  ├─────────────────┤  │
│  │ 📦 Prod 2│  │  │     (or placeholder)     │  │  │                 │  │
│  │ 📦 Prod 3│  │  │                          │  │  │  Context-aware  │
│  └──────────┘  │  │                          │  │  │  tools based    │
│                │  └──────────────────────────┘  │  │  on active tab  │
│  ┌──────────┐  │                                │  │                 │
│  │Templates │  │  ┌──────────────────────────┐  │  │                 │
│  │ ────────-│  │  │ 💡 Prompt input bar      │  │  │                 │
│  │ ▶ Product│  │  │ [Idea Bank suggestions]  │  │  │                 │
│  │ ▶ Social │  │  │              [Generate]  │  │  │                 │
│  │ ▶ Banner │  │  └──────────────────────────┘  │  └─────────────────┘  │
│  │ ▶ Hero   │  │                                │                       │
│  └──────────┘  │  ┌──────────────────────────┐  │                       │
│                │  │ History Timeline         │  │                       │
│  ┌──────────┐  │  │ [v1] [v2] [v3] [v4] ...  │  │                       │
│  │ Brand    │  │  └──────────────────────────┘  │                       │
│  │ Context  │  │                                │                       │
│  └──────────┘  │                                │                       │
│                │                                │                       │
├────────────────┴────────────────────────────────┴───────────────────────┤
│  Idea Bank: "Summer vibes product shot" | "Minimalist white bg" | +3    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Left Panel: Assets & Resources

**Collapsible** - User can hide to maximize canvas space.

#### 1. Products Drawer
- List of user's products with thumbnails
- **Click** to select (adds to context)
- **Multi-select** supported (1-6 products)
- Shows product name + thumbnail
- Search/filter bar at top

#### 2. Templates Drawer
- **Accordion by category** (user's choice: Option A)
- Categories:
  - ▶ Product Shots
  - ▶ Social Media
  - ▶ Banners
  - ▶ Hero Images
  - ▶ Lifestyle
- **Click** template → applies style to prompt
- Each template shows: thumbnail, name, platforms

#### 3. Brand Context
- Quick-switch dropdown for brand profiles
- Shows current: voice, tone, style
- "Edit in Settings →" link

### Center: The Canvas

#### Image Stage
- Large preview of generated/edited image
- Placeholder state when empty: "Select products and describe your vision"
- Zoom controls, fullscreen option

#### Prompt Input Bar
- Always visible below image
- Textarea with placeholder
- **Idea Bank chips** appear based on selected products
- [Generate] button with loading state
- Platform/aspect ratio quick-select pills

#### History Timeline
- Horizontal filmstrip of all versions
- Shows: thumbnail, version number, timestamp
- Click to load that version into canvas
- Current version highlighted

### Right Panel: The Inspector

**Tab-based** interface with 4 tabs:

#### Tab 1: Edit
- Edit prompt input (refine current image)
- Quick actions: Remove background, Upscale, Crop
- Mask tool for inpainting (future)
- [Apply Edit] button

#### Tab 2: Copywriting
- Platform selector (Instagram, LinkedIn, Facebook, X, TikTok)
- Framework selector (Auto, AIDA, PAS, BAB, FAB)
- Character limit indicator
- Generated copy with quality score
- Variations carousel (3 by default)
- [Copy to Clipboard] per variation

#### Tab 3: Ask AI
- Chat interface about current generation
- Context-aware: knows selected products, current image
- Suggestions: "What else could work?", "Analyze this image"
- Reasoning displayed inline

#### Tab 4: Details
- Image metadata: resolution, format, created date
- Download options: PNG, JPG, WebP
- Share link generator
- Delete button

### Idea Bank Bar (Bottom)

- Horizontal bar with AI-generated prompt suggestions
- Based on: selected products, templates, brand context
- Click chip → populates prompt bar
- Shows: confidence, source icons (vision, KB, web)
- Auto-refreshes when context changes

---

## Page 2: Gallery (`/gallery`)

Full library of all generations for browsing and bulk actions.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back to Studio          Gallery                      [Filter] [Sort] │
├─────────────────────────────────────────────────────────────────────────┤
│  [All] [Favorites] [By Product ▼] [By Date ▼]           🔍 Search       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │         │  │         │  │         │  │         │  │         │       │
│  │  Img 1  │  │  Img 2  │  │  Img 3  │  │  Img 4  │  │  Img 5  │       │
│  │         │  │         │  │         │  │         │  │         │       │
│  │ [♡] [↗] │  │ [♡] [↗] │  │ [♡] [↗] │  │ [♡] [↗] │  │ [♡] [↗] │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │         │  │         │  │         │  │         │  │         │       │
│  ...                                                                    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Showing 47 of 156 generations                              [Load More] │
└─────────────────────────────────────────────────────────────────────────┘
```

### Features

- **Grid view** of all generations
- **Filters**: By product, by date range, favorites only
- **Sort**: Newest, oldest, most edited
- **Bulk actions**: Select multiple → download, delete
- **Click image** → opens in Studio at that generation
- **Favorite toggle** on each card
- **Quick share** button

---

## Page 3: Settings (`/settings`)

Account and configuration.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back to Studio          Settings                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────┐  ┌─────────────────────────────────────────────┐│
│  │ Account           │  │                                             ││
│  │ Brand Voice       │  │  [Selected Section Content]                 ││
│  │ Knowledge Base    │  │                                             ││
│  │ API Keys          │  │                                             ││
│  │ Preferences       │  │                                             ││
│  └───────────────────┘  │                                             ││
│                         │                                             ││
│                         └─────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Sections

#### Account
- Profile info, email
- Password change (if applicable)
- Logout

#### Brand Voice
- Create/edit brand profiles
- Voice: Professional, Casual, Playful, etc.
- Tone settings
- Default brand selector

#### Knowledge Base
- Upload documents (PDF, TXT)
- View indexed content
- Delete documents
- Status indicators (processing, indexed, error)

#### API Keys
- Gemini API key management
- Other integrations

#### Preferences
- Default platform
- Default aspect ratio
- Theme (light/dark)

---

## Removed Pages

| Old Route | Status | Reason |
|-----------|--------|--------|
| `/library` | **Removed** | Merged into Studio left panel (Products + Templates) |
| `/products` | **Removed** | Merged into Studio left panel |
| `/templates` | **Removed** | Merged into Studio left panel |
| `/prompts` | **Removed** | Replaced by Idea Bank |
| `/generation/:id` | **Removed** | Merged into Studio (history timeline) |
| `/knowledge-base` | **Removed** | Moved to Settings |

---

## Navigation

### Header (minimal)
- Logo/title (left)
- [Gallery] button
- [Settings] gear icon
- Breadcrumb only when not in Studio

### Keyboard Shortcuts
- `Cmd+G` - Focus prompt bar (Generate)
- `Cmd+E` - Switch to Edit tab
- `Cmd+C` - Switch to Copywriting tab
- `Cmd+/` - Open keyboard shortcuts help
- `Esc` - Close panels/modals

---

## Implementation Priority

### Phase 1: Studio Core
1. Create base layout with 3 panels
2. Implement center canvas with prompt bar
3. Add history timeline
4. Basic generation flow

### Phase 2: Left Panel
1. Products drawer with selection
2. Templates drawer with accordion
3. Brand context switcher

### Phase 3: Right Panel
1. Edit tab with refinement
2. Copywriting tab (existing service)
3. Ask AI tab
4. Details tab

### Phase 4: Gallery + Settings
1. Gallery page with grid
2. Settings sections migration
3. KB move to settings

### Phase 5: Polish
1. Keyboard shortcuts
2. Drag & drop (templates → prompt)
3. Responsive design
4. Animations/transitions

---

## Data Flow

```
User selects products → Products passed to Idea Bank
User selects template → Template style added to prompt context
User types prompt → Combined with product + template context
User clicks Generate → API call with full context
Result displayed → Added to history timeline
User switches to Edit → Current image as base
User switches to Copy → Current image analyzed for copy
```

---

## Benefits of This Architecture

1. **Zero context switching** - Everything in one screen
2. **Progressive disclosure** - Panels collapse when not needed
3. **Visual continuity** - Image always visible while editing/copying
4. **Fast iteration** - History timeline for instant version switching
5. **Reduced routes** - 9 pages → 3 pages
6. **Clear mental model** - Create in Studio, Browse in Gallery, Configure in Settings

---

## Migration Notes

### What Stays
- All backend APIs (no changes needed)
- Gallery page (minor updates)
- Product/Template data models

### What Changes
- Home page becomes Studio
- Library/Products/Templates become Studio panels
- Generation detail becomes inline history
- Prompt templates removed (Idea Bank replaces)

### Breaking Changes
- `/generation/:id` URLs will redirect to Studio with that generation loaded
- `/library`, `/products`, `/templates` redirect to Studio

