// @ts-nocheck
/**
 * CarouselBuilder Component
 *
 * A comprehensive multi-slide carousel creation tool that:
 * 1. Displays and allows editing of slide content (headline, body, image prompt)
 * 2. Generates images for each slide using the existing /api/transform endpoint
 * 3. Shows carousel preview using embla-carousel
 * 4. Provides bulk download as ZIP and individual slide download
 *
 * 2026 Best Practices Implemented:
 * - 7 slides is optimal (sweet spot, 5-10 range)
 * - First slide is critical (80% of engagement)
 * - One idea per slide
 * - Mobile-first design with large, readable text
 */

import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Layers,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  ImageIcon,
  Download,
  Archive,
  Check,
  AlertTriangle,
  Pencil,
  Eye,
  RefreshCw,
  X,
  Copy,
  Zap,
  Target,
} from "lucide-react";

// Types for carousel data
interface CarouselSlide {
  slideNumber: number;
  purpose: 'hook' | 'problem' | 'point' | 'solution' | 'proof' | 'cta';
  headline: string;
  body: string;
  imagePrompt: string;
  imageUrl?: string;
  isGenerating?: boolean;
  error?: string;
}

interface CarouselOutline {
  title: string;
  description: string;
  slideCount: number;
  slides: CarouselSlide[];
  captionCopy: string;
  hashtags: string[];
}

interface CarouselBuilderProps {
  templateId: string;
  topic: string;
  platform: string;
  productNames?: string[];
  productImageUrls?: string[];
  aspectRatio?: string;
  onClose: () => void;
  onComplete?: (outline: CarouselOutline) => void;
}

