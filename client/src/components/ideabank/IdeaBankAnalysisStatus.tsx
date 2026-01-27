import React, { memo } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { IdeaBankAnalysisStatusProps } from "./types";

function IdeaBankAnalysisStatusComponent({
  response,
  legacyMode,
}: IdeaBankAnalysisStatusProps) {
  if (legacyMode) {
    return null;
  }

  return (
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
  );
}

export const IdeaBankAnalysisStatus = memo(IdeaBankAnalysisStatusComponent);
