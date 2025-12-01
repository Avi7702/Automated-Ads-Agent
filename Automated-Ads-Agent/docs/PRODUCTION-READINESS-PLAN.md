# Production Readiness Plan

## Executive Summary

This document outlines the complete work required to bring the Automated Ads Agent from its current state to production-ready for multi-tenant deployment.

**Current State:**
- Authentication: 90% complete (security gaps exist)
- API: 40% complete (core endpoints are placeholders)
- Testing: 60% coverage (critical gaps in integration tests)
- Infrastructure: 30% complete (missing Docker, CI/CD, monitoring)

**Estimated Total Effort:** 80-100 hours of focused work

---

## Phase 1: Fix What's Broken (BLOCKING)

These issues prevent the code from even compiling or running correctly.

### 1.1 TypeScript Compilation Errors
**File:** `server/middleware/rateLimit.ts`
**Status:** 6 TypeScript errors - BUILD FAILS
**Effort:** 2 hours

**Issues:**
- Line 13: `sendCommand` type mismatch with Redis
- Lines 39, 64, 89, 115: `req.rateLimit` property doesn't exist on Request type

**Fix Required:**
```typescript
// Add type augmentation at top of file
declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetTime?: Date;
      };
    }
  }
}

// Fix Redis sendCommand (line 13)
sendCommand: async (...args: string[]) => {
  return await getRedisClient().call(...args) as any;
}
```

**Verification:** `npm run check` passes with 0 errors

---

## Phase 2: Security Hardening (CRITICAL)

These vulnerabilities could be exploited immediately in production.

### 2.1 CSRF Protection
**File:** `server/app.ts`
**Status:** NO CSRF protection exists
**Effort:** 3 hours
**Risk:** HIGH - Attackers can trick users into performing actions

**Implementation:**
- Install `csurf` package
- Add CSRF middleware after cookie-parser
- Create `/api/csrf-token` endpoint
- Document frontend integration

### 2.2 Session Fixation Prevention
**File:** `server/services/authService.ts`
**Status:** Old sessions persist after login
**Effort:** 2 hours
**Risk:** HIGH - Stolen sessions remain valid forever

**Fix:**
- Add `deleteAllUserSessions(userId)` to storage.ts
- Call before creating new session in `loginUser()`

### 2.3 Timing Attack Prevention
**File:** `server/services/authService.ts`
**Status:** Response time reveals if email exists
**Effort:** 2 hours
**Risk:** MEDIUM - Email enumeration attacks

**Fix:**
- Always run bcrypt.compare() even for non-existent users
- Check user existence AFTER password comparison
- Consistent response times

### 2.4 Password Strength
**File:** `server/services/authService.ts`
**Status:** Only checks length >= 8
**Effort:** 1 hour
**Risk:** MEDIUM - Weak passwords accepted

**Fix:**
- Require 3 of 4: uppercase, lowercase, number, special char
- Block common passwords list
- Update validation schema

### 2.5 Request Size Limits
**File:** `server/app.ts`
**Status:** No body size limits
**Effort:** 30 minutes
**Risk:** HIGH - DoS via large payloads

**Fix:**
```typescript
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
```

### 2.6 Rate Limiting Improvements
**File:** `server/middleware/rateLimit.ts`
**Effort:** 2 hours

**Changes:**
- Reduce login limit from 10 to 5 attempts/minute
- Add global login rate limit (100 total/minute)
- Validate IP extraction (prevent X-Forwarded-For spoofing)

---

## Phase 3: Complete Core API (HIGH PRIORITY)

The product doesn't work without these.

### 3.1 POST /api/transform (Image Generation)
**File:** `server/routes.ts` (currently placeholder)
**Spec:** `docs/TASK-2.4-SPEC-STRICT.md`
**Effort:** 6 hours
**Tests Required:** 16

**Implementation:**
1. Accept prompt, referenceImages, aspectRatio
2. Call GeminiService.generateImage()
3. Save via ImageStorageService.saveGeneration()
4. Return generation ID and image URL

**Dependencies:** GeminiService (done), ImageStorageService (done)

### 3.2 GET /api/generations (List)
**File:** `server/routes.ts` (NEW)
**Effort:** 3 hours
**Tests Required:** 5

**Implementation:**
- Pagination (page, pageSize)
- Filter by user ID (multi-tenant)
- Sort by createdAt DESC
- Return standardized response

### 3.3 GET /api/generations/:id (Single)
**File:** `server/routes.ts` (NEW)
**Effort:** 2 hours
**Tests Required:** 4

**Implementation:**
- Lookup by ID
- Permission check (user owns generation)
- Return full generation data including conversation history

### 3.4 DELETE /api/generations/:id
**File:** `server/routes.ts` (currently placeholder)
**Effort:** 2 hours
**Tests Required:** 4

**Implementation:**
- Permission check
- Delete file from uploads/
- Delete database record
- Handle edit chain (orphan children or cascade)

### 3.5 POST /api/generations/:id/edit (Multi-turn)
**File:** `server/routes.ts` (currently placeholder)
**Effort:** 6 hours
**Tests Required:** 8

