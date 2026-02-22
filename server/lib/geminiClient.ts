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
import { geminiLogger } from './logger';
import { recordGeminiSuccess, recordGeminiFailure } from './geminiHealthMonitor';

// Global override client — set when user saves their Gemini API key via Settings UI
let _overrideClient: typeof genAI | null = null;

export function setGlobalGeminiClient(client: typeof genAI | null): void {
  _overrideClient = client;
  geminiLogger.info({ hasOverride: !!client }, 'Global Gemini client updated');
}

export function getGlobalGeminiClient(): typeof genAI {
  return _overrideClient || genAI;
}

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
  'RESOURCE_EXHAUSTED', // Quota exceeded (429)
  'UNAVAILABLE', // Service unavailable (503)
  'DEADLINE_EXCEEDED', // Timeout
  'INTERNAL', // Internal error (500)
];

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  const err = error as Record<string, unknown> | null | undefined;
  const errorCode = String(err?.['code'] ?? err?.['name'] ?? '');
  const errorMessage = String(err?.['message'] ?? '');

  return (
    RETRYABLE_ERRORS.some((code) => errorCode.includes(code) || errorMessage.includes(code)) ||
    errorMessage.includes('429') ||
    errorMessage.includes('503')
  );
}

/**
 * Extract retry delay from error (if provided by API)
 */
function getRetryDelay(error: unknown, attempt: number, config: RetryConfig): number {
  const err = error as Record<string, unknown> | null | undefined;
  const details = err?.['details'] as Record<string, unknown> | undefined;
  // Check for Retry-After header in error
  const retryAfter = err?.['retryAfter'] ?? details?.['retryAfter'];
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
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  let lastError: unknown;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await operation();
      // Record success for health monitoring (fire-and-forget)
      recordGeminiSuccess();
      return result;
    } catch (error: unknown) {
      lastError = error;
      const err = error as Record<string, unknown>;

      if (!isRetryableError(error) || attempt === config.maxRetries) {
        const duration = Date.now() - startTime;
        const errorType = classifyError(error);

        // Structured error log with classification
        geminiLogger.error(
          {
            err: error,
            errorType,
            operation: context.operation,
            requestId: context.requestId,
            attempts: attempt + 1,
            duration,
            retryable: isRetryableError(error),
          },
          `Gemini API call failed after ${attempt + 1} attempt(s) [${errorType}]`,
        );

        // Record failure for health monitoring (fire-and-forget)
        recordGeminiFailure(errorType);

        throw error;
      }

      const delay = getRetryDelay(error, attempt, config);

      geminiLogger.warn(
        {
          operation: context.operation,
          requestId: context.requestId,
          attempt,
          nextRetryMs: delay,
          errorCode: err?.['code'] ?? err?.['name'],
          errorMessage: String(err?.['message'] ?? '').substring(0, 100),
        },
        'Gemini API call failed, retrying',
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Classify an error using the existing isQuotaError() and isServiceUnavailableError() helpers.
 */
function classifyError(error: unknown): 'quota' | 'unavailable' | 'unknown' {
  if (isQuotaError(error)) {
    return 'quota';
  }
  if (isServiceUnavailableError(error)) {
    return 'unavailable';
  }
  return 'unknown';
}

/**
 * Model fallback chain — tries primary model, falls back to secondary on non-retryable errors.
 */
const MODEL_FALLBACK: Record<string, string> = {
  'gemini-3-flash': 'gemini-3-pro',
  'gemini-3-pro': 'gemini-3-flash',
};

/**
 * Wrapper for genAI.models.generateContent with retries and model fallback.
 *
 * If the primary model fails with a non-retryable error, automatically
 * falls back to a secondary model from the MODEL_FALLBACK chain.
 */
export async function generateContentWithRetry(
  params: Parameters<typeof genAI.models.generateContent>[0],
  context: { operation: string; requestId?: string },
  client?: typeof genAI,
): Promise<Awaited<ReturnType<typeof genAI.models.generateContent>>> {
  const geminiClient = client || _overrideClient || genAI;
  try {
    return await callGeminiWithRetry(() => geminiClient.models.generateContent(params), context);
  } catch (primaryError: unknown) {
    // Try fallback model if available
    const modelName =
      typeof params === 'object' && params !== null && 'model' in params
        ? String((params as unknown as Record<string, unknown>)['model'] ?? '')
        : '';
    const fallbackModel = MODEL_FALLBACK[modelName];

    if (fallbackModel && !isRetryableError(primaryError)) {
      geminiLogger.warn(
        {
          operation: context.operation,
          primaryModel: modelName,
          fallbackModel,
        },
        'Primary model failed, attempting fallback',
      );

      const fallbackParams = { ...params, model: fallbackModel } as typeof params;
      return callGeminiWithRetry(() => geminiClient.models.generateContent(fallbackParams), {
        ...context,
        operation: `${context.operation}_fallback`,
      });
    }
    throw primaryError;
  }
}

/**
 * Check if an error is a quota/rate limit error
 * Useful for showing user-friendly messages
 */
export function isQuotaError(error: unknown): boolean {
  const err = error as Record<string, unknown> | null | undefined;
  const errorMessage = String(err?.['message'] ?? '');
  const errorCode = String(err?.['code'] ?? '');
  return (
    errorMessage.includes('429') ||
    errorMessage.includes('RESOURCE_EXHAUSTED') ||
    errorCode.includes('RESOURCE_EXHAUSTED')
  );
}

/**
 * Check if an error is a service unavailable error
 */
export function isServiceUnavailableError(error: unknown): boolean {
  const err = error as Record<string, unknown> | null | undefined;
  const errorMessage = String(err?.['message'] ?? '');
  return errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE');
}
