# Smoke Test Commands — Release Candidate

**Target:** https://automated-ads-agent-production.up.railway.app
**Date:** 2026-02-17

## Usage

Run each command. Expected HTTP status is noted per command.

- **No-auth endpoints** can be run directly.
- **Auth-required endpoints** need a valid session cookie. Log in via browser, open DevTools > Application > Cookies, copy the `connect.sid` value, then use `--cookie "connect.sid=VALUE"`.
- All commands use `-s -o /dev/null -w "%{http_code}"` for status-only output. Remove `-o /dev/null` to see response body.
- CSRF-protected mutations (POST/PUT/PATCH/DELETE) also require a CSRF token. Fetch one first (see Section 2) and pass `--header "x-csrf-token: TOKEN"` plus `--cookie "csrf=CSRF_COOKIE; connect.sid=SESSION"`.

```
BASE="https://automated-ads-agent-production.up.railway.app"
```

---

## 1. Health & Infrastructure

```bash
# Liveness probe (Kubernetes-style) — always returns 200
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/health/live"
# Expected: 200

# Readiness probe — checks DB connection
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/health/ready"
# Expected: 200 (or 503 if DB down)

# Full health check — DB, Redis, services
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/health"
# Expected: 200

# CSRF token endpoint (GET, no auth) — also sets csrf cookie
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/csrf-token"
# Expected: 200

# Analytics vitals (POST, no CSRF, accepts text) — fire-and-forget
curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/analytics/vitals" -d "test"
# Expected: 200 or 204
```

## 2. Authentication

```bash
# Get current session (not logged in)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/auth/me"
# Expected: 401

# Demo login (creates/returns demo session)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/auth/demo"
# Expected: 200

# Login (requires CSRF token + valid credentials)
# Step 1: Get CSRF token and cookie
CSRF_RESP=$(curl -s -c - "$BASE/api/csrf-token")
# Step 2: Login with credentials
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/auth/login" \
#   -X POST -H "Content-Type: application/json" \
#   -H "x-csrf-token: TOKEN" \
#   --cookie "csrf=CSRF_COOKIE" \
#   -d '{"username":"...", "password":"..."}'
# Expected: 200

# Logout (requires session + CSRF)
# curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/logout" \
#   --cookie "connect.sid=SESSION" -H "x-csrf-token: TOKEN"
# Expected: 200

# Get current user (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/auth/me" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Data export (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/auth/export" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 3. Products & Assets

```bash
# List products (no auth in legacy routes.ts)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/products"
# Expected: 200

# Get single product (replace :id)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/products/1"
# Expected: 200 or 404

# Pending enrichments (no auth in legacy routes.ts)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/products/enrichment/pending"
# Expected: 200

# List brand images (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/brand-images" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Brand images by category (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/brand-images/category/product" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 4. Idea Bank

```bash
# Suggest ideas (POST, requires body — no auth but needs CSRF)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/idea-bank/suggest" \
#   -X POST -H "Content-Type: application/json" \
#   -H "x-csrf-token: TOKEN" --cookie "csrf=CSRF_COOKIE" \
#   -d '{"productIds":[]}'
# Expected: 200

# Idea bank templates for product (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/idea-bank/templates/1" \
#   --cookie "connect.sid=SESSION"
# Expected: 200 or 404
```

## 5. Generations & Jobs

```bash
# List generations (no auth in legacy routes.ts)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/generations"
# Expected: 200

# Get single generation (replace :id)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/generations/1"
# Expected: 200 or 404

# Get generation history (replace :id)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/generations/1/history"
# Expected: 200 or 404

# Check job status (replace :jobId)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/jobs/some-job-id"
# Expected: 200 or 404

# Pricing estimate (no auth)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/pricing/estimate?model=gemini-2.0-flash"
# Expected: 200
```

## 6. Copywriting

```bash
# Generate copy (POST, auth + CSRF required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/copy/generate" \
#   -X POST -H "Content-Type: application/json" \
#   -H "x-csrf-token: TOKEN" \
#   --cookie "csrf=CSRF_COOKIE; connect.sid=SESSION" \
#   -d '{"productIds":["1"],"platform":"linkedin","framework":"AIDA"}'
# Expected: 200

# Standalone copywriting (POST, no auth in legacy)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/copywriting/standalone" \
#   -X POST -H "Content-Type: application/json" \
#   -H "x-csrf-token: TOKEN" --cookie "csrf=CSRF_COOKIE" \
#   -d '{"prompt":"Write an ad for steel products","platform":"linkedin"}'
# Expected: 200

# Get copy by ID (no auth in legacy)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/copy/some-id"
# Expected: 200 or 404

# Get copy by generation ID
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/copy/generation/some-gen-id"
# Expected: 200 or 404
```

