# Knowledge Base & UX Audit Report

**Date:** 2026-02-12
**Auditor:** knowledge-auditor (system-upgrade team)
**Scope:** Product knowledge depth + UX polish / missing states

---

## Part 1: Product Knowledge Depth

### Data Usage Matrix

| Data Field                          | Exists in DB | Used in Idea Bank                                         | Used in Copy                                 | Used in Content Planner        | Gap?    |
| ----------------------------------- | ------------ | --------------------------------------------------------- | -------------------------------------------- | ------------------------------ | ------- |
| `products.name`                     | Yes          | Yes                                                       | Yes (via `request.productName`)              | Yes                            | No      |
| `products.description`              | Yes          | Yes (via formattedContext)                                | Yes (via `request.productDescription`)       | Yes                            | No      |
| `products.features`                 | Yes          | Yes (via formattedContext)                                | **NO**                                       | **NO**                         | **YES** |
| `products.benefits`                 | Yes          | Yes (via formattedContext)                                | Only if passed via `request.productBenefits` | **NO**                         | **YES** |
| `products.specifications`           | Yes          | Yes (via formattedContext)                                | **NO**                                       | **NO**                         | **YES** |
| `products.tags`                     | Yes          | Yes (via formattedContext)                                | **NO**                                       | **NO**                         | **YES** |
| `products.sku`                      | Yes          | Yes (via formattedContext)                                | **NO**                                       | **NO**                         | **YES** |
| `products.category`                 | Yes          | Yes (via formattedContext)                                | **NO**                                       | **NO**                         | **YES** |
| `products.enrichmentDraft`          | Yes          | Yes (via formattedContext)                                | **NO**                                       | **NO**                         | **YES** |
| `products.enrichmentStatus`         | Yes          | **NO**                                                    | **NO**                                       | **NO**                         | **YES** |
| `installationScenarios.*`           | Yes          | Yes (via formattedContext)                                | **NO**                                       | **NO**                         | **YES** |
| `productRelationships.*`            | Yes          | Yes (via formattedContext)                                | **NO**                                       | **NO**                         | **YES** |
| `brandImages.*`                     | Yes          | Yes (summary count only)                                  | **NO**                                       | **NO**                         | **YES** |
| `brandProfiles.targetAudience`      | Yes          | **NO** (only `brandName`, `industry`, `values`, `styles`) | Partially (hardcoded fallback)               | Partially (hardcoded fallback) | **YES** |
| `brandProfiles.colorPreferences`    | Yes          | **NO**                                                    | **NO**                                       | Yes (image prompt)             | **YES** |
| `brandProfiles.voice`               | Yes          | **NO** (missing from Idea Bank prompt)                    | Yes (via `brandVoice`)                       | Yes                            | Partial |
| `brandProfiles.kbTags`              | Yes          | **NO**                                                    | **NO**                                       | **NO**                         | **YES** |
| `productAnalyses.category`          | Yes          | Yes                                                       | **NO**                                       | **NO**                         | Partial |
| `productAnalyses.targetDemographic` | Yes          | Yes                                                       | **NO**                                       | **NO**                         | **YES** |
| `productAnalyses.colors`            | Yes          | Yes                                                       | **NO**                                       | **NO**                         | **YES** |
| `productAnalyses.materials`         | Yes          | Yes                                                       | **NO**                                       | **NO**                         | **YES** |
| `productAnalyses.style`             | Yes          | Yes                                                       | **NO**                                       | **NO**                         | **YES** |
| `learnedAdPatterns.*`               | Yes          | Yes (via `patternExtractionService`)                      | **NO**                                       | **NO**                         | **YES** |
| `performingAdTemplates.*`           | Yes          | **NO** (not queried)                                      | **NO**                                       | **NO**                         | **YES** |
| `styleReferences.*`                 | Yes          | **NO** (separate UI flow)                                 | **NO**                                       | **NO**                         | Partial |

### Key Finding: Copywriting Service Has No Product Knowledge Integration

