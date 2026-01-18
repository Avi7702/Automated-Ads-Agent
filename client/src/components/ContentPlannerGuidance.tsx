// @ts-nocheck
/**
 * ContentPlannerGuidance Component
 *
 * Displays template guidance when a user comes from Content Planner.
 * Shows hook formulas, post structure, platform recommendations, and what to avoid.
 * Provides "Generate Copy" and "Generate Image" functionality with template context.
 */

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  X,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  Loader2,
  BookOpen,
  Wand2,
  Image as ImageIcon,
  LayoutGrid,
  Play,
  Layers,
  Maximize2,
} from "lucide-react";
import type { ContentTemplate } from "@shared/contentTemplates";
import { Checkbox } from "@/components/ui/checkbox";

// Types for unified generation
interface Product {
  id: string;
  name: string;
  description?: string;
}

interface GenerateCompletePostResult {
  success: boolean;
  copy?: {
    headline: string;
    hook: string;
    bodyText: string;
    cta: string;
    caption: string;
    hashtags: string[];
    framework: string;
  };
  image?: {
    imageUrl: string;
    prompt: string;
  };
  copyError?: string;
  imageError?: string;
  template: {
    id: string;
    title: string;
    category: string;
  };
}

interface ContentPlannerGuidanceProps {
  template: ContentTemplate;
  platform: string;
  onDismiss: () => void;
  onSelectHook: (hook: string) => void;
  onGenerateCopy: (copy: string) => void;
  onSetAspectRatio?: (ratio: string) => void;
  onGenerateImage?: () => void;
  onGenerateComplete?: (result: GenerateCompletePostResult) => void;
  productNames?: string[];
  hasProductsSelected?: boolean;
  // 2026 AI-First: Products for unified generation
  availableProducts?: Product[];
  selectedProductIds?: string[];
  onProductSelectionChange?: (productIds: string[]) => void;
}

// Map template category to copywriting campaign objective
function getCampaignObjective(category: string): string {
  const mapping: Record<string, string> = {
    'product_showcase': 'conversion',
    'educational': 'awareness',
    'industry_insights': 'awareness',
    'customer_success': 'consideration',
    'company_updates': 'engagement',
    'engagement': 'engagement',
  };
  return mapping[category] || 'awareness';
}

// Infer copywriting framework from post structure
function inferFramework(postStructure: string): string {
  const lowerStructure = postStructure.toLowerCase();
  if (lowerStructure.includes('problem') && lowerStructure.includes('agitate')) {
    return 'PAS';
  }
  if (lowerStructure.includes('attention') && lowerStructure.includes('interest') && lowerStructure.includes('desire')) {
    return 'AIDA';
  }
  if (lowerStructure.includes('before') && lowerStructure.includes('after')) {
    return 'BAB';
  }
  if (lowerStructure.includes('feature') && lowerStructure.includes('advantage') && lowerStructure.includes('benefit')) {
    return 'FAB';
  }
  return 'Auto';
}

// Detect visual format from template and return recommended aspect ratio
interface VisualFormat {
  type: 'carousel' | 'reel' | 'story' | 'post' | 'video';
  aspectRatio: string;
  aspectRatioLabel: string;
  slideCount?: string;
  description: string;
}

function detectVisualFormat(format: string): VisualFormat {
  const lowerFormat = format.toLowerCase();

  // Carousel detection
  if (lowerFormat.includes('carousel')) {
    const slideMatch = format.match(/(\d+)-?(\d+)?\s*slides?/i);
    const slideCount = slideMatch ? `${slideMatch[1]}${slideMatch[2] ? `-${slideMatch[2]}` : ''}` : '6-10';
    return {
      type: 'carousel',
      aspectRatio: '1080x1350',
      aspectRatioLabel: '1080×1350 (Portrait)',
      slideCount,
      description: `Carousel with ${slideCount} slides - Portrait format recommended`,
    };
  }

  // Reel/Story detection
  if (lowerFormat.includes('reel') || lowerFormat.includes('story') || lowerFormat.includes('stories')) {
    return {
      type: 'reel',
      aspectRatio: '1080x1920',
      aspectRatioLabel: '1080×1920 (Story/Reel)',
      description: 'Vertical video format (9:16)',
    };
  }

  // Video detection
  if (lowerFormat.includes('video')) {
    return {
      type: 'video',
      aspectRatio: '1920x1080',
      aspectRatioLabel: '1920×1080 (Landscape HD)',
      description: 'Landscape video format (16:9)',
    };
  }

  // Default to standard post
  return {
    type: 'post',
    aspectRatio: '1200x627',
    aspectRatioLabel: '1200×627 (LinkedIn Post)',
    description: 'Standard post format',
  };
}

