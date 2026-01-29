# Incident Response Playbook

**Production URL:** https://automated-ads-agent-production.up.railway.app
**Health Check:** `GET /api/health`
**Sentry Dashboard:** Check Sentry project for CRITICAL alerts

---

## Scenario: Gemini API Outage

**Detection:** Health endpoint returns `gemini.status: "down"` or `gemini.status: "degraded"`. Sentry fires a CRITICAL alert when the failure rate exceeds 50% over 5 minutes. Users report that image generation, copywriting, and idea bank features return errors.

**Impact:** All AI-powered features are unavailable -- ad generation, copy generation, idea bank suggestions, product enrichment, and vision analysis. CRUD operations (product library, templates, user accounts, approval queue) continue working normally.

**Severity:** CRITICAL

**Mitigation Steps:**

1. Confirm the outage by checking the health endpoint:
   ```bash
   curl -s https://automated-ads-agent-production.up.railway.app/api/health | jq '.gemini'
   ```
2. Check the [Google Cloud Status Dashboard](https://status.cloud.google.com/) for Vertex AI / Gemini incidents
3. Verify the API key is valid (not rotated or expired) by checking Railway environment variables
4. Review Sentry for the specific error pattern (quota exhaustion vs. service unavailable vs. authentication failure)
5. If quota exhaustion: check usage in Google Cloud Console; consider requesting a quota increase
6. If service unavailable: this is a Google-side issue. No action possible beyond waiting for resolution
7. Communicate status to users if outage exceeds 15 minutes

**Recovery Verification:**
- Health endpoint returns `gemini.status: "healthy"` with `failureRate` below 10%
- Test an AI endpoint manually:
  ```bash
  curl -s -X POST https://automated-ads-agent-production.up.railway.app/api/idea-bank/suggest \
    -H "Content-Type: application/json" \
    -d '{"productIds": [1]}'
  ```
- Sentry alert resolves automatically

**Prevention:**
- Monitor Gemini quota usage proactively via Google Cloud Console
- Set up Google Cloud budget alerts for API spending
- Keep the Gemini health monitor active (rolling failure rate in Redis)

---

## Scenario: Redis Unavailable

**Detection:** Health endpoint returns `redis.connected: false`. Application logs show Redis connection errors. Rate limiting and session management may behave inconsistently across instances.

**Impact:** Rate limiting falls back to in-memory (per-instance) -- limits are not shared across Railway instances, making them less effective. Active sessions may be lost (users forced to re-authenticate). Login lockout counters reset, allowing previously locked-out accounts to retry. Gemini health monitoring counters are unavailable.

**Severity:** HIGH

**Mitigation Steps:**

1. Check Redis status via the health endpoint:
   ```bash
   curl -s https://automated-ads-agent-production.up.railway.app/api/health | jq '.redis'
   ```
2. Check the Railway dashboard for the Redis service status
3. If Redis service is stopped: restart it from the Railway dashboard
4. If Redis is OOM (out of memory): check memory usage in Railway metrics; consider upgrading the Redis plan or flushing stale keys
5. If Redis is unreachable (network): check Railway's internal network; restart the application service to force a fresh connection
6. Verify `REDIS_URL` environment variable is correctly set in Railway:
   ```bash
   # Check via Railway CLI or dashboard
   # The application validates REDIS_URL at startup and will exit if missing in production
   ```

**Recovery Verification:**
- Health endpoint returns `redis.connected: true`
- Rate limiting is shared across instances (test by hitting rate limit on one path and verifying it applies globally)
- Sessions persist across requests

**Prevention:**
- Use Railway's managed Redis with automatic restarts enabled
- Monitor Redis memory usage via Railway dashboard
- Set up alerts for Redis connection failures in Sentry
- Ensure `REDIS_URL` is backed up and documented in the deployment runbook

---

## Scenario: Database Connection Pool Exhaustion

**Detection:** Spike in HTTP 503 errors. Slow query responses across all endpoints. Application logs show `pool.waitingCount` growing or "connection timeout" errors. Health endpoint may respond slowly or fail entirely.

**Impact:** All database operations fail or queue behind exhausted connections. Users experience timeouts on every page (product library, templates, generation history, approval queue). The application appears completely unresponsive.

**Severity:** CRITICAL

**Mitigation Steps:**

1. Check current pool status via health endpoint (if responsive):
   ```bash
   curl -s --max-time 10 https://automated-ads-agent-production.up.railway.app/api/health | jq '.database'
   ```
2. Check for long-running queries in PostgreSQL:
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY duration DESC
   LIMIT 10;
   ```
3. Kill long-running queries if found:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE duration > interval '60 seconds' AND state != 'idle';
   ```
4. If no long-running queries: check for connection leaks in recent deployments. Review `server/db.ts` for pool configuration.
5. Increase pool size temporarily by setting the `DB_POOL_MAX` environment variable in Railway (default is typically 10-20 connections):
   ```
   DB_POOL_MAX=30
   ```
6. Trigger a redeploy to reset all connections:
   ```bash
   curl -s -X POST https://backboard.railway.app/graphql/v2 \
     -H "Content-Type: application/json" \
     -H "Project-Access-Token: 4615359f-6328-413f-b418-4f0c6979161a" \
     -d '{"query": "mutation { serviceInstanceRedeploy(serviceId: \"28ce02bc-f4ad-4ea7-aab6-bffc98a47e2f\", environmentId: \"14f7ad84-cb42-4ec6-a9e5-29826e2f9882\") }"}'
   ```
7. If the issue persists: check Railway PostgreSQL service metrics for CPU and memory saturation

**Recovery Verification:**
- Health endpoint responds within 2 seconds with `database.connected: true`
- All CRUD endpoints return data normally
- No 503 errors in the last 5 minutes of Sentry logs
- Pool `waitingCount` is 0

**Prevention:**
- Set appropriate `DB_POOL_MAX` based on Railway plan limits and expected concurrency
- Add connection timeout configuration to prevent indefinite waits
- Monitor pool metrics via the health endpoint and OpenTelemetry (Phase 5.1)
- Review database queries for N+1 patterns and missing indexes

---

## Scenario: Queue Backlog Growing

**Detection:** Health endpoint shows queue `waiting` count exceeding 50 jobs. Image generation requests are delayed significantly. Users report that ad generation takes minutes instead of seconds.

**Impact:** Image generation and other queued AI tasks are delayed. Users submit jobs but receive results much later than expected. If the backlog continues growing, the queue may consume significant Redis memory.

**Severity:** MEDIUM (becomes HIGH if backlog exceeds 200 or DLQ grows)

**Mitigation Steps:**

1. Check queue status via health endpoint:
   ```bash
   curl -s https://automated-ads-agent-production.up.railway.app/api/health | jq '.queue'
   ```
2. Check the dead letter queue (DLQ) for patterns -- if many jobs are failing and moving to DLQ, the backlog may be caused by retries:
   ```bash
   curl -s https://automated-ads-agent-production.up.railway.app/api/admin/dead-letter-queue \
     -H "Authorization: Bearer <admin-token>"
   ```
3. If DLQ is growing: inspect failed job error messages for a common cause (Gemini outage, invalid input, etc.)
4. If workers are healthy but slow: check Gemini response latency (may be degraded but not down)
5. If workers are stuck: check for stalled jobs in the logs. The stall detector (`stalledInterval: 30000`) should automatically recover or move stalled jobs.
6. As a last resort, clear the queue and redeploy:
   ```bash
   # Trigger redeploy (restarts workers)
   curl -s -X POST https://backboard.railway.app/graphql/v2 \
     -H "Content-Type: application/json" \
     -H "Project-Access-Token: 4615359f-6328-413f-b418-4f0c6979161a" \
     -d '{"query": "mutation { serviceInstanceRedeploy(serviceId: \"28ce02bc-f4ad-4ea7-aab6-bffc98a47e2f\", environmentId: \"14f7ad84-cb42-4ec6-a9e5-29826e2f9882\") }"}'
   ```

**Recovery Verification:**
- Queue `waiting` count drops below 10
- DLQ is not growing
- New jobs complete within expected time (under 30 seconds for standard generation)
- No stalled job warnings in logs

**Prevention:**
- Monitor queue depth as part of the health check
- Set up alerts when waiting count exceeds 50
- Ensure worker concurrency is appropriately configured for the Railway plan
- Investigate and fix recurring failure patterns in the DLQ

---

## Scenario: Memory Pressure

**Detection:** Application logs show heap usage exceeding 80%. Response times degrade across all endpoints. Railway metrics show memory approaching the service limit. In severe cases, the process is killed by OOM and Railway restarts it.

**Impact:** Slow responses across all features. If OOM occurs, the service restarts and all in-memory state is lost (mitigated by Redis-backed state from ADR-0001). Users experience brief downtime during restart.

**Severity:** MEDIUM (becomes CRITICAL if OOM restarts are frequent)

**Mitigation Steps:**

1. Check current memory via health endpoint:
   ```bash
   curl -s https://automated-ads-agent-production.up.railway.app/api/health | jq '.memory'
   ```
2. Check Railway dashboard for memory trends over the last hour
3. Review `server/utils/memoryManager.ts` for BoundedMap sizes -- these are the primary in-application memory consumers:
   - Rate limit stores (should be in Redis; if falling back to in-memory, this is a problem -- check Redis connectivity first)
   - File search caches
   - Pattern extraction caches
4. If memory is growing linearly over time: likely a memory leak. Check recent deployments for:
   - Unbounded arrays or maps that grow with requests
   - Event listeners not being cleaned up
   - Large response bodies held in closures
5. Immediate relief -- restart the service:
   ```bash
   curl -s -X POST https://backboard.railway.app/graphql/v2 \
     -H "Content-Type: application/json" \
     -H "Project-Access-Token: 4615359f-6328-413f-b418-4f0c6979161a" \
     -d '{"query": "mutation { serviceInstanceRedeploy(serviceId: \"28ce02bc-f4ad-4ea7-aab6-bffc98a47e2f\", environmentId: \"14f7ad84-cb42-4ec6-a9e5-29826e2f9882\") }"}'
   ```
6. If restarts only provide temporary relief: take a heap snapshot (requires SSH or debug endpoint), analyze with Chrome DevTools

**Recovery Verification:**
- Heap usage below 60% after restart
- Memory is stable (not growing linearly) over 30 minutes
- Response times return to normal (p95 under 500ms for read endpoints)

**Prevention:**
- Ensure all ephemeral state uses Redis (ADR-0001), not in-memory maps
- BoundedMap instances in `server/utils/memoryManager.ts` enforce size limits -- verify limits are appropriate
- Monitor memory trends via Railway dashboard and set alerts at 70% threshold
- Profile memory usage after major feature releases
- Consider upgrading the Railway plan if baseline memory usage approaches the limit
