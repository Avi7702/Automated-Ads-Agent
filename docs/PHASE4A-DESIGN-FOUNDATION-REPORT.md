# Phase 4A: Design Foundation Report

**Date:** 2026-02-23
**Branch:** `claude/phase4-premium-ux`
**Build Status:** PASS (vite build, tsc --noEmit)

---

## Summary

Implemented the design foundation layer for the Phase 4 Premium UX initiative. This adds OKLCH color tokens, a motion system, view transitions, typography scale, spacing grid, and a premium skeleton shimmer component. All changes are backward compatible with the existing HSL token system.

---

## 1. OKLCH Color Tokens (`client/src/index.css`)

### What changed

- Added OKLCH equivalents alongside existing HSL variables (no breaking changes)
- New tokens in both `:root` (light) and `.dark` scopes:
  - `--oklch-bg`, `--oklch-fg`, `--oklch-primary`, `--oklch-primary-fg`
  - `--oklch-muted`, `--oklch-muted-fg`, `--oklch-border`

### Surface Layers

- `--surface-1`: Card-level surface (light: `oklch(0.99 0.002 265)`, dark: `oklch(0.2 0.015 265)`)
- `--surface-2`: Elevated surface (light: `oklch(1 0 0)`, dark: `oklch(0.25 0.015 265)`)
- `--surface-3`: Highest elevation (light: `oklch(1 0 0)`, dark: `oklch(0.3 0.015 265)`)

### AI Glow System

- `--glow-primary`: `oklch(0.7 0.15 250)` — blue AI glow
- `--glow-success`: `oklch(0.75 0.15 155)` — green success glow
- `--glow-accent`: `oklch(0.7 0.12 300)` — purple accent glow
- CSS utility classes: `.glow-ai`, `.glow-success-ring`, `.glow-accent-ring`

### Hover-Responsive Border Tokens

- `--border-hover`: `oklch(0.65 0.1 250 / 0.3)`
- `--border-active`: `oklch(0.65 0.15 250 / 0.5)`

### CSS @property Registrations

- `--glow-opacity` (number)
- `--glow-spread` (length)
- `--glow-blur` (length)
- `--shimmer-x` (percentage)

These enable smooth CSS-only animations of custom properties without JavaScript.

---

## 2. Typography System (`client/src/index.css`)

### Type Scale Variables

| Token            | Value                          | Line Height |
| ---------------- | ------------------------------ | ----------- |
| `--text-display` | `clamp(2.5rem, 4vw, 3.5rem)`   | 1.1         |
| `--text-heading` | `clamp(1.75rem, 3vw, 2.25rem)` | 1.2         |
| `--text-title`   | `clamp(1.25rem, 2vw, 1.5rem)`  | 1.3         |
| `--text-body`    | `1rem`                         | 1.6         |
| `--text-small`   | `0.875rem`                     | 1.5         |
| `--text-micro`   | `0.75rem`                      | 1.4         |

### Letter Spacing

- `--tracking-tight`: `-0.025em` (headings)
- `--tracking-normal`: `0em` (body)
- `--tracking-wide`: `0.025em` (micro text, labels)

### Utility Classes

- `.text-display`, `.text-heading`, `.text-title`, `.text-body`, `.text-small`, `.text-micro`
- Heading classes auto-apply `font-display` (Space Grotesk) and `--tracking-tight`

### Fonts

- **Inter** (body) + **Space Grotesk** (headings) — both already loaded via Google Fonts in `index.html`

---

## 3. Spacing System (`client/src/index.css`)

8px grid system tokens:

| Token        | Value     | Pixels |
| ------------ | --------- | ------ |
| `--space-1`  | `0.25rem` | 4px    |
| `--space-2`  | `0.5rem`  | 8px    |
| `--space-3`  | `0.75rem` | 12px   |
| `--space-4`  | `1rem`    | 16px   |
| `--space-6`  | `1.5rem`  | 24px   |
| `--space-8`  | `2rem`    | 32px   |
| `--space-12` | `3rem`    | 48px   |
| `--space-16` | `4rem`    | 64px   |

---

## 4. Motion System (`client/src/lib/motion.ts`)

### Exports

- **`MOTION`** constant with:
  - `durations`: `{ instant, fast, normal, slow, page }` (in seconds for motion/react)
  - `easings`: `{ snappy, smooth, bounce }` (cubic-bezier arrays)
  - `transitions`: `{ default, fast, slow }` (pre-built Transition objects)
  - `presets`: `{ fadeIn, fadeUp, scaleIn, slideIn, staggerChildren }` (Variants)

- **`useReducedMotion()`** hook: returns `true` when `prefers-reduced-motion: reduce` is active
- **`motionSafe(variants, prefersReduced)`**: returns empty variants when reduced motion is preferred

### Dependencies

- `motion` package v12.34.3 installed (exports `motion/react`)
- Types imported from `motion/react` (`Variants`, `Transition`)

---

## 5. View Transitions (`client/src/lib/navigate.ts`)

### Exports

- **`useNavigateWithTransition()`**: wraps wouter's `useLocation` navigate with `document.startViewTransition()`
  - Falls back to instant navigation on unsupported browsers
  - Skips animation when `prefers-reduced-motion: reduce` is set
  - Returns `(to: string, options?: { replace?: boolean }) => void`

- **`withViewTransition(callback)`**: wraps any DOM update in a view transition (for non-navigation use)

### CSS (`client/src/index.css`)

- `::view-transition-old(root)`: fade-out 200ms
- `::view-transition-new(root)`: fade-in 200ms
- Reduced motion override: `animation: none`

---

## 6. Premium Skeleton (`client/src/components/ui/skeleton.tsx`)

### Backward Compatible

- Original `Skeleton` component unchanged (still exports as named + default)
- Existing 15 consumers continue to work without changes

### New: `SkeletonShimmer`

- OKLCH-based shimmer gradient (light + dark mode variants)
- Variants: `text`, `circle`, `rect`, `card`
- `text` variant supports `lines` prop for multi-line placeholders
- `circle` variant supports `size` prop (px)
- Uses `.skeleton-shimmer` CSS class with `shimmer-fallback` animation

---

## Files Created

| File                         | Lines | Purpose                            |
| ---------------------------- | ----- | ---------------------------------- |
| `client/src/lib/motion.ts`   | ~140  | Motion system constants + hooks    |
| `client/src/lib/navigate.ts` | ~70   | View transition navigation wrapper |

## Files Modified

| File                                    | Changes                                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------------------------- |
| `client/src/index.css`                  | Added @property, OKLCH tokens, surfaces, glow, typography, spacing, view transitions, shimmer |
| `client/src/components/ui/skeleton.tsx` | Added SkeletonShimmer component alongside existing Skeleton                                   |
| `package.json`                          | Added `motion` dependency                                                                     |

## Packages Added

| Package  | Version    | Reason                                          |
| -------- | ---------- | ----------------------------------------------- |
| `motion` | `^12.34.3` | Modern animation library (motion/react imports) |

---

## Verification

- `npx vite build` — PASS
- `npx tsc --noEmit` on new files — PASS (0 errors)
- All existing HSL token consumers unaffected (backward compat confirmed)
