import { useState, useEffect, useRef } from "react";

/**
 * Upload status response from backend
 */
interface UploadStatusResponse {
  id: string;
  status: "pending" | "scanning" | "extracting" | "completed" | "failed" | "expired";
  errorMessage?: string;
  extractedPatternId?: string;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  processingDurationMs?: number;
  expiresAt: string;
}

/**
 * Upload status with progress information
 */
export interface UploadStatus {
  status: "pending" | "scanning" | "extracting" | "completed" | "failed";
  progress: number;
  error?: string;
  isComplete: boolean;
  patternId?: string;
}

/**
 * Map backend status to progress percentage
 */
function getProgressFromStatus(status: UploadStatusResponse["status"]): number {
  switch (status) {
    case "pending":
      return 10;
    case "scanning":
      return 40;
    case "extracting":
      return 70;
    case "completed":
      return 100;
    case "failed":
    case "expired":
      return 0;
    default:
      return 0;
  }
}

/**
 * Hook for polling upload status from the backend
 *
 * Polls GET /api/learned-patterns/upload/${uploadId} every 500ms
 * Stops polling when status is 'completed' or 'failed'
 * Timeout after 30 seconds with error message
 *
 * @param uploadId - The upload ID to poll (null to disable polling)
 * @returns Upload status and polling state
 */
export function useUploadStatus(uploadId: string | null): UploadStatus & { isPolling: boolean } {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: "pending",
    progress: 0,
    isComplete: false,
  });
  const [isPolling, setIsPolling] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Don't poll if no uploadId
    if (!uploadId) {
      setIsPolling(false);
      return;
    }

    // Start polling
    setIsPolling(true);
    startTimeRef.current = Date.now();

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/learned-patterns/upload/${uploadId}`, {
          credentials: "include",
        });

        if (!res.ok) {
          // Handle HTTP errors
          if (res.status === 404) {
            setUploadStatus({
              status: "failed",
              progress: 0,
              error: "Upload not found",
              isComplete: true,
            });
          } else if (res.status === 403) {
            setUploadStatus({
              status: "failed",
              progress: 0,
              error: "Not authorized to access this upload",
              isComplete: true,
            });
          } else {
            console.error(`Upload status polling error: ${res.status} ${res.statusText}`);
            // Continue polling on other errors (might be transient)
            return;
          }

          // Stop polling on terminal errors
          setIsPolling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          return;
        }

        const data: UploadStatusResponse = await res.json();

        // Update status
        const newStatus: UploadStatus = {
          status: data.status === "expired" ? "failed" : data.status,
          progress: getProgressFromStatus(data.status),
          error: data.errorMessage,
          isComplete: data.status === "completed" || data.status === "failed" || data.status === "expired",
          patternId: data.extractedPatternId,
        };

        setUploadStatus(newStatus);

        // Stop polling if complete or failed
        if (newStatus.isComplete) {
          setIsPolling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        }
      } catch (error) {
        // Log error but continue polling (might be transient network issue)
        console.error("Upload status polling error:", error);
      }
    };

    // Poll immediately
    pollStatus();

    // Set up polling interval (500ms)
    pollIntervalRef.current = setInterval(pollStatus, 500);

    // Set up timeout (30 seconds)
    timeoutRef.current = setTimeout(() => {
      setUploadStatus({
        status: "failed",
        progress: 0,
        error: "Upload processing timed out after 30 seconds",
        isComplete: true,
      });
      setIsPolling(false);

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }, 30000);

    // Cleanup on unmount or uploadId change
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPolling(false);
    };
  }, [uploadId]);

  return {
    ...uploadStatus,
    isPolling,
  };
}
