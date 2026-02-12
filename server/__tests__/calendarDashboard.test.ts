import request from 'supertest';
import { app } from '../app';

// Helper function to get cookies from response
function getCookies(res: request.Response): string[] {
  const setCookie = res.headers['set-cookie'];
  if (Array.isArray(setCookie)) return setCookie;
  if (typeof setCookie === 'string') return [setCookie];
  return [];
}

function getSessionCookie(res: request.Response): string | undefined {
  const cookies = getCookies(res);
  return cookies.find((c) => c.startsWith('sessionId='));
}

describe('GET /api/calendar/dashboard', () => {
  const testEmail = `dashboard-test-${Date.now()}@test.com`;
  const testPassword = 'ValidPassword123!';
  let sessionCookie: string;

  beforeAll(async () => {
    // Register and login to get a valid session
    await request(app).post('/api/auth/register').send({ email: testEmail, password: testPassword });

    const loginRes = await request(app).post('/api/auth/login').send({ email: testEmail, password: testPassword });

    sessionCookie = getSessionCookie(loginRes)!;
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/calendar/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid session cookie', async () => {
    const res = await request(app).get('/api/calendar/dashboard').set('Cookie', 'sessionId=invalid-session-id');

    expect(res.status).toBe(401);
  });

  it('returns stats object with all 4 fields', async () => {
    const res = await request(app).get('/api/calendar/dashboard').set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('stats');
    expect(res.body.stats).toHaveProperty('upcoming');
    expect(res.body.stats).toHaveProperty('publishing');
    expect(res.body.stats).toHaveProperty('published');
    expect(res.body.stats).toHaveProperty('failed');

    // All stat values should be numbers
    expect(typeof res.body.stats.upcoming).toBe('number');
    expect(typeof res.body.stats.publishing).toBe('number');
    expect(typeof res.body.stats.published).toBe('number');
    expect(typeof res.body.stats.failed).toBe('number');
  });

  it('returns recentActivity as array', async () => {
    const res = await request(app).get('/api/calendar/dashboard').set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('recentActivity');
    expect(Array.isArray(res.body.recentActivity)).toBe(true);
  });

  it('returns zero stats for user with no posts', async () => {
    // Fresh user registered in beforeAll has no posts
    const res = await request(app).get('/api/calendar/dashboard').set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.stats.upcoming).toBe(0);
    expect(res.body.stats.publishing).toBe(0);
    expect(res.body.stats.published).toBe(0);
    expect(res.body.stats.failed).toBe(0);
    expect(res.body.recentActivity).toHaveLength(0);
  });

  it('activity items include expected fields when present', async () => {
    const res = await request(app).get('/api/calendar/dashboard').set('Cookie', sessionCookie);

    expect(res.status).toBe(200);

    // If there are activity items, verify their shape
    if (res.body.recentActivity.length > 0) {
      const item = res.body.recentActivity[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('caption');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('platform');
      expect(item).toHaveProperty('scheduledFor');
      expect(item).toHaveProperty('updatedAt');
    }
  });
});
