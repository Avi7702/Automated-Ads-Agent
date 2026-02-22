# Project Audit Checklist Template

Use this checklist quarterly and before major architecture shifts.

## A. Product And Scope

- [ ] Product goal is explicit and unchanged
- [ ] Out-of-scope list exists and is enforced
- [ ] Feature flags cover all new user-facing changes

## B. Architecture

- [ ] Locked zones documented and respected
- [ ] Service layer contains business logic (not routes)
- [ ] Shared contracts match route behavior
- [ ] No duplicate route/component ownership patterns

## C. Security

- [ ] All privileged routes require auth
- [ ] CSRF protection active for mutating endpoints
- [ ] Rate limiting present for expensive and AI endpoints
- [ ] Secrets never committed in source/config
- [ ] Unsafe remote fetch inputs blocked (SSRF guard)

## D. Data Integrity

- [ ] Schema and app behavior are in sync
- [ ] Migrations are additive and reversible
- [ ] No raw SQL interpolation
- [ ] Idempotency considered for retries/webhooks/jobs

## E. Frontend Integrity

- [ ] No dead buttons or no-op UI controls
- [ ] Component replacement is complete (no duplicate UIs)
- [ ] Error states are visible and actionable
- [ ] Empty/loading/offline states are explicit

## F. Performance

- [ ] Hot endpoints avoid N+1 queries
- [ ] Heavy list rendering is bounded/paginated
- [ ] Client prefetch and cache strategy documented
- [ ] Critical path latency monitored

## G. Testing

- [ ] Unit/integration suite green
- [ ] E2E smoke suite green
- [ ] Coverage is above target for changed modules
- [ ] Tests validate behavior, not stale implementation details

## H. CI/CD

- [ ] Typecheck, lint, tests, build are gated
- [ ] Security guard checks run in CI
- [ ] Release readiness score exists for latest deploy
- [ ] Rollback playbook is documented

## I. Observability

- [ ] Structured logs with request correlation IDs
- [ ] Health endpoint includes critical dependencies
- [ ] Alert thresholds and on-call response are defined

## J. Documentation

- [ ] `CLAUDE.md`, project context, and control manifest are current
- [ ] Incident and release docs reflect current architecture
