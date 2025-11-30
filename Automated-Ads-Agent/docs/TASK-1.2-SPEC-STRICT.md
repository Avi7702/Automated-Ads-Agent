# Task 1.2: Production-Grade Authentication - STRICT SPEC

## MISSION
Implement secure authentication with bcrypt password hashing, PostgreSQL-backed sessions, account lockout, and secure cookies.

## CONSTRAINTS
- Branch: `claude/task-1.2-authentication`
- Must write tests FIRST (TDD)
- All proofs required at each GATE
- Security-critical: NO shortcuts

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
- Rate limit tests should pass (8 tests from Task 1.1)

PROOF: Paste the 15 lines here:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Any "failed" with count > 0 = REJECTED
- "npm ERR!" = REJECTED
- Rate limit tests missing = REJECTED

GATE: Cannot proceed until baseline green
```

### PF-2: Create Branch

```
ACTION: Create task branch

VERIFY: Run this exact command:
git checkout -b claude/task-1.2-authentication 2>&1 && git branch --show-current

EXPECTED OUTPUT (exactly):
Switched to a new branch 'claude/task-1.2-authentication'
claude/task-1.2-authentication

PROOF: Paste both lines:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Different branch name = REJECTED
- Error message = REJECTED

GATE: Must be on correct branch
```

### PF-3: Verify Dependencies

```
ACTION: Ensure bcrypt is installed

VERIFY: Run this exact command:
grep "bcrypt" package.json

EXPECTED OUTPUT:
"bcrypt": "^5.1.1"

If NOT found, run: npm install bcrypt @types/bcrypt

PROOF: Paste grep output:
[AGENT PASTES OUTPUT HERE]

GATE: bcrypt must be in dependencies
```

---

## SUBTASK 1: Database Schema

### ST-1.1: Create/Update Schema

```
ACTION: Update shared/schema.ts with users and sessions tables

SCHEMA REQUIREMENTS:
1. users table:
   - id: UUID, primary key, auto-generated
   - email: VARCHAR(255), unique, not null
   - passwordHash: VARCHAR(255), not null
   - failedLoginAttempts: INTEGER, default 0
   - lockedUntil: TIMESTAMP, nullable
   - createdAt: TIMESTAMP, default now()
   - updatedAt: TIMESTAMP, default now()

2. sessions table:
   - id: VARCHAR(255), primary key (session ID)
   - userId: UUID, foreign key to users
   - expiresAt: TIMESTAMP, not null
   - createdAt: TIMESTAMP, default now()

VERIFY: Run this exact command:
grep -E "(users|sessions|passwordHash|failedLoginAttempts|lockedUntil|expiresAt)" shared/schema.ts | head -15

EXPECTED OUTPUT CONTAINS:
- "users" table definition
- "sessions" table definition
- "passwordHash" column
- "failedLoginAttempts" column
- "lockedUntil" column
- "expiresAt" column

PROOF: Paste grep output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Missing users table = REJECTED
- Missing sessions table = REJECTED
- Missing security columns = REJECTED

GATE: Schema must have all required columns
```

### ST-1.2: Checkpoint Schema

```
ACTION: Commit schema changes

VERIFY: Run:
git add shared/schema.ts && git commit -m "checkpoint: add users and sessions schema (Task 1.2)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Schema committed before tests
```

---

## SUBTASK 2: Password Hashing Tests & Implementation

### ST-2.1: Write Password Tests

```
ACTION: Create server/__tests__/auth.test.ts with password tests

TESTS TO CREATE (exact names):
1. "Password Security › should hash passwords with bcrypt cost factor 12+"
2. "Password Security › should reject passwords shorter than 8 characters"
3. "Password Security › should never expose password hash in responses"

VERIFY: Run this exact command:
npm test -- --testPathPattern="auth" 2>&1 | grep -E "(Password Security|✓|✕|PASS|FAIL)" | head -10

