import React, { memo, useMemo } from "react";
import { Eye, Database, Globe, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IdeaBankSuggestion } from "./types";

interface SourceIndicatorsProps {
  suggestion: IdeaBankSuggestion;
}

function SourceIndicatorsComponent({ suggestion }: SourceIndicatorsProps) {
  const sources = useMemo(() => {
    const result = [];

    if (suggestion.sourcesUsed.visionAnalysis) {
      result.push({ icon: Eye, label: "Vision", color: "text-blue-600 dark:text-blue-400" });
    }
    if (suggestion.sourcesUsed.kbRetrieval) {
      result.push({ icon: Database, label: "Knowledge", color: "text-purple-600 dark:text-purple-400" });
    }
    if (suggestion.sourcesUsed.webSearch) {
      result.push({ icon: Globe, label: "Web", color: "text-green-600 dark:text-green-400" });
    }
    if (suggestion.sourcesUsed.templateMatching) {
      result.push({ icon: TrendingUp, label: "Templates", color: "text-orange-600 dark:text-orange-400" });
    }

    return result;
  }, [
    suggestion.sourcesUsed.visionAnalysis,
    suggestion.sourcesUsed.kbRetrieval,
    suggestion.sourcesUsed.webSearch,
    suggestion.sourcesUsed.templateMatching,
  ]);

  if (sources.length === 0) {
    return null;
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

export const SourceIndicators = memo(SourceIndicatorsComponent);
