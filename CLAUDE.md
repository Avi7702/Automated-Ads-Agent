# Automated Ads Agent - Claude Code Project Rules

---

## Core Principle: VERIFY, DON'T ASSUME

You must verify information before responding. Never make assumptions about code, APIs, dates, versions, or any factual claims.

---

## CRITICAL: Production-First Mindset

**NEVER take the easy path. ALWAYS build for production.**

### Mandatory Requirements:

1. **Always use official APIs** - Never build workarounds when proper APIs exist
2. **Always use the most comprehensive solution** - Don't build MVP when production-grade is available
3. **Always verify with official documentation** - Web search for the latest docs (last 4-6 weeks)
4. **Never assume API limitations** - Research first, then implement
5. **Cost is secondary to correctness** - A free/cheap solution that's incomplete is worthless

### When Building Integrations:

1. **Research the official API first** - What endpoints exist? What data is available?
2. **Check for service accounts/proper auth** - Don't use API keys when service accounts are needed
3. **Use Cloud Monitoring/Observability APIs** - For any quota/usage tracking
4. **Implement proper sync mechanisms** - With "last updated" and "next update" timestamps
5. **Store historical data** - Don't just show real-time, track trends

### Examples of WRONG approach (DO NOT DO):
- ❌ "Google doesn't provide X" without verifying with web search
- ❌ Building local tracking when Cloud Monitoring API exists
- ❌ Using estimates when real data is available via API
- ❌ Skipping service account setup because API key is "easier"
- ❌ Assuming an API has limitations without checking latest docs

### Examples of CORRECT approach:
- ✅ Web search for "[Service] API quota monitoring endpoint 2025"
- ✅ Checking official docs for Cloud Monitoring metrics
- ✅ Implementing proper service account authentication
- ✅ Building hybrid systems (real-time local + periodic sync from source)
- ✅ Displaying "Last synced: X min ago, Next sync: Y min"

---

## Research & Current Information

- **Always use web search** to check today's date and verify any time-sensitive information
- Before answering questions about libraries, APIs, frameworks, or tools: search for the most recent documentation (prioritize info from the last 4-6 weeks)
- If a user asks about "current" or "latest" anything, search first—do not rely on training data
- When recommending packages or dependencies, verify they still exist and check their current version
- If search results conflict with your training data, trust the search results

---

## Codebase Verification

- **Read files before editing them**—never assume file contents
- **Read files before answering questions** about how something works in this project
- Check the actual implementation, don't guess based on file names or conventions
- Before saying "this file probably contains X," open it and verify
- When asked about project structure, use directory listings and file reads, not assumptions
- If you're unsure which file contains something, search the codebase—don't guess

---

## Honesty About Uncertainty

- If you don't know something, say so—then go find out
- Clearly distinguish between "I verified this" vs "I'm assuming this"
- If you cannot verify something, explicitly state that limitation
- Don't fabricate error messages, API responses, or code behavior
- If a search or file read fails, report that instead of guessing

---

## Before Making Changes

- Read the existing code first
- Understand the current patterns and conventions used in this project
- Check for existing utilities/helpers before creating new ones
- Verify import paths by checking actual file locations
- Look at how similar things are done elsewhere in the codebase

---

## When Answering Questions

- Show which files you checked
- Quote relevant code snippets as evidence
- Cite sources when using web search results
- If you had to make any assumptions, list them explicitly
- If multiple interpretations exist, ask for clarification instead of guessing

---

## Forbidden Behaviors

- Do NOT invent function signatures, API endpoints, or library methods
- Do NOT assume a package or feature exists without verification
- Do NOT guess at configuration options—look them up
- Do NOT assume file paths—verify they exist
- Do NOT make up version numbers or release dates

---

## MANDATORY: All Agents Must Follow These Rules

### Before Starting ANY Task

1. **Read the task specification completely** from `docs/IMPLEMENTATION-TASKS.md`
2. **Consult the Component Classification Schema** from `docs/COMPONENT-CLASSIFICATION-SCHEMA.md`
   - Determine if new code is `[UI]`, `[TOOL]`, `[KB]`, `[HYB]`, or `[INFRA]`
   - Add new components to the schema before implementing
3. **Check for existing implementations** - never duplicate work
4. **For multi-file tasks**: Run `/feature-dev [task]` to get structured guidance
5. **Understand the codebase first**: Use the Explore agent or read relevant files

### During Implementation

1. **Follow existing patterns** - check how similar code is structured
2. **Write tests first** (TDD) - tests go in `server/__tests__/`
3. **No console.log in production code** - use proper logging if needed
4. **No hardcoded secrets** - use environment variables
5. **Type everything** - this is a TypeScript project

### Before Committing

1. **Run tests**: `npm test` - all tests must pass
2. **Run `/code-review`** - fix any issues found
3. **Verify acceptance criteria** from task spec
4. **Branch naming**: `claude/task-X.X-description`

### Commit Message Format

```
feat|fix|refactor: short description (Task X.X)

- Bullet point of what changed
- Another change

[Generated with Claude Code]
Co-Authored-By: Claude <noreply@anthropic.com>
```

