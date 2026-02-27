import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestAppForRouter, loginAs, type ContextOverrides } from './_testHelpers';
import { ideaBankRouter } from '../../routes/ideaBank.router';

describe('IdeaBank Router — /api/idea-bank', () => {
  let app: Express;
  let cookie: string;
  let overrides: ContextOverrides;

  const mockSuggestions = {
    success: true,
    response: {
      suggestions: [
        {
          prompt: 'A steel beam in a modern office',
          confidence: 85,
          sources: ['vision'],
          platform: 'linkedin',
          aspectRatio: '16:9',
        },
      ],
      analysisStatus: {
        visionComplete: true,
        kbQueried: true,
        templatesMatched: 2,
        webSearchUsed: false,
      },
    },
  };

  beforeEach(() => {
    overrides = {
      domainServices: {
        ideaBank: {
          generateSuggestions: vi.fn().mockResolvedValue(mockSuggestions),
          getMatchedTemplates: vi.fn().mockResolvedValue({
            templates: [{ id: 'tmpl-1', name: 'Test' }],
            analysis: { categories: ['structural'] },
          }),
        } as unknown as ContextOverrides['domainServices'] extends undefined
          ? never
          : NonNullable<ContextOverrides['domainServices']>['ideaBank'],
      },
    };

    const result = createTestAppForRouter(ideaBankRouter, '/api/idea-bank', overrides);
    app = result.app;
  });

  // ---------- POST /suggest ----------
  describe('POST /api/idea-bank/suggest', () => {
    it('returns 400 when no productId or uploadDescriptions provided', async () => {
      const res = await request(app)
        .post('/api/idea-bank/suggest')
        .send({});
      expect(res.status).toBe(400);
    });

    it('returns 200 with suggestions for a single product', async () => {
      const res = await request(app)
        .post('/api/idea-bank/suggest')
        .send({ productId: 'prod-1' });
      expect(res.status).toBe(200);
      expect(res.body.suggestions).toHaveLength(1);
      expect(res.body.analysisStatus).toBeDefined();
    });

    it('returns 200 with suggestions for multiple products', async () => {
      const res = await request(app)
        .post('/api/idea-bank/suggest')
        .send({ productIds: ['prod-1', 'prod-2'] });
      expect(res.status).toBe(200);
    });

    it('returns 400 when mode is template but no templateId', async () => {
      const res = await request(app)
        .post('/api/idea-bank/suggest')
        .send({ productId: 'prod-1', mode: 'template' });
      expect(res.status).toBe(400);
    });

    it('handles rate limited error from service', async () => {
      const rateLimitOverrides: ContextOverrides = {
        domainServices: {
          ideaBank: {
            generateSuggestions: vi.fn().mockResolvedValue({
              success: false,
              error: { code: 'RATE_LIMITED', message: 'Too many requests' },
            }),
            getMatchedTemplates: vi.fn(),
          } as unknown as ContextOverrides['domainServices'] extends undefined
            ? never
            : NonNullable<ContextOverrides['domainServices']>['ideaBank'],
        },
      };
      const rebuilt = createTestAppForRouter(ideaBankRouter, '/api/idea-bank', rateLimitOverrides);
      const res = await request(rebuilt.app)
        .post('/api/idea-bank/suggest')
        .send({ productId: 'prod-1' });
      expect(res.status).toBe(429);
    });

    it('handles product not found error from service', async () => {
      const notFoundOverrides: ContextOverrides = {
        domainServices: {
          ideaBank: {
            generateSuggestions: vi.fn().mockResolvedValue({
              success: false,
              error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' },
            }),
            getMatchedTemplates: vi.fn(),
          } as unknown as ContextOverrides['domainServices'] extends undefined
            ? never
            : NonNullable<ContextOverrides['domainServices']>['ideaBank'],
        },
      };
      const rebuilt = createTestAppForRouter(ideaBankRouter, '/api/idea-bank', notFoundOverrides);
      const res = await request(rebuilt.app)
        .post('/api/idea-bank/suggest')
        .send({ productId: 'missing' });
      expect(res.status).toBe(404);
    });

    it('supports uploadDescriptions without productId', async () => {
      const res = await request(app)
        .post('/api/idea-bank/suggest')
        .send({ uploadDescriptions: ['A steel beam photo'] });
      expect(res.status).toBe(200);
    });
  });

  // ---------- GET /templates/:productId ----------
  describe('GET /api/idea-bank/templates/:productId', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/idea-bank/templates/prod-1');
      expect(res.status).toBe(401);
    });

    it('returns 200 with matched templates', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .get('/api/idea-bank/templates/prod-1')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.templates).toHaveLength(1);
      expect(res.body.productAnalysis).toBeDefined();
    });

    it('returns 404 when service returns null', async () => {
      const nullOverrides: ContextOverrides = {
        domainServices: {
          ideaBank: {
            generateSuggestions: vi.fn(),
            getMatchedTemplates: vi.fn().mockResolvedValue(null),
          } as unknown as ContextOverrides['domainServices'] extends undefined
            ? never
            : NonNullable<ContextOverrides['domainServices']>['ideaBank'],
        },
      };
      const rebuilt = createTestAppForRouter(ideaBankRouter, '/api/idea-bank', nullOverrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app)
        .get('/api/idea-bank/templates/missing')
        .set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });
});
