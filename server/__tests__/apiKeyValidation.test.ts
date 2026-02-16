

// ============================================
// MOCK SETUP
// ============================================

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock ioredis
const mockRedisInstance = {
  connect: vi.fn(),
  ping: vi.fn(),
  info: vi.fn(),
  quit: vi.fn(),
  disconnect: vi.fn(),
};

// Create a proper constructor mock for ioredis
vi.mock('ioredis', () => {
  // Must be a class/constructor to work with `new Redis(...)`
  const MockRedis = function(this: typeof mockRedisInstance) {
    Object.assign(this, mockRedisInstance);
    return this;
  } as unknown as new () => typeof mockRedisInstance;
  return { default: MockRedis };
});

// Import after mocks
import {
  validateKeyFormat,
  validateCloudinaryFormat,
  validateApiKey,
  getServiceDocsUrl,
  getSupportedServices,
  isValidService,
  type ServiceName,
  type CloudinaryParams,
} from '../services/apiKeyValidationService';

// ============================================
// TEST DATA
// ============================================

const VALID_KEYS = {
  gemini: 'AIzaSyBcdefghijklmnopqrstuvwxyz1234567890',
  firecrawl: 'fc-abcdefghij1234567890abcdefghij',
  redis: 'redis://user:password@localhost:6379/0',
  redisTls: 'rediss://user:password@redis.example.com:6380',
};

const INVALID_KEYS = {
  gemini: 'sk-invalid-key-format',
  firecrawl: 'invalid-key-no-prefix',
  redis: 'not-a-redis-url',
};

const VALID_CLOUDINARY: CloudinaryParams = {
  cloudName: 'my-cloud',
  apiKey: '123456789012345',
  apiSecret: 'abcdefghijklmnopqrstuvwxyz12',
};

// ============================================
// FORMAT VALIDATION TESTS
// ============================================

