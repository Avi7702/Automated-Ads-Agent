/**
 * Environment Variable Validation
 *
 * Validates required environment variables at startup and fails fast
 * with clear error messages if critical configuration is missing.
 */

import { logger } from './logger';
import { getRedisClient } from './redis';

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  productionOnly?: boolean;
  validator?: (value: string) => boolean;
  validatorMessage?: string;
}

const ENV_VARS: EnvVar[] = [
  // Database - Required
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string',
  },

  // AI/Gemini - Required (one of these)
  {
    name: 'GEMINI_API_KEY',
    required: false, // Checked separately with GOOGLE_API_KEY
    description: 'Gemini API key for AI features',
  },
  {
    name: 'GOOGLE_API_KEY',
    required: false, // Checked separately with GEMINI_API_KEY
    description: 'Google API key (alternative to GEMINI_API_KEY)',
  },

  // Session Security - Required in production
  {
    name: 'SESSION_SECRET',
    required: false,
    productionOnly: true,
    description: 'Secret for signing session cookies',
    validator: (val) => val.length >= 32,
    validatorMessage: 'must be at least 32 characters',
  },

  // BYOK Encryption - Required if using BYOK feature
  {
    name: 'API_KEY_ENCRYPTION_KEY',
    required: false,
    description: 'Master key for encrypting user API keys (BYOK)',
    validator: (val) => val.length >= 32,
    validatorMessage: 'must be at least 32 characters (256-bit)',
  },

  // Cloudinary - Optional but needed for image storage
  {
    name: 'CLOUDINARY_CLOUD_NAME',
    required: false,
    description: 'Cloudinary cloud name for image storage',
  },
  {
    name: 'CLOUDINARY_API_KEY',
    required: false,
    description: 'Cloudinary API key',
  },
  {
    name: 'CLOUDINARY_API_SECRET',
    required: false,
    description: 'Cloudinary API secret',
  },
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates all environment variables at startup
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env['NODE_ENV'] === 'production';

  // Check required variables
  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];
    const isRequired = envVar.required || (envVar.productionOnly && isProduction);

    if (isRequired && !value) {
      errors.push(`${envVar.name} is required - ${envVar.description}`);
    } else if (value && envVar.validator && !envVar.validator(value)) {
      errors.push(`${envVar.name} ${envVar.validatorMessage}`);
    }
  }

  // Special check: Need either GEMINI_API_KEY or GOOGLE_API_KEY
  if (!process.env['GEMINI_API_KEY'] && !process.env['GOOGLE_API_KEY']) {
    errors.push('GEMINI_API_KEY or GOOGLE_API_KEY is required - AI features will not work');
  }

  // Cloudinary group check - all or none
  const cloudinaryVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const cloudinarySet = cloudinaryVars.filter((v) => process.env[v]);
  if (cloudinarySet.length > 0 && cloudinarySet.length < 3) {
    const missing = cloudinaryVars.filter((v) => !process.env[v]);
    warnings.push(`Cloudinary partially configured. Missing: ${missing.join(', ')}`);
  } else if (cloudinarySet.length === 0) {
    warnings.push('CLOUDINARY not configured - image storage will use fallback');
  }

  // Production-specific warnings (downgraded from errors for single-instance deployments)
  if (isProduction) {
    if (!process.env['SESSION_SECRET']) {
      warnings.push('SESSION_SECRET not set in production — using random secret (sessions lost on restart)');
    }
    if (!process.env['REDIS_URL']) {
      warnings.push('REDIS_URL not set in production — using in-memory fallbacks (single-instance only)');
    }
  } else {
    // Development: warn but don't block
    if (!process.env['REDIS_URL']) {
      warnings.push('REDIS_URL not set - using in-memory fallbacks (not suitable for production)');
    }
  }

  // Optional but useful warnings
  if (!process.env['FIRECRAWL_API_KEY']) {
    warnings.push('FIRECRAWL_API_KEY not set - web scraping features disabled');
  }

  // Database pool configuration warnings
  if (!process.env['DB_POOL_MAX']) {
    warnings.push('DB_POOL_MAX not set - using default (20 connections)');
  } else {
    const poolMax = parseInt(process.env['DB_POOL_MAX'], 10);
    if (isProduction && poolMax > 20) {
      warnings.push(`DB_POOL_MAX set to ${poolMax} - consider Railway limit of 15 connections per service`);
    }
  }

  if (!process.env['DB_STATEMENT_TIMEOUT']) {
    warnings.push('DB_STATEMENT_TIMEOUT not set - using default (30s)');
  }

  // Monitoring configuration
  if (process.env['ENABLE_MONITORING'] === 'false') {
    warnings.push('ENABLE_MONITORING is disabled - performance metrics and error tracking disabled');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Checks Redis connectivity by sending a PING command.
 * Returns true if Redis responds, false otherwise.
 * Only called when REDIS_URL is configured.
 */
async function checkRedisConnectivity(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Validates environment and exits if critical errors found.
 * Call this early in app startup.
 *
 * This is async because it performs a Redis connectivity check
 * when REDIS_URL is configured in production.
 */
export async function validateEnvOrExit(): Promise<void> {
  const result = validateEnvironment();
  const isProduction = process.env['NODE_ENV'] === 'production';

  // Log warnings
  for (const warning of result.warnings) {
    logger.warn({ env: true }, `⚠️  ${warning}`);
  }

  // Log errors and exit if invalid
  if (!result.valid) {
    logger.error({ env: true }, '❌ Environment validation failed:');
    for (const error of result.errors) {
      logger.error({ env: true }, `   - ${error}`);
    }
    logger.error({ env: true }, '');
    logger.error({ env: true }, 'Please set the required environment variables and restart.');
    process.exit(1);
  }

  // In production, verify Redis is actually reachable (not just configured)
  if (isProduction && process.env['REDIS_URL']) {
    logger.info({ env: true }, 'Checking Redis connectivity...');
    const redisConnected = await checkRedisConnectivity();
    if (!redisConnected) {
      logger.warn({ env: true }, '⚠️  Redis connectivity check failed — REDIS_URL is set but Redis did not respond');
      logger.warn({ env: true }, '   Rate limiting and sessions will use in-memory fallback (single-instance only)');
    } else {
      logger.info({ env: true }, '✓ Redis connectivity verified');
    }
  }

  logger.info({ env: true }, '✓ Environment validation passed');
}

/**
 * Returns a summary of configured services for health checks
 */
export function getConfiguredServices(): Record<string, boolean> {
  return {
    database: !!process.env['DATABASE_URL'],
    gemini: !!(process.env['GEMINI_API_KEY'] || process.env['GOOGLE_API_KEY']),
    cloudinary: !!(
      process.env['CLOUDINARY_CLOUD_NAME'] &&
      process.env['CLOUDINARY_API_KEY'] &&
      process.env['CLOUDINARY_API_SECRET']
    ),
    redis: !!process.env['REDIS_URL'],
    firecrawl: !!process.env['FIRECRAWL_API_KEY'],
    googleCloud: !!process.env['GOOGLE_CLOUD_PROJECT'],
    byokEncryption: !!process.env['API_KEY_ENCRYPTION_KEY'],
  };
}
