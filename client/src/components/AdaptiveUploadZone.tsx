// @ts-nocheck
/**
 * AdaptiveUploadZone Component
 *
 * A smart upload zone that adapts based on pattern library state:
 * - Empty state: Full onboarding experience with feature highlights
 * - Compact state: Minimal upload zone for existing pattern libraries
 *
 * Features:
 * - Drag & drop with visual feedback
 * - File validation (JPG, PNG, WebP, GIF, max 5MB)
 * - Metadata collection dialog
 * - Upload progress with status messages
 * - Privacy trust builders
 * - Framer Motion animations with reduced-motion support
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Upload,
  Sparkles,
  Shield,
  Brain,
  Loader2,
  Layout,
  Palette,
  Target,
  Image as ImageIcon,
  BarChart3,
  Star,
  Zap,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================
// Constants
// ============================================

const PATTERN_CATEGORIES = [
  { value: "product_showcase", label: "Product Showcase", icon: ImageIcon, color: "blue" },
  { value: "testimonial", label: "Testimonial", icon: Star, color: "yellow" },
  { value: "comparison", label: "Comparison", icon: BarChart3, color: "green" },
  { value: "educational", label: "Educational", icon: Brain, color: "purple" },
  { value: "promotional", label: "Promotional", icon: Zap, color: "orange" },
  { value: "brand_awareness", label: "Brand Awareness", icon: Target, color: "pink" },
];

const PLATFORMS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter/X" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "pinterest", label: "Pinterest" },
  { value: "general", label: "General" },
];

const ENGAGEMENT_TIERS = [
  { value: "top-1", label: "Top 1%", color: "text-yellow-600 dark:text-yellow-400" },
  { value: "top-5", label: "Top 5%", color: "text-orange-600 dark:text-orange-400" },
  { value: "top-10", label: "Top 10%", color: "text-blue-600 dark:text-blue-400" },
  { value: "top-25", label: "Top 25%", color: "text-green-600 dark:text-green-400" },
  { value: "unverified", label: "Unverified", color: "text-muted-foreground" },
];

// ============================================
// Types
// ============================================

interface UploadMetadata {
  name: string;
  category: string;
  platform: string;
  industry?: string;
  engagementTier?: string;
}

interface AdaptiveUploadZoneProps {
  patterns: any[];
  onUpload: (file: File, metadata: UploadMetadata) => void;
  isUploading: boolean;
  uploadProgress: number;
  uploadStatus?: 'pending' | 'scanning' | 'extracting' | 'completed' | 'failed';
  uploadError?: string;
}

// ============================================
// Main Component
// ============================================

export function AdaptiveUploadZone({
  patterns,
  onUpload,
  isUploading,
  uploadProgress,
  uploadStatus,
  uploadError,
}: AdaptiveUploadZoneProps) {
  const isEmpty = patterns.length === 0;
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [metadata, setMetadata] = useState<UploadMetadata>({
    name: "",
    category: "product_showcase",
    platform: "general",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // ============================================
  // File Validation
  // ============================================

  const validateFile = (file: File): string | null => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return "Invalid file type. Please upload JPG, PNG, WebP, or GIF.";
    }
    if (file.size > maxSize) {
      return "File too large. Maximum size is 5MB.";
    }
    return null;
  };

  // ============================================
  // Drag & Drop Handlers
  // ============================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      // Error handled by parent
      return;
    }

    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMetadata(prev => ({ ...prev, name: file.name.replace(/\.[^.]+$/, "") }));
    setShowMetadataForm(true);
  }, []);

  // ============================================
  // File Selection Handler
  // ============================================

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) return;

    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMetadata(prev => ({ ...prev, name: file.name.replace(/\.[^.]+$/, "") }));
    setShowMetadataForm(true);
  };

  // ============================================
  // Form Handlers
  // ============================================

  const handleSubmit = () => {
    if (!previewFile || !metadata.name) return;
    onUpload(previewFile, metadata);
    setShowMetadataForm(false);
  };

  const handleCancel = () => {
    setPreviewFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setShowMetadataForm(false);
    setMetadata({ name: "", category: "product_showcase", platform: "general" });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // ============================================
  // Upload Status Message
  // ============================================

  const getUploadStatusMessage = () => {
    if (uploadProgress < 30) return "Scanning for privacy...";
    if (uploadProgress >= 30 && uploadProgress < 70) return "Extracting visual patterns...";
    if (uploadProgress >= 70) return "Saving to your library...";
    return "Processing...";
  };

  // ============================================
  // Empty State Render
  // ============================================

  if (isEmpty) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6"
        >
          {/* Hero Icon */}
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Brain className="w-12 h-12 text-primary" />
            </div>
            <div className="absolute -right-2 -bottom-2 w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/30 to-orange-500/20 dark:from-yellow-500/20 dark:to-orange-500/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="max-w-md">
            <h2 className="text-2xl font-display font-semibold mb-2">
              Learn from Your Winners
            </h2>
            <p className="text-muted-foreground">
              Upload high-performing ads to extract success patterns.
              Our AI analyzes layout, color psychology, hooks, and visual elements
              to help you create more winning ads.
            </p>
          </div>

          {/* CTA Button */}
          <Button size="lg" onClick={handleUploadClick} className="mt-2">
            <Upload className="w-4 h-4 mr-2" />
            Upload Your First Ad
          </Button>

          {/* Feature Highlights */}
          <div className="grid grid-cols-3 gap-6 mt-8 max-w-2xl">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                <Layout className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-medium">Layout Patterns</p>
              <p className="text-xs text-muted-foreground">Structure & hierarchy</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-sm font-medium">Color Psychology</p>
              <p className="text-xs text-muted-foreground">Mood & emotion</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium">Hook Patterns</p>
              <p className="text-xs text-muted-foreground">Persuasion tactics</p>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
          />
        </motion.div>

        {/* Metadata Form Dialog */}
        <MetadataFormDialog
          showMetadataForm={showMetadataForm}
          setShowMetadataForm={setShowMetadataForm}
          previewUrl={previewUrl}
          metadata={metadata}
          setMetadata={setMetadata}
          handleSubmit={handleSubmit}
          handleCancel={handleCancel}
        />
      </>
    );
  }

  // ============================================
  // Compact Mode Render
  // ============================================

  return (
    <>
      <motion.div
        initial={false}
        animate={{
          scale: isDragging ? 1.02 : 1,
          borderColor: isDragging ? "hsl(var(--primary))" : "hsl(var(--border))",
        }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadClick}
        className={cn(
          "relative cursor-pointer rounded-2xl border-2 border-dashed p-8 transition-colors",
          "bg-gradient-to-br from-background via-background to-muted/30",
          "hover:border-primary/50 hover:bg-muted/20",
          isDragging && "border-primary bg-primary/5 ring-4 ring-primary/20"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4 text-center">
          {/* Animated Icon */}
          <motion.div
            animate={{
              y: isDragging ? -8 : 0,
              scale: isDragging ? 1.1 : 1,
            }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2, type: "spring" }}
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30"
            )}
          >
            <Upload className={cn(
              "w-8 h-8 transition-colors",
              isDragging ? "text-primary" : "text-primary/70"
            )} />
          </motion.div>

          <div>
            <h3 className="text-lg font-semibold mb-1">
              {isDragging ? "Drop your ad here" : "Upload a winning ad"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Drag & drop or click to select • JPG, PNG, WebP, GIF • Max 5MB
            </p>
          </div>

          {/* Privacy Notice - Trust Builder Pattern */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
            <Shield className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            <span>AI extracts patterns only • No content stored</span>
          </div>
        </div>

        {/* Upload Progress Overlay */}
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4"
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Analyzing patterns...</p>
                <p className="text-sm text-muted-foreground">
                  {getUploadStatusMessage()}
                </p>
              </div>
              <Progress value={uploadProgress} className="w-48" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        <AnimatePresence>
          {uploadError && !isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-destructive/10 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4 border-2 border-destructive"
            >
              <div className="text-center max-w-sm px-4">
                <p className="font-medium text-destructive mb-2">Upload Failed</p>
                <p className="text-sm text-muted-foreground">{uploadError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUploadClick();
                  }}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Metadata Form Dialog */}
      <MetadataFormDialog
        showMetadataForm={showMetadataForm}
        setShowMetadataForm={setShowMetadataForm}
        previewUrl={previewUrl}
        metadata={metadata}
        setMetadata={setMetadata}
        handleSubmit={handleSubmit}
        handleCancel={handleCancel}
      />
    </>
  );
}