**The biggest gap is in `copywritingService.ts`.** It receives only what `GenerateCopyInput` provides, but the caller never enriches it with product knowledge data.

- `copywritingService` does NOT call `productKnowledgeService.buildEnhancedContext()`
- Product features, specifications, installation scenarios, and relationships are never sent to the copy LLM
- The PTCF prompt includes `productName`, `productDescription`, `industry`, and `benefits` — but these are passed directly from the request, not pulled from the enriched product knowledge
- `contentPlannerService.ts` calls `copywritingService.generateCopy()` but only passes `product.name` and `product.description` — it does not include `features`, `specifications`, `tags`, `enrichmentDraft`, or any relationship context

**Impact:** The ad copy LLM is working with minimal product information. A product with rich features, installation steps, and complementary product data generates copy that is just as generic as one with only a name and description.

### Data That EXISTS But Is NOT Used in LLM Prompts

1. **`installationScenarios`**: Rich multi-step guides exist in DB but are ONLY used in the Idea Bank suggestion prompt (via `formattedContext`). They are NOT passed to:
   - Copywriting (would help write "how-to install" ad copy)
   - Image generation (could inform scene composition)
   - Content Planner (could suggest installation-focused content)

2. **`brandImages`**: Reference photos exist in DB but are ONLY summarized as a count ("Historical Ad: 3 images") in the LLM context. The actual image URLs are:
   - NOT sent for vision analysis alongside product images
   - NOT used as style references for generation
   - NOT cross-referenced when matching templates

3. **`productRelationships`**: Complementary/alternative products ARE included in Idea Bank context, but:
   - NOT used in Copywriting (could enable "pairs well with X" ad copy)
   - NOT used in Content Planner (could suggest bundle/comparison posts)

4. **`enrichmentDraft`**: AI-generated enrichment data IS included in the `formattedContext` (line 370-385 of `productKnowledgeService.ts`), so it IS used in Idea Bank. However:
   - NOT used in Copywriting
   - NOT used in Content Planner

5. **`performingAdTemplates`**: The full performing ad templates table exists in the schema with rich data (layout patterns, color palettes, typography, content blocks, performance metrics), but:
   - NOT queried anywhere in `ideaBankService.ts`
   - NOT used for template matching
   - Only `adSceneTemplates` and `learnedAdPatterns` are used

6. **`brandProfiles.kbTags`**: These tags exist to filter KB content per brand but are never used in KB queries.

7. **`brandProfiles.targetAudience`**: This rich JSONB field (demographics, psychographics, painPoints) exists in the DB but:
   - Idea Bank prompt only uses `brandName`, `industry`, `brandValues`, `preferredStyles`
   - Content Planner hardcodes a fallback: `"B2B professionals"`

### Missing Product Data Fields (Gaps in the Schema)

1. **Target audience per product** (B2B vs B2C, age range, industry segment)
   - Currently only exists at brand-profile level, not per-product
   - Impact: A brand selling both consumer flooring and commercial rebar gets the same audience context

2. **Pricing tier / price range** (premium / mid-range / value / economy)
   - Affects tone: premium products need aspirational language, value products need ROI messaging
   - Currently no price data in the schema at all

3. **Seasonal relevance** (construction season, winter prep, spring renovations)
   - No field to indicate when a product is most relevant
   - Would enable time-aware content suggestions

4. **Competitor positioning** (unique selling points vs competitors)
   - `uniqueValueProp` exists in `adCopy` table but NOT in `products` table
   - Should be a persistent product attribute, not per-generation

5. **Customer FAQs** (common questions about the product)
   - Would dramatically improve educational content generation
   - Currently no FAQ storage

6. **Revenue importance / product priority tiers**
   - No way to indicate hero products vs commodity products
   - High-margin products should get more creative attention

7. **Certification / compliance info** (e.g., BS standards, CE marking)
   - Critical for B2B construction industry copy
   - Not stored in schema

8. **Minimum order quantity / delivery terms**
   - Very relevant for B2B ad copy (e.g., "no minimums", "next-day delivery")
   - Only available via enrichmentDraft if web-scraped