## Project Structure

```
server/
  __tests__/       # Jest tests
  middleware/      # Express middleware (auth, rateLimit)
  services/        # Business logic (authService)
  routes.ts        # API route definitions
  app.ts           # Express app setup
  storage.ts       # Database/storage layer
docs/
  IMPLEMENTATION-TASKS.md        # Task specifications
  COMPONENT-CLASSIFICATION-SCHEMA.md  # Component categorization (MUST READ)
```

## Key Files to Know

- `docs/COMPONENT-CLASSIFICATION-SCHEMA.md` - **MUST READ** before adding features
- `server/middleware/rateLimit.ts` - Rate limiting (Task 1.1 complete)
- `server/services/authService.ts` - Authentication logic (Task 1.2 complete)
- `server/middleware/auth.ts` - Auth middleware
- `server/middleware/validate.ts` - Zod validation middleware (Task 2.1 complete)
- `server/validation/schemas.ts` - Validation schemas (Task 2.1 complete)
- `server/services/ideaBankService.ts` - Main AI orchestrator
- `server/services/fileSearchService.ts` - Central RAG query hub
- `server/types/api.ts` - API response types (Task 2.4 complete)
- `server/routes.ts` - All API endpoints
- `docker-compose.test.yml` - PostgreSQL for integration tests

## Environment

- Node.js + TypeScript
- Express.js server
- PostgreSQL database (via Drizzle ORM)
- Jest for testing

## Task Status

| Task | Status | Branch |
|------|--------|--------|
| 1.1 Rate Limiting | Complete | `claude/task-1.1-rate-limiting` |
| 1.2 Authentication | Complete | `claude/task-1.2-authentication` |
| 2.1 Input Validation | Complete | `claude/task-2.1-input-validation` |
| 2.2 Gemini Integration | Complete | `claude/task-2.2-gemini-integration` |
| 2.3 Image Storage | Complete | `claude/task-2.3-image-storage` |
| 2.4 Transform Endpoint | Complete | `claude/task-2.4-generate-endpoint` |
| 3.1 Edit Schema | Complete | `claude/task-3.1-edit-schema` |
| 3.2 Edit Endpoint | Complete | `claude/task-3.2-edit-endpoint` |
| 3.3 History Endpoint | Complete | `claude/task-3.3-history-endpoint` |
| 3.4 Frontend Edit UI | Complete | `claude/task-3.4-frontend-edit-ui` |
| **4.1 Copywriting Backend** | **Complete** | `main` (Dec 24, 2025) |
| **6.0 Idea Bank UI** | **Complete** | `main` (Dec 24, 2025) |

## Phase 6 Implementation

**Full implementation details:** `docs/PHASE-6-IDEA-BANK-UI.md`
**Component architecture:** `docs/IDEA-BANK-COMPONENT-STRUCTURE.md`
**User guide:** `docs/IDEA-BANK-USAGE-GUIDE.md`

### Summary (100%) ✅

Enhanced Idea Bank UI with standardized response handling:

**Features Implemented:**
1. New IdeaBankPanel component with rich metadata display
2. Multi-product support (1-6 products)
3. Mode badges (exact_insert, inspiration, standard)
4. Confidence indicators with visual scoring
5. Source attribution (vision, KB, web search, templates)
6. Platform and aspect ratio recommendations
7. Analysis status summary
8. Backward compatibility with legacy endpoints
9. Auto-refresh on product selection
10. Error handling and fallback flows

**Files Created:**
- `client/src/components/IdeaBankPanel.tsx` - Main component (350 lines)

**Files Modified:**
- `client/src/pages/Home.tsx` - Integrated IdeaBankPanel, removed old code
- `server/routes.ts` - Added multi-product support to `/api/idea-bank/suggest`
- `shared/types/ideaBank.ts` - Updated request interface

**Documentation:**
- `docs/PHASE-6-IDEA-BANK-UI.md` - Technical overview
- `docs/IDEA-BANK-COMPONENT-STRUCTURE.md` - Component architecture
- `docs/IDEA-BANK-USAGE-GUIDE.md` - User guide
- `docs/PHASE-6-DEPLOYMENT-CHECKLIST.md` - Deployment guide

**Build Status:** Passed (no TypeScript errors)

## Phase 3 Implementation

**Full spec with production-ready code:** `docs/PHASE-3-IMPLEMENTATION-READY.md`

This document contains:
- Complete code for all 4 tasks
- All test cases (30 new tests total)
- Schema changes, type definitions, API endpoints
- Frontend React components with CSS

## Phase 4 Implementation

**Full implementation summary:** `docs/PHASE-4-IMPLEMENTATION-SUMMARY.md`
**Research & plan:** `C:\Users\avibm\.claude\plans\linked-swimming-lantern.md`

### Backend Complete (100%) ✅

