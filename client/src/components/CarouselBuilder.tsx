// @ts-nocheck
/**
 * CarouselBuilder Component
 *
 * Business logic extracted to useCarouselBuilder hook.
 * Multi-slide carousel creation tool with outline generation,
 * per-slide image generation, and bulk ZIP download.
 */
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Layers,
  ChevronDown,
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
} from 'lucide-react';
import { useCarouselBuilder, type CarouselSlide } from '@/hooks/useCarouselBuilder';

// Purpose labels and colors
const purposeConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  hook: { label: 'Hook', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: Zap },
  problem: {
    label: 'Problem',
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    icon: AlertTriangle,
  },
  point: { label: 'Point', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: Target },
  solution: {
    label: 'Solution',
    color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    icon: Check,
  },
  proof: {
    label: 'Proof',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    icon: Eye,
  },
  cta: { label: 'CTA', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20', icon: Sparkles },
};

interface CarouselBuilderProps {
  templateId: string;
  topic: string;
  platform: string;
  productNames?: string[];
  productImageUrls?: string[];
  aspectRatio?: string;
  onClose: () => void;
  onComplete?: (outline: unknown) => void;
}

export function CarouselBuilder({
  templateId,
  topic,
  platform,
  productNames = [],
  productImageUrls = [],
  aspectRatio = '1080x1350',
  onClose,
  onComplete: _onComplete,
}: CarouselBuilderProps) {
  const q = useCarouselBuilder({ templateId, topic, platform, productNames, productImageUrls, aspectRatio });

  // Loading state
  if (q.isOutlinePending) {
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
  if (q.isOutlineError) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="w-8 h-8 text-destructive mb-4" />
          <p className="text-sm text-destructive">Failed to generate carousel outline</p>
          <Button variant="outline" className="mt-4" onClick={q.retryOutline}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!q.outline) return null;

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CarouselHeader
        outline={q.outline}
        slides={q.slides}
        slidesWithImagesCount={q.slidesWithImagesCount}
        allSlidesGenerated={q.allSlidesGenerated}
        isAnyGenerating={q.isAnyGenerating}
        isPreviewMode={q.isPreviewMode}
        platform={platform}
        aspectRatio={aspectRatio}
        onClose={onClose}
        onTogglePreview={() => q.setIsPreviewMode(!q.isPreviewMode)}
        onGenerateAll={q.generateAllImages}
        onDownloadZip={q.downloadAllAsZip}
      />

      <CardContent className="space-y-6">
        {/* Preview Mode */}
        {q.isPreviewMode && <CarouselPreview slides={q.slides} onGenerateSlide={q.generateSlideImage} />}

        {/* Edit Mode */}
        {!q.isPreviewMode && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SlideThumbnails
              slides={q.slides}
              activeSlide={q.activeSlide}
              onSelectSlide={q.setActiveSlide}
              onDownloadSlide={q.downloadSlide}
            />
            <SlideEditor
              slide={q.slides[q.activeSlide]}
              slideIndex={q.activeSlide}
              onUpdate={q.updateSlide}
              onGenerate={q.generateSlideImage}
              onDownload={q.downloadSlide}
            />
          </div>
        )}

        {/* Caption Section */}
        <CaptionSection outline={q.outline} copiedCaption={q.copiedCaption} onCopy={q.copyCaption} />

        {/* 2026 Best Practices Tip */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground">
            <strong className="text-primary">2026 Tip:</strong> Slide 1 is CRITICAL - 80% of engagement comes from the
            first slide. Make it bold, specific, and scroll-stopping. Educational carousels get 4.7% engagement vs 3.9%
            for product content.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Sub-components ──────────────────────────────────────

function CarouselHeader({
  outline,
  slides,
  slidesWithImagesCount,
  allSlidesGenerated,
  isAnyGenerating,
  isPreviewMode,
  platform,
  aspectRatio,
  onClose,
  onTogglePreview,
  onGenerateAll,
  onDownloadZip,
}: {
  outline: { title: string; description: string };
  slides: CarouselSlide[];
  slidesWithImagesCount: number;
  allSlidesGenerated: boolean;
  isAnyGenerating: boolean;
  isPreviewMode: boolean;
  platform: string;
  aspectRatio: string;
  onClose: () => void;
  onTogglePreview: () => void;
  onGenerateAll: () => void;
  onDownloadZip: () => void;
}) {
  return (
    <CardHeader className="pb-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wide">Carousel Builder</span>
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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <Badge variant="outline" className="capitalize">
          {platform}
        </Badge>
        <Badge variant="outline">{aspectRatio}</Badge>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={onTogglePreview}>
          {isPreviewMode ? (
            <>
              <Pencil className="w-4 h-4 mr-1" /> Edit Mode
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-1" /> Preview
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={onGenerateAll} disabled={isAnyGenerating}>
          <ImageIcon className="w-4 h-4 mr-1" /> Generate All Images
        </Button>
        {allSlidesGenerated && (
          <Button variant="default" size="sm" onClick={onDownloadZip}>
            <Archive className="w-4 h-4 mr-1" /> Download ZIP
          </Button>
        )}
      </div>
    </CardHeader>
  );
}

function CarouselPreview({
  slides,
  onGenerateSlide,
}: {
  slides: CarouselSlide[];
  onGenerateSlide: (index: number) => void;
}) {
  return (
    <div className="px-12">
      <Carousel className="w-full max-w-lg mx-auto">
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={index}>
              <div className="p-1">
                <Card className="overflow-hidden">
                  <CardContent className="p-0 aspect-[4/5] relative">
                    {slide.imageUrl ? (
                      <img src={slide.imageUrl} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
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
                            <Button variant="outline" size="sm" className="mt-2" onClick={() => onGenerateSlide(index)}>
                              Generate
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <p className="text-white font-bold text-lg">{slide.headline}</p>
                      <p className="text-white/80 text-sm mt-1">{slide.body}</p>
                    </div>
                    <div className="absolute top-3 left-3">
                      <Badge className={cn('text-xs', purposeConfig[slide.purpose]?.color)}>
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
  );
}

function SlideThumbnails({
  slides,
  activeSlide,
  onSelectSlide,
  onDownloadSlide,
}: {
  slides: CarouselSlide[];
  activeSlide: number;
  onSelectSlide: (index: number) => void;
  onDownloadSlide: (index: number) => void;
}) {
  return (
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
                  'p-3 rounded-lg border cursor-pointer transition-all',
                  activeSlide === index ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                )}
                onClick={() => onSelectSlide(index)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-16 h-20 rounded overflow-hidden flex-shrink-0 bg-muted">
                    {slide.imageUrl ? (
                      <img src={slide.imageUrl} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={cn('text-xs', config.color)}>
                        <Icon className="w-3 h-3 mr-1" />
                        {index + 1}. {config.label}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium truncate">{slide.headline}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{slide.body}</p>
                  </div>
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
                                onDownloadSlide(index);
                              }}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download slide</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {slide.error && <AlertTriangle className="w-4 h-4 text-destructive" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function SlideEditor({
  slide,
  slideIndex,
  onUpdate,
  onGenerate,
  onDownload,
}: {
  slide: CarouselSlide | undefined;
  slideIndex: number;
  onUpdate: (index: number, field: keyof CarouselSlide, value: string) => void;
  onGenerate: (index: number) => void;
  onDownload: (index: number) => void;
}) {
  if (!slide) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Pencil className="w-4 h-4" />
        Edit Slide {slideIndex + 1}
        <Badge variant="outline" className={cn('text-xs ml-2', purposeConfig[slide.purpose]?.color)}>
          {purposeConfig[slide.purpose]?.label}
        </Badge>
      </h3>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium">
            Headline <span className="text-muted-foreground">(max 40 chars)</span>
          </label>
          <Input
            value={slide.headline}
            onChange={(e) => onUpdate(slideIndex, 'headline', e.target.value)}
            maxLength={100}
            placeholder="Bold, attention-grabbing headline"
          />
          <p className="text-xs text-muted-foreground text-right">{slide.headline.length}/100</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium">
            Body <span className="text-muted-foreground">(max 100 chars)</span>
          </label>
          <Textarea
            value={slide.body}
            onChange={(e) => onUpdate(slideIndex, 'body', e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="Supporting text that explains the headline"
          />
          <p className="text-xs text-muted-foreground text-right">{slide.body.length}/200</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium">
            Image Prompt <span className="text-muted-foreground">(for AI generation)</span>
          </label>
          <Textarea
            value={slide.imagePrompt}
            onChange={(e) => onUpdate(slideIndex, 'imagePrompt', e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Describe the visual for this slide"
          />
          <p className="text-xs text-muted-foreground text-right">{slide.imagePrompt.length}/300</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium">Image</label>
          <div className="aspect-[4/5] max-w-[300px] rounded-lg border overflow-hidden bg-muted">
            {slide.imageUrl ? (
              <div className="relative w-full h-full">
                <img src={slide.imageUrl} alt={`Slide ${slideIndex + 1}`} className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onGenerate(slideIndex)}
                          disabled={slide.isGenerating}
                        >
                          <RefreshCw className={cn('w-4 h-4', slide.isGenerating && 'animate-spin')} />
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
                          onClick={() => onDownload(slideIndex)}
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
                {slide.isGenerating ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">Generating image...</p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground mb-2">No image generated yet</p>
                    <Button variant="default" size="sm" onClick={() => onGenerate(slideIndex)}>
                      <Sparkles className="w-4 h-4 mr-1" />
                      Generate Image
                    </Button>
                  </>
                )}
                {slide.error && <p className="text-xs text-destructive mt-2">{slide.error}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CaptionSection({
  outline,
  copiedCaption,
  onCopy,
}: {
  outline: { captionCopy: string; hashtags: string[] };
  copiedCaption: boolean;
  onCopy: () => void;
}) {
  return (
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
            <Textarea value={outline.captionCopy} readOnly rows={3} className="bg-background" />
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
          <Button variant="outline" size="sm" onClick={onCopy} className="w-full">
            {copiedCaption ? (
              <>
                <Check className="w-4 h-4 mr-1" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" /> Copy Caption & Hashtags
              </>
            )}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
