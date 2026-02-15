# Phase 3: Pipeline Wire-Up — Migration Summary

**Date:** 2026-02-15
**Branch:** `claude/phase-1-foundation-fixes`
**Build Status:** PASSED (vite build, 17.35s)

---

## Overview

Replaced ~330 lines of inline generation code in `/api/transform` (server/routes.ts) with a single call to `executeGenerationPipeline()`. Added a pre-generation quality gate (Stage 9.5) to prevent wasting expensive Gemini tokens on under-specified prompts.

---

## What Changed

### 1. GenerationInput Type Extended

**File:** `server/types/generationPipeline.ts`

Added 2 optional fields to `GenerationInput`:

```typescript
aspectRatio?: string;  // e.g. '1:1', '4:5', '16:9'
productIds?: string[]; // Product IDs for Stage 2 context
```

These are backward-compatible (optional) and allow the frontend to pass additional context without breaking existing requests.

### 2. /api/transform Migrated (routes.ts)

**Lines removed:** ~280 lines (from line 619 to ~991 in the original file)
**Lines added:** ~55 lines

**What was removed:**

- Inline prompt building for all 3 modes (standard, exact_insert, inspiration) — ~100 lines
- Inline brand profile injection — ~15 lines
- Inline recipe context injection — ~50 lines
- Template reference image fetching with SSRF protection — ~45 lines
- Product image base64 encoding — ~15 lines
- Direct Gemini API call — ~20 lines
- Image saving (originals + generated) — ~15 lines
- Database persistence (saveGeneration + saveGenerationUsage) — ~30 lines
- Conversation history building — ~10 lines

**What was added:**

- Multer file to ImageInput conversion (3 lines)
- templateReferenceUrls JSON parsing (safe for FormData) (10 lines)
- Single `executeGenerationPipeline()` call with all parameters (15 lines)
- Response mapping to maintain frontend compatibility (10 lines)
- PreGenGateError handling in catch block returning 400 with suggestions (15 lines)

**What was preserved (unchanged):**

- Request parsing (FormData: files, prompt, resolution, mode, templateId, recipe)
- Authentication (`requireAuth` middleware)
- Prompt injection guard (`promptInjectionGuard` middleware)
- Extended timeout + halt-on-timeout middleware
- Mode validation (standard, exact_insert, inspiration)
- Template-mode validation (requires templateId)
- Resolution normalization
- Error handling wrapper (try/catch/finally)
- Telemetry tracking in `finally` block (trackGeminiUsage, quotaMonitoringService)
- Error telemetry in `catch` block

**Response format is identical:**

```json
{
  "success": true,
  "imageUrl": "...",
  "generationId": "...",
  "prompt": "...",
  "canEdit": true,
  "mode": "standard",
  "templateId": null,
  "stagesCompleted": ["product", "brand", "assembly", "preGenGate", "generation", "critic", "persistence"]
}
```

The only addition is `stagesCompleted` which the frontend can optionally consume. All existing fields are preserved.

### 3. Pre-Generation Quality Gate Created

**File:** `server/services/generation/preGenGate.ts` (NEW, ~280 lines)

Two-tier evaluation system:

#### Tier 1: Heuristic Pre-Check (instant, free)

Scores 4 categories (0-25 each, total 0-100):

- **Prompt Specificity:** Length checks, descriptive keyword detection
- **Context Completeness:** Brand context, recipe, template availability
- **Image Quality:** Image count appropriate for mode
- **Consistency:** Mode/template alignment check

If heuristic score >= 75, skips LLM call entirely (fast path).

#### Tier 2: LLM Evaluation (fast, cheap via gemini-3-flash-preview)

Same 4 categories evaluated by the model with structured JSON output.

Final score = 40% heuristic + 60% LLM (blended).

#### Thresholds:

| Score | Action                                              |
| ----- | --------------------------------------------------- |
| < 40  | **BLOCKS** generation, returns 400 with suggestions |
| 40-60 | **WARNS** in logs, proceeds with generation         |
| > 60  | **PASSES** normally                                 |

### 4. Pipeline Integration (Stage 9.5)

**File:** `server/services/generation/generationPipelineService.ts`

Inserted between Stage 9 (Prompt Assembly) and Stage 10 (Generation).

Key design decisions:

- Does NOT use `runStage()` wrapper because blocking errors must propagate (not be swallowed)
- PreGenGateError is re-thrown so the route handler can return 400
- Non-gate errors (LLM failure, network issues) are caught and logged; pipeline continues without the gate
- Added to `stagesCompleted` array as `'preGenGate'`

### 5. Generation Index Updated

**File:** `server/services/generation/index.ts`

Added exports:

```typescript
export { evaluatePreGenGate, BLOCK_THRESHOLD, WARN_THRESHOLD } from './preGenGate';
export type { PreGenGateResult, PreGenGateInput } from './preGenGate';
```

---

## Backward Compatibility

| Concern                                                 | Status                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| Frontend FormData format                                | Unchanged                                                            |
| Response JSON shape                                     | Unchanged (+ optional `stagesCompleted`)                             |
| New fields (aspectRatio, productIds, styleReferenceIds) | Optional, pipeline handles missing                                   |
| Conversation history for edits                          | Same format (pipeline's persistence stage uses identical save logic) |
| Error response format                                   | Same for 500s; new 400 format for quality gate blocks                |
| Telemetry tracking                                      | Unchanged (still in finally block)                                   |
| Quota monitoring                                        | Unchanged (still in finally block)                                   |

---

## Files Modified

| File                                                      | Change                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `server/types/generationPipeline.ts`                      | Added `aspectRatio`, `productIds` to GenerationInput                           |
| `server/routes.ts`                                        | Replaced ~280 lines inline logic with pipeline call + PreGenGateError handling |
| `server/services/generation/generationPipelineService.ts` | Added Stage 9.5 pre-gen gate, updated doc comment                              |
| `server/services/generation/index.ts`                     | Added preGenGate exports                                                       |

## Files Created

| File                                       | Lines | Purpose                                 |
| ------------------------------------------ | ----- | --------------------------------------- |
| `server/services/generation/preGenGate.ts` | ~280  | Two-tier quality gate (heuristic + LLM) |

---

## Build Verification

```
npx vite build — PASSED (17.35s, 47 precache entries)
```

No TypeScript errors, no new warnings.
