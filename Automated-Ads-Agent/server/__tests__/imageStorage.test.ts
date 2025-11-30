import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Track mock calls manually since jest.mock hoisting can be tricky
let mkdirCalls: any[] = [];
let writeFileCalls: any[] = [];
let unlinkCalls: any[] = [];

// Mock fs/promises before imports
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockImplementation((...args) => {
    mkdirCalls.push(args);
    return Promise.resolve(undefined);
  }),
  writeFile: jest.fn().mockImplementation((...args) => {
    writeFileCalls.push(args);
    return Promise.resolve(undefined);
  }),
  unlink: jest.fn().mockImplementation((...args) => {
    unlinkCalls.push(args);
    return Promise.resolve(undefined);
  }),
}));

describe('ImageStorageService', () => {
  let imageStorageService: any;

  beforeEach(() => {
    mkdirCalls = [];
    writeFileCalls = [];
    unlinkCalls = [];
    jest.resetModules();
    
    const { imageStorageService: service } = require('../services/imageStorage');
    imageStorageService = service;
    imageStorageService.clearAll();
  });

  describe('saveImage', () => {
    it('saves image to disk', async () => {
      const base64Data = 'dGVzdGltYWdlZGF0YQ==';
      
      await imageStorageService.saveImage(base64Data);
      
      expect(writeFileCalls.length).toBeGreaterThan(0);
      const [filepath, buffer] = writeFileCalls[0];
      expect(filepath).toContain('uploads');
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('generates unique filename', async () => {
      const base64Data = 'dGVzdA==';
      
      const filename = await imageStorageService.saveImage(base64Data);
      
      expect(filename).toMatch(/^generation_\d+_[a-f0-9]+\.png$/);
    });

    it('creates upload directory if missing', async () => {
      const base64Data = 'dGVzdA==';
      
      await imageStorageService.saveImage(base64Data);
      
      expect(mkdirCalls.length).toBeGreaterThan(0);
      expect(mkdirCalls[0][0]).toBe(UPLOAD_DIR);
      expect(mkdirCalls[0][1]).toEqual({ recursive: true });
    });

    it('returns correct file path', async () => {
      const base64Data = 'dGVzdA==';
      
      const filename = await imageStorageService.saveImage(base64Data);
      
      expect(filename).toMatch(/\.png$/);
      expect(typeof filename).toBe('string');
    });
  });

  describe('getImagePath', () => {
    it('returns full path for filename', () => {
      const filename = 'test_image.png';
      
      const fullPath = imageStorageService.getImagePath(filename);
      
      expect(fullPath).toBe(path.join(UPLOAD_DIR, filename));
    });
  });

  describe('getImageUrl', () => {
    it('returns URL-safe path', () => {
      const filename = 'test_image.png';
      
      const url = imageStorageService.getImageUrl(filename);
      
      expect(url).toBe('/uploads/test_image.png');
    });
  });

  describe('deleteImage', () => {
    it('removes file from disk', async () => {
      const filename = 'test_image.png';
      
      await imageStorageService.deleteImage(filename);
      
      expect(unlinkCalls.length).toBeGreaterThan(0);
      expect(unlinkCalls[0][0]).toBe(path.join(UPLOAD_DIR, filename));
    });

    it('handles missing file gracefully', async () => {
      // Reset the mock to throw an error
      const fs = require('fs/promises');
      fs.unlink.mockRejectedValueOnce(new Error('ENOENT'));
      
      const filename = 'nonexistent.png';
      
      await expect(imageStorageService.deleteImage(filename)).resolves.not.toThrow();
    });
  });

  describe('saveGeneration', () => {
    const mockMetadata = {
      userId: 'user-123',
      prompt: 'Generate a sunset',
      imageBase64: 'dGVzdA==',
      conversationHistory: [{ role: 'user' as const, parts: [{ text: 'Generate a sunset' }] }],
      model: 'gemini-2.0-flash-exp',
      aspectRatio: '1:1'
    };

    it('stores metadata in database', async () => {
      const result = await imageStorageService.saveGeneration(mockMetadata);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('imagePath');
      expect(result).toHaveProperty('prompt', 'Generate a sunset');
    });

    it('stores conversation history', async () => {
      const result = await imageStorageService.saveGeneration(mockMetadata);

      expect(result.conversationHistory).toEqual(mockMetadata.conversationHistory);
    });
  });

  describe('getGeneration', () => {
    it('retrieves generation with history', async () => {
      const mockMetadata = {
        userId: 'user-123',
        prompt: 'Generate a sunset',
        imageBase64: 'dGVzdA==',
        conversationHistory: [{ role: 'user' as const, parts: [{ text: 'test' }] }],
        model: 'gemini-2.0-flash-exp',
        aspectRatio: '1:1'
      };
      
      const saved = await imageStorageService.saveGeneration(mockMetadata);
      const result = await imageStorageService.getGeneration(saved.id);

      expect(result).toHaveProperty('id', saved.id);
      expect(result).toHaveProperty('conversationHistory');
      expect(result).toHaveProperty('imageUrl');
    });

    it('returns null for non-existent id', async () => {
      const result = await imageStorageService.getGeneration('nonexistent-id');

      expect(result).toBeNull();
    });
  });
});
