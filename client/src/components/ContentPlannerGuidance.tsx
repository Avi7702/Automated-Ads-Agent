// @ts-nocheck
/**
 * ContentPlannerGuidance Component
 *
 * Business logic extracted to useContentPlannerGuidance hook.
 * Displays template guidance when a user comes from Content Planner.
 */
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  Play,
  Layers,
  Maximize2,
} from 'lucide-react';
import type { ContentTemplate } from '@shared/contentTemplates';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useContentPlannerGuidance,
  CATEGORY_NAMES,
  type Product,
  type GenerateCompletePostResult,
  type VisualFormat,
} from '@/hooks/useContentPlannerGuidance';

// ── Types ────────────────────────────────────────────────

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
  availableProducts?: Product[];
  selectedProductIds?: string[];
  onProductSelectionChange?: (productIds: string[]) => void;
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

// ── Main Component ──────────────────────────────────────

export function ContentPlannerGuidance({
  template,
  platform,
  onDismiss,
  onSelectHook,
  onGenerateCopy,
  onSetAspectRatio,
  onGenerateImage,
  onGenerateComplete,
  productNames: _productNames = [],
  hasProductsSelected = false,
  availableProducts = [],
  selectedProductIds = [],
  onProductSelectionChange,
}: ContentPlannerGuidanceProps) {
  const q = useContentPlannerGuidance({
    template,
    platform,
    onGenerateCopy,
    onGenerateComplete,
    selectedProductIds,
    onProductSelectionChange,
  });

  const FormatIcon = getFormatIcon(q.visualFormat.type);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">Content Planner Template</span>
            </div>
            <CardTitle className="text-lg">
              {CATEGORY_NAMES[template.category] || template.category} &rarr; {template.title}
            </CardTitle>
            <CardDescription className="text-sm">{template.description}</CardDescription>
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
              variant={p.platform.toLowerCase() === platform.toLowerCase() ? 'default' : 'outline'}
              className="text-xs"
            >
              {p.platform}: {p.format}
            </Badge>
          ))}
        </div>

        {/* Visual Format Detection */}
        <VisualFormatSection
          visualFormat={q.visualFormat}
          FormatIcon={FormatIcon}
          onSetAspectRatio={onSetAspectRatio}
          onGenerateImage={onGenerateImage}
          hasProductsSelected={hasProductsSelected}
        />

        {/* AI-Powered Generation */}
        <GenerationSection
          q={q}
          template={template}
          availableProducts={availableProducts}
          selectedProductIds={selectedProductIds}
          onGenerateImage={onGenerateImage}
        />
      </CardHeader>

      <Collapsible open={q.isExpanded} onOpenChange={q.setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between py-2 px-4 hover:bg-muted/50">
            <span className="text-sm font-medium">
              {q.isExpanded ? 'Hide Details' : 'Show Hook Formulas, Structure & Tips'}
            </span>
            {q.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Hook Formulas */}
            <HookFormulasSection
              displayedHooks={q.displayedHooks}
              allHooksCount={template.hookFormulas.length}
              copiedHookIndex={q.copiedHookIndex}
              showAllHooks={q.showAllHooks}
              onToggleShowAll={() => q.setShowAllHooks(!q.showAllHooks)}
              onCopyHook={q.handleCopyHook}
              onUseHook={onSelectHook}
            />

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
                    <span className="text-orange-500">&bull;</span>
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
                onClick={() => q.generateCopyMutation.mutate()}
                disabled={q.generateCopyMutation.isPending}
              >
                {q.generateCopyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Copy...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> Generate {platform} Copy with Template Context
                  </>
                )}
              </Button>
              {q.generateCopyMutation.isError && (
                <p className="text-xs text-destructive mt-2 text-center">Failed to generate copy. Please try again.</p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ── Sub-components ──────────────────────────────────────

function VisualFormatSection({
  visualFormat,
  FormatIcon,
  onSetAspectRatio,
  onGenerateImage,
  hasProductsSelected,
}: {
  visualFormat: VisualFormat;
  FormatIcon: React.ElementType;
  onSetAspectRatio?: (ratio: string) => void;
  onGenerateImage?: () => void;
  hasProductsSelected: boolean;
}) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <FormatIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">Recommended Format</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs font-medium capitalize">
              {visualFormat.type}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Maximize2 className="w-3 h-3 mr-1" />
              {visualFormat.aspectRatioLabel}
            </Badge>
            {visualFormat.slideCount && (
              <Badge variant="outline" className="text-xs">
                <Layers className="w-3 h-3 mr-1" />
                {visualFormat.slideCount} slides
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{visualFormat.description}</p>
        </div>
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
                    <Maximize2 className="w-3 h-3 mr-1" /> Set Ratio
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Set aspect ratio to {visualFormat.aspectRatioLabel}</TooltipContent>
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
                    <ImageIcon className="w-3 h-3 mr-1" /> Generate
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {hasProductsSelected ? `Generate ${visualFormat.type} image` : 'Select products first'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
}

function GenerationSection({
  q,
  template,
  availableProducts,
  selectedProductIds,
  onGenerateImage,
}: {
  q: ReturnType<typeof useContentPlannerGuidance>;
  template: ContentTemplate;
  availableProducts: Product[];
  selectedProductIds: string[];
  onGenerateImage?: () => void;
}) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
      {/* Header Badges */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
        <span className="text-sm font-semibold text-green-900 dark:text-green-100">AI-Powered Generation</span>
        {q.productRequirement === 'required' && (
          <Badge variant="destructive" className="text-xs">
            Products Required ({q.minProducts}+)
          </Badge>
        )}
        {q.productRequirement === 'recommended' && (
          <Badge variant="secondary" className="text-xs">
            Products Recommended
          </Badge>
        )}
        {q.productRequirement === 'optional' && availableProducts.length > 0 && (
          <Badge variant="outline" className="text-xs">
            Products Optional
          </Badge>
        )}
      </div>

      {/* Product Selector */}
      {q.productRequirement !== 'none' && availableProducts.length > 0 && q.handleProductToggle && (
        <div className="mb-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            {q.productRequirement === 'required'
              ? `Select at least ${q.minProducts} product${q.minProducts > 1 ? 's' : ''} to feature:`
              : q.productRequirement === 'recommended'
                ? 'Add products for richer content (optional):'
                : 'Enhance with products (optional):'}
          </p>
          <div className="flex flex-wrap gap-2">
            {availableProducts.slice(0, 6).map((product) => (
              <label
                key={product.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-all text-xs',
                  selectedProductIds.includes(product.id)
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-background hover:bg-muted border-border',
                )}
              >
                <Checkbox
                  checked={selectedProductIds.includes(product.id)}
                  onCheckedChange={() => q.handleProductToggle(product.id)}
                  className="h-3.5 w-3.5"
                />
                <span className="truncate max-w-[120px]">{product.name}</span>
              </label>
            ))}
          </div>
          {selectedProductIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedProductIds.length} selected
              {q.productRequirement === 'required' && selectedProductIds.length < q.minProducts && (
                <span className="text-destructive ml-1">(need {q.minProducts - selectedProductIds.length} more)</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Topic Input */}
      <div className="mb-3">
        <label className="text-xs text-muted-foreground block mb-1">Topic/Angle (optional):</label>
        <input
          type="text"
          value={q.topicInput}
          onChange={(e) => q.setTopicInput(e.target.value)}
          placeholder={template.exampleTopics[0] || 'e.g., Product durability comparison'}
          className="w-full px-3 py-1.5 text-sm rounded-md border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Unified Generate Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={() => q.generateCompleteMutation.mutate()}
        disabled={q.generateCompleteMutation.isPending || !q.meetsProductRequirement}
      >
        {q.generateCompleteMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Complete Post...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" /> Generate Complete Post
          </>
        )}
      </Button>

      {/* Status messages */}
      {!q.meetsProductRequirement && q.productRequirement === 'required' && (
        <p className="text-xs text-destructive mt-2 text-center">
          Select at least {q.minProducts} product{q.minProducts > 1 ? 's' : ''} to generate
        </p>
      )}
      {q.generateCompleteMutation.isError && (
        <p className="text-xs text-destructive mt-2 text-center">Generation failed. Please try again.</p>
      )}
      {q.generateCompleteMutation.isSuccess && q.generateCompleteMutation.data && (
        <div className="mt-2 text-xs space-y-1">
          {q.generateCompleteMutation.data.copy && (
            <p className="text-green-600 dark:text-green-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Copy generated
            </p>
          )}
          {q.generateCompleteMutation.data.copyError && (
            <p className="text-orange-600 dark:text-orange-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Copy: {q.generateCompleteMutation.data.copyError}
            </p>
          )}
          {q.generateCompleteMutation.data.image?.prompt && (
            <p className="text-green-600 dark:text-green-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Image prompt ready
            </p>
          )}
          {q.generateCompleteMutation.data.imageError && (
            <p className="text-orange-600 dark:text-orange-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Image: {q.generateCompleteMutation.data.imageError}
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
          onClick={() => q.generateCopyMutation.mutate()}
          disabled={q.generateCopyMutation.isPending}
        >
          {q.generateCopyMutation.isPending ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Copy className="w-3 h-3 mr-1" />
          )}
          Copy Only
        </Button>
        {onGenerateImage && template.imageRequirement !== 'none' && (
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onGenerateImage}>
            <ImageIcon className="w-3 h-3 mr-1" /> Image Only
          </Button>
        )}
      </div>
    </div>
  );
}

function HookFormulasSection({
  displayedHooks,
  allHooksCount,
  copiedHookIndex,
  showAllHooks,
  onToggleShowAll,
  onCopyHook,
  onUseHook,
}: {
  displayedHooks: string[];
  allHooksCount: number;
  copiedHookIndex: number | null;
  showAllHooks: boolean;
  onToggleShowAll: () => void;
  onCopyHook: (hook: string, index: number) => void;
  onUseHook: (hook: string) => void;
}) {
  return (
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
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCopyHook(hook, index)}>
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
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUseHook(hook)}>
                      <Wand2 className="w-3 h-3 text-primary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Use this hook</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        ))}
        {allHooksCount > 2 && (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onToggleShowAll}>
            {showAllHooks ? 'Show less' : `+${allHooksCount - 2} more hooks`}
          </Button>
        )}
      </div>
    </div>
  );
}
