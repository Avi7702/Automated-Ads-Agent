# Task 2.3 Image Storage - Completion Plan

## Current Status: ~70% Complete

### What's Done
- [x] Core `imageStorageService` with PostgreSQL
- [x] `saveGeneration()` - saves image + metadata
- [x] `getGeneration()` - retrieves by ID
- [x] `POST /api/transform` - fully integrated
- [x] File system storage in `uploads/`
- [x] Basic input validation (length, base64 format)

### What's Missing
- [ ] `POST /api/generations/:id/edit` - placeholder
- [ ] `DELETE /api/generations/:id` - placeholder
- [ ] `GET /api/generations/:id` - missing
- [ ] `GET /api/generations` - missing (list all)
- [ ] File size validation
- [ ] Content-type validation (PNG/JPEG)

---

## Implementation Plan

### Phase 1: Service Methods (imageStorageService)

#### 1.1 Add `deleteGeneration()` method
**File:** `server/services/imageStorage.ts`
**Location:** After `getGeneration()` (line ~183)

**Purpose:** Delete both file and database record

```typescript
async deleteGeneration(id: string): Promise<void> {
  this.ensureInitialized();

  // Get generation to find image file
  const generation = await this.getGeneration(id);
  if (!generation) {
    throw new Error('Generation not found');
  }

  // Delete file first (if fails, DB record still exists for retry)
  await this.deleteImage(generation.imagePath);

  // Delete database record
  await this.db!.delete(generations).where(eq(generations.id, id));
}
```

**Tests needed:**
- Deletes file from filesystem
- Deletes record from database
- Handles non-existent generation
- Handles missing file gracefully

---

#### 1.2 Add `updateGeneration()` method
**File:** `server/services/imageStorage.ts`
**Location:** After `deleteGeneration()`

**Purpose:** Update existing generation with new image from edit

```typescript
async updateGeneration(
  id: string,
  imageBase64: string,
  conversationHistory: ConversationMessage[]
): Promise<SavedGeneration> {
  this.ensureInitialized();

  // Get existing generation
  const existing = await this.getGeneration(id);
  if (!existing) {
    throw new Error('Generation not found');
  }

  // Delete old image file
  await this.deleteImage(existing.imagePath);

  // Save new image
  const newFilename = await this.saveImage(imageBase64);

  // Update database record
  let updated;
  try {
    [updated] = await this.db!.update(generations)
      .set({
        imagePath: newFilename,
        conversationHistory: conversationHistory,
        updatedAt: new Date()
      })
      .where(eq(generations.id, id))
      .returning();
  } catch (error) {
    // Clean up new file if DB update fails
    await this.deleteImage(newFilename);
    throw error;
  }

  return {
    id: updated.id,
    userId: updated.userId || '',
    prompt: updated.prompt,
    imagePath: newFilename,
    imageUrl: this.getImageUrl(newFilename),
    conversationHistory: conversationHistory,
    model: updated.model || '',
    aspectRatio: updated.aspectRatio || '1:1',
    createdAt: updated.createdAt
  };
}
```

**Tests needed:**
- Deletes old image file
- Saves new image file
- Updates database record
- Cleans up on failure
- Preserves original prompt/model/aspectRatio

---

#### 1.3 Add `getUserGenerations()` method
**File:** `server/services/imageStorage.ts`
**Location:** After `updateGeneration()`

**Purpose:** List all generations for a user

```typescript
async getUserGenerations(userId: string, limit: number = 50): Promise<SavedGeneration[]> {
  this.ensureInitialized();

  const results = await this.db!.select()
    .from(generations)
    .where(eq(generations.userId, userId))
    .orderBy(desc(generations.createdAt))
    .limit(limit);

  return results.map(gen => ({
    id: gen.id,
    userId: gen.userId || '',
    prompt: gen.prompt,
    imagePath: gen.imagePath || '',
    imageUrl: this.getImageUrl(gen.imagePath || ''),
    conversationHistory: (gen.conversationHistory as ConversationMessage[]) || [],
    model: gen.model || '',
    aspectRatio: gen.aspectRatio || '1:1',
    createdAt: gen.createdAt
  }));
}
```

**Import needed:** Add `desc` to drizzle-orm imports

**Tests needed:**
- Returns user's generations only
- Orders by createdAt descending
- Respects limit parameter
- Returns empty array for user with no generations

---

### Phase 2: Input Validation

