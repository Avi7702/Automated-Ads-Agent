// @ts-nocheck
/**
 * BeforeAfterBuilder Component
 *
 * A 2-image comparison builder for transformation content.
 * Generates "before" and "after" images with proper copy.
 *
 * 2026 Best Practices (Research-based):
 * - Raw Content Revolution: Authenticity over perfection
 * - Real transformation stories outperform staged shots
 * - User-generated content style performs better than professional
 * - Side-by-side format works well on both Instagram and LinkedIn
 * - Include specific metrics in the transformation story
 */

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowRight,
  Download,
  ImageIcon,
  Loader2,
  Sparkles,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeftRight,
  Lightbulb,
} from "lucide-react";

interface BeforeAfterBuilderProps {
  templateId: string;
  topic: string;
  platform: string;
  productNames?: string[];
  productImageUrls?: string[];
  aspectRatio?: string;
  onClose: () => void;
  onComplete?: (result: BeforeAfterResult) => void;
}

interface BeforeAfterResult {
  beforeImage: string;
  afterImage: string;
  beforeLabel: string;
  afterLabel: string;
  caption: string;
  hashtags: string[];
}

interface ImageState {
  url: string | null;
  label: string;
  prompt: string;
  isGenerating: boolean;
  error: string | null;
}

// 2026 Best Practices Tips
const TRANSFORMATION_TIPS = [
  "Show real results, not staged perfection - authenticity wins in 2026",
  "Include specific metrics: 'Before: 2 hours | After: 20 minutes'",
  "Use consistent lighting/angle for honest comparison",
  "Raw, unpolished photos outperform professional shots on Instagram",
  "Tell the story behind the transformation in your caption",
  "Focus on the problem solved, not just the visual change",
];

