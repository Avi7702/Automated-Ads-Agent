/**
 * Integration tests for ImageStorageService
 *
 * IMPORTANT: These tests use REAL PostgreSQL and REAL filesystem
 * NO MOCKS are allowed in this file
 *
 * Prerequisites:
 * 1. Run: docker compose -f docker-compose.test.yml up -d
 * 2. Run: npx drizzle-kit push
 * 3. Set DATABASE_URL=postgresql://postgres:postgres@localhost:5433/testdb
 */

import fs from 'fs';
import path from 'path';
import { imageStorageService, GenerationMetadata } from '../services/imageStorage';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { generations } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Test database connection
let pool: Pool;
let db: ReturnType<typeof drizzle>;

// Test data
const createTestMetadata = (overrides: Partial<GenerationMetadata> = {}): GenerationMetadata => ({
  userId: `test-user-${Date.now()}`,
  prompt: 'A beautiful sunset over the ocean',
  imageBase64: Buffer.from('fake-image-data-for-testing').toString('base64'),
  conversationHistory: [
    { role: 'user' as const, parts: [{ text: 'Generate a sunset image' }] }
  ],
  model: 'gemini-2.0-flash-exp',
  aspectRatio: '16:9',
  ...overrides,
});

describe('ImageStorageService Integration Tests', () => {
  beforeAll(async () => {
    // Verify DATABASE_URL is set - no in-memory fallback allowed
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL environment variable is required for integration tests.\n' +
        'Run: docker compose -f docker-compose.test.yml up -d\n' +
        'Then set: DATABASE_URL=postgresql://postgres:postgres@localhost:5433/testdb'
      );
    }

    // Connect to real PostgreSQL
    pool = new Pool({ connectionString: databaseUrl });
    db = drizzle(pool);

    // Initialize the service
    await imageStorageService.initialize();

    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  });

  afterAll(async () => {
    // Clean up database and close connections
    await imageStorageService.clearAll();
    await imageStorageService.close();
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up before each test
    await imageStorageService.clearAll();
  });

  describe('saveGeneration', () => {
    it('writes real file to uploads/ folder', async () => {
      const metadata = createTestMetadata();

      const result = await imageStorageService.saveGeneration(metadata);

      // Verify file actually exists on filesystem
      const filePath = path.join(UPLOAD_DIR, result.imagePath);
      expect(fs.existsSync(filePath)).toBe(true);

      // Verify file has content
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('stores correct metadata in database', async () => {
      const metadata = createTestMetadata({
        prompt: 'Test prompt for metadata verification',
        model: 'test-model',
        aspectRatio: '4:3',
      });

      const result = await imageStorageService.saveGeneration(metadata);

      // Query database directly to verify data was stored
      const [dbRecord] = await db.select()
        .from(generations)
        .where(eq(generations.id, result.id));

      expect(dbRecord).toBeDefined();
      expect(dbRecord.prompt).toBe('Test prompt for metadata verification');
      expect(dbRecord.userId).toBe(metadata.userId);
      expect(dbRecord.model).toBe('test-model');
      expect(dbRecord.aspectRatio).toBe('4:3');
      expect(dbRecord.imagePath).toBe(result.imagePath);
    });

    it('handles concurrent saves without collision', async () => {
      // Create multiple saves concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        imageStorageService.saveGeneration(
          createTestMetadata({ prompt: `Concurrent test ${i}` })
        )
      );

      const results = await Promise.all(promises);

      // Verify all have unique IDs
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);

      // Verify all files exist
      for (const result of results) {
        const filePath = path.join(UPLOAD_DIR, result.imagePath);
        expect(fs.existsSync(filePath)).toBe(true);
      }

      // Verify all database records exist
      for (const result of results) {
        const [dbRecord] = await db.select()
          .from(generations)
          .where(eq(generations.id, result.id));
        expect(dbRecord).toBeDefined();
      }
    });
  });

  describe('getGeneration', () => {
    it('retrieves generation from real PostgreSQL database', async () => {
      const metadata = createTestMetadata({
        prompt: 'Retrieval test prompt',
      });

      // Save first
      const saved = await imageStorageService.saveGeneration(metadata);

      // Then retrieve
      const retrieved = await imageStorageService.getGeneration(saved.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(saved.id);
      expect(retrieved!.prompt).toBe('Retrieval test prompt');
      expect(retrieved!.userId).toBe(metadata.userId);
      expect(retrieved!.model).toBe(metadata.model);
      expect(retrieved!.aspectRatio).toBe(metadata.aspectRatio);
    });

    it('returns null for non-existent generation ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const result = await imageStorageService.getGeneration(nonExistentId);

      expect(result).toBeNull();
    });
  });

  describe('file verification', () => {
    it('verifies file exists on filesystem after save using fs.existsSync', async () => {
      const metadata = createTestMetadata();

      const result = await imageStorageService.saveGeneration(metadata);

      // Use the service's fileExists method which uses fs.existsSync
      const exists = imageStorageService.fileExists(result.imagePath);
      expect(exists).toBe(true);

      // Also verify with direct fs.existsSync
      const filePath = path.join(UPLOAD_DIR, result.imagePath);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});
