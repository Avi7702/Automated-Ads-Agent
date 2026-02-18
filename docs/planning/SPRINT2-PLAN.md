# Sprint 2 Execution Plan

**Created:** 2026-02-18
**Scope:** Single-company private app (no multi-tenant, no billing)
**Baseline:** 886 TS errors (pre-wave15), 116 @ts-nocheck files, 167 legacy routes, dual studio state, ~31% test coverage

---

## Epic 1: API Route Dedupe

### Current State

- `server/routes.ts`: 5,510 lines, **167 routes** with inline handlers (51.5% of total)
- `server/routes/*.router.ts`: 23 files, **157 routes** (48.5% of total)
- Zero duplicate paths (migration so far is clean)
- 2 handlers exceed 150 lines of inline business logic

### Scope

Migrate remaining 167 routes from `routes.ts` into domain routers. Extract inline business logic (>20 lines) into service methods. Delete `routes.ts` when empty.

### Phases

| Phase | Routes | Description                                                                                            | Estimate |
| ----- | ------ | ------------------------------------------------------------------------------------------------------ | -------- |
| P1    | 6      | Large handlers (>100 lines): `/api/transform`, `/api/settings/api-keys/*`, `/api/generations/:id/edit` | 1d       |
| P2    | 35     | Medium handlers (20-50 lines): products, enrichment, relationships, content-planner, installation      | 2d       |
| P3    | 126    | Small handlers (<20 lines): admin seeding, quota, monitoring, remaining CRUD                           | 2d       |

### Dependencies

- None (independent of other epics)

### Risks

| Risk                                      | Severity | Mitigation                                                   |
| ----------------------------------------- | -------- | ------------------------------------------------------------ |
| Breaking existing API clients             | HIGH     | Keep exact same paths + methods; integration tests per batch |
| Import cycle with services                | MEDIUM   | Service layer already exists; handlers just delegate         |
| Missing test coverage for migrated routes | MEDIUM   | Add route-level integration tests during migration           |

### Acceptance Criteria

- [ ] `routes.ts` deleted or contains only the `registerRoutes()` orchestrator
- [ ] All routes live in `server/routes/*.router.ts`
- [ ] No handler function exceeds 20 lines (logic in services)
- [ ] `npm run build` passes
- [ ] All existing API tests pass

---

## Epic 2: Studio State Unification

### Current State

Three parallel state systems run simultaneously:

1. **StudioContext** (useReducer): 16 state fields, 27 actions — used by 7 newer SmartCanvas components
2. **useStudioOrchestrator** (65+ useState): 1,167 lines, @ts-nocheck — used by 10 older Inspector/Canvas components
3. **useStudioState** (thin wrapper): Derived state + dispatchers for StudioContext

**Critical problem:** 14 state fields overlap between StudioContext and useStudioOrchestrator but are **not synchronized**. Changes in one don't reflect in the other.

### Scope

Unify into a single state source. Recommended: expand StudioContext reducer (predictable, testable, debuggable) and convert useStudioOrchestrator into a thin hook that consumes Context + manages UI-only local state.

### Phases

| Phase | Description                                                                                     | Estimate |
| ----- | ----------------------------------------------------------------------------------------------- | -------- |
| P1    | Audit + document which components use which state                                               | 0.5d     |
| P2    | Move 51 orchestrator-only fields into categorized sub-reducers (UI, generation, dialogs, media) | 2d       |
| P3    | Convert 10 orch-prop components to useStudioState consumers                                     | 1.5d     |
| P4    | Remove useStudioOrchestrator or reduce to query-only hook                                       | 0.5d     |
| P5    | Remove @ts-nocheck from unified files, add tests                                                | 1d       |

### Dependencies

- Should happen AFTER Epic 3 ts-nocheck burn-down targets Studio files
- Overlaps with Epic 3 (removing @ts-nocheck from useStudioOrchestrator.ts)

### Risks

| Risk                                       | Severity | Mitigation                                                          |
| ------------------------------------------ | -------- | ------------------------------------------------------------------- |
| Regression in generation flow              | CRITICAL | E2E test for generate button -> image output before starting        |
| State desync during incremental migration  | HIGH     | Feature flag: `USE_UNIFIED_STATE` to toggle per-component           |
| Performance regression from single context | MEDIUM   | Split into 2-3 focused contexts if re-render profiling shows issues |

