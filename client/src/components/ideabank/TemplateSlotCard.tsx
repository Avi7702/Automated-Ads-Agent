import React, { memo, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Target, Type, MessageSquare, MousePointer, Palette, Sun, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TemplateSlotCardProps } from "./types";

function TemplateSlotCardComponent({
  suggestion,
  onUse,
  index,
  isSelected,
  mergedPrompt,
}: TemplateSlotCardProps) {
  const confidencePercentage = useMemo(
    () => Math.round(suggestion.confidence),
    [suggestion.confidence]
  );

  const confidenceColor = useMemo(() => {
    if (confidencePercentage >= 80) return "bg-green-600 dark:bg-green-500";
    if (confidencePercentage >= 60) return "bg-yellow-600 dark:bg-yellow-500";
    return "bg-orange-600 dark:bg-orange-500";
  }, [confidencePercentage]);

  const handleCardClick = useCallback(() => {
    onUse(suggestion, mergedPrompt);
  }, [onUse, suggestion, mergedPrompt]);

  const handleButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onUse(suggestion, mergedPrompt);
    },
    [onUse, suggestion, mergedPrompt]
  );

  const colorHarmonyDisplay = useMemo(
    () => suggestion.colorHarmony.slice(0, 3).join(", "),
    [suggestion.colorHarmony]
  );

  const lightingNote = useMemo(
    () => suggestion.lightingNotes?.split(".")[0] || "",
    [suggestion.lightingNotes]
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
        {/* Header with confidence */}
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 dark:border-amber-500/20">
            <Target className="w-3 h-3" />
            Template Slot
          </span>
          <div className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", confidenceColor)} />
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
                <li key={idx} className="list-disc">
                  {highlight}
                </li>
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
                  <span className="text-xs text-foreground font-medium">
                    {suggestion.ctaSuggestion}
                  </span>
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
              <span className="text-muted-foreground">{colorHarmonyDisplay}</span>
            </div>
          )}
          {suggestion.lightingNotes && (
            <div className="flex items-center gap-1.5">
              <Sun className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
              <span className="text-muted-foreground line-clamp-1">{lightingNote}</span>
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
          onClick={handleButtonClick}
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

export const TemplateSlotCard = memo(TemplateSlotCardComponent);
