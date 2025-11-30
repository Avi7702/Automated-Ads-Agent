# Task 2.4: Generate Endpoint - STRICT SPEC

## MISSION
Complete the `POST /api/transform` endpoint to generate images using Gemini and store them.

## CONSTRAINTS
- Branch: `claude/task-2.4-generate-endpoint`
- Must write tests FIRST (TDD)
- All proofs required at each GATE
- Depends on: Task 2.2 (Gemini) and Task 2.3 (Storage) must be complete

---

## PRE-FLIGHT

### PF-1: Verify Dependencies Complete

```
ACTION: Confirm both services exist

VERIFY: Run these commands:
ls -la server/services/geminiService.ts 2>&1
ls -la server/services/imageStorage.ts 2>&1

EXPECTED OUTPUT:
- Both files exist with size > 0

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- Either file missing = REJECTED

GATE: Cannot proceed until 2.2 and 2.3 are done
```

### PF-2: Environment Check

```
ACTION: Verify baseline tests pass

VERIFY: Run:
npm test 2>&1 | tail -15

EXPECTED OUTPUT:
- "0 failed"
- 72+ tests passing

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Baseline must be green
```

### PF-3: Create Branch

```
ACTION: Create task branch

VERIFY: Run:
git checkout -b claude/task-2.4-generate-endpoint 2>&1 && git branch --show-current

EXPECTED OUTPUT:
Switched to a new branch 'claude/task-2.4-generate-endpoint'
claude/task-2.4-generate-endpoint

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Must show exact branch name
```

---

## SUBTASK 1: Transform Endpoint Tests

### ST-1.1: Write Endpoint Tests

```
ACTION: Create file server/__tests__/transform.test.ts

TESTS TO CREATE (exact names):
1. "POST /api/transform › returns 401 without authentication"
2. "POST /api/transform › returns 400 for missing prompt"
3. "POST /api/transform › returns 400 for empty prompt"
4. "POST /api/transform › returns 400 for invalid aspectRatio"
5. "POST /api/transform › succeeds with valid prompt"
6. "POST /api/transform › returns generationId in response"
7. "POST /api/transform › returns imageUrl in response"
8. "POST /api/transform › returns canEdit true in response"
9. "POST /api/transform › stores generation in database"
10. "POST /api/transform › preserves conversation history"
11. "POST /api/transform › accepts optional referenceImages"
12. "POST /api/transform › respects aspectRatio parameter"
13. "POST /api/transform › rate limited by expensiveLimiter"

VERIFY: Run:
npm test -- --testPathPattern="transform" 2>&1 | grep -E "(PASS|FAIL|✓|✕|transform)" | head -20

EXPECTED OUTPUT:
- Tests FAIL (endpoint not implemented)
- Shows 13 failing tests

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Must see 13 failing tests
```

### ST-1.2: Implement Transform Endpoint

```
ACTION: Update server/routes.ts to implement POST /api/transform

REPLACE the placeholder with full implementation:

```typescript
import { geminiService } from './services/geminiService';
import { imageStorageService } from './services/imageStorage';
import { transformSchema } from './validation/schemas';

