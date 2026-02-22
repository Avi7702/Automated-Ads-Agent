# Release Readiness Scoring Matrix

Score each category from `0` to `2`:

- `0` = failing / unknown
- `1` = partial / risk accepted
- `2` = complete / verified

## Categories

1. Scope correctness
2. Dependency phase completed (schema -> backend -> frontend -> test -> verify)
3. Type safety
4. API contract validation
5. Auth/authorization correctness
6. Security controls (CSRF, rate limit, secrets)
7. Error handling quality
8. Unit/integration tests
9. E2E smoke stability
10. Coverage on changed business-critical modules
11. Performance sanity (hot paths)
12. Observability/logging
13. Feature wiring (no dead controls)
14. Feature flag strategy
15. Rollback readiness
16. Documentation updated
17. CI pipeline green
18. Staging smoke checks
19. Production smoke checks plan
20. Incident response ownership clear
21. Known risk register reviewed

## Total

- Max score: `42`

## Hard Gates (NO-GO if any true)

- Any open Sev-1 issue
- Failing typecheck/lint/test/build gate
- No rollback plan
- Security-critical endpoint unauthenticated

## Decision Thresholds

- `GO`: 36-42 and no hard gate failures
- `GO WITH CONDITIONS`: 30-35, no Sev-1, explicit risk sign-off
- `NO-GO`: <30 or any hard gate failure

## Current Release Worksheet

- Date: `2026-02-22`
- Commit: `5d866f0`
- Environment: `Local full-project gate run`
- Score: `16/42`
- Decision: `NO-GO` (hard gate failures: lint + tests)
- Required follow-ups:
  1. Update integration tests for current Studio/Agent UX (remove old upload selector assumptions).
  2. Resolve lint strategy (warning debt burn-down or scoped lint with temp snapshot exclusions).
  3. Re-run all four gates and attach fresh report.
