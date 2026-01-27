import React, { memo } from "react";
import { Zap, Lightbulb, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GenerationMode } from "./types";

interface ModeBadgeProps {
  mode: GenerationMode;
}

const modeConfig = {
  exact_insert: {
    label: "Exact Insert",
    className: "bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 dark:border-green-500/20",
  },
  inspiration: {
    label: "Inspiration",
    className: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-500/20",
  },
  standard: {
    label: "Standard",
    className: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 dark:border-blue-500/20",
  },
} as const;

function ModeBadgeComponent({ mode }: ModeBadgeProps) {
  const config = modeConfig[mode];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        config.className
      )}
    >
      {mode === "exact_insert" && <Zap className="w-3 h-3" />}
      {mode === "inspiration" && <Lightbulb className="w-3 h-3" />}
      {mode === "standard" && <Sparkles className="w-3 h-3" />}
      {config.label}
    </span>
  );
}

export const ModeBadge = memo(ModeBadgeComponent);
