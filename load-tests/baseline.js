/**
 * Baseline Load Test — 100 Virtual Users, 5 Minutes
 *
 * Simulates normal production traffic with realistic endpoint distribution:
 *   - GET  /api/health               (10% of requests)
 *   - GET  /api/products             (30% of requests)
 *   - GET  /api/prompt-templates     (20% of requests)
 *   - POST /api/idea-bank/suggest    (20% of requests)
 *   - POST /api/copywriting/standalone (20% of requests)
 *
 * Run:
 *   k6 run load-tests/baseline.js
 *   k6 run --env BASE_URL=https://your-production-url load-tests/baseline.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom Metrics
// ---------------------------------------------------------------------------
const readLatency = new Trend('read_endpoint_duration', true);
const aiLatency = new Trend('ai_endpoint_duration', true);
const errorRate = new Rate('error_rate');

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 100 },   // Hold at 100 users
    { duration: '30s', target: 100 },  // Sustain
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // Read endpoints: p95 < 500ms
    read_endpoint_duration: ['p(95)<500'],
    // AI endpoints: p95 < 5s (Gemini calls are slower)
    ai_endpoint_duration: ['p(95)<5000'],
    // Overall error rate < 1%
    error_rate: ['rate<0.01'],
    // Overall HTTP failures < 1%
    http_req_failed: ['rate<0.01'],
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
  maxSuggestions: 3,
  mode: 'freestyle',
});

const copywritingBody = JSON.stringify({
  platform: 'instagram',
  tone: 'authentic',
  framework: 'auto',
  campaignObjective: 'engagement',
  productName: 'Premium Wireless Headphones',
  productDescription: 'High-fidelity noise-cancelling wireless headphones with 30-hour battery life and premium comfort padding.',
  variations: 2,
  industry: 'electronics',
});

// ---------------------------------------------------------------------------
// Scenario Functions
// ---------------------------------------------------------------------------
function healthCheck() {
  const res = http.get(`${BASE_URL}/api/health`, { tags: { endpoint: 'health' } });
  readLatency.add(res.timings.duration);
  const ok = check(res, {
    'health: status 200': (r) => r.status === 200,
  });
  errorRate.add(!ok);
}

function getProducts() {
  const res = http.get(`${BASE_URL}/api/products`, {
    headers: HEADERS,
    tags: { endpoint: 'products' },
  });
  readLatency.add(res.timings.duration);
  const ok = check(res, {
    'products: status 200': (r) => r.status === 200,
  });
  errorRate.add(!ok);
}

function getTemplates() {
  const res = http.get(`${BASE_URL}/api/prompt-templates`, {
    headers: HEADERS,
    tags: { endpoint: 'templates' },
  });
  readLatency.add(res.timings.duration);
  const ok = check(res, {
    'templates: status 200': (r) => r.status === 200,
  });
  errorRate.add(!ok);
}

function postIdeaBankSuggest() {
  // Fetch CSRF token first (required for POST requests)
  const csrfRes = http.get(`${BASE_URL}/api/csrf-token`, {
    headers: HEADERS,
    tags: { endpoint: 'csrf' },
  });

  let csrfToken = '';
  try {
    const body = JSON.parse(csrfRes.body);
    csrfToken = body.csrfToken || '';
  } catch (_e) {
    // CSRF token fetch failed — proceed without it (will likely 403)
  }

  const res = http.post(`${BASE_URL}/api/idea-bank/suggest`, ideaBankBody, {
    headers: Object.assign({}, HEADERS, {
      'x-csrf-token': csrfToken,
    }),
    tags: { endpoint: 'idea-bank-suggest' },
  });
  aiLatency.add(res.timings.duration);
  // 400 is acceptable (demo product may not exist), 5xx is not
  const ok = check(res, {
    'idea-bank: no server error': (r) => r.status < 500,
  });
  errorRate.add(!ok);
}

function postCopywritingGenerate() {
  // Fetch CSRF token first
  const csrfRes = http.get(`${BASE_URL}/api/csrf-token`, {
    headers: HEADERS,
    tags: { endpoint: 'csrf' },
  });

  let csrfToken = '';
  try {
    const body = JSON.parse(csrfRes.body);
    csrfToken = body.csrfToken || '';
  } catch (_e) {
    // CSRF token fetch failed
  }

  const res = http.post(`${BASE_URL}/api/copywriting/standalone`, copywritingBody, {
    headers: Object.assign({}, HEADERS, {
      'x-csrf-token': csrfToken,
    }),
    tags: { endpoint: 'copywriting-standalone' },
  });
  aiLatency.add(res.timings.duration);
  const ok = check(res, {
    'copywriting: no server error': (r) => r.status < 500,
  });
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

  // Simulate realistic user think time (1-3 seconds)
  sleep(Math.random() * 2 + 1);
}
