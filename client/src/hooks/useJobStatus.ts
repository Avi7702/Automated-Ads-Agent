/**
 * useJobStatus - React hook for real-time job status updates via SSE
 *
 * Connects to the SSE endpoint and receives push updates for job progress,
 * completion, and failure events. Automatically cleans up on unmount or
 * when the job completes.
 *
 * Usage:
 *   const { status, isConnected } = useJobStatus(jobId);
 *
 *   if (status?.type === 'completed') {
 *     // Handle completion
 *   }
 */

import { useEffect, useState, useCallback } from 'react';

export interface JobProgress {
  stage?: 'queued' | 'starting' | 'processing' | 'uploading' | 'finalizing';
  percentage?: number;
  message?: string;
}

export interface JobStatus {
  type: 'status' | 'progress' | 'completed' | 'failed' | 'error';
  state?: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress?: JobProgress;
  result?: any;
  error?: string;
  message?: string;
}

export interface UseJobStatusOptions {
  /** Callback fired when job completes successfully */
  onComplete?: (result: any) => void;
  /** Callback fired when job fails */
  onFailed?: (error: string) => void;
  /** Callback fired on progress updates */
  onProgress?: (progress: JobProgress) => void;
}

export function useJobStatus(jobId: string | null, options: UseJobStatusOptions = {}) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { onComplete, onFailed, onProgress } = options;

  const resetState = useCallback(() => {
    setStatus(null);
    setIsConnected(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!jobId) {
      resetState();
      return;
    }

    let eventSource: EventSource | null = null;

    try {
      // EventSource automatically sends cookies with withCredentials
      eventSource = new EventSource(`/api/jobs/${jobId}/stream`, {
        withCredentials: true,
      });

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as JobStatus;
          setStatus(data);

          // Call appropriate callback based on event type
          if (data.type === 'progress' && data.progress && onProgress) {
            onProgress(data.progress);
          }

          if (data.type === 'completed') {
            if (onComplete) {
              onComplete(data.result);
            }
            // Server closes the connection, but we also close from client side
            eventSource?.close();
            setIsConnected(false);
          }

          if (data.type === 'failed') {
            if (onFailed) {
              onFailed(data.error || 'Unknown error');
            }
            eventSource?.close();
            setIsConnected(false);
          }

          if (data.type === 'error') {
            setError(data.message || 'Unknown error');
            eventSource?.close();
            setIsConnected(false);
          }
        } catch (parseError) {
          console.error('Failed to parse SSE message:', parseError);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);
        setIsConnected(false);
        setError('Connection lost');
        eventSource?.close();
      };
    } catch (initError) {
      console.error('Failed to create EventSource:', initError);
      setError('Failed to connect');
    }

    // Cleanup on unmount or jobId change
    return () => {
      if (eventSource) {
        eventSource.close();
        setIsConnected(false);
      }
    };
  }, [jobId, onComplete, onFailed, onProgress, resetState]);

  return {
    /** Current job status */
    status,
    /** Whether SSE connection is active */
    isConnected,
    /** Error message if connection failed */
    error,
    /** Current progress (convenience accessor) */
    progress: status?.progress || null,
    /** Whether job is completed */
    isCompleted: status?.type === 'completed',
    /** Whether job failed */
    isFailed: status?.type === 'failed',
    /** Whether job is still processing */
    isProcessing: isConnected && status?.type !== 'completed' && status?.type !== 'failed',
  };
}
