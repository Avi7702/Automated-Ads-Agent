/**
 * @vitest-environment jsdom
 *
 * Tests for MSW API mock handlers
 * Following TDD approach - these tests define the expected behavior
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create test server with handlers
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('MSW API Mock Handlers', () => {
  describe('Auth Endpoints', () => {
    it('POST /api/auth/login returns user on success', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.email).toBe('test@example.com');
    });

    it('POST /api/auth/login returns 401 for invalid credentials', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('POST /api/auth/register creates new user', async () => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
          username: 'newuser',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.email).toBe('newuser@example.com');
    });

    it('POST /api/auth/logout returns success', async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('GET /api/auth/me returns current user when authenticated', async () => {
      const response = await fetch('/api/auth/me');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.email).toBeDefined();
    });

    it('GET /api/auth/demo returns demo user', async () => {
      const response = await fetch('/api/auth/demo');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.email).toContain('demo');
    });
  });

  describe('Products Endpoints', () => {
    it('GET /api/products returns product list', async () => {
      const response = await fetch('/api/products');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('cloudinaryUrl');
    });

    it('GET /api/products/:id returns single product', async () => {
      const response = await fetch('/api/products/1');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe('1');
      expect(data.name).toBeDefined();
    });

    it('GET /api/products/:id returns 404 for non-existent product', async () => {
      const response = await fetch('/api/products/999999');

      expect(response.status).toBe(404);
    });

    it('POST /api/products creates new product', async () => {
      const formData = new FormData();
      formData.append('name', 'Test Product');
      formData.append('description', 'A test product');

      const response = await fetch('/api/products', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.name).toBe('Test Product');
    });

    it('DELETE /api/products/:id deletes product', async () => {
      const response = await fetch('/api/products/1', {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Generations Endpoints', () => {
    it('GET /api/generations returns generations list', async () => {
      const response = await fetch('/api/generations');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('GET /api/generations/:id returns single generation', async () => {
      const response = await fetch('/api/generations/gen-1');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe('gen-1');
    });

    it('GET /api/generations/:id/history returns edit history', async () => {
      const response = await fetch('/api/generations/gen-1/history');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('POST /api/generations/:id/edit creates edit', async () => {
      const response = await fetch('/api/generations/gen-1/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Make it brighter',
          editType: 'color',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.jobId).toBeDefined();
    });

    it('DELETE /api/generations/:id deletes generation', async () => {
      const response = await fetch('/api/generations/gen-1', {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Idea Bank Endpoints', () => {
    it('POST /api/idea-bank/suggest returns suggestions', async () => {
      const response = await fetch('/api/idea-bank/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: ['1', '2'],
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.suggestions).toBeDefined();
      expect(Array.isArray(data.suggestions)).toBe(true);
    });

    it('GET /api/idea-bank/templates/:productId returns templates', async () => {
      const response = await fetch('/api/idea-bank/templates/1');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Jobs Endpoints', () => {
    it('GET /api/jobs/:jobId returns job status', async () => {
      const response = await fetch('/api/jobs/job-123');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe('job-123');
      expect(data.status).toBeDefined();
    });

    it('GET /api/jobs/:jobId returns pending status for new jobs', async () => {
      const response = await fetch('/api/jobs/new-job');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(['pending', 'processing', 'completed']).toContain(data.status);
    });

    it('GET /api/jobs/completed-job returns completed status', async () => {
      const response = await fetch('/api/jobs/completed-job');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('completed');
      expect(data.result).toBeDefined();
    });
  });

  describe('Health Endpoints', () => {
    it('GET /api/health returns ok status', async () => {
      const response = await fetch('/api/health');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ok');
    });

    it('GET /api/health/live returns liveness check', async () => {
      const response = await fetch('/api/health/live');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ok');
    });

    it('GET /api/health/ready returns readiness check', async () => {
      const response = await fetch('/api/health/ready');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ok');
    });
  });

  describe('Transform Endpoint', () => {
    it('POST /api/transform returns job ID', async () => {
      const formData = new FormData();
      formData.append('prompt', 'Create an ad');
      formData.append('platform', 'instagram');

      const response = await fetch('/api/transform', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.jobId).toBeDefined();
    });
  });

  describe('Templates Endpoints', () => {
    it('GET /api/templates returns template list', async () => {
      const response = await fetch('/api/templates');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('GET /api/templates/:id returns single template', async () => {
      const response = await fetch('/api/templates/tpl-1');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe('tpl-1');
    });
  });

  describe('Copywriting Endpoints', () => {
    it('POST /api/copy/generate generates ad copy', async () => {
      const response = await fetch('/api/copy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: 'Test Product',
          platform: 'instagram',
          objective: 'awareness',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.variations).toBeDefined();
    });

    it('GET /api/copy/:id returns saved copy', async () => {
      const response = await fetch('/api/copy/copy-1');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe('copy-1');
    });
  });
});
