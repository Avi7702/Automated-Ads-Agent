# SPEC: Image Generation Pipeline — Wire-Up + Pre-Generation QA Gate

> Created by: team-lead (from user brief + codebase analysis)
> Date: 2026-02-15
> Status: DRAFT

## Objective

Fix 5 disconnected wires in the image generation system and add a pre-generation QA gate that validates all inputs before spending a Gemini API call. The `/api/transform` endpoint currently bypasses the `generationPipelineService.ts` pipeline and does everything inline with missing context. This spec migrates it to use the pipeline and fills the remaining gaps.

## Use Case / Intent

The image generation system has two code paths: an older inline handler in `server/routes.ts` (lines 557-890) and a newer `generationPipelineService.ts` that already wires vision, KB, style, patterns, and brand context. The inline handler is what actually runs in production, and it's missing 5 critical integrations. Rather than patching the inline handler, we migrate `/api/transform` to route through the pipeline — then fill the gaps the pipeline itself has (aspect ratio, frontend product metadata).

A pre-generation QA gate (Stage 9.5) is added between prompt assembly and generation. It uses Gemini to intelligently evaluate whether the assembled prompt + context is coherent and complete enough to produce a good image. If not, it blocks with a 422 error detailing what's missing.

## Constraints

- [ ] No new paid dependencies — use existing Gemini client
- [ ] Must not break existing generation flow for users who don't select products
- [ ] All new code uses `@ts-nocheck` (project convention for studio components)
- [ ] Branch: `claude/pre-gen-qa-gate` — never push to main
- [ ] Model for image generation stays `gemini-3-pro-image-preview`
- [ ] Model for QA gate: `gemini-2.5-flash` (fast, cheap evaluation)
- [ ] Build must pass: `npx vite build`
- [ ] No onboarding flows — single-company tool

## Acceptance Criteria

### Wire 1: Product Metadata Sent from Frontend

- [ ] 1. Frontend `useStudioOrchestrator.ts` sends `productIds` in FormData when generating
- [ ] 2. Backend `/api/transform` parses `productIds` from the request
- [ ] 3. Backend looks up product data via `storage.getProductById()` for each ID
- [ ] 4. Product names, descriptions, and categories are available to the pipeline

### Wire 2: Vision Analysis Called

- [ ] 5. `analyzeProductImage()` from `visionAnalysisService.ts` is called for uploaded product images
- [ ] 6. Structured metadata (materials, colors, style, category, usageContext) is injected into GenerationContext
- [ ] 7. Vision analysis failures are non-blocking (log warning, continue without)

### Wire 3: Knowledge Base (RAG) Queried

- [ ] 8. `queryFileSearchStore()` from `fileSearchService.ts` is called with product + prompt context
- [ ] 9. Relevant brand guidelines and ad examples are injected into the prompt
- [ ] 10. KB query failures are non-blocking (log warning, continue without)

### Wire 4: Style References Connected

- [ ] 11. Frontend sends `styleReferenceIds` in FormData
- [ ] 12. Backend parses and fetches style references via `storage.getStyleReferenceById()`
- [ ] 13. Style directive is built and injected into the prompt via `buildStyleDirective()`
- [ ] 14. Style reference failures are non-blocking

### Wire 5: Aspect Ratio Passed

- [ ] 15. Frontend sends `aspectRatio` in FormData (e.g., "1:1", "16:9", "9:16", "4:5")
- [ ] 16. Aspect ratio is included in the Gemini prompt text
- [ ] 17. Aspect ratio is passed to Gemini config if the API supports it

### Migration: /api/transform Routes Through Pipeline

- [ ] 18. `/api/transform` constructs a `GenerationInput` and calls `executeGenerationPipeline()`
- [ ] 19. All inline prompt-building logic in routes.ts is removed (replaced by pipeline)
- [ ] 20. The pipeline's `GenerationInput` type is extended to include `aspectRatio` and `productIds`
- [ ] 21. Response format remains identical to current (no frontend breakage)
- [ ] 22. Edit flow (`/api/transform/edit`) continues to work (not affected by this change)

