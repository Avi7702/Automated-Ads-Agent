# Software Audit Issue List

Reference this while implementing and reviewing. Severity indicates release impact.

## Sev-1 (Block Release)

1. Broken authorization (IDOR/BOLA)
2. Missing auth on privileged or high-cost endpoints
3. Secret leakage in source/logs/errors
4. Critical race condition in writes or job processing
5. Production config mismatch causing runtime drift

## Sev-2 (Fix Before Scale)

6. N+1 queries in hot API paths
7. Weak or missing rate limiting strategy
8. Conflicting/duplicated middleware chains
9. Incomplete failure-path handling
10. Missing idempotency for webhooks/async retries
11. Data contract drift between backend and frontend
12. SSRF-prone fetch targets without allowlist

## Sev-3 (Reliability/Polish)

13. Silent catch blocks that hide failures
14. Missing cache invalidation/prefetch strategy
15. Dead code and duplicate rendering paths
16. Inaccurate user-facing status/error messages
17. Weak observability (logs/metrics/alerts gaps)

## Test Reliability Risks

18. Mock layer drift after refactor
19. Tests asserting old interfaces
20. Green tests with low behavioral value
21. E2E selectors fragile to UI copy changes
22. Hardcoded localhost endpoints in E2E

## UI Wiring Risks

23. Dead button (no handler or failed handler path)
24. Settings save but not read by backend
25. Component replacement incomplete
26. Missing loading/empty/error states

## Build/Release Risks

27. Build script drift from actual deployment runtime
28. No rollback command documented
29. Feature flag shipped enabled before verification
30. Missing smoke tests on staging/prod
