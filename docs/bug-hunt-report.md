# Bug Hunt Report -- System Audit

**Date:** 2026-02-12
**Auditor:** Claude Code (Bug Hunter Agent)
**Scope:** Full codebase -- server routes, services, middleware, client hooks

## Summary

- **Total issues found: 29**
- **Critical: 4**
- **High: 10**
- **Medium: 11**
- **Low: 4**

---

## Critical Issues

### [BUG-001] Missing Auth on Multiple Mutation Endpoints (Generations, Products, Copywriting, Image)

- **File:** `server/routes/generations.router.ts` (lines 31-43, 48-62, 67-91, 96-120, 126-217, 222-365)
- **File:** `server/routes/products.router.ts` (lines 46-113, 118-129, 163-226, 284-316, 321-348)
- **File:** `server/routes/copywriting.router.ts` (lines 20-81)
- **File:** `server/routes/image.router.ts` (lines 22-58)
- **File:** `server/routes/planning.router.ts` (lines 31-45)
- **Severity:** CRITICAL
- **Category:** Security -- Missing Authentication
- **Description:** Several routes that perform mutations (POST, DELETE) or access user data have NO `requireAuth` middleware:
  - `GET /api/generations` -- Lists ALL generations (no user scoping either)
  - `GET /api/generations/:id` -- Gets any generation by ID
  - `GET /api/generations/:id/history` -- Gets edit history for any generation
  - `DELETE /api/generations/:id` -- **Deletes any generation** without auth
  - `POST /api/generations/:id/edit` -- Edits any generation without auth
  - `POST /api/generations/:id/analyze` -- Analyzes any generation without auth
  - `POST /api/products` -- Creates products without auth
  - `GET /api/products` -- Lists all products without auth
  - `DELETE /api/products/:id` -- **Deletes any product** without auth
  - `DELETE /api/products` -- **Clears ALL products** without auth
  - `POST /api/products/sync` -- Syncs from Cloudinary without auth
  - `POST /api/copywriting/standalone` -- Generates AI copy without auth (costs money)
  - `POST /api/analyze-image` -- Vision AI analysis without auth (costs money)
  - `GET /api/content-planner/templates` -- Public (acceptable), but note it's unprotected
- **Impact:** Any unauthenticated user can delete all products, delete generations, trigger expensive AI operations (Gemini API calls), and clear data. This is exploitable in production.
- **Suggested Fix:** Add `requireAuth` middleware to all mutation endpoints. For read-only endpoints, consider whether they should be public or require auth. At minimum, all DELETE and POST endpoints must require authentication.

### [BUG-002] Memory Leak: Video Generation Polling Never Cleaned Up on Unmount

- **File:** `client/src/hooks/useStudioOrchestrator.ts:591-623`
- **Severity:** CRITICAL
- **Category:** Memory Leak
- **Description:** In `handleGenerateVideo`, a `setInterval` is created for polling video job status, and a `setTimeout` is created for a 12-minute safety timeout. Neither is cleaned up on component unmount:
  ```typescript
  const pollInterval = setInterval(async () => { ... }, 5000);
  setTimeout(() => {
    clearInterval(pollInterval);
    // ...
  }, 720_000);
  ```
  If the user navigates away from the Studio page while a video is generating:
  1. The `setInterval` continues running, making fetch requests every 5 seconds
  2. The `setTimeout` (12 minutes) continues running
  3. Both reference stale state via closure (`videoJobId`, `setState`, `setGeneratedImage`)
  4. Network requests continue to a potentially dead session
- **Impact:** Memory leak, stale state updates, unnecessary network traffic. Could cause "can't update state on unmounted component" warnings and subtle bugs.
- **Suggested Fix:** Move polling into a `useEffect` with proper cleanup, or use the existing `useJobStatus` SSE hook instead of manual polling.

### [BUG-003] Approval Queue Exposes Internal Error Details to Clients

