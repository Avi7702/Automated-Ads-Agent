import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestAppForRouter, loginAs, type ContextOverrides } from './_testHelpers';
import { copyRouter } from '../../routes/copy.router';

const { mockGenerateCopy } = vi.hoisted(() => ({
  mockGenerateCopy: vi.fn(),
}));

vi.mock('../../services/copywritingService', () => ({
  copywritingService: {
    generateCopy: mockGenerateCopy,
  },
}));

describe('Copy Router - /api/copy', () => {
  let app: Express;
  let overrides: ContextOverrides;

  const validPayload = {
    generationId: '11111111-1111-4111-8111-111111111111',
    platform: 'linkedin',
    tone: 'professional',
    productName: 'NDS Channel Drain',
    productDescription: 'Heavy-duty drainage solution for commercial projects.',
    industry: 'building materials',
    framework: 'auto',
    variations: 1,
  };

  beforeEach(() => {
    mockGenerateCopy.mockReset();
    mockGenerateCopy.mockResolvedValue([
      {
        headline: 'Built for jobsite performance',
        hook: 'Drainage that installs fast and lasts.',
        bodyText: 'Engineered for reliable water control in demanding environments.',
        cta: 'Request specs',
        caption: 'Engineered drainage for demanding jobsites.',
        hashtags: ['#Drainage', '#Construction'],
        framework: 'AIDA',
        qualityScore: {
          clarity: 8,
          persuasiveness: 8,
          platformFit: 8,
          brandAlignment: 8,
          overallScore: 8,
          reasoning: 'Strong baseline',
        },
        characterCounts: {
          headline: 33,
          hook: 39,
          body: 68,
          caption: 43,
          total: 183,
        },
      },
    ]);

    overrides = {
      storage: {
        getGenerationById: vi.fn().mockResolvedValue({
          id: validPayload.generationId,
          prompt: 'generate a construction post',
        }),
        getUserById: vi.fn().mockResolvedValue(null),
        saveAdCopy: vi.fn().mockImplementation(async (payload) => ({
          id: 'copy-1',
          ...payload,
        })),
      },
    };

    const result = createTestAppForRouter(copyRouter, '/api/copy', overrides);
    app = result.app;
  });

  it('returns variations in response for studio clients', async () => {
    const cookie = await loginAs(app);
    const res = await request(app).post('/api/copy/generate').set('Cookie', cookie).send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.variations)).toBe(true);
    expect(res.body.variations).toHaveLength(1);
    expect(typeof res.body.variations[0].copy).toBe('string');
  });

  it('returns deterministic fallback copy when Gemini fails', async () => {
    mockGenerateCopy.mockRejectedValue(new Error('Gemini API unavailable'));

    const cookie = await loginAs(app);
    const res = await request(app).post('/api/copy/generate').set('Cookie', cookie).send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fallback).toBe(true);
    expect(res.body.meta?.provider).toBe('fallback');
    expect(Array.isArray(res.body.variations)).toBe(true);
    expect(res.body.variations.length).toBeGreaterThan(0);
  });
});
