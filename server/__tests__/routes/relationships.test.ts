import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestAppForRouter, loginAs, type ContextOverrides } from './_testHelpers';
import { relationshipsRAGRouter } from '../../routes/relationships.router';

// Mock the dynamic import of relationshipDiscoveryRAG
vi.mock('../../services/relationshipDiscoveryRAG', () => ({
  analyzeRelationshipType: vi.fn(),
  batchSuggestRelationships: vi.fn(),
  autoCreateRelationships: vi.fn(),
}));

describe('Relationships RAG Router — /api/relationships', () => {
  let app: Express;
  let cookie: string;
  let overrides: ContextOverrides;

  const mockProductA = {
    id: 'prod-1',
    name: 'A393 Mesh',
    description: 'Steel mesh',
    category: 'mesh',
    tags: [],
    benefits: [],
    features: {},
    specifications: {},
  };

  const mockProductB = {
    id: 'prod-2',
    name: 'B503 Rebar',
    description: 'Steel rebar',
    category: 'rebar',
    tags: [],
    benefits: [],
    features: {},
    specifications: {},
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    overrides = {
      storage: {
        getProductById: vi.fn().mockImplementation((id: string) => {
          if (id === 'prod-1') return Promise.resolve(mockProductA);
          if (id === 'prod-2') return Promise.resolve(mockProductB);
          return Promise.resolve(undefined);
        }),
      },
    };

    const result = createTestAppForRouter(relationshipsRAGRouter, '/api/relationships', overrides);
    app = result.app;
    cookie = await loginAs(app);
  });

  // ============================
  // Bug 1 Regression Test:
  // POST /analyze should pass Product objects (not string IDs) to analyzeRelationshipType
  // ============================
  describe('POST /api/relationships/analyze — Bug 1 regression', () => {
    it('fetches products by ID and passes Product objects to service', async () => {
      const { analyzeRelationshipType } = await import('../../services/relationshipDiscoveryRAG');
      const mockAnalyze = vi.mocked(analyzeRelationshipType);
      mockAnalyze.mockResolvedValue({
        primaryRelationship: 'pairs_with',
        confidence: 85,
        reasoning: 'These products work together',
        alternativeRelationships: [],
        metadata: {
          analyzedAt: new Date(),
          modelVersion: 'gemini-3-flash',
          kbContextUsed: false,
        },
      });

      const res = await request(app)
        .post('/api/relationships/analyze')
        .set('Cookie', cookie)
        .send({ sourceProductId: 'prod-1', targetProductId: 'prod-2' });

      expect(res.status).toBe(200);
      expect(res.body.primaryRelationship).toBe('pairs_with');

      // CRITICAL: The service must receive Product objects, NOT string IDs
      expect(mockAnalyze).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'prod-1', name: 'A393 Mesh' }),
        expect.objectContaining({ id: 'prod-2', name: 'B503 Rebar' }),
      );
    });

    it('returns 404 when source product not found', async () => {
      const res = await request(app)
        .post('/api/relationships/analyze')
        .set('Cookie', cookie)
        .send({ sourceProductId: 'nonexistent', targetProductId: 'prod-2' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('returns 404 when target product not found', async () => {
      const res = await request(app)
        .post('/api/relationships/analyze')
        .set('Cookie', cookie)
        .send({ sourceProductId: 'prod-1', targetProductId: 'nonexistent' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app).post('/api/relationships/analyze').set('Cookie', cookie).send({});

      expect(res.status).toBe(400);
    });
  });

  // ============================
  // Bug 2 Regression Test:
  // POST /batch-suggest should return serializable JSON, not an empty {} from Map
  // ============================
  describe('POST /api/relationships/batch-suggest — Bug 2 regression', () => {
    it('returns a serializable object (not empty {}) from Map result', async () => {
      const { batchSuggestRelationships } = await import('../../services/relationshipDiscoveryRAG');
      const mockBatch = vi.mocked(batchSuggestRelationships);

      // The service returns a Map
      const resultMap = new Map<string, unknown[]>();
      resultMap.set('prod-1', [
        {
          targetProductId: 'prod-2',
          targetProductName: 'B503 Rebar',
          relationshipType: 'pairs_with',
          score: 85,
          reasoning: 'Works well together',
          alreadyExists: false,
          source: 'ai_inference',
        },
      ]);
      resultMap.set('prod-2', []);
      mockBatch.mockResolvedValue(resultMap as never);

      const res = await request(app)
        .post('/api/relationships/batch-suggest')
        .set('Cookie', cookie)
        .send({ productIds: ['prod-1', 'prod-2'] });

      expect(res.status).toBe(200);

      // CRITICAL: Response must NOT be an empty object {}
      // It should contain actual data for each product ID
      expect(res.body).not.toEqual({});
      expect(res.body['prod-1']).toBeDefined();
      expect(res.body['prod-1']).toHaveLength(1);
      expect(res.body['prod-1'][0].targetProductId).toBe('prod-2');
      expect(res.body['prod-2']).toBeDefined();
      expect(res.body['prod-2']).toHaveLength(0);
    });

    it('returns 400 when productIds is missing', async () => {
      const res = await request(app).post('/api/relationships/batch-suggest').set('Cookie', cookie).send({});

      expect(res.status).toBe(400);
    });

    it('returns 400 when productIds is empty', async () => {
      const res = await request(app)
        .post('/api/relationships/batch-suggest')
        .set('Cookie', cookie)
        .send({ productIds: [] });

      expect(res.status).toBe(400);
    });
  });
});
