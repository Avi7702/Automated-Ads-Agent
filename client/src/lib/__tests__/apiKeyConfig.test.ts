/**
 * Tests for lib/apiKeyConfig.ts
 * - SERVICE_CONFIG structure
 * - Pattern validation for each service
 * - SUPPORTED_SERVICES list
 */
import { describe, it, expect } from 'vitest';
import { SERVICE_CONFIG, SUPPORTED_SERVICES } from '../apiKeyConfig';

describe('SERVICE_CONFIG', () => {
  it('contains all supported services', () => {
    expect(SERVICE_CONFIG).toHaveProperty('gemini');
    expect(SERVICE_CONFIG).toHaveProperty('cloudinary');
    expect(SERVICE_CONFIG).toHaveProperty('firecrawl');
    expect(SERVICE_CONFIG).toHaveProperty('redis');
  });

  it('each service has required fields', () => {
    for (const [key, config] of Object.entries(SERVICE_CONFIG)) {
      expect(config.displayName, `${key} missing displayName`).toBeTruthy();
      expect(config.docsUrl, `${key} missing docsUrl`).toBeTruthy();
      expect(config.description, `${key} missing description`).toBeTruthy();
      expect(Array.isArray(config.fields), `${key} fields not array`).toBe(true);
      expect(config.fields.length, `${key} has no fields`).toBeGreaterThan(0);
    }
  });

  describe('gemini', () => {
    const { pattern } = SERVICE_CONFIG['gemini']!;

    it('accepts valid Gemini API key (39 chars, AIza prefix)', () => {
      // Pattern: ^AIza[a-zA-Z0-9_-]{35}$ = 4 + 35 = 39 total chars
      const validKey = 'AIza' + 'A'.repeat(35);
      expect(pattern!.test(validKey)).toBe(true);
    });

    it('rejects key not starting with AIza', () => {
      expect(pattern!.test('sk-abcdefghijklmnopqrstuvwxyz12345678')).toBe(false);
    });

    it('rejects short key', () => {
      expect(pattern!.test('AIzaShort')).toBe(false);
    });

    it('has correct displayName', () => {
      expect(SERVICE_CONFIG['gemini']!.displayName).toBe('Google Gemini');
    });
  });

  describe('cloudinary', () => {
    const cloudinaryKey = SERVICE_CONFIG['cloudinary']!;
    const apiKeyField = cloudinaryKey.fields.find((f) => f.name === 'apiKey');

    it('has cloudName, apiKey, apiSecret fields', () => {
      const fieldNames = cloudinaryKey.fields.map((f) => f.name);
      expect(fieldNames).toContain('cloudName');
      expect(fieldNames).toContain('apiKey');
      expect(fieldNames).toContain('apiSecret');
    });

    it('apiKey field accepts 15-digit number', () => {
      expect(apiKeyField!.pattern!.test('123456789012345')).toBe(true);
    });

    it('apiKey field rejects non-15-digit string', () => {
      expect(apiKeyField!.pattern!.test('12345')).toBe(false);
      expect(apiKeyField!.pattern!.test('1234567890123456')).toBe(false);
    });
  });

  describe('firecrawl', () => {
    const { pattern } = SERVICE_CONFIG['firecrawl']!;

    it('accepts valid Firecrawl key', () => {
      expect(pattern!.test('fc-abcdefghijklmnopqrstu')).toBe(true);
    });

    it('rejects key not starting with fc-', () => {
      expect(pattern!.test('pk-abcdefghijklmnopqrstu')).toBe(false);
    });

    it('rejects too-short key', () => {
      expect(pattern!.test('fc-short')).toBe(false);
    });
  });

  describe('redis', () => {
    const { pattern } = SERVICE_CONFIG['redis']!;

    it('accepts standard redis URL', () => {
      expect(pattern!.test('redis://default:password@host:6379')).toBe(true);
    });

    it('accepts rediss (TLS) URL', () => {
      expect(pattern!.test('rediss://default:password@host:6380')).toBe(true);
    });

    it('rejects non-redis URL', () => {
      expect(pattern!.test('http://example.com')).toBe(false);
      expect(pattern!.test('postgres://user:pass@host')).toBe(false);
    });
  });
});

describe('SUPPORTED_SERVICES', () => {
  it('contains exactly 4 services', () => {
    expect(SUPPORTED_SERVICES).toHaveLength(4);
  });

  it('includes gemini, cloudinary, firecrawl, redis', () => {
    expect(SUPPORTED_SERVICES).toContain('gemini');
    expect(SUPPORTED_SERVICES).toContain('cloudinary');
    expect(SUPPORTED_SERVICES).toContain('firecrawl');
    expect(SUPPORTED_SERVICES).toContain('redis');
  });

  it('all supported services exist in SERVICE_CONFIG', () => {
    for (const service of SUPPORTED_SERVICES) {
      expect(SERVICE_CONFIG).toHaveProperty(service);
    }
  });
});
