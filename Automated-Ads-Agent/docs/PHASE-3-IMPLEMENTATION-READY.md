# Phase 3: Multi-Turn Editing - Production-Ready Implementation

## Overview

This document contains complete, production-ready specifications for Phase 3.
Each task includes exact code to implement, all tests to write, and edge cases to handle.

**Starting State:**
- 140 tests passing
- TypeScript compiles cleanly
- Tasks 1.1-2.4 complete

**End State:**
- 185+ tests passing
- Full multi-turn image editing capability
- Edit history tracking
- Frontend edit UI

---

# Task 3.1: Edit Schema Updates

**Branch:** `claude/task-3.1-edit-schema`
**Depends on:** Task 2.3 (complete)
**New Tests:** 5
**Total Tests After:** 145+

## 1. Schema Changes

### File: `shared/schema.ts`

Add these columns to the `generations` table:

```typescript
// Add to generations table (after aspectRatio line ~29):
  parentGenerationId: uuid('parent_generation_id').references(() => generations.id),
  editPrompt: text('edit_prompt'),
  editCount: integer('edit_count').default(0),
```

**Complete updated generations table:**

```typescript
export const generations = pgTable('generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }),
  prompt: text('prompt').notNull(),
  result: text('result'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  imagePath: text('image_path'),
  conversationHistory: jsonb('conversation_history'),
  model: varchar('model', { length: 100 }),
  aspectRatio: varchar('aspect_ratio', { length: 20 }),
  // NEW: Edit tracking columns
  parentGenerationId: uuid('parent_generation_id').references(() => generations.id),
  editPrompt: text('edit_prompt'),
  editCount: integer('edit_count').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

## 2. Type Definitions

### File: `server/services/imageStorage.ts`

Add these interfaces after `SavedGeneration`:

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

export interface SaveEditInput {
  parentId: string;
  editPrompt: string;
  metadata: GenerationMetadata;
}
```

Update `SavedGeneration` to include edit fields:

```typescript
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
  // Add optional edit fields
  parentGenerationId?: string | null;
  editPrompt?: string | null;
  editCount?: number;
}
```

## 3. Storage Service Methods

### File: `server/services/imageStorage.ts`

Add these methods to `ImageStorageService` class:

