import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, Eye, Zap, Database, Globe, CheckCircle2, XCircle, Lightbulb, TrendingUp, Check, Play, Loader2, Upload, Palette, Sun, Target, Type, MessageSquare, MousePointer, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type {
  IdeaBankSuggestResponse,
  IdeaBankSuggestion,
  GenerationMode,
  GenerationRecipe,
  IdeaBankMode,
  TemplateSlotSuggestion,
  TemplateContext,
  IdeaBankTemplateResponse
} from "@shared/types/ideaBank";
import type { Product } from "@shared/schema";
import type { AnalyzedUpload } from "@/types/analyzedUpload";

interface IdeaBankPanelProps {
  selectedProducts: Product[];
  tempUploads?: AnalyzedUpload[];
  onSelectPrompt: (prompt: string, id?: string, reasoning?: string) => void;
  onRecipeAvailable?: (recipe: GenerationRecipe | undefined) => void;
  onSetPlatform?: (platform: string) => void;
  onSetAspectRatio?: (aspectRatio: string) => void;
  onQuickGenerate?: (prompt: string) => void;
  className?: string;
  selectedPromptId?: string;
  isGenerating?: boolean;
  // Template mode props
  mode?: IdeaBankMode;
  templateId?: string;
  onSlotSuggestionSelect?: (suggestion: TemplateSlotSuggestion, mergedPrompt: string) => void;
}

// Badge component for mode display
function ModeBadge({ mode }: { mode: GenerationMode }) {
  const modeConfig = {
    exact_insert: { label: "Exact Insert", className: "bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 dark:border-green-500/20" },
    inspiration: { label: "Inspiration", className: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-500/20" },
    standard: { label: "Standard", className: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 dark:border-blue-500/20" },
  };

  const config = modeConfig[mode];

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
      config.className
    )}>
      {mode === "exact_insert" && <Zap className="w-3 h-3" />}
      {mode === "inspiration" && <Lightbulb className="w-3 h-3" />}
      {mode === "standard" && <Sparkles className="w-3 h-3" />}
      {config.label}
    </span>
  );
}

// Source indicator icons
function SourceIndicators({ suggestion }: { suggestion: IdeaBankSuggestion }) {
  const sources = [];

  if (suggestion.sourcesUsed.visionAnalysis) {
    sources.push({ icon: Eye, label: "Vision", color: "text-blue-600 dark:text-blue-400" });
  }
  if (suggestion.sourcesUsed.kbRetrieval) {
    sources.push({ icon: Database, label: "Knowledge", color: "text-purple-600 dark:text-purple-400" });
  }
  if (suggestion.sourcesUsed.webSearch) {
    sources.push({ icon: Globe, label: "Web", color: "text-green-600 dark:text-green-400" });
  }
  if (suggestion.sourcesUsed.templateMatching) {
    sources.push({ icon: TrendingUp, label: "Templates", color: "text-orange-600 dark:text-orange-400" });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {sources.map((source, idx) => (
        <div key={idx} className="flex items-center gap-1 text-xs text-muted-foreground">
          <source.icon className={cn("w-3 h-3", source.color)} />
          <span>{source.label}</span>
        </div>
      ))}
    </div>
  );
}

