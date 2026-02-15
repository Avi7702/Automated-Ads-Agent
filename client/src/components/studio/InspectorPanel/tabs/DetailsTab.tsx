// @ts-nocheck
/**
 * DetailsTab — Metadata, download, preview, and history for the current generation
 *
 * Shows generation metadata (prompt, platform, size, model, timestamps),
 * download options, a LinkedIn post preview, and the history timeline.
 *
 * The history timeline was moved here from ResultViewEnhanced to centralize
 * all post-generation information in the InspectorPanel.
 */

import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LinkedInPostPreview } from '@/components/LinkedInPostPreview';
import { HistoryTimeline } from '@/components/HistoryTimeline';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Download, Loader2, Eye, FolderPlus, Clock, ImageIcon, Sparkles, Check, Copy, Info } from 'lucide-react';
import type { StudioOrchestrator } from '@/hooks/useStudioOrchestrator';

interface DetailsTabProps {
  orch: StudioOrchestrator;
}

export const DetailsTab = memo(function DetailsTab({ orch }: DetailsTabProps) {
  const hasResult = Boolean(orch.generatedImage);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopyPrompt = async () => {
    if (!orch.prompt) return;
    await navigator.clipboard.writeText(orch.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Info className="w-4 h-4 text-primary" />
        Details
      </div>

      {!hasResult ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Generate an image to see generation details and metadata.
        </p>
      ) : (
        <>
          {/* Metadata grid */}
          <div className="space-y-3">
            {/* Prompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Prompt</span>
                <button
                  onClick={handleCopyPrompt}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  {copiedPrompt ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedPrompt ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-sm text-foreground/80 line-clamp-3">{orch.prompt || 'No prompt used'}</p>
            </div>

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs gap-1">
                <ImageIcon className="w-3 h-3" />
                {orch.platform}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                {orch.aspectRatio}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                {orch.resolution}
              </Badge>
              {orch.selectedProducts.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  {orch.selectedProducts.length} product{orch.selectedProducts.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {orch.selectedTemplate && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Sparkles className="w-3 h-3" />
                  {orch.selectedTemplate.name}
                </Badge>
              )}
            </div>

            {/* Generation ID */}
            {orch.generationId && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Generation ID</span>
                <p className="text-xs font-mono text-foreground/60 break-all">{orch.generationId}</p>
              </div>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Generated {new Date().toLocaleString()}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
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
                  Download Image
                </>
              )}
            </Button>

            <Button variant="outline" size="sm" className="w-full" onClick={() => orch.setShowSaveToCatalog(true)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Save to Catalog
            </Button>
          </div>

          {/* LinkedIn Preview */}
          <div className="pt-2 border-t border-border/50 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              <span>LinkedIn Preview</span>
            </div>
            <LinkedInPostPreview
              authorName={orch.authUser?.email?.split('@')[0] || 'Your Company'}
              authorHeadline="Building Products | Construction Solutions"
              postText={orch.generatedCopy || null}
              imageUrl={orch.generatedImage}
              hashtags={orch.generatedCopyFull?.hashtags || []}
              isEditable={true}
              onTextChange={(text) => orch.setGeneratedCopy(text)}
              onGenerateCopy={orch.handleGenerateCopy}
              isGeneratingCopy={orch.isGeneratingCopy}
            />
          </div>

          {/* History Timeline (moved from ResultViewEnhanced) */}
          <div className="pt-2 border-t border-border/50">
            <ErrorBoundary>
              <HistoryTimeline currentGenerationId={orch.generationId} onSelect={orch.handleLoadFromHistory} />
            </ErrorBoundary>
          </div>
        </>
      )}
    </motion.div>
  );
});
