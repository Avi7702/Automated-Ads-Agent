import { useCallback, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, ImageIcon, AlertCircle } from "lucide-react";

interface UploadZoneProps {
  files: File[];
  onFilesAdded: (files: File[]) => void;
  onRemove: (index: number) => void;
  maxFiles: number;
  disabled?: boolean;
}

/**
 * UploadZone Component
 *
 * Allows users to drag-and-drop or select temporary images for one-time generation.
 * These images are NOT saved to the product catalog.
 */
export function UploadZone({
  files,
  onFilesAdded,
  onRemove,
  maxFiles,
  disabled = false,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const remainingSlots = maxFiles - files.length;
      const filesToAdd = droppedFiles.slice(0, remainingSlots);
      onFilesAdded(filesToAdd);
    }
  }, [disabled, files.length, maxFiles, onFilesAdded]);

  // Handle file picker
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;

    const selectedFiles = Array.from(e.target.files).filter(
      (file) => file.type.startsWith("image/")
    );

    if (selectedFiles.length > 0) {
      const remainingSlots = maxFiles - files.length;
      const filesToAdd = selectedFiles.slice(0, remainingSlots);
      onFilesAdded(filesToAdd);
    }

    // Reset input to allow selecting the same file again
    e.target.value = "";
  }, [disabled, files.length, maxFiles, onFilesAdded]);

  const handleClick = () => {
    if (!disabled && files.length < maxFiles) {
      fileInputRef.current?.click();
    }
  };

  const canAddMore = files.length < maxFiles && !disabled;

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

      {/* Uploaded Files Preview - Horizontal Scroll */}
      {files.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-border group"
            >
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X className="w-3 h-3 text-white" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                <p className="text-white text-[10px] truncate">{file.name}</p>
              </div>
            </div>
          ))}

          {/* Add more button */}
          {canAddMore && (
            <label className="relative flex-shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-1">
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Add</span>
              </div>
            </label>
          )}
        </div>
      )}

      {/* File count */}
      {files.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {files.length} of {maxFiles} images uploaded
        </p>
      )}
    </div>
  );
}