All 13 features implemented:
1. Hook generation (6 proven patterns)
2. Copywriting frameworks (AIDA, PAS, BAB, FAB + Auto)
3. Character limit validation (all 5 platforms)
4. Platform-specific nuances (2025 research-based)
5. PTCF prompt engineering framework
6. Multi-variation generation (1-5 variations, default 3)
7. Target audience parameters
8. Brand voice guidelines
9. Campaign objectives (awareness, consideration, conversion, engagement)
10. Quality scoring with AI reasoning
11. All 5 platforms (Instagram, LinkedIn, Facebook, Twitter/X, TikTok)
12. Social proof integration
13. Product benefits

**Files Created/Modified:**
- `shared/schema.ts` - Added `adCopy` table + `brandVoice` to users
- `server/validation/schemas.ts` - Added `generateCopySchema`
- `server/services/copywritingService.ts` - 550+ lines, PTCF prompts
- `server/storage.ts` - Added 6 adCopy methods
- `server/routes.ts` - Added 5 copywriting endpoints
- `server/__tests__/copywriting.test.ts` - 700+ lines, 24 test suites

**Test Coverage:** 24 test suites, 400+ assertions

**Next Steps:**
1. Run `npm run db:push` to create database tables
2. (Optional) Build frontend CopyPanel UI
3. (Optional) Add brand voice settings UI

## Claude Code Plugins (Enabled)

The following plugins from the anthropics/claude-code marketplace are enabled:

| Plugin | Purpose | Usage |
|--------|---------|-------|
| **code-review** | Multi-agent PR review with confidence scoring | `/code-review` or `/code-review --comment` |
| **commit-commands** | Streamlined git commit workflow | `/commit` |
| **pr-review-toolkit** | Enhanced PR review capabilities | `/review-pr [PR#]` |
| **frontend-design** | Distinctive UI design, avoids generic AI aesthetics | Auto-activates for frontend work |
| **security-guidance** | PreToolUse hook monitoring security patterns | Auto-activates on file edits |

### Security Patterns Monitored (via security-guidance)

- GitHub Actions workflow injection
- Child process execution vulnerabilities
- Dynamic code evaluation (eval, Function)
- XSS vectors (innerHTML, dangerouslySetInnerHTML)
- Unsafe serialization (pickle)
- OS command injection

### Existing Hookify Rules (local)

Located in `.claude/hookify.*.local.md`:
- `console-log` - Prevents console.log in production
- `no-secrets` - Blocks hardcoded secrets
- `no-eval` - Prevents eval() usage
- `no-force-push` - Blocks git push --force
- `dangerous-rm` - Warns on dangerous rm commands
- `require-tests` - Requires tests for new code
- `sensitive-files` - Protects sensitive files

## Agent Handoff Protocol

When completing a task, update this file with:
1. Task status in the table above
2. Any new key files added
3. Any gotchas for the next agent

---

## Railway Deployment (API Access)

**Production URL:** https://automated-ads-agent-production.up.railway.app
**Health Check:** `/api/health`

### API Credentials (DO NOT MODIFY)

```
Token: 4615359f-6328-413f-b418-4f0c6979161a
Project ID: 772de8a1-ac15-4f2a-8fdb-766c78c41761
Service ID: 28ce02bc-f4ad-4ea7-aab6-bffc98a47e2f
Environment ID: 14f7ad84-cb42-4ec6-a9e5-29826e2f9882 (production)
Project Name: surprising-smile
Service Name: automated-ads-agent
```

### Authentication

Railway uses `Project-Access-Token` header (NOT `Authorization: Bearer`):

```bash
curl -X POST https://backboard.railway.app/graphql/v2 \
  -H "Content-Type: application/json" \
  -H "Project-Access-Token: 4615359f-6328-413f-b418-4f0c6979161a" \
  -d '{"query": "YOUR_GRAPHQL_QUERY"}'
```

### Common Operations

**Check Deployment Status:**
```bash
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Content-Type: application/json" \
  -H "Project-Access-Token: 4615359f-6328-413f-b418-4f0c6979161a" \
  -d '{"query": "query { deployments(first: 3, input: { serviceId: \"28ce02bc-f4ad-4ea7-aab6-bffc98a47e2f\" }) { edges { node { id status createdAt } } } }"}'
```

**Trigger Redeploy:**
```bash
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Content-Type: application/json" \
  -H "Project-Access-Token: 4615359f-6328-413f-b418-4f0c6979161a" \
  -d '{"query": "mutation { serviceInstanceRedeploy(serviceId: \"28ce02bc-f4ad-4ea7-aab6-bffc98a47e2f\", environmentId: \"14f7ad84-cb42-4ec6-a9e5-29826e2f9882\") }"}'
```

**Check JS Bundle Hash (verify deployment):**
```bash
curl -s "https://automated-ads-agent-production.up.railway.app/" | grep -o 'assets/index-[^"]*\.js'
```

### Deployment Status Values

- `INITIALIZING` - Starting build
- `BUILDING` - Build in progress
- `DEPLOYING` - Deploying to infrastructure
- `SUCCESS` - Deployment complete
- `FAILED` - Build/deploy failed
- `REMOVED` - Old deployment removed

### Docs

- [Railway Public API Guide](https://docs.railway.com/guides/public-api)
- [Manage Deployments](https://docs.railway.com/guides/manage-deployments)
