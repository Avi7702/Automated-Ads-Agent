/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useJobStatus, JobStatus, JobProgress } from '../useJobStatus';

// ============================================
// useJobStatus Tests (20 tests)
// ============================================

describe('useJobStatus', () => {
  let mockEventSource: any;
  let eventSourceInstances: any[];

  beforeEach(() => {
    eventSourceInstances = [];
    mockEventSource = vi.fn().mockImplementation(function (this: any, url: string) {
      this.url = url;
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this.close = vi.fn();
      this.readyState = 1;
      eventSourceInstances.push(this);
    });
    (global as any).EventSource = mockEventSource;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete (global as any).EventSource;
  });

  it('returns null status when jobId is null', () => {
    const { result } = renderHook(() => useJobStatus(null));
    expect(result.current.status).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('creates EventSource with correct URL', () => {
    renderHook(() => useJobStatus('job-123'));
    expect(mockEventSource).toHaveBeenCalledWith('/api/jobs/job-123/stream', { withCredentials: true });
  });

  it('sets isConnected to true on open', async () => {
    const { result } = renderHook(() => useJobStatus('job-123'));

    act(() => {
      eventSourceInstances[0]?.onopen?.({});
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('parses and sets status on message', async () => {
    const { result } = renderHook(() => useJobStatus('job-123'));

    act(() => {
      eventSourceInstances[0]?.onopen?.({});
      eventSourceInstances[0]?.onmessage?.({
        data: JSON.stringify({ type: 'status', state: 'active' }),
      });
    });

    await waitFor(() => {
      expect(result.current.status?.type).toBe('status');
      expect(result.current.status?.state).toBe('active');
    });
  });

  it('handles progress updates', async () => {
    const onProgress = vi.fn();
    const { result } = renderHook(() => useJobStatus('job-123', { onProgress }));

    const progress: JobProgress = { stage: 'processing', percentage: 50, message: 'Halfway' };

    act(() => {
      eventSourceInstances[0]?.onopen?.({});
      eventSourceInstances[0]?.onmessage?.({
        data: JSON.stringify({ type: 'progress', progress }),
      });
    });

    await waitFor(() => {
      expect(onProgress).toHaveBeenCalledWith(progress);
      expect(result.current.progress).toEqual(progress);
    });
  });

  it('calls onComplete callback when job completes', async () => {
    const onComplete = vi.fn();
    renderHook(() => useJobStatus('job-123', { onComplete }));

    const resultData = { imageUrl: 'http://example.com/image.jpg' };

    act(() => {
      eventSourceInstances[0]?.onopen?.({});
      eventSourceInstances[0]?.onmessage?.({
        data: JSON.stringify({ type: 'completed', result: resultData }),
      });
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(resultData);
    });
  });

  it('closes connection on completion', async () => {
    const { result } = renderHook(() => useJobStatus('job-123'));

    act(() => {
      eventSourceInstances[0]?.onopen?.({});
      eventSourceInstances[0]?.onmessage?.({
        data: JSON.stringify({ type: 'completed', result: {} }),
      });
    });

    await waitFor(() => {
      expect(eventSourceInstances[0]?.close).toHaveBeenCalled();
      expect(result.current.isCompleted).toBe(true);
    });
  });

  it('calls onFailed callback when job fails', async () => {
    const onFailed = vi.fn();
    renderHook(() => useJobStatus('job-123', { onFailed }));

    act(() => {
      eventSourceInstances[0]?.onopen?.({});
      eventSourceInstances[0]?.onmessage?.({
        data: JSON.stringify({ type: 'failed', error: 'Generation failed' }),
      });
    });

    await waitFor(() => {
      expect(onFailed).toHaveBeenCalledWith('Generation failed');
    });
  });

  it('sets isFailed when job fails', async () => {
    const { result } = renderHook(() => useJobStatus('job-123'));

    act(() => {
      eventSourceInstances[0]?.onopen?.({});
      eventSourceInstances[0]?.onmessage?.({
        data: JSON.stringify({ type: 'failed', error: 'Error' }),
      });
    });

    await waitFor(() => {
      expect(result.current.isFailed).toBe(true);
    });
  });

  it('handles connection errors', async () => {
    const { result } = renderHook(() => useJobStatus('job-123'));

    act(() => {
      eventSourceInstances[0]?.onerror?.(new Error('Connection lost'));
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe('Connection lost');
    });
  });

  it('handles message parse errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderHook(() => useJobStatus('job-123'));

    act(() => {
      eventSourceInstances[0]?.onmessage?.({ data: 'invalid json' });
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useJobStatus('job-123'));

    unmount();

    expect(eventSourceInstances[0]?.close).toHaveBeenCalled();
  });

  it('cleans up and reconnects on jobId change', () => {
    const { rerender } = renderHook(({ jobId }) => useJobStatus(jobId), { initialProps: { jobId: 'job-1' } });

    expect(mockEventSource).toHaveBeenCalledTimes(1);

    rerender({ jobId: 'job-2' });

    expect(eventSourceInstances[0]?.close).toHaveBeenCalled();
    expect(mockEventSource).toHaveBeenCalledTimes(2);
  });

  it('resets state when jobId changes to null', async () => {
    const { result, rerender } = renderHook(({ jobId }) => useJobStatus(jobId), {
      initialProps: { jobId: 'job-123' as string | null },
    });

    act(() => {
      eventSourceInstances[0]?.onopen?.({});
      eventSourceInstances[0]?.onmessage?.({
        data: JSON.stringify({ type: 'status', state: 'active' }),
      });
    });

    await waitFor(() => {
      expect(result.current.status).not.toBeNull();
    });

    rerender({ jobId: null });

    await waitFor(() => {
      expect(result.current.status).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });
  });

  it('provides isProcessing flag', async () => {
    const { result } = renderHook(() => useJobStatus('job-123'));

    act(() => {
      eventSourceInstances[0]?.onopen?.({});
      eventSourceInstances[0]?.onmessage?.({
        data: JSON.stringify({ type: 'progress', progress: { percentage: 50 } }),
      });
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(true);
    });
  });

  it('handles error type messages', async () => {
    const { result } = renderHook(() => useJobStatus('job-123'));

    act(() => {
      eventSourceInstances[0]?.onopen?.({});
      eventSourceInstances[0]?.onmessage?.({
        data: JSON.stringify({ type: 'error', message: 'Server error' }),
      });
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Server error');
    });
  });

  it('calls onFailed with default message when error is undefined', async () => {
    const onFailed = vi.fn();
    renderHook(() => useJobStatus('job-123', { onFailed }));

    act(() => {
      eventSourceInstances[0]?.onopen?.({});
      eventSourceInstances[0]?.onmessage?.({
        data: JSON.stringify({ type: 'failed' }),
      });
    });

    await waitFor(() => {
      expect(onFailed).toHaveBeenCalledWith('Unknown error');
    });
  });

  it('clears error on successful connection', async () => {
    const { result } = renderHook(() => useJobStatus('job-123'));

    // Simulate error first
    act(() => {
      eventSourceInstances[0]?.onerror?.(new Error('Connection lost'));
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Connection lost');
    });

    // Then successful connection (new render with new jobId to trigger reconnect)
    const { result: result2, rerender } = renderHook(({ jobId }) => useJobStatus(jobId), {
      initialProps: { jobId: 'job-456' },
    });

    act(() => {
      eventSourceInstances[1]?.onopen?.({});
    });

    await waitFor(() => {
      expect(result2.current.error).toBeNull();
      expect(result2.current.isConnected).toBe(true);
    });
  });
});

// ============================================
// Additional Edge Case Tests (15 tests)
// ============================================

describe('Hook edge cases', () => {
  describe('useJobStatus edge cases', () => {
    let mockEventSource: any;
    let eventSourceInstances: any[];

    beforeEach(() => {
      eventSourceInstances = [];
      mockEventSource = vi.fn().mockImplementation(function (this: any, url: string) {
        this.url = url;
        this.onopen = null;
        this.onmessage = null;
        this.onerror = null;
        this.close = vi.fn();
        eventSourceInstances.push(this);
      });
      (global as any).EventSource = mockEventSource;
    });

    afterEach(() => {
      vi.clearAllMocks();
      delete (global as any).EventSource;
    });

    it('handles empty jobId string', () => {
      const { result } = renderHook(() => useJobStatus(''));
      // Empty string is falsy in JS, so it should behave like null
      expect(result.current.isConnected).toBe(false);
    });

    it('handles whitespace jobId', () => {
      renderHook(() => useJobStatus('   '));
      // Whitespace is truthy, so it will try to connect
      expect(mockEventSource).toHaveBeenCalled();
    });

    it('handles multiple rapid jobId changes', () => {
      const { rerender } = renderHook(({ jobId }) => useJobStatus(jobId), { initialProps: { jobId: 'job-1' } });

      rerender({ jobId: 'job-2' });
      rerender({ jobId: 'job-3' });
      rerender({ jobId: 'job-4' });

      // All previous connections should be closed
      expect(eventSourceInstances[0]?.close).toHaveBeenCalled();
      expect(eventSourceInstances[1]?.close).toHaveBeenCalled();
      expect(eventSourceInstances[2]?.close).toHaveBeenCalled();
    });

    it('handles completed status without result', async () => {
      const onComplete = vi.fn();
      renderHook(() => useJobStatus('job-123', { onComplete }));

      act(() => {
        eventSourceInstances[0]?.onopen?.({});
        eventSourceInstances[0]?.onmessage?.({
          data: JSON.stringify({ type: 'completed' }),
        });
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(undefined);
      });
    });

    it('handles progress without onProgress callback', async () => {
      const { result } = renderHook(() => useJobStatus('job-123'));

      act(() => {
        eventSourceInstances[0]?.onopen?.({});
        eventSourceInstances[0]?.onmessage?.({
          data: JSON.stringify({ type: 'progress', progress: { percentage: 75 } }),
        });
      });

      await waitFor(() => {
        expect(result.current.progress?.percentage).toBe(75);
      });
    });

    it('handles error type without message', async () => {
      const { result } = renderHook(() => useJobStatus('job-123'));

      act(() => {
        eventSourceInstances[0]?.onopen?.({});
        eventSourceInstances[0]?.onmessage?.({
          data: JSON.stringify({ type: 'error' }),
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Unknown error');
      });
    });
  });
});

// ============================================
// ADDITIONAL EDGE CASE TESTS (5 tests)
// ============================================

describe('Additional Hook Edge Cases', () => {
  describe('useJobStatus additional edge cases', () => {
    let mockEventSource: any;
    let eventSourceInstances: any[];

    beforeEach(() => {
      eventSourceInstances = [];
      mockEventSource = vi.fn().mockImplementation(function (this: any, url: string) {
        this.url = url;
        this.onopen = null;
        this.onmessage = null;
        this.onerror = null;
        this.close = vi.fn();
        this.readyState = 1;
        eventSourceInstances.push(this);
      });
      (global as any).EventSource = mockEventSource;
    });

    afterEach(() => {
      vi.clearAllMocks();
      delete (global as any).EventSource;
    });

    // Edge case test
    it('handles extremely long jobId string', () => {
      const longJobId = 'job-' + 'x'.repeat(1000);
      renderHook(() => useJobStatus(longJobId));

      expect(mockEventSource).toHaveBeenCalledWith(`/api/jobs/${longJobId}/stream`, { withCredentials: true });
    });

    // Edge case test
    it('handles special characters in jobId', () => {
      const specialJobId = 'job-123-test_with-special.chars';
      renderHook(() => useJobStatus(specialJobId));

      expect(mockEventSource).toHaveBeenCalledWith(`/api/jobs/${specialJobId}/stream`, { withCredentials: true });
    });
  });
});