## 7. Templates

```bash
# List templates (no auth)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/templates"
# Expected: 200

# Search templates (no auth)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/templates/search?q=steel"
# Expected: 200

# Get single template (no auth, replace :id)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/templates/1"
# Expected: 200 or 404

# Ad template categories (no auth)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/ad-templates/categories"
# Expected: 200

# List ad templates (no auth)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/ad-templates"
# Expected: 200

# Prompt templates (no auth)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/prompt-templates"
# Expected: 200
```

## 8. Content Planner

```bash
# Content planner templates (no auth)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/content-planner/templates"
# Expected: 200

# Content balance (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/content-planner/balance" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Content suggestion (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/content-planner/suggestion" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# List planned posts (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/content-planner/posts" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 9. Weekly Planner

```bash
# Current week plan (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/planner/weekly/current" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Specific week plan (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/planner/weekly?weekStart=2026-02-16" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 10. Calendar

```bash
# Posts in date range (auth required)
# curl -s -o /dev/null -w "%{http_code}" \
#   "$BASE/api/calendar/posts?start=2026-02-01&end=2026-02-28" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Post counts per day (auth required)
# curl -s -o /dev/null -w "%{http_code}" \
#   "$BASE/api/calendar/counts?month=2026-02" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 11. Approval Queue

```bash
# List approval queue items (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/approval-queue" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Approval queue settings (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/approval-queue/settings" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 12. Social Accounts

```bash
# List connected social accounts (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/social/accounts" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 13. Quota & Monitoring

```bash
# Quota status (no auth in legacy)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/quota/status"
# Expected: 200

# Quota history
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/quota/history"
# Expected: 200

# Quota breakdown
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/quota/breakdown"
# Expected: 200

# Rate limit status
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/quota/rate-limit-status"
# Expected: 200

# Check quota alerts (no auth in legacy)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/quota/check-alerts"
# Expected: 200

# Google quota status (no auth)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/quota/google/status"
# Expected: 200

# Google quota snapshot (no auth)
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/quota/google/snapshot"
# Expected: 200

# Monitoring health (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/monitoring/health" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Monitoring performance (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/monitoring/performance" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Monitoring errors (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/monitoring/errors" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Monitoring system (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/monitoring/system" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Monitoring endpoints (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/monitoring/endpoints" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 14. Brand Profile

```bash
# Get brand profile (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/brand-profile" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 15. Settings

```bash
# API keys list (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/settings/api-keys" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# N8N config (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/settings/n8n" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 16. Intelligence (Product Priorities)

```bash
# Get product priorities (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/intelligence/priorities" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Business intelligence (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/intelligence/business" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Onboarding status (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/intelligence/onboarding-status" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Product posting stats (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/intelligence/stats" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 17. Learned Patterns (Learn from Winners)

```bash
# List learned patterns (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/learned-patterns" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Patterns by category (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/learned-patterns/category/design" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 18. Style References

```bash
# List style references (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/style-references" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 19. Training (Model Fine-tuning)

```bash
# List training datasets (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/training/datasets" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# List tuned models (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/training/models" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 20. File Search (Knowledge Base)

```bash
# List uploaded files (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/file-search/files" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 21. Studio Agent

```bash
# Agent chat (POST, auth + CSRF required, streams SSE)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/agent/chat" \
#   -X POST -H "Content-Type: application/json" \
#   -H "x-csrf-token: TOKEN" \
#   --cookie "csrf=CSRF_COOKIE; connect.sid=SESSION" \
#   -d '{"message":"hello","sessionId":"test-session"}'
# Expected: 200 (SSE stream)
```

## 22. Performing Ad Templates

```bash
# List performing ad templates (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/performing-ad-templates" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Featured templates (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/performing-ad-templates/featured" \
#   --cookie "connect.sid=SESSION"
# Expected: 200

# Top templates (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/performing-ad-templates/top" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

## 23. Installation Scenarios

