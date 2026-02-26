/**
 * RAG API Endpoints Tests
 *
 * Tests for all 15 RAG API endpoints:
 * - Installation Scenario RAG (4 endpoints)
 * - Relationship Discovery RAG (5 endpoints)
 * - Brand Image Recommendation RAG (3 endpoints)
 * - Template Pattern RAG (3 endpoints)
 *
 * Tests cover:
 * - Authentication (401 without session)
 * - Input validation (400 for missing required fields)
 * - Success cases (200/201)
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

// In-memory user store for auth flow
const mockUsers = new Map<string, Record<string, unknown>>();
let userIdCounter = 0;

function nextUserId(): string {
  userIdCounter++;
  return `mock-user-${userIdCounter}`;
}

// Mock db module to prevent DATABASE_URL check (module-level throw)
vi.mock('../db', () => ({
  db: {},
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
    end: vi.fn(),
    on: vi.fn(),
    totalCount: 0,
    idleCount: 0,
  },
}));

// Mock storage with in-memory user management for auth
vi.mock('../storage', () => ({
  storage: {
    getUserByEmail: vi.fn().mockImplementation((email: string) => {
      for (const user of mockUsers.values()) {
        if (user['email'] === email) return Promise.resolve(user);
      }
      return Promise.resolve(undefined);
    }),
    createUser: vi.fn().mockImplementation((email: string, password: string) => {
      const id = nextUserId();
      const user = {
        id,
        email,
        password,
        passwordHash: password,
        role: 'user',
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
        brandVoice: null,
        emailVerified: false,
        verifyToken: null,
        verifyTokenExpires: null,
        resetToken: null,
        resetTokenExpires: null,
      };
      mockUsers.set(id, user);
      return Promise.resolve(user);
    }),
    getUserById: vi.fn().mockImplementation((id: string) => Promise.resolve(mockUsers.get(id))),
    updatePasswordHash: vi.fn().mockResolvedValue(undefined),
    getProducts: vi.fn().mockResolvedValue([]),
    getProductById: vi.fn().mockResolvedValue(undefined),
    createProduct: vi.fn().mockResolvedValue({ id: 'mock-product' }),
    updateProduct: vi.fn().mockResolvedValue({ id: 'mock-product' }),
    deleteProduct: vi.fn().mockResolvedValue(undefined),
    searchProducts: vi.fn().mockResolvedValue([]),
    getGenerations: vi.fn().mockResolvedValue([]),
    getGenerationById: vi.fn().mockResolvedValue(undefined),
    saveGeneration: vi.fn().mockResolvedValue({ id: 'mock-gen' }),
    deleteGeneration: vi.fn().mockResolvedValue(undefined),
    saveAdCopy: vi.fn().mockResolvedValue({ id: 'mock-copy' }),
    getAdCopyByGenerationId: vi.fn().mockResolvedValue([]),
    getAdCopyById: vi.fn().mockResolvedValue(undefined),
    deleteAdCopy: vi.fn().mockResolvedValue(undefined),
    updateUserBrandVoice: vi.fn().mockResolvedValue(undefined),
    getInstallationScenarios: vi.fn().mockResolvedValue([]),
    getInstallationScenarioById: vi.fn().mockResolvedValue(undefined),
    createInstallationScenario: vi.fn().mockResolvedValue({ id: 'mock-scenario' }),
    updateInstallationScenario: vi.fn().mockResolvedValue({ id: 'mock-scenario' }),
    deleteInstallationScenario: vi.fn().mockResolvedValue(undefined),
    getInstallationScenariosByProduct: vi.fn().mockResolvedValue([]),
    getProductRelationships: vi.fn().mockResolvedValue([]),
    getProductRelationshipById: vi.fn().mockResolvedValue(undefined),
    createProductRelationship: vi.fn().mockResolvedValue({ id: 'mock-rel' }),
    deleteProductRelationship: vi.fn().mockResolvedValue(undefined),
    getRelatedProducts: vi.fn().mockResolvedValue([]),
    getBrandImages: vi.fn().mockResolvedValue([]),
    getBrandImageById: vi.fn().mockResolvedValue(undefined),
    createBrandImage: vi.fn().mockResolvedValue({ id: 'mock-image' }),
    updateBrandImage: vi.fn().mockResolvedValue({ id: 'mock-image' }),
    deleteBrandImage: vi.fn().mockResolvedValue(undefined),
    searchBrandImages: vi.fn().mockResolvedValue([]),
    getPromptTemplates: vi.fn().mockResolvedValue([]),
    getPromptTemplateById: vi.fn().mockResolvedValue(undefined),
    createPromptTemplate: vi.fn().mockResolvedValue({ id: 'mock-template' }),
    updatePromptTemplate: vi.fn().mockResolvedValue({ id: 'mock-template' }),
    deletePromptTemplate: vi.fn().mockResolvedValue(undefined),
    getPatterns: vi.fn().mockResolvedValue({ patterns: [], total: 0 }),
    getPatternById: vi.fn().mockResolvedValue(undefined),
    createPattern: vi.fn().mockResolvedValue({ id: 'mock-pattern' }),
    updatePattern: vi.fn().mockResolvedValue({ id: 'mock-pattern' }),
    deletePattern: vi.fn().mockResolvedValue(undefined),
    getPatternStats: vi.fn().mockResolvedValue({ totalPatterns: 0 }),
    getSocialAccounts: vi.fn().mockResolvedValue([]),
    getApiKeys: vi.fn().mockResolvedValue([]),
    getApiKeyByProvider: vi.fn().mockResolvedValue(undefined),
    saveApiKey: vi.fn().mockResolvedValue({ id: 'mock-key' }),
    deleteApiKey: vi.fn().mockResolvedValue(undefined),
    getContentPlanEntries: vi.fn().mockResolvedValue([]),
    getN8nConfig: vi.fn().mockResolvedValue(undefined),
    saveN8nConfig: vi.fn().mockResolvedValue({ id: 'mock-n8n' }),
    getApprovalQueueItems: vi.fn().mockResolvedValue([]),
    getQuotaUsage: vi.fn().mockResolvedValue({ used: 0, limit: 100 }),
    getExperiments: vi.fn().mockResolvedValue([]),
    getStyleReferences: vi.fn().mockResolvedValue([]),
    getKnowledgeEntries: vi.fn().mockResolvedValue([]),
    getTrainingExamples: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../lib/gemini', () => ({
  genAI: { models: { generateContent: vi.fn() } },
  createGeminiClient: vi.fn().mockReturnValue({ models: { generateContent: vi.fn() } }),
  getEnvApiKey: vi.fn().mockReturnValue(undefined),
}));

vi.mock('../lib/queue', () => ({
  generationQueue: { add: vi.fn(), close: vi.fn() },
  generationQueueEvents: { on: vi.fn(), close: vi.fn() },
  deadLetterQueue: { add: vi.fn(), close: vi.fn() },
  closeQueues: vi.fn(),
}));

import request from 'supertest';
import type { Express } from 'express';
import { createTestApp } from './helpers/testApp';

let app: Express;

function getSessionCookie(res: request.Response): string | undefined {
  const setCookie = res.headers['set-cookie'];
  const cookies = Array.isArray(setCookie) ? setCookie : typeof setCookie === 'string' ? [setCookie] : [];
  return cookies.find((c) => c.startsWith('connect.sid=')) || cookies.find((c) => c.startsWith('sessionId='));
}

const testPassword = 'TestPassword123!';
let testCounter = 0;

async function createAuthSession(): Promise<string> {
  testCounter++;
  const email = `rag-test-${Date.now()}-${testCounter}@test.com`;

  await request(app).post('/api/auth/register').send({ email, password: testPassword });

  const loginRes = await request(app).post('/api/auth/login').send({ email, password: testPassword });

  return getSessionCookie(loginRes) || '';
}

beforeAll(async () => {
  app = await createTestApp();
});

describe('Installation Scenario RAG Endpoints', () => {
  describe('POST /api/installation/suggest-steps', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).post('/api/installation/suggest-steps').send({ productId: 'test-product' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when productId is missing', async () => {
      const cookie = await createAuthSession();
      const res = await request(app).post('/api/installation/suggest-steps').set('Cookie', cookie).send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('productId');
    });
  });

  describe('GET /api/installation/room-context/:roomType', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/installation/room-context/living_room');
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid roomType', async () => {
      const cookie = await createAuthSession();
      const res = await request(app).get('/api/installation/room-context/invalid_room').set('Cookie', cookie);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('roomType');
    });

    it('returns 200 for valid roomType', async () => {
      const cookie = await createAuthSession();
      const res = await request(app).get('/api/installation/room-context/living_room').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('roomType');
      expect(res.body).toHaveProperty('considerations');
      expect(res.body).toHaveProperty('bestPractices');
    });
  });

  describe('POST /api/installation/suggest-accessories', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).post('/api/installation/suggest-accessories').send({ productId: 'test-product' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when productId is missing', async () => {
      const cookie = await createAuthSession();
      const res = await request(app).post('/api/installation/suggest-accessories').set('Cookie', cookie).send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('productId');
    });
  });

  describe('POST /api/installation/tips', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).post('/api/installation/tips').send({ productId: 'test-product' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when productId is missing', async () => {
      const cookie = await createAuthSession();
      const res = await request(app).post('/api/installation/tips').set('Cookie', cookie).send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('productId');
    });
  });
});

describe('Relationship Discovery RAG Endpoints', () => {
  describe('POST /api/products/:productId/suggest-relationships', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).post('/api/products/test-id/suggest-relationships').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/products/find-similar', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).post('/api/products/find-similar').send({ productId: 'test-id' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when productId is missing', async () => {
      const cookie = await createAuthSession();
      const res = await request(app).post('/api/products/find-similar').set('Cookie', cookie).send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('productId');
    });
  });

  describe('POST /api/relationships/analyze', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/relationships/analyze')
        .send({ sourceProductId: 'prod1', targetProductId: 'prod2' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when sourceProductId or targetProductId is missing', async () => {
      const cookie = await createAuthSession();
      const res = await request(app)
        .post('/api/relationships/analyze')
        .set('Cookie', cookie)
        .send({ sourceProductId: 'prod1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });
  });

  describe('POST /api/relationships/batch-suggest', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/relationships/batch-suggest')
        .send({ productIds: ['prod1', 'prod2'] });
      expect(res.status).toBe(401);
    });

    it('returns 400 when productIds is missing or empty', async () => {
      const cookie = await createAuthSession();
      const res = await request(app)
        .post('/api/relationships/batch-suggest')
        .set('Cookie', cookie)
        .send({ productIds: [] });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('productIds');
    });
  });

  describe('POST /api/relationships/auto-create', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).post('/api/relationships/auto-create').send({ productId: 'prod1' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when productId is missing', async () => {
      const cookie = await createAuthSession();
      const res = await request(app).post('/api/relationships/auto-create').set('Cookie', cookie).send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('productId');
    });
  });
});

describe('Brand Image Recommendation RAG Endpoints', () => {
  describe('POST /api/brand-images/recommend', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).post('/api/brand-images/recommend').send({ useCase: 'ad creation' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when useCase is missing', async () => {
      const cookie = await createAuthSession();
      const res = await request(app).post('/api/brand-images/recommend').set('Cookie', cookie).send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('useCase');
    });
  });

  describe('POST /api/brand-images/match-product/:productId', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).post('/api/brand-images/match-product/test-id').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/brand-images/suggest-category', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).post('/api/brand-images/suggest-category').send({ useCase: 'ad creation' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when useCase is missing', async () => {
      const cookie = await createAuthSession();
      const res = await request(app).post('/api/brand-images/suggest-category').set('Cookie', cookie).send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('useCase');
    });

    it('returns 200 with valid useCase', async () => {
      const cookie = await createAuthSession();
      const res = await request(app)
        .post('/api/brand-images/suggest-category')
        .set('Cookie', cookie)
        .send({ useCase: 'ad creation' });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

describe('Template Pattern RAG Endpoints', () => {
  describe('POST /api/templates/match-context', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).post('/api/templates/match-context').send({
        industry: 'flooring',
        objective: 'awareness',
        platform: 'instagram',
        aspectRatio: '1:1',
      });
      expect(res.status).toBe(401);
    });

    it('returns 400 when required fields are missing', async () => {
      const cookie = await createAuthSession();
      const res = await request(app)
        .post('/api/templates/match-context')
        .set('Cookie', cookie)
        .send({ industry: 'flooring' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });
  });

  describe('GET /api/templates/analyze-patterns/:templateId', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/templates/analyze-patterns/test-id');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/templates/suggest-customizations', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).post('/api/templates/suggest-customizations').send({ templateId: 'test-id' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when templateId is missing', async () => {
      const cookie = await createAuthSession();
      const res = await request(app).post('/api/templates/suggest-customizations').set('Cookie', cookie).send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('templateId');
    });
  });
});
