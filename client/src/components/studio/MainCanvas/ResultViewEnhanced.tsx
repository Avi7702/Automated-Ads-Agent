// @ts-nocheck
/**
 * ResultViewEnhanced — Studio result state center panel
 *
 * Contains: Generated image with zoom, action buttons, edit section,
 * Ask AI section, copy generation, LinkedIn preview, and history timeline.
 */

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { HistoryTimeline } from "@/components/HistoryTimeline";
import { LinkedInPostPreview } from "@/components/LinkedInPostPreview";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Download,
  RefreshCw,
  Pencil,
  MessageCircle,
  Send,
  Loader2,
  History,
  Eye,
  FolderPlus,
  Copy,
} from "lucide-react";
import type { StudioOrchestrator } from "@/hooks/useStudioOrchestrator";

interface ResultViewEnhancedProps {
  orch: StudioOrchestrator;
}

export const ResultViewEnhanced = memo(function ResultViewEnhanced({ orch }: ResultViewEnhancedProps) {
  if (!orch.generatedImage) return null;

  return (
    <motion.div
      id="result"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Result Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={orch.handleReset}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Start New
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={orch.handleDownloadWithFeedback}
            disabled={orch.isDownloading}
          >
            {orch.isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download
              </>
            )}
          </Button>
          <Link href={`/generation/${orch.generationId}`}>
            <Button variant="outline">
              <History className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </Link>
        </div>
      </div>

      {/* Generated Image with Zoom */}
      <div
        ref={orch.zoomContainerRef}
        className="rounded-2xl overflow-hidden border border-border bg-black relative touch-none select-none"
      >
        <motion.div
          style={{
            scale: orch.imageScale,
            x: orch.imagePosition.x,
            y: orch.imagePosition.y,
            cursor: orch.imageScale > 1 ? "grab" : "default",
          }}
          onDoubleClick={() => {
            orch.setImageScale(1);
            orch.setImagePosition({ x: 0, y: 0 });
          }}
          className="transition-none"
        >
          <img
            src={orch.generatedImage}
            alt="Generated"
            className="w-full aspect-square object-cover pointer-events-none"
            draggable={false}
          />
        </motion.div>

        {orch.imageScale === 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-white/80">
            Scroll to zoom • Double-click to reset
          </div>
        )}

        {orch.imageScale !== 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-white font-mono"
          >
            {Math.round(orch.imageScale * 100)}%
          </motion.div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Button
          variant={orch.activeActionButton === "edit" ? "default" : "outline"}
          className={cn(
            "h-12 transition-all",
            orch.activeActionButton === "edit" && "ring-2 ring-primary/30"
          )}
          onClick={() => {
            orch.haptic("light");
            orch.setActiveActionButton("edit");
          }}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Edit
        </Button>
        <Button
          variant={orch.activeActionButton === "copy" ? "default" : "outline"}
          className={cn(
            "h-12 transition-all",
            orch.activeActionButton === "copy" && "ring-2 ring-primary/30"
          )}
          onClick={() => {
            orch.haptic("light");
            orch.setActiveActionButton("copy");
          }}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Copy
        </Button>
        <Button
          variant={orch.activeActionButton === "preview" ? "default" : "outline"}
          className={cn(
            "h-12 transition-all",
            orch.activeActionButton === "preview" && "ring-2 ring-primary/30"
          )}
          onClick={() => {
            orch.haptic("light");
            orch.setActiveActionButton("preview");
          }}
        >
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </Button>
        <Button
          variant={orch.activeActionButton === "save" ? "default" : "outline"}
          className={cn(
            "h-12 transition-all",
            orch.activeActionButton === "save" && "ring-2 ring-primary/30"
          )}
          onClick={() => {
            orch.haptic("light");
            orch.setShowSaveToCatalog(true);
          }}
        >
          <FolderPlus className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button
          variant="outline"
          className="h-12"
          onClick={orch.handleCopyText}
          disabled={!orch.generatedCopy}
        >
          {orch.justCopied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy Text
            </>
          )}
        </Button>
      </div>

      {/* History Timeline */}
      <ErrorBoundary>
        <HistoryTimeline
          currentGenerationId={orch.generationId}
          onSelect={orch.handleLoadFromHistory}
        />
      </ErrorBoundary>

      {/* Edit Section */}
      <AnimatePresence>
        {orch.activeActionButton === "edit" && (
          <motion.section
            id="refine"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border border-border bg-card/50 p-5 space-y-4 overflow-hidden"
          >
            <h3 className="font-medium flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Refine Your Image
            </h3>
            <Textarea
              value={orch.editPrompt}
              onChange={(e) => orch.setEditPrompt(e.target.value)}
              placeholder="Describe what changes you'd like..."
              rows={3}
              className="resize-none"
            />
            {/* Preset edit suggestions */}
            <div className="flex flex-wrap gap-2">
              {["Warmer lighting", "Cooler tones", "More contrast", "Softer look", "Brighter background"].map(
                (preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="sm"
                    onClick={() => orch.setEditPrompt(preset)}
                    className="text-xs"
                  >
                    {preset}
                  </Button>
                )
              )}
            </div>
            <Button
              onClick={orch.handleApplyEdit}
              disabled={!orch.editPrompt.trim() || orch.isEditing}
              className="w-full"
            >
              {orch.isEditing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Apply Changes
                </>
              )}
            </Button>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Ask AI Section */}
      <AnimatePresence>
        {orch.activeActionButton === "copy" && (
          <motion.section
            id="ask-ai"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border border-border bg-card/50 p-5 space-y-4 overflow-hidden"
          >
            <h3 className="font-medium flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              Ask AI About This Image
            </h3>
            <div className="flex gap-2">
              <Input
                value={orch.askAIQuestion}
                onChange={(e) => orch.setAskAIQuestion(e.target.value)}
                placeholder="Ask a question about this generation..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") orch.handleAskAI();
                }}
              />
              <Button
                onClick={orch.handleAskAI}
                disabled={!orch.askAIQuestion.trim() || orch.isAskingAI}
                size="icon"
              >
                {orch.isAskingAI ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            {orch.askAIResponse && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap"
              >
                {orch.askAIResponse}
              </motion.div>
            )}

            {/* Generate Ad Copy */}
            <div className="pt-4 border-t border-border/50">
              <Button
                onClick={orch.handleGenerateCopy}
                disabled={orch.isGeneratingCopy}
                variant="outline"
                className="w-full"
              >
                {orch.isGeneratingCopy ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating copy...
                  </>
                ) : orch.generatedCopy ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate Ad Copy
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Ad Copy
                  </>
                )}
              </Button>
              {orch.generatedCopy && (
                <div className="mt-4 space-y-3">
                  <Textarea
                    value={orch.generatedCopy}
                    onChange={(e) => orch.setGeneratedCopy(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* LinkedIn Preview */}
      <AnimatePresence>
        {orch.activeActionButton === "preview" && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border border-border bg-card/50 p-5 space-y-4 overflow-hidden"
          >
            <h3 className="font-medium flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              LinkedIn Preview
            </h3>
            <LinkedInPostPreview
              authorName={orch.authUser?.email?.split("@")[0] || "Your Company"}
              authorHeadline="Building Products | Construction Solutions"
              postText={orch.generatedCopy || null}
              imageUrl={orch.generatedImage}
              hashtags={orch.generatedCopyFull?.hashtags || []}
              isEditable={true}
              onTextChange={(text) => orch.setGeneratedCopy(text)}
              onGenerateCopy={orch.handleGenerateCopy}
              isGeneratingCopy={orch.isGeneratingCopy}
            />
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