### LLM Prompt Quality Audit

#### 1. Idea Bank Service (`ideaBankService.ts`)

**System prompt:** None — uses a user-role-only prompt. The persona is embedded in the first line: "You are an expert advertising creative director."

**Strengths:**

- Includes vision analysis, KB context, enhanced product knowledge, brand guidelines, learned patterns, matched templates, upload descriptions
- Output format is well-specified with JSON schema
- Temperature 0.7 provides good variety

**Weaknesses:**

- **No explicit system prompt** — the persona instruction is mixed into the user content
- **Generic persona** — not specific to the user's business (e.g., "construction/steel materials")
- **Brand voice missing** — `brandProfile.voice` is NOT included in the Idea Bank prompt (line 720-727 only includes `brandName`, `industry`, `brandValues`, `preferredStyles`)
- **Target audience missing** — `brandProfile.targetAudience` is not sent
- **Hallucination risk: LOW** — product data is grounded in vision analysis and KB
- **Brand images are under-utilized** — only a count per category is shown, not actual URLs or descriptions

#### 2. Copywriting Service (`copywritingService.ts`)

**System prompt:** Embedded persona in PTCF format. "You are an expert social media ad copywriter specializing in {platform} advertising."

**Strengths:**

- Excellent PTCF framework with detailed instructions
- Platform-specific requirements are well-researched (2025 best practices)
- Hook pattern guidance is comprehensive (6 proven patterns)
- Character limits are enforced with strict max values
- Structured JSON output via `responseMimeType: 'application/json'`
- RAG context from KB is included

**Weaknesses:**

- **No product knowledge integration** — the biggest gap. Product features, specs, installation scenarios, relationships are all missing from the prompt
- **Hardcoded industry fallback** — `contentPlannerService` falls back to `"Construction/Steel"` instead of reading from brand profile
- **Target audience fallback is generic** — defaults to `"B2B professionals"` with hardcoded pain points `['Quality concerns', 'Delivery timing', 'Cost optimization']`
- **Hallucination risk: MEDIUM** — because the LLM receives minimal product info, it may invent features or benefits
- **No enrichment data** — even if a product has AI-enriched descriptions, installation context, or use cases, none of this reaches the copy LLM
- **No competitor/differentiator context** — copy can't emphasize what makes this product unique

#### 3. Content Planner Service (`contentPlannerService.ts`)

**System prompt:** Delegates to `copywritingService.generateCopy()` for copy generation.

**Strengths:**

- Maps template category to campaign objective correctly
- Infers copywriting framework from template post structure
- Parallel generation of copy + image prompt
- Partial success handling with `Promise.allSettled`

**Weaknesses:**

- **Minimal product data passed** — only `product.name` and `product.description` are used; `features`, `specifications`, `benefits`, `tags` are all ignored
- **No product knowledge service call** — does not use `productKnowledgeService.buildEnhancedContext()`
- **Image prompt is basic** — does not leverage installation scenarios, brand images, or product relationships
- **Brand profile usage is shallow** — only uses `preferredStyles` and `colorPreferences` for image, not the full voice/values/audience

---

## Part 2: UX Polish Audit

### Loading States

| Component                   | Has Loading? | Type                     | Fix Needed?                      |
| --------------------------- | ------------ | ------------------------ | -------------------------------- |
| `GalleryPage`               | Yes          | Skeleton grid (10 items) | No                               |
| `Pipeline`                  | Yes          | Spinner (TabLoader)      | No                               |
| `ContentPlanner`            | Yes          | Spinner (Loader2)        | Could use skeleton cards instead |
| `ApprovalQueue`             | Yes          | Skeleton (3 items)       | No                               |
| `CalendarView`              | Yes          | SkeletonGrid (5x7 grid)  | No                               |
| `SocialAccounts`            | Yes          | Skeleton (3 blocks)      | No                               |
| `Studio/ComposerView`       | N/A          | No data fetch            | No                               |
| `Studio/GeneratingView`     | Yes          | Animated orbital loader  | No                               |
| `Studio/ResultViewEnhanced` | N/A          | Renders only with data   | No                               |
| `IdeaBankPanel`             | Unknown      | Not audited in detail    | Check                            |

