import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  withGeminiResilience,
  isGeminiCircuitOpen,
  GeminiCircuitOpenError,
  GeminiTimeoutError,
  __resetGeminiResilienceForTests,
} from '../lib/geminiResilience';

describe('geminiResilience', () => {
  beforeEach(() => {
    process.env['GEMINI_CIRCUIT_FAILURE_THRESHOLD'] = '1';
    process.env['GEMINI_CIRCUIT_COOLDOWN_MS'] = '50';
    process.env['GEMINI_REQUEST_TIMEOUT_MS'] = '20';
    __resetGeminiResilienceForTests();
  });

  it('opens the circuit after configured consecutive failures', async () => {
    await expect(
      withGeminiResilience('unit_test_failure', async () => {
        throw new Error('Gemini API unavailable');
      }),
    ).rejects.toThrowError('Gemini API unavailable');

    expect(isGeminiCircuitOpen()).toBe(true);
  });

  it('fails fast with GeminiCircuitOpenError while circuit is open', async () => {
    await expect(
      withGeminiResilience('unit_test_failure', async () => {
        throw new Error('Gemini API unavailable');
      }),
    ).rejects.toThrowError('Gemini API unavailable');

    const op = vi.fn().mockResolvedValue('ok');
    await expect(withGeminiResilience('unit_test_fast_fail', op)).rejects.toBeInstanceOf(GeminiCircuitOpenError);
    expect(op).not.toHaveBeenCalled();
  });

  it('times out slow Gemini operations', async () => {
    await expect(
      withGeminiResilience('unit_test_timeout', async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
        return 'late';
      }),
    ).rejects.toBeInstanceOf(GeminiTimeoutError);
  });
});