```typescript
async saveEdit(
  parentId: string,
  editPrompt: string,
  metadata: GenerationMetadata
): Promise<SavedGeneration> {
  this.ensureInitialized();

  // Get parent to validate and get edit count
  const parent = await this.getGeneration(parentId);
  if (!parent) {
    throw new Error('Parent generation not found');
  }

  // Verify user owns the parent
  if (parent.userId !== metadata.userId) {
    throw new Error('Not authorized to edit this generation');
  }

  // Save new image to filesystem
  const filename = await this.saveImage(metadata.imageBase64);

  // Calculate new edit count
  const newEditCount = (parent.editCount || 0) + 1;

  // Insert new generation linked to parent
  let dbGeneration;
  try {
    [dbGeneration] = await this.db!.insert(generations)
      .values({
        userId: metadata.userId,
        prompt: metadata.prompt,
        imagePath: filename,
        conversationHistory: metadata.conversationHistory,
        model: metadata.model,
        aspectRatio: metadata.aspectRatio,
        parentGenerationId: parentId,
        editPrompt: editPrompt,
        editCount: newEditCount,
        status: 'completed',
      })
      .returning();
  } catch (error) {
    // Clean up file if DB insert fails
    await this.deleteImage(filename);
    throw error;
  }

  return {
    id: dbGeneration.id,
    userId: metadata.userId,
    prompt: metadata.prompt,
    imagePath: filename,
    imageUrl: this.getImageUrl(filename),
    conversationHistory: metadata.conversationHistory as ConversationMessage[],
    model: metadata.model,
    aspectRatio: metadata.aspectRatio,
    createdAt: dbGeneration.createdAt,
    parentGenerationId: parentId,
    editPrompt: editPrompt,
    editCount: newEditCount,
  };
}

async getEditChain(generationId: string): Promise<EditChainItem[]> {
  this.ensureInitialized();

  const chain: EditChainItem[] = [];
  let currentId: string | null = generationId;

  // Walk back through parent chain
  while (currentId) {
    const gen = await this.getGeneration(currentId);
    if (!gen) break;

    // Add to beginning (so oldest is first)
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

Update `getGeneration` to include new fields:

```typescript
async getGeneration(id: string): Promise<SavedGeneration | null> {
  this.ensureInitialized();

  const [dbGeneration] = await this.db!.select()
    .from(generations)
    .where(eq(generations.id, id));

  if (!dbGeneration) {
    return null;
  }

  return {
    id: dbGeneration.id,
    userId: dbGeneration.userId || '',
    prompt: dbGeneration.prompt,
    imagePath: dbGeneration.imagePath || '',
    imageUrl: this.getImageUrl(dbGeneration.imagePath || ''),
    conversationHistory: (dbGeneration.conversationHistory as ConversationMessage[]) || [],
    model: dbGeneration.model || '',
    aspectRatio: dbGeneration.aspectRatio || '1:1',
    createdAt: dbGeneration.createdAt,
    // Include edit fields
    parentGenerationId: dbGeneration.parentGenerationId || null,
    editPrompt: dbGeneration.editPrompt || null,
    editCount: dbGeneration.editCount || 0,
  };
}
```

## 4. Tests

### File: `server/__tests__/imageStorage.test.ts`

Add these test cases to the existing file:

```typescript
describe('Edit Operations', () => {
  beforeEach(async () => {
    await imageStorageService.initialize();
  });

  afterEach(async () => {
    await imageStorageService.close();
  });

  it('saveEdit links to parent generation', async () => {
    // Setup: create parent generation first
    mockReturning.mockResolvedValueOnce([{
      ...mockDbGeneration,
      parentGenerationId: null,
      editPrompt: null,
      editCount: 0,
    }]);

    // Then mock for saveEdit
    mockReturning.mockResolvedValueOnce([{
      ...mockDbGeneration,
      id: 'child-gen-id',
      parentGenerationId: 'gen-uuid-123',
      editPrompt: 'Make it warmer',
      editCount: 1,
    }]);

    const result = await imageStorageService.saveEdit(
      'gen-uuid-123',
      'Make it warmer',
      mockGenerationData
    );

    expect(result.parentGenerationId).toBe('gen-uuid-123');
  });

  it('saveEdit stores edit prompt', async () => {
    mockReturning.mockResolvedValueOnce([{
      ...mockDbGeneration,
      parentGenerationId: null,
      editCount: 0,
    }]);

    mockReturning.mockResolvedValueOnce([{
      ...mockDbGeneration,
      id: 'child-gen-id',
      parentGenerationId: 'gen-uuid-123',
      editPrompt: 'Add more contrast',
      editCount: 1,
    }]);

    const result = await imageStorageService.saveEdit(
      'gen-uuid-123',
      'Add more contrast',
      mockGenerationData
    );

    expect(result.editPrompt).toBe('Add more contrast');
  });

  it('saveEdit increments edit count', async () => {
    mockWhere.mockResolvedValueOnce([{
      ...mockDbGeneration,
      editCount: 2,
    }]);

    mockReturning.mockResolvedValueOnce([{
      ...mockDbGeneration,
      id: 'child-gen-id',
      editCount: 3,
    }]);

    const result = await imageStorageService.saveEdit(
      'gen-uuid-123',
      'Another edit',
      mockGenerationData
    );

    expect(result.editCount).toBe(3);
  });

  it('getEditChain returns full edit history', async () => {
    // Mock chain: original -> edit1 -> edit2
    mockWhere
      .mockResolvedValueOnce([{
        ...mockDbGeneration,
        id: 'edit-2',
        parentGenerationId: 'edit-1',
        editPrompt: 'Second edit',
      }])
      .mockResolvedValueOnce([{
        ...mockDbGeneration,
        id: 'edit-1',
        parentGenerationId: 'original',
        editPrompt: 'First edit',
      }])
      .mockResolvedValueOnce([{
        ...mockDbGeneration,
        id: 'original',
        parentGenerationId: null,
        editPrompt: null,
      }]);

    const chain = await imageStorageService.getEditChain('edit-2');

    expect(chain).toHaveLength(3);
    expect(chain[0].id).toBe('original');
    expect(chain[1].id).toBe('edit-1');
    expect(chain[2].id).toBe('edit-2');
  });

  it('getEditChain orders by creation date ascending', async () => {
    mockWhere
      .mockResolvedValueOnce([{
        ...mockDbGeneration,
        id: 'edit-1',
        parentGenerationId: 'original',
        createdAt: new Date('2024-01-02'),
      }])
      .mockResolvedValueOnce([{
        ...mockDbGeneration,
        id: 'original',
        parentGenerationId: null,
        createdAt: new Date('2024-01-01'),
      }]);

    const chain = await imageStorageService.getEditChain('edit-1');

    expect(chain[0].createdAt.getTime()).toBeLessThan(chain[1].createdAt.getTime());
  });
});
```

## 5. Verification Commands

```bash
# Run schema migration
npx drizzle-kit push:pg

