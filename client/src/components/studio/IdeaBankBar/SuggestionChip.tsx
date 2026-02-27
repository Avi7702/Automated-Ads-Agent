/**
 * SuggestionChip — Compact horizontal chip for idea bank suggestions
 *
 * Condensed version of SuggestionCard designed for the bottom bar.
 * Shows summary + confidence + click-to-use.
 */

import { memo, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkles, Lightbulb, Zap, Check } from "lucide-react";

interface SuggestionChipProps {
  id: string;
  summary: string;
  prompt: string;
  confidence: number;
  mode: "exact_insert" | "inspiration" | "standard";
  reasoning?: string;
  isSelected: boolean;
  onUse: (prompt: string, id: string, reasoning?: string) => void;
}

const MODE_ICONS = {
  exact_insert: Zap,
  inspiration: Lightbulb,
  standard: Sparkles,
};

const MODE_COLORS = {
  exact_insert: "border-green-500/30 bg-green-500/5 hover:bg-green-500/10",
  inspiration: "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10",
  standard: "border-primary/30 bg-primary/5 hover:bg-primary/10",
};

function SuggestionChipComponent({
  id,
  summary,
  prompt,
  confidence,
  mode,
  reasoning,
  isSelected,
  onUse,
}: SuggestionChipProps) {
  const Icon = MODE_ICONS[mode] || Sparkles;
  const colorClass = MODE_COLORS[mode] || MODE_COLORS.standard;
  const confidencePercent = useMemo(() => Math.round(confidence * 100), [confidence]);

  const confidenceColor = useMemo(() => {
    if (confidencePercent >= 80) return "text-green-600 dark:text-green-400";
    if (confidencePercent >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  }, [confidencePercent]);

  const handleClick = useCallback(() => {
    onUse(prompt, id, reasoning);
  }, [onUse, prompt, id, reasoning]);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={cn(
        "shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border transition-all text-left max-w-[280px]",
        isSelected
          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
          : colorClass
      )}
    >
      {isSelected ? (
        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
      ) : (
        <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
      )}
      <span className="text-xs font-medium truncate">{summary}</span>
      <span className={cn("text-[10px] shrink-0", confidenceColor)}>
        {confidencePercent}%
      </span>
    </motion.button>
  );
}

export const SuggestionChip = memo(SuggestionChipComponent);
