/**
 * Gemini API Client with Automatic Retry Logic
 *
 * Provides exponential backoff retries for transient errors:
 * - 429 RESOURCE_EXHAUSTED (quota exceeded)
 * - 503 UNAVAILABLE (service unavailable)
 * - DEADLINE_EXCEEDED (timeout)
 * - INTERNAL (internal server error)
 */

import { genAI } from './gemini';
import { logger } from './logger';

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * Retryable error codes from Gemini API
 */
const RETRYABLE_ERRORS = [
  'RESOURCE_EXHAUSTED',  // Quota exceeded (429)
  'UNAVAILABLE',         // Service unavailable (503)
  'DEADLINE_EXCEEDED',   // Timeout
  'INTERNAL',            // Internal error (500)
];

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  const errorCode = error?.code || error?.name || '';
  const errorMessage = error?.message || '';

  return RETRYABLE_ERRORS.some(code =>
    errorCode.includes(code) || errorMessage.includes(code)
  ) || errorMessage.includes('429') || errorMessage.includes('503');
}

/**
 * Extract retry delay from error (if provided by API)
 */
function getRetryDelay(error: any, attempt: number, config: RetryConfig): number {
  // Check for Retry-After header in error
  const retryAfter = error?.retryAfter || error?.details?.retryAfter;
  if (retryAfter && typeof retryAfter === 'number') {
    return Math.min(retryAfter * 1000, config.maxDelayMs);
  }

  // Exponential backoff with jitter
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call Gemini API with automatic retries
 *
 * @param operation - Async function that makes the API call
 * @param context - Context for logging (operation name, requestId)
 * @param config - Retry configuration (optional)
 * @returns Result of the API call
 * @throws Error if all retries exhausted or non-retryable error
 */
export async function callGeminiWithRetry<T>(
  operation: () => Promise<T>,
  context: { operation: string; requestId?: string },
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      if (!isRetryableError(error) || attempt === config.maxRetries) {
        logger.error({
          err: error,
          operation: context.operation,
          requestId: context.requestId,
          attempt,
          retryable: isRetryableError(error),
        }, 'Gemini API call failed');
        throw error;
      }

      const delay = getRetryDelay(error, attempt, config);

      logger.warn({
        operation: context.operation,
        requestId: context.requestId,
        attempt,
        nextRetryMs: delay,
        errorCode: error?.code || error?.name,
        errorMessage: error?.message?.substring(0, 100),
      }, 'Gemini API call failed, retrying');

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Wrapper for genAI.models.generateContent with retries
 *
 * Usage:
 * ```typescript
 * const response = await generateContentWithRetry(
 *   { model, contents, config },
 *   { operation: 'image_generation', requestId: req?.requestId }
 * );
 * ```
 */
export async function generateContentWithRetry(
  params: Parameters<typeof genAI.models.generateContent>[0],
  context: { operation: string; requestId?: string }
): Promise<Awaited<ReturnType<typeof genAI.models.generateContent>>> {
  return callGeminiWithRetry(
    () => genAI.models.generateContent(params),
    context
  );
}

/**
 * Check if an error is a quota/rate limit error
 * Useful for showing user-friendly messages
 */
export function isQuotaError(error: any): boolean {
  const errorMessage = error?.message || '';
  const errorCode = error?.code || '';
  return errorMessage.includes('429') ||
         errorMessage.includes('RESOURCE_EXHAUSTED') ||
         errorCode.includes('RESOURCE_EXHAUSTED');
}

/**
 * Check if an error is a service unavailable error
 */
export function isServiceUnavailableError(error: any): boolean {
  const errorMessage = error?.message || '';
  return errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE');
}
