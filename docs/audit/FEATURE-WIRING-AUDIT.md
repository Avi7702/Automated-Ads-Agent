# Feature Wiring Audit

Run after each feature batch and before release candidate.

## Phase 1: Route Inventory

- [ ] Every new route has handler + validation + tests
- [ ] Redirect and auth edge paths are tested

## Phase 2: Dead Button Audit

- [ ] Every clickable UI control triggers intended action
- [ ] Error path is visible to the user (no silent fail)
- [ ] Disabled state is intentional and explained

## Phase 3: Settings Wiring

- [ ] Settings saved by UI are persisted
- [ ] Backend reads persisted settings in runtime path
- [ ] Defaults are deterministic when settings missing

## Phase 4: Data Flow Integrity

- [ ] Frontend payload shape matches backend expectations
- [ ] Shared contract and runtime behavior match

## Phase 5: State Bugs

- [ ] No stale prop-to-state initialization without sync
- [ ] No race between async load and user actions

## Phase 6: Error Semantics

- [ ] 401/403/429/500 produce accurate user messages
- [ ] Retry behavior is explicit and bounded

## Phase 7: UX Text Accuracy

- [ ] UI copy reflects real backend state and capabilities
- [ ] "Coming soon" markers are explicit where functionality is partial

## Phase 8: Analytics/Logging

- [ ] Critical user actions emit traceable logs/events

## Phase 9: Integration Scenarios

- [ ] Happy path works end-to-end
- [ ] Failure path works end-to-end
- [ ] Recovery path (retry/refresh/re-auth) is verified

## Phase 10: Sign-off

- [ ] Dev sign-off
- [ ] QA sign-off
- [ ] Product sign-off
