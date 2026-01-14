/**
 * Learn from Winners - Pattern Library
 *
 * World-class UI implementing 2026 best practices:
 * - Shape of AI patterns: Stream of Thought, Footprints, Disclosure, Trust Builders
 * - Spatial design with layered depth and glassmorphism accents
 * - Framer Motion micro-interactions (150-250ms for UI changes)
 * - Accessibility: prefers-reduced-motion support
 * - Data visualization for extracted patterns
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Upload,
  Sparkles,
  Eye,
  Trash2,
  Filter,
  Search,
  Grid3X3,
  List,
  TrendingUp,
  Zap,
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Brain,
  Palette,
  Layout,
  Target,
  Image as ImageIcon,
  BarChart3,
  Star,
  Clock,
  RefreshCw,
  ChevronRight,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Header } from "@/components/layout/Header";
import { useToast } from "@/hooks/use-toast";

// Types
import type { LearnedAdPattern, AdAnalysisUpload } from "@shared/schema";

// ============================================
// CONSTANTS
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
  { value: "top-1", label: "Top 1%", color: "text-yellow-500" },
  { value: "top-5", label: "Top 5%", color: "text-orange-500" },
  { value: "top-10", label: "Top 10%", color: "text-blue-500" },
  { value: "top-25", label: "Top 25%", color: "text-green-500" },
  { value: "unverified", label: "Unverified", color: "text-muted-foreground" },
];

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 }
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

// ============================================
// PATTERN UPLOAD ZONE - World-Class Drag & Drop
// ============================================

interface UploadZoneProps {
  onUpload: (file: File, metadata: UploadMetadata) => void;
  isUploading: boolean;
  uploadProgress: number;
}

interface UploadMetadata {
  name: string;
  category: string;
  platform: string;
  industry?: string;
  engagementTier?: string;
}

function PatternUploadZone({ onUpload, isUploading, uploadProgress }: UploadZoneProps) {
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      // Show error toast
      return;
    }

    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMetadata(prev => ({ ...prev, name: file.name.replace(/\.[^.]+$/, "") }));
    setShowMetadataForm(true);
  }, []);

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

  const handleSubmit = () => {
    if (!previewFile || !metadata.name) return;
    onUpload(previewFile, metadata);
    // Reset after upload starts
    setShowMetadataForm(false);
  };

  const handleCancel = () => {
    setPreviewFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setShowMetadataForm(false);
    setMetadata({ name: "", category: "product_showcase", platform: "general" });
  };

  return (
    <>
      {/* Drop Zone */}
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
        onClick={() => fileInputRef.current?.click()}
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
            <Shield className="w-3.5 h-3.5 text-green-500" />
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
                  {uploadProgress < 30 && "Scanning for privacy..."}
                  {uploadProgress >= 30 && uploadProgress < 70 && "Extracting visual patterns..."}
                  {uploadProgress >= 70 && "Saving to your library..."}
                </p>
              </div>
              <Progress value={uploadProgress} className="w-48" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Metadata Form Dialog */}
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
    </>
  );
}

// ============================================
// PATTERN VISUALIZATION - Data Viz Component
// ============================================

interface PatternVisualizationProps {
  pattern: LearnedAdPattern;
  compact?: boolean;
}

