import React, { memo } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IdeaBankHeaderProps } from "./types";

function IdeaBankHeaderComponent({
  mode,
  legacyMode,
  loading,
  onRefresh,
}: IdeaBankHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-medium">Intelligent Idea Bank</h3>
        {mode === "template" && (
          <span className="text-xs text-muted-foreground bg-amber-500/10 dark:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 dark:border-amber-500/20">
            Template Mode
          </span>
        )}
        {legacyMode && mode !== "template" && (
          <span className="text-xs text-muted-foreground bg-yellow-500/10 dark:bg-yellow-500/20 px-2 py-0.5 rounded border border-yellow-500/30 dark:border-yellow-500/20">
            Legacy Mode
          </span>
        )}
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="p-2 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
        data-testid="button-refresh-idea-bank"
      >
        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
      </button>
    </div>
  );
}

export const IdeaBankHeader = memo(IdeaBankHeaderComponent);
