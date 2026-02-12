# Strategy Configuration & Business Onboarding UI — Implementation Report

## Summary

Implemented WS-C4 (Strategy Configuration UI) and WS-C6 (Business Onboarding UI) for the Automated Ads Agent. This adds a full content strategy management section to Settings and a 7-step business onboarding wizard for first-time users.

## Files Created

### 1. `client/src/hooks/useBusinessIntelligence.ts`

React Query hooks for all business intelligence API endpoints:

- `useBusinessIntelligence()` — GET /api/intelligence/business
- `useSaveBusinessIntelligence()` — PUT /api/intelligence/business (mutation)
- `useProductPriorities()` — GET /api/intelligence/priorities
- `useSaveProductPriority()` — PUT /api/intelligence/priorities/:productId (mutation)
- `useBulkSetPriorities()` — POST /api/intelligence/priorities/bulk (mutation)
- `useOnboardingStatus()` — GET /api/intelligence/onboarding-status
- `useProductStats()` — GET /api/intelligence/stats

All hooks follow the existing TanStack Query patterns from `useScheduledPosts.ts`, using `apiRequest` for mutations (automatic CSRF handling) and `fetch` with `credentials: 'include'` for queries.

### 2. `client/src/components/settings/StrategySection.tsx`

Content Strategy configuration section for `/settings?section=strategy`:

- **Posting Frequency** — Button group: 3, 5, or 7 posts per week
- **Category Targets** — 5 sliders (Product Showcase, Educational, Industry Insights, Company Updates, Engagement) with proportional redistribution to maintain 100% total
- **Preferred Platforms** — Checkboxes for LinkedIn, Instagram, Facebook, Twitter/X, TikTok
- **Posting Times** — Select dropdowns per day of the week (30-minute intervals)
- **Product Priorities** — Table with tier dropdown (flagship/core/supporting/new) and weight slider (1-10) per product
- **Save button** with dirty-state tracking and toast notifications

### 3. `client/src/components/onboarding/BusinessOnboarding.tsx`

7-step full-screen onboarding wizard:

1. **Welcome** — Introduction with sparkle icon
2. **Industry & Niche** — Industry dropdown + niche text input
3. **Differentiator** — Textarea for competitive advantages
4. **Target Customer** — B2B/B2C toggle, demographics, pain points (multi-input), decision factors (multi-input)
5. **Product Ranking** — Assign tier per product (uses existing products from API)
6. **Content Themes** — Click-to-add suggestions + custom input with Enter key support
7. **Review & Confirm** — Summary with per-section Edit buttons

Navigation: Back/Next buttons, progress bar, "Skip for now" dismiss option.

### 4. `client/src/components/onboarding/OnboardingGate.tsx`

Wrapper component placed in App.tsx that:

- Fetches onboarding status for authenticated users
- Shows BusinessOnboarding overlay if `onboardingComplete === false`
- Allows dismiss via "Skip for now" (session-only, will re-appear next session)
- Invalidates queries on completion

## Files Modified

### 5. `client/src/pages/Settings.tsx`

- Added `Target` icon import from lucide-react
- Added lazy import for `StrategySection`
- Added "Strategy" entry to the sections array (between Knowledge Base and API Keys)
- Added `{activeSection === 'strategy' && <StrategySection />}` render case

### 6. `client/src/App.tsx`

- Added import for `OnboardingGate`
- Wrapped `<main>` element with `<OnboardingGate>` inside the AuthProvider context

## Build Status

Build passes with zero errors (verified via `npx vite build`).

## Architecture Decisions

- **`@ts-nocheck`** — All new files use this directive, matching existing pattern in studio components
- **wouter** — All routing uses wouter (no react-router)
- **shadcn/ui** — All UI components use existing shadcn primitives (Card, Button, Input, Textarea, Select, Slider, Checkbox, Badge, Progress, Label)
- **Toast notifications** — Uses `useToast` from `@/hooks/use-toast`
- **CSRF handling** — Mutations use `apiRequest` which handles CSRF automatically
- **Category redistribution** — Proportional algorithm redistributes remaining percentage across other categories when one slider changes
- **OnboardingGate** — Placed as overlay (not route redirect) so the app is still accessible behind it
