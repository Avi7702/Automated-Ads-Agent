/**
 * Auth Flow Load Test — 50 Concurrent Users
 *
 * Validates the full authentication lifecycle under load:
 *   1. Register a new user (or handle "already exists")
 *   2. Login to get a session cookie
 *   3. Fetch CSRF token
 *   4. Make an authenticated POST request (idea-bank suggest)
 *   5. Verify session with GET /api/auth/me
 *   6. Logout
 *   7. Verify session is destroyed (GET /api/auth/me should fail)
 *
 * Run:
 *   k6 run load-tests/auth-flow.js
 *   k6 run --env BASE_URL=https://your-production-url load-tests/auth-flow.js
 */

import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom Metrics
// ---------------------------------------------------------------------------
const authLatency = new Trend('auth_flow_duration', true);
const loginLatency = new Trend('login_duration', true);
const authenticatedRequestLatency = new Trend('authenticated_request_duration', true);
const errorRate = new Rate('error_rate');
const sessionErrors = new Counter('session_errors');

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------
export const options = {
  stages: [
    { duration: '15s', target: 25 },   // Ramp up
    { duration: '2m', target: 50 },    // Hold at 50 concurrent auth flows
    { duration: '30s', target: 50 },   // Sustain
    { duration: '15s', target: 0 },    // Ramp down
  ],
  thresholds: {
    // Auth flow total duration < 3s at p95
    auth_flow_duration: ['p(95)<3000'],
    // Login specifically < 1s at p95
    login_duration: ['p(95)<1000'],
    // Authenticated requests < 2s at p95
    authenticated_request_duration: ['p(95)<2000'],
    // Error rate < 5% (some registration conflicts expected)
    error_rate: ['rate<0.05'],
    // Session management should not fail
    session_errors: ['count<5'],
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
// Main VU Function — Full Auth Lifecycle
// ---------------------------------------------------------------------------
export default function () {
  const vuId = __VU;
  const iterationId = __ITER;
  const uniqueEmail = `loadtest-vu${vuId}-iter${iterationId}@test.example.com`;
  const password = 'LoadTest!Secure#2025';

  const flowStart = Date.now();

  // -----------------------------------------------------------------------
  // Step 1: Register (or handle "already exists")
  // -----------------------------------------------------------------------
  group('1. Register', function () {
    // Fetch CSRF token for registration POST
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

    const registerBody = JSON.stringify({
      email: uniqueEmail,
      password: password,
    });

    const res = http.post(`${BASE_URL}/api/auth/register`, registerBody, {
      headers: Object.assign({}, HEADERS, { 'x-csrf-token': csrfToken }),
      tags: { endpoint: 'register' },
    });

    const ok = check(res, {
      'register: success or conflict': (r) => r.status === 200 || r.status === 409,
      'register: no server error': (r) => r.status < 500,
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  // -----------------------------------------------------------------------
  // Step 2: Login
  // -----------------------------------------------------------------------
  let loginSuccess = false;

  group('2. Login', function () {
    // Fresh CSRF token for login POST
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

    const loginBody = JSON.stringify({
      email: uniqueEmail,
      password: password,
    });

    const res = http.post(`${BASE_URL}/api/auth/login`, loginBody, {
      headers: Object.assign({}, HEADERS, { 'x-csrf-token': csrfToken }),
      tags: { endpoint: 'login' },
    });

    loginLatency.add(res.timings.duration);

    const ok = check(res, {
      'login: status 200': (r) => r.status === 200,
      'login: returns user data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id && body.email;
        } catch (_e) {
          return false;
        }
      },
    });

    loginSuccess = ok;
    errorRate.add(!ok);

    if (!ok) {
      sessionErrors.add(1);
    }
  });

  // If login failed, skip authenticated steps
  if (!loginSuccess) {
    authLatency.add(Date.now() - flowStart);
    sleep(1);
    return;
  }

  sleep(0.5);

  // -----------------------------------------------------------------------
  // Step 3: Fetch CSRF Token (authenticated session)
  // -----------------------------------------------------------------------
  let csrfToken = '';

  group('3. Get CSRF Token', function () {
    const res = http.get(`${BASE_URL}/api/csrf-token`, {
      headers: HEADERS,
      tags: { endpoint: 'csrf-authenticated' },
    });

    const ok = check(res, {
      'csrf: status 200': (r) => r.status === 200,
      'csrf: has token': (r) => {
        try {
          const body = JSON.parse(r.body);
          csrfToken = body.csrfToken || '';
          return csrfToken.length > 0;
        } catch (_e) {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  sleep(0.3);

  // -----------------------------------------------------------------------
  // Step 4: Make Authenticated Request
  // -----------------------------------------------------------------------
  group('4. Authenticated Request (Idea Bank)', function () {
    const ideaBankBody = JSON.stringify({
      productIds: ['demo-product-1'],
      userGoal: 'Test authenticated idea generation',
      enableWebSearch: false,
      maxSuggestions: 2,
      mode: 'freestyle',
    });

    const res = http.post(`${BASE_URL}/api/idea-bank/suggest`, ideaBankBody, {
      headers: Object.assign({}, HEADERS, { 'x-csrf-token': csrfToken }),
      tags: { endpoint: 'idea-bank-authenticated' },
    });

    authenticatedRequestLatency.add(res.timings.duration);

    // 400 is OK (product may not exist), only 5xx is a failure
    const ok = check(res, {
      'idea-bank: no server error': (r) => r.status < 500,
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  // -----------------------------------------------------------------------
  // Step 5: Verify Session (GET /api/auth/me)
  // -----------------------------------------------------------------------
  group('5. Verify Session', function () {
    const res = http.get(`${BASE_URL}/api/auth/me`, {
      headers: HEADERS,
      tags: { endpoint: 'auth-me' },
    });

    const ok = check(res, {
      'auth/me: status 200': (r) => r.status === 200,
      'auth/me: returns user data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.email === uniqueEmail;
        } catch (_e) {
          return false;
        }
      },
    });

    if (!ok) {
      sessionErrors.add(1);
    }
    errorRate.add(!ok);
  });

  sleep(0.3);

  // -----------------------------------------------------------------------
  // Step 6: Logout
  // -----------------------------------------------------------------------
  group('6. Logout', function () {
    // Need fresh CSRF for the logout POST
    const csrfRes = http.get(`${BASE_URL}/api/csrf-token`, {
      headers: HEADERS,
      tags: { endpoint: 'csrf' },
    });

    let logoutCsrf = '';
    try {
      const body = JSON.parse(csrfRes.body);
      logoutCsrf = body.csrfToken || '';
    } catch (_e) {
      // ignore
    }

    const res = http.post(`${BASE_URL}/api/auth/logout`, null, {
      headers: Object.assign({}, HEADERS, { 'x-csrf-token': logoutCsrf }),
      tags: { endpoint: 'logout' },
    });

    const ok = check(res, {
      'logout: status 200': (r) => r.status === 200,
      'logout: success true': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true;
        } catch (_e) {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  sleep(0.3);

  // -----------------------------------------------------------------------
  // Step 7: Verify Session Destroyed
  // -----------------------------------------------------------------------
  group('7. Verify Session Destroyed', function () {
    const res = http.get(`${BASE_URL}/api/auth/me`, {
      headers: HEADERS,
      tags: { endpoint: 'auth-me-post-logout' },
    });

    // After logout, /api/auth/me should return 200 with no user (unauthenticated)
    // or 401 depending on implementation. Both are valid.
    const ok = check(res, {
      'post-logout: session invalidated': (r) => {
        // If 401, session is clearly destroyed
        if (r.status === 401) return true;
        // If 200, check that user data is absent (unauthenticated response)
        if (r.status === 200) {
          try {
            const body = JSON.parse(r.body);
            return !body.email || body.email !== uniqueEmail;
          } catch (_e) {
            return true;
          }
        }
        return false;
      },
    });

    if (!ok) {
      sessionErrors.add(1);
    }
    errorRate.add(!ok);
  });

  authLatency.add(Date.now() - flowStart);
  sleep(1);
}