### Acceptance Criteria

- [ ] Single state source for all Studio components
- [ ] No @ts-nocheck on state management files
- [ ] All Studio E2E tests pass (generation, history, templates)
- [ ] useStudioOrchestrator either deleted or reduced to <100 lines
- [ ] StudioLegacy.tsx confirmed deleted (already gone)

---

## Epic 3: @ts-nocheck Burn-down

### Current State

**116 files** with `@ts-nocheck`:

- 36 shadcn/ui components (`client/src/components/ui/*`) — expected, low priority
- 25 Studio components/hooks — tied to Epic 2
- 10 server services/routes — medium priority
- 15 other client components — medium priority
- 10 client hooks — medium priority
- 5 test files — low priority
- 15 other (pages, libs, fixtures)

**Non-UI @ts-nocheck: 80 files** (the actionable target)

### Scope

Remove @ts-nocheck from all non-UI files (80 files). UI component files (shadcn/ui) stay as-is unless individually touched.

### Phases

| Phase | Files | Description                                                                                                                              | Estimate |
| ----- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| P1    | 10    | Server services + routes (generationPipelineService, brandDNAService, modelTrainingService, training.router, weeklyPlanner.router, etc.) | 2d       |
| P2    | 25    | Studio components (tied to Epic 2 — ComposerView, ResultViewEnhanced, InspectorPanel tabs, IdeaBankBar, etc.)                            | 3d       |
| P3    | 15    | Other client components (CarouselBuilder, BeforeAfterBuilder, TextOnlyMode, CopywritingPanel, etc.)                                      | 2d       |
| P4    | 10    | Hooks (useStudioOrchestrator, useWeeklyPlan, useVoiceInput, useCollaboration, etc.)                                                      | 1.5d     |
| P5    | 15    | Pages, libs, test files (Studio.tsx, Login.tsx, sam2.ts, etc.)                                                                           | 1.5d     |
| P6    | 5     | Remaining stragglers + verification pass                                                                                                 | 0.5d     |

### Dependencies

- Epic 2 (Studio State) should run before or in parallel with P2/P4
- wave15/stabilization-combined must merge first (eliminates server TS errors)

### Risks

| Risk                                             | Severity | Mitigation                                                |
| ------------------------------------------------ | -------- | --------------------------------------------------------- |
| Type errors cascade when removing @ts-nocheck    | HIGH     | One file at a time; `tsc --noEmit` after each             |
| Third-party libs with poor types                 | MEDIUM   | Use targeted `as` casts (not `any`) at interop boundaries |
| Velocity trap: fixing types triggers refactoring | MEDIUM   | Strict rule: type-only fixes, no logic changes            |

### Acceptance Criteria

- [ ] @ts-nocheck count reduced from 116 to <=36 (UI-only)
- [ ] `npm run check` passes
- [ ] No new `any` types introduced
- [ ] No `@ts-ignore` or `@ts-expect-error` added

---

## Epic 4: Lint Debt Reduction

### Current State

- **95 eslint-disable directives** across codebase
- Top disabled rules: `no-explicit-any` (48), `no-unused-vars` (46), `no-console` (32)
- 28 of 95 are in e2e test files (appropriate)
- 7 router files disable `no-explicit-any` in production code
- `console.log` in production: minimal (2 instances, both appropriate)

### Scope

Eliminate eslint-disable directives in production code. Test/seed/script disables are acceptable.

### Phases

| Phase | Description                                                           | Estimate |
| ----- | --------------------------------------------------------------------- | -------- |
| P1    | Fix 7 router files with `no-explicit-any` disables — add proper types | 1d       |
| P2    | Fix remaining production `no-explicit-any` (non-test, non-seed)       | 1d       |
| P3    | Review `react-hooks/exhaustive-deps` disables — fix or document       | 0.5d     |
| P4    | Run `eslint --max-warnings 0` and fix remaining warnings              | 0.5d     |

### Dependencies

