# Universal PR Audit Checklist

Review every PR against this checklist.

## Sev-1 (Must Fix Before Merge)

- [ ] No auth/authorization regression
- [ ] No secret exposure in code/logs/errors
- [ ] No unauthenticated high-cost endpoint
- [ ] No data corruption risk (race, non-idempotent retry loop)

## Sev-2 (Must Fix Before Release)

- [ ] No N+1 query on critical endpoints
- [ ] No silent catch blocks hiding failures
- [ ] No API contract drift between client/server
- [ ] No dead buttons or disconnected UX controls
- [ ] Error states are user-visible and accurate

## Sev-3 (Quality/Polish)

- [ ] Naming, structure, and ownership are clear
- [ ] Docs updated for behavior changes
- [ ] Logs/metrics added where operationally needed

## Test Review

- [ ] Unit/integration tests cover changed logic
- [ ] E2E coverage for changed user journey (or justified defer)
- [ ] Tests validate behavior, not implementation detail only

## CI Gates

- [ ] Typecheck green
- [ ] Lint green
- [ ] Build green
- [ ] Core tests green

## Final Decision

- [ ] APPROVE
- [ ] REQUEST CHANGES
- [ ] BLOCK (Sev-1)
