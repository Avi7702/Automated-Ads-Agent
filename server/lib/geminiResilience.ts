import { geminiLogger } from './logger';

export class GeminiCircuitOpenError extends Error {
  constructor(message = 'Gemini circuit is open') {
    super(message);
    this.name = 'GeminiCircuitOpenError';
  }
}

export class GeminiTimeoutError extends Error {
  constructor(message = 'Gemini request timed out') {
    super(message);
    this.name = 'GeminiTimeoutError';
  }
}

interface GeminiCircuitState {
  consecutiveFailures: number;
  openUntil: number;
}

const circuitState: GeminiCircuitState = {
  consecutiveFailures: 0,
  openUntil: 0,
};

function parseNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getFailureThreshold(): number {
  return parseNumberEnv('GEMINI_CIRCUIT_FAILURE_THRESHOLD', 5);
}

function getCooldownMs(): number {
  return parseNumberEnv('GEMINI_CIRCUIT_COOLDOWN_MS', 60_000);
}

function getRequestTimeoutMs(): number {
  return parseNumberEnv('GEMINI_REQUEST_TIMEOUT_MS', 45_000);
}

export function isGeminiCircuitOpen(): boolean {
  return circuitState.openUntil > Date.now();
}

function openCircuit(reason: string): void {
  const cooldownMs = getCooldownMs();
  circuitState.openUntil = Date.now() + cooldownMs;
  geminiLogger.warn(
    {
      cooldownMs,
      failureThreshold: getFailureThreshold(),
      consecutiveFailures: circuitState.consecutiveFailures,
      reason,
    },
    'Gemini circuit opened',
  );
}

function onGeminiSuccess(): void {
  circuitState.consecutiveFailures = 0;
  circuitState.openUntil = 0;
}

function onGeminiFailure(err: unknown): void {
  circuitState.consecutiveFailures += 1;

  const threshold = getFailureThreshold();
  if (circuitState.consecutiveFailures >= threshold) {
    const message = err instanceof Error ? err.message : String(err);
    openCircuit(message.slice(0, 200));
  }
}

function createTimeoutPromise<T>(timeoutMs: number, operationName: string): Promise<T> {
  return new Promise((_resolve, reject) => {
    setTimeout(() => {
      reject(new GeminiTimeoutError(`Gemini operation "${operationName}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

export async function withGeminiResilience<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
  if (isGeminiCircuitOpen()) {
    throw new GeminiCircuitOpenError('Gemini circuit is open. Using fallback mode.');
  }

  const timeoutMs = getRequestTimeoutMs();
  try {
    const result = await Promise.race([operation(), createTimeoutPromise<T>(timeoutMs, operationName)]);
    onGeminiSuccess();
    return result;
  } catch (err) {
    onGeminiFailure(err);
    throw err;
  }
}

export function isLikelyGeminiError(err: unknown): boolean {
  const text = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  const lower = text.toLowerCase();

  return [
    'gemini',
    'google api',
    'resource_exhausted',
    'unavailable',
    'deadline_exceeded',
    'quota',
    'rate limit',
    'api key',
    'geminirequesttimeout',
    'geminicircuitopen',
    'missing google api key',
    'google_api_key',
    'gemini_api_key',
    '429',
    '503',
  ].some((token) => lower.includes(token));
}

export function __resetGeminiResilienceForTests(): void {
  circuitState.consecutiveFailures = 0;
  circuitState.openUntil = 0;
}
