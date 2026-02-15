# Phase 4: Template System Cleanup

**Date:** 2026-02-15
**Branch:** `claude/phase-1-foundation-fixes`
**Status:** Complete
**Build:** Passed (zero errors)

---

## Problem

The project had two template systems both called "templates", causing user confusion:

1. **AdSceneTemplate** ("Scenes" tab) -- generation blueprints with prompt blueprints, placement hints, mood, lighting, environment
2. **PerformingAdTemplate** ("Templates" tab) -- reference ads from competitors/winners with engagement scores and performance metrics

Additionally, the AdSceneTemplate admin (CRUD) was on a separate `/admin/templates` route instead of being accessible from the Library.

## Changes Made

### Step 1: Renamed Library Tab Labels

**File:** `client/src/pages/Library.tsx`

- Tab `templates` label: "Templates" -> "Ad References"
- Tab `scene-templates` label: "Scenes" -> "Gen Templates"
- Updated page subtitle to reflect new terminology

### Step 2: Added `embedded` Prop to TemplateAdmin

**File:** `client/src/pages/TemplateAdmin.tsx`

- Added `TemplateAdminProps` interface with optional `embedded` prop
- When `embedded=true`: renders without page-level wrapper (no `<Header>`, no `min-h-screen`, no back button)
- When `embedded=false` (default): renders full standalone page (backward compatible)
- Updated "Back to Templates" link to point to `/library?tab=scene-templates` and text to "Back to Gen Templates"
- Extracted action bar into a shared `actionBar` variable used by both render paths

### Step 3: Added Admin Mode Toggle to Library

**File:** `client/src/pages/Library.tsx`

- Added `useState` for admin mode in `SceneTemplatesContent`
- Added a toggle button (Settings2 icon) in the Gen Templates tab header
- When admin mode is ON: renders `<TemplateAdmin embedded />` (lazy-loaded)
- When admin mode is OFF: renders read-only template browser (original behavior)
- Added imports: `useState`, `Button`, `Settings2` icon, lazy `TemplateAdmin`

### Step 4: Removed `/admin/templates` Route

**File:** `client/src/App.tsx`

- Removed lazy import of `TemplateAdmin`
- Replaced the `/admin/templates` protected route with a redirect to `/library?tab=scene-templates`
- `TemplateAdmin.tsx` file is NOT deleted -- still used as embedded component

### Step 5: Updated User-Facing Text References

| File                                                      | Old Text                                                 | New Text                                                      |
| --------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| `client/src/pages/Library.tsx`                            | "Templates" tab                                          | "Ad References"                                               |
| `client/src/pages/Library.tsx`                            | "Scenes" tab                                             | "Gen Templates"                                               |
| `client/src/pages/Library.tsx`                            | "products, templates, and creative assets"               | "products, ad references, gen templates, and creative assets" |
| `client/src/components/settings/KnowledgeBaseSection.tsx` | "Scene Templates"                                        | "Gen Templates"                                               |
| `client/src/components/TemplateLibrary.tsx`               | "Template Library" heading                               | "Gen Templates"                                               |
| `client/src/pages/TemplateLibrary.tsx`                    | "Template Library" heading                               | "Ad References"                                               |
| `client/src/pages/TemplateLibrary.tsx`                    | "High-performing ad templates for inspiration"           | "High-performing ad references for inspiration"               |
| `client/src/pages/TemplateLibrary.tsx`                    | "Search templates..."                                    | "Search ad references..."                                     |
| `client/src/pages/TemplateLibrary.tsx`                    | "Add Template" button                                    | "Add Reference"                                               |
| `client/src/pages/TemplateLibrary.tsx`                    | "Add First Template" button                              | "Add First Reference"                                         |
| `client/src/pages/TemplateLibrary.tsx`                    | "No matching templates" / "No templates yet"             | "No matching ad references" / "No ad references yet"          |
| `client/src/pages/TemplateLibrary.tsx`                    | "Add high-performing ad templates to build your library" | "Add high-performing ad references to build your library"     |
| `client/src/components/AddTemplateModal.tsx`              | "Add Template" dialog title                              | "Add Ad Reference"                                            |
| `client/src/components/AddTemplateModal.tsx`              | "Add a high-performing ad template..."                   | "Add a high-performing ad reference..."                       |
| `client/src/pages/Studio.tsx`                             | "Browse high-performing ad templates..."                 | "Browse high-performing ad references..."                     |
| `client/src/pages/TemplateAdmin.tsx`                      | "Back to Templates"                                      | "Back to Gen Templates"                                       |
| `client/src/pages/TemplateAdmin.tsx`                      | "Template Admin" (embedded)                              | "Gen Template Admin"                                          |

### What Was NOT Changed (by design)

- No TypeScript types, interfaces, or variable names were renamed
- No database table names or API endpoint URLs were changed
- No component file names were changed
- The `?tab=scene-templates` URL parameter is preserved
- The `/templates` -> `/library?tab=scene-templates` legacy redirect still works
- The `/template-library` -> `/library?tab=templates` legacy redirect still works
- "scene" in generation mode descriptions (Templates.tsx lines 137-138) left as-is since it describes the actual generation concept

## Files Modified

1. `client/src/pages/Library.tsx` -- tab labels, admin mode toggle, imports
2. `client/src/pages/TemplateAdmin.tsx` -- embedded prop, conditional rendering
3. `client/src/App.tsx` -- removed route, added redirect
4. `client/src/components/settings/KnowledgeBaseSection.tsx` -- label text
5. `client/src/components/TemplateLibrary.tsx` -- heading text
6. `client/src/pages/TemplateLibrary.tsx` -- heading, descriptions, buttons, search placeholder, empty states
7. `client/src/components/AddTemplateModal.tsx` -- dialog title and description
8. `client/src/pages/Studio.tsx` -- dialog description text

## Build Verification

```
npx vite build -> SUCCESS (51.37s, zero errors)
```
