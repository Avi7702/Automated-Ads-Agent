/**
 * Soak Load Test — 50 Users for 30 Minutes
 *
 * Validates system stability over an extended period:
 *   - Memory stability (no leaks)
 *   - Response time drift — p95 should stay under 1s throughout
 *   - Connection pool health — no exhaustion over time
 *   - No gradual degradation patterns
 *
 * Run:
 *   k6 run load-tests/soak.js
 *   k6 run --env BASE_URL=https://your-production-url load-tests/soak.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom Metrics
// ---------------------------------------------------------------------------
const readLatency = new Trend('read_endpoint_duration', true);
const aiLatency = new Trend('ai_endpoint_duration', true);
const errorRate = new Rate('error_rate');
const healthResponseTime = new Trend('health_response_time', true);

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------
export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Ramp up to 50 users
    { duration: '26m', target: 50 },   // Hold at 50 for 26 minutes
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // p95 must stay under 1s for all reads throughout the entire test
    read_endpoint_duration: ['p(95)<1000'],
    // AI endpoints: p95 < 8s (generous for sustained load)
    ai_endpoint_duration: ['p(95)<8000'],
    // Error rate < 1%
    error_rate: ['rate<0.01'],
    // Health endpoint should always be fast (canary for degradation)
    health_response_time: ['p(99)<200'],
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
  userGoal: 'Generate ad ideas for a long-running brand awareness campaign',
  enableWebSearch: false,
  maxSuggestions: 3,
  mode: 'freestyle',
});

const copywritingBody = JSON.stringify({
  platform: 'linkedin',
  tone: 'professional',
  framework: 'aida',
  campaignObjective: 'awareness',
  productName: 'Enterprise SaaS Platform',
  productDescription: 'All-in-one project management solution for teams of 50+, featuring real-time collaboration and AI-powered insights.',
  variations: 2,
  industry: 'technology',
});

// ---------------------------------------------------------------------------
// Scenario Functions
// ---------------------------------------------------------------------------
function healthCheck() {
  const res = http.get(`${BASE_URL}/api/health`, { tags: { endpoint: 'health' } });
  readLatency.add(res.timings.duration);
  healthResponseTime.add(res.timings.duration);
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
  const ok = check(res, {
    'idea-bank: no server error': (r) => r.status < 500,
  });
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

  // Normal user think time (2-5 seconds) for sustained load
  sleep(Math.random() * 3 + 2);
}