- **File:** `server/routes/approvalQueue.router.ts:89-92`
- **Severity:** CRITICAL
- **Category:** Security -- Information Disclosure
- **Description:** The approval queue list endpoint has a comment saying "Temporarily expose error details to diagnose the issue" and returns `details: errorMessage` and `code: errorCode` directly from the caught error. This was likely added during debugging and never removed.
  ```typescript
  res.status(500).json({
    success: false,
    error: 'Failed to fetch approval queue',
    details: errorMessage, // LEAKED
    code: errorCode, // LEAKED
  });
  ```
- **Impact:** Internal error messages, database error codes, and stack traces can be exposed to clients. This can reveal database schema details, SQL error messages, and other sensitive information useful to attackers.
- **Suggested Fix:** Remove `details` and `code` from the error response. These should only appear in server logs.

### [BUG-004] Templates CRUD Missing Admin Role Check (TODO Left in Code)

- **File:** `server/routes/templates.router.ts:95-105, 139, 170`
- **Severity:** CRITICAL
- **Category:** Security -- Missing Authorization
- **Description:** Template creation, update, and deletion have `// TODO: Add admin role check here` comments but NO actual admin check. Any authenticated user can:
  - Create global templates (`isGlobal: true` by default)
  - Update any template they "created" (but creation has no admin check, so anyone can create)
  - Delete any template they "created"

  The `createdBy` check is meaningless when any user can create templates.

- **Impact:** Any authenticated user can pollute the template library with arbitrary templates, modify existing templates, or delete them. This affects all users since templates are global.
- **Suggested Fix:** Add `requireRole('admin')` middleware or equivalent check before template mutation operations.

---

## High Issues

### [BUG-005] Reschedule/Cancel Don't Check Post Status (Can Cancel Published Posts)

- **File:** `server/services/schedulingRepository.ts:133-160`
- **Severity:** HIGH
- **Category:** Data Integrity
- **Description:** `reschedulePost` and `cancelScheduledPost` do not check the current status of the post before modifying it. A user can:
  - Cancel a post that's already `published` or `publishing`
  - Reschedule a post that's currently `publishing` (being processed by n8n)
  - Reschedule a post to a past date (no future-date validation in reschedule, only in initial schedule)
- **Impact:** Data integrity issues. A post could be marked "cancelled" in the DB while n8n is actively publishing it, leading to inconsistent state.
- **Suggested Fix:** Add WHERE clause filtering `status = 'scheduled'` for both reschedule and cancel operations. Return a specific error if the post is in a non-modifiable state.

### [BUG-006] scheduleRetry Does Not Increment retryCount in DB

- **File:** `server/services/schedulingRepository.ts:228-264`
- **Severity:** HIGH
- **Category:** Data Integrity / Logic Error
- **Description:** `scheduleRetry()` reads `retryCount` from the DB, checks if it's >= MAX_RETRIES, but when setting the post back to `scheduled`, it does NOT increment `retryCount`. The `retryCount` is only incremented in `updatePostAfterCallback` (line 301) when the post fails. However, `scheduleRetry` is called AFTER `updatePostAfterCallback`, so by the time `scheduleRetry` reads `retryCount`, it has already been incremented. This works by accident but the logic is fragile and confusing.
- **Impact:** If the calling order changes, retries could loop forever. The current code works due to ordering coincidence, not by design.
- **Suggested Fix:** Make `scheduleRetry` explicitly handle retryCount: either increment it atomically in a single UPDATE, or clearly document the dependency on call ordering.

### [BUG-007] Content Planner Delete Post Has No Ownership Check

- **File:** `server/routes/planning.router.ts:212-225`
- **Severity:** HIGH
- **Category:** Security -- Missing Authorization
- **Description:** `DELETE /api/content-planner/posts/:id` deletes a post by ID without checking if the authenticated user owns it. Any authenticated user can delete any other user's content planner posts.
- **Impact:** Users can delete other users' content planner data.
- **Suggested Fix:** Fetch the post first, verify `post.userId === req.user.id`, then delete.

