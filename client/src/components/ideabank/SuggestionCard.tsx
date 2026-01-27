import React, { memo, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Lightbulb, Check, Play, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ModeBadge } from "./ModeBadge";
import { SourceIndicators } from "./SourceIndicators";
import type { SuggestionCardProps } from "./types";

function SuggestionCardComponent({
  suggestion,
  onUse,
  onQuickGenerate,
  index,
  isSelected,
  isGenerating,
}: SuggestionCardProps) {
  const confidencePercentage = useMemo(
    () => Math.round(suggestion.confidence * 100),
    [suggestion.confidence]
  );

  const confidenceColor = useMemo(() => {
    if (confidencePercentage >= 80) return "bg-green-600 dark:bg-green-500";
    if (confidencePercentage >= 60) return "bg-yellow-600 dark:bg-yellow-500";
    return "bg-orange-600 dark:bg-orange-500";
  }, [confidencePercentage]);

  const handleCardClick = useCallback(() => {
    onUse(suggestion.prompt, suggestion.id, suggestion.reasoning);
  }, [onUse, suggestion.prompt, suggestion.id, suggestion.reasoning]);

  const handleUseClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onUse(suggestion.prompt, suggestion.id, suggestion.reasoning);
    },
    [onUse, suggestion.prompt, suggestion.id, suggestion.reasoning]
  );

  const handleQuickGenerateClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onQuickGenerate) {
        onQuickGenerate(suggestion.prompt);
      }
    },
    [onQuickGenerate, suggestion.prompt]
  );

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
      onClick={handleCardClick}
    >
      <div className="space-y-3">
        {/* Header with mode and confidence */}
        <div className="flex items-start justify-between gap-2">
          <ModeBadge mode={suggestion.mode} />
          <div className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", confidenceColor)} />
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
              <span className="font-medium text-foreground">Why this works:</span>{" "}
              {suggestion.reasoning}
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
            onClick={handleUseClick}
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
              onClick={handleQuickGenerateClick}
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

export const SuggestionCard = memo(SuggestionCardComponent);
