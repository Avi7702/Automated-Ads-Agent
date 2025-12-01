# Replit Agent Handoff Document

## Summary

A separate Claude Code agent has been building add-on features for the Automated-Ads-Agent project. These add-ons are now ready to be **selectively integrated** with the live Replit software.

**Branch:** `claude/task-3.4-frontend-edit-ui`
**GitHub Repo:** https://github.com/Avi7702/Automated-Ads-Agent

---

## CRITICAL: Do NOT Merge Directly

The following files **MUST NOT be directly copied/merged** - they will break existing working functionality:

| File | Reason |
|------|--------|
| `server/services/geminiService.ts` | Replit already has working Gemini integration |
| `server/routes.ts` | Will break existing working endpoints |
| `server/storage.ts` | Schema differences with production database |
| `client/` folder | Will overwrite working UI |

### What To Do Instead

**Review the add-on code as REFERENCE ONLY**, then:
1. Extract specific features/patterns you need
2. Manually integrate into your existing working code
3. Test each change before moving to the next

---

## Git History Warning

The add-on branch and Replit's main branch have **no common git ancestor**. Standard `git merge` will fail.

## What Was Built

### Phase 1: Security (Tasks 1.1-1.2)

| Task | Files | Description |
|------|-------|-------------|
| 1.1 Rate Limiting | `server/middleware/rateLimit.ts`, `server/lib/redis.ts` | IP-based rate limiting with optional Redis support |
| 1.2 Authentication | `server/services/authService.ts`, `server/middleware/auth.ts` | bcrypt password hashing, session management |

### Phase 2: Core Features (Tasks 2.1-2.4)

| Task | Files | Description |
|------|-------|-------------|
| 2.1 Input Validation | `server/middleware/validate.ts`, `server/validation/schemas.ts` | Zod-based validation middleware |
| 2.2 Gemini Integration | `server/services/geminiService.ts`, `server/services/geminiErrors.ts` | Gemini 3 Pro Image generation |
| 2.3 Image Storage | `server/storage.ts` | PostgreSQL storage for generations + images |
| 2.4 Transform Endpoint | `server/routes.ts` | POST /api/transform endpoint |

### Phase 3: Edit Flow (Tasks 3.1-3.4)

| Task | Files | Description |
|------|-------|-------------|
| 3.1 Edit Schema | `server/storage.ts` | Edit tracking schema and saveEdit method |
| 3.2 Edit Endpoint | `server/routes.ts` | PUT /api/generations/:id/edit |
| 3.3 History Endpoint | `server/routes.ts` | GET /api/generations/:id/history |
| 3.4 Frontend Edit UI | `client/` folder | React components for edit flow |

## Critical Configuration

### Gemini API Setup

The Gemini integration uses **gemini-3-pro-image-preview** model:

```typescript
// server/services/geminiService.ts
private readonly modelName = 'gemini-3-pro-image-preview';

const model = this.genAI.getGenerativeModel({
  model: this.modelName,
  generationConfig: {
    responseModalities: ['TEXT', 'IMAGE']  // Required for image generation
  }
});
```

**SDK:** `@google/generative-ai` (NOT `@google/genai`)

### Environment Variables

```env
GEMINI_API_KEY=your-api-key
GEMINI_MODEL=gemini-3-pro-image-preview
DATABASE_URL=postgresql://...
SESSION_SECRET=...
USE_REDIS=false  # Set true if Redis available
```

## Files Added/Modified

### New Files (41 total)

**Server:**
- `server/lib/redis.ts` - Redis client for rate limiting
- `server/services/geminiErrors.ts` - Custom error classes
- `server/__tests__/attack-scenarios.test.ts` - Security tests

**Client (new React app):**
- `client/` - Complete Vite + React + TypeScript frontend
- `client/src/components/GenerateForm.tsx` - Image generation form
- `client/src/pages/Dashboard.tsx` - User dashboard
- `client/src/pages/GenerationView.tsx` - Edit flow UI

**Docs:**
- `docs/PHASE-3-IMPLEMENTATION-READY.md` - Complete implementation spec
- `docs/PRODUCTION-READINESS-PLAN.md` - Deployment checklist

### Modified Files

- `server/app.ts` - Added middleware stack
- `server/routes.ts` - Added all API endpoints
- `server/storage.ts` - Added edit tracking schema
- `server/middleware/rateLimit.ts` - Enhanced rate limiting
- `server/services/authService.ts` - Password hashing
- `server/services/geminiService.ts` - Gemini 3 integration
- `server/validation/schemas.ts` - Zod schemas
- `package.json` - Added dependencies

## API Endpoints Added

```
POST   /api/auth/register     - User registration
POST   /api/auth/login        - User login
POST   /api/auth/logout       - User logout
GET    /api/auth/me           - Current user

POST   /api/transform         - Generate image from prompt
PUT    /api/generations/:id/edit    - Edit existing generation
GET    /api/generations/:id/history - Get edit history
GET    /api/generations/:id         - Get generation details
DELETE /api/generations/:id         - Delete generation
```

## Integration Strategy

### SAFE to copy (new files that don't exist in Replit):

| File | Purpose |
|------|---------|
| `server/lib/redis.ts` | Redis client helper |
| `server/services/geminiErrors.ts` | Custom error classes |
| `server/middleware/validate.ts` | Zod validation middleware |
| `server/validation/schemas.ts` | Request validation schemas |
| `server/__tests__/*.ts` | Test files |
| `docs/*.md` | Documentation |

### REFERENCE ONLY (extract patterns, don't copy):

| File | What to extract |
|------|-----------------|
| `server/routes.ts` | Edit/History endpoint patterns |
| `server/storage.ts` | Edit tracking schema design |
| `client/src/pages/GenerationView.tsx` | Edit UI component patterns |

### Recommended approach:

1. Read the add-on code to understand the patterns
2. Add new features to YOUR existing working files
3. Test each addition individually
4. Never overwrite working code

## Dependencies Added

```json
{
  "@google/generative-ai": "^0.7.1",
  "zod": "^3.23.0",
  "ioredis": "^5.4.1"
}
```

## Testing

All tests pass:
```bash
npm test
```

Test files:
- `server/__tests__/geminiService.test.ts`
- `server/__tests__/attack-scenarios.test.ts`

## Warnings

1. **Do NOT use `@google/genai` SDK** - Use `@google/generative-ai`
2. **Model name must be `gemini-3-pro-image-preview`** - Not gemini-2.x
3. **responseModalities is required** for image generation
4. **Rate limiting needs Redis in production** - Set `USE_REDIS=true`

## Contact

This handoff document was created by Claude Code agent on December 1, 2025.
Branch: `claude/task-3.4-frontend-edit-ui`
Commit: `b8e9eec`