### [BUG-008] Training Models Delete Has No Ownership Check

- **File:** `server/routes/training.router.ts:313-325`
- **Severity:** HIGH
- **Category:** Security -- Missing Authorization
- **Description:** `DELETE /api/training/models/:name` deletes a tuned model by name without checking if the authenticated user owns it. Any authenticated user can delete any other user's tuned models.
- **Impact:** Users can destroy other users' trained ML models, which are expensive to recreate.
- **Suggested Fix:** Add ownership verification before deletion.

### [BUG-009] Catalog Upload-Directory Accepts Arbitrary Server Paths

- **File:** `server/routes/catalog.router.ts:91-113`
- **Severity:** HIGH
- **Category:** Security -- Path Traversal
- **Description:** `POST /api/file-search/upload-directory` accepts a `directoryPath` from the request body and passes it directly to `uploadDirectoryToFileSearch`. There is no path validation or sandboxing. An authenticated user could pass paths like `/etc/` or `C:\Windows\System32\` to read arbitrary directories from the server filesystem.
- **Impact:** Server-Side Request Forgery / Local File Inclusion. Authenticated users can read arbitrary files from the production server.
- **Suggested Fix:** Validate that `directoryPath` is within an allowed base directory. Use `path.resolve()` and verify the resolved path starts with the expected prefix.

### [BUG-010] Error Messages Leak Internal Details in Production

- **File:** Multiple files in `server/routes/`
- **Severity:** HIGH
- **Category:** Security -- Information Disclosure
- **Description:** Several endpoints return `error.message` or `details: error.message` in their error responses:
  - `server/routes/products.router.ts:110` -- `details: error.message`
  - `server/routes/copywriting.router.ts:78` -- `details: error.message`
  - `server/routes/generations.router.ts:213,361,439,513` -- `error.message`
  - Admin routes consistently return `details: error.message` (acceptable since admin-only)
- **Impact:** Internal error messages (potentially including database connection strings, file paths, API keys from upstream services) can be exposed to unauthenticated users.
- **Suggested Fix:** Return generic error messages to clients. Log detailed errors server-side only. Only expose `error.message` on admin-protected routes.

### [BUG-011] No Rate Limiting on Expensive AI Endpoints

- **File:** `server/routes/copywriting.router.ts`, `server/routes/image.router.ts`, `server/routes/generations.router.ts`
- **Severity:** HIGH
- **Category:** Security -- Denial of Service / Cost Abuse
- **Description:** Several endpoints that trigger expensive Gemini/AI API calls have no rate limiting:
  - `POST /api/copywriting/standalone` -- No auth, no rate limit
  - `POST /api/analyze-image` -- No auth, no rate limit
  - `POST /api/generations/:id/analyze` -- No auth, no rate limit
  - `POST /api/generations/:id/edit` -- No auth, no rate limit

  The agent router correctly implements rate limiting (`60 requests per 15 minutes`), but these other AI endpoints do not.

- **Impact:** An attacker can send thousands of requests to generate AI content, burning through API quotas and generating significant costs.
- **Suggested Fix:** Add rate limiting middleware to all AI-powered endpoints. Consider both per-user and per-IP limits.

### [BUG-012] n8n Webhook HMAC Signature Computed Over Re-serialized Body

- **File:** `server/middleware/webhookAuth.ts:38`
- **Severity:** HIGH
- **Category:** Security -- Webhook Authentication Bypass Risk
- **Description:** The webhook signature is computed over `JSON.stringify(req.body)`, but the actual raw body received may have different serialization (whitespace, key ordering, etc.) than what `JSON.stringify` produces. If n8n sends `{"key": "value"}` but Express parses and re-serializes it as `{"key":"value"}` (no space), the HMAC will not match. The `rawBody` property IS captured by the Express JSON parser (line 123-126 in app.ts), but `webhookAuth.ts` doesn't use it.
- **Impact:** Webhook signature validation may fail for legitimate requests or pass for forged requests if the serialization differs.
- **Suggested Fix:** Use `req.rawBody` (which is the original buffer before parsing) instead of `JSON.stringify(req.body)` for HMAC computation.

### [BUG-013] Demo Endpoint Creates User with Weak Known Password

- **File:** `server/routes/auth.router.ts:174-191`
- **Severity:** HIGH
- **Category:** Security -- Default Credentials
- **Description:** `GET /api/auth/demo` creates a demo user with email `demo@company.com` and password `demo123` (only 6 characters, below the 8-char minimum enforced by registration). This endpoint has no auth and no environment check -- it's available in production.
- **Impact:** In production, anyone can access the demo endpoint to get a valid session. The demo user has full access to the system. Since the password is hardcoded and well-known, the demo account is effectively a backdoor.
- **Suggested Fix:** Either (1) disable the demo endpoint in production, (2) require an environment variable flag like `ENABLE_DEMO_MODE=true`, or (3) restrict demo users' permissions.

---

## Medium Issues

### [BUG-014] useStudioOrchestrator useEffect Missing Dependencies

- **File:** `client/src/hooks/useStudioOrchestrator.ts:268-271`
- **Severity:** MEDIUM
- **Category:** React Bug -- Stale Closure
- **Description:** The "restore draft on mount" effect has an empty dependency array but references `prompt` in its condition:
  ```typescript
  useEffect(() => {
    const savedPrompt = localStorage.getItem('studio-prompt-draft');
    if (savedPrompt && !prompt) setPrompt(savedPrompt);
  }, []); // Missing 'prompt' dependency
  ```
  This is intentional (only run on mount), but React linting would flag it. The `prompt` reference creates a stale closure that always sees the initial value.
- **Impact:** Minor -- the effect only runs once on mount so the stale closure for `prompt` (initial value `''`) is actually correct behavior. But it's confusing and fragile.
- **Suggested Fix:** Add a comment explaining why the empty dependency array is intentional, or use a ref to avoid the stale closure.

### [BUG-015] useStudioOrchestrator Deep Link Effect Runs on Every Template Load

- **File:** `client/src/hooks/useStudioOrchestrator.ts:332-418`
- **Severity:** MEDIUM
- **Category:** Performance / Unnecessary Re-renders
- **Description:** The query parameter parsing effect has `[templates, prompt, cpTemplate]` as dependencies. Every time `templates` is refetched (React Query refetch), this entire effect re-runs, potentially re-parsing URL parameters and resetting state.
- **Impact:** Potential state resets when templates are refetched. If a user has already modified their prompt and templates refetch, the URL params could overwrite their work.
- **Suggested Fix:** Use a ref to track whether URL params have already been processed, and skip re-processing on subsequent runs.

### [BUG-016] Bulk Approval Queue Ownership Check is O(N) Sequential

- **File:** `server/routes/approvalQueue.router.ts:303-318`
- **Severity:** MEDIUM
- **Category:** Performance
- **Description:** The bulk approve endpoint fetches each queue item individually in a sequential loop to verify ownership before approving:
  ```typescript
  for (const id of ids) {
    const item = await storage.getApprovalQueue(id);
    // ...
  }
  ```
  For large bulk operations, this is O(N) database queries for validation alone, plus O(N) more for the actual approval operations.
- **Impact:** Slow bulk operations. 50 items = 100+ DB queries.
- **Suggested Fix:** Use a single batch query to fetch all items by IDs, then validate ownership in memory.

### [BUG-017] calendar.router Uses asyncHandler AND try-catch (Redundant)

- **File:** `server/routes/calendar.router.ts` (all endpoints)
- **Severity:** MEDIUM
- **Category:** Code Quality -- Redundant Error Handling
- **Description:** Every endpoint in the calendar router wraps handlers in both `asyncHandler` (which catches async errors) AND an internal try-catch block. This is redundant -- `asyncHandler` already catches any thrown errors and forwards them to Express error handling.
- **Impact:** No functional bug, but adds unnecessary nesting and makes the code harder to read. The same pattern appears in most other routers.
- **Suggested Fix:** Either use `asyncHandler` without try-catch (and let the global error handler deal with 500s), or use try-catch without `asyncHandler`. Pick one pattern and apply consistently.

### [BUG-018] n8nPostingService Uses Variable Before Declaration in Catch Block

- **File:** `server/services/n8nPostingService.ts:244`
- **Severity:** MEDIUM
- **Category:** Runtime Error
- **Description:** In the `postToN8n` catch block, `config` is referenced but it's declared inside the try block:
  ```typescript
  } catch (error) {
    // ...
    webhookUrl: config.webhooks[platform] || 'unknown', // config is not in scope!
  }
  ```
  Actually, looking more closely, `config` IS in scope because `getN8nConfig()` is called at the start of the try block and `const config` is accessible within the catch due to JS scoping. However, if `getN8nConfig()` itself throws (e.g., N8N_BASE_URL not set), then `config` will be undefined and this line will throw a secondary error, hiding the original.
- **Impact:** If n8n is not configured, the error handler itself will throw, potentially crashing the request with an unhandled error instead of returning a clean error response.
- **Suggested Fix:** Declare `config` outside the try block or use a fallback: `webhookUrl: 'unknown'`.

### [BUG-019] Monitoring Routes Don't Require Admin Role

- **File:** `server/routes/monitoring.router.ts`
- **Severity:** MEDIUM
- **Category:** Security -- Insufficient Authorization
- **Description:** All monitoring endpoints require `requireAuth` but not `requireRole('admin')`. Any authenticated user can view system health, performance metrics, error logs, and endpoint stats. The admin router correctly uses `requireRole('admin')` but monitoring does not.
- **Impact:** Regular users can see internal system metrics, error details, endpoint performance, and health status. This information can be used to understand the system architecture and find weaknesses.
- **Suggested Fix:** Add `requireRole('admin')` to monitoring routes, or create a separate 'monitoring' role.

### [BUG-020] useJobStatus Hook Reconnects on Every Callback Change

- **File:** `client/src/hooks/useJobStatus.ts:129`
- **Severity:** MEDIUM
- **Category:** Performance / Unnecessary Reconnections
- **Description:** The `useEffect` that creates the EventSource connection depends on `[jobId, onComplete, onFailed, onProgress, resetState]`. Since `onComplete`, `onFailed`, and `onProgress` are likely inline functions (not memoized), the SSE connection will be torn down and recreated on every parent re-render.
- **Impact:** SSE connections are dropped and recreated frequently, causing flickering progress updates and unnecessary server load.
- **Suggested Fix:** Store callbacks in refs (using `useRef` + `useEffect` to keep them current) and remove them from the `useEffect` dependency array.

### [BUG-021] Calendar Schedule Does Not Validate connectionId Exists

- **File:** `server/routes/calendar.router.ts:113-161`
- **Severity:** MEDIUM
- **Category:** Data Integrity
- **Description:** `POST /api/calendar/schedule` accepts a `connectionId` but never verifies that the social connection exists, is active, or belongs to the user. A user can schedule a post with a non-existent or disconnected social account.
- **Impact:** Posts will be scheduled but fail when n8n tries to publish them, wasting queue resources and creating confusing failed states.
- **Suggested Fix:** Before creating the scheduled post, verify that `connectionId` refers to an active social connection owned by the user.

### [BUG-022] Upload Middleware Order Issue in Catalog

- **File:** `server/routes/catalog.router.ts:48-49`
- **Severity:** MEDIUM
- **Category:** Security -- Middleware Ordering
- **Description:** On the file upload endpoint, `uploadSingle('file')` is applied BEFORE `requireAuth`:
  ```typescript
  router.post('/upload', uploadSingle('file'), requireAuth, asyncHandler(...));
  ```
  This means the file is uploaded and processed (consuming disk/memory) before the user is authenticated. An unauthenticated user can upload files that consume server resources even though they'll get a 401 afterward.
- **Impact:** Unauthenticated users can upload files to consume server memory/disk before being rejected. Potential DoS vector.
- **Suggested Fix:** Move `requireAuth` before `uploadSingle('file')`.
- **Also affects:** `server/routes/brandImages.router.ts:27` — same pattern: `router.post('/', uploadSingle('image'), requireAuth, ...)`. Move `requireAuth` before upload middleware there too.

### [BUG-022b] Rate Limiting Bypass via x-e2e-test Header in Production

- **File:** `server/middleware/rateLimit.ts:109`
- **Severity:** HIGH
- **Category:** Security -- Rate Limit Bypass
- **Description:** The rate limiter skips enforcement when the request header `x-e2e-test` is set to `'true'`:
  ```typescript
  if (process.env.NODE_ENV === 'test' || req.headers['x-e2e-test'] === 'true') {
    return next();
  }
  ```
  The `||` means the header check runs regardless of `NODE_ENV`. In production, any client can send `x-e2e-test: true` to bypass all rate limiting. The header is also explicitly allowed in CORS `allowedHeaders` (app.ts:43).
- **Impact:** Complete rate limiting bypass in production. Attackers can send unlimited requests to AI endpoints and other rate-limited routes.
- **Suggested Fix:** Guard the header check with environment: `if (process.env.NODE_ENV === 'test' || (process.env.NODE_ENV !== 'production' && req.headers['x-e2e-test'] === 'true'))`. Or remove the header bypass entirely and use `NODE_ENV=test` only.

### [BUG-022c] Session Fixation -- No Session Regeneration on Login

- **File:** `server/routes/auth.router.ts:46,111,185` and `server/routes.ts:290,353,412`
- **Severity:** MEDIUM
- **Category:** Security -- Session Fixation
- **Description:** On register, login, and demo login, `session.userId` is set directly without calling `req.session.regenerate()` first. If an attacker pre-sets a session cookie (e.g., via XSS on a subdomain or a shared cookie domain), the session ID remains the same after authentication. The attacker already knows the session ID and gains access to the authenticated session.
  ```typescript
  (req as any).session.userId = user.id; // No regenerate() before this
  ```
  Best practice is to regenerate the session ID on privilege escalation (login).
- **Impact:** Session fixation attack — attacker can hijack a user's session if they can pre-set the session cookie.
- **Suggested Fix:** Call `req.session.regenerate()` before setting `session.userId`. Copy any needed pre-login data to the new session. Express-session's `regenerate()` creates a new session ID and invalidates the old one.

### [BUG-023] useRipple Hook setTimeout Without Cleanup

- **File:** `client/src/hooks/useRipple.ts:47`
- **Severity:** MEDIUM
- **Category:** Memory Leak (Minor)
- **Description:** The `useRipple` hook uses `setTimeout` to remove ripple elements but does not store the timeout ID for cleanup. If the component unmounts before the timeout fires, DOM manipulation will be attempted on an unmounted component's elements.
- **Impact:** Minor -- the element reference may no longer exist, but it won't crash. It may cause console warnings.
- **Suggested Fix:** Store timeout IDs and clear them in the cleanup function.

---

## Low Issues

### [BUG-024] Console Statements in Client Production Code

- **File:** Multiple client files
- **Severity:** LOW
- **Category:** Code Quality
- **Description:** Several client files use `console.error` and `console.log` in production code:
  - `client/src/hooks/useJobStatus.ts:107,112,118` -- `console.error` for SSE errors
  - `client/src/hooks/useStudioOrchestrator.ts:304` -- `.catch(console.error)`
  - `client/src/lib/queryClient.ts:53,84,108` -- `console.warn`/`console.error`
  - `client/src/lib/webVitals.ts:11` -- `console.log` for web vitals
  - `client/src/components/BeforeAfterBuilder.tsx:285` -- `console.error`
  - `client/src/components/CarouselBuilder.tsx:227,244` -- `console.error`
  - `client/src/pages/Studio.tsx:236` -- `.catch(console.error)`
  - `client/src/pages/StudioOptimized.tsx:930,1567` -- `.catch(console.error)`
  - `client/src/components/studio/CanvasEditor/CanvasEditor.tsx:188,328` -- `console.error`
- **Impact:** No functional issues, but console output in production is not ideal. Some of these (like webVitals logging) are intentional.
- **Suggested Fix:** Use a proper client-side logging utility that can be disabled in production, or remove non-essential console statements.

### [BUG-025] Commented-out Code and TODO Annotations in Production

- **File:** Multiple files
- **Severity:** LOW
- **Category:** Code Quality -- Dead Code
- **Description:** Several TODOs left in production code indicating incomplete implementations:
  - `server/routes/templates.router.ts:102` -- `// TODO: Add admin role check here` (see BUG-004)
  - `server/routes/templates.router.ts:139,170` -- `// TODO: Add admin check`
  - `server/services/approvalQueueService.ts:216` -- `// TODO: Replace with contentSafetyService.evaluateSafety()`
  - `server/routes.ts:4904` -- `// TODO: Update scheduledPosts table`
  - Legacy `server/routes.ts` (~5000 lines) appears to be a pre-refactor monolithic file that may still be partially used