### Pre-Generation QA Gate (Stage 9.5)

- [ ] 23. New `preGenGate.ts` module in `server/services/generation/`
- [ ] 24. Gate runs AFTER prompt assembly (Stage 9) and BEFORE generation (Stage 10)
- [ ] 25. Gate sends assembled prompt + context summary to Gemini 2.5 Flash for evaluation
- [ ] 26. Gemini evaluates: prompt coherence, component completeness, potential issues
- [ ] 27. Gate returns a structured result: `{ passed: boolean, score: number, issues: string[], suggestions: string[] }`
- [ ] 28. If gate FAILS (score below threshold): pipeline throws with a 422-compatible error containing the issues array
- [ ] 29. If gate PASSES: generation proceeds normally
- [ ] 30. Gate failures (Gemini API error) are non-blocking — default to pass (same pattern as critic stage)
- [ ] 31. Gate results are logged for analytics

### Type Updates

- [ ] 32. `GenerationInput` in `generationPipeline.ts` extended with `aspectRatio?: string` and `productIds?: string[]`
- [ ] 33. New `PreGenGateResult` type defined
- [ ] 34. `GenerationContext` gets optional `preGenGate?: PreGenGateResult` field

## Edge Cases

- [ ] What happens when no products are selected? — Generation proceeds with prompt-only mode (no product context). Gate evaluates accordingly.
- [ ] What happens when product lookup fails for some IDs? — Log warning, continue with products that succeeded. Gate checks if ANY product context exists when productIds were provided.
- [ ] What happens when all context stages (2-8) fail? — Gate catches this: prompt is bare user text with no enrichment. Blocks with "insufficient context" error.
- [ ] What happens when the QA gate Gemini call fails? — Default to pass (non-blocking). Log the error.
- [ ] What happens when aspectRatio is invalid/unsupported? — Validate against allowed values. Reject with 400 if invalid.
- [ ] What happens when styleReferenceIds reference deleted styles? — Skip missing references, log warning. Continue with whatever references survived.
- [ ] What happens with the existing edit flow? — Edit flow (`/api/transform/edit`) is NOT affected. It uses conversation history, not the generation pipeline.
- [ ] What happens when user sends images but no productIds? — Valid case (ad-hoc image transform). Vision analysis still runs on uploaded images. Gate adjusts expectations.

## Integration Points

| File/System                                               | Relationship                                                                           | Direction               |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------- |
| `server/routes.ts:557-890`                                | `/api/transform` — refactor to call pipeline                                           | writes (major refactor) |
| `client/src/hooks/useStudioOrchestrator.ts:537-640`       | Frontend generate handler — add productIds, styleReferenceIds, aspectRatio to FormData | writes                  |
| `server/services/generation/generationPipelineService.ts` | Pipeline orchestrator — add Stage 9.5, extend GenerationInput                          | writes                  |
| `server/services/generation/promptBuilder.ts`             | Prompt builder — add aspect ratio to prompt                                            | writes                  |
| `server/services/generation/criticStage.ts`               | Reference pattern for gate structure                                                   | reads                   |
| `server/services/visionAnalysisService.ts`                | Vision analysis — already called by pipeline Stage 5                                   | reads (verify)          |
| `server/services/fileSearchService.ts`                    | KB/RAG — already called by pipeline Stage 6                                            | reads (verify)          |
| `server/services/styleAnalysisService.ts`                 | Style — already called by pipeline Stage 4                                             | reads (verify)          |
| `server/types/generationPipeline.ts`                      | Type definitions — extend                                                              | writes                  |
| `server/services/ideaBankService.ts`                      | Gold standard reference for wiring pattern                                             | reads                   |

Dependencies:

- Depends on: Existing pipeline infrastructure (stages 2-8 already work)
- Depended on by: Frontend Studio UI (response format must not change)

