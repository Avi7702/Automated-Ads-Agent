# Task 3.2: Edit Endpoint - STRICT SPEC

## MISSION
Create `POST /api/generations/:id/edit` endpoint for multi-turn image editing with thought signature preservation.

## CONSTRAINTS
- Branch: `claude/task-3.2-edit-endpoint`
- Must write tests FIRST (TDD)
- All proofs required at each GATE
- Depends on: Task 3.1 (Edit Schema) must be complete

---

## PRE-FLIGHT

### PF-1: Verify Task 3.1 Complete

```
ACTION: Confirm edit schema exists

VERIFY: Run:
grep -E "(parentGenerationId|editPrompt|editCount)" shared/schema.ts

EXPECTED OUTPUT:
- All 3 edit columns visible

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Cannot proceed until 3.1 is done
```

### PF-2: Environment Check

```
ACTION: Verify baseline tests pass

VERIFY: Run:
npm test 2>&1 | tail -15

EXPECTED OUTPUT:
- "0 failed"
- 77+ tests passing

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Baseline must be green
```

### PF-3: Create Branch

```
ACTION: Create task branch

VERIFY: Run:
git checkout -b claude/task-3.2-edit-endpoint 2>&1 && git branch --show-current

EXPECTED OUTPUT:
Switched to a new branch 'claude/task-3.2-edit-endpoint'
claude/task-3.2-edit-endpoint

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Must show exact branch name
```

---

## SUBTASK 1: Edit Endpoint Tests

### ST-1.1: Write Edit Endpoint Tests

```
ACTION: Create file server/__tests__/edit.test.ts

TESTS TO CREATE (exact names):
1. "POST /api/generations/:id/edit › returns 401 without authentication"
2. "POST /api/generations/:id/edit › returns 404 for non-existent generation"
3. "POST /api/generations/:id/edit › returns 403 for other user's generation"
4. "POST /api/generations/:id/edit › returns 400 for missing editPrompt"
5. "POST /api/generations/:id/edit › returns 400 for empty editPrompt"
6. "POST /api/generations/:id/edit › succeeds with valid editPrompt"
7. "POST /api/generations/:id/edit › returns new generationId"
8. "POST /api/generations/:id/edit › returns new imageUrl"
9. "POST /api/generations/:id/edit › returns parentId in response"
10. "POST /api/generations/:id/edit › preserves conversation history"
11. "POST /api/generations/:id/edit › appends edit to conversation"
12. "POST /api/generations/:id/edit › increments edit count"
13. "POST /api/generations/:id/edit › rate limited by editLimiter"

VERIFY: Run:
npm test -- --testPathPattern="edit" 2>&1 | grep -E "(PASS|FAIL|✓|✕|edit\.test)" | head -20

EXPECTED OUTPUT:
- Tests FAIL (endpoint not implemented)
- Shows 13 failing tests

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Must see 13 failing tests
```

### ST-1.2: Add Edit Validation Schema

```
ACTION: Add editSchema to server/validation/schemas.ts

SCHEMA:
```typescript
export const editSchema = z.object({
  editPrompt: z.string().min(1, 'Edit prompt is required').max(1000, 'Edit prompt too long')
});

export type EditInput = z.infer<typeof editSchema>;
```

VERIFY: Run:
grep -E "editSchema" server/validation/schemas.ts

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Schema must be added
```

### ST-1.3: Implement Edit Endpoint

```
ACTION: Add POST /api/generations/:id/edit to server/routes.ts

```typescript
import { editSchema } from './validation/schemas';

