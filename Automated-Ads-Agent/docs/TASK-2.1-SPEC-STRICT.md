# Task 2.1: Input Validation with Zod - STRICT SPEC

## MISSION
Add Zod input validation to all API endpoints to prevent invalid data from reaching business logic.

## CONSTRAINTS
- Branch: `claude/task-2.1-input-validation`
- Must write tests FIRST (TDD)
- All proofs required at each GATE

---

## PRE-FLIGHT

### PF-1: Environment Check

```
ACTION: Verify baseline tests pass

VERIFY: Run this exact command:
npm test 2>&1 | tail -15

EXPECTED OUTPUT MUST CONTAIN:
- "Test Suites:" with "passed"
- "0 failed" or no failed count
- Clean exit (no npm ERR!)

PROOF: Paste the 15 lines here:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Any "failed" with count > 0 = REJECTED
- "npm ERR!" = REJECTED
- Empty output = REJECTED

GATE: Cannot proceed until baseline green
```

### PF-2: Create Branch

```
ACTION: Create task branch

VERIFY: Run this exact command:
git checkout -b claude/task-2.1-input-validation 2>&1 && git branch --show-current

EXPECTED OUTPUT (exactly):
Switched to a new branch 'claude/task-2.1-input-validation'
claude/task-2.1-input-validation

PROOF: Paste both lines:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Different branch name = REJECTED
- Error message = REJECTED
- Only one line = REJECTED

GATE: Must show exact branch name
```

---

## SUBTASK 1: Validation Schemas

### ST-1.1: Write Schema Tests

```
ACTION: Create file server/__tests__/validation.test.ts with these exact tests

TESTS TO CREATE (use these exact describe/it names):
1. "Validation Schemas › registerSchema › accepts valid registration data"
2. "Validation Schemas › registerSchema › rejects missing email"
3. "Validation Schemas › registerSchema › rejects invalid email format"
4. "Validation Schemas › registerSchema › rejects password under 8 chars"
5. "Validation Schemas › loginSchema › accepts valid login data"
6. "Validation Schemas › loginSchema › rejects empty email"
7. "Validation Schemas › loginSchema › rejects empty password"
8. "Validation Schemas › productSchema › accepts valid product with name only"
9. "Validation Schemas › productSchema › rejects missing name"
10. "Validation Schemas › productSchema › accepts optional description"

VERIFY: Run this exact command:
npm test -- --testPathPattern="validation" 2>&1 | grep -E "(PASS|FAIL|✓|✕|validation\.test)" | head -20

EXPECTED OUTPUT AT THIS STAGE:
- File "validation.test.ts" appears
- Tests FAIL (schemas don't exist)
- Shows ~10 failing tests

Example pattern:
 FAIL  server/__tests__/validation.test.ts
  ✕ accepts valid registration data
  ✕ rejects missing email
  ... (more failing)

PROOF: Paste the grep output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- "Cannot find module" for test file = REJECTED (file not created)
- "0 tests" = REJECTED
- Tests passing = REJECTED (must fail first!)
- Fewer than 10 tests = REJECTED

GATE: Must see 10 failing tests before implementing schemas
```

### ST-1.2: Implement Schemas

```
ACTION: Create file server/validation/schemas.ts

SCHEMAS TO IMPLEMENT:
1. registerSchema: z.object({
     email: z.string().email("Invalid email format"),
     password: z.string().min(8, "Password must be at least 8 characters")
   })

2. loginSchema: z.object({
     email: z.string().min(1, "Email is required"),
     password: z.string().min(1, "Password is required")
   })

3. productSchema: z.object({
     name: z.string().min(1, "Name is required"),
     description: z.string().optional(),
     imageUrl: z.string().url().optional()
   })

VERIFY: Run this exact command:
npm test -- --testPathPattern="validation" 2>&1 | grep -E "(PASS|FAIL|✓|✕|Tests:)" | tail -15

EXPECTED OUTPUT:
- "PASS" for validation.test.ts
- "10 passed" or "✓" for each test
- "0 failed"

Example pattern:
 PASS  server/__tests__/validation.test.ts
  Validation Schemas
    registerSchema
      ✓ accepts valid registration data
      ✓ rejects missing email
      ... (all green)
Tests:       10 passed, 10 total

PROOF: Paste the output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Any "✕" = REJECTED
- "failed" count > 0 = REJECTED
- Fewer than 10 passed = REJECTED

GATE: All 10 schema tests must pass
```