router.post('/api/transform',
  expensiveLimiter,
  requireAuth,
  validate(transformSchema),
  async (req: Request, res: Response) => {
    try {
      const { prompt, referenceImages, aspectRatio } = req.body;
      const userId = req.user!.id;

      // Generate image with Gemini
      const result = await geminiService.generateImage(prompt, {
        referenceImages,
        aspectRatio
      });

      // Save to storage
      const generation = await imageStorageService.saveGeneration({
        userId,
        prompt,
        imageBase64: result.imageBase64,
        conversationHistory: result.conversationHistory,
        model: result.model,
        aspectRatio: aspectRatio || '1:1'
      });

      res.status(201).json({
        success: true,
        generationId: generation.id,
        imageUrl: generation.imageUrl,
        canEdit: true
      });
    } catch (error) {
      console.error('Transform error:', error);
      res.status(500).json({
        error: 'Generation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
```

VERIFY: Run:
npm test -- --testPathPattern="transform" 2>&1 | grep -E "(PASS|FAIL|Tests:)" | tail -10

EXPECTED OUTPUT:
- "PASS"
- "13 passed"
- "0 failed"

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: All 13 tests must pass
```

### ST-1.3: Checkpoint 1

```
ACTION: Commit endpoint implementation

VERIFY: Run:
git add server/routes.ts server/__tests__/transform.test.ts
git commit -m "checkpoint: implement transform endpoint (Task 2.4)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## SUBTASK 2: Response Type Definitions

### ST-2.1: Add Response Types

```
ACTION: Create/update server/types/api.ts with response types

TYPES TO ADD:
```typescript
export interface TransformResponse {
  success: true;
  generationId: string;
  imageUrl: string;
  canEdit: boolean;
}

export interface TransformErrorResponse {
  error: string;
  message?: string;
}

export interface GenerationResponse {
  id: string;
  prompt: string;
  imageUrl: string;
  aspectRatio: string;
  canEdit: boolean;
  createdAt: string;
}
```

VERIFY: Run:
grep -E "(TransformResponse|GenerationResponse)" server/types/api.ts

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Types must be defined
```

### ST-2.2: Checkpoint 2

```
ACTION: Commit type definitions

VERIFY: Run:
git add server/types/
git commit -m "checkpoint: add API response types (Task 2.4)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## SUBTASK 3: Error Handling

### ST-3.1: Write Error Handling Tests

```
ACTION: Add error handling tests to transform.test.ts

TESTS TO ADD:
14. "POST /api/transform › returns 500 on Gemini API error"
15. "POST /api/transform › returns 500 on storage error"
16. "POST /api/transform › does not expose internal error details"

VERIFY: Run:
npm test -- --testPathPattern="transform" 2>&1 | grep -E "(Tests:)"

EXPECTED OUTPUT:
- Shows failing tests for new error cases

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Error tests must exist
```

### ST-3.2: Implement Error Handling

```
ACTION: Ensure error handling covers all cases

VERIFY: Run:
npm test -- --testPathPattern="transform" 2>&1 | grep -E "(PASS|FAIL|Tests:)" | tail -5

EXPECTED OUTPUT:
- "16 passed"
- "0 failed"

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: All 16 tests must pass
```

### ST-3.3: Checkpoint 3

```
ACTION: Commit error handling

VERIFY: Run:
git add server/routes.ts server/__tests__/transform.test.ts
git commit -m "checkpoint: add error handling to transform (Task 2.4)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## INTEGRATION VERIFICATION

### IV-1: Full Test Suite

```
ACTION: Run complete test suite

VERIFY: Run:
npm test 2>&1 | grep -E "(Test Suites:|Tests:)"

EXPECTED OUTPUT:
Test Suites: X passed, 0 failed, X total
Tests:       Y passed, 0 failed, Y total

Where Y >= 88 (previous 72 + 16 transform)

PROOF: Paste the two lines:
[AGENT PASTES OUTPUT HERE]

GATE: Must have 0 failures
```

### IV-2: TypeScript Check

```
ACTION: Verify TypeScript compiles

VERIFY: Run:
npx tsc --noEmit 2>&1 | tail -10

EXPECTED OUTPUT:
- No errors

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Must compile
```

### IV-3: Manual API Test (Optional)

```
ACTION: Test endpoint manually if server running

VERIFY: With server running, test:
curl -X POST http://localhost:3000/api/transform \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionId=YOUR_SESSION" \
  -d '{"prompt": "A professional product photo"}'

EXPECTED OUTPUT:
- 201 status
- JSON with generationId, imageUrl, canEdit

NOTE: This requires valid auth session and GEMINI_API_KEY

PROOF: Paste curl response (if tested):
[AGENT PASTES OUTPUT HERE]

GATE: Optional but recommended
```

---

## FINAL COMMIT & PUSH

### FC-1: Final Commit

```
ACTION: Final commit

VERIFY: Run:
git add .
git commit -m "feat: complete transform endpoint for image generation (Task 2.4)

- Implement POST /api/transform with full flow
- Integrate Gemini service and image storage
- Add input validation with transformSchema
- Store conversation history for editing
- Add proper error handling

Tests: 16 new tests, all passing

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
git push -u origin claude/task-2.4-generate-endpoint 2>&1

PROOF: Paste push output:
[AGENT PASTES OUTPUT HERE]

GATE: Task incomplete until pushed
```

---

## POST-TASK UPDATE

### PT-1: Update CLAUDE.md

```
ACTION: Add task to status table

EDIT: Add this row:
| 2.4 Generate Endpoint | Complete | claude/task-2.4-generate-endpoint |

VERIFY: Run:
grep "2.4" CLAUDE.md

PROOF: Paste grep output:
[AGENT PASTES OUTPUT HERE]

GATE: Documentation required
```

---

## COMPLETION CHECKLIST

- [ ] PF-1: Tasks 2.2 and 2.3 complete
- [ ] PF-2: Baseline tests pass (72+)
- [ ] PF-3: On correct branch
- [ ] ST-1.1: 13 endpoint tests failing
- [ ] ST-1.2: 13 endpoint tests passing
- [ ] ST-1.3: Checkpoint 1 committed
- [ ] ST-2.1: Response types added
- [ ] ST-2.2: Checkpoint 2 committed
- [ ] ST-3.1: Error handling tests added
- [ ] ST-3.2: All 16 tests passing
- [ ] ST-3.3: Checkpoint 3 committed
- [ ] IV-1: Full suite 88+ tests, 0 failed
- [ ] IV-2: TypeScript compiles
- [ ] IV-3: Manual test (optional)
- [ ] FC-1: Final commit done
- [ ] FC-2: Pushed to remote
- [ ] PT-1: CLAUDE.md updated

**Task 2.4 is ONLY complete when all GATEs have PROOF.**

---

## PHASE 2 COMPLETE

After Task 2.4, Phase 2 (Core Image Generation) is complete!

MVP capabilities:
- ✅ User can generate images from prompts
- ✅ Conversation history stored (thought signatures)
- ✅ Images saved to disk and DB
- ✅ Rate limiting on generation
- ✅ Full authentication required

Next: Phase 3 (Multi-Turn Editing) - Tasks 3.1, 3.2, 3.3, 3.4