# Run imageStorage tests
npm test -- --testPathPattern="imageStorage"

# Expected: 35 tests (30 existing + 5 new)
```

---

# Task 3.2: Edit Endpoint Enhancement

**Branch:** `claude/task-3.2-edit-endpoint`
**Depends on:** Task 3.1
**New Tests:** 15
**Total Tests After:** 160+

## 1. Update Edit Endpoint

### File: `server/routes.ts`

The edit endpoint exists but uses `updateGeneration`. Change to use `saveEdit`:

```typescript
router.post('/api/generations/:id/edit', editLimiter, requireAuth, validate(editSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { prompt } = req.body;  // Note: schema uses 'prompt', keep consistent
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

    // CHANGED: Use saveEdit instead of updateGeneration
    const newGeneration = await imageStorageService.saveEdit(
      id,
      prompt,
      {
        userId,
        prompt: `${existingGeneration.prompt} [EDIT: ${prompt}]`,
        imageBase64: result.imageBase64,
        conversationHistory: result.conversationHistory,
        model: result.model,
        aspectRatio: existingGeneration.aspectRatio,
      }
    );

    // CHANGED: Return new format with parentId
    res.status(201).json({
      success: true,
      generationId: newGeneration.id,
      imageUrl: newGeneration.imageUrl,
      parentId: id,
      canEdit: true
    });
  } catch (error) {
    // Keep existing error handling...
    const err = error as { code?: string; name?: string; message?: string };
    const errorName = err?.name || '';
    const errorCode = err?.code || '';
    const errorMessage = err?.message || '';

    if (error instanceof GeminiAuthError ||
        errorCode === 'AUTH_ERROR' ||
        errorName === 'GeminiAuthError' ||
        errorMessage.includes('API key')) {
      res.status(500).json({ error: 'Image generation service unavailable' });
      return;
    }

    if (error instanceof GeminiRateLimitError ||
        errorCode === 'RATE_LIMIT' ||
        errorName === 'GeminiRateLimitError' ||
        errorMessage.includes('rate limit')) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    if (error instanceof GeminiContentError ||
        errorCode === 'NO_CONTENT' ||
        errorName === 'GeminiContentError' ||
        errorMessage.includes('No image data') ||
        errorMessage.includes('safety filter')) {
      res.status(400).json({ error: 'Could not generate image' });
      return;
    }

    if (error instanceof GeminiTimeoutError ||
        errorCode === 'TIMEOUT' ||
        errorName === 'GeminiTimeoutError' ||
        errorMessage.includes('timed out')) {
      res.status(504).json({ error: 'Request timeout' });
      return;
    }

    if (errorMessage === 'Generation not found' ||
        errorMessage === 'Parent generation not found') {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    if (errorMessage === 'Not authorized to edit this generation') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.status(500).json({ error: 'Failed to edit generation' });
  }
});
```

## 2. Tests

### File: `server/__tests__/edit.test.ts` (NEW FILE)

```typescript
import request from 'supertest';
import { app } from '../app';
import { GeminiService } from '../services/geminiService';
import { imageStorageService } from '../services/imageStorage';

// Mock error classes (same pattern as transform.test.ts)
class MockGeminiAuthError extends Error {
  code = 'AUTH_ERROR';
  constructor() {
    super('Invalid or missing Gemini API key');
    this.name = 'GeminiAuthError';
  }
}

class MockGeminiRateLimitError extends Error {
  code = 'RATE_LIMIT';
  constructor() {
    super('Gemini API rate limit exceeded');
    this.name = 'GeminiRateLimitError';
  }
}

class MockGeminiContentError extends Error {
  code = 'NO_CONTENT';
  constructor() {
    super('No image data in response');
    this.name = 'GeminiContentError';
  }
}

class MockGeminiTimeoutError extends Error {
  code = 'TIMEOUT';
  constructor() {
    super('Gemini API request timed out');
    this.name = 'GeminiTimeoutError';
  }
}

jest.mock('../services/geminiService');

// Helper functions
function getCookies(res: request.Response): string[] {
  const setCookie = res.headers['set-cookie'];
  if (Array.isArray(setCookie)) return setCookie;
  if (typeof setCookie === 'string') return [setCookie];
  return [];
}

function getSessionCookie(res: request.Response): string | undefined {
  const cookies = getCookies(res);
  return cookies.find(c => c.startsWith('sessionId='));
}

