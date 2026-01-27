import React, { memo } from "react";
import { Database, Upload, Loader2 } from "lucide-react";
import type { IdeaBankInputSummaryProps } from "./types";

function IdeaBankInputSummaryComponent({
  selectedProducts,
  selectedUploads,
  analyzingCount,
}: IdeaBankInputSummaryProps) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      {selectedProducts.length > 0 && (
        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/20">
          <Database className="w-3 h-3 text-primary" />
          {selectedProducts.length} {selectedProducts.length === 1 ? "product" : "products"}
        </span>
      )}
      {selectedUploads.length > 0 && (
        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 dark:border-purple-500/30">
          <Upload className="w-3 h-3 text-purple-600 dark:text-purple-400" />
          {selectedUploads.length} {selectedUploads.length === 1 ? "upload" : "uploads"}
        </span>
      )}
      {analyzingCount > 0 && (
        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/30 text-amber-600 dark:text-amber-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Analyzing {analyzingCount} {analyzingCount === 1 ? "image" : "images"}...
        </span>
      )}
    </div>
  );
}

export const IdeaBankInputSummary = memo(IdeaBankInputSummaryComponent);
