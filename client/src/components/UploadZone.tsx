import { useCallback, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, ImageIcon, AlertCircle, Loader2, Check, AlertTriangle, Pencil } from "lucide-react";
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
 * Allows users to drag-and-drop or select temporary images for one-time generation.
 * These images are NOT saved to the product catalog.
 *
 * New in Phase 9: Automatically analyzes uploads with AI and shows inline editable descriptions.
 */
export function UploadZone({
  uploads,
  onUploadsChange,
  maxFiles,
  disabled = false,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Update with analysis results - merge analyzed uploads into current state
    // Note: We need to work with the latest uploads state, which we track via the updatedUploads reference
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
  const handleRemove = (id: string) => {
    const upload = uploads.find((u) => u.id === id);
    if (upload) {
      URL.revokeObjectURL(upload.previewUrl);
    }
    onUploadsChange(uploads.filter((u) => u.id !== id));
  };

  // Handle description edit
  const handleDescriptionChange = (id: string, description: string) => {
    onUploadsChange(
      uploads.map((u) =>
        u.id === id ? { ...u, description, isEditing: false } : u
      )
    );
  };

  // Toggle edit mode
  const toggleEdit = (id: string, isEditing: boolean) => {
    onUploadsChange(
      uploads.map((u) => (u.id === id ? { ...u, isEditing } : u))
    );
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      uploads.forEach((u) => URL.revokeObjectURL(u.previewUrl));
    };
  }, []);

  const canAddMore = uploads.length < maxFiles && !disabled;

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 transition-all text-center cursor-pointer",
          isDragging
            ? "border-primary bg-primary/10"
            : canAddMore
            ? "border-border hover:border-primary/50"
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
            "w-8 h-8",
            isDragging ? "text-primary" : "text-muted-foreground"
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

      {/* Warning notice */}
      <div className="flex items-center gap-2 text-xs text-amber-500/80">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>These images are temporary and won't be saved to your catalog</span>
      </div>

      {/* Uploaded Files Preview - With Analysis */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload) => (
            <UploadCard
              key={upload.id}
              upload={upload}
              onRemove={() => handleRemove(upload.id)}
              onDescriptionChange={(desc) => handleDescriptionChange(upload.id, desc)}
              onToggleEdit={(editing) => toggleEdit(upload.id, editing)}
            />
          ))}

          {/* Add more button */}
          {canAddMore && (
            <label className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Add more images</span>
            </label>
          )}
        </div>
      )}

      {/* File count */}
      {uploads.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {uploads.length} of {maxFiles} images uploaded
        </p>
      )}
    </div>
  );
}

/**
 * Individual upload card with inline editing
 */
interface UploadCardProps {
  upload: AnalyzedUpload;
  onRemove: () => void;
  onDescriptionChange: (description: string) => void;
  onToggleEdit: (isEditing: boolean) => void;
}

function UploadCard({ upload, onRemove, onDescriptionChange, onToggleEdit }: UploadCardProps) {
  const [editValue, setEditValue] = useState(upload.description || "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (upload.isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [upload.isEditing]);

  // Update edit value when description changes externally
  useEffect(() => {
    setEditValue(upload.description || "");
  }, [upload.description]);

  const handleSave = () => {
    onDescriptionChange(editValue.trim() || upload.description || "Image");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(upload.description || "");
      onToggleEdit(false);
    }
  };

  const isHighConfidence = upload.confidence >= AUTO_CONFIRM_THRESHOLD;

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg border border-border bg-card/50">
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden">
        <img
          src={upload.previewUrl}
          alt="Upload preview"
          className="w-full h-full object-cover"
        />

        {/* Status overlay */}
        {upload.status === "analyzing" && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {upload.status === "analyzing" ? (
          <p className="text-sm text-muted-foreground">Analyzing image...</p>
        ) : upload.isEditing ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="flex-1 text-sm bg-transparent border-b border-primary focus:outline-none"
              placeholder="Describe this image..."
            />
          </div>
        ) : (
          <div className="space-y-1">
            {/* Confidence badge */}
            <div className="flex items-center gap-1.5">
              {isHighConfidence ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-500">
                  <Check className="w-3 h-3" />
                  {upload.confidence}%
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                  <AlertTriangle className="w-3 h-3" />
                  {upload.confidence}%
                </span>
              )}
              {!isHighConfidence && (
                <span className="text-xs text-muted-foreground">Review suggested</span>
              )}
            </div>

            {/* Description */}
            <p
              className="text-sm text-foreground line-clamp-2 cursor-pointer hover:text-primary group flex items-start gap-1"
              onClick={() => onToggleEdit(true)}
            >
              <span className="flex-1">"{upload.description}"</span>
              <Pencil className="w-3 h-3 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </p>
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        title="Remove image"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Re-export types for convenience
export type { AnalyzedUpload };
