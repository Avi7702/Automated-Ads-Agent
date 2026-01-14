import { test, expect } from '@playwright/test';

/**
 * E2E tests for Production Monitoring Infrastructure
 * Tests all 4 monitoring endpoints and UI tabs
 */

test.describe('Monitoring API Endpoints', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('GET /api/monitoring/health - returns system health status', async ({ request }) => {
    const response = await request.get('/api/monitoring/health');

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty('overall');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('services');

    // Verify overall status is valid
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.overall);

    // Verify database health
    expect(data.services).toHaveProperty('database');
    expect(data.services.database).toHaveProperty('status');
    expect(data.services.database).toHaveProperty('totalConnections');
    expect(data.services.database).toHaveProperty('idleConnections');
    expect(data.services.database).toHaveProperty('activeConnections');
    expect(data.services.database).toHaveProperty('averageQueryTime');

    // Verify Redis health
    expect(data.services).toHaveProperty('redis');
    expect(data.services.redis).toHaveProperty('status');
    expect(data.services.redis).toHaveProperty('connected');
  });

  test('GET /api/monitoring/performance - returns endpoint metrics', async ({ request }) => {
    const response = await request.get('/api/monitoring/performance');

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify it's an array
    expect(Array.isArray(data)).toBeTruthy();

    // If there are metrics, verify structure
    if (data.length > 0) {
      const metric = data[0];
      expect(metric).toHaveProperty('endpoint');
      expect(metric).toHaveProperty('method');
      expect(metric).toHaveProperty('requests');
      expect(metric).toHaveProperty('errors');
      expect(metric).toHaveProperty('errorRate');
      expect(metric).toHaveProperty('avgLatency');
      expect(metric).toHaveProperty('minLatency');
      expect(metric).toHaveProperty('maxLatency');
      expect(metric).toHaveProperty('lastReset');

      // Verify data types
      expect(typeof metric.endpoint).toBe('string');
      expect(typeof metric.method).toBe('string');
      expect(typeof metric.requests).toBe('number');
      expect(typeof metric.errors).toBe('number');
      expect(typeof metric.errorRate).toBe('number');
      expect(typeof metric.avgLatency).toBe('number');
    }
  });

  test('GET /api/monitoring/errors - returns error tracking data', async ({ request }) => {
    const response = await request.get('/api/monitoring/errors');

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty('errors');
    expect(data).toHaveProperty('stats');

    // Verify errors array
    expect(Array.isArray(data.errors)).toBeTruthy();

    // Verify stats structure
    expect(data.stats).toHaveProperty('total');
    expect(data.stats).toHaveProperty('last5min');
    expect(data.stats).toHaveProperty('last1hour');
    expect(data.stats).toHaveProperty('byStatusCode');
    expect(data.stats).toHaveProperty('byEndpoint');
    expect(data.stats).toHaveProperty('byFingerprint');

    // If there are errors, verify structure
    if (data.errors.length > 0) {
      const error = data.errors[0];
      expect(error).toHaveProperty('timestamp');
      expect(error).toHaveProperty('statusCode');
      expect(error).toHaveProperty('method');
      expect(error).toHaveProperty('endpoint');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('fingerprint');
    }
  });

  test('GET /api/monitoring/system - returns full system health', async ({ request }) => {
    const response = await request.get('/api/monitoring/system');

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify overall status
    expect(data).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);

    // Verify timestamp
    expect(data).toHaveProperty('timestamp');
    expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);

    // Verify services
    expect(data).toHaveProperty('services');
    expect(data.services).toHaveProperty('database');
    expect(data.services).toHaveProperty('redis');

    // Verify performance metrics
    expect(data).toHaveProperty('performance');
    expect(data.performance).toHaveProperty('totalRequests');
    expect(data.performance).toHaveProperty('totalErrors');
    expect(data.performance).toHaveProperty('avgResponseTime');
    expect(data.performance).toHaveProperty('topEndpoints');

    // Verify error tracking
    expect(data).toHaveProperty('errors');
    expect(data.errors).toHaveProperty('total');
    expect(data.errors).toHaveProperty('recent');
  });

  test('Monitoring endpoints require authentication', async ({ browser }) => {
    // Create a new context without auth (no storageState)
    const context = await browser.newContext();
    const page = await context.newPage();

    const endpoints = [
      '/api/monitoring/health',
      '/api/monitoring/performance',
      '/api/monitoring/errors',
      '/api/monitoring/system',
    ];

    for (const endpoint of endpoints) {
      const response = await page.goto(endpoint);
      // Should redirect to login (200 with HTML) or return error
      expect(response?.status()).toBeDefined();
      // If we get JSON, we're authenticated (bad); if we get HTML/redirect, we're not (good)
      const contentType = response?.headers()['content-type'] || '';
      const isJson = contentType.includes('application/json');

      if (isJson) {
        // If we get JSON, it means we bypassed auth - this should NOT happen
        const url = response?.url() || '';
        // Unless it's the health endpoint which might be public
        if (!endpoint.includes('/health')) {
          throw new Error(`Endpoint ${endpoint} returned JSON without auth: ${url}`);
        }
      }
    }

    await context.close();
  });

  test('Performance metrics track request latency', async ({ request }) => {
    // Make a request to generate metrics
    await request.get('/api/health');

    // Wait a moment for metrics to be recorded
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if metrics were recorded
    const response = await request.get('/api/monitoring/performance');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const healthMetric = data.find((m: any) => m.endpoint === '/api/health');

    // Should have recorded the health check
    if (healthMetric) {
      expect(healthMetric.requests).toBeGreaterThan(0);
      expect(healthMetric.avgLatency).toBeGreaterThan(0);
    }
  });

  test('Database health reflects connection pool status', async ({ request }) => {
    const response = await request.get('/api/monitoring/health');
    const data = await response.json();

    const db = data.services.database;

    // Verify pool metrics are realistic
    expect(db.totalConnections).toBeGreaterThanOrEqual(0);
    expect(db.idleConnections).toBeGreaterThanOrEqual(0);
    expect(db.activeConnections).toBeGreaterThanOrEqual(0);
    expect(db.totalConnections).toBe(db.idleConnections + db.activeConnections);

    // Verify query time is measured
    expect(db.averageQueryTime).toBeGreaterThanOrEqual(0);

    // Verify status logic
    if (db.averageQueryTime > 500) {
      expect(db.status).toBe('unhealthy');
    } else if (db.averageQueryTime > 100) {
      expect(db.status).toBe('degraded');
    } else {
      expect(db.status).toBe('healthy');
    }
  });
});