function extractSessionId(cookie: string): string | undefined {
  return cookie.match(/sessionId=([^;]+)/)?.[1];
}

describe('POST /api/generations/:id/edit', () => {
  let sessionId: string;
  let userId: string;
  let sessionCookie: string;

  const mockExistingGeneration = {
    id: 'existing-gen-id',
    userId: '',  // Will be set in beforeEach
    prompt: 'Original prompt',
    imagePath: 'original.png',
    imageUrl: '/uploads/original.png',
    conversationHistory: [
      { role: 'user' as const, parts: [{ text: 'Original prompt' }] }
    ],
    model: 'gemini-2.0-flash-exp',
    aspectRatio: '1:1',
    createdAt: new Date(),
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
  };

  beforeEach(async () => {
    // Create user and login
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'edit-test@example.com', password: 'TestPass123!' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'edit-test@example.com', password: 'TestPass123!' });

    sessionCookie = getSessionCookie(loginRes)!;
    sessionId = extractSessionId(sessionCookie)!;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [sessionCookie]);
    userId = meRes.body.user.id;

    // Update mock with correct userId
    mockExistingGeneration.userId = userId;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/generations/some-id/edit')
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid session', async () => {
      const res = await request(app)
        .post('/api/generations/some-id/edit')
        .set('Cookie', ['sessionId=invalid'])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(401);
    });
  });

  describe('Authorization', () => {
    it('returns 404 for non-existent generation', async () => {
      jest.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      jest.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/generations/nonexistent-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Generation not found');
    });

    it('returns 403 for other user\'s generation', async () => {
      jest.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      jest.spyOn(imageStorageService, 'getGeneration').mockResolvedValue({
        ...mockExistingGeneration,
        userId: 'different-user-id',
      });

      const res = await request(app)
        .post('/api/generations/other-user-gen/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  });

  describe('Validation', () => {
    it('returns 400 for missing prompt', async () => {
      const res = await request(app)
        .post('/api/generations/some-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('returns 400 for empty prompt', async () => {
      const res = await request(app)
        .post('/api/generations/some-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Successful Edit', () => {
    beforeEach(() => {
      jest.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      jest.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockExistingGeneration);
    });

    it('returns 201 with valid edit', async () => {
      const mockContinueConversation = jest.fn().mockResolvedValue({
        imageBase64: 'newBase64Data',
        conversationHistory: [...mockExistingGeneration.conversationHistory],
        model: 'gemini-2.0-flash-exp'
      });
      (GeminiService as jest.MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      jest.spyOn(imageStorageService, 'saveEdit').mockResolvedValue({
        ...mockExistingGeneration,
        id: 'new-edited-id',
        parentGenerationId: 'existing-gen-id',
        editPrompt: 'Make it warmer',
        editCount: 1,
        imageUrl: '/uploads/edited.png',
      });

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(201);
    });

    it('returns new generationId in response', async () => {
      const mockContinueConversation = jest.fn().mockResolvedValue({
        imageBase64: 'newBase64Data',
        conversationHistory: [],
        model: 'gemini-2.0-flash-exp'
      });
      (GeminiService as jest.MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      jest.spyOn(imageStorageService, 'saveEdit').mockResolvedValue({
        ...mockExistingGeneration,
        id: 'new-edited-id',
        parentGenerationId: 'existing-gen-id',
        editPrompt: 'Make it warmer',
        editCount: 1,
      });

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.body.generationId).toBe('new-edited-id');
      expect(res.body.generationId).not.toBe('existing-gen-id');
    });

    it('returns parentId in response', async () => {
      const mockContinueConversation = jest.fn().mockResolvedValue({
        imageBase64: 'newBase64Data',
        conversationHistory: [],
        model: 'gemini-2.0-flash-exp'
      });
      (GeminiService as jest.MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      jest.spyOn(imageStorageService, 'saveEdit').mockResolvedValue({
        ...mockExistingGeneration,
        id: 'new-edited-id',
        parentGenerationId: 'existing-gen-id',
      });

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.body.parentId).toBe('existing-gen-id');
    });

    it('returns canEdit: true in response', async () => {
      const mockContinueConversation = jest.fn().mockResolvedValue({
        imageBase64: 'newBase64Data',
        conversationHistory: [],
        model: 'gemini-2.0-flash-exp'
      });
      (GeminiService as jest.MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      jest.spyOn(imageStorageService, 'saveEdit').mockResolvedValue({
        ...mockExistingGeneration,
        id: 'new-edited-id',
      });

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.body.canEdit).toBe(true);
      expect(res.body.success).toBe(true);
    });

    it('calls GeminiService.continueConversation with history and prompt', async () => {
      const mockContinueConversation = jest.fn().mockResolvedValue({
        imageBase64: 'newBase64Data',
        conversationHistory: [],
        model: 'gemini-2.0-flash-exp'
      });
      (GeminiService as jest.MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      jest.spyOn(imageStorageService, 'saveEdit').mockResolvedValue({
        ...mockExistingGeneration,
        id: 'new-edited-id',
      });

      await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(mockContinueConversation).toHaveBeenCalledWith(
        mockExistingGeneration.conversationHistory,
        'Make it warmer'
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      jest.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockExistingGeneration);
    });

    it('returns 500 for GeminiAuthError', async () => {
      const mockContinueConversation = jest.fn().mockRejectedValue(new MockGeminiAuthError());
      (GeminiService as jest.MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Image generation service unavailable');
    });

    it('returns 429 for GeminiRateLimitError', async () => {
      const mockContinueConversation = jest.fn().mockRejectedValue(new MockGeminiRateLimitError());
      (GeminiService as jest.MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(429);
      expect(res.body.error).toBe('Too many requests');
    });

    it('returns 400 for GeminiContentError', async () => {
      const mockContinueConversation = jest.fn().mockRejectedValue(new MockGeminiContentError());
      (GeminiService as jest.MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Could not generate image');
    });

    it('returns 504 for GeminiTimeoutError', async () => {
      const mockContinueConversation = jest.fn().mockRejectedValue(new MockGeminiTimeoutError());
      (GeminiService as jest.MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(504);
      expect(res.body.error).toBe('Request timeout');
    });

    it('returns 500 for storage error', async () => {
      const mockContinueConversation = jest.fn().mockResolvedValue({
        imageBase64: 'newBase64Data',
        conversationHistory: [],
        model: 'gemini-2.0-flash-exp'
      });
      (GeminiService as jest.MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      jest.spyOn(imageStorageService, 'saveEdit').mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to edit generation');
    });
  });
});
```

## 3. Verification Commands

```bash
# Run edit tests
npm test -- --testPathPattern="edit"

# Expected: 15 tests passing
```

---

# Task 3.3: History Endpoint

**Branch:** `claude/task-3.3-history-endpoint`
**Depends on:** Task 3.2
**New Tests:** 10
**Total Tests After:** 170+

## 1. Add History Endpoint

### File: `server/routes.ts`

Add this route BEFORE the `GET /api/generations/:id` route:

```typescript
router.get('/api/generations/:id/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await imageStorageService.initialize();

    // Get the generation to check ownership
    const generation = await imageStorageService.getGeneration(id);

    if (!generation) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    if (generation.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
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
});
```

## 2. Tests

### File: `server/__tests__/history.test.ts` (NEW FILE)

```typescript
import request from 'supertest';
import { app } from '../app';
import { imageStorageService } from '../services/imageStorage';

function getCookies(res: request.Response): string[] {
  const setCookie = res.headers['set-cookie'];
  if (Array.isArray(setCookie)) return setCookie;
  if (typeof setCookie === 'string') return [setCookie];
  return [];
}

function getSessionCookie(res: request.Response): string | undefined {
  const cookies = getCookies(res);
  return cookies.find(c => c.startsWith('sessionId='));
}

function extractSessionId(cookie: string): string | undefined {
  return cookie.match(/sessionId=([^;]+)/)?.[1];
}

describe('GET /api/generations/:id/history', () => {
  let sessionId: string;
  let userId: string;

  const mockGeneration = {
    id: 'gen-123',
    userId: '',
    prompt: 'Test prompt',
    imagePath: 'test.png',
    imageUrl: '/uploads/test.png',
    conversationHistory: [],
    model: 'gemini-2.0-flash-exp',
    aspectRatio: '1:1',
    createdAt: new Date('2024-01-01'),
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
  };

  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'history-test@example.com', password: 'TestPass123!' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'history-test@example.com', password: 'TestPass123!' });

    const sessionCookie = getSessionCookie(loginRes)!;
    sessionId = extractSessionId(sessionCookie)!;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [sessionCookie]);
    userId = meRes.body.user.id;

    mockGeneration.userId = userId;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/generations/some-id/history');

      expect(res.status).toBe(401);
    });
  });

  describe('Authorization', () => {
    it('returns 404 for non-existent generation', async () => {
      jest.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      jest.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/generations/nonexistent/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Generation not found');
    });

    it('returns 403 for other user\'s generation', async () => {
      jest.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      jest.spyOn(imageStorageService, 'getGeneration').mockResolvedValue({
        ...mockGeneration,
        userId: 'different-user',
      });

      const res = await request(app)
        .get('/api/generations/other-user-gen/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  });

  describe('Response Format', () => {
    it('returns array of edit chain', async () => {
      jest.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      jest.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockGeneration);
      jest.spyOn(imageStorageService, 'getEditChain').mockResolvedValue([
        { id: 'original', editPrompt: null, imageUrl: '/uploads/original.png', createdAt: new Date('2024-01-01') },
        { id: 'edit-1', editPrompt: 'First edit', imageUrl: '/uploads/edit1.png', createdAt: new Date('2024-01-02') },
      ]);

      const res = await request(app)
        .get('/api/generations/gen-123/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.history)).toBe(true);
      expect(res.body.history).toHaveLength(2);
    });

    it('includes original generation', async () => {
      jest.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      jest.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockGeneration);
      jest.spyOn(imageStorageService, 'getEditChain').mockResolvedValue([
        { id: 'original', editPrompt: null, imageUrl: '/uploads/original.png', createdAt: new Date('2024-01-01') },
      ]);

      const res = await request(app)
        .get('/api/generations/gen-123/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.body.history[0].editPrompt).toBeNull();
    });

    it('orders by creation date ascending', async () => {
      jest.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      jest.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockGeneration);
      jest.spyOn(imageStorageService, 'getEditChain').mockResolvedValue([
        { id: 'original', editPrompt: null, imageUrl: '/uploads/1.png', createdAt: new Date('2024-01-01') },
        { id: 'edit-1', editPrompt: 'Edit 1', imageUrl: '/uploads/2.png', createdAt: new Date('2024-01-02') },
        { id: 'edit-2', editPrompt: 'Edit 2', imageUrl: '/uploads/3.png', createdAt: new Date('2024-01-03') },
      ]);

      const res = await request(app)
        .get('/api/generations/gen-123/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      const dates = res.body.history.map((h: any) => new Date(h.createdAt).getTime());
      expect(dates[0]).toBeLessThan(dates[1]);
      expect(dates[1]).toBeLessThan(dates[2]);
    });

    it('includes editPrompt for each item', async () => {
      jest.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      jest.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockGeneration);
      jest.spyOn(imageStorageService, 'getEditChain').mockResolvedValue([
        { id: 'original', editPrompt: null, imageUrl: '/uploads/1.png', createdAt: new Date() },
        { id: 'edit-1', editPrompt: 'Make it warmer', imageUrl: '/uploads/2.png', createdAt: new Date() },
      ]);

      const res = await request(app)
        .get('/api/generations/gen-123/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.body.history[0]).toHaveProperty('editPrompt');
      expect(res.body.history[1].editPrompt).toBe('Make it warmer');
    });

    it('includes imageUrl for each item', async () => {
      jest.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      jest.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockGeneration);
      jest.spyOn(imageStorageService, 'getEditChain').mockResolvedValue([
        { id: 'original', editPrompt: null, imageUrl: '/uploads/original.png', createdAt: new Date() },
      ]);

      const res = await request(app)
        .get('/api/generations/gen-123/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.body.history[0].imageUrl).toBe('/uploads/original.png');
    });

    it('returns single item for unedited generation', async () => {
      jest.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      jest.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockGeneration);
      jest.spyOn(imageStorageService, 'getEditChain').mockResolvedValue([
        { id: 'original', editPrompt: null, imageUrl: '/uploads/original.png', createdAt: new Date() },
      ]);

      const res = await request(app)
        .get('/api/generations/gen-123/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.body.history).toHaveLength(1);
      expect(res.body.totalEdits).toBe(0);
    });

    it('returns totalEdits count', async () => {
      jest.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      jest.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockGeneration);
      jest.spyOn(imageStorageService, 'getEditChain').mockResolvedValue([
        { id: 'original', editPrompt: null, imageUrl: '/uploads/1.png', createdAt: new Date() },
        { id: 'edit-1', editPrompt: 'Edit 1', imageUrl: '/uploads/2.png', createdAt: new Date() },
        { id: 'edit-2', editPrompt: 'Edit 2', imageUrl: '/uploads/3.png', createdAt: new Date() },
      ]);

      const res = await request(app)
        .get('/api/generations/gen-123/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.body.totalEdits).toBe(2);  // 3 items - 1 original = 2 edits
    });
  });
});
```

## 3. Verification Commands

```bash
# Run history tests
npm test -- --testPathPattern="history"

# Expected: 10 tests passing
```

---

# Task 3.4: Frontend Edit UI

**Branch:** `claude/task-3.4-frontend-edit-ui`
**Depends on:** Task 3.2
**New Files:** 4 React components

## 1. EditPanel Component

### File: `client/src/components/EditPanel.tsx`

```tsx
import React, { useState } from 'react';
import './EditPanel.css';

interface EditPanelProps {
  generationId: string;
  onEditComplete: (newGenerationId: string, imageUrl: string) => void;
  onCancel: () => void;
}

const QUICK_PRESETS = [
  { label: 'Warmer lighting', prompt: 'Make the lighting warmer and more inviting' },
  { label: 'Cooler tones', prompt: 'Adjust to cooler, more professional tones' },
  { label: 'More contrast', prompt: 'Increase the contrast for more dramatic effect' },
  { label: 'Softer look', prompt: 'Make the image softer and more gentle' },
  { label: 'Crop tighter', prompt: 'Crop the image tighter on the main subject' },
  { label: 'Add depth', prompt: 'Add more depth and dimension to the scene' },
];

export function EditPanel({ generationId, onEditComplete, onCancel }: EditPanelProps) {
  const [editPrompt, setEditPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (prompt: string) => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/generations/${generationId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Edit failed');
      }

      const data = await response.json();
      onEditComplete(data.generationId, data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Edit failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(editPrompt);
  };

  return (
    <div className="edit-panel">
      <h3>Edit Image</h3>

      {error && <div className="edit-error">{error}</div>}

      <div className="quick-presets">
        <h4>Quick Edits</h4>
        <div className="preset-buttons">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleSubmit(preset.prompt)}
              disabled={isLoading}
              className="preset-button"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="custom-edit">
        <h4>Custom Edit</h4>
        <textarea
          value={editPrompt}
          onChange={(e) => setEditPrompt(e.target.value)}
          placeholder="Describe how you want to modify the image..."
          disabled={isLoading}
          rows={3}
          maxLength={1000}
        />
        <div className="char-count">{editPrompt.length}/1000</div>
        <div className="button-row">
          <button
            type="submit"
            disabled={isLoading || !editPrompt.trim()}
            className="submit-button"
          >
            {isLoading ? 'Editing...' : 'Apply Edit'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="cancel-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

## 2. EditHistory Component

### File: `client/src/components/EditHistory.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import './EditPanel.css';

interface HistoryItem {
  id: string;
  editPrompt: string | null;
  imageUrl: string;
  createdAt: string;
}

interface EditHistoryProps {
  generationId: string;
  currentId: string;
  onSelectVersion: (id: string) => void;
}

export function EditHistory({ generationId, currentId, onSelectVersion }: EditHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/generations/${generationId}/history`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load history');
        }

        const data = await response.json();
        setHistory(data.history);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [generationId]);

  if (isLoading) {
    return <div className="edit-history loading">Loading history...</div>;
  }

  if (error) {
    return <div className="edit-history error">{error}</div>;
  }

  if (history.length <= 1) {
    return null; // Don't show history for unedited images
  }

  return (
    <div className="edit-history">
      <h4>Edit History ({history.length} versions)</h4>
      <div className="history-timeline">
        {history.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`history-item ${item.id === currentId ? 'current' : ''}`}
            onClick={() => onSelectVersion(item.id)}
            title={item.editPrompt || 'Original'}
          >
            <img src={item.imageUrl} alt={`Version ${index + 1}`} loading="lazy" />
            <div className="history-info">
              <span className="version">v{index + 1}</span>
              {item.editPrompt ? (
                <span className="edit-prompt">{item.editPrompt}</span>
              ) : (
                <span className="original">Original</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

## 3. Styles

### File: `client/src/components/EditPanel.css`

```css
/* Edit Panel */
.edit-panel {
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  max-width: 400px;
}

.edit-panel h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: #212529;
}

.edit-panel h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.edit-error {
  background: #f8d7da;
  color: #721c24;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

/* Quick Presets */
.quick-presets {
  margin-bottom: 1.5rem;
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.preset-button {
  padding: 0.5rem 1rem;
  border: 1px solid #dee2e6;
  border-radius: 20px;
  background: white;
  color: #495057;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.preset-button:hover:not(:disabled) {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.preset-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Custom Edit */
.custom-edit {
  border-top: 1px solid #dee2e6;
  padding-top: 1.5rem;
}

.custom-edit textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
  font-size: 0.875rem;
  min-height: 80px;
}

.custom-edit textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

.custom-edit textarea:disabled {
  background: #e9ecef;
}

.char-count {
  text-align: right;
  font-size: 0.75rem;
  color: #6c757d;
  margin-top: 0.25rem;
}

.button-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.submit-button {
  flex: 1;
  padding: 0.75rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease-in-out;
}

.submit-button:hover:not(:disabled) {
  background: #0056b3;
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-button {
  padding: 0.75rem 1rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s ease-in-out;
}

.cancel-button:hover:not(:disabled) {
  background: #545b62;
}

.cancel-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Edit History */
.edit-history {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #dee2e6;
}

.edit-history.loading,
.edit-history.error {
  padding: 1rem;
  text-align: center;
  color: #6c757d;
}

.edit-history.error {
  color: #dc3545;
}

.history-timeline {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding: 0.5rem 0;
  -webkit-overflow-scrolling: touch;
}

.history-item {
  flex-shrink: 0;
  width: 100px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  background: white;
  transition: border-color 0.15s ease-in-out;
}

.history-item:hover {
  border-color: #adb5bd;
}

.history-item.current {
  border-color: #007bff;
}

.history-item img {
  width: 100%;
  height: 80px;
  object-fit: cover;
  display: block;
}

.history-info {
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  background: #f8f9fa;
}

.history-info .version {
  font-weight: 600;
  color: #495057;
}

.history-info .edit-prompt {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #6c757d;
  margin-top: 0.125rem;
}

.history-info .original {
  color: #6c757d;
  font-style: italic;
}

/* Responsive */
@media (max-width: 480px) {
  .edit-panel {
    padding: 1rem;
  }

  .preset-button {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }

  .history-item {
    width: 80px;
  }

  .history-item img {
    height: 60px;
  }
}
```

## 4. Component Exports

### File: `client/src/components/index.ts`

Create or update this file:

```typescript
export { Login } from './Login';
export { Register } from './Register';
export { EditPanel } from './EditPanel';
export { EditHistory } from './EditHistory';
```

## 5. Verification Commands

```bash
# Check TypeScript
npx tsc --noEmit

# Build frontend
npm run build

# Verify files exist
ls -la client/src/components/EditPanel.tsx
ls -la client/src/components/EditHistory.tsx
ls -la client/src/components/EditPanel.css
```

---

# Execution Checklist

## Task 3.1: Edit Schema Updates
- [ ] Add 3 columns to generations table in shared/schema.ts
- [ ] Add EditableGeneration and EditChainItem interfaces
- [ ] Update SavedGeneration interface with optional edit fields
- [ ] Implement saveEdit method
- [ ] Implement getEditChain method
- [ ] Update getGeneration to return edit fields
- [ ] Add 5 new tests
- [ ] Run migration: `npx drizzle-kit push:pg`
- [ ] All tests pass (145+)
- [ ] Commit to branch: claude/task-3.1-edit-schema

## Task 3.2: Edit Endpoint Enhancement
- [ ] Update POST /api/generations/:id/edit to use saveEdit
- [ ] Change response to return 201 with parentId
- [ ] Create edit.test.ts with 15 tests
- [ ] All tests pass (160+)
- [ ] Commit to branch: claude/task-3.2-edit-endpoint

## Task 3.3: History Endpoint
- [ ] Add GET /api/generations/:id/history route
- [ ] Create history.test.ts with 10 tests
- [ ] All tests pass (170+)
- [ ] Commit to branch: claude/task-3.3-history-endpoint

## Task 3.4: Frontend Edit UI
- [ ] Create EditPanel.tsx
- [ ] Create EditHistory.tsx
- [ ] Create EditPanel.css
- [ ] Update components/index.ts
- [ ] TypeScript compiles
- [ ] Frontend builds
- [ ] Commit to branch: claude/task-3.4-frontend-edit-ui

## Final Verification
- [ ] Total tests: 185+ (140 + 5 + 15 + 10 + frontend)
- [ ] TypeScript compiles with no errors
- [ ] All branches pushed
- [ ] CLAUDE.md updated with task status

---

# Production Considerations (Already Addressed)

1. **File cleanup on failure**: saveEdit deletes file if DB insert fails
2. **Authorization checks**: Both edit and history verify user ownership
3. **Input validation**: Edit prompt validated (1-1000 chars)
4. **Error handling**: All Gemini and storage errors handled with appropriate status codes
5. **Rate limiting**: Edit endpoint uses editLimiter
6. **Data integrity**: Parent chain never broken (append-only)
7. **Accessibility**: History items have alt text and titles
8. **Mobile responsive**: CSS includes responsive breakpoints