// ============================================
// Metadata Form Dialog Component
// ============================================

interface MetadataFormDialogProps {
  showMetadataForm: boolean;
  setShowMetadataForm: (show: boolean) => void;
  previewUrl: string | null;
  metadata: UploadMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<UploadMetadata>>;
  handleSubmit: () => void;
  handleCancel: () => void;
}

function MetadataFormDialog({
  showMetadataForm,
  setShowMetadataForm,
  previewUrl,
  metadata,
  setMetadata,
  handleSubmit,
  handleCancel,
}: MetadataFormDialogProps) {
  return (
    <Dialog open={showMetadataForm} onOpenChange={setShowMetadataForm}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Describe Your Winning Ad
          </DialogTitle>
          <DialogDescription>
            Help our AI understand the context for better pattern extraction
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Preview */}
          {previewUrl && (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Form Fields */}
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Pattern Name *</label>
              <Input
                value={metadata.name}
                onChange={(e) => setMetadata(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., High-Converting Product Hero"
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Category *</label>
                <Select
                  value={metadata.category}
                  onValueChange={(v) => setMetadata(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PATTERN_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className="w-4 h-4" />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Platform *</label>
                <Select
                  value={metadata.platform}
                  onValueChange={(v) => setMetadata(prev => ({ ...prev, platform: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((plat) => (
                      <SelectItem key={plat.value} value={plat.value}>
                        {plat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Industry</label>
                <Input
                  value={metadata.industry || ""}
                  onChange={(e) => setMetadata(prev => ({ ...prev, industry: e.target.value }))}
                  placeholder="e.g., SaaS, E-commerce"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  <span className="flex items-center gap-1">
                    Performance Tier
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        How well did this ad perform compared to others?
                      </TooltipContent>
                    </Tooltip>
                  </span>
                </label>
                <Select
                  value={metadata.engagementTier || "unverified"}
                  onValueChange={(v) => setMetadata(prev => ({ ...prev, engagementTier: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENGAGEMENT_TIERS.map((tier) => (
                      <SelectItem key={tier.value} value={tier.value}>
                        <span className={tier.color}>{tier.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!metadata.name}>
            <Sparkles className="w-4 h-4 mr-2" />
            Extract Patterns
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
