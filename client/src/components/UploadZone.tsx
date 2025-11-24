import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  className?: string;
}

export function UploadZone({ onFilesSelected, className }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  return (
    <div
      className={cn(
        "relative group cursor-pointer transition-all duration-300 ease-out",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileChange}
      />
      
      <div
        className={cn(
          "h-64 w-full rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 bg-card/50 backdrop-blur-sm p-8 text-center",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border group-hover:border-primary/50 group-hover:bg-card/80"
        )}
      >
        <div className="relative">
          <div className={cn(
            "absolute inset-0 rounded-full bg-primary/20 blur-xl transition-all duration-500",
            isDragging ? "opacity-100 scale-150" : "opacity-0 scale-50 group-hover:opacity-50"
          )} />
          <div className="relative h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center shadow-lg ring-1 ring-white/10">
            <Upload className={cn("h-8 w-8 text-primary transition-transform duration-300", isDragging ? "-translate-y-1" : "")} />
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="font-display text-xl font-medium text-foreground">
            Drop your product photo here
          </h3>
          <p className="text-muted-foreground text-sm">
            or click to browse (JPG, PNG, WEBP)
          </p>
        </div>
      </div>
    </div>
  );
}