router.post('/api/generations/:id/edit',
  editLimiter,
  requireAuth,
  validate(editSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { editPrompt } = req.body;
      const userId = req.user!.id;

      // Get parent generation
      const parent = await imageStorageService.getGeneration(id);

      if (!parent) {
        res.status(404).json({ error: 'Generation not found' });
        return;
      }

      if (parent.userId !== userId) {
        res.status(403).json({ error: 'Not authorized to edit this generation' });
        return;
      }

      // Continue conversation with edit prompt
      const result = await geminiService.continueConversation(
        parent.conversationHistory,
        editPrompt
      );

      // Save edited generation
      const newGeneration = await imageStorageService.saveEdit(
        id,
        editPrompt,
        {
          userId,
          prompt: `${parent.prompt} [EDIT: ${editPrompt}]`,
          imageBase64: result.imageBase64,
          conversationHistory: result.conversationHistory,
          model: result.model,
          aspectRatio: parent.aspectRatio,
        }
      );

      res.status(201).json({
        success: true,
        generationId: newGeneration.id,
        imageUrl: newGeneration.imageUrl,
        parentId: id,
        canEdit: true
      });
    } catch (error) {
      console.error('Edit error:', error);
      res.status(500).json({
        error: 'Edit failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
```

VERIFY: Run:
npm test -- --testPathPattern="edit" 2>&1 | grep -E "(PASS|FAIL|Tests:)" | tail -10

EXPECTED OUTPUT:
- "PASS"
- "13 passed"
- "0 failed"

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: All 13 tests must pass
```

### ST-1.4: Checkpoint 1

```
ACTION: Commit edit endpoint

VERIFY: Run:
git add server/routes.ts server/validation/schemas.ts server/__tests__/edit.test.ts
git commit -m "checkpoint: implement edit endpoint (Task 3.2)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## SUBTASK 2: Response Types

### ST-2.1: Add Edit Response Types

```
ACTION: Add edit response types to server/types/api.ts

```typescript
export interface EditResponse {
  success: true;
  generationId: string;
  imageUrl: string;
  parentId: string;
  canEdit: boolean;
}

export interface EditErrorResponse {
  error: string;
  message?: string;
}
```

VERIFY: Run:
grep -E "EditResponse" server/types/api.ts

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Types must be added
```

### ST-2.2: Checkpoint 2

```
ACTION: Commit types

VERIFY: Run:
git add server/types/api.ts
git commit -m "checkpoint: add edit response types (Task 3.2)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## SUBTASK 3: Error Handling

### ST-3.1: Write Error Tests

```
ACTION: Add error handling tests to edit.test.ts

TESTS TO ADD:
14. "POST /api/generations/:id/edit › returns 500 on Gemini API error"
15. "POST /api/generations/:id/edit › returns 500 on storage error"

VERIFY: Run:
npm test -- --testPathPattern="edit" 2>&1 | grep -E "(Tests:)"

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Error tests must exist
```

### ST-3.2: Verify Error Handling

```
ACTION: Ensure all tests pass

VERIFY: Run:
npm test -- --testPathPattern="edit" 2>&1 | grep -E "(PASS|FAIL|Tests:)" | tail -5

EXPECTED OUTPUT:
- "15 passed"
- "0 failed"

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: All 15 tests must pass
```

### ST-3.3: Checkpoint 3

```
ACTION: Commit error handling

VERIFY: Run:
git add server/__tests__/edit.test.ts
git commit -m "checkpoint: add edit error handling tests (Task 3.2)"

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

Where Y >= 92 (previous 77 + 15 edit)

PROOF: Paste the two lines:
[AGENT PASTES OUTPUT HERE]

GATE: Must have 0 failures
```

### IV-2: TypeScript Check

```
ACTION: Verify TypeScript compiles

VERIFY: Run:
npx tsc --noEmit 2>&1 | tail -10

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Must compile
```

---

## FINAL COMMIT & PUSH

### FC-1: Final Commit

```
ACTION: Final commit

VERIFY: Run:
git add .
git commit -m "feat: add edit endpoint for multi-turn image editing (Task 3.2)

- Implement POST /api/generations/:id/edit
- Preserve conversation history (thought signatures)
- Link edited images to parent generation
- Add editSchema for input validation
- Rate limit with editLimiter

Tests: 15 new tests, all passing

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
git push -u origin claude/task-3.2-edit-endpoint 2>&1

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
| 3.2 Edit Endpoint | Complete | claude/task-3.2-edit-endpoint |

ADD to Key Files:
- Edit endpoint in routes.ts (Task 3.2 complete)

VERIFY: Run:
grep "3.2" CLAUDE.md

PROOF: Paste grep output:
[AGENT PASTES OUTPUT HERE]

GATE: Documentation required
```

---

## COMPLETION CHECKLIST

- [ ] PF-1: Task 3.1 complete
- [ ] PF-2: Baseline tests pass
- [ ] PF-3: On correct branch
- [ ] ST-1.1: 13 edit tests failing
- [ ] ST-1.2: Edit schema added
- [ ] ST-1.3: 13 edit tests passing
- [ ] ST-1.4: Checkpoint 1 committed
- [ ] ST-2.1: Response types added
- [ ] ST-2.2: Checkpoint 2 committed
- [ ] ST-3.1: Error tests added
- [ ] ST-3.2: All 15 tests passing
- [ ] ST-3.3: Checkpoint 3 committed
- [ ] IV-1: Full suite 92+ tests, 0 failed
- [ ] IV-2: TypeScript compiles
- [ ] FC-1: Final commit done
- [ ] FC-2: Pushed to remote
- [ ] PT-1: CLAUDE.md updated

**Task 3.2 is ONLY complete when all GATEs have PROOF.**
