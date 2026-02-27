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
import { useStudioState } from '@/hooks/useStudioState';
import type { GenerationDTO } from '@shared/types/api';

interface DetailsTabProps {
  handleDownloadWithFeedback: () => void;
  handleGenerateCopy: () => void;
  handleLoadFromHistory: (generation: GenerationDTO) => void;
  authUser: { email?: string } | null;
}

export const DetailsTab = memo(function DetailsTab({
  handleDownloadWithFeedback,
  handleGenerateCopy,
  handleLoadFromHistory,
  authUser,
}: DetailsTabProps) {
  const {
    state,
    setShowSaveToCatalog,
    setGeneratedCopy,
  } = useStudioState();
  const hasResult = Boolean(state.generatedImage);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopyPrompt = async () => {
    if (!state.prompt) return;
    await navigator.clipboard.writeText(state.prompt);
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
              <p className="text-sm text-foreground/80 line-clamp-3">{state.prompt || 'No prompt used'}</p>
            </div>

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs gap-1">
                <ImageIcon className="w-3 h-3" />
                {state.platform}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                {state.aspectRatio}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                {state.resolution}
              </Badge>
              {state.selectedProducts.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  {state.selectedProducts.length} product{state.selectedProducts.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {state.selectedTemplate && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Sparkles className="w-3 h-3" />
                  {state.selectedTemplate.title}
                </Badge>
              )}
            </div>

            {/* Generation ID */}
            {state.generationId && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Generation ID</span>
                <p className="text-xs font-mono text-foreground/60 break-all">{state.generationId}</p>
              </div>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Generated {new Date().toLocaleString()}</span>
            </div>

            {/* Wave 3: Generation context metadata */}
            {state.generationMode && state.generationMode !== 'standard' && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Generation Mode</span>
                <div>
                  <Badge variant="secondary" className="text-xs">
                    {state.generationMode === 'exact_insert'
                      ? 'Exact Insert'
                      : state.generationMode === 'inspiration'
                        ? 'Inspiration'
                        : 'Standard'}
                  </Badge>
                </div>
              </div>
            )}
            {state.selectedProducts.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Products Used</span>
                <div className="flex flex-wrap gap-1">
                  {state.selectedProducts.map((p) => (
                    <Badge key={p.id} variant="outline" className="text-[10px] font-mono">
                      {p.name || String(p.id).slice(0, 8)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {state.selectedTemplateForMode && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Template</span>
                <p className="text-xs font-mono text-foreground/60 break-all">
                  {state.selectedTemplateForMode.title || state.selectedTemplateForMode.id}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleDownloadWithFeedback}
              disabled={state.isDownloading}
            >
              {state.isDownloading ? (
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

            <Button variant="outline" size="sm" className="w-full" onClick={() => setShowSaveToCatalog(true)}>
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
              authorName={authUser?.email?.split('@')[0] ?? 'Your Company'}
              authorHeadline="Building Products | Construction Solutions"
              postText={state.generatedCopy || null}
              imageUrl={state.generatedImage}
              hashtags={state.generatedCopyFull?.hashtags || []}
              isEditable={true}
              onTextChange={(text) => setGeneratedCopy(text)}
              onGenerateCopy={handleGenerateCopy}
              isGeneratingCopy={state.isGeneratingCopy}
            />
          </div>

          {/* History Timeline (moved from ResultViewEnhanced) */}
          <div className="pt-2 border-t border-border/50">
            <ErrorBoundary>
              <HistoryTimeline currentGenerationId={state.generationId} onSelect={handleLoadFromHistory} />
            </ErrorBoundary>
          </div>
        </>
      )}
    </motion.div>
  );
});