describe('API Key Format Validation', () => {
  describe('validateKeyFormat', () => {
    describe('Gemini', () => {
      it('should accept valid Gemini key format', () => {
        const result = validateKeyFormat('gemini', VALID_KEYS.gemini);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should reject key not starting with AIza', () => {
        const result = validateKeyFormat('gemini', 'sk-invalid');
        expect(result.valid).toBe(false);
        expect(result.error).toContain("start with 'AIza'");
      });

      it('should reject empty key', () => {
        const result = validateKeyFormat('gemini', '');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('cannot be empty');
      });

      it('should reject key with only whitespace', () => {
        const result = validateKeyFormat('gemini', '   ');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('cannot be empty');
      });

      it('should handle key with surrounding whitespace', () => {
        // Keys with valid content but wrapped in whitespace should work
        const keyWithSpaces = `  ${VALID_KEYS.gemini}  `;
        const result = validateKeyFormat('gemini', keyWithSpaces);
        // The format check trims, so this should pass format validation
        expect(result.valid).toBe(true);
      });
    });

    describe('Firecrawl', () => {
      it('should accept valid Firecrawl key format', () => {
        const result = validateKeyFormat('firecrawl', VALID_KEYS.firecrawl);
        expect(result.valid).toBe(true);
      });

      it('should reject key not starting with fc-', () => {
        const result = validateKeyFormat('firecrawl', INVALID_KEYS.firecrawl);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("start with 'fc-'");
      });
    });

    describe('Redis', () => {
      it('should accept redis:// URL format', () => {
        const result = validateKeyFormat('redis', VALID_KEYS.redis);
        expect(result.valid).toBe(true);
      });

      it('should accept rediss:// URL format (TLS)', () => {
        const result = validateKeyFormat('redis', VALID_KEYS.redisTls);
        expect(result.valid).toBe(true);
      });

      it('should reject non-redis URL', () => {
        const result = validateKeyFormat('redis', INVALID_KEYS.redis);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("redis://");
      });
    });

    describe('Unknown service', () => {
      it('should reject unknown service', () => {
        const result = validateKeyFormat('unknown' as ServiceName, 'any-key');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Unknown service');
      });
    });
  });

  describe('validateCloudinaryFormat', () => {
    it('should accept valid Cloudinary credentials', () => {
      const result = validateCloudinaryFormat(VALID_CLOUDINARY);
      expect(result.valid).toBe(true);
    });

    it('should reject missing cloud name', () => {
      const result = validateCloudinaryFormat({
        ...VALID_CLOUDINARY,
        cloudName: '',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cloud name');
    });

    it('should reject missing API key', () => {
      const result = validateCloudinaryFormat({
        ...VALID_CLOUDINARY,
        apiKey: '',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('API key');
    });

    it('should reject missing API secret', () => {
      const result = validateCloudinaryFormat({
        ...VALID_CLOUDINARY,
        apiSecret: '',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('API secret');
    });

    it('should reject invalid cloud name format', () => {
      const result = validateCloudinaryFormat({
        ...VALID_CLOUDINARY,
        cloudName: 'invalid cloud name!',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cloud name');
    });

    it('should reject non-numeric API key', () => {
      const result = validateCloudinaryFormat({
        ...VALID_CLOUDINARY,
        apiKey: 'not-numeric',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('15-20 digits');
    });

    it('should reject too short API secret', () => {
      const result = validateCloudinaryFormat({
        ...VALID_CLOUDINARY,
        apiSecret: 'short',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('secret');
    });
  });
});

// ============================================
// API VALIDATION TESTS
// ============================================

describe('API Key Validation (with API calls)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockRedisInstance.connect.mockReset();
    mockRedisInstance.ping.mockReset();
    mockRedisInstance.info.mockReset();
    mockRedisInstance.quit.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Gemini Validation', () => {
    it('should return valid for successful API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [{ name: 'gemini-pro' }] }),
      });

      const result = await validateApiKey('gemini', VALID_KEYS.gemini);
      expect(result.valid).toBe(true);
      expect(result.details?.modelsAvailable).toBe(1);
    });

    it('should return invalid for 401 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
      });

      const result = await validateApiKey('gemini', VALID_KEYS.gemini);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_KEY');
      expect(result.solution).toContain('aistudio.google.com');
    });

    it('should return invalid for 403 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({ error: { message: 'API not enabled' } }),
      });

      const result = await validateApiKey('gemini', VALID_KEYS.gemini);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INSUFFICIENT_PERMISSIONS');
      expect(result.solution).toContain('Generative Language API');
    });

    it('should handle 429 rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({}),
      });

      const result = await validateApiKey('gemini', VALID_KEYS.gemini);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('RATE_LIMITED');
      expect(result.solution).toContain('60 seconds');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await validateApiKey('gemini', VALID_KEYS.gemini);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('SERVICE_UNAVAILABLE');
      expect(result.error).toContain('Could not reach');
    });

    it('should reject invalid format before API call', async () => {
      const result = await validateApiKey('gemini', INVALID_KEYS.gemini);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_FORMAT');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Cloudinary Validation', () => {
    it('should return valid for successful API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ resources: [] }),
      });

      const result = await validateApiKey('cloudinary', '', {
        cloudName: VALID_CLOUDINARY.cloudName,
        apiKey: VALID_CLOUDINARY.apiKey,
        apiSecret: VALID_CLOUDINARY.apiSecret,
      });

      expect(result.valid).toBe(true);
      expect(result.details?.cloudName).toBe(VALID_CLOUDINARY.cloudName);
    });

    it('should return invalid for 401 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid credentials' } }),
      });

      const result = await validateApiKey('cloudinary', '', {
        cloudName: VALID_CLOUDINARY.cloudName,
        apiKey: VALID_CLOUDINARY.apiKey,
        apiSecret: VALID_CLOUDINARY.apiSecret,
      });

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_KEY');
    });

    it('should return invalid for 404 (cloud not found)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({}),
      });

      const result = await validateApiKey('cloudinary', '', {
        cloudName: 'nonexistent-cloud',
        apiKey: VALID_CLOUDINARY.apiKey,
        apiSecret: VALID_CLOUDINARY.apiSecret,
      });

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_KEY');
      expect(result.error).toContain('not found');
    });

    it('should reject missing params', async () => {
      const result = await validateApiKey('cloudinary', '', {});
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_FORMAT');
    });
  });

  describe('Firecrawl Validation', () => {
    it('should return valid for successful API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await validateApiKey('firecrawl', VALID_KEYS.firecrawl);
      expect(result.valid).toBe(true);
    });

    it('should return valid for 402 (payment required but key valid)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 402,
        statusText: 'Payment Required',
        json: () => Promise.resolve({ error: 'Credits exhausted' }),
      });

      const result = await validateApiKey('firecrawl', VALID_KEYS.firecrawl);
      // 402 means key is valid but account needs credits
      expect(result.valid).toBe(true);
      expect(result.details?.warning).toContain('credits');
    });

    it('should return invalid for 401 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Invalid API key' }),
      });

      const result = await validateApiKey('firecrawl', VALID_KEYS.firecrawl);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_KEY');
      expect(result.solution).toContain('firecrawl.dev');
    });
  });

  describe('Redis Validation', () => {
    it('should return valid for successful PING', async () => {
      mockRedisInstance.connect.mockResolvedValueOnce(undefined);
      mockRedisInstance.ping.mockResolvedValueOnce('PONG');
      mockRedisInstance.info.mockResolvedValueOnce('redis_version:7.0.0\r\n');
      mockRedisInstance.quit.mockResolvedValueOnce(undefined);

      const result = await validateApiKey('redis', VALID_KEYS.redis);
      expect(result.valid).toBe(true);
      expect(result.details?.redisVersion).toBe('7.0.0');
      expect(result.details?.pingResponse).toBe('PONG');
    });

    it('should return invalid for auth failure', async () => {
      mockRedisInstance.connect.mockRejectedValueOnce(new Error('NOAUTH Authentication required'));

      const result = await validateApiKey('redis', VALID_KEYS.redis);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_KEY');
      expect(result.error).toContain('authentication');
    });

    it('should return invalid for connection refused', async () => {
      mockRedisInstance.connect.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

      const result = await validateApiKey('redis', VALID_KEYS.redis);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('CONNECTION_FAILED');
      expect(result.solution).toContain('host and port');
    });

    it('should return invalid for host not found', async () => {
      mockRedisInstance.connect.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));

      const result = await validateApiKey('redis', VALID_KEYS.redis);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('CONNECTION_FAILED');
      expect(result.error).toContain('not found');
    });

    it('should return invalid for timeout', async () => {
      mockRedisInstance.connect.mockRejectedValueOnce(new Error('connect ETIMEDOUT'));

      const result = await validateApiKey('redis', VALID_KEYS.redis);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('SERVICE_UNAVAILABLE');
      expect(result.error).toContain('timed out');
    });

    it('should return invalid for TLS errors', async () => {
      mockRedisInstance.connect.mockRejectedValueOnce(new Error('TLS handshake failed'));

      const result = await validateApiKey('redis', VALID_KEYS.redisTls);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('CONNECTION_FAILED');
      expect(result.solution).toContain("rediss://");
    });

    it('should reject invalid URL format', async () => {
      const result = await validateApiKey('redis', INVALID_KEYS.redis);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_FORMAT');
    });
  });
});

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('Utility Functions', () => {
  describe('getServiceDocsUrl', () => {
    it('should return correct URL for gemini', () => {
      expect(getServiceDocsUrl('gemini')).toContain('aistudio.google.com');
    });

    it('should return correct URL for cloudinary', () => {
      expect(getServiceDocsUrl('cloudinary')).toContain('cloudinary.com');
    });

    it('should return correct URL for firecrawl', () => {
      expect(getServiceDocsUrl('firecrawl')).toContain('firecrawl.dev');
    });

    it('should return correct URL for redis', () => {
      expect(getServiceDocsUrl('redis')).toContain('redis.io');
    });
  });

  describe('getSupportedServices', () => {
    it('should return all supported services', () => {
      const services = getSupportedServices();
      expect(services).toContain('gemini');
      expect(services).toContain('cloudinary');
      expect(services).toContain('firecrawl');
      expect(services).toContain('redis');
      expect(services.length).toBe(4);
    });
  });

  describe('isValidService', () => {
    it('should return true for valid service names', () => {
      expect(isValidService('gemini')).toBe(true);
      expect(isValidService('cloudinary')).toBe(true);
      expect(isValidService('firecrawl')).toBe(true);
      expect(isValidService('redis')).toBe(true);
    });

    it('should return false for invalid service names', () => {
      expect(isValidService('unknown')).toBe(false);
      expect(isValidService('openai')).toBe(false);
      expect(isValidService('')).toBe(false);
    });
  });
});

