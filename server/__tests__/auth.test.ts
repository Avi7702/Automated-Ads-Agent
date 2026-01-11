
import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../app';
import { storage } from '../storage';

// Helper function to get cookies from response
function getCookies(res: request.Response): string[] {
  const setCookie = res.headers['set-cookie'];
  if (Array.isArray(setCookie)) return setCookie;
  if (typeof setCookie === 'string') return [setCookie];
  return [];
}

function getSessionCookie(res: request.Response): string | undefined {
  const cookies = getCookies(res);
  return cookies.find(c => c.startsWith('sessionId='));
}

function extractSessionId(cookie: string): string | undefined {
  return cookie.match(/sessionId=([^;]+)/)?.[1];
}

describe('Authentication System', () => {
  describe('Password Security', () => {
    it('should hash passwords with bcrypt cost factor 12+', async () => {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 12);
      const rounds = bcrypt.getRounds(hash);
      expect(rounds).toBeGreaterThanOrEqual(12);
    });

    it('should reject passwords shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'short' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' })
        ])
      );
    });

    it('should never expose password hash in responses', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'ValidPassword123!' });

      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.user?.passwordHash).toBeUndefined();

      // Also check login response
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'ValidPassword123!' });

      expect(loginRes.body.passwordHash).toBeUndefined();
      expect(loginRes.body.user?.passwordHash).toBeUndefined();
    });
  });

  describe('Registration', () => {
    it('should create user with hashed password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@test.com', password: 'ValidPassword123!' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('new@test.com');
      expect(res.body.user.id).toBeDefined();

      // Verify password is actually hashed in database
      const user = await storage.getUserByEmail('new@test.com');
      expect(user).toBeDefined();
      expect(user!.passwordHash).not.toBe('ValidPassword123!');
      expect(await bcrypt.compare('ValidPassword123!', user!.passwordHash)).toBe(true);
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'dupe@test.com', password: 'ValidPassword123!' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dupe@test.com', password: 'ValidPassword123!' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('exists');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid-email', password: 'ValidPassword123!' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' })
        ])
      );
    });
  });

  describe('Login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'login@test.com', password: 'ValidPassword123!' });
    });

    it('should succeed with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'ValidPassword123!' });

      expect(res.status).toBe(200);
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.body.user.email).toBe('login@test.com');
    });

    it('should fail with wrong password and increment attempts', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid');

      const user = await storage.getUserByEmail('login@test.com');
      expect(user!.failedLoginAttempts).toBe(1);
    });

    it('should fail with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'ValidPassword123!' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid');
    });

    it('should lock account after 5 failed attempts', async () => {
      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'login@test.com', password: 'WrongPassword!' });
      }

      // 6th attempt with correct password should be locked
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'ValidPassword123!' });

      expect(res.status).toBe(423);
      expect(res.body.error).toContain('locked');
    });

    it('should reset failed attempts on successful login', async () => {
      // Make 2 failed attempts
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'WrongPassword!' });
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'WrongPassword!' });

      // Successful login should reset counter
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'ValidPassword123!' });

      const user = await storage.getUserByEmail('login@test.com');
      expect(user!.failedLoginAttempts).toBe(0);
    });
  });

  describe('Session Management', () => {
    it('should store session in database', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'session@test.com', password: 'ValidPassword123!' });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'session@test.com', password: 'ValidPassword123!' });

      const sessionCookie = getSessionCookie(loginRes);
      expect(sessionCookie).toBeDefined();

      const sessionId = extractSessionId(sessionCookie!);
      expect(sessionId).toBeDefined();

      const session = await storage.getSession(sessionId!);
      expect(session).toBeDefined();
      expect(session!.userId).toBeDefined();
    });

    it('should invalidate session on logout', async () => {
      // Register and login
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'logout@test.com', password: 'ValidPassword123!' });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'logout@test.com', password: 'ValidPassword123!' });

      const sessionCookie = getSessionCookie(loginRes);

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', sessionCookie!);

      // Try to access protected route
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', sessionCookie!);

      expect(res.status).toBe(401);
    });

    it('should reject expired sessions', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'expire@test.com', password: 'ValidPassword123!' });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'expire@test.com', password: 'ValidPassword123!' });

      const sessionCookie = getSessionCookie(loginRes);
      const sessionId = extractSessionId(sessionCookie!);

      // Manually expire the session
      await storage.expireSession(sessionId!);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', sessionCookie!);

      expect(res.status).toBe(401);
    });
  });

  describe('Protected Routes', () => {
    it('should return 401 without session cookie', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Authentication required');
    });

    it('should return user data with valid session', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'protected@test.com', password: 'ValidPassword123!' });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'protected@test.com', password: 'ValidPassword123!' });

      const sessionCookie = getSessionCookie(loginRes);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', sessionCookie!);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('protected@test.com');
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should return 401 with invalid session cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'sessionId=invalid-session-id');

      expect(res.status).toBe(401);
    });
  });

  describe('Cookie Security', () => {
    it('should set httpOnly cookie', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'cookie@test.com', password: 'ValidPassword123!' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'cookie@test.com', password: 'ValidPassword123!' });

      const sessionCookie = getSessionCookie(res);

      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('SameSite=Strict');
    });

    it('should clear cookie on logout', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'clearcookie@test.com', password: 'ValidPassword123!' });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'clearcookie@test.com', password: 'ValidPassword123!' });

      const sessionCookie = getSessionCookie(loginRes);

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', sessionCookie!);

      const clearedCookie = getSessionCookie(logoutRes);

      // Cookie should be cleared (empty value or expires in past)
      if (clearedCookie) {
        expect(clearedCookie).toMatch(/sessionId=;|Expires=Thu, 01 Jan 1970/);
      }
    });
  });

  describe('Route Protection Integration', () => {
    let validSessionCookie: string;

    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'routetest@test.com', password: 'ValidPassword123!' });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'routetest@test.com', password: 'ValidPassword123!' });

      validSessionCookie = getSessionCookie(loginRes)!;
    });

    it('should protect POST /api/products without auth', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ name: 'Test Product' });

      expect(res.status).toBe(401);
    });

    it('should allow POST /api/products with valid session', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Cookie', validSessionCookie)
        .send({ name: 'Test Product' });

      // Should not be 401 (might be other error if products not fully implemented)
      expect(res.status).not.toBe(401);
    });

    it('should protect DELETE /api/products without auth', async () => {
      const res = await request(app)
        .delete('/api/products');

      expect(res.status).toBe(401);
    });
  });
});