**Implementation:**
1. Load parent generation
2. Permission check
3. Call GeminiService.continueConversation()
4. Save new generation with parent link
5. Track edit count

**Schema Update Required:**
```sql
ALTER TABLE generations ADD COLUMN parent_generation_id UUID REFERENCES generations(id);
ALTER TABLE generations ADD COLUMN edit_prompt TEXT;
ALTER TABLE generations ADD COLUMN edit_count INTEGER DEFAULT 0;
```

---

## Phase 4: Database & Schema (HIGH PRIORITY)

### 4.1 Schema Fixes
**File:** `shared/schema.ts`
**Effort:** 2 hours

**Changes:**
- Change generations.userId from VARCHAR to UUID FK
- Add parent_generation_id column
- Add edit_prompt column
- Add edit_count column

### 4.2 Add Indexes
**Effort:** 1 hour

```sql
CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_created_at ON generations(created_at DESC);
CREATE INDEX idx_generations_parent_id ON generations(parent_generation_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_users_email ON users(email);
```

### 4.3 Migration Strategy
**Effort:** 3 hours

- Document migration process
- Create migration runner script
- Test rollback procedures
- Implement pre-deployment validation

---

## Phase 5: Testing (CRITICAL)

Current coverage is insufficient. Production requires real integration tests.

### 5.1 Redis Integration Tests
**File:** `server/__tests__/redis.integration.test.ts` (NEW)
**Effort:** 4 hours
**Tests:** 5 critical tests

- Connection lifecycle
- Retry strategy
- Error handling
- Connection pooling
- Cleanup on shutdown

### 5.2 Storage Integration Tests
**File:** `server/__tests__/storage.integration.test.ts` (NEW)
**Effort:** 6 hours
**Tests:** 8 critical tests

- PostgreSQL CRUD operations
- Constraint enforcement
- Session expiration
- Account locking timing
- Concurrent operations

### 5.3 API End-to-End Tests
**File:** `server/__tests__/api.e2e.test.ts` (NEW)
**Effort:** 6 hours
**Tests:** 5 critical tests

- Full registration → login → generate → retrieve flow
- Account lockout → unlock flow
- Rate limiting under load
- Multi-tenant data isolation

### 5.4 Error Handling Tests
**File:** `server/__tests__/errorHandling.test.ts` (NEW)
**Effort:** 4 hours
**Tests:** 5 critical tests

- Database connection failure
- Gemini API failure
- Filesystem errors
- Invalid cookie handling
- JSON parsing errors

### 5.5 Gemini Real API Tests
**File:** `server/__tests__/geminiService.real.test.ts` (NEW)
**Effort:** 4 hours
**Tests:** 5 tests (marked @slow)

- Actual image generation
- Different aspect ratios
- Reference images
- Conversation continuation
- API error codes

---

## Phase 6: Infrastructure (REQUIRED)

### 6.1 Dockerfile
**File:** `Dockerfile` (NEW)
**Effort:** 3 hours

Multi-stage build:
1. Dependencies stage
2. Build stage
3. Production runtime (minimal image)

### 6.2 Docker Compose Production
**File:** `docker-compose.prod.yml` (NEW)
**Effort:** 2 hours

- Resource limits
- Health checks for all services
- Restart policies
- Volume mounts
- Network configuration

### 6.3 Graceful Shutdown
**File:** `server/index.ts`
**Effort:** 3 hours

- SIGTERM/SIGINT handlers
- Connection draining (30s timeout)
- Database pool cleanup
- Redis connection cleanup
- In-flight request completion

### 6.4 Health Checks
**File:** `server/routes.ts`
**Effort:** 3 hours

- `/api/health/live` - Process alive
- `/api/health/ready` - Dependencies connected
- Database connectivity check
- Redis connectivity check
- Disk space check

### 6.5 Environment Documentation
**File:** `.env.example` (NEW)
**Effort:** 1 hour

Document all variables:
- Required vs optional
- Default values
- Security notes

### 6.6 CI/CD Pipeline
**Files:** `.github/workflows/*.yml` (NEW)
**Effort:** 4 hours

- test.yml: Unit + integration tests
- build.yml: Docker image build
- deploy.yml: Deployment automation
- Security scanning

---

## Phase 7: Observability (IMPORTANT)

### 7.1 Structured Logging
**File:** `server/lib/logger.ts` (NEW)
**Effort:** 4 hours

- Replace all console.log/error
- JSON format for production
- Log levels (debug, info, warn, error)
- Request correlation IDs
- Sensitive data redaction

### 7.2 Error Tracking
**Effort:** 2 hours

- Integrate Sentry or similar
- Configure source maps
- Set up alerting rules

### 7.3 Metrics Endpoint
**File:** `server/routes.ts`
**Effort:** 3 hours

- `/api/metrics` for Prometheus
- Request duration histograms
- Error rate counters
- Active connections gauge

---

## Phase 8: Response Standardization (IMPORTANT)

