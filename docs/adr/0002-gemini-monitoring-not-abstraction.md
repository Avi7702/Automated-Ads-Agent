# 2. Gemini Monitoring, Not Multi-Provider Abstraction

Date: 2026-01-29
Status: Accepted

## Context

The platform has 20+ services that call the Gemini API directly through `server/lib/geminiClient.ts`. When Gemini experiences downtime or quota exhaustion, the entire AI feature set fails. The existing client (`geminiClient.ts`) already has retry logic (3 attempts, exponential backoff) and error classification helpers (`isQuotaError()` at line 147, `isServiceUnavailableError()` at line 158), but these helpers were unused -- failures were silently swallowed after retries exhausted.

Two approaches were considered:

1. **Abstract to multi-provider** -- Wrap Gemini behind an interface, add OpenAI/Anthropic as fallback providers. Requires mapping prompts across providers, managing multiple API keys, and handling different response formats.
2. **Monitor and alert** -- Keep Gemini as the sole provider, but add health tracking, alerting, and graceful error responses so the team knows immediately when Gemini is down and users see clear messages.

## Decision

Keep Gemini as the sole AI provider (intentional vendor choice) and invest in monitoring, alerting, and graceful degradation instead of multi-provider abstraction.

Specifically:

- **Wire existing error helpers** -- `isQuotaError()` and `isServiceUnavailableError()` now classify failures after retries exhaust, logged as structured errors via `geminiLogger.error()`.
- **Health monitoring** -- Rolling failure/success rates tracked in Redis (`gemini:failures:{minute_bucket}`, `gemini:successes:{minute_bucket}`). The `/api/health` endpoint reports `gemini.status` as `healthy`, `degraded`, or `down` with failure rate percentage and last success timestamp.
- **Alerting** -- Failure rate > 50% over 5 minutes triggers a Sentry CRITICAL alert.
- **Graceful responses** -- When Gemini is detected as down, AI endpoints return HTTP 503 with `Retry-After: 30` header and a clear message: `"AI service temporarily unavailable"`. Non-AI endpoints (CRUD, auth, product library) continue working normally.

## Consequences

**Positive:**

- Zero changes to 20 consumer services -- monitoring is centralized in `geminiClient.ts`
- Team knows within minutes when Gemini is degraded or down (Sentry alert)
- Users see actionable error messages instead of generic 500 errors
- Non-AI features remain available during Gemini outages
- Health endpoint provides real-time visibility: `GET https://automated-ads-agent-production.up.railway.app/api/health`
- Avoids the significant complexity of mapping prompts and response formats across providers

**Negative:**

- Vendor lock-in to Google Gemini -- if Gemini has a prolonged outage, AI features are fully unavailable
- No automatic failover to another AI provider
- Monitoring adds a small Redis overhead per Gemini call (~1ms for INCR)

**Mitigations:**

- Gemini's SLA and Google's infrastructure make prolonged outages rare
- The PTCF prompt framework (`server/services/copywritingService.ts`) is provider-agnostic in structure -- migration to another provider would require changing the client layer, not the prompt engineering
- If vendor lock-in becomes a strategic concern, this decision can be revisited with ADR-0005
