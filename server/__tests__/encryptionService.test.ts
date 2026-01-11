
import {
  encryptApiKey,
  decryptApiKey,
  generateKeyPreview,
  validateMasterKeyConfigured,
  EncryptionConfigError,
  DecryptionError,
} from '../services/encryptionService';

// Test master key (32 bytes base64 encoded)
const TEST_MASTER_KEY = 'dGVzdGtleWZvckFFUzI1NmVuY3J5cHRpb24xMjM0NQ=='; // 32 bytes decoded

describe('Encryption Service', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Store original env value
    originalEnv = process.env.API_KEY_ENCRYPTION_KEY;
    // Set test key
    process.env.API_KEY_ENCRYPTION_KEY = TEST_MASTER_KEY;
  });

  afterEach(() => {
    // Restore original env value
    if (originalEnv !== undefined) {
      process.env.API_KEY_ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.API_KEY_ENCRYPTION_KEY;
    }
  });

  describe('encryptApiKey', () => {
    it('should encrypt a plaintext API key successfully', () => {
      const plaintext = 'AIzaSyC1234567890abcdefghijklmnopqrstuv';
      const encrypted = encryptApiKey(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();

      // All should be base64 encoded
      expect(() => Buffer.from(encrypted.ciphertext, 'base64')).not.toThrow();
      expect(() => Buffer.from(encrypted.iv, 'base64')).not.toThrow();
      expect(() => Buffer.from(encrypted.authTag, 'base64')).not.toThrow();
    });

    it('should produce different ciphertext for the same plaintext (unique IV)', () => {
      const plaintext = 'sk-proj-abc123xyz789';

      const encrypted1 = encryptApiKey(plaintext);
      const encrypted2 = encryptApiKey(plaintext);

      // IVs should be different (cryptographically random)
      expect(encrypted1.iv).not.toBe(encrypted2.iv);

      // Ciphertext should be different due to different IV
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);

      // Auth tags will also differ
      expect(encrypted1.authTag).not.toBe(encrypted2.authTag);
    });

    it('should throw on empty plaintext', () => {
      expect(() => encryptApiKey('')).toThrow('Plaintext must be a non-empty string');
    });

    it('should throw on null plaintext', () => {
      expect(() => encryptApiKey(null as unknown as string)).toThrow(
        'Plaintext must be a non-empty string'
      );
    });

    it('should throw on undefined plaintext', () => {
      expect(() => encryptApiKey(undefined as unknown as string)).toThrow(
        'Plaintext must be a non-empty string'
      );
    });

    it('should generate 12-byte IV (base64 encoded)', () => {
      const encrypted = encryptApiKey('test-api-key');
      const iv = Buffer.from(encrypted.iv, 'base64');
      expect(iv.length).toBe(12);
    });

    it('should generate 16-byte auth tag (base64 encoded)', () => {
      const encrypted = encryptApiKey('test-api-key');
      const authTag = Buffer.from(encrypted.authTag, 'base64');
      expect(authTag.length).toBe(16);
    });
  });

  describe('decryptApiKey', () => {
    it('should decrypt encrypted data back to original plaintext', () => {
      const plaintext = 'AIzaSyC1234567890abcdefghijklmnopqrstuv';
      const encrypted = encryptApiKey(plaintext);
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should correctly round-trip various API key formats', () => {
      const testKeys = [
        'AIzaSyC1234567890abcdefghijklmnopqrstuv', // Gemini
        'sk-proj-abc123xyz789def456uvw012ghi345jkl678', // OpenAI
        'cloudinary://123456789012345:abcdefghijklmnopqrstuvwx@cloudname', // Cloudinary
        'fc-1234567890abcdef1234567890abcdef', // Firecrawl
        'redis://user:password@localhost:6379/0', // Redis
        'special-chars-!@#$%^&*()_+-=[]{}|;:",./<>?', // Special characters
        'unicode-key-\u00e9\u00e8\u00ea\u00eb', // Unicode
        'a'.repeat(1000), // Very long key
      ];

      for (const key of testKeys) {
        const encrypted = encryptApiKey(key);
        const decrypted = decryptApiKey(encrypted);
        expect(decrypted).toBe(key);
      }
    });

    it('should throw DecryptionError when auth tag is invalid', () => {
      const plaintext = 'test-api-key';
      const encrypted = encryptApiKey(plaintext);

      // Tamper with the auth tag
      const tamperedAuthTag = Buffer.from(encrypted.authTag, 'base64');
      tamperedAuthTag[0] = (tamperedAuthTag[0] + 1) % 256;
      encrypted.authTag = tamperedAuthTag.toString('base64');

      expect(() => decryptApiKey(encrypted)).toThrow(DecryptionError);
      expect(() => decryptApiKey(encrypted)).toThrow(/tampered/i);
    });

    it('should throw DecryptionError when ciphertext is tampered', () => {
      const plaintext = 'test-api-key';
      const encrypted = encryptApiKey(plaintext);

      // Tamper with the ciphertext
      const tamperedCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
      tamperedCiphertext[0] = (tamperedCiphertext[0] + 1) % 256;
      encrypted.ciphertext = tamperedCiphertext.toString('base64');

      expect(() => decryptApiKey(encrypted)).toThrow(DecryptionError);
    });

    it('should throw DecryptionError when IV is wrong', () => {
      const plaintext = 'test-api-key';
      const encrypted = encryptApiKey(plaintext);

      // Replace with different IV (same length)
      encrypted.iv = Buffer.alloc(12).fill(0).toString('base64');

      expect(() => decryptApiKey(encrypted)).toThrow(DecryptionError);
    });

    it('should throw DecryptionError when missing ciphertext', () => {
      expect(() =>
        decryptApiKey({
          ciphertext: '',
          iv: 'AAAAAAAAAAAAAAAA',
          authTag: 'AAAAAAAAAAAAAAAAAAAAAA==',
        })
      ).toThrow(DecryptionError);
    });

    it('should throw DecryptionError when missing iv', () => {
      expect(() =>
        decryptApiKey({
          ciphertext: 'AAAA',
          iv: '',
          authTag: 'AAAAAAAAAAAAAAAAAAAAAA==',
        })
      ).toThrow(DecryptionError);
    });

    it('should throw DecryptionError when missing authTag', () => {
      expect(() =>
        decryptApiKey({
          ciphertext: 'AAAA',
          iv: 'AAAAAAAAAAAAAAAA',
          authTag: '',
        })
      ).toThrow(DecryptionError);
    });

    it('should throw DecryptionError when IV has wrong length', () => {
      const encrypted = encryptApiKey('test');
      encrypted.iv = Buffer.alloc(8).toString('base64'); // Wrong size (8 instead of 12)

      expect(() => decryptApiKey(encrypted)).toThrow(DecryptionError);
      expect(() => decryptApiKey(encrypted)).toThrow(/Invalid IV length/);
    });

    it('should throw DecryptionError when auth tag has wrong length', () => {
      const encrypted = encryptApiKey('test');
      encrypted.authTag = Buffer.alloc(8).toString('base64'); // Wrong size (8 instead of 16)

      expect(() => decryptApiKey(encrypted)).toThrow(DecryptionError);
      expect(() => decryptApiKey(encrypted)).toThrow(/Invalid auth tag length/);
    });
  });

  describe('Master Key Configuration', () => {
    it('should throw EncryptionConfigError when master key not configured', () => {
      delete process.env.API_KEY_ENCRYPTION_KEY;

      expect(() => encryptApiKey('test')).toThrow(EncryptionConfigError);
      expect(() => encryptApiKey('test')).toThrow(/not configured/);
    });

    it('should throw EncryptionConfigError for decrypt when master key not configured', () => {
      const encrypted = encryptApiKey('test');

      delete process.env.API_KEY_ENCRYPTION_KEY;

      expect(() => decryptApiKey(encrypted)).toThrow(EncryptionConfigError);
    });

    it('should throw EncryptionConfigError when master key is too short', () => {
      process.env.API_KEY_ENCRYPTION_KEY = 'tooshort';

      expect(() => encryptApiKey('test')).toThrow(EncryptionConfigError);
      expect(() => encryptApiKey('test')).toThrow(/at least 32 bytes/);
    });

    it('should accept a 32-byte raw string key', () => {
      // Exactly 32 ASCII characters
      process.env.API_KEY_ENCRYPTION_KEY = '12345678901234567890123456789012';

      const encrypted = encryptApiKey('test-key');
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe('test-key');
    });

    it('should accept a base64-encoded 32-byte key', () => {
      // 32 bytes base64 encoded
      process.env.API_KEY_ENCRYPTION_KEY = 'MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=';

      const encrypted = encryptApiKey('test-key');
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe('test-key');
    });

    it('should truncate keys longer than 32 bytes', () => {
      // 64 bytes raw - should use first 32
      process.env.API_KEY_ENCRYPTION_KEY =
        '12345678901234567890123456789012' + '99999999999999999999999999999999';

      const encrypted = encryptApiKey('test-key');
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe('test-key');
    });

    it('should fail to decrypt with wrong master key', () => {
      const encrypted = encryptApiKey('secret-api-key');

      // Change to a different valid key
      process.env.API_KEY_ENCRYPTION_KEY = 'differentkey12345678901234567890';

      expect(() => decryptApiKey(encrypted)).toThrow(DecryptionError);
    });
  });

  describe('generateKeyPreview', () => {
    it('should generate correct preview for standard API keys', () => {
      // Gemini key (39 chars) - first 4 + last 6
      expect(generateKeyPreview('AIzaSyC1234567890abcdefghijklmnopqrstuv')).toBe(
        'AIza...qrstuv'
      );

      // OpenAI key - first 4 + last 6
      expect(
        generateKeyPreview('sk-proj-abc123xyz789def456uvw012ghi345jkl678')
      ).toBe('sk-p...jkl678');
    });

    it('should show first 4 and last 6 characters', () => {
      const key = 'abcdefghijklmnopqrstuvwxyz';
      const preview = generateKeyPreview(key);

      expect(preview).toBe('abcd...uvwxyz');
      expect(preview.startsWith('abcd')).toBe(true);
      expect(preview.endsWith('uvwxyz')).toBe(true);
      expect(preview).toContain('...');
    });

    it('should handle short keys gracefully', () => {
      expect(generateKeyPreview('ab')).toBe('***');
      expect(generateKeyPreview('a')).toBe('***');
      expect(generateKeyPreview('abc')).toBe('a...c');
      expect(generateKeyPreview('abcdefghij')).toBe('a...j'); // 10 chars
    });

    it('should handle very short keys', () => {
      expect(generateKeyPreview('')).toBe('');
      expect(generateKeyPreview('a')).toBe('***');
      expect(generateKeyPreview('ab')).toBe('***');
    });

    it('should return empty string for null/undefined', () => {
      expect(generateKeyPreview(null as unknown as string)).toBe('');
      expect(generateKeyPreview(undefined as unknown as string)).toBe('');
    });

    it('should trim whitespace from key', () => {
      expect(generateKeyPreview('  AIzaSyC1234567890abcdef  ')).toBe(
        'AIza...abcdef'
      );
    });

    it('should handle keys with special characters', () => {
      const key = 'sk-!@#$%^&*()_+test123';
      const preview = generateKeyPreview(key);
      // First 4 chars + ... + last 6 chars
      expect(preview).toBe('sk-!...est123');
    });
  });

  describe('validateMasterKeyConfigured', () => {
    it('should return true when master key is configured', () => {
      expect(validateMasterKeyConfigured()).toBe(true);
    });

    it('should return false when master key is not set', () => {
      delete process.env.API_KEY_ENCRYPTION_KEY;
      expect(validateMasterKeyConfigured()).toBe(false);
    });

    it('should return false when master key is too short', () => {
      process.env.API_KEY_ENCRYPTION_KEY = 'short';
      expect(validateMasterKeyConfigured()).toBe(false);
    });

    it('should return false when master key is empty', () => {
      process.env.API_KEY_ENCRYPTION_KEY = '';
      expect(validateMasterKeyConfigured()).toBe(false);
    });
  });

  describe('Security Properties', () => {
    it('should not expose plaintext in encrypted output', () => {
      const secretKey = 'super-secret-api-key-12345';
      const encrypted = encryptApiKey(secretKey);

      // Encrypted output should not contain the plaintext
      const jsonOutput = JSON.stringify(encrypted);
      expect(jsonOutput).not.toContain(secretKey);
      expect(encrypted.ciphertext).not.toContain(secretKey);
    });

    it('should produce consistent decryption with same encrypted data', () => {
      const plaintext = 'consistent-test-key';
      const encrypted = encryptApiKey(plaintext);

      // Decrypt multiple times - should always return same result
      expect(decryptApiKey(encrypted)).toBe(plaintext);
      expect(decryptApiKey(encrypted)).toBe(plaintext);
      expect(decryptApiKey(encrypted)).toBe(plaintext);
    });

    it('should handle binary-like content in keys', () => {
      // Some keys might have base64 encoded parts that decode to binary
      const key = 'base64-key-' + Buffer.from([0x00, 0xff, 0x7f, 0x80]).toString('base64');
      const encrypted = encryptApiKey(key);
      const decrypted = decryptApiKey(encrypted);
      expect(decrypted).toBe(key);
    });
  });

  describe('Error Classes', () => {
    it('should have proper EncryptionConfigError properties', () => {
      const error = new EncryptionConfigError('Test message');
      expect(error.name).toBe('EncryptionConfigError');
      expect(error.message).toBe('Test message');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(EncryptionConfigError);
    });

    it('should have proper DecryptionError properties', () => {
      const error = new DecryptionError('Test message');
      expect(error.name).toBe('DecryptionError');
      expect(error.message).toBe('Test message');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DecryptionError);
    });
  });
});
