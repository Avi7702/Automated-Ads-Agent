# Task 2.1: Input Validation with Zod

## MISSION
Implement production-grade input validation using Zod for all API endpoints.

## CONSTRAINTS
- Branch: `claude/task-2.1-input-validation`
- Time limit: 4 subtasks, stop and report if blocked
- No changes outside scope without explicit approval
- All code must have tests

---

## PRE-FLIGHT CHECKLIST

### 1. Environment Verification
```
ACTION: Verify clean environment

VERIFY COMMAND:
git status && git branch --show-current && npm test 2>&1 | tail -10

EXPECTED OUTPUT MUST CONTAIN:
- "nothing to commit, working tree clean" OR list of expected files
- Current branch: master or existing task branch
- "Test Suites: X passed"
- "0 failed"

PROOF: Paste full terminal output

GATE: Cannot proceed if tests failing or uncommitted changes exist
```

### 2. Read Required Files
```
ACTION: Read these files before any coding

FILES TO READ:
1. CLAUDE.md - Project rules
2. docs/IMPLEMENTATION-TASKS.md - Task requirements
3. server/routes.ts - Current endpoint structure
4. shared/schema.ts - Existing types (if any)

GATE: If validation requirements unclear, STOP and ask user
```

### 3. Create Task Branch
```
ACTION: Create task branch

VERIFY COMMAND:
git checkout -b claude/task-2.1-input-validation && git branch --show-current

EXPECTED OUTPUT:
Switched to a new branch 'claude/task-2.1-input-validation'
claude/task-2.1-input-validation

PROOF: Paste terminal output

GATE: Must show exact branch name before proceeding
```

---

## SUBTASK 1: Create Validation Schemas

### 1.1 Write Schema Tests First

```
ACTION: Create test file for validation schemas

FILE: server/__tests__/validation.test.ts

TESTS TO WRITE (exact names):
1. "Validation Schemas › registerSchema › should accept valid registration data"
2. "Validation Schemas › registerSchema › should reject missing email"
3. "Validation Schemas › registerSchema › should reject invalid email format"
4. "Validation Schemas › registerSchema › should reject short password"
5. "Validation Schemas › loginSchema › should accept valid login data"
6. "Validation Schemas › loginSchema › should reject missing fields"
7. "Validation Schemas › transformSchema › should accept valid transform request"
8. "Validation Schemas › transformSchema › should reject missing image URL"

VERIFY COMMAND:
npm test -- --testPathPattern="validation" 2>&1

EXPECTED OUTPUT AT THIS STAGE:
- Tests should FAIL (schemas don't exist yet)
- Output shows test names listed above
- "8 failed" or "Cannot find module" (both acceptable)

PROOF: Paste full terminal output showing tests exist

REJECTION CRITERIA:
- "0 tests found" = REJECTED
- "8 passed" = REJECTED (must fail before implementation)
- Test names don't match above = REJECTED
```

### 1.2 Implement Validation Schemas

```
ACTION: Create Zod schemas for all endpoints

FILE: server/validation/schemas.ts

SCHEMAS TO IMPLEMENT:
1. registerSchema: { email: string (email format), password: string (min 8) }
2. loginSchema: { email: string, password: string }
3. transformSchema: { imageUrl: string (url format), prompt: string }
4. editSchema: { prompt: string (min 1) }
5. productSchema: { name: string, description?: string, imageUrl?: string }

CODE REQUIREMENTS:
- Use Zod (already in package.json)
- Export all schemas
- Include helpful error messages
- No console.log

VERIFY COMMAND:
npm test -- --testPathPattern="validation" 2>&1

EXPECTED OUTPUT:
- "8 passed"
- "0 failed"
- No TypeScript errors in output

PROOF: Paste full terminal output

REJECTION CRITERIA:
- Any test failing = REJECTED
- TypeScript errors = REJECTED
- Missing any required schema = REJECTED
```

### 1.3 Checkpoint 1

```
ACTION: Commit schema work

VERIFY COMMANDS:
git add server/validation/ server/__tests__/validation.test.ts
git diff --cached --stat
git commit -m "checkpoint: add Zod validation schemas (Task 2.1)"

EXPECTED:
- 2 files staged
- Commit hash returned

PROOF: Paste commit output

GATE: Must see commit hash before Subtask 2
```

---

## SUBTASK 2: Create Validation Middleware

### 2.1 Write Middleware Tests

```
ACTION: Add middleware tests to validation.test.ts

TESTS TO ADD (exact names):
1. "Validation Middleware › validate › should pass valid data to next()"
2. "Validation Middleware › validate › should return 400 for invalid data"
3. "Validation Middleware › validate › should include field errors in response"
4. "Validation Middleware › validate › should sanitize error messages"

VERIFY COMMAND:
npm test -- --testPathPattern="validation" 2>&1

EXPECTED OUTPUT:
- Previous 8 tests still pass
- New 4 tests FAIL (middleware not implemented)
- "8 passed, 4 failed" pattern

PROOF: Paste terminal output

REJECTION: Previous tests regressing = REJECTED
```

### 2.2 Implement Validation Middleware

