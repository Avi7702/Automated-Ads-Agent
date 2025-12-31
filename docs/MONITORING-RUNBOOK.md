# Monitoring Runbook

This guide covers monitoring, alerting, and incident response for the Automated Ads Agent.

## Current Setup

| Component | Tool | Dashboard |
|-----------|------|-----------|
| Metrics & Traces | OpenTelemetry → Axiom | [axiom.co](https://app.axiom.co) |
| Logs | Pino → Axiom | Via OTLP |
| Alerts | Axiom Monitors | Configured in Axiom UI |
| Notifications | Axiom → Slack | Via webhook |

## Setting Up Axiom Alerts

### Step 1: Access Axiom Dashboard

1. Go to [app.axiom.co](https://app.axiom.co)
2. Log in with your credentials
3. Navigate to the `automated-ads-agent` dataset

### Step 2: Create Error Rate Monitor

1. Click **Monitors** in the left sidebar
2. Click **New Monitor**
3. Configure:

```yaml
Name: High Error Rate
Dataset: automated-ads-agent
Query: |
  | where level == 'error'
  | summarize count() by bin(_time, 5m)
Threshold: > 10 errors in 5 minutes
Severity: High
```

### Step 3: Create API Latency Monitor

```yaml
Name: Slow API Response
Dataset: automated-ads-agent
Query: |
  | where name contains 'http'
  | where duration > 5000
  | summarize count() by bin(_time, 5m)
Threshold: > 5 slow requests in 5 minutes
Severity: Medium
```

### Step 4: Create Gemini Error Monitor

```yaml
Name: Gemini API Failures
Dataset: automated-ads-agent
Query: |
  | where module == 'gemini'
  | where level == 'error'
  | summarize count() by bin(_time, 10m)
Threshold: > 3 failures in 10 minutes
Severity: High
```

## Setting Up Slack Notifications

### Step 1: Create Slack Webhook

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app or use existing
3. Enable **Incoming Webhooks**
4. Create webhook for your alerts channel
5. Copy the webhook URL

### Step 2: Configure Axiom Notifier

1. In Axiom, go to **Monitors** → **Manage Notifiers**
2. Click **New Notifier**
3. Select **Slack**
4. Paste your webhook URL
5. Name it (e.g., "Engineering Alerts")

### Step 3: Attach Notifier to Monitors

1. Edit each monitor
2. Add your Slack notifier
3. Save

## Alert Severity Levels

| Level | Response Time | Action |
|-------|---------------|--------|
| **Critical** | Immediate | Page on-call, investigate now |
| **High** | < 30 min | Investigate within the hour |
| **Medium** | < 4 hours | Check during work hours |
| **Low** | < 24 hours | Review in next standup |

## Common Issues and Fixes

### High Error Rate

**Symptoms**: Spike in error logs

**Investigation Steps**:
1. Check Axiom for error messages
2. Look for common error types
3. Check recent deployments

**Common Causes**:
- Database connection issues
- Gemini API quota exceeded
- Invalid user input

### Gemini API Failures

**Symptoms**: `gemini.requests.total` with `success=false`

**Investigation Steps**:
1. Check Gemini error type in logs
2. Verify API key is valid
3. Check quota in Google Cloud Console

**Common Fixes**:
- Rotate API key if compromised
- Wait for quota reset (daily)
- Switch to backup API key

### Slow API Response

**Symptoms**: P95 latency > 5s

**Investigation Steps**:
1. Check which endpoints are slow
2. Look at database query times
3. Check Gemini API latency

**Common Fixes**:
- Add database indexes
- Implement caching
- Increase connection pool

## Structured Logging

We use Pino for structured JSON logs. All logs are sent to Axiom.

### Log Levels

```typescript
logger.trace({ ... }, 'Very detailed debug info');
logger.debug({ ... }, 'Debug info');
logger.info({ userId, action }, 'Normal operation');
logger.warn({ ip, attempts }, 'Something unexpected');
logger.error({ err, userId }, 'Operation failed');
logger.fatal({ err }, 'App is crashing');
```

### Module Loggers

```typescript
import { authLogger, geminiLogger, apiLogger } from './lib/logger';

authLogger.info({ userId }, 'User logged in');
geminiLogger.error({ err }, 'Generation failed');
apiLogger.warn({ endpoint }, 'Rate limited');
```

### Searching Logs in Axiom

```apl
// Find all errors
| where level == 'error'

// Find errors for specific user
| where level == 'error' and userId == '123'

// Find Gemini failures
| where module == 'gemini' and level == 'error'

// Find slow requests
| where duration > 5000
```

## Metrics Available

### Gemini API

- `gemini.requests.total` - Total API calls
- `gemini.tokens.total` - Token usage
- `gemini.cost.total` - Estimated cost (USD)
- `gemini.request.duration` - Latency histogram

### User Activity

- `images.generations.total` - Images generated
- `images.edits.total` - Image edits
- `users.active` - Active user gauge

### Errors

- `api.errors.total` - API errors by type
- `ratelimit.hits.total` - Rate limit violations
- `auth.attempts.total` - Auth attempts

## Creating Dashboards

### Recommended Dashboard Panels

1. **Error Rate Over Time**
   - Query: `| where level == 'error' | summarize count() by bin(_time, 1h)`

2. **Gemini Cost Per Day**
   - Query: `| where name == 'gemini.cost.total' | summarize sum(value) by bin(_time, 1d)`

3. **API Latency P95**
   - Query: `| where name contains 'http' | summarize percentile(duration, 95) by bin(_time, 1h)`

4. **Active Users**
   - Query: `| where name == 'users.active' | summarize max(value) by bin(_time, 1h)`

## Escalation Contacts

| Role | Contact | When to Page |
|------|---------|--------------|
| On-call | Slack #oncall | Critical alerts |
| Lead Dev | @lead | High alerts not resolved in 30min |
| Product | @product | Customer-facing issues |

## Runbook Maintenance

- Review alerts monthly for noise
- Update thresholds based on traffic patterns
- Add new monitors for new features
- Remove obsolete monitors

---

Last updated: December 2024