#### 2.1 Add file size validation
**File:** `server/services/imageStorage.ts`
**Location:** In `saveImage()`, after buffer creation (line ~96)

```typescript
// Add at top of file
const MAX_IMAGE_SIZE_MB = parseInt(process.env.MAX_IMAGE_SIZE_MB || '10', 10);
const MAX_IMAGE_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024;

// In saveImage(), after: const buffer = Buffer.from(base64Data, 'base64');
if (buffer.length > MAX_IMAGE_SIZE) {
  throw new Error(`Image too large: maximum ${MAX_IMAGE_SIZE_MB}MB allowed`);
}
```

**Tests needed:**
- Rejects images > 10MB
- Accepts images <= 10MB
- Respects MAX_IMAGE_SIZE_MB env var

---

#### 2.2 Add content-type validation (PNG/JPEG magic bytes)
**File:** `server/services/imageStorage.ts`
**Location:** In `saveImage()`, after size validation

```typescript
// Validate PNG or JPEG magic bytes
const isPNG = buffer.length >= 4 &&
  buffer[0] === 0x89 &&
  buffer[1] === 0x50 &&
  buffer[2] === 0x4E &&
  buffer[3] === 0x47;

const isJPEG = buffer.length >= 2 &&
  buffer[0] === 0xFF &&
  buffer[1] === 0xD8;

if (!isPNG && !isJPEG) {
  throw new Error('Invalid image format: only PNG and JPEG supported');
}

// Set correct extension based on detected type
const extension = isPNG ? 'png' : 'jpg';
const filename = this.generateFilename(extension);
```

**Tests needed:**
- Accepts valid PNG
- Accepts valid JPEG
- Rejects GIF, WebP, text files
- Rejects files with fake extensions

---

### Phase 3: API Endpoints

#### 3.1 Implement `DELETE /api/generations/:id`
**File:** `server/routes.ts`
**Location:** Replace placeholder at line ~175-178

```typescript
router.delete('/api/generations/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await imageStorageService.initialize();

    // Verify generation exists and user owns it
    const generation = await imageStorageService.getGeneration(id);
    if (!generation) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    if (generation.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Delete generation (file + DB record)
    await imageStorageService.deleteGeneration(id);

    res.json({ message: 'Generation deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Generation not found') {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete generation' });
  }
});
```

**Tests needed:**
- Returns 401 without auth
- Returns 404 for non-existent ID
- Returns 403 for other user's generation
- Returns 200 and deletes file + DB record
- File no longer exists after delete

---

#### 3.2 Implement `GET /api/generations/:id`
**File:** `server/routes.ts`
**Location:** After DELETE endpoint

```typescript
router.get('/api/generations/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await imageStorageService.initialize();

    const generation = await imageStorageService.getGeneration(id);

    if (!generation) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    if (generation.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({
      id: generation.id,
      prompt: generation.prompt,
      imageUrl: generation.imageUrl,
      model: generation.model,
      aspectRatio: generation.aspectRatio,
      createdAt: generation.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve generation' });
  }
});
```

**Tests needed:**
- Returns 401 without auth
- Returns 404 for non-existent ID
- Returns 403 for other user's generation
- Returns generation data with imageUrl

---

#### 3.3 Implement `GET /api/generations` (list)
**File:** `server/routes.ts`
**Location:** Before single GET (more specific route last)

```typescript
router.get('/api/generations', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    await imageStorageService.initialize();
    const generations = await imageStorageService.getUserGenerations(userId, limit);

    res.json({
      generations: generations.map(g => ({
        id: g.id,
        prompt: g.prompt,
        imageUrl: g.imageUrl,
        model: g.model,
        aspectRatio: g.aspectRatio,
        createdAt: g.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve generations' });
  }
});
```

**Tests needed:**
- Returns 401 without auth
- Returns empty array for new user
- Returns only user's generations
- Respects limit parameter (max 100)
- Orders by createdAt descending

---

#### 3.4 Implement `POST /api/generations/:id/edit`
**File:** `server/routes.ts`
**Location:** Replace placeholder at line ~170-173

**Prerequisite:** Verify `GeminiService.continueConversation()` exists