- Epic 3 (@ts-nocheck) reduces the same files — do together to avoid double-touching

### Risks

| Risk                                                    | Severity | Mitigation                                    |
| ------------------------------------------------------- | -------- | --------------------------------------------- |
| Fixing `any` types in routers cascades to service layer | MEDIUM   | Fix at boundary only (request/response types) |
| Exhaustive deps fixes cause infinite re-renders         | MEDIUM   | Test each fix in browser before committing    |

### Acceptance Criteria

- [ ] Zero eslint-disable in production code (server/routes, server/services, client/src non-test)
- [ ] `eslint --max-warnings 50` passes (down from current ~150 threshold)
- [ ] No new `any` types introduced

---

## Epic 5: Coverage Debt Reduction

### Current State

- **Actual coverage: 30.67%** (target: 80% server, 70% client)
- **43 of 46 server services** have zero test files
- **21 of 25 client components** have zero test files
- 11 integration tests excluded from CI (database dependency issues)
- Top untested files by LOC: routes.ts (5510), ideaBankService.ts (1353), storage.ts (1069)

### Scope

Raise coverage to passing CI thresholds. Focus on critical business logic first. Do NOT aim for 80% across the board — aim for CI green.

### Phases

| Phase | Description                                                                                                                                                     | Estimate |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| P1    | Fix CI test exclusions — mock DB deps so 11 excluded tests can run                                                                                              | 2d       |
| P2    | Add unit tests for top 5 untested services (ideaBankService, generationPipelineService, contentFormatterService, approvalQueueService, apiKeyValidationService) | 3d       |
| P3    | Add unit tests for top 5 untested client components (AdaptiveUploadZone, ProductEnrichmentForm, BeforeAfterBuilder, ContentPlannerGuidance, TextOnlyMode)       | 2d       |
| P4    | Add route-level integration tests for migrated routes (ties to Epic 1)                                                                                          | 2d       |
| P5    | Lower per-file threshold to realistic level or configure istanbul ignore for seed/example files                                                                 | 0.5d     |

### Dependencies

- Epic 1 (Route Dedupe) — migrated routes need tests (P4)
- Epic 3 (@ts-nocheck) — easier to write tests for typed code

### Risks

| Risk                                                | Severity | Mitigation                                                    |
| --------------------------------------------------- | -------- | ------------------------------------------------------------- |
| CI still fails even after raising coverage          | HIGH     | Adjust thresholds to match actual capacity; add incrementally |
| Mocking Gemini/AI calls is complex                  | MEDIUM   | Use MSW + fixtures pattern already established                |
| Tests pass locally but fail in CI (env differences) | MEDIUM   | Match CI Node version (v20); use same vitest config           |

### Acceptance Criteria

- [ ] CI passes (`npm test` green in GitHub Actions)
- [ ] Server coverage >= 50% (up from 31%)
- [ ] Client coverage >= 50% (up from ~30%)
- [ ] Zero test files excluded from CI
- [ ] Top 10 services by LOC all have test files

---

## Priority Order (Sprint 2 Execution Sequence)

```
Week 1:  Epic 1 P1 (large route handlers)
         Epic 3 P1 (server ts-nocheck)
         Epic 5 P1 (fix CI test exclusions)

Week 2:  Epic 1 P2 (medium route handlers)
         Epic 3 P2+P3 (studio + client component ts-nocheck)
         Epic 4 P1 (router lint fixes)

Week 3:  Epic 2 P1-P3 (studio state unification)
         Epic 5 P2 (top 5 service tests)
         Epic 1 P3 (small route handlers)

Week 4:  Epic 2 P4-P5 (complete studio unification)
         Epic 3 P4-P6 (remaining ts-nocheck)
         Epic 5 P3-P5 (client tests + CI config)
         Epic 4 P2-P4 (remaining lint)
```

### Why This Order

1. **Route dedupe first** — independent, unblocks other work, immediate code quality win
2. **Server ts-nocheck early** — server code is already mostly typed from wave15
3. **CI test exclusions early** — unblocks coverage tracking for everything else
4. **Studio unification in week 3** — needs server/client stabilization first
5. **Coverage last** — benefits from all prior typing/structure improvements
