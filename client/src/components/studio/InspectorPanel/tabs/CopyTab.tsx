// @ts-nocheck
/**
 * CopyTab — Generate and manage ad copy for the current generation
 *
 * Wraps the existing CopywritingPanel with generation context.
 * Also provides a quick inline copy generator for simple use cases.
 */

import { memo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CopywritingPanel } from "@/components/CopywritingPanel";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { StudioOrchestrator } from "@/hooks/useStudioOrchestrator";

interface CopyTabProps {
  orch: StudioOrchestrator;
}

export const CopyTab = memo(function CopyTab({ orch }: CopyTabProps) {
  const hasResult = Boolean(orch.generatedImage);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyToClipboard = async () => {
    if (!orch.generatedCopy) return;
    await navigator.clipboard.writeText(orch.generatedCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-4"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageCircle className="w-4 h-4 text-primary" />
        Ad Copy
      </div>

      {!hasResult ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Generate an image first, then create ad copy to go with it.
        </p>
      ) : (
        <>
          {/* Quick copy generation */}
          <Button
            onClick={orch.handleGenerateCopy}
            disabled={orch.isGeneratingCopy}
            variant="outline"
            className="w-full"
            size="sm"
          >
            {orch.isGeneratingCopy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating copy...
              </>
            ) : orch.generatedCopy ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate Quick Copy
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Quick Copy
              </>
            )}
          </Button>

          {/* Inline editable copy */}
          {orch.generatedCopy && (
            <div className="space-y-2">
              <Textarea
                value={orch.generatedCopy}
                onChange={(e) => orch.setGeneratedCopy(e.target.value)}
                rows={4}
                className="resize-none text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={handleCopyToClipboard}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 mr-1.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1.5" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Advanced: full CopywritingPanel */}
          {orch.generationId && (
            <div className="border-t border-border/50 pt-3">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <span>Advanced Copy Studio</span>
                {showAdvanced ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="pt-3 overflow-hidden"
                >
                  <CopywritingPanel
                    generationId={orch.generationId}
                    prompt={orch.prompt}
                  />
                </motion.div>
              )}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
});
