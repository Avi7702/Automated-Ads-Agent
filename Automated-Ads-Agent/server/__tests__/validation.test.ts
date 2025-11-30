import { registerSchema, loginSchema, productSchema } from '../validation/schemas';

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
