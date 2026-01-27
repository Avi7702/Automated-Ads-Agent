import React, { useState, useEffect, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { IdeaBankHeader } from "./IdeaBankHeader";
import { IdeaBankInputSummary } from "./IdeaBankInputSummary";
import { IdeaBankAnalysisStatus } from "./IdeaBankAnalysisStatus";
import { IdeaBankSuggestions } from "./IdeaBankSuggestions";
import { useIdeaBankFetch } from "./useIdeaBankFetch";
import type { IdeaBankPanelProps, TemplateSlotSuggestion } from "./types";

function IdeaBankPanelComponent({
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
  mode = "freestyle",
  templateId,
  onSlotSuggestionSelect,
}: IdeaBankPanelProps) {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  const {
    loading,
    error,
    response,
    legacyMode,
    slotSuggestions,
    mergedPrompt,
    templateContext,
    selectedUploads,
    analyzingCount,
    fetchSuggestions,
  } = useIdeaBankFetch({
    selectedProducts,
    tempUploads,
    mode,
    templateId,
    onRecipeAvailable,
  });

  // Reset selected slot when mode changes
  useEffect(() => {
    setSelectedSlotIndex(null);
  }, [mode, templateId]);

  // Handle slot selection
  const handleSlotSelect = useCallback(
    (index: number, suggestion: TemplateSlotSuggestion, prompt: string) => {
      setSelectedSlotIndex(index);
      if (onSlotSuggestionSelect) {
        onSlotSuggestionSelect(suggestion, prompt);
      }
    },
    [onSlotSuggestionSelect]
  );

  // Check if panel should be visible
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
      <IdeaBankHeader
        mode={mode}
        legacyMode={legacyMode}
        loading={loading}
        onRefresh={fetchSuggestions}
      />

      <IdeaBankInputSummary
        selectedProducts={selectedProducts}
        selectedUploads={selectedUploads}
        analyzingCount={analyzingCount}
      />

      {response && !legacyMode && (
        <IdeaBankAnalysisStatus response={response} legacyMode={legacyMode} />
      )}

      <IdeaBankSuggestions
        mode={mode}
        response={response}
        slotSuggestions={slotSuggestions}
        mergedPrompt={mergedPrompt}
        templateContext={templateContext}
        templateId={templateId}
        loading={loading}
        error={error}
        selectedPromptId={selectedPromptId}
        selectedSlotIndex={selectedSlotIndex}
        isGenerating={isGenerating}
        onSelectPrompt={onSelectPrompt}
        onQuickGenerate={onQuickGenerate}
        onSlotSelect={handleSlotSelect}
        onRecipeAvailable={onRecipeAvailable}
        onSetPlatform={onSetPlatform}
        onSetAspectRatio={onSetAspectRatio}
      />
    </motion.div>
  );
}

export const IdeaBankPanel = memo(IdeaBankPanelComponent);