EXPECTED OUTPUT AT THIS STAGE:
- Tests FAIL (authService doesn't exist or incomplete)
- Shows "Password Security" describe block
- 3 failing tests

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Tests passing = REJECTED (must fail first)
- Fewer than 3 tests = REJECTED

GATE: 3 password tests must fail
```

### ST-2.2: Implement Password Functions

```
ACTION: Create server/services/authService.ts with:
- BCRYPT_ROUNDS = 12 constant
- hashPassword(password: string): Promise<string>
- validatePassword(password: string): ValidationResult

IMPLEMENTATION REQUIREMENTS:
- bcrypt.hash with cost factor 12
- Reject passwords < 8 characters
- Return { valid: boolean, error?: string }

VERIFY: Run this exact command:
npm test -- --testPathPattern="auth" 2>&1 | grep -E "(Password Security|✓|✕)" | head -10

EXPECTED OUTPUT:
- "Password Security" tests all passing
- 3 "✓" marks

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Any "✕" = REJECTED
- bcrypt rounds < 12 = REJECTED

GATE: All 3 password tests must pass
```

### ST-2.3: Checkpoint Password

```
ACTION: Commit password implementation

VERIFY: Run:
git add server/services/authService.ts server/__tests__/auth.test.ts
git commit -m "checkpoint: add password hashing with bcrypt (Task 1.2)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## SUBTASK 3: Registration Tests & Implementation

### ST-3.1: Write Registration Tests

```
ACTION: Add registration tests to auth.test.ts

TESTS TO ADD (exact names):
4. "Registration › should create user with hashed password"
5. "Registration › should reject duplicate email"
6. "Registration › should reject invalid email format"
7. "Registration › should return user without passwordHash"

VERIFY: Run:
npm test -- --testPathPattern="auth" 2>&1 | grep -E "(Registration|✓|✕)" | head -10

EXPECTED OUTPUT:
- Previous 3 tests pass
- 4 new tests FAIL

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: 4 registration tests must fail
```

### ST-3.2: Implement registerUser

```
ACTION: Add to authService.ts:
- registerUser(email: string, password: string): Promise<AuthResult>
- Validate email format
- Validate password length
- Check for existing user
- Hash password with bcrypt
- Create user in storage
- Return user WITHOUT passwordHash

VERIFY: Run:
npm test -- --testPathPattern="auth" 2>&1 | grep -E "(Registration|✓|✕)" | head -10

EXPECTED OUTPUT:
- All 4 registration tests pass
- "✓" for each

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Any failing = REJECTED
- passwordHash exposed = REJECTED

GATE: All 7 tests must pass (3 password + 4 registration)
```

### ST-3.3: Checkpoint Registration

```
ACTION: Commit registration

VERIFY: Run:
git add server/services/authService.ts server/__tests__/auth.test.ts
git commit -m "checkpoint: add user registration (Task 1.2)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## SUBTASK 4: Login Tests & Implementation

### ST-4.1: Write Login Tests

```
ACTION: Add login tests to auth.test.ts

TESTS TO ADD (exact names):
8. "Login › should succeed with correct credentials"
9. "Login › should fail with wrong password and increment attempts"
10. "Login › should fail with non-existent email"
11. "Login › should lock account after 5 failed attempts"
12. "Login › should reset failed attempts on successful login"

VERIFY: Run:
npm test -- --testPathPattern="auth" 2>&1 | grep -E "(Login|✓|✕)" | head -10

EXPECTED OUTPUT:
- Previous 7 tests pass
- 5 new tests FAIL

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: 5 login tests must fail
```

### ST-4.2: Implement loginUser

```
ACTION: Add to authService.ts:
- loginUser(email: string, password: string): Promise<AuthResult>
- Find user by email
- Check if account locked (lockedUntil > now)
- Verify password with bcrypt.compare
- On failure: increment failedLoginAttempts
- On 5 failures: set lockedUntil (15 min)
- On success: reset failedLoginAttempts to 0
- Create session
- Return user + sessionId

VERIFY: Run:
npm test -- --testPathPattern="auth" 2>&1 | grep -E "(Login|✓|✕)" | head -10

EXPECTED OUTPUT:
- All 5 login tests pass
- Total 12 tests passing

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Account lockout not working = REJECTED
- Failed attempts not tracked = REJECTED

GATE: All 12 tests must pass
```

### ST-4.3: Checkpoint Login

```
ACTION: Commit login implementation

VERIFY: Run:
git add server/services/authService.ts server/__tests__/auth.test.ts server/storage.ts
git commit -m "checkpoint: add login with account lockout (Task 1.2)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## SUBTASK 5: Session Management Tests & Implementation

### ST-5.1: Write Session Tests

```
ACTION: Add session tests to auth.test.ts

TESTS TO ADD (exact names):
13. "Session Management › should store session in database"
14. "Session Management › should invalidate session on logout"
15. "Session Management › should reject expired sessions"

VERIFY: Run:
npm test -- --testPathPattern="auth" 2>&1 | grep -E "(Session|✓|✕)" | head -10

EXPECTED OUTPUT:
- Previous 12 tests pass
- 3 new tests FAIL

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: 3 session tests must fail
```

### ST-5.2: Implement Session Functions

```
ACTION: Add to authService.ts:
- validateSession(sessionId: string): Promise<AuthResult>
- logoutUser(sessionId: string): Promise<void>

Add to storage.ts:
- createSession(userId, sessionId, expiresAt)
- getSession(sessionId)
- deleteSession(sessionId)
- expireSession(sessionId)

SESSION REQUIREMENTS:
- 24-hour expiration
- Session ID in UUID format
- Delete session on logout
- Reject if expiresAt < now

VERIFY: Run:
npm test -- --testPathPattern="auth" 2>&1 | grep -E "(Session|✓|✕)" | head -10

EXPECTED OUTPUT:
- All 3 session tests pass
- Total 15 tests passing

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: All 15 tests must pass
```

### ST-5.3: Checkpoint Sessions

```
ACTION: Commit session implementation

VERIFY: Run:
git add server/services/authService.ts server/storage.ts server/__tests__/auth.test.ts
git commit -m "checkpoint: add session management (Task 1.2)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## SUBTASK 6: Cookie & Route Protection Tests & Implementation

### ST-6.1: Write Cookie & Protection Tests

```
ACTION: Add cookie and route protection tests

TESTS TO ADD (exact names):
16. "Cookie Security › should set httpOnly cookie"
17. "Cookie Security › should set SameSite=Strict"
18. "Cookie Security › should clear cookie on logout"
19. "Protected Routes › should return 401 without session cookie"
20. "Protected Routes › should return user data with valid session"
21. "Protected Routes › should return 401 with invalid session cookie"
22. "Route Protection Integration › should protect POST /api/products without auth"
23. "Route Protection Integration › should allow POST /api/products with valid session"
24. "Route Protection Integration › should protect DELETE /api/products without auth"

VERIFY: Run:
npm test -- --testPathPattern="auth" 2>&1 | grep -E "(Cookie|Protected|Route Protection|✓|✕)" | head -15

EXPECTED OUTPUT:
- Previous 15 tests pass
- 9 new tests (some may pass if middleware exists)

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Must see cookie and route protection tests
```

### ST-6.2: Implement Auth Middleware & Routes

```
ACTION:
1. Create server/middleware/auth.ts with requireAuth middleware
2. Update server/routes.ts with:
   - POST /api/auth/register
   - POST /api/auth/login (set HttpOnly, SameSite=Strict cookie)
   - POST /api/auth/logout (clear cookie)
   - GET /api/auth/me (protected)
   - Apply requireAuth to protected routes

COOKIE SETTINGS:
- httpOnly: true
- secure: process.env.NODE_ENV === 'production'
- sameSite: 'strict'
- maxAge: 24 * 60 * 60 * 1000 (24 hours)

VERIFY: Run:
npm test -- --testPathPattern="auth" 2>&1 | grep -E "(Tests:)"

EXPECTED OUTPUT:
- "24 passed" or higher
- "0 failed"

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- HttpOnly not set = REJECTED
- SameSite not Strict = REJECTED
- Routes not protected = REJECTED

GATE: All 24+ auth tests must pass
```

### ST-6.3: Checkpoint Routes

```
ACTION: Commit route protection

VERIFY: Run:
git add server/middleware/auth.ts server/routes.ts server/__tests__/auth.test.ts
git commit -m "checkpoint: add auth middleware and protected routes (Task 1.2)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
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

Where Y >= 32 (auth 24+ and rateLimit 8)

PROOF: Paste the two lines:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Any "failed" > 0 = REJECTED
- Tests < 32 = REJECTED

GATE: Must have 0 failures
```

### IV-2: Manual Security Verification

```
ACTION: Verify security features work

VERIFY TEST 1 - Registration:
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "SecurePass123!"}' 2>&1