// Purpose labels and colors
const purposeConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  hook: { label: 'Hook', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: Zap },
  problem: { label: 'Problem', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', icon: AlertTriangle },
  point: { label: 'Point', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: Target },
  solution: { label: 'Solution', color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20', icon: Check },
  proof: { label: 'Proof', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', icon: Eye },
  cta: { label: 'CTA', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20', icon: Sparkles },
};

export function CarouselBuilder({
  templateId,
  topic,
  platform,
  productNames = [],
  productImageUrls = [],
  aspectRatio = '1080x1350',
  onClose,
  onComplete,
}: CarouselBuilderProps) {
  const [outline, setOutline] = useState<CarouselOutline | null>(null);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // Generate carousel outline
  const generateOutlineMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/content-planner/carousel-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          templateId,
          topic,
          slideCount: 7, // 2026 sweet spot
          platform,
          productNames,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate carousel outline');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setOutline(data.outline);
      setSlides(data.outline.slides.map((s: CarouselSlide) => ({ ...s, imageUrl: undefined, isGenerating: false })));
    },
  });

  // Generate image for a specific slide
  const generateSlideImage = async (slideIndex: number) => {
    const slide = slides[slideIndex];
    if (!slide) return;

    // Update slide to show generating state
    setSlides(prev => prev.map((s, i) =>
      i === slideIndex ? { ...s, isGenerating: true, error: undefined } : s
    ));

    try {
      // Build prompt for image generation
      const imagePrompt = `${slide.imagePrompt}.
        Slide ${slideIndex + 1} of carousel about "${topic}".
        Purpose: ${slide.purpose}.
        Headline: "${slide.headline}".
        Design: Clean, professional, minimal text overlay ready.
        Aspect ratio: Portrait (4:5) for Instagram/LinkedIn carousel.`;

      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: imagePrompt,
          resolution: '2K',
          aspectRatio,
          mode: productImageUrls.length > 0 ? 'inspiration' : 'standard',
          productImageUrls: productImageUrls.slice(0, 2), // Use first 2 product images if available
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      const imageUrl = data.imageUrl || data.url;

      // Update slide with generated image
      setSlides(prev => prev.map((s, i) =>
        i === slideIndex ? { ...s, isGenerating: false, imageUrl } : s
      ));
    } catch (error) {
      setSlides(prev => prev.map((s, i) =>
        i === slideIndex ? { ...s, isGenerating: false, error: 'Failed to generate image' } : s
      ));
    }
  };

  // Generate all slide images
  const generateAllImages = async () => {
    for (let i = 0; i < slides.length; i++) {
      await generateSlideImage(i);
    }
  };

  // Update slide content
  const updateSlide = (index: number, field: keyof CarouselSlide, value: string) => {
    setSlides(prev => prev.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    ));
  };

  // Download single slide image
  const downloadSlide = async (slideIndex: number) => {
    const slide = slides[slideIndex];
    if (!slide?.imageUrl) return;

    try {
      const response = await fetch(slide.imageUrl);
      const blob = await response.blob();
      saveAs(blob, `slide-${slideIndex + 1}-${slide.purpose}.png`);
    } catch (error) {
      console.error('Failed to download slide:', error);
    }
  };

  // Download all slides as ZIP
  const downloadAllAsZip = async () => {
    const zip = new JSZip();
    const slidesWithImages = slides.filter(s => s.imageUrl);

    if (slidesWithImages.length === 0) return;

    for (const slide of slidesWithImages) {
      try {
        const response = await fetch(slide.imageUrl!);
        const blob = await response.blob();
        zip.file(`slide-${slide.slideNumber}-${slide.purpose}.png`, blob);
      } catch (error) {
        console.error(`Failed to add slide ${slide.slideNumber} to ZIP:`, error);
      }
    }

    // Add caption as text file
    if (outline?.captionCopy) {
      const captionText = `${outline.captionCopy}\n\n${outline.hashtags.map(h => `#${h}`).join(' ')}`;
      zip.file('caption.txt', captionText);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `carousel-${topic.slice(0, 30).replace(/\s+/g, '-')}.zip`);
  };

  // Copy caption to clipboard
  const copyCaption = () => {
    if (!outline) return;
    const fullCaption = `${outline.captionCopy}\n\n${outline.hashtags.map(h => `#${h}`).join(' ')}`;
    navigator.clipboard.writeText(fullCaption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  // Initial outline generation
  useEffect(() => {
    generateOutlineMutation.mutate();
  }, [templateId, topic]);

  // Count slides with images
  const slidesWithImagesCount = slides.filter(s => s.imageUrl).length;
  const allSlidesGenerated = slidesWithImagesCount === slides.length && slides.length > 0;

  // Loading state
  if (generateOutlineMutation.isPending) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Generating carousel outline...</p>
          <p className="text-xs text-muted-foreground mt-2">Using 2026 best practices (7 slides optimal)</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (generateOutlineMutation.isError) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="w-8 h-8 text-destructive mb-4" />
          <p className="text-sm text-destructive">Failed to generate carousel outline</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => generateOutlineMutation.mutate()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!outline) return null;

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                Carousel Builder
              </span>
              <Badge variant="outline" className="text-xs">
                {slides.length} slides
              </Badge>
              {slidesWithImagesCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {slidesWithImagesCount}/{slides.length} images
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{outline.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{outline.description}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Platform and action buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Badge variant="outline" className="capitalize">{platform}</Badge>
          <Badge variant="outline">{aspectRatio}</Badge>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? (
              <>
                <Pencil className="w-4 h-4 mr-1" />
                Edit Mode
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateAllImages}
            disabled={slides.some(s => s.isGenerating)}
          >
            <ImageIcon className="w-4 h-4 mr-1" />
            Generate All Images
          </Button>
          {allSlidesGenerated && (
            <Button
              variant="default"
              size="sm"
              onClick={downloadAllAsZip}
            >
              <Archive className="w-4 h-4 mr-1" />
              Download ZIP
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Preview Mode - Carousel View */}
        {isPreviewMode && (
          <div className="px-12">
            <Carousel className="w-full max-w-lg mx-auto">
              <CarouselContent>
                {slides.map((slide, index) => (
                  <CarouselItem key={index}>
                    <div className="p-1">
                      <Card className="overflow-hidden">
                        <CardContent className="p-0 aspect-[4/5] relative">
                          {slide.imageUrl ? (
                            <img
                              src={slide.imageUrl}
                              alt={`Slide ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                              {slide.isGenerating ? (
                                <>
                                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-2" />
                                  <p className="text-xs text-muted-foreground">Generating...</p>
                                </>
                              ) : (
                                <>
                                  <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                                  <p className="text-xs text-muted-foreground">No image yet</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => generateSlideImage(index)}
                                  >
                                    Generate
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                          {/* Overlay with headline */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                            <p className="text-white font-bold text-lg">{slide.headline}</p>
                            <p className="text-white/80 text-sm mt-1">{slide.body}</p>
                          </div>
                          {/* Slide number badge */}
                          <div className="absolute top-3 left-3">
                            <Badge className={cn("text-xs", purposeConfig[slide.purpose]?.color)}>
                              {index + 1}. {purposeConfig[slide.purpose]?.label}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Swipe or use arrows to preview all {slides.length} slides
            </p>
          </div>
        )}

        {/* Edit Mode - Slide Editor */}
        {!isPreviewMode && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Slide Thumbnails */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Slides ({slides.length})
              </h3>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {slides.map((slide, index) => {
                    const config = purposeConfig[slide.purpose] || purposeConfig.point;
                    const Icon = config.icon;

                    return (
                      <div
                        key={index}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all",
                          activeSlide === index
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                        onClick={() => setActiveSlide(index)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Thumbnail or placeholder */}
                          <div className="w-16 h-20 rounded overflow-hidden flex-shrink-0 bg-muted">
                            {slide.imageUrl ? (
                              <img
                                src={slide.imageUrl}
                                alt={`Slide ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : slide.isGenerating ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Slide info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={cn("text-xs", config.color)}>
                                <Icon className="w-3 h-3 mr-1" />
                                {index + 1}. {config.label}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium truncate">{slide.headline}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {slide.body}
                            </p>
                          </div>

                          {/* Status indicators */}
                          <div className="flex flex-col gap-1">
                            {slide.imageUrl && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadSlide(index);
                                      }}
                                    >
                                      <Download className="w-3 h-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Download slide</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {slide.error && (
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Active Slide Editor */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                Edit Slide {activeSlide + 1}
                {slides[activeSlide] && (
                  <Badge variant="outline" className={cn("text-xs ml-2", purposeConfig[slides[activeSlide].purpose]?.color)}>
                    {purposeConfig[slides[activeSlide].purpose]?.label}
                  </Badge>
                )}
              </h3>

              {slides[activeSlide] && (
                <div className="space-y-4">
                  {/* Headline */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium">
                      Headline <span className="text-muted-foreground">(max 40 chars)</span>
                    </label>
                    <Input
                      value={slides[activeSlide].headline}
                      onChange={(e) => updateSlide(activeSlide, 'headline', e.target.value)}
                      maxLength={100}
                      placeholder="Bold, attention-grabbing headline"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {slides[activeSlide].headline.length}/100
                    </p>
                  </div>

                  {/* Body */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium">
                      Body <span className="text-muted-foreground">(max 100 chars)</span>
                    </label>
                    <Textarea
                      value={slides[activeSlide].body}
                      onChange={(e) => updateSlide(activeSlide, 'body', e.target.value)}
                      maxLength={200}
                      rows={2}
                      placeholder="Supporting text that explains the headline"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {slides[activeSlide].body.length}/200
                    </p>
                  </div>

                  {/* Image Prompt */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium">
                      Image Prompt <span className="text-muted-foreground">(for AI generation)</span>
                    </label>
                    <Textarea
                      value={slides[activeSlide].imagePrompt}
                      onChange={(e) => updateSlide(activeSlide, 'imagePrompt', e.target.value)}
                      maxLength={300}
                      rows={3}
                      placeholder="Describe the visual for this slide"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {slides[activeSlide].imagePrompt.length}/300
                    </p>
                  </div>

                  {/* Image Preview/Generate */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Image</label>
                    <div className="aspect-[4/5] max-w-[300px] rounded-lg border overflow-hidden bg-muted">
                      {slides[activeSlide].imageUrl ? (
                        <div className="relative w-full h-full">
                          <img
                            src={slides[activeSlide].imageUrl}
                            alt={`Slide ${activeSlide + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 right-2 flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => generateSlideImage(activeSlide)}
                                    disabled={slides[activeSlide].isGenerating}
                                  >
                                    <RefreshCw className={cn("w-4 h-4", slides[activeSlide].isGenerating && "animate-spin")} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Regenerate image</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => downloadSlide(activeSlide)}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download image</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          {slides[activeSlide].isGenerating ? (
                            <>
                              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-2" />
                              <p className="text-xs text-muted-foreground">Generating image...</p>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                              <p className="text-xs text-muted-foreground mb-2">No image generated yet</p>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => generateSlideImage(activeSlide)}
                              >
                                <Sparkles className="w-4 h-4 mr-1" />
                                Generate Image
                              </Button>
                            </>
                          )}
                          {slides[activeSlide].error && (
                            <p className="text-xs text-destructive mt-2">{slides[activeSlide].error}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Caption Section */}
        <Collapsible defaultOpen={true}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between py-2 hover:bg-muted/50">
              <span className="text-sm font-medium flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Caption & Hashtags
              </span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg mt-2">
              <div className="space-y-2">
                <label className="text-xs font-medium">Caption</label>
                <Textarea
                  value={outline.captionCopy}
                  readOnly
                  rows={3}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Hashtags</label>
                <div className="flex flex-wrap gap-1">
                  {outline.hashtags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyCaption}
                className="w-full"
              >
                {copiedCaption ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Caption & Hashtags
                  </>
                )}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* 2026 Best Practices Tip */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground">
            <strong className="text-primary">2026 Tip:</strong> Slide 1 is CRITICAL - 80% of engagement comes from the first slide.
            Make it bold, specific, and scroll-stopping. Educational carousels get 4.7% engagement vs 3.9% for product content.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