## Test Scenarios (BDD Format)

### Happy Path

**Scenario 1: Full pipeline with all context**
Given: User has products selected, style references chosen, aspect ratio set
When: User clicks generate with a prompt
Then: Frontend sends productIds, styleReferenceIds, aspectRatio in FormData
And: Pipeline runs all stages (product, brand, style, vision, KB, patterns)
And: Pre-gen gate passes (all context present and coherent)
And: Image is generated and returned

**Scenario 2: Prompt-only generation (no products)**
Given: User has no products selected
When: User types a prompt and clicks generate
Then: Pipeline runs with prompt-only mode
And: Product, vision, style stages are skipped (no data)
And: Pre-gen gate passes (valid for prompt-only mode)
And: Image is generated

### Error Paths

**Scenario 3: Pre-gen gate blocks — insufficient context**
Given: User has products selected but all context stages failed
When: Pipeline reaches Stage 9.5
Then: Gate detects bare prompt with no enrichment despite products being selected
And: Returns 422 with issues array explaining what's missing
And: Frontend can display the issues to the user

**Scenario 4: Invalid aspect ratio**
Given: User sends aspectRatio "99:1"
When: Backend validates the input
Then: Returns 400 with "Invalid aspect ratio" message

### Edge Cases

**Scenario 5: Partial product lookup failure**
Given: User sends 3 productIds, 1 doesn't exist in DB
When: Pipeline fetches products
Then: 2 products are loaded, 1 is logged as missing
And: Pipeline continues with available products

**Scenario 6: QA gate Gemini call fails**
Given: Gemini 2.5 Flash is temporarily down
When: Pre-gen gate tries to evaluate
Then: Gate defaults to pass (non-blocking)
And: Generation proceeds normally
And: Error is logged

**Scenario 7: Style references point to deleted records**
Given: User's saved styleReferenceIds include a deleted style
When: Pipeline fetches style references
Then: Deleted reference is skipped with warning
And: Remaining references are used

## Verification Steps

- [ ] Run: `npm test` (all tests pass)
- [ ] Run: `npx vite build` (no build errors)
- [ ] Manual: Generate image with products selected — verify product context in logs
- [ ] Manual: Generate image with style references — verify style directive in logs
- [ ] Manual: Generate image with aspect ratio — verify it appears in prompt
- [ ] Manual: Generate with intentionally bad input — verify 422 response with issues
- [ ] Manual: Check that edit flow still works after refactor

## Technology Verification

| Technology                 | Version Used       | Verified Latest? | Source         |
| -------------------------- | ------------------ | ---------------- | -------------- |
| Gemini 2.5 Flash           | Latest             | [ ] Yes          | Google AI docs |
| Gemini 3 Pro Image Preview | Latest             | [ ] Yes          | Google AI docs |
| Express.js                 | Current in project | [ ] Yes          | package.json   |

- [ ] Web-searched for latest versions of all dependencies
- [ ] No banned patterns used
- [ ] Checked official docs for current API signatures

## Implementation Notes

- **Gold standard reference**: `ideaBankService.ts` shows the correct wiring pattern for vision + KB + templates + patterns
- **Pipeline already handles Stages 2-8**: Verify each stage works before adding new ones. Don't re-implement what exists.
- **Pre-gen gate follows criticStage.ts pattern**: Same structure (evaluate → parse JSON response → pass/fail), but runs BEFORE generation
- **Frontend changes are minimal**: Just add 3 fields to FormData (productIds, styleReferenceIds, aspectRatio)
- **Response format must not change**: Frontend expects `{ generationId, imageUrl, prompt, canEdit, mode, stagesCompleted }`
- **@ts-nocheck on new files**: Project convention for studio-related code

## Revision History

| Date       | Change                                                   | Author    |
| ---------- | -------------------------------------------------------- | --------- |
| 2026-02-15 | Initial spec created from user brief + codebase analysis | team-lead |
