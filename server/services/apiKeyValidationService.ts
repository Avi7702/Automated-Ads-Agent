/**
 * API Key Validation Service
 *
 * Validates API keys against external services before storing them.
 * Provides both quick format validation and full API validation.
 *
 * Supported services:
 * - Gemini (Google AI)
 * - Cloudinary
 * - Firecrawl
 * - Redis
 */

import Redis from 'ioredis';

// ============================================
// TYPES
// ============================================

export type ServiceName = 'gemini' | 'cloudinary' | 'firecrawl' | 'redis';

export type ErrorCode =
  | 'INVALID_FORMAT'
  | 'INVALID_KEY'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'MISSING_PARAMS'
  | 'CONNECTION_FAILED';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: ErrorCode;
  solution?: string;
  details?: Record<string, unknown>;
}

export interface FormatValidationResult {
  valid: boolean;
  error?: string;
}

// Service-specific validation options
export interface CloudinaryParams {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

// ============================================
// FORMAT VALIDATION PATTERNS
// ============================================

const FORMAT_PATTERNS: Record<ServiceName, RegExp> = {
  // Gemini API keys start with 'AIza' and are ~39 characters
  gemini: /^AIza[a-zA-Z0-9_-]{35,40}$/,

  // Cloudinary API keys are 15-20 alphanumeric characters
  cloudinary: /^[a-zA-Z0-9]{15,20}$/,

  // Firecrawl API keys start with 'fc-'
  firecrawl: /^fc-[a-zA-Z0-9_-]{20,50}$/,

  // Redis URLs start with redis:// or rediss://
  redis: /^rediss?:\/\/.+/,
};

const FORMAT_ERROR_MESSAGES: Record<ServiceName, { error: string; solution: string }> = {
  gemini: {
    error: "Invalid Gemini API key format. Keys should start with 'AIza'.",
    solution: "Get a valid Gemini API key at https://aistudio.google.com/apikey",
  },
  cloudinary: {
    error: "Invalid Cloudinary API key format. Keys should be 15-20 alphanumeric characters.",
    solution: "Find your API credentials at https://console.cloudinary.com/settings/api-keys",
  },
  firecrawl: {
    error: "Invalid Firecrawl API key format. Keys should start with 'fc-'.",
    solution: "Get your API key at https://app.firecrawl.dev/api-keys",
  },
  redis: {
    error: "Invalid Redis URL format. Should start with 'redis://' or 'rediss://'.",
    solution: "Use format: redis://[[username:]password@]host[:port][/database] or rediss:// for TLS",
  },
};

// ============================================
// SERVICE DOCUMENTATION URLS
// ============================================

const SERVICE_DOCS: Record<ServiceName, string> = {
  gemini: 'https://aistudio.google.com/apikey',
  cloudinary: 'https://console.cloudinary.com/settings/api-keys',
  firecrawl: 'https://app.firecrawl.dev/api-keys',
  redis: 'https://redis.io/docs/connect/',
};

// ============================================
// FORMAT VALIDATION (Quick, no API call)
// ============================================

/**
 * Validates the format of an API key without making API calls.
 * Use this for quick client-side validation before submission.
 */
export function validateKeyFormat(service: ServiceName, key: string): FormatValidationResult {
  // Trim whitespace (common copy-paste issue)
  const trimmedKey = key.trim();

  if (!trimmedKey) {
    return {
      valid: false,
      error: `${service} key cannot be empty`,
    };
  }

  const pattern = FORMAT_PATTERNS[service];
  if (!pattern) {
    return {
      valid: false,
      error: `Unknown service: ${service}`,
    };
  }

  if (!pattern.test(trimmedKey)) {
    const errorInfo = FORMAT_ERROR_MESSAGES[service];
    return {
      valid: false,
      error: errorInfo.error,
    };
  }

  return { valid: true };
}

/**
 * Validates Cloudinary credentials format (all three required)
 */
export function validateCloudinaryFormat(params: CloudinaryParams): FormatValidationResult {
  const { cloudName, apiKey, apiSecret } = params;

  if (!cloudName?.trim()) {
    return {
      valid: false,
      error: "Cloud name is required",
    };
  }

  if (!apiKey?.trim()) {
    return {
      valid: false,
      error: "API key is required",
    };
  }

  if (!apiSecret?.trim()) {
    return {
      valid: false,
      error: "API secret is required",
    };
  }

  // Cloud name: alphanumeric with hyphens and underscores
  if (!/^[a-z0-9_-]+$/i.test(cloudName.trim())) {
    return {
      valid: false,
      error: "Invalid cloud name format",
    };
  }

  // API key: numeric, typically 15 digits
  if (!/^\d{15,20}$/.test(apiKey.trim())) {
    return {
      valid: false,
      error: "Invalid API key format. Should be 15-20 digits.",
    };
  }

  // API secret: alphanumeric with some special chars
  if (!/^[a-zA-Z0-9_-]{20,40}$/.test(apiSecret.trim())) {
    return {
      valid: false,
      error: "Invalid API secret format",
    };
  }

  return { valid: true };
}

// ============================================
// API VALIDATION (Full validation with API call)
// ============================================

/**
 * Validates an API key by making a test request to the service.
 * Returns detailed error information with actionable solutions.
 *
 * @param service - The service to validate (gemini, cloudinary, firecrawl, redis)
 * @param key - The API key or connection string to validate
 * @param additionalParams - Additional parameters needed (e.g., cloudName for Cloudinary)
 */
export async function validateApiKey(
  service: ServiceName,
  key: string,
  additionalParams?: Record<string, string>
): Promise<ValidationResult> {
  // Trim whitespace from key
  const trimmedKey = key.trim();

  // First, validate format
  if (service === 'cloudinary' && additionalParams) {
    const formatResult = validateCloudinaryFormat({
      cloudName: additionalParams.cloudName || '',
      apiKey: additionalParams.apiKey || trimmedKey,
      apiSecret: additionalParams.apiSecret || '',
    });
    if (!formatResult.valid) {
      return {
        valid: false,
        error: formatResult.error,
        errorCode: 'INVALID_FORMAT',
        solution: FORMAT_ERROR_MESSAGES.cloudinary.solution,
      };
    }
  } else {
    const formatResult = validateKeyFormat(service, trimmedKey);
    if (!formatResult.valid) {
      return {
        valid: false,
        error: formatResult.error,
        errorCode: 'INVALID_FORMAT',
        solution: FORMAT_ERROR_MESSAGES[service]?.solution || `Check your ${service} key`,
      };
    }
  }

  // Validate with the appropriate service
  switch (service) {
    case 'gemini':
      return validateGeminiKey(trimmedKey);
    case 'cloudinary':
      return validateCloudinaryCredentials(additionalParams as unknown as CloudinaryParams);
    case 'firecrawl':
      return validateFirecrawlKey(trimmedKey);
    case 'redis':
      return validateRedisConnection(trimmedKey);
    default:
      return {
        valid: false,
        error: `Unknown service: ${service}`,
        errorCode: 'INVALID_FORMAT',
      };
  }
}

// ============================================
// GEMINI VALIDATION
// ============================================

async function validateGeminiKey(apiKey: string): Promise<ValidationResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        details: {
          modelsAvailable: data.models?.length || 0,
        },
      };
    }

    // Handle specific error codes
    const status = response.status;
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage = errorBody.error?.message || response.statusText;

    switch (status) {
      case 400:
        return {
          valid: false,
          error: `Invalid request: ${errorMessage}`,
          errorCode: 'INVALID_KEY',
          solution: "Your API key appears malformed. Generate a new key at https://aistudio.google.com/apikey",
        };
      case 401:
        return {
          valid: false,
          error: "API key is invalid or has been revoked",
          errorCode: 'INVALID_KEY',
          solution: "Generate a new API key at https://aistudio.google.com/apikey",
        };
      case 403:
        return {
          valid: false,
          error: "API key lacks required permissions or the API is not enabled",
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          solution: "Enable the Generative Language API in Google Cloud Console and ensure your key has access",
          details: { originalError: errorMessage },
        };
      case 429:
        return {
          valid: false,
          error: "Rate limited during validation. Key may still be valid.",
          errorCode: 'RATE_LIMITED',
          solution: "Wait 60 seconds and try again. The key might be valid but rate limited.",
        };
      default:
        return {
          valid: false,
          error: `Unexpected error (${status}): ${errorMessage}`,
          errorCode: 'SERVICE_UNAVAILABLE',
          solution: `Could not verify key. Check https://status.cloud.google.com for service status.`,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      valid: false,
      error: `Could not reach Gemini API: ${errorMessage}`,
      errorCode: 'SERVICE_UNAVAILABLE',
      solution: "Check your network connection. Key saved but not validated - will retry automatically.",
    };
  }
}

