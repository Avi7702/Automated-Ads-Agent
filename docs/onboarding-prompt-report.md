# Onboarding & Prompt Improvement Report

**Date:** 2026-02-12
**Task ID:** WS-C6
**Status:** Complete

---

## Task 1: BusinessOnboarding.tsx

### Finding: Already Implemented

The `BusinessOnboarding.tsx` component already exists at:
`client/src/components/onboarding/BusinessOnboarding.tsx`

It implements all 7 required wizard steps:

1. **Welcome** -- "Let's set up your content strategy" intro with Sparkles icon
2. **Industry & Niche** -- Dropdown for industry (10 options) + free text niche input
3. **Differentiator** -- Textarea for competitive advantages
4. **Target Customer** -- B2B/B2C/Both toggle, demographics input, pain points (badge chips + Enter key), decision factors (badge chips + Enter key)
5. **Product Ranking** -- Lists all products with tier selector (Flagship/Core/Supporting/New) per product, handles empty state
6. **Content Themes** -- Suggested theme chips (8 pre-defined) + custom text input, selected themes shown as removable badges
7. **Review & Confirm** -- Summary of all selections with "Edit" buttons per section

### Integration

- **OnboardingGate** (`client/src/components/onboarding/OnboardingGate.tsx`) wraps the app in `App.tsx` line 202
- Shows as a full-screen overlay when `onboardingComplete === false`
- Users can "Skip for now" to dismiss
- On completion, calls PUT `/api/intelligence/business` and POST `/api/intelligence/priorities/bulk`
- Uses `useSaveBusinessIntelligence` and `useBulkSetPriorities` hooks from `useBusinessIntelligence.ts`
- Shows success toast and invalidates intelligence query cache

### Conclusion

No changes needed. The component is production-ready and correctly integrated.

---

## Task 2: LLM Prompt Improvements

### Problem Statement

The knowledge audit (`docs/knowledge-ux-audit.md`) identified that:

1. **copywritingService.ts** had ZERO product knowledge integration -- the LLM only received `productName`, `productDescription`, and `industry` from the request. Product features, specifications, enrichment data, related products, and installation scenarios were all missing.

2. **ideaBankService.ts** omitted `brandProfile.voice` (principles, wordsToUse, wordsToAvoid) and `brandProfile.targetAudience` (demographics, psychographics, painPoints) from the suggestion prompts.

### Changes Made

#### 1. `server/services/copywritingService.ts`

**Import added:**

```typescript
import { productKnowledgeService, type EnhancedProductContext } from './productKnowledgeService';
```

**`generateCopy()` method updated (lines 83-120):**

- Accepts optional `options?: { productId?: string; userId?: string }` parameter
- When productId + userId are provided, auto-fetches enhanced product context via `productKnowledgeService.buildEnhancedContext()`
- Passes the context to `generateSingleCopy()` for each variation
- Gracefully degrades if context fetch fails (logs warning, continues without it)

**`generateSingleCopy()` method updated (lines 122-124):**

- Accepts optional `enhancedContext?: EnhancedProductContext | null` parameter
- Passes it through to `buildPTCFPromptWithRAG()`

**`buildPTCFPromptWithRAG()` method enhanced (lines 310-470):**

- Accepts optional `enhancedContext?: EnhancedProductContext | null` parameter
- Builds a new `DEEP PRODUCT KNOWLEDGE` section in the prompt when enhanced context is available
- Includes the following product data in the LLM prompt:
  - **Product Features** (key-value pairs, up to 10)
  - **Technical Specifications** (key-value pairs, up to 10)
  - **Product Benefits** (from DB, up to 6)
  - **Product Category & Tags** (up to 8 tags)
  - **Installation Context** (from enrichmentDraft)
  - **Real-World Use Cases** (from enrichmentDraft, up to 5)
  - **Related Products** (cross-sell/bundling opportunities, up to 4, with relationship type and description)
  - **Installation/Usage Scenarios** (for how-to/educational copy, up to 3)
- All values use optional chaining to handle missing fields gracefully
- Includes instruction: "use this to write specific, accurate copy -- never invent product details"

#### 2. `server/services/ideaBankService.ts`

**`buildSuggestionPrompt()` function enhanced (lines 720-770):**

Added after existing Brand Guidelines section:

- **Brand Voice** subsection:
  - Voice Principles (from `brandProfile.voice.principles`)
  - Words to USE (from `brandProfile.voice.wordsToUse`)
  - Words to AVOID (from `brandProfile.voice.wordsToAvoid`)

- **Target Audience** subsection:
  - Demographics (from `brandProfile.targetAudience.demographics`)
  - Psychographics (from `brandProfile.targetAudience.psychographics`)
  - Pain Points (from `brandProfile.targetAudience.painPoints`)

**`buildTemplateSlotPrompt()` function enhanced (lines 1036-1075):**

Same brand voice and target audience additions applied to the template mode prompt builder, ensuring consistency across both freestyle and template suggestion modes.

### Impact

| Metric                             | Before                          | After                                                                                                         |
| ---------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Product data fields in copy prompt | 3 (name, description, industry) | 12+ (features, specs, benefits, category, tags, use cases, installation context, related products, scenarios) |
| Brand voice in Idea Bank           | Not included                    | Principles, wordsToUse, wordsToAvoid                                                                          |
| Target audience in Idea Bank       | Not included                    | Demographics, psychographics, painPoints                                                                      |
| Hallucination risk (copy)          | MEDIUM (minimal product info)   | LOW (grounded in DB data)                                                                                     |

### Build Verification

- `npx vite build` -- **PASSED** (built in ~28s)
- No new TypeScript errors introduced (all existing errors are pre-existing)
- All changes use optional chaining for backward compatibility

### Files Modified

| File                                    | Lines Changed                                                                                             | Change Type                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `server/services/copywritingService.ts` | +1 import, +30 lines in generateCopy, +3 lines in generateSingleCopy, +65 lines in buildPTCFPromptWithRAG | Product knowledge integration |
| `server/services/ideaBankService.ts`    | +25 lines in buildSuggestionPrompt, +25 lines in buildTemplateSlotPrompt                                  | Brand voice + target audience |

### Backward Compatibility

All changes are **additive and optional**:

- `copywritingService.generateCopy(request)` -- existing callers continue to work without changes
- `copywritingService.generateCopy(request, { productId, userId })` -- new callers can opt into product knowledge enrichment
- Brand voice and target audience in Idea Bank only render if the data exists in `brandProfile.voice` and `brandProfile.targetAudience`
- No schema changes, no API contract changes, no database migrations required