### Empty States

| Component              | Has Empty State? | Quality                                                                     | Fix Needed?                                     |
| ---------------------- | ---------------- | --------------------------------------------------------------------------- | ----------------------------------------------- |
| `GalleryPage`          | Yes              | Good — icon, message, "Go to Studio" CTA                                    | No                                              |
| `ContentPlanner`       | Partial          | No empty state for zero templates; balance shows 0/target which is adequate | Could add onboarding tip                        |
| `ApprovalQueue`        | Yes              | Good — "No items in queue" with CheckCircle icon                            | No                                              |
| `CalendarView`         | Yes              | Good — EmptyMonth component with "Schedule a post" CTA                      | No                                              |
| `SocialAccounts`       | Yes              | Good — "No Connected Accounts" card with setup guidance                     | No                                              |
| `Studio/ComposerView`  | Yes              | Good — Quick Start area is the default empty state                          | No                                              |
| `Studio (no products)` | Partial          | Product grid shows nothing if no products; no guidance to upload            | **YES — needs "Upload your first product" CTA** |

### Error States

| Component        | Has Error Handling?                                            | Shows Retry?                                   | Fix Needed?                           |
| ---------------- | -------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------- |
| `GalleryPage`    | No — `useQuery` default behavior                               | No retry button                                | **YES**                               |
| `ContentPlanner` | Partial — toast on mutation fail, but query errors not handled | No retry                                       | **YES — add error boundary or retry** |
| `ApprovalQueue`  | Yes — toast on fetch fail                                      | No retry button (manual Refresh button exists) | Acceptable                            |
| `CalendarView`   | Partial — `useQuery` default; no visible error UI              | No retry                                       | **YES**                               |
| `SocialAccounts` | Yes — toast on fetch fail                                      | Manual Refresh button exists                   | Acceptable                            |
| `Studio`         | Yes — ErrorBoundary wraps IdeaBankPanel and HistoryTimeline    | No retry                                       | Acceptable                            |
| `Copywriting`    | Server-side only                                               | N/A                                            | N/A                                   |

### Toast Messages

| Mutation                      | Has Success Toast?                                  | Has Error Toast? | Fix Needed?             |
| ----------------------------- | --------------------------------------------------- | ---------------- | ----------------------- |
| Schedule post                 | Yes (via SchedulePostDialog)                        | Yes              | No                      |
| Cancel post                   | Check                                               | Check            | Needs verification      |
| Approve content               | Yes                                                 | Yes              | No                      |
| Reject content                | Yes                                                 | Yes              | No                      |
| Bulk approve                  | Yes                                                 | Yes              | No                      |
| Bulk reject                   | Yes                                                 | Yes              | No                      |
| Mark as posted                | Yes                                                 | Yes              | No                      |
| Delete post (Content Planner) | Yes                                                 | Yes              | No                      |
| Disconnect account            | Yes                                                 | Yes              | No                      |
| Generate image                | Yes (via Studio)                                    | Yes              | No                      |
| Download image                | Partial (feedback via `handleDownloadWithFeedback`) | Check            | Needs verification      |
| Copy text                     | Yes (inline "Copied!")                              | No error case    | No                      |
| Sync from n8n                 | Yes ("Not Implemented" toast)                       | N/A              | Feature not implemented |

### First-Time User Experience

**What a brand new user with zero data sees:**

1. **Login page** — clean, functional
2. **After login → Studio (`/`)** — ComposerView renders immediately
   - Quick Start prompt is visible
   - "Choose Your Path" (Freestyle/Template) is visible
   - Product section shows empty grid — **no guidance to add products**
   - Template section works even without products (generic templates)
   - IdeaBankPanel requires at least 1 product or upload — **no guidance shown**

3. **Gallery (`/gallery`)** — empty state with "Create your first image in the Studio" CTA — **good**

