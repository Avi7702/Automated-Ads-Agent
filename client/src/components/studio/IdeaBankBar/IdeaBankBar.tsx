// @ts-nocheck
/**
 * IdeaBankBar — Horizontal scrollable suggestion chips for the Studio bottom bar
 *
 * Compact version of IdeaBankPanel. Fetches suggestions based on selected
 * products and renders them as horizontally scrollable chips.
 * Clicking a chip fills the prompt.
 */

import { memo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronLeft, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import { useIdeaBankFetch } from "@/components/ideabank/useIdeaBankFetch";
import { SuggestionChip } from "./SuggestionChip";
import { useStudioState } from "@/hooks/useStudioState";

interface IdeaBankBarProps {
  handleSelectSuggestion: (prompt: string, id: string, reasoning?: string) => void;
  className?: string;
}

function IdeaBankBarComponent({ handleSelectSuggestion, className }: IdeaBankBarProps) {
  const { state } = useStudioState();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const {
    loading,
    error,
    response,
    fetchSuggestions,
  } = useIdeaBankFetch({
    selectedProducts: state.selectedProducts,
    tempUploads: state.tempUploads,
    mode: state.ideaBankMode,
    templateId: state.selectedTemplate?.id?.toString(),
  });

  const suggestions = response?.suggestions || [];

  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  const scroll = useCallback((direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -240 : 240;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    setTimeout(updateScrollState, 350);
  }, [updateScrollState]);

  const handleUse = useCallback((prompt: string, id: string, reasoning?: string) => {
    handleSelectSuggestion?.(prompt, id, reasoning);
  }, [handleSelectSuggestion]);

  // Don't render if no products selected
  if (state.selectedProducts.length === 0 && (!state.tempUploads || state.tempUploads.length === 0)) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)} role="region" aria-label="Idea suggestions">
      {/* Label + Refresh */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Ideas</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={fetchSuggestions}
          disabled={loading}
          aria-label={loading ? "Loading suggestions" : "Refresh suggestions"}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* Scroll Left */}
      <AnimatePresence>
        {canScrollLeft && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => scroll("left")}
              aria-label="Scroll suggestions left"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chips Container */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-1 min-w-0 flex-1"
        aria-live="polite"
        aria-atomic="false"
      >
        {loading && suggestions.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Generating ideas...
          </div>
        )}

        {error && (
          <div className="text-xs text-destructive px-3 py-2">
            Failed to load suggestions
          </div>
        )}

        {suggestions.map((suggestion) => (
          <SuggestionChip
            key={suggestion.id}
            id={suggestion.id}
            summary={suggestion.summary}
            prompt={suggestion.prompt}
            confidence={suggestion.confidence}
            mode={suggestion.mode}
            reasoning={suggestion.reasoning}
            isSelected={state.selectedSuggestion?.id === suggestion.id}
            onUse={handleUse}
          />
        ))}

        {!loading && !error && suggestions.length === 0 && state.selectedProducts.length > 0 && (
          <button
            onClick={fetchSuggestions}
            className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Get AI suggestions
          </button>
        )}
      </div>

      {/* Scroll Right */}
      <AnimatePresence>
        {canScrollRight && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => scroll("right")}
              aria-label="Scroll suggestions right"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const IdeaBankBar = memo(IdeaBankBarComponent);
