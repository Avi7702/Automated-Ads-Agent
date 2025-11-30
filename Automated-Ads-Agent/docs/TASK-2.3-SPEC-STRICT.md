# Task 2.3: Image Storage Service - STRICT SPEC

## MISSION
Create a service to store generated images to disk and metadata to database, with conversation history preservation.

## CONSTRAINTS
- Branch: `claude/task-2.3-image-storage`
- Must write tests FIRST (TDD)
- All proofs required at each GATE
- Depends on: Task 2.2 (Gemini Integration) must be complete

---

## PRE-FLIGHT

### PF-1: Verify Task 2.2 Complete

```
ACTION: Confirm Gemini service exists

VERIFY: Run this exact command:
ls -la server/services/geminiService.ts 2>&1

EXPECTED OUTPUT:
- File exists with size > 0

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

REJECTION CRITERIA:
- "No such file" = REJECTED (Task 2.2 not complete)

GATE: Cannot proceed until 2.2 is done
```

### PF-2: Environment Check

```
ACTION: Verify baseline tests pass

VERIFY: Run this exact command:
npm test 2>&1 | tail -15

EXPECTED OUTPUT MUST CONTAIN:
- "Test Suites:" with "passed"
- "0 failed" or no failed count
- 60+ tests passing

PROOF: Paste the 15 lines here:
[AGENT PASTES OUTPUT HERE]

GATE: Cannot proceed until baseline green
```

### PF-3: Create Branch

```
ACTION: Create task branch

VERIFY: Run this exact command:
git checkout -b claude/task-2.3-image-storage 2>&1 && git branch --show-current

EXPECTED OUTPUT:
Switched to a new branch 'claude/task-2.3-image-storage'
claude/task-2.3-image-storage

PROOF: Paste both lines:
[AGENT PASTES OUTPUT HERE]

GATE: Must show exact branch name
```

---

## SUBTASK 1: Database Schema Updates

### ST-1.1: Check Current Schema

```
ACTION: Review current generations table schema

VERIFY: Run:
grep -A 20 "generations" shared/schema.ts 2>&1 || grep -A 20 "generations" server/db/schema.ts 2>&1

PROOF: Paste current schema:
[AGENT PASTES OUTPUT HERE]

GATE: Must understand current schema before modifying
```

### ST-1.2: Add New Columns

```
ACTION: Add columns to generations table in schema file

COLUMNS TO ADD:
- image_path: text (path to stored image file)
- conversation_history: jsonb (array of conversation messages)
- model: varchar(100) (model used for generation)
- aspect_ratio: varchar(20) (aspect ratio used)

SCHEMA ADDITION (Drizzle ORM style):
```typescript
imagePath: text('image_path'),
conversationHistory: jsonb('conversation_history').$type<ConversationMessage[]>(),
model: varchar('model', { length: 100 }),
aspectRatio: varchar('aspect_ratio', { length: 20 }),
```

VERIFY: Run:
grep -E "(imagePath|conversationHistory|model|aspectRatio)" shared/schema.ts

EXPECTED OUTPUT:
- All 4 new columns visible

PROOF: Paste grep output:
[AGENT PASTES OUTPUT HERE]

GATE: All columns must be added
```

### ST-1.3: Checkpoint 1

```
ACTION: Commit schema changes

VERIFY: Run:
git add shared/schema.ts
git commit -m "checkpoint: add image storage columns to generations (Task 2.3)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Schema commit required
```

---

## SUBTASK 2: Image Storage Service Tests

### ST-2.1: Write Storage Tests

```
ACTION: Create file server/__tests__/imageStorage.test.ts

TESTS TO CREATE (exact names):
1. "ImageStorageService › saveImage › saves image to disk"
2. "ImageStorageService › saveImage › generates unique filename"
3. "ImageStorageService › saveImage › creates upload directory if missing"
4. "ImageStorageService › saveImage › returns correct file path"
5. "ImageStorageService › getImagePath › returns full path for filename"
6. "ImageStorageService › getImageUrl › returns URL-safe path"
7. "ImageStorageService › deleteImage › removes file from disk"
8. "ImageStorageService › deleteImage › handles missing file gracefully"
9. "ImageStorageService › saveGeneration › stores metadata in database"
10. "ImageStorageService › saveGeneration › stores conversation history"
11. "ImageStorageService › getGeneration › retrieves generation with history"
12. "ImageStorageService › getGeneration › returns null for non-existent id"

VERIFY: Run:
npm test -- --testPathPattern="imageStorage" 2>&1 | grep -E "(PASS|FAIL|✓|✕|imageStorage)" | head -20

EXPECTED OUTPUT:
- Tests FAIL (service doesn't exist)
- Shows 12 failing tests

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Must see 12 failing tests
```

### ST-2.2: Implement Image Storage Service

```
ACTION: Create file server/services/imageStorage.ts

IMPLEMENTATION:
```typescript
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { db } from '../db';
import { generations } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { ConversationMessage } from './geminiService';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export interface GenerationMetadata {
  userId: string;
  prompt: string;
  imageBase64: string;
  conversationHistory: ConversationMessage[];
  model: string;
  aspectRatio: string;
}

export interface SavedGeneration {
  id: string;
  userId: string;
  prompt: string;
  imagePath: string;
  imageUrl: string;
  conversationHistory: ConversationMessage[];
  model: string;
  aspectRatio: string;
  createdAt: Date;
}

class ImageStorageService {
  async ensureUploadDir(): Promise<void> {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }

  generateFilename(extension: string = 'png'): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `generation_${timestamp}_${random}.${extension}`;
  }

  async saveImage(base64Data: string): Promise<string> {
    await this.ensureUploadDir();
    const filename = this.generateFilename();
    const filepath = path.join(UPLOAD_DIR, filename);
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(filepath, buffer);
    return filename;
  }

  getImagePath(filename: string): string {
    return path.join(UPLOAD_DIR, filename);
  }

  getImageUrl(filename: string): string {
    return `/uploads/${filename}`;
  }

  async deleteImage(filename: string): Promise<void> {
    try {
      const filepath = this.getImagePath(filename);
      await fs.unlink(filepath);
    } catch (error) {
      // File may not exist, that's okay
    }
  }

  async saveGeneration(metadata: GenerationMetadata): Promise<SavedGeneration> {
    const filename = await this.saveImage(metadata.imageBase64);

    const [generation] = await db.insert(generations).values({
      userId: metadata.userId,
      prompt: metadata.prompt,
      imagePath: filename,
      conversationHistory: metadata.conversationHistory,
      model: metadata.model,
      aspectRatio: metadata.aspectRatio,
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
    };
  }

  async getGeneration(id: string): Promise<SavedGeneration | null> {
    const [generation] = await db
      .select()
      .from(generations)
      .where(eq(generations.id, id));

    if (!generation) return null;

    return {
      id: generation.id,
      userId: generation.userId,
      prompt: generation.prompt,
      imagePath: generation.imagePath!,
      imageUrl: this.getImageUrl(generation.imagePath!),
      conversationHistory: generation.conversationHistory as ConversationMessage[],
      model: generation.model!,
      aspectRatio: generation.aspectRatio!,
      createdAt: generation.createdAt,
    };
  }
}

export const imageStorageService = new ImageStorageService();
```

VERIFY: Run:
npm test -- --testPathPattern="imageStorage" 2>&1 | grep -E "(PASS|FAIL|Tests:)" | tail -10

EXPECTED OUTPUT:
- "PASS"
- "12 passed"
- "0 failed"

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: All 12 tests must pass
```

### ST-2.3: Checkpoint 2

```
ACTION: Commit storage service

VERIFY: Run:
git add server/services/imageStorage.ts server/__tests__/imageStorage.test.ts
git commit -m "checkpoint: add image storage service (Task 2.3)"

PROOF: Paste commit hash:
[AGENT PASTES OUTPUT HERE]

GATE: Checkpoint required
```

---

## SUBTASK 3: Static File Serving

### ST-3.1: Configure Express Static

```
ACTION: Add static file serving for uploads in server/app.ts

ADD THIS LINE (after other middleware):
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

VERIFY: Run:
grep -n "uploads" server/app.ts

EXPECTED OUTPUT:
- Line showing static file serving for uploads

PROOF: Paste grep output:
[AGENT PASTES OUTPUT HERE]

GATE: Static serving must be configured
```

### ST-3.2: Add .gitignore for uploads

```
ACTION: Ensure uploads directory is gitignored but exists

VERIFY: Run:
echo "uploads/*" >> .gitignore
echo "!uploads/.gitkeep" >> .gitignore
mkdir -p uploads
touch uploads/.gitkeep
git add uploads/.gitkeep
grep "uploads" .gitignore

EXPECTED OUTPUT:
- uploads/* in .gitignore
- !uploads/.gitkeep in .gitignore

PROOF: Paste output:
[AGENT PASTES OUTPUT HERE]

GATE: Uploads directory configured
```

### ST-3.3: Checkpoint 3

```
ACTION: Commit static serving config

VERIFY: Run:
git add server/app.ts .gitignore uploads/.gitkeep
git commit -m "checkpoint: configure static file serving (Task 2.3)"

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

Where Y >= 72 (previous 60 + 12 storage)

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

---

## FINAL COMMIT & PUSH

### FC-1: Final Commit

```
ACTION: Final commit

VERIFY: Run:
git add .
git commit -m "feat: add image storage service with database persistence (Task 2.3)

- Add schema columns: image_path, conversation_history, model, aspect_ratio
- Create ImageStorageService for file and DB operations
- Configure static file serving for uploads
- Preserve conversation history for editing

Tests: 12 new tests, all passing

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
git push -u origin claude/task-2.3-image-storage 2>&1

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
| 2.3 Image Storage | Complete | claude/task-2.3-image-storage |

ADD to Key Files:
- `server/services/imageStorage.ts` - Image storage service (Task 2.3 complete)

VERIFY: Run:
grep "2.3" CLAUDE.md

PROOF: Paste grep output:
[AGENT PASTES OUTPUT HERE]

GATE: Documentation required
```

---

## COMPLETION CHECKLIST

- [ ] PF-1: Task 2.2 complete
- [ ] PF-2: Baseline tests pass
- [ ] PF-3: On correct branch
- [ ] ST-1.1: Current schema reviewed
- [ ] ST-1.2: New columns added
- [ ] ST-1.3: Checkpoint 1 committed
- [ ] ST-2.1: 12 storage tests failing
- [ ] ST-2.2: 12 storage tests passing
- [ ] ST-2.3: Checkpoint 2 committed
- [ ] ST-3.1: Static serving configured
- [ ] ST-3.2: Gitignore configured
- [ ] ST-3.3: Checkpoint 3 committed
- [ ] IV-1: Full suite 72+ tests, 0 failed
- [ ] IV-2: TypeScript compiles
- [ ] FC-1: Final commit done
- [ ] FC-2: Pushed to remote
- [ ] PT-1: CLAUDE.md updated

**Task 2.3 is ONLY complete when all GATEs have PROOF.**