- **Impact:** Technical debt. The TODOs represent unfinished security features.
- **Suggested Fix:** Address the security TODOs as bugs. Clean up or remove the legacy `routes.ts` if it's been superseded by the router modules.

### [BUG-026] Debug Script Left in Codebase

- **File:** `server/debug-errors.ts`
- **Severity:** LOW
- **Category:** Code Quality -- Dead Code
- **Description:** A debug script with extensive `console.log` usage exists at `server/debug-errors.ts`. This is a development/debugging tool that should not be in production.
- **Impact:** No functional impact since it's not imported by the app. Just clutters the codebase.
- **Suggested Fix:** Move to a `scripts/` directory or add to `.gitignore` if it's for local debugging only.

### [BUG-027] Temporary Files in Repository Root

- **File:** Repository root
- **Severity:** LOW
- **Category:** Code Quality -- Repository Hygiene
- **Description:** Several temporary/debug files are present in the repository:
  - `tmp_exec.json`, `tmp_exec_5646.json`, `tmp_exec_5650.json`, etc.
  - `tmp_test_payload.json`, `tmp_test_payload2.json`
  - `tmp_wf_inspect.json`, `tmp_exec_latest.json`
  - `cookies.txt`, `cookies_login.txt`
  - `UsersavibmAutomated-Ads-Agentcsrf_test.txt`
  - `nul` (Windows artifact)