// Suggestion card component
function SuggestionCard({
  suggestion,
  onUse,
  onQuickGenerate,
  index,
  isSelected,
  isGenerating,
}: {
  suggestion: IdeaBankSuggestion;
  onUse: (prompt: string, id: string, reasoning?: string) => void;
  onQuickGenerate?: (prompt: string) => void;
  index: number;
  isSelected: boolean;
  isGenerating?: boolean;
}) {
  const confidencePercentage = Math.round(suggestion.confidence * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "p-4 rounded-xl border-2 transition-all group cursor-pointer",
        isSelected
          ? "border-primary bg-primary/10 ring-2 ring-primary/20 scale-[1.02]"
          : "border-border bg-card/50 hover:bg-card hover:border-primary/30"
      )}
      onClick={() => onUse(suggestion.prompt, suggestion.id, suggestion.reasoning)}
    >
      <div className="space-y-3">
        {/* Header with mode and confidence */}
        <div className="flex items-start justify-between gap-2">
          <ModeBadge mode={suggestion.mode} />
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "w-2 h-2 rounded-full",
              confidencePercentage >= 80 ? "bg-green-600 dark:bg-green-500" :
              confidencePercentage >= 60 ? "bg-yellow-600 dark:bg-yellow-500" :
              "bg-orange-600 dark:bg-orange-500"
            )} />
            <span className="text-xs text-muted-foreground">{confidencePercentage}%</span>
          </div>
        </div>

        {/* Summary heading */}
        <h3 className="text-base font-semibold text-foreground leading-snug">
          {suggestion.summary}
        </h3>

        {/* Reasoning */}
        {suggestion.reasoning && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
            <p className="leading-relaxed">
              <span className="font-medium text-foreground">Why this works:</span> {suggestion.reasoning}
            </p>
          </div>
        )}

        {/* Recommended platform and aspect ratio */}
        {(suggestion.recommendedPlatform || suggestion.recommendedAspectRatio) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            {suggestion.recommendedPlatform && (
              <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-medium">
                {suggestion.recommendedPlatform}
              </span>
            )}
            {suggestion.recommendedAspectRatio && (
              <span className="px-2 py-0.5 rounded bg-muted/30 border border-border font-medium">
                {suggestion.recommendedAspectRatio}
              </span>
            )}
          </div>
        )}

        {/* Technical prompt in collapsible */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
            >
              <span>View technical prompt</span>
              <ChevronDown className="w-3 h-3 transition-transform ui-expanded:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed p-3 bg-muted/30 rounded-lg border border-border/50">
              {suggestion.prompt}
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* Sources used */}
        <SourceIndicators suggestion={suggestion} />

        {/* Action buttons */}
        <div className="flex gap-2 mt-2">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onUse(suggestion.prompt, suggestion.id, suggestion.reasoning);
            }}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            className="flex-1"
            data-testid={`button-use-suggestion-${suggestion.id}`}
          >
            {isSelected ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                Selected
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Use This Idea
              </>
            )}
          </Button>
          {onQuickGenerate && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onQuickGenerate(suggestion.prompt);
              }}
              variant="default"
              size="sm"
              className="bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600"
              disabled={isGenerating}
              data-testid={`button-generate-suggestion-${suggestion.id}`}
            >
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Generate Now
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Template slot suggestion card component (for template mode)
function TemplateSlotCard({
  suggestion,
  onUse,
  index,
  isSelected,
  mergedPrompt,
}: {
  suggestion: TemplateSlotSuggestion;
  onUse: (suggestion: TemplateSlotSuggestion, mergedPrompt: string) => void;
  index: number;
  isSelected: boolean;
  mergedPrompt: string;
}) {
  const confidencePercentage = Math.round(suggestion.confidence);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "p-4 rounded-xl border-2 transition-all group cursor-pointer",
        isSelected
          ? "border-primary bg-primary/10 ring-2 ring-primary/20 scale-[1.02]"
          : "border-border bg-card/50 hover:bg-card hover:border-primary/30"
      )}
      onClick={() => onUse(suggestion, mergedPrompt)}
    >
      <div className="space-y-3">
        {/* Header with confidence */}
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 dark:border-amber-500/20">
            <Target className="w-3 h-3" />
            Template Slot
          </span>
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "w-2 h-2 rounded-full",
              confidencePercentage >= 80 ? "bg-green-600 dark:bg-green-500" :
              confidencePercentage >= 60 ? "bg-yellow-600 dark:bg-yellow-500" :
              "bg-orange-600 dark:bg-orange-500"
            )} />
            <span className="text-xs text-muted-foreground">{confidencePercentage}%</span>
          </div>
        </div>

        {/* Product Highlights */}
        {suggestion.productHighlights.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              Product Highlights
            </div>
            <ul className="text-xs text-foreground/80 space-y-0.5 pl-4">
              {suggestion.productHighlights.slice(0, 4).map((highlight, idx) => (
                <li key={idx} className="list-disc">{highlight}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Placement Guidance */}
        {suggestion.productPlacement && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Target className="w-3 h-3" />
              Placement
            </div>
            <p className="text-xs text-foreground/80 pl-4 line-clamp-2">
              {suggestion.productPlacement}
            </p>
          </div>
        )}

        {/* Copy Suggestions */}
        {(suggestion.headerText || suggestion.bodyText || suggestion.ctaSuggestion) && (
          <div className="space-y-2 p-2 rounded-lg bg-muted/30 border border-border/50">
            {suggestion.headerText && (
              <div className="flex items-start gap-2">
                <Type className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Header: </span>
                  <span className="text-xs text-foreground">{suggestion.headerText}</span>
                </div>
              </div>
            )}
            {suggestion.bodyText && (
              <div className="flex items-start gap-2">
                <MessageSquare className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Body: </span>
                  <span className="text-xs text-foreground line-clamp-2">{suggestion.bodyText}</span>
                </div>
              </div>
            )}
            {suggestion.ctaSuggestion && (
              <div className="flex items-start gap-2">
                <MousePointer className="w-3 h-3 mt-0.5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <span className="text-xs font-medium text-muted-foreground">CTA: </span>
                  <span className="text-xs text-foreground font-medium">{suggestion.ctaSuggestion}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Technical Details */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {suggestion.colorHarmony.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Palette className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              <span className="text-muted-foreground">{suggestion.colorHarmony.slice(0, 3).join(", ")}</span>
            </div>
          )}
          {suggestion.lightingNotes && (
            <div className="flex items-center gap-1.5">
              <Sun className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
              <span className="text-muted-foreground line-clamp-1">{suggestion.lightingNotes.split(".")[0]}</span>
            </div>
          )}
        </div>

        {/* Reasoning */}
        {suggestion.reasoning && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3 line-clamp-2">
            {suggestion.reasoning}
          </p>
        )}

        {/* Action Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onUse(suggestion, mergedPrompt);
          }}
          variant={isSelected ? "default" : "outline"}
          size="sm"
          className="w-full"
          data-testid={`button-use-slot-suggestion-${index}`}
        >
          {isSelected ? (
            <>
              <Check className="w-3 h-3 mr-1" />
              Selected
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 mr-1" />
              Use This
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

export function IdeaBankPanel({
  selectedProducts,
  tempUploads = [],
  onSelectPrompt,
  onRecipeAvailable,
  onSetPlatform,
  onSetAspectRatio,
  onQuickGenerate,
  className,
  selectedPromptId,
  isGenerating,
  mode = 'freestyle',
  templateId,
  onSlotSuggestionSelect,
}: IdeaBankPanelProps) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<IdeaBankSuggestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [legacyMode, setLegacyMode] = useState(false);

  // Template mode state
  const [slotSuggestions, setSlotSuggestions] = useState<TemplateSlotSuggestion[]>([]);
  const [mergedPrompt, setMergedPrompt] = useState<string>('');
  const [templateContext, setTemplateContext] = useState<TemplateContext | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  // Get SELECTED uploads with descriptions (user must click to select)
  const selectedUploads = tempUploads.filter(u => u.selected && u.status === "confirmed" && u.description);
  const analyzingCount = tempUploads.filter(u => u.status === "analyzing").length;

  // Fetch suggestions when products, SELECTED uploads, mode, or templateId change
  useEffect(() => {
    const hasProducts = selectedProducts.length > 0;
    const hasSelectedUploads = selectedUploads.length > 0;

    // Template mode requires templateId
    if (mode === 'template' && !templateId) {
      setSlotSuggestions([]);
      setMergedPrompt('');
      setTemplateContext(null);
      return;
    }

    if (hasProducts || hasSelectedUploads) {
      fetchSuggestions();
    } else {
      setResponse(null);
      setSlotSuggestions([]);
      setMergedPrompt('');
      setTemplateContext(null);
      setError(null);
    }
  }, [
    selectedProducts.map(p => p.id).join(","),
    selectedUploads.map(u => u.description).join(","),
    mode,
    templateId,
  ]);

  // Reset selected slot when mode changes
  useEffect(() => {
    setSelectedSlotIndex(null);
  }, [mode, templateId]);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);

    // Prepare upload descriptions for the request (only SELECTED uploads)
    const uploadDescriptions = selectedUploads
      .map(u => u.description)
      .filter((d): d is string => !!d);

    try {
      // Try the new endpoint first
      const res = await fetch("/api/idea-bank/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productIds: selectedProducts.map(p => p.id),
          uploadDescriptions: uploadDescriptions.length > 0 ? uploadDescriptions : undefined,
          maxSuggestions: 6,
          mode: mode || 'freestyle',
          templateId: mode === 'template' ? templateId : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // Handle template mode response
        if (mode === 'template' && data.slotSuggestions) {
          const templateResponse = data as IdeaBankTemplateResponse;
          setSlotSuggestions(templateResponse.slotSuggestions);
          setMergedPrompt(templateResponse.mergedPrompt);
          setTemplateContext(templateResponse.template);
          setResponse(null);
          setLegacyMode(false);
          // Pass recipe to parent if available
          if (onRecipeAvailable && templateResponse.recipe) {
            onRecipeAvailable(templateResponse.recipe);
          }
        }
        // Handle freestyle mode response (new format)
        else if (data.suggestions && data.analysisStatus) {
          setResponse(data as IdeaBankSuggestResponse);
          setSlotSuggestions([]);
          setMergedPrompt('');
          setTemplateContext(null);
          setLegacyMode(false);
        } else if (Array.isArray(data)) {
          // Legacy format - convert to new format
          setResponse({
            suggestions: data.map((prompt: string, idx: number) => ({
              id: `legacy-${idx}`,
              summary: `Legacy suggestion ${idx + 1}`,
              prompt,
              mode: "standard" as GenerationMode,
              reasoning: "Generated from legacy endpoint",
              confidence: 0.7,
              sourcesUsed: {
                visionAnalysis: false,
                kbRetrieval: false,
                webSearch: false,
                templateMatching: true,
              },
            })),
            analysisStatus: {
              visionComplete: false,
              kbQueried: false,
              templatesMatched: data.length,
              webSearchUsed: false,
            },
          });
          setSlotSuggestions([]);
          setMergedPrompt('');
          setTemplateContext(null);
          setLegacyMode(true);
        }
      } else {
        // Retry once after 2 seconds (no legacy fallback)
        console.warn("Initial suggestion request failed, retrying...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        const retryRes = await fetch("/api/idea-bank/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            productIds: selectedProducts.map(p => p.id),
            uploadDescriptions: uploadDescriptions.length > 0 ? uploadDescriptions : undefined,
            maxSuggestions: 6,
            mode: mode || 'freestyle',
            templateId: mode === 'template' ? templateId : undefined,
          }),
        });

        if (!retryRes.ok) {
          throw new Error('Retry failed - unable to generate suggestions');
        }

        const retryData = await retryRes.json();

        // Process retry response (same as primary response)
        if (mode === 'template' && retryData.slotSuggestions) {
          const templateResponse = retryData as IdeaBankTemplateResponse;
          setSlotSuggestions(templateResponse.slotSuggestions);
          setMergedPrompt(templateResponse.mergedPrompt);
          setTemplateContext(templateResponse.template);
          setResponse(null);
          setLegacyMode(false);
          if (onRecipeAvailable && templateResponse.recipe) {
            onRecipeAvailable(templateResponse.recipe);
          }
        } else if (retryData.suggestions && retryData.analysisStatus) {
          setResponse(retryData as IdeaBankSuggestResponse);
          setSlotSuggestions([]);
          setMergedPrompt('');
          setTemplateContext(null);
          setLegacyMode(false);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch suggestions:", err);
      setError(err.message || "Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  };

  // Show panel if there are products OR selected uploads
  const hasContent = selectedProducts.length > 0 || selectedUploads.length > 0;
  const hasAnalyzing = analyzingCount > 0;

  if (!hasContent && !hasAnalyzing) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 sm:p-6 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-purple-500/5 space-y-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Intelligent Idea Bank</h3>
          {mode === 'template' && (
            <span className="text-xs text-muted-foreground bg-amber-500/10 dark:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 dark:border-amber-500/20">
              Template Mode
            </span>
          )}
          {legacyMode && mode !== 'template' && (
            <span className="text-xs text-muted-foreground bg-yellow-500/10 dark:bg-yellow-500/20 px-2 py-0.5 rounded border border-yellow-500/30 dark:border-yellow-500/20">
              Legacy Mode
            </span>
          )}
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
          data-testid="button-refresh-idea-bank"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Input Summary - Products and Uploads */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {selectedProducts.length > 0 && (
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/20">
            <Database className="w-3 h-3 text-primary" />
            {selectedProducts.length} {selectedProducts.length === 1 ? 'product' : 'products'}
          </span>
        )}
        {selectedUploads.length > 0 && (
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 dark:border-purple-500/30">
            <Upload className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            {selectedUploads.length} {selectedUploads.length === 1 ? 'upload' : 'uploads'}
          </span>
        )}
        {analyzingCount > 0 && (
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/30 text-amber-600 dark:text-amber-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Analyzing {analyzingCount} {analyzingCount === 1 ? 'image' : 'images'}...
          </span>
        )}
      </div>

      {/* Analysis Status Summary */}
      {response && !legacyMode && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-card/30 border border-border/50 text-xs">
          <div className="flex items-center gap-1.5">
            {response.analysisStatus.visionComplete ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className="text-muted-foreground">Vision Analysis</span>
          </div>
          <div className="flex items-center gap-1.5">
            {response.analysisStatus.kbQueried ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className="text-muted-foreground">Knowledge Base</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">
              {response.analysisStatus.templatesMatched} Templates
            </span>
          </div>
          {response.analysisStatus.webSearchUsed && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              <span className="text-muted-foreground">Web Search</span>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Template Mode - Template Context Info */}
      {mode === 'template' && templateContext && !loading && (
        <div className="p-3 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/20 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-amber-700 dark:text-amber-400">{templateContext.title}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 dark:bg-amber-500/30 text-amber-600 dark:text-amber-400">
              {templateContext.category}
            </span>
          </div>
          {templateContext.environment && (
            <p className="text-xs text-muted-foreground">
              Environment: {templateContext.environment} | Mood: {templateContext.mood || 'N/A'} | Lighting: {templateContext.lightingStyle || 'N/A'}
            </p>
          )}
        </div>
      )}

      {/* Template Mode - Slot Suggestions Grid */}
      {mode === 'template' && slotSuggestions.length > 0 && !loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {slotSuggestions.length} slot {slotSuggestions.length === 1 ? 'suggestion' : 'suggestions'} for this template
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {slotSuggestions.map((suggestion, index) => (
              <TemplateSlotCard
                key={`slot-${index}`}
                suggestion={suggestion}
                onUse={(slotSuggestion, prompt) => {
                  setSelectedSlotIndex(index);
                  if (onSlotSuggestionSelect) {
                    onSlotSuggestionSelect(slotSuggestion, prompt);
                  }
                  // Also update the prompt field for backward compatibility
                  onSelectPrompt(prompt, `slot-${index}`, slotSuggestion.reasoning);
                }}
                index={index}
                isSelected={selectedSlotIndex === index}
                mergedPrompt={mergedPrompt}
              />
            ))}
          </div>
        </div>
      )}

      {/* Template Mode - Empty State */}
      {mode === 'template' && slotSuggestions.length === 0 && !loading && !error && templateId && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No slot suggestions available. Click refresh to try again.
        </p>
      )}

      {/* Template Mode - No Template Selected */}
      {mode === 'template' && !templateId && !loading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Select a template to get AI-powered slot suggestions.
        </p>
      )}

      {/* Freestyle Mode - Suggestions Grid */}
      {mode !== 'template' && response && !loading && response.suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {response.suggestions.length} AI-generated {response.suggestions.length === 1 ? 'idea' : 'ideas'}
            </span>
            {onQuickGenerate && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Click "Generate" to start immediately
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {response.suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onUse={(prompt, id, reasoning) => {
                  // Set the prompt
                  onSelectPrompt(prompt, id, reasoning);
                  // Pass recipe context to parent for /api/transform
                  if (onRecipeAvailable) {
                    onRecipeAvailable(response?.recipe);
                  }
                  // Auto-set platform if recommendation exists
                  if (suggestion.recommendedPlatform && onSetPlatform) {
                    onSetPlatform(suggestion.recommendedPlatform);
                  }
                  // Auto-set aspect ratio if recommendation exists
                  if (suggestion.recommendedAspectRatio && onSetAspectRatio) {
                    onSetAspectRatio(suggestion.recommendedAspectRatio);
                  }
                }}
                onQuickGenerate={onQuickGenerate ? (prompt) => {
                  // First set the prompt so user can see what's generating
                  onSelectPrompt(prompt, suggestion.id, suggestion.reasoning);
                  // Pass recipe context to parent for /api/transform
                  if (onRecipeAvailable) {
                    onRecipeAvailable(response?.recipe);
                  }
                  // Auto-set platform if recommendation exists
                  if (suggestion.recommendedPlatform && onSetPlatform) {
                    onSetPlatform(suggestion.recommendedPlatform);
                  }
                  // Then trigger generation
                  onQuickGenerate(prompt);
                } : undefined}
                index={index}
                isSelected={selectedPromptId === suggestion.id}
                isGenerating={isGenerating}
              />
            ))}
          </div>
        </div>
      )}

      {/* Freestyle Mode - Empty State */}
      {mode !== 'template' && response && !loading && response.suggestions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No suggestions available. Click refresh to try again.
        </p>
      )}
    </motion.div>
  );
}
