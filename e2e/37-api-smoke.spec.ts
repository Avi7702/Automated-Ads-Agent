import { test, expect } from '@playwright/test';
import { apiGet, apiPost } from './helpers/api';

/**
 * API Smoke Tests
 *
 * Uses Playwright's APIRequestContext to test API endpoints directly.
 * These tests verify that endpoints respond with expected status codes
 * and basic response structure — not full integration tests.
 *
 * Groups: health, auth, products, generations, templates, brand, quota,
 *         planner, idea bank, copy, settings, social
 */

test.describe('API Smoke Tests', { tag: '@api' }, () => {
  // --- Health Endpoints (3 tests) ---

  test('GET /api/health returns 200', async ({ request }) => {
    const response = await apiGet(request, '/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('status');
  });

  test('GET /api/health/live returns 200', async ({ request }) => {
    const response = await apiGet(request, '/api/health/live');
    expect(response.status()).toBe(200);
  });

  test('GET /api/health/ready returns 200', async ({ request }) => {
    const response = await apiGet(request, '/api/health/ready');
    // 200 if DB is connected, 503 if not — both are valid responses
    expect([200, 503]).toContain(response.status());
  });

  // --- Auth Endpoints (3 tests) ---

  test('GET /api/auth/demo authenticates and returns redirect or user', async ({ request }) => {
    const response = await apiGet(request, '/api/auth/demo');
    // Demo endpoint redirects (302) or returns 200
    expect([200, 302]).toContain(response.status());
  });

  test('GET /api/auth/me returns user info (with auth)', async ({ request }) => {
    // First authenticate via demo
    await apiGet(request, '/api/auth/demo');

    const response = await apiGet(request, '/api/auth/me');
    // 200 with user info or 401 if not authenticated
    expect([200, 401]).toContain(response.status());
  });

  test('POST /api/auth/logout returns success', async ({ request }) => {
    const response = await apiPost(request, '/api/auth/logout');
    // 200 or 204 for successful logout
    expect([200, 204, 302]).toContain(response.status());
  });

  // --- Products Endpoints (2 tests) ---

  test('GET /api/products returns product list', async ({ request }) => {
    const response = await apiGet(request, '/api/products');
    expect(response.status()).toBe(200);
    const body = await response.json();
    // Response is either an array or { products: [] }
    const products = Array.isArray(body) ? body : body?.products;
    expect(Array.isArray(products)).toBeTruthy();
  });

  test('GET /api/products with invalid ID returns 404', async ({ request }) => {
    const response = await apiGet(request, '/api/products/99999999');
    expect([404, 400]).toContain(response.status());
  });

  // --- Generations Endpoints (2 tests) ---

  test('GET /api/generations returns generation list', async ({ request }) => {
    const response = await apiGet(request, '/api/generations');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('GET /api/generations with invalid ID returns 404', async ({ request }) => {
    const response = await apiGet(request, '/api/generations/99999999');
    expect([404, 400]).toContain(response.status());
  });

  // --- Templates Endpoints (2 tests) ---

  test('GET /api/templates returns template list', async ({ request }) => {
    const response = await apiGet(request, '/api/templates');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('templates');
  });

  test('GET /api/ad-templates/categories returns categories', async ({ request }) => {
    const response = await apiGet(request, '/api/ad-templates/categories');
    expect(response.status()).toBe(200);
  });

  // --- Brand Profile (1 test) ---

  test('GET /api/brand-profile returns profile or 404', async ({ request }) => {
    // Authenticate first
    await apiGet(request, '/api/auth/demo');

    const response = await apiGet(request, '/api/brand-profile');
    // 200 if profile exists, 404 if not
    expect([200, 404]).toContain(response.status());
  });

  // --- Quota Endpoints (1 test) ---

  test('GET /api/quota/status returns quota status', async ({ request }) => {
    const response = await apiGet(request, '/api/quota/status');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('status');
  });

  // --- Content Planner (2 tests) ---

  test('GET /api/content-planner/templates returns planner templates', async ({ request }) => {
    const response = await apiGet(request, '/api/content-planner/templates');
    expect(response.status()).toBe(200);
  });

  test('GET /api/content-planner/posts returns planned posts (with auth)', async ({ request }) => {
    await apiGet(request, '/api/auth/demo');

    const response = await apiGet(request, '/api/content-planner/posts');
    // 200 with posts or 401 if auth required
    expect([200, 401]).toContain(response.status());
  });

  // --- Idea Bank (1 test) ---

  test('POST /api/idea-bank/suggest returns ideas or requires body', async ({ request }) => {
    await apiGet(request, '/api/auth/demo');

    const response = await apiPost(request, '/api/idea-bank/suggest', {
      productIds: [],
      mode: 'standard',
    });
    // 200 with suggestions or 400/422 if validation fails
    expect([200, 400, 422]).toContain(response.status());
  });

  // --- Copy (1 test) ---

  test('GET /api/copy/:id returns copy or 404', async ({ request }) => {
    const response = await apiGet(request, '/api/copy/99999999');
    expect([404, 400]).toContain(response.status());
  });

  // --- Settings (1 test) ---

  test('GET /api/settings/api-keys returns key status (with auth)', async ({ request }) => {
    await apiGet(request, '/api/auth/demo');

    const response = await apiGet(request, '/api/settings/api-keys');
    // 200 with keys or 401
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('keys');
    }
  });

  // --- Social Accounts (1 test) ---

  test('GET /api/social/accounts returns accounts list (with auth)', async ({ request }) => {
    await apiGet(request, '/api/auth/demo');

    const response = await apiGet(request, '/api/social/accounts');
    // 200 with accounts or 401
    expect([200, 401]).toContain(response.status());
  });
});
