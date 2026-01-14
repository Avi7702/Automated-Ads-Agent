import { test, expect } from '@playwright/test';

/**
 * Quick production smoke test for monitoring dashboard
 * Tests against live Railway deployment
 */

const PRODUCTION_URL = 'https://automated-ads-agent-production.up.railway.app';

test.describe('Monitoring Dashboard - Production Smoke Test', () => {
  test.use({ baseURL: PRODUCTION_URL });

  test('Production monitoring endpoints are accessible', async ({ request }) => {
    // Test all 4 monitoring endpoints
    const endpoints = [
      '/api/monitoring/health',
      '/api/monitoring/performance',
      '/api/monitoring/errors',
      '/api/monitoring/system',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toBeDefined();
    }
  });

  test('Health endpoint returns valid structure', async ({ request }) => {
    const response = await request.get('/api/monitoring/health');
    const data = await response.json();

    expect(data).toHaveProperty('overall');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('services');
    expect(data.services).toHaveProperty('database');
  });

  test('System endpoint aggregates all metrics', async ({ request }) => {
    const response = await request.get('/api/monitoring/system');
    const data = await response.json();

    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('services');
    expect(data).toHaveProperty('performance');
    expect(data).toHaveProperty('errors');
  });
});