EXPECTED: 201 with user object (no passwordHash)

VERIFY TEST 2 - Login (check cookies):
curl -v -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "SecurePass123!"}' 2>&1 | grep -i "set-cookie"

EXPECTED: Set-Cookie header with HttpOnly; SameSite=Strict

VERIFY TEST 3 - Protected route without auth:
curl -X GET http://localhost:3000/api/auth/me 2>&1

EXPECTED: 401 {"error": "Authentication required"}

PROOF: Paste all 3 test results:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- passwordHash in response = REJECTED
- Missing HttpOnly = REJECTED
- Missing SameSite=Strict = REJECTED
- 200 on protected route without auth = REJECTED

GATE: All security checks must pass
```

---

## FINAL COMMIT & PUSH

### FC-1: Final Commit

```
ACTION: Final commit with full message

VERIFY: Run:
git add .
git status
git commit -m "feat: add production-grade authentication (Task 1.2)

- Password hashing with bcrypt (cost factor 12)
- PostgreSQL-backed sessions (24-hour expiration)
- Account lockout after 5 failed attempts (15-min duration)
- HttpOnly, SameSite=Strict cookies
- Protected routes with requireAuth middleware

Security features:
- Never expose passwordHash in responses
- Constant-time password comparison
- Session invalidation on logout
- Automatic lockout reset on successful login