// Get icon for format type
function getFormatIcon(type: VisualFormat['type']) {
  switch (type) {
    case 'carousel':
      return Layers;
    case 'reel':
    case 'story':
      return Play;
    case 'video':
      return Play;
    case 'post':
    default:
      return ImageIcon;
  }
}

export function ContentPlannerGuidance({
  template,
  platform,
  onDismiss,
  onSelectHook,
  onGenerateCopy,
  onSetAspectRatio,
  onGenerateImage,
  onGenerateComplete,
  productNames = [],
  hasProductsSelected = false,
  availableProducts = [],
  selectedProductIds = [],
  onProductSelectionChange,
}: ContentPlannerGuidanceProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedHookIndex, setCopiedHookIndex] = useState<number | null>(null);
  const [showAllHooks, setShowAllHooks] = useState(false);
  const [topicInput, setTopicInput] = useState('');

  // Detect visual format from the first platform's format
  const visualFormat = detectVisualFormat(template.bestPlatforms[0]?.format || '');
  const FormatIcon = getFormatIcon(visualFormat.type);

  // Check product requirements
  const productRequirement = template.productRequirement || 'optional';
  const minProducts = template.minProducts || 1;
  const meetsProductRequirement =
    productRequirement === 'none' ||
    (productRequirement === 'optional') ||
    (productRequirement === 'recommended' && true) || // Always allow skip for recommended
    (productRequirement === 'required' && selectedProductIds.length >= minProducts);

  // Handle product selection toggle
  const handleProductToggle = (productId: string) => {
    if (!onProductSelectionChange) return;
    const newSelection = selectedProductIds.includes(productId)
      ? selectedProductIds.filter(id => id !== productId)
      : [...selectedProductIds, productId];
    onProductSelectionChange(newSelection);
  };

  // 2026 AI-First: Unified generation mutation
  const generateCompleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/content-planner/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          templateId: template.id,
          productIds: selectedProductIds,
          topic: topicInput.trim() || undefined,
          platform: platform.toLowerCase(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate post');
      }

      return response.json() as Promise<GenerateCompletePostResult>;
    },
    onSuccess: (result) => {
      if (onGenerateComplete) {
        onGenerateComplete(result);
      }
      // Also trigger the copy callback if we got copy
      if (result.copy?.caption) {
        onGenerateCopy(result.copy.caption);
      }
    },
  });

  // Generate copy mutation (legacy)
  const generateCopyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/copywriting/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          platform: platform.toLowerCase(),
          tone: 'professional',
          framework: inferFramework(template.postStructure),
          campaignObjective: getCampaignObjective(template.category),
          productBenefits: template.exampleTopics.slice(0, 3).join('. '),
          targetAudience: {
            demographics: 'Construction professionals, contractors, engineers',
            interests: 'Steel construction, building materials, industry best practices',
            painPoints: 'Finding reliable suppliers, meeting specifications, managing timelines',
          },
          context: `Content Type: ${template.title}. Hook style: ${template.hookFormulas[0]}. Post structure: ${template.postStructure}`,
          numVariations: 1,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate copy');
      }

      const data = await response.json();
      return data.variations?.[0]?.copy || data.copy || 'Copy generation failed';
    },
    onSuccess: (copy) => {
      onGenerateCopy(copy);
    },
  });

  const handleCopyHook = (hook: string, index: number) => {
    navigator.clipboard.writeText(hook);
    setCopiedHookIndex(index);
    setTimeout(() => setCopiedHookIndex(null), 2000);
  };

  const handleUseHook = (hook: string) => {
    onSelectHook(hook);
  };

  // Category display names
  const categoryNames: Record<string, string> = {
    'product_showcase': 'Product Showcase',
    'educational': 'Educational',
    'industry_insights': 'Industry Insights',
    'customer_success': 'Customer Success',
    'company_updates': 'Company Updates',
    'engagement': 'Engagement',
  };

  const displayedHooks = showAllHooks ? template.hookFormulas : template.hookFormulas.slice(0, 2);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                Content Planner Template
              </span>
            </div>
            <CardTitle className="text-lg">
              {categoryNames[template.category] || template.category} → {template.title}
            </CardTitle>
            <CardDescription className="text-sm">
              {template.description}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Platform recommendations */}
        <div className="flex flex-wrap gap-2 mt-3">
          {template.bestPlatforms.map((p, i) => (
            <Badge
              key={i}
              variant={p.platform.toLowerCase() === platform.toLowerCase() ? "default" : "outline"}
              className="text-xs"
            >
              {p.platform}: {p.format}
            </Badge>
          ))}
        </div>

        {/* Visual Format Detection Section */}
        <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <FormatIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Recommended Format
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Format Type Badge */}
                <Badge variant="secondary" className="text-xs font-medium capitalize">
                  {visualFormat.type}
                </Badge>

                {/* Aspect Ratio Badge */}
                <Badge variant="outline" className="text-xs">
                  <Maximize2 className="w-3 h-3 mr-1" />
                  {visualFormat.aspectRatioLabel}
                </Badge>

                {/* Slide Count Badge (for carousels only) */}
                {visualFormat.slideCount && (
                  <Badge variant="outline" className="text-xs">
                    <Layers className="w-3 h-3 mr-1" />
                    {visualFormat.slideCount} slides
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {visualFormat.description}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {onSetAspectRatio && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => onSetAspectRatio(visualFormat.aspectRatio)}
                      >
                        <Maximize2 className="w-3 h-3 mr-1" />
                        Set Ratio
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Set aspect ratio to {visualFormat.aspectRatioLabel}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {onGenerateImage && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={onGenerateImage}
                        disabled={!hasProductsSelected}
                      >
                        <ImageIcon className="w-3 h-3 mr-1" />
                        Generate
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {hasProductsSelected
                        ? `Generate ${visualFormat.type} image`
                        : 'Select products first'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>

        {/* 2026 AI-First: Smart Product Detection & Unified Generation */}
        <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
          {/* Product Requirement Badge */}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-semibold text-green-900 dark:text-green-100">
              AI-Powered Generation
            </span>
            {productRequirement === 'required' && (
              <Badge variant="destructive" className="text-xs">
                Products Required ({minProducts}+)
              </Badge>
            )}
            {productRequirement === 'recommended' && (
              <Badge variant="secondary" className="text-xs">
                Products Recommended
              </Badge>
            )}
            {productRequirement === 'optional' && availableProducts.length > 0 && (
              <Badge variant="outline" className="text-xs">
                Products Optional
              </Badge>
            )}
          </div>

          {/* Product Selector (if products available and not 'none') */}
          {productRequirement !== 'none' && availableProducts.length > 0 && onProductSelectionChange && (
            <div className="mb-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                {productRequirement === 'required'
                  ? `Select at least ${minProducts} product${minProducts > 1 ? 's' : ''} to feature:`
                  : productRequirement === 'recommended'
                  ? 'Add products for richer content (optional):'
                  : 'Enhance with products (optional):'}
              </p>
              <div className="flex flex-wrap gap-2">
                {availableProducts.slice(0, 6).map((product) => (
                  <label
                    key={product.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-all text-xs",
                      selectedProductIds.includes(product.id)
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background hover:bg-muted border-border"
                    )}
                  >
                    <Checkbox
                      checked={selectedProductIds.includes(product.id)}
                      onCheckedChange={() => handleProductToggle(product.id)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="truncate max-w-[120px]">{product.name}</span>
                  </label>
                ))}
              </div>
              {selectedProductIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedProductIds.length} selected
                  {productRequirement === 'required' && selectedProductIds.length < minProducts && (
                    <span className="text-destructive ml-1">
                      (need {minProducts - selectedProductIds.length} more)
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Topic Input */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">
              Topic/Angle (optional):
            </label>
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder={template.exampleTopics[0] || "e.g., Product durability comparison"}
              className="w-full px-3 py-1.5 text-sm rounded-md border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Unified Generate Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={() => generateCompleteMutation.mutate()}
            disabled={generateCompleteMutation.isPending || !meetsProductRequirement}
          >
            {generateCompleteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Complete Post...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Complete Post
              </>
            )}
          </Button>

          {/* Status messages */}
          {!meetsProductRequirement && productRequirement === 'required' && (
            <p className="text-xs text-destructive mt-2 text-center">
              Select at least {minProducts} product{minProducts > 1 ? 's' : ''} to generate
            </p>
          )}
          {generateCompleteMutation.isError && (
            <p className="text-xs text-destructive mt-2 text-center">
              Generation failed. Please try again.
            </p>
          )}
          {generateCompleteMutation.isSuccess && generateCompleteMutation.data && (
            <div className="mt-2 text-xs space-y-1">
              {generateCompleteMutation.data.copy && (
                <p className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Copy generated
                </p>
              )}
              {generateCompleteMutation.data.copyError && (
                <p className="text-orange-600 dark:text-orange-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Copy: {generateCompleteMutation.data.copyError}
                </p>
              )}
              {generateCompleteMutation.data.image?.prompt && (
                <p className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Image prompt ready
                </p>
              )}
              {generateCompleteMutation.data.imageError && (
                <p className="text-orange-600 dark:text-orange-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Image: {generateCompleteMutation.data.imageError}
                </p>
              )}
            </div>
          )}

          {/* Secondary actions */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-green-200 dark:border-green-800">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => generateCopyMutation.mutate()}
              disabled={generateCopyMutation.isPending}
            >
              {generateCopyMutation.isPending ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Copy className="w-3 h-3 mr-1" />
              )}
              Copy Only
            </Button>
            {onGenerateImage && template.imageRequirement !== 'none' && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={onGenerateImage}
              >
                <ImageIcon className="w-3 h-3 mr-1" />
                Image Only
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between py-2 px-4 hover:bg-muted/50">
            <span className="text-sm font-medium">
              {isExpanded ? "Hide Details" : "Show Hook Formulas, Structure & Tips"}
            </span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Hook Formulas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Hook Formulas</span>
              </div>
              <div className="space-y-2">
                {displayedHooks.map((hook, index) => (
                  <div
                    key={index}
                    className="group flex items-start gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm italic flex-1">"{hook}"</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleCopyHook(hook, index)}
                            >
                              {copiedHookIndex === index ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy to clipboard</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleUseHook(hook)}
                            >
                              <Wand2 className="w-3 h-3 text-primary" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Use this hook</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
                {template.hookFormulas.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setShowAllHooks(!showAllHooks)}
                  >
                    {showAllHooks ? "Show less" : `+${template.hookFormulas.length - 2} more hooks`}
                  </Button>
                )}
              </div>
            </div>

            {/* Post Structure */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Post Structure</span>
              </div>
              <pre className="text-xs p-3 rounded-md bg-muted/30 whitespace-pre-wrap font-mono leading-relaxed">
                {template.postStructure}
              </pre>
            </div>

            {/* What to Avoid */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">What to Avoid</span>
              </div>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {template.whatToAvoid.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Example Topics */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Example Topics</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {template.exampleTopics.slice(0, 4).map((topic, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => onSelectHook(topic)}
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Generate Copy Button */}
            <div className="pt-2 border-t">
              <Button
                className="w-full"
                onClick={() => generateCopyMutation.mutate()}
                disabled={generateCopyMutation.isPending}
              >
                {generateCopyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Copy...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate {platform} Copy with Template Context
                  </>
                )}
              </Button>
              {generateCopyMutation.isError && (
                <p className="text-xs text-destructive mt-2 text-center">
                  Failed to generate copy. Please try again.
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
