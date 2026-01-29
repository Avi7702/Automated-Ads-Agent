# 1. Redis for Ephemeral State

Date: 2026-01-29
Status: Accepted

## Context

Rate limiting (`server/middleware/rateLimit.ts`), login lockouts (`server/services/authService.ts`), and session storage (`server/app.ts`) all used in-memory JavaScript objects (plain objects and BoundedMaps). This created three problems:

1. **Lost on restart** -- Every deployment or crash reset all rate limit counters, login lockout windows, and active sessions. Users could bypass lockouts by waiting for a deploy.
2. **Broken with horizontal scaling** -- Railway can run multiple instances. In-memory state is per-process, so a user rate-limited on instance A could retry on instance B with a fresh counter.
3. **Unbounded memory growth** -- The rate limit store (`rateLimit.ts:18`) was a plain JS object with no eviction. Under sustained load, memory grew linearly with unique IPs.

The health endpoint (`/api/health`) had no visibility into any of this state.

## Decision

Use Redis for all ephemeral state: rate limit counters, login lockout tracking, session storage, and cache.

Specifically:

- **Rate limiting** uses Redis `INCR` + `EXPIRE` (sliding window counter) via `server/middleware/redisRateLimit.ts`. The existing `useRedis` option on the rate limit config interface toggles between backends.
- **Login lockouts** use Redis `INCR` with 15-minute TTL (`auth:lockout:{email}`) via `server/services/redisAuthLockout.ts`.
- **Sessions** use `connect-redis` session store in production (`server/app.ts`).
- **Graceful degradation** -- In development (or if Redis is temporarily unreachable), all three fall back to in-memory with a warning log. In production, Redis is required (`server/lib/validateEnv.ts` enforces `REDIS_URL`).

## Consequences

**Positive:**

- State survives deployments and restarts
- Multiple Railway instances share the same counters -- rate limiting and lockouts work correctly under horizontal scaling
- Memory usage is bounded on the application side (Redis handles TTL eviction)
- Health endpoint (`/api/health`) reports Redis connection status
- Foundation for future features that need shared state (queue metrics, Gemini health counters)

**Negative:**

- Redis becomes a required production dependency -- an outage affects rate limiting, sessions, and lockouts
- Added operational complexity: Redis must be monitored, backed up, and sized appropriately
- Development environment needs either a local Redis or explicit acceptance of in-memory fallback
- Slight latency increase (~1ms per Redis round-trip) for rate limit checks

**Mitigations:**

- Railway provides managed Redis with automatic restarts
- Graceful degradation means a brief Redis blip does not crash the application
- `REDIS_URL` validation at startup gives a clear error message if misconfigured