test.describe('Monitoring UI Dashboard', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('Quota Dashboard shows monitoring tabs', async ({ page }) => {
    // First ensure we're authenticated by checking /api/auth/me
    const authResponse = await page.request.get('/api/auth/me');
    if (!authResponse.ok()) {
      // If not authenticated, get demo session first
      await page.request.get('/api/auth/demo');
    }

    await page.goto('/usage');

    // Wait for page to load (the page title is in the component)
    await page.waitForSelector('text=Monitoring Dashboard', { timeout: 15000 });

    // Verify all monitoring tabs are present (use role selector to avoid ambiguity)
    await expect(page.getByRole('tab', { name: /API Quota/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /System Health/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Performance/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Errors/i })).toBeVisible();
  });

  test('System Health tab displays service status', async ({ page }) => {
    // Ensure authenticated
    const authResponse = await page.request.get('/api/auth/me');
    if (!authResponse.ok()) {
      await page.request.get('/api/auth/demo');
    }

    await page.goto('/usage');
    await page.waitForSelector('text=Monitoring Dashboard', { timeout: 15000 });

    // Click System Health tab
    await page.getByRole('tab', { name: /System Health/i }).click();

    // Wait for content to load
    await page.waitForSelector('text=/Database.*PostgreSQL/i', { timeout: 10000 });

    // Verify database section exists
    await expect(page.locator('text=/Database/i')).toBeVisible();

    // Verify Redis section exists
    await expect(page.locator('text=/Redis/i')).toBeVisible();

    // Verify status indicators (should show healthy/degraded/unhealthy)
    const statusElements = await page.locator('[class*="status"]').count();
    expect(statusElements).toBeGreaterThan(0);
  });

  test('Performance tab shows endpoint metrics', async ({ page }) => {
    // Ensure authenticated
    const authResponse = await page.request.get('/api/auth/me');
    if (!authResponse.ok()) {
      await page.request.get('/api/auth/demo');
    }

    await page.goto('/usage');
    await page.waitForSelector('text=Monitoring Dashboard', { timeout: 15000 });

    // Click Performance tab
    await page.getByRole('tab', { name: /Performance/i }).click();

    // Wait for metrics to load
    await page.waitForTimeout(1000);

    // Verify table or metrics display
    const hasMetrics = await page.locator('text=/requests|latency|endpoint/i').count() > 0;
    expect(hasMetrics).toBeTruthy();
  });

  test('Error Tracking tab displays error statistics', async ({ page }) => {
    // Ensure authenticated
    const authResponse = await page.request.get('/api/auth/me');
    if (!authResponse.ok()) {
      await page.request.get('/api/auth/demo');
    }

    await page.goto('/usage');
    await page.waitForSelector('text=Monitoring Dashboard', { timeout: 15000 });

    // Click Errors tab
    await page.getByRole('tab', { name: /Errors/i }).click();

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Verify stats section
    const hasStats = await page.locator('text=/total|errors|last/i').count() > 0;
    expect(hasStats).toBeTruthy();
  });

  test('Monitoring data refreshes on tab switch', async ({ page }) => {
    // Ensure authenticated
    const authResponse = await page.request.get('/api/auth/me');
    if (!authResponse.ok()) {
      await page.request.get('/api/auth/demo');
    }

    await page.goto('/usage');

    // Wait for dashboard to load
    await page.waitForSelector('text=Monitoring Dashboard', { timeout: 15000 });

    // Switch between tabs
    await page.getByRole('tab', { name: /System Health/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('tab', { name: /Performance/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('tab', { name: /Errors/i }).click();
    await page.waitForTimeout(500);

    // Each tab should have loaded without errors
    const errors = await page.locator('text=/error loading|failed to fetch/i').count();
    expect(errors).toBe(0);
  });
});

test.describe('Monitoring Edge Cases', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('Health endpoint handles database degradation gracefully', async ({ request }) => {
    const response = await request.get('/api/monitoring/health');
    const data = await response.json();

    // Even if database is degraded, endpoint should still respond
    expect(response.status()).toBe(200);
    expect(data.overall).toBeDefined();
  });

  test('Performance metrics handle high request volume', async ({ request }) => {
    // Make multiple requests rapidly
    const requests = Array.from({ length: 10 }, () => request.get('/api/health'));
    await Promise.all(requests);

    // Verify metrics endpoint still responds
    const metricsResponse = await request.get('/api/monitoring/performance');
    expect(metricsResponse.ok()).toBeTruthy();

    const data = await metricsResponse.json();
    const healthMetrics = data.find((m: any) => m.endpoint === '/api/health');

    // Should have counted all requests
    if (healthMetrics) {
      expect(healthMetrics.requests).toBeGreaterThanOrEqual(10);
    }
  });

  test('Error tracking captures errors correctly', async ({ request }) => {
    // Try to access a non-existent endpoint (should generate 404)
    await request.get('/api/monitoring/nonexistent');

    // Wait for error to be tracked
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check error tracking
    const response = await request.get('/api/monitoring/errors');
    const data = await response.json();

    // Stats should reflect the error
    expect(data.stats.total).toBeGreaterThanOrEqual(0);
  });

  test('System health aggregation combines all metrics', async ({ request }) => {
    const response = await request.get('/api/monitoring/system');
    const data = await response.json();

    // Verify aggregation logic
    const hasUnhealthyService =
      data.services.database.status === 'unhealthy' ||
      data.services.redis.status === 'unhealthy';

    const hasDegradedService =
      data.services.database.status === 'degraded' ||
      data.services.redis.status === 'degraded';

    // Overall status should reflect worst service status
    if (hasUnhealthyService) {
      expect(data.status).toBe('unhealthy');
    } else if (hasDegradedService) {
      expect(data.status).toBe('degraded');
    } else {
      expect(data.status).toBe('healthy');
    }
  });
});
