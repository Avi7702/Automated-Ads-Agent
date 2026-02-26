// @ts-nocheck
/**
 * ResultViewEnhanced — Studio result state center panel (simplified)
 *
 * Contains: Plan context banner, result header, generated media with zoom,
 * minimal action bar (AI Canvas, Save, Download, Copy Text), and Canvas Editor overlay.
 *
 * Edit, Copy, Ask AI, LinkedIn Preview, and History Timeline are all handled
 * by the InspectorPanel (right panel) to avoid duplication.
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Loader2, History, FolderPlus, Copy, Check, Wand2, ArrowLeft } from 'lucide-react';
import { CanvasEditor } from '@/components/studio/CanvasEditor/CanvasEditor';
import { useStudioState } from '@/hooks/useStudioState';

interface ResultViewEnhancedProps {
  handleReset: () => void;
  handleDownloadWithFeedback: () => void;
  handleCopyText: () => void;
  handleCanvasEditComplete: (newImageUrl: string) => void;
  haptic: (intensity: 'light' | 'medium' | 'heavy') => void;
  zoomContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const ResultViewEnhanced = memo(function ResultViewEnhanced({
  handleReset,
  handleDownloadWithFeedback,
  handleCopyText,
  handleCanvasEditComplete,
  haptic,
  zoomContainerRef,
}: ResultViewEnhancedProps) {
  const {
    state,
    setImageScale,
    setImagePosition,
    setShowCanvasEditor,
    setShowSaveToCatalog,
  } = useStudioState();
  const [, setLocation] = useLocation();

  if (!state.generatedImage) return null;

  return (
    <motion.div id="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Plan Context Banner */}
      {state.planContext && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-green-800 dark:text-green-200">
            Generated for Weekly Plan — {state.planContext.dayOfWeek} {state.planContext.category.replace(/_/g, ' ')}
          </p>
          <Button variant="outline" size="sm" onClick={() => setLocation('/pipeline?tab=dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plan
          </Button>
        </div>
      )}

      {/* Result Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleReset}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Start New
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadWithFeedback} disabled={state.isDownloading}>
            {state.isDownloading ? (
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
          <Link href={`/generation/${state.generationId}`}>
            <Button variant="outline">
              <History className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </Link>
        </div>
      </div>

      {/* Generated Media — Video or Image with Zoom */}
      {state.generatedMediaType === 'video' ? (
        <div className="rounded-2xl overflow-hidden border border-border bg-black">
          <video
            src={state.generatedImage}
            controls
            autoPlay
            loop
            className="w-full aspect-video"
            style={{ maxHeight: '70vh' }}
          >
            Your browser does not support video playback.
          </video>
        </div>
      ) : (
        <div
          ref={zoomContainerRef}
          className="rounded-2xl overflow-hidden border border-border bg-black relative touch-none select-none"
        >
          <motion.div
            style={{
              scale: state.imageScale,
              x: state.imagePosition.x,
              y: state.imagePosition.y,
              cursor: state.imageScale > 1 ? 'grab' : 'default',
            }}
            onDoubleClick={() => {
              setImageScale(1);
              setImagePosition({ x: 0, y: 0 });
            }}
            className="transition-none"
          >
            <img
              src={state.generatedImage}
              alt="Generated"
              className="w-full aspect-square object-cover pointer-events-none"
              draggable={false}
            />
          </motion.div>

          {state.imageScale === 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-white/80">
              Scroll to zoom · Double-click to reset
            </div>
          )}

          {state.imageScale !== 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-white font-mono"
            >
              {Math.round(state.imageScale * 100)}%
            </motion.div>
          )}
        </div>
      )}

      {/* Simplified Action Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button
          variant="outline"
          className="h-12 transition-all"
          onClick={() => {
            haptic('light');
            setShowCanvasEditor(true);
          }}
        >
          <Wand2 className="w-4 h-4 mr-2" />
          AI Canvas
        </Button>
        <Button
          variant="outline"
          className="h-12 transition-all"
          onClick={() => {
            haptic('light');
            setShowSaveToCatalog(true);
          }}
        >
          <FolderPlus className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button
          variant="outline"
          className="h-12"
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
              Download
            </>
          )}
        </Button>
        <Button variant="outline" className="h-12" onClick={handleCopyText} disabled={!state.generatedCopy}>
          {state.justCopied ? (
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

      {/* AI Canvas Editor Overlay */}
      <AnimatePresence>
        {state.showCanvasEditor && state.generatedImage && (
          <CanvasEditor
            imageUrl={state.generatedImage}
            generationId={state.generationId}
            onEditComplete={handleCanvasEditComplete}
            onClose={() => setShowCanvasEditor(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
});
