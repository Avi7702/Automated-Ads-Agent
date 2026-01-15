// @ts-nocheck
/**
 * Example usage of useUploadStatus hook
 *
 * This file demonstrates how to use the useUploadStatus hook
 * in a React component. DO NOT import this file in production.
 */

import { useUploadStatus } from "./useUploadStatus";

export function UploadStatusExample() {
  const [uploadId, setUploadId] = useState<string | null>(null);
  
  const { status, progress, error, isComplete, patternId, isPolling } = useUploadStatus(uploadId);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/learned-patterns/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const data = await res.json();
    setUploadId(data.uploadId); // Start polling
  };

  return (
    <div>
      <input type="file" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
      
      {isPolling && (
        <div>
          <p>Status: {status}</p>
          <p>Progress: {progress}%</p>
          <progress value={progress} max={100} />
        </div>
      )}
      
      {isComplete && !error && (
        <p>Upload complete! Pattern ID: {patternId}</p>
      )}
      
      {error && (
        <p style={{ color: "red" }}>Error: {error}</p>
      )}
    </div>
  );
}