// ============================================
// EDGE CASE TESTS
// ============================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should handle key with extra whitespace', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ models: [] }),
    });

    const keyWithSpaces = `  ${VALID_KEYS.gemini}  `;
    const result = await validateApiKey('gemini', keyWithSpaces);

    expect(result.valid).toBe(true);
    // Verify the API was called with trimmed key
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(VALID_KEYS.gemini.trim()),
      expect.any(Object)
    );
  });

  it('should handle JSON parse errors in error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('Invalid JSON')),
    });

    const result = await validateApiKey('gemini', VALID_KEYS.gemini);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('SERVICE_UNAVAILABLE');
  });

  it('should handle Cloudinary with spaces in values', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ resources: [] }),
    });

    const result = await validateApiKey('cloudinary', '', {
      cloudName: '  my-cloud  ',
      apiKey: '  123456789012345  ',
      apiSecret: '  abcdefghijklmnopqrstuvwxyz12  ',
    });

    expect(result.valid).toBe(true);
  });
});

// ============================================
// ERROR MESSAGE QUALITY TESTS
// ============================================

describe('Error Message Quality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should provide actionable solution for invalid Gemini key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({}),
    });

    const result = await validateApiKey('gemini', VALID_KEYS.gemini);
    expect(result.solution).toBeDefined();
    expect(result.solution).toContain('http');
    expect(result.solution?.length).toBeGreaterThan(20);
  });

  it('should provide actionable solution for rate limiting', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: () => Promise.resolve({}),
    });

    const result = await validateApiKey('gemini', VALID_KEYS.gemini);
    expect(result.solution).toBeDefined();
    expect(result.solution).toContain('60 seconds');
  });

  it('should provide actionable solution for service unavailable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await validateApiKey('gemini', VALID_KEYS.gemini);
    expect(result.solution).toBeDefined();
    expect(result.solution).toContain('network');
  });
});
