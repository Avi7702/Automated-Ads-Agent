import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, Eye, Zap, Database, Globe, CheckCircle2, XCircle, Lightbulb, TrendingUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { IdeaBankSuggestResponse, IdeaBankSuggestion, GenerationMode } from "@shared/types/ideaBank";
import type { Product } from "@shared/schema";

interface IdeaBankPanelProps {
  selectedProducts: Product[];
  onSelectPrompt: (prompt: string, id?: string, reasoning?: string) => void;
  className?: string;
  selectedPromptId?: string;
}

// Badge component for mode display
function ModeBadge({ mode }: { mode: GenerationMode }) {
  const modeConfig = {
    exact_insert: { label: "Exact Insert", className: "bg-green-500/10 text-green-600 border-green-500/30" },
    inspiration: { label: "Inspiration", className: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
    standard: { label: "Standard", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
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
    sources.push({ icon: Eye, label: "Vision", color: "text-blue-500" });
  }
  if (suggestion.sourcesUsed.kbRetrieval) {
    sources.push({ icon: Database, label: "Knowledge", color: "text-purple-500" });
  }
  if (suggestion.sourcesUsed.webSearch) {
    sources.push({ icon: Globe, label: "Web", color: "text-green-500" });
  }
  if (suggestion.sourcesUsed.templateMatching) {
    sources.push({ icon: TrendingUp, label: "Templates", color: "text-orange-500" });
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
  index,
  isSelected,
}: {
  suggestion: IdeaBankSuggestion;
  onUse: (prompt: string, id: string, reasoning?: string) => void;
  index: number;
  isSelected: boolean;
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
          : "border-white/10 bg-card/50 hover:bg-card hover:border-primary/30"
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
              confidencePercentage >= 80 ? "bg-green-500" :
              confidencePercentage >= 60 ? "bg-yellow-500" :
              "bg-orange-500"
            )} />
            <span className="text-xs text-muted-foreground">{confidencePercentage}%</span>
          </div>
        </div>

        {/* Prompt text */}
        <p className="text-sm text-foreground/90 group-hover:text-foreground transition-colors leading-relaxed">
          {suggestion.prompt}
        </p>

        {/* Reasoning */}
        {suggestion.reasoning && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">
            {suggestion.reasoning}
          </p>
        )}

        {/* Recommended platform and aspect ratio */}
        {(suggestion.recommendedPlatform || suggestion.recommendedAspectRatio) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {suggestion.recommendedPlatform && (
              <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
                {suggestion.recommendedPlatform}
              </span>
            )}
            {suggestion.recommendedAspectRatio && (
              <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
                {suggestion.recommendedAspectRatio}
              </span>
            )}
          </div>
        )}

        {/* Sources used */}
        <SourceIndicators suggestion={suggestion} />

        {/* Use button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onUse(suggestion.prompt, suggestion.id, suggestion.reasoning);
          }}
          variant={isSelected ? "default" : "outline"}
          size="sm"
          className="w-full mt-2"
          data-testid={`button-use-suggestion-${suggestion.id}`}
        >
          {isSelected ? (
            <>
              <Check className="w-3 h-3 mr-2" />
              Selected
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 mr-2" />
              Use this suggestion
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

export function IdeaBankPanel({ selectedProducts, onSelectPrompt, className, selectedPromptId }: IdeaBankPanelProps) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<IdeaBankSuggestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [legacyMode, setLegacyMode] = useState(false);

  // Fetch suggestions when products change
  useEffect(() => {
    if (selectedProducts.length > 0) {
      fetchSuggestions();
    } else {
      setResponse(null);
      setError(null);
    }
  }, [selectedProducts.map(p => p.id).join(",")]);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try the new endpoint first
      const res = await fetch("/api/idea-bank/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productIds: selectedProducts.map(p => p.id),
          maxSuggestions: 6,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // Check if it's the new format
        if (data.suggestions && data.analysisStatus) {
          setResponse(data as IdeaBankSuggestResponse);
          setLegacyMode(false);
        } else if (Array.isArray(data)) {
          // Legacy format - convert to new format
          setResponse({
            suggestions: data.map((prompt: string, idx: number) => ({
              id: `legacy-${idx}`,
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
          setLegacyMode(true);
        }
      } else {
        // Try the old prompt-suggestions endpoint as fallback
        const fallbackRes = await fetch("/api/prompt-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productName: selectedProducts.map(p => p.name).join(", "),
            category: selectedProducts[0]?.category,
          }),
        });

        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          const suggestions = Array.isArray(data) ? data : (data.suggestions || []);

          // Convert legacy format
          setResponse({
            suggestions: suggestions.map((prompt: string, idx: number) => ({
              id: `fallback-${idx}`,
              prompt,
              mode: "standard" as GenerationMode,
              reasoning: "Generated from legacy prompt suggestions",
              confidence: 0.6,
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
              templatesMatched: suggestions.length,
              webSearchUsed: false,
            },
          });
          setLegacyMode(true);
        } else {
          throw new Error("Failed to fetch suggestions from both endpoints");
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch suggestions:", err);
      setError(err.message || "Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  };

  if (selectedProducts.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-primary/5 to-purple-500/5 space-y-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Intelligent Idea Bank</h3>
          {legacyMode && (
            <span className="text-xs text-muted-foreground bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/30">
              Legacy Mode
            </span>
          )}
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
          data-testid="button-refresh-idea-bank"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Analysis Status Summary */}
      {response && !legacyMode && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-card/30 border border-white/5 text-xs">
          <div className="flex items-center gap-1.5">
            {response.analysisStatus.visionComplete ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className="text-muted-foreground">Vision Analysis</span>
          </div>
          <div className="flex items-center gap-1.5">
            {response.analysisStatus.kbQueried ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
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
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
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

      {/* Suggestions Grid */}
      {response && !loading && response.suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {response.suggestions.length} AI-generated {response.suggestions.length === 1 ? 'idea' : 'ideas'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {response.suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onUse={onSelectPrompt}
                index={index}
                isSelected={selectedPromptId === suggestion.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {response && !loading && response.suggestions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No suggestions available. Click refresh to try again.
        </p>
      )}
    </motion.div>
  );
}