```
ACTION: Create validation middleware

FILE: server/middleware/validate.ts

IMPLEMENTATION:
- Export function: validate(schema: ZodSchema)
- Returns Express middleware
- On success: call next() with parsed data in req.body
- On failure: return 400 with { error: string, details: FieldError[] }
- Never expose internal Zod error structure

VERIFY COMMAND:
npm test -- --testPathPattern="validation" 2>&1

EXPECTED OUTPUT:
- "12 passed"
- "0 failed"

PROOF: Paste terminal output

REJECTION: Any failure = REJECTED
```

### 2.3 Checkpoint 2

```
ACTION: Commit middleware

VERIFY COMMANDS:
git add server/middleware/validate.ts server/__tests__/validation.test.ts
git commit -m "checkpoint: add validation middleware (Task 2.1)"

EXPECTED: Commit succeeds

PROOF: Paste commit hash

GATE: Must succeed before Subtask 3
```

---

## SUBTASK 3: Apply Validation to Routes

### 3.1 Write Integration Tests

```
ACTION: Add route validation tests

FILE: server/__tests__/validation.test.ts (add to existing)

TESTS TO ADD:
1. "Route Validation › POST /api/auth/register › should reject invalid email"
2. "Route Validation › POST /api/auth/register › should reject short password"
3. "Route Validation › POST /api/auth/login › should reject empty body"
4. "Route Validation › POST /api/transform › should reject missing imageUrl"
5. "Route Validation › POST /api/products › should require name field"

VERIFY COMMAND:
npm test -- --testPathPattern="validation" 2>&1

EXPECTED: New tests fail, previous tests pass

PROOF: Paste output
```

### 3.2 Apply Middleware to Routes

```
ACTION: Add validation middleware to routes.ts

FILE: server/routes.ts

CHANGES:
- Import validate middleware and schemas
- Add validate(registerSchema) to POST /api/auth/register
- Add validate(loginSchema) to POST /api/auth/login
- Add validate(transformSchema) to POST /api/transform
- Add validate(editSchema) to POST /api/generations/:id/edit
- Add validate(productSchema) to POST /api/products

VERIFY COMMAND:
npm test 2>&1

EXPECTED OUTPUT:
- ALL tests pass (validation + auth + rateLimit)
- "0 failed"

PROOF: Paste full test output

REJECTION: Any test failing = REJECTED (may have broken auth tests)
```

### 3.3 Checkpoint 3

```
ACTION: Commit route changes

VERIFY COMMAND:
git add server/routes.ts server/__tests__/validation.test.ts
git commit -m "checkpoint: apply validation to routes (Task 2.1)"

PROOF: Paste commit hash
```

---

## SUBTASK 4: Error Response Standardization

### 4.1 Verify Error Format

```
ACTION: Ensure all validation errors follow standard format

VERIFY COMMAND:
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "bad", "password": "x"}'

EXPECTED RESPONSE FORMAT:
{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}

PROOF: Paste actual curl response

REJECTION: Different format = must fix before proceeding
```

---

## INTEGRATION VERIFICATION

### Full Test Suite
```
ACTION: Run all tests

VERIFY COMMAND:
npm test 2>&1

EXPECTED OUTPUT MUST CONTAIN:
- "Test Suites: X passed, 0 failed"
- "Tests: Y passed, 0 failed"
- Includes validation, auth, and rateLimit tests

PROOF: Paste complete test summary

REJECTION: Any failure = fix before final commit
```

---

## FINAL COMMIT & PUSH

```
ACTION: Final commit and push

VERIFY COMMANDS:
git status
git add .
git commit -m "feat: add Zod input validation for all endpoints (Task 2.1)

- Add validation schemas for register, login, transform, edit, products
- Create reusable validation middleware
- Apply validation to all API routes
- Standardize error response format

Tests: 17 new validation tests, all passing

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push -u origin claude/task-2.1-input-validation

EXPECTED:
- Push succeeds
- Shows remote URL

PROOF: Paste push output

GATE: Task incomplete until push succeeds
```

---

## POST-TASK CHECKLIST

```
ACTION: Update documentation

UPDATES REQUIRED:
1. CLAUDE.md - Add to task status table:
   | 2.1 Input Validation | Complete | claude/task-2.1-input-validation |

2. Add to "Key Files to Know":
   - server/validation/schemas.ts - Zod schemas
   - server/middleware/validate.ts - Validation middleware

VERIFY: Read CLAUDE.md and confirm updates

PROOF: Show updated task table
```

---

## COMPLETION CRITERIA

Task 2.1 is ONLY complete when ALL are true:
- [ ] 4 checkpoints committed
- [ ] 17+ validation tests passing
- [ ] Full test suite passes (0 failures)
- [ ] Code pushed to `claude/task-2.1-input-validation`
- [ ] CLAUDE.md updated with task status
- [ ] Error response format matches spec

---

## ROLLBACK PROCEDURE

If stuck after 2 fix attempts:

```
git stash
git checkout master
```

Report to user:
- What subtask failed
- Exact error message
- Files that were modified
- Suggested fix or question