```typescript
router.post('/api/generations/:id/edit', editLimiter, requireAuth, validate(editSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { prompt } = req.body;
    const userId = req.user!.id;

    await imageStorageService.initialize();

    // Get existing generation and verify ownership
    const existingGeneration = await imageStorageService.getGeneration(id);
    if (!existingGeneration) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    if (existingGeneration.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Continue conversation with Gemini
    const geminiService = new GeminiService();
    const result = await geminiService.continueConversation(
      existingGeneration.conversationHistory,
      prompt
    );

    // Update generation with new image
    const updatedGeneration = await imageStorageService.updateGeneration(
      id,
      result.imageBase64,
      result.conversationHistory
    );

    res.json({
      id: updatedGeneration.id,
      prompt: existingGeneration.prompt,
      imageUrl: updatedGeneration.imageUrl,
      model: updatedGeneration.model,
      aspectRatio: updatedGeneration.aspectRatio,
      createdAt: updatedGeneration.createdAt
    });
  } catch (error) {
    // Same error handling pattern as /api/transform
    const err = error as any;

    if (error instanceof GeminiAuthError || err?.code === 'AUTH_ERROR') {
      res.status(500).json({ error: 'Image generation service unavailable' });
      return;
    }
    if (error instanceof GeminiRateLimitError || err?.code === 'RATE_LIMIT') {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }
    if (error instanceof GeminiContentError || err?.code === 'NO_CONTENT') {
      res.status(400).json({ error: 'Could not generate image' });
      return;
    }
    if (error instanceof GeminiTimeoutError || err?.code === 'TIMEOUT') {
      res.status(504).json({ error: 'Request timeout' });
      return;
    }

    if (error instanceof Error && error.message === 'Generation not found') {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    res.status(500).json({ error: 'Failed to edit generation' });
  }
});
```

**Tests needed:**
- Returns 401 without auth
- Returns 404 for non-existent ID
- Returns 403 for other user's generation
- Calls Gemini with conversation history
- Updates image file (old deleted, new created)
- Returns updated generation

---

### Phase 4: Test Configuration

#### 4.1 Create integration test config
**File:** `jest.integration.config.js` (new file)

```javascript
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: ['**/__tests__/**/*.integration.test.ts'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@server/(.*)$': '<rootDir>/server/$1'
  },
  testTimeout: 30000,
  clearMocks: true,
  verbose: true
};
```

#### 4.2 Add npm script
**File:** `package.json`

```json
"scripts": {
  "test:integration": "jest --config jest.integration.config.js"
}
```

---

## Implementation Order

| # | Task | Priority | Depends On | Est. Lines |
|---|------|----------|------------|------------|
| 1 | `deleteGeneration()` method | HIGH | - | ~20 |
| 2 | `DELETE /api/generations/:id` | HIGH | #1 | ~30 |
| 3 | File size validation | HIGH | - | ~10 |
| 4 | `GET /api/generations/:id` | MEDIUM | - | ~25 |
| 5 | `getUserGenerations()` method | MEDIUM | - | ~25 |
| 6 | `GET /api/generations` | MEDIUM | #5 | ~20 |
| 7 | Content-type validation | MEDIUM | - | ~15 |
| 8 | `updateGeneration()` method | MEDIUM | - | ~35 |
| 9 | `POST /api/generations/:id/edit` | MEDIUM | #8, Gemini | ~50 |
| 10 | Integration test config | LOW | - | ~15 |

**Total estimate:** ~245 lines of code + tests

---

## Verification Checklist

After implementation, verify:

- [ ] `npm test` passes (unit tests)
- [ ] `npm run test:integration` passes (with Docker PostgreSQL)
- [ ] DELETE endpoint removes file AND database record
- [ ] GET endpoints return correct data
- [ ] Edit endpoint calls Gemini and updates image
- [ ] File size > 10MB is rejected
- [ ] Non-image files are rejected
- [ ] Authorization works (users can't access others' generations)

---

## Dependencies to Check

Before implementing Phase 3.4 (edit endpoint):

1. **Verify `GeminiService.continueConversation()` exists**
   - File: `server/services/geminiService.ts`
   - Required for edit functionality
   - If missing, need to implement it first

2. **Verify conversation history structure**
   - Must match what Gemini expects
   - Check `ConversationMessage` type

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini `continueConversation()` missing | Blocks edit feature | Check first, implement if needed |
| Large file uploads cause OOM | Server crash | Add file size validation early |
| Orphaned files on DB failure | Disk fills up | Existing cleanup in `saveGeneration()` handles this |
| Race condition on delete | File deleted but DB fails | Delete file first, DB second |