### ST-1.3: Checkpoint 1

```
ACTION: Commit schema work

VERIFY: Run these exact commands in sequence:
git add server/validation/schemas.ts server/__tests__/validation.test.ts
git diff --cached --stat
git commit -m "checkpoint: add Zod validation schemas (Task 2.1)"

EXPECTED OUTPUT:
- 2 files changed
- insertions shown
- Commit hash (7+ chars)

Example:
 server/__tests__/validation.test.ts | 85 ++++++++++++++
 server/validation/schemas.ts        | 45 ++++++++
 2 files changed, 130 insertions(+)
[claude/task-2.1-input-validation abc1234] checkpoint: add Zod validation schemas (Task 2.1)

PROOF: Paste the full git output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- "nothing to commit" = REJECTED
- Missing files = REJECTED
- No commit hash = REJECTED

GATE: Checkpoint required before Subtask 2
```

---

## SUBTASK 2: Validation Middleware

### ST-2.1: Write Middleware Tests

```
ACTION: Add middleware tests to server/__tests__/validation.test.ts

TESTS TO ADD (exact names):
11. "Validation Middleware › validate › calls next() for valid data"
12. "Validation Middleware › validate › returns 400 for invalid data"
13. "Validation Middleware › validate › includes field name in error"
14. "Validation Middleware › validate › includes error message in response"
15. "Validation Middleware › validate › does not expose Zod internals"

VERIFY: Run this exact command:
npm test -- --testPathPattern="validation" 2>&1 | grep -E "(PASS|FAIL|✓|✕|Tests:)" | tail -20

EXPECTED OUTPUT:
- Previous 10 tests still pass
- 5 new tests FAIL (middleware not implemented)
- Total: "10 passed, 5 failed"

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Previous tests now failing = REJECTED (regression)
- New tests passing = REJECTED (must fail first)
- Fewer than 5 new tests = REJECTED

GATE: Must show 10 pass + 5 fail
```

### ST-2.2: Implement Middleware

```
ACTION: Create file server/middleware/validate.ts

IMPLEMENTATION:
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
        return;
      }
      next(error);
    }
  };
}

VERIFY: Run this exact command:
npm test -- --testPathPattern="validation" 2>&1 | grep -E "(PASS|FAIL|✓|✕|Tests:)" | tail -20

EXPECTED OUTPUT:
- "PASS"
- "15 passed"
- "0 failed"

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Any failed tests = REJECTED
- Fewer than 15 passed = REJECTED

GATE: All 15 tests must pass
```

### ST-2.3: Checkpoint 2

```
ACTION: Commit middleware work

VERIFY: Run these commands:
git add server/middleware/validate.ts server/__tests__/validation.test.ts
git commit -m "checkpoint: add validation middleware (Task 2.1)"

EXPECTED OUTPUT:
- Commit hash returned

PROOF: Paste commit output:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required before Subtask 3
```

---

## SUBTASK 3: Apply to Routes

### ST-3.1: Write Integration Tests

```
ACTION: Add route validation tests to validation.test.ts

TESTS TO ADD (exact names):
16. "Route Validation › POST /api/auth/register › returns 400 for invalid email"
17. "Route Validation › POST /api/auth/register › returns 400 for short password"
18. "Route Validation › POST /api/auth/login › returns 400 for empty body"
19. "Route Validation › POST /api/products › returns 400 for missing name"
20. "Route Validation › POST /api/products › accepts valid product with auth"

VERIFY: Run this exact command:
npm test -- --testPathPattern="validation" 2>&1 | grep -E "(Tests:)"

EXPECTED OUTPUT:
- "15 passed, 5 failed" (new route tests fail)

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Must see 5 new failing tests
```

### ST-3.2: Apply Middleware to Routes

```
ACTION: Modify server/routes.ts

CHANGES:
1. Add import: import { validate } from './middleware/validate';
2. Add import: import { registerSchema, loginSchema, productSchema } from '../validation/schemas';
3. Add validate(registerSchema) to POST /api/auth/register
4. Add validate(loginSchema) to POST /api/auth/login
5. Add validate(productSchema) to POST /api/products

VERIFY: Run FULL test suite:
npm test 2>&1 | tail -20

EXPECTED OUTPUT:
- ALL test suites pass
- "0 failed" for all
- Includes auth tests + validation tests + rateLimit tests

PROOF: Paste last 20 lines:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- ANY test failing = REJECTED
- Auth tests broken = REJECTED
- RateLimit tests broken = REJECTED

GATE: Full suite must pass (no regressions)
```