- **Impact:** Clutters the repo. Some files like `cookies.txt` could contain sensitive session data.
- **Suggested Fix:** Add these patterns to `.gitignore`: `tmp_*.json`, `cookies*.txt`, `nul`, `*csrf_test*`, `*login_cookies*`. Remove existing tracked files.

---

## Summary Table

| ID       | Severity | Category                     | File                         | Description                                            |
| -------- | -------- | ---------------------------- | ---------------------------- | ------------------------------------------------------ |
| BUG-001  | CRITICAL | Security - Missing Auth      | Multiple routes              | Unauthenticated access to DELETE, costly AI endpoints  |
| BUG-002  | CRITICAL | Memory Leak                  | useStudioOrchestrator.ts:591 | Video poll interval not cleaned up on unmount          |
| BUG-003  | CRITICAL | Security - Info Disclosure   | approvalQueue.router.ts:89   | Temp error details exposed to clients                  |
| BUG-004  | CRITICAL | Security - Missing AuthZ     | templates.router.ts:102      | Template CRUD has no admin role check                  |
| BUG-005  | HIGH     | Data Integrity               | schedulingRepository.ts:133  | Cancel/reschedule don't check post status              |
| BUG-006  | HIGH     | Logic Error                  | schedulingRepository.ts:228  | retryCount logic is fragile and order-dependent        |
| BUG-007  | HIGH     | Security - Missing AuthZ     | planning.router.ts:212       | Content planner delete has no ownership check          |
| BUG-008  | HIGH     | Security - Missing AuthZ     | training.router.ts:313       | Model delete has no ownership check                    |
| BUG-009  | HIGH     | Security - Path Traversal    | catalog.router.ts:91         | Server-side path traversal via directoryPath           |
| BUG-010  | HIGH     | Security - Info Disclosure   | Multiple routes              | error.message leaked in HTTP responses                 |
| BUG-011  | HIGH     | Security - DoS/Cost          | Multiple routes              | No rate limiting on expensive AI endpoints             |
| BUG-012  | HIGH     | Security - Webhook Auth      | webhookAuth.ts:38            | HMAC computed over re-serialized body                  |
| BUG-013  | HIGH     | Security - Default Creds     | auth.router.ts:174           | Demo user with known password in production            |
| BUG-014  | MEDIUM   | React Bug                    | useStudioOrchestrator.ts:268 | Missing useEffect dependency                           |
| BUG-015  | MEDIUM   | Performance                  | useStudioOrchestrator.ts:332 | Deep link effect runs too often                        |
| BUG-016  | MEDIUM   | Performance                  | approvalQueue.router.ts:303  | O(N) sequential DB queries for bulk ops                |
| BUG-017  | MEDIUM   | Code Quality                 | calendar.router.ts           | Redundant asyncHandler + try-catch                     |
| BUG-018  | MEDIUM   | Runtime Error                | n8nPostingService.ts:244     | Variable used before declaration in catch              |
| BUG-019  | MEDIUM   | Security - AuthZ             | monitoring.router.ts         | No admin role requirement                              |
| BUG-020  | MEDIUM   | Performance                  | useJobStatus.ts:129          | SSE reconnects on callback changes                     |
| BUG-021  | MEDIUM   | Data Integrity               | calendar.router.ts:113       | connectionId not validated                             |
| BUG-022  | MEDIUM   | Security                     | catalog.router.ts:48         | Upload processed before auth check                     |
| BUG-022b | HIGH     | Security - Rate Limit Bypass | rateLimit.ts:109             | x-e2e-test header bypasses rate limiting in production |
| BUG-022c | MEDIUM   | Security - Session Fixation  | auth.router.ts:46,111        | No session.regenerate() on login                       |
| BUG-023  | MEDIUM   | Memory Leak                  | useRipple.ts:47              | setTimeout without cleanup                             |
| BUG-024  | LOW      | Code Quality                 | Multiple client files        | console statements in production                       |
| BUG-025  | LOW      | Dead Code                    | Multiple files               | TODO annotations in production                         |
| BUG-026  | LOW      | Dead Code                    | debug-errors.ts              | Debug script in codebase                               |
| BUG-027  | LOW      | Repo Hygiene                 | Repository root              | Temporary files not gitignored                         |

---

## Recommendations by Priority

### Immediate (Fix Now)

1. Add `requireAuth` to all unprotected mutation endpoints (BUG-001)
2. Add admin role checks to template CRUD (BUG-004)
3. Remove temp error details from approval queue response (BUG-003)
4. Fix video polling memory leak (BUG-002)

### Short-term (This Sprint)

5. Add post status validation to reschedule/cancel (BUG-005)
6. Add ownership checks to planning delete and training delete (BUG-007, BUG-008)
7. Validate and sandbox directoryPath in file upload (BUG-009)
8. Add rate limiting to AI endpoints (BUG-011)
9. Fix webhook HMAC to use rawBody (BUG-012)
10. Disable or protect demo endpoint in production (BUG-013)

### Medium-term (Next Sprint)

11. Sanitize error messages across all routes (BUG-010)
12. Add admin role to monitoring routes (BUG-019)
13. Optimize bulk approval with batch queries (BUG-016)
14. Fix useJobStatus SSE reconnection issue (BUG-020)
15. Validate connectionId in calendar schedule (BUG-021)
