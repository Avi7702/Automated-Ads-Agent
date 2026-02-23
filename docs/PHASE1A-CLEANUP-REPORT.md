# Phase 1A Dependency Cleanup Report

**Date:** 2026-02-23
**Branch:** `claude/phase1a-dependency-cleanup`

## Summary

Removed technical debt, unused dependencies, duplicate libraries, and performed toast/animation library consolidation.

## Changes Made

### 1. Deleted Temp Files

- Deleted: `client/src/tmpclaude-448d-cwd`
- Deleted: `client/src/tmpclaude-4de6-cwd`
- Deleted: `client/src/tmpclaude-aa3a-cwd`
- Note: `tmpclaude-*` was already in `.gitignore`

### 2. Removed Replit Plugins

**vite.config.ts:**

- Removed `import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal'`
- Removed `runtimeErrorOverlay()` plugin call
- Removed the dynamic `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-dev-banner` block (was REPL_ID-gated)

**package.json devDependencies removed:**

- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`
- `@replit/vite-plugin-runtime-error-modal`

### 3. Moved @types to devDependencies

Already correct in package.json (confirmed these were already in devDependencies):

- `@types/bcrypt`
- `@types/compression`
- `@types/cors`
- `@types/multer`

### 4. Removed Unused Frontend Dependencies

- **`vaul`** — zero imports in client/src/ (only false positive matches in string "vault")
- **`input-otp`** — zero imports in client/src/
- **`react-resizable-panels`** — zero imports in client/src/
- **`@xyflow/react`** — zero imports in client/src/ (also removed from `manualChunks` in vite.config.ts)
- Removed false `"notes": "removed framer motion dependency"` field from package.json (framer-motion IS used)

### 5. Fixed Duplicate Animation Libraries

- **KEPT:** `tw-animate-css` (Tailwind v4 compatible, imported in index.css)
- **REMOVED:** `tailwindcss-animate` (Tailwind v3 JS plugin — inert in v4 environment)
- Also removed `@radix-ui/react-toast` from `manualChunks` in vite.config.ts

### 6. Fixed Duplicate Toast Systems

**KEPT:** Sonner (`sonner` package) — shadcn/ui official toast
**REMOVED:** Radix UI toast system

Files deleted:

- `client/src/components/ui/toaster.tsx`
- `client/src/components/ui/toast.tsx`

Package removed: `@radix-ui/react-toast`

**App.tsx cleanup:**

- Removed: `import { Toaster } from '@/components/ui/toaster'`
- Removed: dual-Toaster rendering
- Now uses single: `import { Toaster } from 'sonner'`

**Migrated 15 component/page files** from `useToast` hook to direct `toast` from sonner:

- `components/AddProductModal.tsx`
- `components/AddTemplateModal.tsx`
- `components/BrandProfileForm.tsx`
- `components/calendar/DayPostsSheet.tsx`
- `components/calendar/SchedulePostDialog.tsx`
- `components/onboarding/BusinessOnboarding.tsx`
- `components/settings/StrategySection.tsx`
- `components/studio/AgentChat/AgentChatPanel.tsx`
- `pages/ApiKeySettings.tsx`
- `pages/ApprovalQueue.tsx`
- `pages/ContentPlanner.tsx`
- `pages/GalleryPage.tsx`
- `pages/LearnFromWinners.tsx`
- `pages/ProductLibrary.tsx`
- `pages/SocialAccounts.tsx`
- `pages/TemplateAdmin.tsx`

**API mapping:**

- `toast({ title, description })` → `toast.success(title, { description })`
- `toast({ title, description, variant: 'destructive' })` → `toast.error(title, { description })`
- `toast({ title, description, variant: 'default' })` → `toast.success(title, { description })`

**Kept:** `hooks/use-toast.ts` — Sonner-backed shim (still used by hooks.test.ts)

**Updated test mocks:**

- `hooks/__tests__/hooks.test.ts` — Already updated to test the Sonner shim
- `__tests__/integration/library.test.tsx` — Mock updated to `vi.mock('sonner', ...)`
- `pages/__tests__/ProductLibrary.test.tsx` — Mock updated to `vi.mock('sonner', ...)`

### 7. framer-motion → motion/react Migration

All 38 files already migrated to `motion/react` imports (confirmed via grep — zero `framer-motion` imports remain in client/src/).

Added `motion` package to support `motion/react` import path.

## Build Verification

`npx vite build` — **PASSED**

- 3441 modules transformed
- Zero errors
- Chunk size warning is pre-existing (not caused by these changes)

## Package Delta

**Removed (dependencies):**

- `vaul`, `input-otp`, `react-resizable-panels`, `@xyflow/react`
- `tailwindcss-animate`, `@radix-ui/react-toast`
- `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`, `@replit/vite-plugin-runtime-error-modal`

**Added (dependencies):**

- `motion` (supports `motion/react` import path used throughout the codebase)

**Moved to devDependencies:**

- `@types/bcrypt`, `@types/compression`, `@types/cors`, `@types/multer` (already correct)