### ST-3.3: Checkpoint 3

```
ACTION: Commit route changes

VERIFY: Run:
git add server/routes.ts server/__tests__/validation.test.ts
git commit -m "checkpoint: apply validation to routes (Task 2.1)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Required before final
```

---

## INTEGRATION VERIFICATION

### IV-1: Full Test Suite

```
ACTION: Run complete test suite

VERIFY: Run this exact command:
npm test 2>&1 | grep -E "(Test Suites:|Tests:)"

EXPECTED OUTPUT:
Test Suites: X passed, 0 failed, X total
Tests:       Y passed, 0 failed, Y total

Where Y >= 50 (auth 26 + rateLimit 8 + validation 20)

PROOF: Paste the two lines:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Any "failed" > 0 = REJECTED
- Tests < 50 = REJECTED

GATE: Must have 0 failures
```

### IV-2: Manual Validation Check

```
ACTION: Verify validation works end-to-end

VERIFY: Start server and test with curl (in separate terminal):
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "bad", "password": "x"}' 2>&1

EXPECTED OUTPUT (JSON):
{
  "error": "Validation failed",
  "details": [
    {"field": "email", "message": "Invalid email format"},
    {"field": "password", "message": "Password must be at least 8 characters"}
  ]
}

PROOF: Paste curl response:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- 500 error = REJECTED
- Missing details array = REJECTED
- Generic error message = REJECTED

GATE: Must show proper validation error format
```

---

## FINAL COMMIT & PUSH

### FC-1: Final Commit

```
ACTION: Final commit with full message

VERIFY: Run:
git add .
git status
git commit -m "feat: add Zod input validation for all endpoints (Task 2.1)

- Add validation schemas (register, login, product)
- Create reusable validation middleware
- Apply validation to all API routes
- Standardize error response format with field-level details

Tests: 20 new validation tests, all passing

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

EXPECTED OUTPUT:
- Commit hash returned
- No uncommitted files

PROOF: Paste git output:
[AGENT PASTES OUTPUT HERE]

GATE: Commit must succeed
```

### FC-2: Push to Remote

```
ACTION: Push branch

VERIFY: Run:
git push -u origin claude/task-2.1-input-validation 2>&1

EXPECTED OUTPUT CONTAINS:
- "set up to track"
- Remote URL
- Branch name visible

PROOF: Paste push output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Push failed = REJECTED
- Auth error = REJECTED

GATE: Task incomplete until pushed
```

---

## POST-TASK UPDATE

### PT-1: Update CLAUDE.md

```
ACTION: Add task to status table

EDIT: Add this row to task table:
| 2.1 Input Validation | Complete | claude/task-2.1-input-validation |

VERIFY: Run:
grep "2.1" CLAUDE.md

EXPECTED OUTPUT:
| 2.1 Input Validation | Complete | claude/task-2.1-input-validation |

PROOF: Paste grep output:
[AGENT PASTES OUTPUT HERE]

GATE: Documentation required
```

---

## COMPLETION CHECKLIST

All boxes must have PROOF pasted:

- [ ] PF-1: Baseline tests pass
- [ ] PF-2: On branch claude/task-2.1-input-validation
- [ ] ST-1.1: 10 schema tests failing
- [ ] ST-1.2: 10 schema tests passing
- [ ] ST-1.3: Checkpoint 1 committed
- [ ] ST-2.1: 5 middleware tests failing
- [ ] ST-2.2: 15 total tests passing
- [ ] ST-2.3: Checkpoint 2 committed
- [ ] ST-3.1: 5 route tests failing
- [ ] ST-3.2: All 20+ tests passing
- [ ] ST-3.3: Checkpoint 3 committed
- [ ] IV-1: Full suite 50+ tests, 0 failed
- [ ] IV-2: Curl shows validation error format
- [ ] FC-1: Final commit done
- [ ] FC-2: Pushed to remote
- [ ] PT-1: CLAUDE.md updated

**Task 2.1 is ONLY complete when all 16 GATEs have PROOF.**
