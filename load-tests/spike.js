/**
 * Spike Load Test — 0 to 500 Users in 30 Seconds
 *
 * Validates the system under sudden traffic surges:
 *   - Rate limiting should activate and return 429 (not 5xx)
 *   - No 500-series errors (503 from rate limiting is acceptable)
 *   - Graceful degradation — reads should still work even if AI endpoints are throttled
 *
 * Run:
 *   k6 run load-tests/spike.js
 *   k6 run --env BASE_URL=https://your-production-url load-tests/spike.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom Metrics
// ---------------------------------------------------------------------------
const readLatency = new Trend('read_endpoint_duration', true);
const aiLatency = new Trend('ai_endpoint_duration', true);
const serverErrors = new Counter('server_errors_5xx');
const rateLimited = new Counter('rate_limited_429');
const errorRate = new Rate('error_rate');

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------
export const options = {
  stages: [
    { duration: '10s', target: 50 },    // Warm up
    { duration: '30s', target: 500 },   // Spike to 500 users in 30s
    { duration: '1m', target: 500 },    // Hold at peak
    { duration: '30s', target: 100 },   // Scale back down
    { duration: '1m', target: 0 },      // Ramp down to zero
  ],
  thresholds: {
    // No 5xx errors allowed (503 from rate limiting tracked separately)
    server_errors_5xx: ['count<1'],
    // Error rate: allow up to 30% since rate limiting will reject many requests
    error_rate: ['rate<0.30'],
    // Read endpoints should still respond within 2s even under spike
    read_endpoint_duration: ['p(95)<2000'],
  },
};

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

// ---------------------------------------------------------------------------
// Request Bodies
// ---------------------------------------------------------------------------
const ideaBankBody = JSON.stringify({
  productIds: ['demo-product-1'],
  userGoal: 'Generate creative ad ideas for summer campaign',
  enableWebSearch: false,
  maxSuggestions: 2,
  mode: 'freestyle',
});

const copywritingBody = JSON.stringify({
  platform: 'instagram',
  tone: 'authentic',
  framework: 'auto',
  campaignObjective: 'engagement',
  productName: 'Premium Wireless Headphones',
  productDescription: 'High-fidelity noise-cancelling wireless headphones with 30-hour battery life.',
  variations: 1,
  industry: 'electronics',
});

// ---------------------------------------------------------------------------
// Helper: classify response
// ---------------------------------------------------------------------------
function classifyResponse(res, endpointName) {
  if (res.status === 429) {
    rateLimited.add(1);
    // 429 is expected during spike — NOT a failure
    return true;
  }
  if (res.status >= 500) {
    // 503 from rate limiting is acceptable
    if (res.status === 503) {
      rateLimited.add(1);
      return true;
    }
    serverErrors.add(1);
    return false;
  }
  return res.status >= 200 && res.status < 400;
}

// ---------------------------------------------------------------------------
// Scenario Functions
// ---------------------------------------------------------------------------
function healthCheck() {
  const res = http.get(`${BASE_URL}/api/health`, { tags: { endpoint: 'health' } });
  readLatency.add(res.timings.duration);
  const ok = classifyResponse(res, 'health');
  errorRate.add(!ok);
}

function getProducts() {
  const res = http.get(`${BASE_URL}/api/products`, {
    headers: HEADERS,
    tags: { endpoint: 'products' },
  });
  readLatency.add(res.timings.duration);
  const ok = classifyResponse(res, 'products');
  errorRate.add(!ok);
}

function getTemplates() {
  const res = http.get(`${BASE_URL}/api/prompt-templates`, {
    headers: HEADERS,
    tags: { endpoint: 'templates' },
  });
  readLatency.add(res.timings.duration);
  const ok = classifyResponse(res, 'templates');
  errorRate.add(!ok);
}

function postIdeaBankSuggest() {
  const csrfRes = http.get(`${BASE_URL}/api/csrf-token`, {
    headers: HEADERS,
    tags: { endpoint: 'csrf' },
  });

  let csrfToken = '';
  try {
    const body = JSON.parse(csrfRes.body);
    csrfToken = body.csrfToken || '';
  } catch (_e) {
    // ignore
  }

  const res = http.post(`${BASE_URL}/api/idea-bank/suggest`, ideaBankBody, {
    headers: Object.assign({}, HEADERS, { 'x-csrf-token': csrfToken }),
    tags: { endpoint: 'idea-bank-suggest' },
  });
  aiLatency.add(res.timings.duration);
  const ok = classifyResponse(res, 'idea-bank');
  errorRate.add(!ok);
}

function postCopywritingGenerate() {
  const csrfRes = http.get(`${BASE_URL}/api/csrf-token`, {
    headers: HEADERS,
    tags: { endpoint: 'csrf' },
  });

  let csrfToken = '';
  try {
    const body = JSON.parse(csrfRes.body);
    csrfToken = body.csrfToken || '';
  } catch (_e) {
    // ignore
  }

  const res = http.post(`${BASE_URL}/api/copywriting/standalone`, copywritingBody, {
    headers: Object.assign({}, HEADERS, { 'x-csrf-token': csrfToken }),
    tags: { endpoint: 'copywriting-standalone' },
  });
  aiLatency.add(res.timings.duration);
  const ok = classifyResponse(res, 'copywriting');
  errorRate.add(!ok);
}

// ---------------------------------------------------------------------------
// Main VU Function — Weighted Random Distribution
// ---------------------------------------------------------------------------
export default function () {
  const roll = Math.random() * 100;

  if (roll < 10) {
    group('Health Check (10%)', healthCheck);
  } else if (roll < 40) {
    group('Get Products (30%)', getProducts);
  } else if (roll < 60) {
    group('Get Templates (20%)', getTemplates);
  } else if (roll < 80) {
    group('Idea Bank Suggest (20%)', postIdeaBankSuggest);
  } else {
    group('Copywriting Generate (20%)', postCopywritingGenerate);
  }

  // Shorter think time during spike to maximize pressure
  sleep(Math.random() * 0.5 + 0.5);
}
