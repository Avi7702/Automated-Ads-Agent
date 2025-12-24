import request from 'supertest';
import { registerSchema, loginSchema, productSchema, transformSchema } from '../validation/schemas';
import { validate } from '../middleware/validate';
import { Request, Response, NextFunction } from 'express';
import { app } from '../app';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('accepts valid registration data', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'ValidPassword123!'
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing email', () => {
      const result = registerSchema.safeParse({
        password: 'ValidPassword123!'
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format', () => {
      const result = registerSchema.safeParse({
        email: 'invalid-email',
        password: 'ValidPassword123!'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('email');
      }
    });

    it('rejects password under 8 chars', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'short'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('8');
      }
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login data', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'anypassword'
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'anypassword'
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: ''
      });
      expect(result.success).toBe(false);
    });
  });

  describe('productSchema', () => {
    it('accepts valid product with name only', () => {
      const result = productSchema.safeParse({
        name: 'Test Product'
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing name', () => {
      const result = productSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('accepts optional description', () => {
      const result = productSchema.safeParse({
        name: 'Test Product',
        description: 'A test product description'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('A test product description');
      }
    });
  });

  describe('transformSchema', () => {
    it('accepts valid transform request', () => {
      const result = transformSchema.safeParse({
        prompt: 'Generate a beautiful sunset image'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aspectRatio).toBe('1:1');
      }
    });

    it('rejects missing prompt', () => {
      const result = transformSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('prompt');
      }
    });

    it('accepts optional referenceImages', () => {
      const result = transformSchema.safeParse({
        prompt: 'Generate similar image',
        referenceImages: ['base64image1', 'base64image2']
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.referenceImages).toHaveLength(2);
      }
    });

    it('validates aspectRatio enum', () => {
      const result = transformSchema.safeParse({
        prompt: 'Generate landscape image',
        aspectRatio: '16:9'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aspectRatio).toBe('16:9');
      }
    });

    it('rejects invalid aspectRatio', () => {
      const result = transformSchema.safeParse({
        prompt: 'Generate image',
        aspectRatio: '2:1'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('aspectRatio');
      }
    });
  });
});

describe('Validation Middleware', () => {
  describe('validate', () => {
    const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    const createMockReq = (body: any): Partial<Request> => ({
      body
    });

    const createMockRes = (): Partial<Response> => ({
      status: mockStatus,
      json: mockJson
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls next() for valid data', () => {
      const req = createMockReq({ email: 'test@example.com', password: 'ValidPassword123!' });
      const res = createMockRes();

      const middleware = validate(registerSchema);
      middleware(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid data', () => {
      const req = createMockReq({ email: 'invalid', password: 'short' });
      const res = createMockRes();

      const middleware = validate(registerSchema);
      middleware(req as Request, res as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('includes field name in error', () => {
      const req = createMockReq({ password: 'ValidPassword123!' });
      const res = createMockRes();

      const middleware = validate(registerSchema);
      middleware(req as Request, res as Response, mockNext);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'email' })
          ])
        })
      );
    });

    it('includes error message in response', () => {
      const req = createMockReq({ email: 'test@example.com', password: 'short' });
      const res = createMockRes();

      const middleware = validate(registerSchema);
      middleware(req as Request, res as Response, mockNext);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({ message: expect.any(String) })
          ])
        })
      );
    });

    it('does not expose Zod internals', () => {
      const req = createMockReq({ email: 'invalid' });
      const res = createMockRes();

      const middleware = validate(registerSchema);
      middleware(req as Request, res as Response, mockNext);

      const jsonCall = mockJson.mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('issues');
      expect(jsonCall).not.toHaveProperty('name', 'ZodError');
    });
  });
});

describe('Route Validation', () => {
  describe('POST /api/auth/register', () => {
    it('returns 400 for invalid email', async () => {
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

    it('returns 400 for short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' })
        ])
      );
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 for empty body', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/products', () => {
    it('returns 400 for missing name', async () => {
      // First register and login to get auth
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'product-test@example.com', password: 'ValidPassword123!' });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'product-test@example.com', password: 'ValidPassword123!' });

      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/products')
        .set('Cookie', cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('accepts valid product with auth', async () => {
      // First register and login to get auth
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'product-valid@example.com', password: 'ValidPassword123!' });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'product-valid@example.com', password: 'ValidPassword123!' });

      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/products')
        .set('Cookie', cookies)
        .send({ name: 'Valid Product' });

      expect(res.status).toBe(201);
    });
  });
});
