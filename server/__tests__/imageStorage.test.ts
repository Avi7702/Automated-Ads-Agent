/**
 * Image Storage Service Tests
 * Tests file storage, database persistence, and error handling
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

// Use vi.hoisted to define mocks that will be available to vi.mock factories
const {
  mockMkdir, mockWriteFile, mockUnlink, mockReaddir, mockExistsSync,
  mockRandomBytes, mockInsert, mockSelect, mockDelete, mockValues,
  mockReturning, mockFrom, mockWhere, mockDb, mockPoolEnd, mockPool
} = vi.hoisted(() => {
  const mockMkdir = vi.fn().mockResolvedValue(undefined);
  const mockWriteFile = vi.fn().mockResolvedValue(undefined);
  const mockUnlink = vi.fn().mockResolvedValue(undefined);
  const mockReaddir = vi.fn().mockResolvedValue([]);
  const mockExistsSync = vi.fn().mockReturnValue(true);

  const mockRandomBytes = vi.fn().mockReturnValue({
    toString: () => 'abc123def456'
  });

  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockDelete = vi.fn();
  const mockValues = vi.fn();
  const mockReturning = vi.fn();
  const mockFrom = vi.fn();
  const mockWhere = vi.fn();

  const mockDb = {
    insert: mockInsert,
    select: mockSelect,
    delete: mockDelete,
  };

  const mockPoolEnd = vi.fn().mockResolvedValue(undefined);
  const mockPool = {
    end: mockPoolEnd,
  };

  return {
    mockMkdir, mockWriteFile, mockUnlink, mockReaddir, mockExistsSync,
    mockRandomBytes, mockInsert, mockSelect, mockDelete, mockValues,
    mockReturning, mockFrom, mockWhere, mockDb, mockPoolEnd, mockPool
  };
});

// Mock file system
vi.mock('fs/promises', () => ({
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
  unlink: mockUnlink,
  readdir: mockReaddir,
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
}));

// Mock crypto
vi.mock('crypto', () => ({
  randomBytes: mockRandomBytes,
}));

// Mock database
vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock('pg', () => ({
  Pool: vi.fn(() => mockPool),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}));

// Import after mocks
import type { ConversationMessage } from '../services/geminiService';

describe('ImageStorageService', () => {
  let imageStorageService: typeof import('../services/imageStorage').imageStorageService;

  // Valid PNG base64 - must be >100 chars for validation
  const validBase64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' + 'A'.repeat(50);

  const mockGenerationData = {
    userId: 'user-123',
    prompt: 'A test image',
    imageBase64: validBase64Image,
    conversationHistory: [
      { role: 'user' as const, parts: [{ text: 'A test image' }] },
      { role: 'model' as const, parts: [{ inlineData: { mimeType: 'image/png', data: 'base64data' } }] }
    ] as ConversationMessage[],
    model: 'gemini-3-pro-preview',
    aspectRatio: '1:1',
  };

  const mockDbGeneration = {
    id: 'gen-uuid-123',
    userId: 'user-123',
    prompt: 'A test image',
    imagePath: 'generation_123_abc123def456.png',
    conversationHistory: mockGenerationData.conversationHistory,
    model: 'gemini-3-pro-preview',
    aspectRatio: '1:1',
    status: 'completed',
    createdAt: new Date('2024-01-01'),
    // Edit tracking fields (Phase 3)
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
  };

  beforeAll(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mock chains
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([mockDbGeneration]);

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([mockDbGeneration]);

    mockDelete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mockDelete.mockResolvedValue(undefined);

    // Reset modules and re-import to get fresh instance
    vi.resetModules();
    const module = await import('../services/imageStorage');
    imageStorageService = module.imageStorageService;
  });

  describe('Initialization', () => {
    it('initializes with DATABASE_URL', async () => {
      await imageStorageService.initialize();
      // Should not throw
    });

    it('throws if DATABASE_URL not set', async () => {
      const originalUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      vi.resetModules();
      const module = await import('../services/imageStorage');
      const freshService = module.imageStorageService;

      await expect(freshService.initialize())
        .rejects.toThrow('DATABASE_URL environment variable is required');

      process.env.DATABASE_URL = originalUrl;
    });

    it('only initializes once', async () => {
      await imageStorageService.initialize();
      await imageStorageService.initialize();

      // Pool constructor should only be called once per instance
      const pgModule = await import('pg');
      expect(pgModule.Pool).toHaveBeenCalledTimes(1);
    });

    it('can close and reinitialize', async () => {
      await imageStorageService.initialize();
      await imageStorageService.close();

      expect(mockPoolEnd).toHaveBeenCalled();
    });
  });

  describe('File Operations', () => {
    beforeEach(async () => {
      await imageStorageService.initialize();
    });

    afterEach(async () => {
      await imageStorageService.close();
    });

    it('generates unique filenames', () => {
      const filename1 = imageStorageService.generateFilename();
      expect(filename1).toMatch(/^generation_\d+_abc123def456\.png$/);
    });

    it('generates filenames with custom extension', () => {
      const filename = imageStorageService.generateFilename('jpg');
      expect(filename).toMatch(/\.jpg$/);
    });

    it('creates upload directory if not exists', async () => {
      await imageStorageService.ensureUploadDir();
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('uploads'),
        { recursive: true }
      );
    });

    it('saves base64 image to file', async () => {
      const filename = await imageStorageService.saveImage(mockGenerationData.imageBase64);

      expect(mockMkdir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(filename),
        expect.any(Buffer)
      );
    });

    it('returns correct image path', () => {
      const path = imageStorageService.getImagePath('test.png');
      expect(path).toContain('uploads');
      expect(path).toContain('test.png');
    });

    it('returns correct image URL', () => {
      const url = imageStorageService.getImageUrl('test.png');
      expect(url).toBe('/uploads/test.png');
    });

    it('deletes image file', async () => {
      await imageStorageService.deleteImage('test.png');
      expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining('test.png'));
    });

    it('handles delete of non-existent file gracefully', async () => {
      mockUnlink.mockRejectedValueOnce(new Error('ENOENT'));

      // Should not throw
      await imageStorageService.deleteImage('nonexistent.png');
    });

    it('checks if file exists', () => {
      mockExistsSync.mockReturnValue(true);
      expect(imageStorageService.fileExists('test.png')).toBe(true);

      mockExistsSync.mockReturnValue(false);
      expect(imageStorageService.fileExists('nonexistent.png')).toBe(false);
    });
  });

  describe('Database Operations', () => {
    beforeEach(async () => {
      await imageStorageService.initialize();
    });

    afterEach(async () => {
      await imageStorageService.close();
    });

    it('saves generation to database', async () => {
      const result = await imageStorageService.saveGeneration(mockGenerationData);

      expect(result).toHaveProperty('id', 'gen-uuid-123');
      expect(result).toHaveProperty('userId', 'user-123');
      expect(result).toHaveProperty('prompt', 'A test image');
      expect(result).toHaveProperty('imageUrl');
      expect(result.imageUrl).toMatch(/^\/uploads\//);
    });

    it('retrieves generation by ID', async () => {
      const result = await imageStorageService.getGeneration('gen-uuid-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('gen-uuid-123');
      expect(result?.prompt).toBe('A test image');
    });

    it('returns null for non-existent generation', async () => {
      mockWhere.mockResolvedValueOnce([]);

      const result = await imageStorageService.getGeneration('nonexistent-id');
      expect(result).toBeNull();
    });

    it('clears all generations', async () => {
      mockReaddir.mockResolvedValueOnce(['generation_1.png', 'generation_2.png', 'other.txt']);

      await imageStorageService.clearAll();

      expect(mockDelete).toHaveBeenCalled();
      // Should only delete files starting with 'generation_'
      expect(mockUnlink).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('throws if saveGeneration called before initialize', async () => {
      vi.resetModules();
      const module = await import('../services/imageStorage');
      const freshService = module.imageStorageService;

      await expect(freshService.saveGeneration(mockGenerationData))
        .rejects.toThrow('not initialized');
    });

    it('throws if getGeneration called before initialize', async () => {
      vi.resetModules();
      const module = await import('../services/imageStorage');
      const freshService = module.imageStorageService;

      await expect(freshService.getGeneration('any-id'))
        .rejects.toThrow('not initialized');
    });

    it('throws if clearAll called before initialize', async () => {
      vi.resetModules();
      const module = await import('../services/imageStorage');
      const freshService = module.imageStorageService;

      await expect(freshService.clearAll())
        .rejects.toThrow('not initialized');
    });

    it('handles file write errors', async () => {
      await imageStorageService.initialize();
      mockWriteFile.mockRejectedValueOnce(new Error('ENOSPC: no space left'));

      await expect(imageStorageService.saveImage(mockGenerationData.imageBase64))
        .rejects.toThrow('ENOSPC');

      await imageStorageService.close();
    });

    it('handles database insert errors and cleans up file', async () => {
      await imageStorageService.initialize();
      mockReturning.mockRejectedValueOnce(new Error('Database connection lost'));

      await expect(imageStorageService.saveGeneration(mockGenerationData))
        .rejects.toThrow('Database connection lost');

      // Should have attempted to delete the orphaned file
      expect(mockUnlink).toHaveBeenCalled();

      await imageStorageService.close();
    });

    it('handles clearAll directory read errors gracefully', async () => {
      await imageStorageService.initialize();
      mockReaddir.mockRejectedValueOnce(new Error('ENOENT'));

      // Should not throw
      await imageStorageService.clearAll();

      await imageStorageService.close();
    });
  });

  describe('Input Validation', () => {
    beforeEach(async () => {
      await imageStorageService.initialize();
    });

    afterEach(async () => {
      await imageStorageService.close();
    });

    it('rejects image data that is too short', async () => {
      await expect(imageStorageService.saveImage('short'))
        .rejects.toThrow('too short');
    });

    it('rejects empty image data', async () => {
      await expect(imageStorageService.saveImage(''))
        .rejects.toThrow('too short');
    });

    it('rejects invalid base64 characters', async () => {
      const invalidBase64 = 'a'.repeat(150) + '!@#$%';

      await expect(imageStorageService.saveImage(invalidBase64))
        .rejects.toThrow('not valid base64');
    });

    it('accepts valid base64 image data', async () => {
      const validBase64 = mockGenerationData.imageBase64;

      const filename = await imageStorageService.saveImage(validBase64);

      expect(filename).toMatch(/^generation_\d+_[a-f0-9]+\.png$/);
    });
  });

  describe('Data Integrity', () => {
    beforeEach(async () => {
      await imageStorageService.initialize();
    });

    afterEach(async () => {
      await imageStorageService.close();
    });

    it('preserves conversation history structure', async () => {
      const result = await imageStorageService.saveGeneration(mockGenerationData);

      expect(result.conversationHistory).toHaveLength(2);
      expect(result.conversationHistory[0].role).toBe('user');
      expect(result.conversationHistory[1].role).toBe('model');
    });

    it('handles empty conversation history', async () => {
      mockDbGeneration.conversationHistory = null as unknown as ConversationMessage[];
      mockReturning.mockResolvedValueOnce([mockDbGeneration]);
      mockWhere.mockResolvedValueOnce([mockDbGeneration]);

      const result = await imageStorageService.getGeneration('gen-uuid-123');

      expect(result?.conversationHistory).toEqual([]);
    });

    it('handles missing optional fields', async () => {
      const partialDbGeneration = {
        ...mockDbGeneration,
        userId: null,
        imagePath: null,
        model: null,
        aspectRatio: null,
      };
      mockWhere.mockResolvedValueOnce([partialDbGeneration]);

      const result = await imageStorageService.getGeneration('gen-uuid-123');

      expect(result?.userId).toBe('');
      expect(result?.imagePath).toBe('');
      expect(result?.model).toBe('');
      expect(result?.aspectRatio).toBe('1:1');
    });
  });

  describe('Edit Operations (Phase 3)', () => {
    beforeEach(async () => {
      await imageStorageService.initialize();
    });

    afterEach(async () => {
      await imageStorageService.close();
    });

    it('saveEdit creates new generation linked to parent', async () => {
      const editedDbGeneration = {
        ...mockDbGeneration,
        id: 'edited-gen-123',
        parentGenerationId: 'gen-uuid-123',
        editPrompt: 'Make it warmer',
        editCount: 1,
      };
      // First mockWhere call is for getGeneration(parentId) to find parent
      mockWhere.mockResolvedValueOnce([mockDbGeneration]);
      // mockReturning is for the insert().values().returning() call
      mockReturning.mockReset();
      mockReturning.mockResolvedValueOnce([editedDbGeneration]);

      const result = await imageStorageService.saveEdit(
        'gen-uuid-123',
        'Make it warmer',
        mockGenerationData
      );

      expect(result.id).toBe('edited-gen-123');
      expect(result.parentGenerationId).toBe('gen-uuid-123');
      expect(result.editPrompt).toBe('Make it warmer');
      expect(result.editCount).toBe(1);
    });

    it('saveEdit throws if parent not found', async () => {
      mockWhere.mockResolvedValueOnce([]);

      await expect(imageStorageService.saveEdit(
        'nonexistent-parent',
        'Make it warmer',
        mockGenerationData
      )).rejects.toThrow('Parent generation not found');
    });

    it('saveEdit cleans up file on database error', async () => {
      // First call returns parent for getGeneration
      mockWhere.mockResolvedValueOnce([mockDbGeneration]);
      // mockReturning rejects for the insert call
      mockReturning.mockReset();
      mockReturning.mockRejectedValueOnce(new Error('Database error'));

      await expect(imageStorageService.saveEdit(
        'gen-uuid-123',
        'Make it warmer',
        mockGenerationData
      )).rejects.toThrow('Database error');

      // Should have attempted to delete the orphaned file
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('getEditChain returns single item for unedited generation', async () => {
      const chain = await imageStorageService.getEditChain('gen-uuid-123');

      expect(chain).toHaveLength(1);
      expect(chain[0].id).toBe('gen-uuid-123');
      expect(chain[0].editPrompt).toBeNull();
    });

    it('getEditChain returns full chain for edited generation', async () => {
      const editedGen = {
        ...mockDbGeneration,
        id: 'edited-gen-123',
        parentGenerationId: 'gen-uuid-123',
        editPrompt: 'Make it warmer',
        editCount: 1,
        imagePath: 'generation_edited.png',
      };

      // First call: get edited generation
      mockWhere.mockResolvedValueOnce([editedGen]);
      // Second call: get parent (original)
      mockWhere.mockResolvedValueOnce([mockDbGeneration]);

      const chain = await imageStorageService.getEditChain('edited-gen-123');

      expect(chain).toHaveLength(2);
      // Chain should be ordered from original to current
      expect(chain[0].id).toBe('gen-uuid-123');
      expect(chain[0].editPrompt).toBeNull();
      expect(chain[1].id).toBe('edited-gen-123');
      expect(chain[1].editPrompt).toBe('Make it warmer');
    });

    it('getGeneration returns edit tracking fields', async () => {
      const editedDbGeneration = {
        ...mockDbGeneration,
        id: 'edited-gen-123',
        parentGenerationId: 'gen-uuid-123',
        editPrompt: 'Make it warmer',
        editCount: 1,
      };
      mockWhere.mockResolvedValueOnce([editedDbGeneration]);

      const result = await imageStorageService.getGeneration('edited-gen-123');

      expect(result?.parentGenerationId).toBe('gen-uuid-123');
      expect(result?.editPrompt).toBe('Make it warmer');
      expect(result?.editCount).toBe(1);
    });
  });
});
