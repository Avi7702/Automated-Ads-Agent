import { trackError, getRecentErrors, getErrorStats, clearErrors } from '../services/errorTrackingService';

describe('Error Tracking Service', () => {
  beforeEach(() => {
    // Clear errors before each test to ensure clean state
    clearErrors();
  });

  describe('trackError', () => {
    it('should track a basic error', () => {
      trackError({
        statusCode: 500,
        message: 'Internal Server Error',
        endpoint: '/api/test',
        method: 'GET',
      });

      const errors = getRecentErrors(10);
      expect(errors).toHaveLength(1);
      expect(errors[0].statusCode).toBe(500);
      expect(errors[0].message).toBe('Internal Server Error');
      expect(errors[0].endpoint).toBe('/api/test');
      expect(errors[0].method).toBe('GET');
    });

    it('should track error with user agent', () => {
      trackError({
        statusCode: 404,
        message: 'Not Found',
        endpoint: '/api/missing',
        method: 'POST',
        userAgent: 'Mozilla/5.0 Test Browser',
      });

      const errors = getRecentErrors(10);
      expect(errors[0].userAgent).toBe('Mozilla/5.0 Test Browser');
    });

    it('should track error with stack trace', () => {
      const stackTrace = `Error: Test error
    at Object.<anonymous> (/app/test.ts:10:15)
    at Module._compile (node:internal/modules/cjs/loader:1198:14)`;

      trackError({
        statusCode: 500,
        message: 'Test error',
        endpoint: '/api/error',
        method: 'GET',
        stack: stackTrace,
      });

      const errors = getRecentErrors(10);
      expect(errors[0].stack).toBeDefined();
      expect(errors[0].stack).toContain('Error: Test error');
    });

    it('should generate unique IDs for each error', () => {
      trackError({
        statusCode: 500,
        message: 'Error 1',
        endpoint: '/api/test',
        method: 'GET',
      });

      trackError({
        statusCode: 500,
        message: 'Error 2',
        endpoint: '/api/test',
        method: 'GET',
      });

      const errors = getRecentErrors(10);
      expect(errors[0].id).toBeDefined();
      expect(errors[1].id).toBeDefined();
      expect(errors[0].id).not.toBe(errors[1].id);
    });

    it('should generate fingerprints for deduplication', () => {
      trackError({
        statusCode: 500,
        message: 'Duplicate error',
        endpoint: '/api/test',
        method: 'GET',
      });

      trackError({
        statusCode: 500,
        message: 'Duplicate error',
        endpoint: '/api/test',
        method: 'GET',
      });

      const errors = getRecentErrors(10);
      expect(errors[0].fingerprint).toBeDefined();
      expect(errors[1].fingerprint).toBeDefined();
      // Same message should produce same fingerprint
      expect(errors[0].fingerprint).toBe(errors[1].fingerprint);
    });

    it('should generate different fingerprints for different errors', () => {
      trackError({
        statusCode: 500,
        message: 'Error A',
        endpoint: '/api/test',
        method: 'GET',
      });

      trackError({
        statusCode: 500,
        message: 'Error B',
        endpoint: '/api/test',
        method: 'GET',
      });

      const errors = getRecentErrors(10);
      expect(errors[0].fingerprint).not.toBe(errors[1].fingerprint);
    });

    it('should set timestamps on errors', () => {
      const before = Date.now();

      trackError({
        statusCode: 500,
        message: 'Test error',
        endpoint: '/api/test',
        method: 'GET',
      });

      const after = Date.now();
      const errors = getRecentErrors(10);

      expect(errors[0].timestamp).toBeInstanceOf(Date);
      const timestamp = errors[0].timestamp.getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Stack Trace Truncation', () => {
    it('should truncate stack traces to 10 lines', () => {
      // Create a stack trace with more than 10 lines
      const longStack = Array.from(
        { length: 20 },
        (_, i) => `    at Object.<anonymous> (/app/test${i}.ts:${i}:15)`,
      ).join('\n');

      trackError({
        statusCode: 500,
        message: 'Error with long stack',
        endpoint: '/api/test',
        method: 'GET',
        stack: longStack,
      });

      const errors = getRecentErrors(10);
      const lines = errors[0].stack?.split('\n') || [];
      expect(lines.length).toBeLessThanOrEqual(10);
    });

    it('should handle short stack traces', () => {
      const shortStack = 'Error: Test\n    at Object.<anonymous> (/app/test.ts:10:15)';

      trackError({
        statusCode: 500,
        message: 'Error with short stack',
        endpoint: '/api/test',
        method: 'GET',
        stack: shortStack,
      });

      const errors = getRecentErrors(10);
      expect(errors[0].stack).toBe(shortStack);
    });

    it('should handle errors without stack traces', () => {
      trackError({
        statusCode: 400,
        message: 'Bad Request',
        endpoint: '/api/test',
        method: 'POST',
      });

      const errors = getRecentErrors(10);
      expect(errors[0].stack).toBeUndefined();
    });
  });

  describe('Ring Buffer Behavior', () => {
    it('should store up to 100 errors', () => {
      for (let i = 0; i < 100; i++) {
        trackError({
          statusCode: 500,
          message: `Error ${i}`,
          endpoint: `/api/test${i}`,
          method: 'GET',
        });
      }

      const errors = getRecentErrors(100);
      expect(errors.length).toBe(100);
    });

    it('should overwrite oldest errors when capacity is exceeded', () => {
      // Add 105 errors (exceeds 100 capacity)
      for (let i = 0; i < 105; i++) {
        trackError({
          statusCode: 500,
          message: `Error ${i}`,
          endpoint: `/api/test${i}`,
          method: 'GET',
        });
      }

      const errors = getRecentErrors(100);

      // Should still have 100 errors
      expect(errors.length).toBe(100);

      // Most recent error should be Error 104 (index 0 in returned array)
      expect(errors[0].message).toBe('Error 104');

      // Oldest retained error should be Error 5 (last in returned array)
      expect(errors[99].message).toBe('Error 5');

      // Errors 0-4 should have been overwritten
      const allMessages = errors.map((e) => e.message);
      expect(allMessages).not.toContain('Error 0');
      expect(allMessages).not.toContain('Error 1');
      expect(allMessages).not.toContain('Error 2');
      expect(allMessages).not.toContain('Error 3');
      expect(allMessages).not.toContain('Error 4');
    });

    it('should have O(1) insertion time', () => {
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        trackError({
          statusCode: 500,
          message: `Error ${i}`,
          endpoint: '/api/test',
          method: 'GET',
        });
      }

      const elapsed = Date.now() - start;

      // Should complete 1000 insertions in under 500ms (generous for CI/parallel load)
      // O(1) operations should be fast even for many insertions
      expect(elapsed).toBeLessThan(500);
    });

    it('should maintain circular buffer correctly after multiple wraps', () => {
      // Add 250 errors (wraps around 2.5 times)
      for (let i = 0; i < 250; i++) {
        trackError({
          statusCode: 500,
          message: `Error ${i}`,
          endpoint: '/api/test',
          method: 'GET',
        });
      }

      const errors = getRecentErrors(100);

      // Should have exactly 100 errors
      expect(errors.length).toBe(100);

      // Most recent should be Error 249
      expect(errors[0].message).toBe('Error 249');

      // Oldest retained should be Error 150
      expect(errors[99].message).toBe('Error 150');
    });
  });

  describe('getRecentErrors', () => {
    beforeEach(() => {
      // Add 10 errors for testing
      for (let i = 0; i < 10; i++) {
        trackError({
          statusCode: 500,
          message: `Error ${i}`,
          endpoint: `/api/test${i}`,
          method: 'GET',
        });
      }
    });

    it('should return errors in reverse chronological order', () => {
      const errors = getRecentErrors(10);

      expect(errors[0].message).toBe('Error 9'); // Most recent
      expect(errors[9].message).toBe('Error 0'); // Oldest
    });

    it('should limit results to specified count', () => {
      const errors = getRecentErrors(5);

      expect(errors.length).toBe(5);
      expect(errors[0].message).toBe('Error 9');
      expect(errors[4].message).toBe('Error 5');
    });

    it('should default to 50 errors when no limit specified', () => {
      // Add 60 more errors (70 total)
      for (let i = 10; i < 70; i++) {
        trackError({
          statusCode: 500,
          message: `Error ${i}`,
          endpoint: `/api/test${i}`,
          method: 'GET',
        });
      }

      const errors = getRecentErrors();

      expect(errors.length).toBe(50);
    });

    it('should handle requests for more errors than exist', () => {
      const errors = getRecentErrors(100);

      expect(errors.length).toBe(10); // Only 10 errors exist
    });

    it('should return empty array when no errors tracked', () => {
      clearErrors();
      const errors = getRecentErrors(10);

      expect(errors).toEqual([]);
    });
  });

  describe('getErrorStats', () => {
    it('should return correct total count', () => {
      for (let i = 0; i < 15; i++) {
        trackError({
          statusCode: 500,
          message: `Error ${i}`,
          endpoint: '/api/test',
          method: 'GET',
        });
      }

      const stats = getErrorStats();
      expect(stats.total).toBe(15);
    });

    it('should calculate last 5 minutes correctly', async () => {
      // Add an old error (mock by adding a recent one and checking stats)
      trackError({
        statusCode: 500,
        message: 'Recent error',
        endpoint: '/api/test',
        method: 'GET',
      });

      const stats = getErrorStats();

      // Recent error should be in last5min
      expect(stats.last5min).toBeGreaterThan(0);
      expect(stats.last5min).toBeLessThanOrEqual(stats.total);
    });

    it('should calculate last 1 hour correctly', () => {
      trackError({
        statusCode: 500,
        message: 'Recent error',
        endpoint: '/api/test',
        method: 'GET',
      });

      const stats = getErrorStats();

      // Recent error should be in last1hour
      expect(stats.last1hour).toBeGreaterThan(0);
      expect(stats.last1hour).toBeLessThanOrEqual(stats.total);
    });

    it('should group errors by status code', () => {
      trackError({
        statusCode: 400,
        message: 'Bad Request 1',
        endpoint: '/api/test',
        method: 'GET',
      });

      trackError({
        statusCode: 400,
        message: 'Bad Request 2',
        endpoint: '/api/test',
        method: 'GET',
      });

      trackError({
        statusCode: 500,
        message: 'Server Error',
        endpoint: '/api/test',
        method: 'GET',
      });

      const stats = getErrorStats();

      expect(stats.byStatusCode['400']).toBe(2);
      expect(stats.byStatusCode['500']).toBe(1);
    });

    it('should group errors by endpoint', () => {
      trackError({
        statusCode: 500,
        message: 'Error 1',
        endpoint: '/api/users',
        method: 'GET',
      });

      trackError({
        statusCode: 500,
        message: 'Error 2',
        endpoint: '/api/users',
        method: 'POST',
      });

      trackError({
        statusCode: 500,
        message: 'Error 3',
        endpoint: '/api/posts',
        method: 'GET',
      });

      const stats = getErrorStats();

      expect(stats.byEndpoint['/api/users']).toBe(2);
      expect(stats.byEndpoint['/api/posts']).toBe(1);
    });

    it('should group errors by fingerprint', () => {
      // Track same error twice (same fingerprint)
      trackError({
        statusCode: 500,
        message: 'Duplicate error',
        endpoint: '/api/test',
        method: 'GET',
      });

      trackError({
        statusCode: 500,
        message: 'Duplicate error',
        endpoint: '/api/test',
        method: 'GET',
      });

      // Track different error
      trackError({
        statusCode: 500,
        message: 'Unique error',
        endpoint: '/api/test',
        method: 'GET',
      });

      const stats = getErrorStats();

      // Should have 2 fingerprint groups
      const fingerprints = Object.keys(stats.byFingerprint);
      expect(fingerprints.length).toBe(2);

      // One fingerprint should have 2 errors
      const counts = Object.values(stats.byFingerprint);
      expect(counts).toContain(2);
      expect(counts).toContain(1);
    });

    it('should return zeros when no errors exist', () => {
      const stats = getErrorStats();

      expect(stats.total).toBe(0);
      expect(stats.last5min).toBe(0);
      expect(stats.last1hour).toBe(0);
      expect(stats.byStatusCode).toEqual({});
      expect(stats.byEndpoint).toEqual({});
      expect(stats.byFingerprint).toEqual({});
    });

    it('should handle mixed status codes correctly', () => {
      const statusCodes = [400, 401, 403, 404, 500, 502, 503];

      statusCodes.forEach((code) => {
        trackError({
          statusCode: code,
          message: `Error ${code}`,
          endpoint: '/api/test',
          method: 'GET',
        });
      });

      const stats = getErrorStats();

      expect(Object.keys(stats.byStatusCode).length).toBe(7);
      statusCodes.forEach((code) => {
        expect(stats.byStatusCode[code.toString()]).toBe(1);
      });
    });
  });

  describe('clearErrors', () => {
    it('should clear all tracked errors', () => {
      for (let i = 0; i < 20; i++) {
        trackError({
          statusCode: 500,
          message: `Error ${i}`,
          endpoint: '/api/test',
          method: 'GET',
        });
      }

      const beforeClear = getRecentErrors(100);
      expect(beforeClear.length).toBe(20);

      clearErrors();

      const afterClear = getRecentErrors(100);
      expect(afterClear.length).toBe(0);
    });

    it('should reset stats to zero', () => {
      trackError({
        statusCode: 500,
        message: 'Test error',
        endpoint: '/api/test',
        method: 'GET',
      });

      clearErrors();

      const stats = getErrorStats();
      expect(stats.total).toBe(0);
      expect(stats.last5min).toBe(0);
      expect(stats.last1hour).toBe(0);
    });

    it('should allow tracking new errors after clear', () => {
      trackError({
        statusCode: 500,
        message: 'Old error',
        endpoint: '/api/test',
        method: 'GET',
      });

      clearErrors();

      trackError({
        statusCode: 400,
        message: 'New error',
        endpoint: '/api/new',
        method: 'POST',
      });

      const errors = getRecentErrors(10);
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('New error');
      expect(errors[0].statusCode).toBe(400);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);

      trackError({
        statusCode: 500,
        message: longMessage,
        endpoint: '/api/test',
        method: 'GET',
      });

      const errors = getRecentErrors(10);
      expect(errors[0].message).toBe(longMessage);
    });

    it('should handle special characters in error messages', () => {
      const specialMessage = 'Error: <script>alert("xss")</script> \n\t\r\0 äöü';

      trackError({
        statusCode: 500,
        message: specialMessage,
        endpoint: '/api/test',
        method: 'GET',
      });

      const errors = getRecentErrors(10);
      expect(errors[0].message).toBe(specialMessage);
    });

    it('should handle rapid concurrent error tracking', async () => {
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise((resolve) => {
            setTimeout(() => {
              trackError({
                statusCode: 500,
                message: `Concurrent error ${i}`,
                endpoint: '/api/test',
                method: 'GET',
              });
              resolve();
            }, Math.random() * 10);
          }),
        );
      }

      await Promise.all(promises);

      const errors = getRecentErrors(100);
      expect(errors.length).toBe(100);
    });

    it('should handle empty endpoint strings', () => {
      trackError({
        statusCode: 500,
        message: 'Error',
        endpoint: '',
        method: 'GET',
      });

      const errors = getRecentErrors(10);
      expect(errors[0].endpoint).toBe('');
    });

    it('should handle fingerprint collisions correctly', () => {
      // Track 1000 errors to test hash collision handling
      for (let i = 0; i < 100; i++) {
        trackError({
          statusCode: 500,
          message: `Error ${i}`,
          endpoint: '/api/test',
          method: 'GET',
        });
      }

      const stats = getErrorStats();

      // Should have 100 errors with 100 unique fingerprints
      expect(stats.total).toBe(100);
      expect(Object.keys(stats.byFingerprint).length).toBe(100);
    });
  });
});