### 8.1 Response Format
**File:** `server/lib/responses.ts` (NEW)
**Effort:** 2 hours

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 100 }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable",
    "fields": { "email": ["Invalid format"] }
  }
}
```

### 8.2 Update All Endpoints
**Effort:** 4 hours

- Migrate auth endpoints
- Migrate generation endpoints
- Add error codes enum
- Update tests

---

## Execution Timeline

### Week 1: Foundation (Blockers + Security)
| Day | Tasks | Hours |
|-----|-------|-------|
| 1 | Fix TypeScript errors (1.1) | 2 |
| 1-2 | CSRF protection (2.1) | 3 |
| 2 | Session fixation (2.2) | 2 |
| 2-3 | Timing attack fix (2.3) | 2 |
| 3 | Password strength (2.4) | 1 |
| 3 | Request size limits (2.5) | 0.5 |
| 3-4 | Rate limiting improvements (2.6) | 2 |
| 4-5 | Schema fixes (4.1, 4.2) | 3 |
| **Total** | | **15.5** |

### Week 2: Core API
| Day | Tasks | Hours |
|-----|-------|-------|
| 1-2 | POST /api/transform (3.1) | 6 |
| 2-3 | GET /api/generations (3.2) | 3 |
| 3 | GET /api/generations/:id (3.3) | 2 |
| 3-4 | DELETE /api/generations/:id (3.4) | 2 |
| 4-5 | POST /api/generations/:id/edit (3.5) | 6 |
| **Total** | | **19** |

### Week 3: Testing
| Day | Tasks | Hours |
|-----|-------|-------|
| 1 | Redis integration tests (5.1) | 4 |
| 2-3 | Storage integration tests (5.2) | 6 |
| 3-4 | API e2e tests (5.3) | 6 |
| 4-5 | Error handling tests (5.4) | 4 |
| 5 | Gemini real API tests (5.5) | 4 |
| **Total** | | **24** |

### Week 4: Infrastructure
| Day | Tasks | Hours |
|-----|-------|-------|
| 1 | Dockerfile (6.1) | 3 |
| 1-2 | Docker Compose prod (6.2) | 2 |
| 2 | Graceful shutdown (6.3) | 3 |
| 2-3 | Health checks (6.4) | 3 |
| 3 | Environment docs (6.5) | 1 |
| 3-4 | CI/CD pipeline (6.6) | 4 |
| 4-5 | Logging (7.1) | 4 |
| 5 | Error tracking (7.2) | 2 |
| **Total** | | **22** |

### Week 5: Polish
| Day | Tasks | Hours |
|-----|-------|-------|
| 1 | Metrics endpoint (7.3) | 3 |
| 1-2 | Response format (8.1, 8.2) | 6 |
| 2-3 | Migration strategy (4.3) | 3 |
| 3-5 | Integration testing & fixes | 8 |
| **Total** | | **20** |

---

## Verification Checklist

Before declaring production-ready:

### Code Quality
- [ ] `npm run check` - 0 TypeScript errors
- [ ] `npm test` - All tests pass
- [ ] `npm run test:coverage` - Meets thresholds (65%+)
- [ ] No `console.log` in production code

### Security
- [ ] CSRF protection enabled
- [ ] Session fixation prevented
- [ ] Timing attacks mitigated
- [ ] Password complexity enforced
- [ ] Rate limiting verified
- [ ] Request size limits set
- [ ] Helmet configured properly
- [ ] CORS whitelist validated

### API
- [ ] All endpoints return standardized responses
- [ ] All endpoints have validation
- [ ] All endpoints have tests
- [ ] Error codes documented
- [ ] OpenAPI spec generated

### Infrastructure
- [ ] Docker image builds successfully
- [ ] Health checks respond correctly
- [ ] Graceful shutdown works
- [ ] Environment variables documented
- [ ] CI/CD pipeline runs
- [ ] Backups configured

### Database
- [ ] Migrations documented
- [ ] Indexes created
- [ ] Foreign keys enforced
- [ ] Connection pooling configured

### Observability
- [ ] Structured logging active
- [ ] Error tracking configured
- [ ] Metrics available
- [ ] Alerts configured

---

## Risk Matrix

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Data breach (no CSRF) | Critical | High | Phase 2.1 |
| Session hijacking | Critical | Medium | Phase 2.2 |
| DoS via large payloads | High | High | Phase 2.5 |
| Silent failures | High | Medium | Phase 5 |
| Data loss on deploy | Critical | Medium | Phase 6.3 |
| Undetected errors | Medium | High | Phase 7 |

---

## Success Criteria

The system is production-ready when:

1. **Zero blocking issues** - Code compiles, tests pass
2. **Security audit passes** - All CRITICAL/HIGH vulnerabilities fixed
3. **Core features work** - Generate, list, edit, delete generations
4. **Multi-tenant safe** - Users can only access their own data
5. **Observable** - Logs, metrics, error tracking in place
6. **Recoverable** - Graceful shutdown, health checks, backups
7. **Deployable** - Docker, CI/CD, environment configuration

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-01 | Claude | Initial production readiness plan |
