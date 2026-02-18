# Deploy & Rollback Playbook

Production: `https://automated-ads-agent-production.up.railway.app`
Hosting: Railway (service `28ce02bc-f4ad-4ea7-aab6-bffc98a47e2f`)

---

## Normal Deploy Flow

Merging a PR to `main` triggers the deploy pipeline automatically:

1. **Staging deploy** — automatic on merge
2. **Staging smoke checks** — health, login page, auth gate
3. **Manual approval** — required via GitHub `production` environment
4. **Production deploy** — after approval
5. **Production smoke checks** — same 3 checks against prod URL

## Rollback (Railway Redeploy Previous)

Railway keeps deployment history. Rolling back = redeploying the last known-good deployment.

### Step 1 — Identify the bad deploy

```bash
# List recent deployments (newest first)
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Content-Type: application/json" \
  -H "Project-Access-Token: $RAILWAY_TOKEN" \
  -d '{"query": "query { deployments(first: 5, input: { serviceId: \"28ce02bc-f4ad-4ea7-aab6-bffc98a47e2f\" }) { edges { node { id status createdAt staticUrl } } } }"}' \
  | jq '.data.deployments.edges[].node'
```

Note the **id** of the last `SUCCESS` deployment before the bad one.

### Step 2 — Trigger redeploy of last good version

```bash
# Redeploy production (rolls back to previous successful deployment)
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Content-Type: application/json" \
  -H "Project-Access-Token: $RAILWAY_TOKEN" \
  -d '{"query": "mutation { serviceInstanceRedeploy(serviceId: \"28ce02bc-f4ad-4ea7-aab6-bffc98a47e2f\", environmentId: \"14f7ad84-cb42-4ec6-a9e5-29826e2f9882\") }"}'
```

### Step 3 — Verify rollback

```bash
# 1. Health check
curl -s https://automated-ads-agent-production.up.railway.app/api/health
# Expected: {"status":"ok", ...}

# 2. Login page loads
curl -s https://automated-ads-agent-production.up.railway.app/ | grep -o '<div id="root"'
# Expected: <div id="root"

# 3. Auth gate works
curl -s -o /dev/null -w '%{http_code}' https://automated-ads-agent-production.up.railway.app/api/products
# Expected: 401

# 4. JS bundle hash changed back
curl -s https://automated-ads-agent-production.up.railway.app/ | grep -o 'assets/index-[^"]*\.js'
# Compare with pre-deploy hash
```

### Step 4 — Revert the code

```bash
git revert <bad-merge-commit> --no-edit
git push origin main
```

This creates a clean revert commit so the bad code doesn't re-deploy.

---

## Rollback via Git (Alternative)

If Railway redeploy is not available or you need to pin a specific commit:

```bash
# 1. Find the last good commit
git log --oneline -10 origin/main

# 2. Create a revert branch
git checkout -b hotfix/revert-<description> <last-good-commit>

# 3. Push and open PR
git push -u origin hotfix/revert-<description>
gh pr create --title "revert: <description>" --body "Rollback to <commit>"

# 4. Merge immediately (bypasses normal review if urgent)
gh pr merge --merge
```

---

## Verification Checklist

After any rollback, verify all of these:

- [ ] `GET /api/health` returns 200
- [ ] Login page loads (`<div id="root"` present)
- [ ] `GET /api/products` returns 401 (auth gate)
- [ ] JS bundle hash matches expected version
- [ ] No new errors in Railway deployment logs

---

## Escalation

If rollback fails or production is unresponsive:

1. Check Railway dashboard: https://railway.app/project/772de8a1-ac15-4f2a-8fdb-766c78c41761
2. Check deployment logs in Railway console
3. If Railway is down, check https://status.railway.app