function PatternVisualization({ pattern, compact = false }: PatternVisualizationProps) {
  const shouldReduceMotion = useReducedMotion();

  // Calculate pattern strength scores for visualization
  const getPatternStrength = () => {
    let score = 0;
    let total = 0;

    if (pattern.layoutPattern) { score += 25; total += 25; }
    if (pattern.colorPsychology) { score += 25; total += 25; }
    if (pattern.hookPatterns) { score += 25; total += 25; }
    if (pattern.visualElements) { score += 25; total += 25; }

    return total > 0 ? Math.round((score / total) * 100) : 0;
  };

  const patternStrength = getPatternStrength();
  const confidencePercent = Math.round((pattern.confidenceScore || 0.8) * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {/* Mini radar chart representation */}
        <div className="relative w-12 h-12">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Background */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="2" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
            <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />

            {/* Pattern indicators */}
            {pattern.layoutPattern && (
              <circle cx="50" cy="10" r="4" fill="hsl(var(--primary))" />
            )}
            {pattern.colorPsychology && (
              <circle cx="90" cy="50" r="4" fill="hsl(217 91% 60%)" />
            )}
            {pattern.hookPatterns && (
              <circle cx="50" cy="90" r="4" fill="hsl(142 71% 45%)" />
            )}
            {pattern.visualElements && (
              <circle cx="10" cy="50" r="4" fill="hsl(280 65% 60%)" />
            )}
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Pattern Completeness</span>
            <span className="text-xs font-medium">{patternStrength}%</span>
          </div>
          <Progress value={patternStrength} className="h-1.5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pattern Categories Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Layout Pattern */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "p-3 rounded-xl border transition-colors",
            pattern.layoutPattern
              ? "bg-primary/5 border-primary/30"
              : "bg-muted/30 border-transparent opacity-50"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Layout className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Layout</span>
          </div>
          {pattern.layoutPattern ? (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Structure: <span className="text-foreground">{pattern.layoutPattern.structure}</span></p>
              <p>Whitespace: <span className="text-foreground">{pattern.layoutPattern.whitespaceUsage}</span></p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Not detected</p>
          )}
        </motion.div>

        {/* Color Psychology */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className={cn(
            "p-3 rounded-xl border transition-colors",
            pattern.colorPsychology
              ? "bg-blue-500/5 border-blue-500/30"
              : "bg-muted/30 border-transparent opacity-50"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Color</span>
          </div>
          {pattern.colorPsychology ? (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Mood: <span className="text-foreground">{pattern.colorPsychology.dominantMood}</span></p>
              <p>Scheme: <span className="text-foreground">{pattern.colorPsychology.colorScheme}</span></p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Not detected</p>
          )}
        </motion.div>

        {/* Hook Patterns */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "p-3 rounded-xl border transition-colors",
            pattern.hookPatterns
              ? "bg-green-500/5 border-green-500/30"
              : "bg-muted/30 border-transparent opacity-50"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Hook</span>
          </div>
          {pattern.hookPatterns ? (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Type: <span className="text-foreground">{pattern.hookPatterns.hookType}</span></p>
              <p>CTA: <span className="text-foreground">{pattern.hookPatterns.ctaStyle}</span></p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Not detected</p>
          )}
        </motion.div>

        {/* Visual Elements */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className={cn(
            "p-3 rounded-xl border transition-colors",
            pattern.visualElements
              ? "bg-purple-500/5 border-purple-500/30"
              : "bg-muted/30 border-transparent opacity-50"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium">Visuals</span>
          </div>
          {pattern.visualElements ? (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Style: <span className="text-foreground">{pattern.visualElements.imageStyle}</span></p>
              <p>Product: <span className="text-foreground">{pattern.visualElements.productVisibility}</span></p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Not detected</p>
          )}
        </motion.div>
      </div>

      {/* Confidence Score - Trust Builder */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm">AI Confidence</span>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={confidencePercent} className="w-20 h-2" />
          <span className="text-sm font-medium">{confidencePercent}%</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PATTERN CARD - Gallery Card Component
// ============================================

interface PatternCardProps {
  pattern: LearnedAdPattern;
  onView: () => void;
  onDelete: () => void;
  onApply: () => void;
}

function PatternCard({ pattern, onView, onDelete, onApply }: PatternCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const categoryInfo = PATTERN_CATEGORIES.find(c => c.value === pattern.category);
  const engagementInfo = ENGAGEMENT_TIERS.find(t => t.value === pattern.engagementTier);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      product_showcase: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
      testimonial: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
      comparison: "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
      educational: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30",
      promotional: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30",
      brand_awareness: "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30",
    };
    return colors[category] || "bg-muted";
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group"
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-200",
        "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
        isHovered && "ring-1 ring-primary/20"
      )}>
        {/* Header with badges */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold line-clamp-1">
                {pattern.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={cn("text-xs", getCategoryColor(pattern.category))}>
                  {categoryInfo?.label || pattern.category}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {pattern.platform}
                </Badge>
              </div>
            </div>

            {/* Engagement Tier Badge */}
            {pattern.engagementTier && pattern.engagementTier !== "unverified" && (
              <Tooltip>
                <TooltipTrigger>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30"
                  )}>
                    <TrendingUp className="w-3 h-3" />
                    {engagementInfo?.label}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Performance tier based on engagement metrics
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Pattern Visualization */}
          <PatternVisualization pattern={pattern} compact />

          {/* Usage Stats */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                {pattern.usageCount} uses
              </span>
              {pattern.lastUsedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(pattern.lastUsedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons - Show on Hover */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: isHovered ? 1 : 0,
              y: isHovered ? 0 : 10
            }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
            className="flex items-center gap-2 mt-4"
          >
            <Button size="sm" variant="default" className="flex-1" onClick={onApply}>
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Apply
            </Button>
            <Button size="sm" variant="outline" onClick={onView}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6"
    >
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Brain className="w-12 h-12 text-primary" />
        </div>
        <div className="absolute -right-2 -bottom-2 w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/30 to-orange-500/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-yellow-600" />
        </div>
      </div>

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

      <Button size="lg" onClick={onUpload} className="mt-2">
        <Upload className="w-4 h-4 mr-2" />
        Upload Your First Ad
      </Button>

      {/* Feature highlights */}
      <div className="grid grid-cols-3 gap-6 mt-8 max-w-2xl">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
            <Layout className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-sm font-medium">Layout Patterns</p>
          <p className="text-xs text-muted-foreground">Structure & hierarchy</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
            <Palette className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-sm font-medium">Color Psychology</p>
          <p className="text-xs text-muted-foreground">Mood & emotion</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-2">
            <Target className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm font-medium">Hook Patterns</p>
          <p className="text-xs text-muted-foreground">Persuasion tactics</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// LOADING SKELETON
// ============================================

function PatternSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-2 w-full mb-2" />
            <Skeleton className="h-1.5 w-3/4" />
          </div>
        </div>
        <Skeleton className="h-8 w-full mt-4" />
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function LearnFromWinners() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedPattern, setSelectedPattern] = useState<LearnedAdPattern | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Fetch patterns - API returns { patterns: [...], count: number, filters: {...} }
  interface PatternsResponse {
    patterns: LearnedAdPattern[];
    count: number;
    filters?: { category?: string; platform?: string; industry?: string };
  }

  const { data: patternsResponse, isLoading, error } = useQuery<PatternsResponse>({
    queryKey: ["learned-patterns", categoryFilter, platformFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (platformFilter !== "all") params.set("platform", platformFilter);

      const res = await fetch(`/api/learned-patterns?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch patterns");
      return res.json();
    },
  });

  // Extract patterns array with defensive check
  const patterns = Array.isArray(patternsResponse?.patterns)
    ? patternsResponse.patterns
    : [];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, metadata }: { file: File; metadata: UploadMetadata }) => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("name", metadata.name);
      formData.append("category", metadata.category);
      formData.append("platform", metadata.platform);
      if (metadata.industry) formData.append("industry", metadata.industry);
      if (metadata.engagementTier) formData.append("engagementTier", metadata.engagementTier);

      const res = await fetch("/api/learned-patterns/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      return res.json();
    },
    onMutate: () => {
      setIsUploading(true);
      setUploadProgress(0);
      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);
    },
    onSuccess: (data) => {
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);

      queryClient.invalidateQueries({ queryKey: ["learned-patterns"] });
      toast({
        title: "Pattern extracted successfully",
        description: `"${data.pattern?.name}" has been added to your library.`,
      });
    },
    onError: (error: Error) => {
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (patternId: string) => {
      const res = await fetch(`/api/learned-patterns/${patternId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete pattern");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learned-patterns"] });
      toast({
        title: "Pattern deleted",
        description: "The pattern has been removed from your library.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Could not delete the pattern. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter patterns - patterns is guaranteed to be an array
  const filteredPatterns = patterns.filter(p => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.platform.toLowerCase().includes(query) ||
        p.industry?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleUpload = (file: File, metadata: UploadMetadata) => {
    uploadMutation.mutate({ file, metadata });
  };

  const handleViewPattern = (pattern: LearnedAdPattern) => {
    setSelectedPattern(pattern);
    setShowDetailDialog(true);
  };

  const handleDeletePattern = (patternId: string) => {
    if (confirm("Are you sure you want to delete this pattern?")) {
      deleteMutation.mutate(patternId);
    }
  };

  const handleApplyPattern = (pattern: LearnedAdPattern) => {
    // Navigate to studio with pattern pre-selected
    window.location.href = `/?patternId=${pattern.id}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-7xl mx-auto py-8 px-4 sm:px-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-semibold">Learn from Winners</h1>
              <p className="text-sm text-muted-foreground">
                Extract success patterns from high-performing ads
              </p>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="mb-8">
          <PatternUploadZone
            onUpload={handleUpload}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <PatternSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load patterns</h3>
            <p className="text-muted-foreground mb-4">Please try refreshing the page.</p>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["learned-patterns"] })}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : !patterns || patterns.length === 0 ? (
          <EmptyState onUpload={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()} />
        ) : (
          <>
            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search patterns..."
                  className="pl-9"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {PATTERN_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {PLATFORMS.map((plat) => (
                      <SelectItem key={plat.value} value={plat.value}>
                        {plat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center border rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground mb-4">
              {filteredPatterns?.length || 0} pattern{(filteredPatterns?.length || 0) !== 1 ? "s" : ""} found
            </div>

            {/* Pattern Grid */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "flex flex-col gap-4"
              )}
            >
              <AnimatePresence mode="popLayout">
                {filteredPatterns?.map((pattern) => (
                  <PatternCard
                    key={pattern.id}
                    pattern={pattern}
                    onView={() => handleViewPattern(pattern)}
                    onDelete={() => handleDeletePattern(pattern.id)}
                    onApply={() => handleApplyPattern(pattern)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}

        {/* Pattern Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="sm:max-w-2xl">
            {selectedPattern && (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <DialogTitle className="text-xl">{selectedPattern.name}</DialogTitle>
                      <DialogDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">
                          {PATTERN_CATEGORIES.find(c => c.value === selectedPattern.category)?.label}
                        </Badge>
                        <Badge variant="secondary">{selectedPattern.platform}</Badge>
                        {selectedPattern.industry && (
                          <Badge variant="outline">{selectedPattern.industry}</Badge>
                        )}
                      </DialogDescription>
                    </div>
                    {selectedPattern.engagementTier && selectedPattern.engagementTier !== "unverified" && (
                      <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {ENGAGEMENT_TIERS.find(t => t.value === selectedPattern.engagementTier)?.label}
                      </Badge>
                    )}
                  </div>
                </DialogHeader>

                <div className="py-4">
                  <PatternVisualization pattern={selectedPattern} />
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto">
                    <Zap className="w-4 h-4" />
                    Used {selectedPattern.usageCount} times
                    {selectedPattern.lastUsedAt && (
                      <span>• Last used {new Date(selectedPattern.lastUsedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    handleApplyPattern(selectedPattern);
                    setShowDetailDialog(false);
                  }}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Apply Pattern
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
