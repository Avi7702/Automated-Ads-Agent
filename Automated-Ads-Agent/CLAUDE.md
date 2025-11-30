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

## Agent Handoff Protocol

When completing a task, update this file with:
1. Task status in the table above
2. Any new key files added
3. Any gotchas for the next agent
