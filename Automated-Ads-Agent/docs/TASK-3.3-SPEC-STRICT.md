# Task 3.3: History Endpoint - STRICT SPEC

## MISSION
Create `GET /api/generations/:id/history` endpoint to retrieve edit chain/lineage.

## CONSTRAINTS
- Branch: `claude/task-3.3-history-endpoint`
- Must write tests FIRST (TDD)
- All proofs required at each GATE
- Depends on: Task 3.2 (Edit Endpoint) must be complete

## SUBAGENT USAGE (Optional but Recommended)
You have access to subagents. Use them for:
- **Explore agent**: When searching for patterns in codebase
- **code-reviewer agent**: After implementing, before final commit
- **code-simplifier agent**: If code gets complex

---

## PRE-FLIGHT

### PF-1: Verify Task 3.2 Complete

```
ACTION: Confirm edit endpoint exists

VERIFY: Run:
grep -n "generations/:id/edit" server/routes.ts

EXPECTED OUTPUT:
- Line showing edit endpoint route

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Cannot proceed until 3.2 is done
```

### PF-2: Environment Check

```
ACTION: Verify baseline tests pass

VERIFY: Run:
npm test 2>&1 | tail -15

EXPECTED OUTPUT:
- "0 failed"
- 92+ tests passing

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Baseline must be green
```

### PF-3: Create Branch

```
ACTION: Create task branch

VERIFY: Run:
git checkout -b claude/task-3.3-history-endpoint 2>&1 && git branch --show-current

EXPECTED OUTPUT:
Switched to a new branch 'claude/task-3.3-history-endpoint'
claude/task-3.3-history-endpoint

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Must show exact branch name
```

---

## SUBTASK 1: History Endpoint Tests

### ST-1.1: Write History Tests

```
ACTION: Create file server/__tests__/history.test.ts

TESTS TO CREATE (exact names):
1. "GET /api/generations/:id/history › returns 401 without authentication"
2. "GET /api/generations/:id/history › returns 404 for non-existent generation"
3. "GET /api/generations/:id/history › returns 403 for other user's generation"
4. "GET /api/generations/:id/history › returns array of edit chain"
5. "GET /api/generations/:id/history › includes original generation"
6. "GET /api/generations/:id/history › orders by creation date ascending"
7. "GET /api/generations/:id/history › includes editPrompt for each item"
8. "GET /api/generations/:id/history › includes imageUrl for each item"
9. "GET /api/generations/:id/history › returns single item for unedited generation"
10. "GET /api/generations/:id/history › follows parent chain correctly"

VERIFY: Run:
npm test -- --testPathPattern="history" 2>&1 | grep -E "(PASS|FAIL|✓|✕|history)" | head -15

EXPECTED OUTPUT:
- Tests FAIL (endpoint not implemented)
- Shows 10 failing tests

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Must see 10 failing tests
```

### ST-1.2: Implement History Endpoint

```
ACTION: Add GET /api/generations/:id/history to server/routes.ts

```typescript
router.get('/api/generations/:id/history',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Get the generation to check ownership
      const generation = await imageStorageService.getGeneration(id);

      if (!generation) {
        res.status(404).json({ error: 'Generation not found' });
        return;
      }

      if (generation.userId !== userId) {
        res.status(403).json({ error: 'Not authorized to view this generation' });
        return;
      }

      // Get full edit chain
      const history = await imageStorageService.getEditChain(id);

      res.json({
        generationId: id,
        history: history.map(item => ({
          id: item.id,
          editPrompt: item.editPrompt,
          imageUrl: item.imageUrl,
          createdAt: item.createdAt.toISOString()
        })),
        totalEdits: history.length - 1 // Exclude original
      });
    } catch (error) {
      console.error('History error:', error);
      res.status(500).json({ error: 'Failed to retrieve history' });
    }
  }
);
```

VERIFY: Run:
npm test -- --testPathPattern="history" 2>&1 | grep -E "(PASS|FAIL|Tests:)" | tail -10

EXPECTED OUTPUT:
- "PASS"
- "10 passed"
- "0 failed"

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: All 10 tests must pass
```

### ST-1.3: Checkpoint 1

```
ACTION: Commit history endpoint

VERIFY: Run:
git add server/routes.ts server/__tests__/history.test.ts
git commit -m "checkpoint: implement history endpoint (Task 3.3)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## SUBTASK 2: Response Types

### ST-2.1: Add History Response Types

```
ACTION: Add history response types to server/types/api.ts

```typescript
export interface HistoryItem {
  id: string;
  editPrompt: string | null;
  imageUrl: string;
  createdAt: string;
}

export interface HistoryResponse {
  generationId: string;
  history: HistoryItem[];
  totalEdits: number;
}
```

VERIFY: Run:
grep -E "(HistoryItem|HistoryResponse)" server/types/api.ts

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Types must be added
```

### ST-2.2: Checkpoint 2

```
ACTION: Commit types

VERIFY: Run:
git add server/types/api.ts
git commit -m "checkpoint: add history response types (Task 3.3)"

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

Where Y >= 102 (previous 92 + 10 history)

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

### IV-3: Code Review (Recommended)

```
ACTION: Use code-reviewer subagent

VERIFY: Launch code-reviewer agent to review changes

PROOF: Paste reviewer summary:
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
git commit -m "feat: add history endpoint for edit chain retrieval (Task 3.3)

- Implement GET /api/generations/:id/history
- Return full edit lineage with prompts
- Order by creation date
- Include imageUrl for each version

Tests: 10 new tests, all passing

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
git push -u origin claude/task-3.3-history-endpoint 2>&1

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
| 3.3 History Endpoint | Complete | claude/task-3.3-history-endpoint |

VERIFY: Run:
grep "3.3" CLAUDE.md

PROOF: Paste grep output:
[AGENT PASTES OUTPUT HERE]

GATE: Documentation required
```

---

## COMPLETION CHECKLIST

- [ ] PF-1: Task 3.2 complete
- [ ] PF-2: Baseline tests pass
- [ ] PF-3: On correct branch
- [ ] ST-1.1: 10 history tests failing
- [ ] ST-1.2: 10 history tests passing
- [ ] ST-1.3: Checkpoint 1 committed
- [ ] ST-2.1: Response types added
- [ ] ST-2.2: Checkpoint 2 committed
- [ ] IV-1: Full suite 102+ tests, 0 failed
- [ ] IV-2: TypeScript compiles
- [ ] IV-3: Code review (optional)
- [ ] FC-1: Final commit done
- [ ] FC-2: Pushed to remote
- [ ] PT-1: CLAUDE.md updated

**Task 3.3 is ONLY complete when all GATEs have PROOF.**
