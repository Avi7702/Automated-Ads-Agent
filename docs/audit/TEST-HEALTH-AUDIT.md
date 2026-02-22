# Test Health Audit

Use this before trusting CI results for release decisions.

## 1. Coverage Quality

- [ ] Changed critical modules have meaningful test coverage
- [ ] Coverage is not inflated by low-value snapshots

## 2. Contract Fidelity

- [ ] Tests reflect current API contracts and schemas
- [ ] No stale mocks from pre-refactor interfaces

## 3. Failure Signal Strength

- [ ] Failing behavior is detectable by tests (red path exists)
- [ ] Tests fail when behavior regresses (not overly mocked)

## 4. E2E Stability

- [ ] No brittle exact-text selectors for dynamic UI
- [ ] Modal/overlay interactions are deterministic
- [ ] Environment URLs are configurable and not hardcoded

## 5. Execution Hygiene

- [ ] Unit/integration suite runtime acceptable
- [ ] Flaky tests tracked and triaged
- [ ] CI and local runs produce consistent outcomes

## Summary

- Overall confidence: High / Medium / Low
- Blocking gaps:
- Action items:
