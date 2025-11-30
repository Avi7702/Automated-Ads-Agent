# Task 3.1: Edit Schema Updates - STRICT SPEC

## MISSION
Add database columns to support multi-turn editing with parent generation linking.

## CONSTRAINTS
- Branch: `claude/task-3.1-edit-schema`
- Must write tests FIRST (TDD)
- All proofs required at each GATE
- Depends on: Task 2.3 (Image Storage) must be complete

---

## PRE-FLIGHT

### PF-1: Verify Task 2.3 Complete

```
ACTION: Confirm image storage service exists

VERIFY: Run:
ls -la server/services/imageStorage.ts 2>&1
grep "conversationHistory" shared/schema.ts 2>&1

EXPECTED OUTPUT:
- imageStorage.ts exists
- conversationHistory column in schema

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Cannot proceed until 2.3 is done
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
git checkout -b claude/task-3.1-edit-schema 2>&1 && git branch --show-current

EXPECTED OUTPUT:
Switched to a new branch 'claude/task-3.1-edit-schema'
claude/task-3.1-edit-schema

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Must show exact branch name
```

---

## SUBTASK 1: Schema Column Additions

### ST-1.1: Review Current Schema

```
ACTION: Check current generations table

VERIFY: Run:
grep -A 30 "generations" shared/schema.ts | head -40

PROOF: Paste current schema:
[AGENT PASTES OUTPUT HERE]

GATE: Must understand current schema
```

### ST-1.2: Add Edit Columns

```
ACTION: Add edit-related columns to generations table

COLUMNS TO ADD:
- parent_generation_id: uuid (references generations.id, nullable)
- edit_prompt: text (the edit instruction, nullable)
- edit_count: integer (number of times edited, default 0)

DRIZZLE ORM SYNTAX:
```typescript
parentGenerationId: uuid('parent_generation_id').references(() => generations.id),
editPrompt: text('edit_prompt'),
editCount: integer('edit_count').default(0),
```

VERIFY: Run:
grep -E "(parentGenerationId|editPrompt|editCount)" shared/schema.ts

EXPECTED OUTPUT:
- All 3 new columns visible

PROOF: Paste grep output:
[AGENT PASTES OUTPUT HERE]

GATE: All columns must be added
```

### ST-1.3: Checkpoint 1

```
ACTION: Commit schema changes

VERIFY: Run:
git add shared/schema.ts
git commit -m "checkpoint: add edit columns to generations schema (Task 3.1)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Schema commit required
```

---

## SUBTASK 2: Type Definitions

### ST-2.1: Update Generation Types

```
ACTION: Update types to include edit fields

ADD TO server/services/imageStorage.ts OR server/types/:

```typescript
export interface EditableGeneration extends SavedGeneration {
  parentGenerationId: string | null;
  editPrompt: string | null;
  editCount: number;
}

export interface EditChainItem {
  id: string;
  editPrompt: string | null;
  imageUrl: string;
  createdAt: Date;
}
```

VERIFY: Run:
grep -E "(EditableGeneration|EditChainItem|parentGenerationId)" server/services/imageStorage.ts server/types/*.ts 2>/dev/null

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Types must be defined
```

### ST-2.2: Checkpoint 2

```
ACTION: Commit type updates

VERIFY: Run:
git add server/services/imageStorage.ts server/types/
git commit -m "checkpoint: add edit-related types (Task 3.1)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## SUBTASK 3: Storage Service Updates

### ST-3.1: Write Edit Storage Tests

```
ACTION: Add tests to imageStorage.test.ts

TESTS TO ADD:
13. "ImageStorageService › saveEdit › links to parent generation"
14. "ImageStorageService › saveEdit › stores edit prompt"
15. "ImageStorageService › saveEdit › increments edit count"
16. "ImageStorageService › getEditChain › returns full edit history"
17. "ImageStorageService › getEditChain › orders by creation date"

VERIFY: Run:
npm test -- --testPathPattern="imageStorage" 2>&1 | grep -E "(Tests:)"

EXPECTED OUTPUT:
- Shows failing tests for new edit methods

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Edit tests must exist and fail
```

### ST-3.2: Implement Edit Storage Methods

```
ACTION: Add edit methods to ImageStorageService

```typescript
async saveEdit(
  parentId: string,
  editPrompt: string,
  metadata: GenerationMetadata
): Promise<SavedGeneration> {
  const parent = await this.getGeneration(parentId);
  if (!parent) {
    throw new Error('Parent generation not found');
  }

  const filename = await this.saveImage(metadata.imageBase64);
  const editCount = (parent.editCount || 0) + 1;

  const [generation] = await db.insert(generations).values({
    userId: metadata.userId,
    prompt: metadata.prompt,
    imagePath: filename,
    conversationHistory: metadata.conversationHistory,
    model: metadata.model,
    aspectRatio: metadata.aspectRatio,
    parentGenerationId: parentId,
    editPrompt: editPrompt,
    editCount: editCount,
  }).returning();

  return {
    id: generation.id,
    userId: generation.userId,
    prompt: generation.prompt,
    imagePath: filename,
    imageUrl: this.getImageUrl(filename),
    conversationHistory: metadata.conversationHistory,
    model: metadata.model,
    aspectRatio: metadata.aspectRatio,
    createdAt: generation.createdAt,
    parentGenerationId: parentId,
    editPrompt: editPrompt,
    editCount: editCount,
  };
}

async getEditChain(generationId: string): Promise<EditChainItem[]> {
  const chain: EditChainItem[] = [];
  let currentId: string | null = generationId;

  while (currentId) {
    const gen = await this.getGeneration(currentId);
    if (!gen) break;

    chain.unshift({
      id: gen.id,
      editPrompt: gen.editPrompt || null,
      imageUrl: gen.imageUrl,
      createdAt: gen.createdAt,
    });

    currentId = gen.parentGenerationId || null;
  }

  return chain;
}
```

VERIFY: Run:
npm test -- --testPathPattern="imageStorage" 2>&1 | grep -E "(PASS|FAIL|Tests:)" | tail -5

EXPECTED OUTPUT:
- "17 passed"
- "0 failed"

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: All 17 tests must pass
```

### ST-3.3: Checkpoint 3

```
ACTION: Commit storage updates

VERIFY: Run:
git add server/services/imageStorage.ts server/__tests__/imageStorage.test.ts
git commit -m "checkpoint: add edit storage methods (Task 3.1)"

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

Where Y >= 77 (previous 72 + 5 new edit tests)

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
git commit -m "feat: add edit schema and storage methods (Task 3.1)

- Add columns: parent_generation_id, edit_prompt, edit_count
- Add saveEdit method for linked generations
- Add getEditChain method for edit history
- Update types for edit support

Tests: 5 new tests, all passing

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
git push -u origin claude/task-3.1-edit-schema 2>&1

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
| 3.1 Edit Schema | Complete | claude/task-3.1-edit-schema |

VERIFY: Run:
grep "3.1" CLAUDE.md

PROOF: Paste grep output:
[AGENT PASTES OUTPUT HERE]

GATE: Documentation required
```

---

## COMPLETION CHECKLIST

- [ ] PF-1: Task 2.3 complete
- [ ] PF-2: Baseline tests pass
- [ ] PF-3: On correct branch
- [ ] ST-1.1: Current schema reviewed
- [ ] ST-1.2: Edit columns added
- [ ] ST-1.3: Checkpoint 1 committed
- [ ] ST-2.1: Types updated
- [ ] ST-2.2: Checkpoint 2 committed
- [ ] ST-3.1: 5 edit tests failing
- [ ] ST-3.2: All 17 storage tests passing
- [ ] ST-3.3: Checkpoint 3 committed
- [ ] IV-1: Full suite 77+ tests, 0 failed
- [ ] IV-2: TypeScript compiles
- [ ] FC-1: Final commit done
- [ ] FC-2: Pushed to remote
- [ ] PT-1: CLAUDE.md updated

**Task 3.1 is ONLY complete when all GATEs have PROOF.**
