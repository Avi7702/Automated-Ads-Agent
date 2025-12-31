import { useCallback, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, Loader2, Check, AlertTriangle, Pencil } from "lucide-react";
import type { AnalyzedUpload, ImageAnalysisResponse } from "@/types/analyzedUpload";
import { AUTO_CONFIRM_THRESHOLD } from "@/types/analyzedUpload";

interface UploadZoneProps {
  uploads: AnalyzedUpload[];
  onUploadsChange: (uploads: AnalyzedUpload[]) => void;
  maxFiles: number;
  disabled?: boolean;
}

/**
 * UploadZone Component
 *
 * Allows users to drag-and-drop or select images for generation.
 * Images are analyzed with AI and descriptions can be edited inline.
 */
export function UploadZone({
  uploads,
  onUploadsChange,
  maxFiles,
  disabled = false,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Generate unique ID
  const generateId = () => `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Analyze a single image
  const analyzeImage = async (upload: AnalyzedUpload): Promise<AnalyzedUpload> => {
    try {
      const formData = new FormData();
      formData.append("image", upload.file);

      const response = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data: ImageAnalysisResponse = await response.json();

      return {
        ...upload,
        description: data.description,
        confidence: data.confidence,
        status: "confirmed",
      };
    } catch (error) {
      console.error("[UploadZone] Analysis failed:", error);
      // Return with a fallback description
      return {
        ...upload,
        description: "Unable to analyze image",
        confidence: 0,
        status: "confirmed",
      };
    }
  };

  // Handle new files being added
  const handleFilesAdded = useCallback(async (files: File[]) => {
    const remainingSlots = maxFiles - uploads.length;
    const filesToAdd = files.slice(0, remainingSlots);

    // Create initial upload objects with 'analyzing' status
    const newUploads: AnalyzedUpload[] = filesToAdd.map((file) => ({
      id: generateId(),
      file,
      previewUrl: URL.createObjectURL(file),
      description: null,
      confidence: 0,
      status: "analyzing" as const,
    }));

    // Add them immediately (with analyzing status)
    const updatedUploads = [...uploads, ...newUploads];
    onUploadsChange(updatedUploads);

    // Analyze each one in parallel
    const analyzedUploads = await Promise.all(
      newUploads.map((upload) => analyzeImage(upload))
    );

    // Update with analysis results
    const finalUploads = updatedUploads.map((u) => {
      const analyzed = analyzedUploads.find((a) => a.id === u.id);
      return analyzed || u;
    });
    onUploadsChange(finalUploads);
  }, [uploads, maxFiles, onUploadsChange]);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type.startsWith("image/")
    );

    if (droppedFiles.length > 0) {
      handleFilesAdded(droppedFiles);
    }
  }, [disabled, handleFilesAdded]);

  // Handle file picker
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;

    const selectedFiles = Array.from(e.target.files).filter(
      (file) => file.type.startsWith("image/")
    );

    if (selectedFiles.length > 0) {
      handleFilesAdded(selectedFiles);
    }

    // Reset input to allow selecting the same file again
    e.target.value = "";
  }, [disabled, handleFilesAdded]);

  const handleClick = () => {
    if (!disabled && uploads.length < maxFiles) {
      fileInputRef.current?.click();
    }
  };

  // Handle remove
  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const upload = uploads.find((u) => u.id === id);
    if (upload) {
      URL.revokeObjectURL(upload.previewUrl);
    }
    onUploadsChange(uploads.filter((u) => u.id !== id));
  };

  // Handle edit
  const startEdit = (upload: AnalyzedUpload, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(upload.id);
    setEditValue(upload.description || "");
  };

  const saveEdit = () => {
    if (editingId) {
      onUploadsChange(
        uploads.map((u) =>
          u.id === editingId ? { ...u, description: editValue.trim() || "Image" } : u
        )
      );
      setEditingId(null);
      setEditValue("");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      uploads.forEach((u) => URL.revokeObjectURL(u.previewUrl));
    };
  }, []);

  const canAddMore = uploads.length < maxFiles && !disabled;

  return (
    <div className="space-y-4">
      {/* Image Grid - matches product grid style */}
      {uploads.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {uploads.map((upload) => {
            const isHighConfidence = upload.confidence >= AUTO_CONFIRM_THRESHOLD;
            const isEditing = editingId === upload.id;

            return (
              <div
                key={upload.id}
                className={cn(
                  "relative aspect-square rounded-xl overflow-hidden border-2 transition-all group",
                  "border-purple-500 ring-2 ring-purple-500/20"
                )}
              >
                <img
                  src={upload.previewUrl}
                  alt={upload.description || "Upload"}
                  className="w-full h-full object-cover"
                />

                {/* Analyzing overlay */}
                {upload.status === "analyzing" && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin mb-2" />
                    <span className="text-xs text-white">Analyzing...</span>
                  </div>
                )}

                {/* Confidence badge */}
                {upload.status === "confirmed" && (
                  <div className="absolute top-1 left-1">
                    {isHighConfidence ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-500/90 text-white text-[10px] font-medium">
                        <Check className="w-2.5 h-2.5" />
                        {upload.confidence}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/90 text-white text-[10px] font-medium">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {upload.confidence}%
                      </span>
                    )}
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={(e) => handleRemove(upload.id, e)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>

                {/* Bottom label with description */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="w-full text-xs text-white bg-transparent border-b border-white/50 focus:outline-none focus:border-white"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p
                      className="text-white text-xs truncate cursor-pointer hover:text-purple-300 flex items-center gap-1"
                      onClick={(e) => startEdit(upload, e)}
                      title={upload.description || "Click to edit"}
                    >
                      <span className="truncate">{upload.description || "Uploaded image"}</span>
                      <Pencil className="w-2.5 h-2.5 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add more button - styled like an empty product slot */}
          {canAddMore && (
            <label
              className={cn(
                "aspect-square rounded-xl border-2 border-dashed transition-all cursor-pointer",
                "border-border hover:border-purple-500/50 hover:bg-purple-500/5",
                "flex flex-col items-center justify-center gap-2"
              )}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Add more</span>
            </label>
          )}
        </div>
      )}

      {/* Drop Zone - only shown when no uploads */}
      {uploads.length === 0 && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 transition-all text-center cursor-pointer",
            isDragging
              ? "border-purple-500 bg-purple-500/10"
              : canAddMore
              ? "border-border hover:border-purple-500/50"
              : "border-border opacity-50 cursor-not-allowed",
          )}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file-upload"
          />

          <div className="flex flex-col items-center gap-2">
            <Upload className={cn(
              "w-10 h-10",
              isDragging ? "text-purple-500" : "text-muted-foreground"
            )} />
            <div>
              <p className="text-sm font-medium">
                {isDragging ? "Drop images here" : "Drag & drop images"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse • Max {maxFiles} images
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File count when uploads exist */}
      {uploads.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {uploads.length} of {maxFiles} images • AI-analyzed for IdeaBank suggestions
        </p>
      )}
    </div>
  );
}

// Re-export types for convenience
export type { AnalyzedUpload };