Tests: 24+ authentication tests, all passing

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

PROOF: Paste git output:
[AGENT PASTES OUTPUT HERE]

GATE: Commit must succeed
```

### FC-2: Push to Remote

```
ACTION: Push branch

VERIFY: Run:
git push -u origin claude/task-1.2-authentication 2>&1

EXPECTED OUTPUT CONTAINS:
- "set up to track"
- Remote URL
- Branch name visible

PROOF: Paste push output:
[AGENT PASTES OUTPUT HERE]

GATE: Task incomplete until pushed
```

---

## POST-TASK UPDATE

### PT-1: Update CLAUDE.md

```
ACTION: Add task to status table

EDIT: Add this row to task table:
| 1.2 Authentication | Complete | claude/task-1.2-authentication |

VERIFY: Run:
grep "1.2" CLAUDE.md

EXPECTED OUTPUT:
| 1.2 Authentication | Complete | claude/task-1.2-authentication |

PROOF: Paste grep output:
[AGENT PASTES OUTPUT HERE]

GATE: Documentation required
```

---

## COMPLETION CHECKLIST

All boxes must have PROOF pasted:

- [ ] PF-1: Baseline tests pass
- [ ] PF-2: On branch claude/task-1.2-authentication
- [ ] PF-3: bcrypt in dependencies
- [ ] ST-1.1: Schema has all columns
- [ ] ST-1.2: Schema committed
- [ ] ST-2.1: 3 password tests failing
- [ ] ST-2.2: 3 password tests passing
- [ ] ST-2.3: Password checkpoint
- [ ] ST-3.1: 4 registration tests failing
- [ ] ST-3.2: 7 total tests passing
- [ ] ST-3.3: Registration checkpoint
- [ ] ST-4.1: 5 login tests failing
- [ ] ST-4.2: 12 total tests passing
- [ ] ST-4.3: Login checkpoint
- [ ] ST-5.1: 3 session tests failing
- [ ] ST-5.2: 15 total tests passing
- [ ] ST-5.3: Sessions checkpoint
- [ ] ST-6.1: 9 cookie/route tests visible
- [ ] ST-6.2: 24+ total tests passing
- [ ] ST-6.3: Routes checkpoint
- [ ] IV-1: Full suite 32+ tests, 0 failed
- [ ] IV-2: Manual security checks pass
- [ ] FC-1: Final commit done
- [ ] FC-2: Pushed to remote
- [ ] PT-1: CLAUDE.md updated

**Task 1.2 is ONLY complete when all 25 GATEs have PROOF.**