export function BeforeAfterBuilder({
  templateId,
  topic,
  platform,
  productNames = [],
  productImageUrls = [],
  aspectRatio = "1080x1080",
  onClose,
  onComplete,
}: BeforeAfterBuilderProps) {
  // Image states
  const [beforeImage, setBeforeImage] = useState<ImageState>({
    url: null,
    label: "Before",
    prompt: "",
    isGenerating: false,
    error: null,
  });

  const [afterImage, setAfterImage] = useState<ImageState>({
    url: null,
    label: "After",
    prompt: "",
    isGenerating: false,
    error: null,
  });

  // Caption state
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  // Generate transformation context
  const generateContextMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/copywriting/standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          platform,
          tone: "authentic",
          framework: "bab", // Before-After-Bridge works great for transformations
          campaignObjective: "engagement",
          productName: productNames[0] || topic,
          productDescription: `Transformation story about: ${topic}`,
          industry: "general",
          variations: 1,
        }),
      });
      if (!response.ok) throw new Error("Failed to generate copy");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.variations?.[0]) {
        setCaption(data.variations[0].copy || "");
        setHashtags(data.variations[0].hashtags || []);
      }
    },
  });

  // Generate image mutation
  const generateImageMutation = useMutation({
    mutationFn: async ({
      prompt,
      type,
    }: {
      prompt: string;
      type: "before" | "after";
    }) => {
      const response = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${type === "before" ? "BEFORE state: " : "AFTER state: "}${prompt}. Professional photography, clear comparison shot, consistent lighting.`,
          resolution: "2K",
          mode: "standard",
          aspectRatio,
        }),
      });
      if (!response.ok) throw new Error("Failed to generate image");
      return response.json();
    },
  });

  // Generate before image
  const generateBeforeImage = useCallback(async () => {
    if (!beforeImage.prompt.trim()) return;

    setBeforeImage((prev) => ({ ...prev, isGenerating: true, error: null }));

    try {
      const result = await generateImageMutation.mutateAsync({
        prompt: beforeImage.prompt,
        type: "before",
      });

      setBeforeImage((prev) => ({
        ...prev,
        url: result.imageUrl || result.url,
        isGenerating: false,
      }));
    } catch (error) {
      setBeforeImage((prev) => ({
        ...prev,
        isGenerating: false,
        error: "Failed to generate image",
      }));
    }
  }, [beforeImage.prompt, generateImageMutation]);

  // Generate after image
  const generateAfterImage = useCallback(async () => {
    if (!afterImage.prompt.trim()) return;

    setAfterImage((prev) => ({ ...prev, isGenerating: true, error: null }));

    try {
      const result = await generateImageMutation.mutateAsync({
        prompt: afterImage.prompt,
        type: "after",
      });

      setAfterImage((prev) => ({
        ...prev,
        url: result.imageUrl || result.url,
        isGenerating: false,
      }));
    } catch (error) {
      setAfterImage((prev) => ({
        ...prev,
        isGenerating: false,
        error: "Failed to generate image",
      }));
    }
  }, [afterImage.prompt, generateImageMutation]);

  // Generate copy
  const generateCopy = useCallback(async () => {
    setIsGeneratingCopy(true);
    try {
      await generateContextMutation.mutateAsync();
    } finally {
      setIsGeneratingCopy(false);
    }
  }, [generateContextMutation]);

  // Download combined image
  const downloadCombined = useCallback(async () => {
    if (!beforeImage.url || !afterImage.url) return;

    // Create a canvas to combine both images side by side
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load both images
    const loadImage = (url: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });

    try {
      const [beforeImg, afterImg] = await Promise.all([
        loadImage(beforeImage.url),
        loadImage(afterImage.url),
      ]);

      // Set canvas size (side by side)
      const width = beforeImg.width + afterImg.width + 20; // 20px gap
      const height = Math.max(beforeImg.height, afterImg.height);
      canvas.width = width;
      canvas.height = height;

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Draw images
      ctx.drawImage(beforeImg, 0, 0);
      ctx.drawImage(afterImg, beforeImg.width + 20, 0);

      // Add labels
      ctx.font = "bold 48px Arial";
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.fillText(beforeImage.label, beforeImg.width / 2, 60);
      ctx.fillText(afterImage.label, beforeImg.width + 20 + afterImg.width / 2, 60);

      // Download
      const link = document.createElement("a");
      link.download = `before-after-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Failed to download combined image:", error);
    }
  }, [beforeImage, afterImage]);

  // Complete and return result
  const handleComplete = useCallback(() => {
    if (!beforeImage.url || !afterImage.url) return;

    const result: BeforeAfterResult = {
      beforeImage: beforeImage.url,
      afterImage: afterImage.url,
      beforeLabel: beforeImage.label,
      afterLabel: afterImage.label,
      caption,
      hashtags,
    };

    onComplete?.(result);
    onClose();
  }, [beforeImage, afterImage, caption, hashtags, onComplete, onClose]);

  const canComplete = beforeImage.url && afterImage.url;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Before/After Builder</CardTitle>
              <p className="text-sm text-muted-foreground">
                Create transformation content for {platform}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={viewMode === "edit" ? "default" : "outline"}>
              {viewMode === "edit" ? "Edit Mode" : "Preview Mode"}
            </Badge>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <div className="flex-1 overflow-hidden flex">
          {/* Main Content Area */}
          <div className="flex-1 overflow-auto p-6">
            {viewMode === "edit" ? (
              <div className="space-y-6">
                {/* 2026 Tips */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                        2026 Transformation Content Tips
                      </h4>
                      <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                        {TRANSFORMATION_TIPS.slice(0, 3).map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-600">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Image Panels */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Before Panel */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Before</h3>
                      <Input
                        value={beforeImage.label}
                        onChange={(e) =>
                          setBeforeImage((prev) => ({
                            ...prev,
                            label: e.target.value,
                          }))
                        }
                        className="w-32 text-sm"
                        placeholder="Label..."
                      />
                    </div>

                    <Textarea
                      value={beforeImage.prompt}
                      onChange={(e) =>
                        setBeforeImage((prev) => ({
                          ...prev,
                          prompt: e.target.value,
                        }))
                      }
                      placeholder="Describe the 'before' state... (e.g., 'Messy, disorganized warehouse with boxes scattered everywhere')"
                      rows={3}
                    />

                    <Button
                      onClick={generateBeforeImage}
                      disabled={!beforeImage.prompt.trim() || beforeImage.isGenerating}
                      className="w-full"
                    >
                      {beforeImage.isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Before Image
                        </>
                      )}
                    </Button>

                    {/* Before Image Preview */}
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                      {beforeImage.url ? (
                        <img
                          src={beforeImage.url}
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                      ) : beforeImage.error ? (
                        <div className="text-center text-destructive p-4">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">{beforeImage.error}</p>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground p-4">
                          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Generate or upload a "before" image</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* After Panel */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">After</h3>
                      <Input
                        value={afterImage.label}
                        onChange={(e) =>
                          setAfterImage((prev) => ({
                            ...prev,
                            label: e.target.value,
                          }))
                        }
                        className="w-32 text-sm"
                        placeholder="Label..."
                      />
                    </div>

                    <Textarea
                      value={afterImage.prompt}
                      onChange={(e) =>
                        setAfterImage((prev) => ({
                          ...prev,
                          prompt: e.target.value,
                        }))
                      }
                      placeholder="Describe the 'after' state... (e.g., 'Clean, organized warehouse with labeled shelving systems')"
                      rows={3}
                    />

                    <Button
                      onClick={generateAfterImage}
                      disabled={!afterImage.prompt.trim() || afterImage.isGenerating}
                      className="w-full"
                    >
                      {afterImage.isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate After Image
                        </>
                      )}
                    </Button>

                    {/* After Image Preview */}
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                      {afterImage.url ? (
                        <img
                          src={afterImage.url}
                          alt="After"
                          className="w-full h-full object-cover"
                        />
                      ) : afterImage.error ? (
                        <div className="text-center text-destructive p-4">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">{afterImage.error}</p>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground p-4">
                          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Generate or upload an "after" image</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Caption Section */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Caption</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateCopy}
                      disabled={isGeneratingCopy}
                    >
                      {isGeneratingCopy ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Caption
                        </>
                      )}
                    </Button>
                  </div>

                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption that tells the transformation story..."
                    rows={4}
                  />

                  {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map((tag, i) => (
                        <Badge key={i} variant="secondary">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Preview Mode */
              <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-white rounded-lg shadow-lg p-4 max-w-2xl">
                  {/* Side by side preview */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      {beforeImage.url ? (
                        <img
                          src={beforeImage.url}
                          alt="Before"
                          className="w-full rounded"
                        />
                      ) : (
                        <div className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-gray-400">Before</span>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                        {beforeImage.label}
                      </div>
                    </div>

                    <div className="flex items-center">
                      <ArrowRight className="w-6 h-6 text-muted-foreground" />
                    </div>

                    <div className="relative flex-1">
                      {afterImage.url ? (
                        <img
                          src={afterImage.url}
                          alt="After"
                          className="w-full rounded"
                        />
                      ) : (
                        <div className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-gray-400">After</span>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                        {afterImage.label}
                      </div>
                    </div>
                  </div>

                  {/* Caption preview */}
                  {caption && (
                    <div className="mt-4 text-sm">
                      <p className="whitespace-pre-wrap">{caption}</p>
                      {hashtags.length > 0 && (
                        <p className="text-blue-600 mt-2">
                          {hashtags.map((t) => `#${t}`).join(" ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === "edit" ? "preview" : "edit")}
            >
              {viewMode === "edit" ? "Preview" : "Edit"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={downloadCombined}
                    disabled={!canComplete}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Combined
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Download side-by-side comparison image
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button onClick={handleComplete} disabled={!canComplete}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export type { BeforeAfterBuilderProps, BeforeAfterResult };