```bash
# List scenarios (auth required)
# curl -s -o /dev/null -w "%{http_code}" "$BASE/api/installation-scenarios" \
#   --cookie "connect.sid=SESSION"
# Expected: 200
```

---

## Quick Run Script (No-Auth Endpoints Only)

```bash
#!/bin/bash
# Smoke test — no-auth endpoints only
# Usage: bash SMOKE-CMDS-quick.sh

BASE="https://automated-ads-agent-production.up.railway.app"
PASS=0
FAIL=0
TOTAL=0

check() {
  local label="$1"
  local expected="$2"
  local url="$3"
  TOTAL=$((TOTAL + 1))
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url")
  if [ "$STATUS" = "$expected" ]; then
    echo "  PASS  $label -> $STATUS"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $label -> $STATUS (expected $expected)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Smoke Test — $(date -u '+%Y-%m-%d %H:%M UTC') ==="
echo "Target: $BASE"
echo ""

echo "--- Health & Infrastructure ---"
check "GET /api/health/live"            "200" "$BASE/api/health/live"
check "GET /api/health/ready"           "200" "$BASE/api/health/ready"
check "GET /api/health"                 "200" "$BASE/api/health"
check "GET /api/csrf-token"             "200" "$BASE/api/csrf-token"

echo ""
echo "--- Auth (unauthenticated) ---"
check "GET /api/auth/me (no session)"   "401" "$BASE/api/auth/me"
check "GET /api/auth/demo"              "200" "$BASE/api/auth/demo"

echo ""
echo "--- Products ---"
check "GET /api/products"               "200" "$BASE/api/products"
check "GET /api/products/enrichment/pending" "200" "$BASE/api/products/enrichment/pending"

echo ""
echo "--- Generations ---"
check "GET /api/generations"            "200" "$BASE/api/generations"

echo ""
echo "--- Pricing ---"
check "GET /api/pricing/estimate"       "200" "$BASE/api/pricing/estimate?model=gemini-2.0-flash"

echo ""
echo "--- Templates ---"
check "GET /api/templates"              "200" "$BASE/api/templates"
check "GET /api/templates/search"       "200" "$BASE/api/templates/search?q=steel"
check "GET /api/ad-templates/categories" "200" "$BASE/api/ad-templates/categories"
check "GET /api/ad-templates"           "200" "$BASE/api/ad-templates"
check "GET /api/prompt-templates"       "200" "$BASE/api/prompt-templates"

echo ""
echo "--- Content Planner ---"
check "GET /api/content-planner/templates" "200" "$BASE/api/content-planner/templates"

echo ""
echo "--- Quota ---"
check "GET /api/quota/status"           "200" "$BASE/api/quota/status"
check "GET /api/quota/history"          "200" "$BASE/api/quota/history"
check "GET /api/quota/breakdown"        "200" "$BASE/api/quota/breakdown"
check "GET /api/quota/rate-limit-status" "200" "$BASE/api/quota/rate-limit-status"
check "GET /api/quota/check-alerts"     "200" "$BASE/api/quota/check-alerts"
check "GET /api/quota/google/status"    "200" "$BASE/api/quota/google/status"
check "GET /api/quota/google/snapshot"  "200" "$BASE/api/quota/google/snapshot"

echo ""
echo "=== Results: $PASS passed, $FAIL failed, $TOTAL total ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
```

---

## Quick Run Script (Auth-Required Endpoints)

