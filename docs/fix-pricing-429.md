# Fix: /api/pricing/estimate 429 Rate Limit

## Problem

The `/api/pricing/estimate` endpoint returns HTTP 429 (Too Many Requests) on production.
The frontend Studio page calls this endpoint multiple times rapidly (imageCount 0-6) when users
interact with the Studio, and the global rate limiter blocks most of these requests.

## Root Cause

**File:** `server/routes.ts` line 266 (before fix)

A global rate limiter was applied to ALL `/api/` routes:

```typescript
const rateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
});
app.use('/api/', rateLimiter);
```

This means `/api/pricing/estimate` shares the same 100-request/15-minute budget with every
other API endpoint. When the frontend fires 7 rapid pricing estimate calls plus normal API
activity, users quickly exceed the limit.

The `/api/pricing/estimate` endpoint is a lightweight, read-only calculation:

- It calls `estimateGenerationCostMicros()` (pure math, no external APIs)
- It queries `storage.getGenerationUsageRows()` (simple DB read)
- It returns a JSON pricing estimate

There is no reason to aggressively rate-limit this endpoint.

## Fix Applied

**File:** `server/routes.ts` lines 261-273

Exempt `/api/pricing/estimate` from the global rate limiter by checking `req.originalUrl`
before applying rate limiting:

```typescript
const rateLimitExemptPaths = new Set(['/api/pricing/estimate']);
const rateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
});
app.use('/api/', (req, res, next) => {
  if (rateLimitExemptPaths.has(req.originalUrl.split('?')[0] as string)) {
    return next();
  }
  return rateLimiter(req, res, next);
});
```

### Why this approach

- **Minimal change** -- only the rate limiter application logic is modified
- **Extensible** -- other lightweight endpoints can be added to the exempt set later
- **No impact on security** -- the endpoint does no writes, calls no external APIs,
  and is not a vector for abuse
- **Uses `req.originalUrl`** -- works correctly regardless of Express mount path;
  `split('?')[0]` strips query parameters for accurate path matching

## Frontend Note

The frontend calls `/api/pricing/estimate` 7 times in rapid succession (imageCount 0-6).
This could be optimized on the frontend by debouncing or batching, but it is not the cause
of the bug -- the backend should not be rate-limiting a cheap read-only endpoint this aggressively.