// ============================================
// CLOUDINARY VALIDATION
// ============================================

async function validateCloudinaryCredentials(params: CloudinaryParams): Promise<ValidationResult> {
  if (!params?.cloudName || !params?.apiKey || !params?.apiSecret) {
    return {
      valid: false,
      error: "Cloudinary requires cloud_name, api_key, and api_secret",
      errorCode: 'MISSING_PARAMS',
      solution: "Provide all three Cloudinary credentials from https://console.cloudinary.com/settings/api-keys",
    };
  }

  const { cloudName, apiKey, apiSecret } = params;

  // Use the Admin API to validate credentials
  // GET /resources/image returns a list of images (we just need to know if auth works)
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName.trim()}/resources/image?max_results=1`;

  // Basic auth with api_key:api_secret
  const authHeader = Buffer.from(`${apiKey.trim()}:${apiSecret.trim()}`).toString('base64');

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        details: {
          cloudName: cloudName.trim(),
          resourcesFound: data.resources?.length || 0,
        },
      };
    }

    const status = response.status;
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage = errorBody.error?.message || response.statusText;

    switch (status) {
      case 401:
        return {
          valid: false,
          error: "Invalid Cloudinary credentials",
          errorCode: 'INVALID_KEY',
          solution: "Check your API key and secret at https://console.cloudinary.com/settings/api-keys",
        };
      case 403:
        return {
          valid: false,
          error: "Cloudinary credentials lack required Admin API permissions",
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          solution: "Ensure your API key has Admin API access enabled in Cloudinary settings",
          details: { originalError: errorMessage },
        };
      case 404:
        return {
          valid: false,
          error: `Cloud name '${cloudName}' not found`,
          errorCode: 'INVALID_KEY',
          solution: "Verify your cloud name at https://console.cloudinary.com/settings/account",
        };
      case 429:
        return {
          valid: false,
          error: "Rate limited during validation. Credentials may still be valid.",
          errorCode: 'RATE_LIMITED',
          solution: "Wait 60 seconds and try again.",
        };
      default:
        return {
          valid: false,
          error: `Unexpected error (${status}): ${errorMessage}`,
          errorCode: 'SERVICE_UNAVAILABLE',
          solution: "Check https://status.cloudinary.com for service status",
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      valid: false,
      error: `Could not reach Cloudinary: ${errorMessage}`,
      errorCode: 'SERVICE_UNAVAILABLE',
      solution: "Check your network connection. Credentials saved but not validated.",
    };
  }
}

// ============================================
// FIRECRAWL VALIDATION
// ============================================

async function validateFirecrawlKey(apiKey: string): Promise<ValidationResult> {
  // Firecrawl uses Bearer token auth
  // We'll test with a lightweight endpoint - the crawl status check
  // Using a dummy job ID to trigger auth validation without actually scraping
  const endpoint = 'https://api.firecrawl.dev/v1/scrape';

  try {
    // Make a minimal scrape request that will validate the API key
    // Using a simple, fast URL to minimize cost
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://example.com',
        formats: ['markdown'],
        waitFor: 0,
      }),
    });

    // If we get here with a 200, the key is valid
    // Even if the scrape itself has issues, auth worked
    if (response.ok) {
      return {
        valid: true,
        details: {
          testedWith: 'scrape endpoint',
        },
      };
    }

    const status = response.status;
    let errorBody: { error?: string; message?: string } = {};
    try {
      errorBody = await response.json();
    } catch {
      // Ignore JSON parse errors
    }
    const errorMessage = errorBody.error || errorBody.message || response.statusText;

    switch (status) {
      case 401:
        return {
          valid: false,
          error: "Invalid Firecrawl API key",
          errorCode: 'INVALID_KEY',
          solution: "Get a valid API key at https://app.firecrawl.dev/api-keys",
        };
      case 402:
        // Payment required - but key is valid!
        return {
          valid: true,
          details: {
            warning: "API key is valid but account may need credits",
          },
        };
      case 403:
        return {
          valid: false,
          error: "API key lacks required permissions",
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          solution: "Check your account permissions at https://app.firecrawl.dev",
          details: { originalError: errorMessage },
        };
      case 429:
        return {
          valid: false,
          error: "Rate limited during validation. Key may still be valid.",
          errorCode: 'RATE_LIMITED',
          solution: "Wait 60 seconds and try again.",
        };
      default:
        return {
          valid: false,
          error: `Unexpected error (${status}): ${errorMessage}`,
          errorCode: 'SERVICE_UNAVAILABLE',
          solution: "Check https://status.firecrawl.dev for service status",
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      valid: false,
      error: `Could not reach Firecrawl: ${errorMessage}`,
      errorCode: 'SERVICE_UNAVAILABLE',
      solution: "Check your network connection. Key saved but not validated.",
    };
  }
}

// ============================================
// REDIS VALIDATION
// ============================================

async function validateRedisConnection(redisUrl: string): Promise<ValidationResult> {
  let client: Redis | null = null;

  try {
    // Create a new Redis client with the provided URL
    // Use short timeouts for validation
    client = new Redis(redisUrl, {
      connectTimeout: 5000,
      commandTimeout: 5000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't retry for validation
      lazyConnect: true, // Don't connect until we call connect()
      enableOfflineQueue: false,
    });

    // Connect and ping
    await client.connect();
    const pingResult = await client.ping();

    if (pingResult === 'PONG') {
      // Get some basic info
      const info = await client.info('server').catch(() => '');
      const version = info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown';

      return {
        valid: true,
        details: {
          redisVersion: version,
          pingResponse: pingResult,
        },
      };
    }

    return {
      valid: false,
      error: `Unexpected ping response: ${pingResult}`,
      errorCode: 'SERVICE_UNAVAILABLE',
      solution: "Redis server may be misconfigured",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Parse common Redis connection errors
    if (errorMessage.includes('NOAUTH') || errorMessage.includes('AUTH')) {
      return {
        valid: false,
        error: "Redis authentication failed",
        errorCode: 'INVALID_KEY',
        solution: "Check your Redis password in the connection URL",
      };
    }

    if (errorMessage.includes('ECONNREFUSED')) {
      return {
        valid: false,
        error: "Could not connect to Redis server",
        errorCode: 'CONNECTION_FAILED',
        solution: "Verify the Redis host and port are correct and the server is running",
      };
    }

    if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
      return {
        valid: false,
        error: "Redis host not found",
        errorCode: 'CONNECTION_FAILED',
        solution: "Check the hostname in your Redis URL",
      };
    }

    if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
      return {
        valid: false,
        error: "Connection to Redis timed out",
        errorCode: 'SERVICE_UNAVAILABLE',
        solution: "Redis server may be down or unreachable. Check firewall and network settings.",
      };
    }

    if (errorMessage.includes('certificate') || errorMessage.includes('TLS') || errorMessage.includes('SSL')) {
      return {
        valid: false,
        error: "Redis TLS/SSL connection failed",
        errorCode: 'CONNECTION_FAILED',
        solution: "If using TLS, use 'rediss://' prefix. Check SSL certificate configuration.",
      };
    }

    return {
      valid: false,
      error: `Redis connection failed: ${errorMessage}`,
      errorCode: 'CONNECTION_FAILED',
      solution: "Check your Redis connection URL format and credentials",
    };
  } finally {
    // Always close the test connection
    if (client) {
      try {
        await client.quit();
      } catch {
        // Ignore quit errors
        client.disconnect();
      }
    }
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get the documentation URL for a service
 */
export function getServiceDocsUrl(service: ServiceName): string {
  return SERVICE_DOCS[service] || '';
}

/**
 * Get all supported services
 */
export function getSupportedServices(): ServiceName[] {
  return ['gemini', 'cloudinary', 'firecrawl', 'redis'];
}

/**
 * Check if a service name is valid
 */
export function isValidService(service: string): service is ServiceName {
  return getSupportedServices().includes(service as ServiceName);
}
