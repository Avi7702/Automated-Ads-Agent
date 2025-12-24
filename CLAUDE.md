# Automated Ads Agent - Claude Code Project Rules

## MANDATORY: All Agents Must Follow These Rules

### Before Starting ANY Task

1. **Read the task specification completely** from `docs/IMPLEMENTATION-TASKS.md`
2. **Check for existing implementations** - never duplicate work
3. **For multi-file tasks**: Run `/feature-dev [task]` to get structured guidance
4. **Understand the codebase first**: Use the Explore agent or read relevant files

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
  IMPLEMENTATION-TASKS.md  # Task specifications
```

## Key Files to Know

- `server/middleware/rateLimit.ts` - Rate limiting (Task 1.1 complete)
- `server/services/authService.ts` - Authentication logic (Task 1.2 complete)
- `server/middleware/auth.ts` - Auth middleware
- `server/middleware/validate.ts` - Zod validation middleware (Task 2.1 complete)
- `server/validation/schemas.ts` - Validation schemas (Task 2.1 complete)
- `server/services/geminiService.ts` - Gemini API wrapper (Task 2.2 complete)
- `server/services/imageStorage.ts` - Image storage service (Task 2.3 complete)
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