4. **Pipeline (`/pipeline`)** — Content Planner shows zero balance, all categories at 0/target — **adequate but could have onboarding**

5. **Settings (`/settings`)** — works, shows API keys, brand profile, etc.

**Missing First-Time UX:**

- No onboarding wizard or tour
- No "Welcome" message after first login
- No "Getting Started" checklist (e.g., 1. Upload products, 2. Set up brand profile, 3. Generate your first ad)
- No prompt to set up brand profile before first generation
- Empty product grid in ComposerView gives no hint that products should be added via `/library`

### Missing Functionality (Buttons That Don't Work / Partial Implementations)

1. **Gallery Delete button (`<Button variant="destructive">Delete</Button>`)** — Line 89-92 of `GalleryPage.tsx`: The delete button renders but has **NO onClick handler**. It does nothing when clicked.

2. **"Sync Accounts from n8n" button** — Line 217-225 of `SocialAccounts.tsx`: Shows a toast saying `"Not Implemented"` with the comment `// TODO: Implement sync from n8n API`.

3. **Template admin routes** — Missing admin role checks:
   - `server/routes/templates.router.ts` lines 93, 102, 139, 170 all have `// TODO: Add admin check` comments
   - `server/routes.ts` lines 3396, 3401, 3431, 3455 — same TODOs

4. **Content Safety Service** — `server/services/approvalQueueService.ts` line 211: `// NOTE: This is a placeholder implementation until contentSafetyService is created` and line 216: `// TODO: Replace with contentSafetyService.evaluateSafety() when implemented`. The actual `contentSafetyService.ts` exists but has a TODO on line 47: `// TODO: Make this configurable per brand profile in future`.

5. **ApprovalQueue disconnect handling** — `server/routes.ts` line 4904: `// TODO: Update scheduledPosts table (Phase 8.2 - Approval Queue)` when disconnecting a social account.

6. **HistoryPanel tests** — `client/src/components/__tests__/HistoryPanel.test.tsx` lines 381, 402: `// Test passes as a placeholder for future implementation`.

### CSS / Accessibility Issues

1. **Skip to content link** exists in `App.tsx` line 189 — good
2. **ARIA attributes** are present on loading states (`role="status"`, `aria-live="polite"`, `aria-busy="true"`, `aria-label`) — good
3. **Gallery skeleton** has proper `aria-label="Loading gallery"` — good
4. **ApprovalQueue `confirm()` dialog** — Uses browser `confirm()` for delete (line 282) and bulk reject (line 351) instead of the project's `AlertDialog` component. Breaks UI consistency.

---

## Summary of Priority Fixes

### P0 — Critical (Fix Before Next Release)

1. **Gallery Delete button is non-functional** — Users see a Delete button that does nothing
2. **Copywriting has zero product knowledge integration** — Major quality gap in generated ad copy

### P1 — High Priority

3. **Pass product features/specs/enrichment to copywriting prompts** — Will dramatically improve copy quality
4. **Add brand voice and target audience to Idea Bank prompts** — Currently omitted
5. **Error state UI for GalleryPage and CalendarView** — Failed queries show nothing (blank)
6. **First-time UX: empty product grid needs guidance** — New users don't know they need to add products

### P2 — Medium Priority

7. **Integrate `performingAdTemplates` into template matching** — Rich data table never queried
8. **Pass `brandImages` URLs to vision analysis** — Currently only count is shown
9. **Use `brandProfiles.kbTags` for KB query filtering** — Field exists but never used
10. **Replace `confirm()` with AlertDialog in ApprovalQueue** — UI consistency
11. **Add product knowledge context to Content Planner service** — Currently minimal
12. **Complete admin role checks on template routes** — 6 TODOs

### P3 — Nice to Have

13. **First-time onboarding wizard/tour** — Would significantly improve activation
14. **Seasonal relevance and pricing fields in product schema** — Enables smarter content
15. **Customer FAQ storage** — Improves educational content generation
16. **Per-product target audience** — Better than brand-level only
17. **Content safety service brand-level configuration** — Currently hardcoded thresholds
