import { registerSchema, loginSchema, productSchema } from '../validation/schemas';
import { validate } from '../middleware/validate';
import { Request, Response, NextFunction } from 'express';

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