```bash
#!/bin/bash
# Smoke test — auth-required endpoints
# Usage: SESSION="your-connect.sid-value" bash SMOKE-CMDS-auth.sh
#
# To get your session cookie:
# 1. Open browser, log in to the app
# 2. DevTools > Application > Cookies > connect.sid
# 3. Copy the value

BASE="https://automated-ads-agent-production.up.railway.app"
PASS=0
FAIL=0
TOTAL=0

if [ -z "$SESSION" ]; then
  echo "ERROR: Set SESSION env var to your connect.sid cookie value"
  echo "Usage: SESSION=\"s%3A...\" bash SMOKE-CMDS-auth.sh"
  exit 1
fi

COOKIE="connect.sid=$SESSION"

check_auth() {
  local label="$1"
  local expected="$2"
  local url="$3"
  TOTAL=$((TOTAL + 1))
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 --cookie "$COOKIE" "$url")
  if [ "$STATUS" = "$expected" ]; then
    echo "  PASS  $label -> $STATUS"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $label -> $STATUS (expected $expected)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Auth Smoke Test — $(date -u '+%Y-%m-%d %H:%M UTC') ==="
echo "Target: $BASE"
echo ""

echo "--- Auth ---"
check_auth "GET /api/auth/me"                          "200" "$BASE/api/auth/me"
check_auth "GET /api/auth/export"                      "200" "$BASE/api/auth/export"

echo ""
echo "--- Brand Profile ---"
check_auth "GET /api/brand-profile"                    "200" "$BASE/api/brand-profile"

echo ""
echo "--- Products (auth) ---"
check_auth "GET /api/brand-images"                     "200" "$BASE/api/brand-images"

echo ""
echo "--- Monitoring ---"
check_auth "GET /api/monitoring/health"                "200" "$BASE/api/monitoring/health"
check_auth "GET /api/monitoring/performance"           "200" "$BASE/api/monitoring/performance"
check_auth "GET /api/monitoring/errors"                "200" "$BASE/api/monitoring/errors"
check_auth "GET /api/monitoring/system"                "200" "$BASE/api/monitoring/system"
check_auth "GET /api/monitoring/endpoints"             "200" "$BASE/api/monitoring/endpoints"

echo ""
echo "--- Content Planner ---"
check_auth "GET /api/content-planner/balance"          "200" "$BASE/api/content-planner/balance"
check_auth "GET /api/content-planner/posts"            "200" "$BASE/api/content-planner/posts"

echo ""
echo "--- Weekly Planner ---"
check_auth "GET /api/planner/weekly/current"           "200" "$BASE/api/planner/weekly/current"

echo ""
echo "--- Calendar ---"
check_auth "GET /api/calendar/posts"                   "200" "$BASE/api/calendar/posts?start=2026-02-01&end=2026-02-28"

echo ""
echo "--- Approval Queue ---"
check_auth "GET /api/approval-queue"                   "200" "$BASE/api/approval-queue"
check_auth "GET /api/approval-queue/settings"          "200" "$BASE/api/approval-queue/settings"

echo ""
echo "--- Social ---"
check_auth "GET /api/social/accounts"                  "200" "$BASE/api/social/accounts"

echo ""
echo "--- Settings ---"
check_auth "GET /api/settings/api-keys"                "200" "$BASE/api/settings/api-keys"
check_auth "GET /api/settings/n8n"                     "200" "$BASE/api/settings/n8n"

echo ""
echo "--- Intelligence ---"
check_auth "GET /api/intelligence/priorities"          "200" "$BASE/api/intelligence/priorities"
check_auth "GET /api/intelligence/business"            "200" "$BASE/api/intelligence/business"
check_auth "GET /api/intelligence/onboarding-status"   "200" "$BASE/api/intelligence/onboarding-status"
check_auth "GET /api/intelligence/stats"               "200" "$BASE/api/intelligence/stats"

echo ""
echo "--- Quota (auth) ---"
check_auth "GET /api/quota/alerts"                     "200" "$BASE/api/quota/alerts"

echo ""
echo "--- Learned Patterns ---"
check_auth "GET /api/learned-patterns"                 "200" "$BASE/api/learned-patterns"

echo ""
echo "--- Style References ---"
check_auth "GET /api/style-references"                 "200" "$BASE/api/style-references"

echo ""
echo "--- Training ---"
check_auth "GET /api/training/datasets"                "200" "$BASE/api/training/datasets"
check_auth "GET /api/training/models"                  "200" "$BASE/api/training/models"

echo ""
echo "--- File Search ---"
check_auth "GET /api/file-search/files"                "200" "$BASE/api/file-search/files"

echo ""
echo "--- Performing Ad Templates ---"
check_auth "GET /api/performing-ad-templates"           "200" "$BASE/api/performing-ad-templates"
check_auth "GET /api/performing-ad-templates/featured"  "200" "$BASE/api/performing-ad-templates/featured"
check_auth "GET /api/performing-ad-templates/top"       "200" "$BASE/api/performing-ad-templates/top"

echo ""
echo "--- Scenarios ---"
check_auth "GET /api/installation-scenarios"           "200" "$BASE/api/installation-scenarios"

echo ""
echo "=== Results: $PASS passed, $FAIL failed, $TOTAL total ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
```
