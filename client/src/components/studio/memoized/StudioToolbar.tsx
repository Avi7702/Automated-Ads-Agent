import React, { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Download,
  RefreshCw,
  Pencil,
  MessageCircle,
  Eye,
  FolderPlus,
  Copy,
  Check,
  Loader2,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useHaptic } from '@/hooks/useHaptic';
import { toast } from 'sonner';
import type { Product } from '@shared/schema';

// Generate button component - memoized
interface GenerateButtonProps {
  selectedProductsCount: number;
  tempUploadsCount: number;
  platform: string;
  resolution: string;
  hasPrompt: boolean;
  onGenerate: () => void;
}

const GenerateButton = memo(function GenerateButtonComponent({
  selectedProductsCount,
  tempUploadsCount,
  platform,
  resolution,
  hasPrompt,
  onGenerate,
}: GenerateButtonProps) {
  const totalImages = selectedProductsCount + tempUploadsCount;
  const canGenerate = totalImages > 0 && hasPrompt;

  return (
    <motion.div
      id="generate"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-8"
    >
      <Button
        size="lg"
        onClick={onGenerate}
        disabled={!canGenerate}
        className="w-full h-16 text-lg rounded-2xl"
      >
        <Sparkles className="w-5 h-5 mr-2 ai-sparkle text-primary ai-glow" />
        Generate Image
      </Button>
      <p className="text-center text-sm text-muted-foreground mt-3">
        {totalImages} image{totalImages !== 1 ? 's' : ''} - {platform} - {resolution}
      </p>
    </motion.div>
  );
});

// Action buttons component - memoized
interface ActionButtonsProps {
  activeActionButton: 'edit' | 'copy' | 'preview' | 'save' | null;
  generatedCopy: string;
  justCopied: boolean;
  onEditClick: () => void;
  onCopyClick: () => void;
  onPreviewClick: () => void;
  onSaveClick: () => void;
  onCopyText: () => void;
}

const ActionButtons = memo(function ActionButtonsComponent({
  activeActionButton,
  generatedCopy,
  justCopied,
  onEditClick,
  onCopyClick,
  onPreviewClick,
  onSaveClick,
  onCopyText,
}: ActionButtonsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      <Button
        variant={activeActionButton === 'edit' ? 'default' : 'outline'}
        className={cn(
          'h-14 transition-all',
          activeActionButton === 'edit' && 'ring-2 ring-primary/30 scale-105'
        )}
        onClick={onEditClick}
      >
        <Pencil className="w-4 h-4 mr-2" />
        Edit
      </Button>
      <Button
        variant={activeActionButton === 'copy' ? 'default' : 'outline'}
        className={cn(
          'h-14 transition-all',
          activeActionButton === 'copy' && 'ring-2 ring-primary/30 scale-105'
        )}
        onClick={onCopyClick}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Copy
      </Button>
      <Button
        variant={activeActionButton === 'preview' ? 'default' : 'outline'}
        className={cn(
          'h-14 transition-all',
          activeActionButton === 'preview' && 'ring-2 ring-primary/30 scale-105'
        )}
        onClick={onPreviewClick}
      >
        <Eye className="w-4 h-4 mr-2" />
        Preview
      </Button>
      <Button
        variant={activeActionButton === 'save' ? 'default' : 'outline'}
        className={cn(
          'h-14 transition-all',
          activeActionButton === 'save' && 'ring-2 ring-primary/30 scale-105'
        )}
        onClick={onSaveClick}
      >
        <FolderPlus className="w-4 h-4 mr-2" />
        Save
      </Button>
      <Button
        variant={justCopied ? 'default' : 'outline'}
        className={cn('h-14 transition-all', justCopied && 'bg-green-500/10 border-green-500')}
        disabled={!generatedCopy}
        onClick={onCopyText}
      >
        {justCopied ? (
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
  );
});

// Result header component - memoized
interface ResultHeaderProps {
  generationId: string | null;
  isDownloading: boolean;
  onReset: () => void;
  onDownload: () => void;
}

const ResultHeader = memo(function ResultHeaderComponent({
  generationId,
  isDownloading,
  onReset,
  onDownload,
}: ResultHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" onClick={onReset}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Start New
      </Button>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onDownload}
          disabled={isDownloading}
          className="hover:scale-105 transition-all"
        >
          {isDownloading ? (
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
        <Link href={`/generation/${generationId}`}>
          <Button
            variant="outline"
            className="hover:scale-105 transition-all hover:border-primary/50"
          >
            <History className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </Link>
      </div>
    </div>
  );
});

// Sticky generate bar component - memoized
interface StickyGenerateBarProps {
  visible: boolean;
  selectedProducts: Product[];
  platform: string;
  onGenerate: () => void;
  disabled: boolean;
  isGenerating: boolean;
}

const StickyGenerateBar = memo(function StickyGenerateBarComponent({
  visible,
  selectedProducts,
  platform,
  onGenerate,
  disabled,
  isGenerating,
}: StickyGenerateBarProps) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 mb-safe"
    >
      <div className="relative">
        {/* Pulsing ring when ready */}
        {!disabled && !isGenerating && (
          <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-75" />
        )}

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            size="lg"
            onClick={onGenerate}
            disabled={disabled || isGenerating}
            className={cn(
              'relative px-8 h-16 text-lg rounded-full shadow-2xl group overflow-hidden',
              !disabled && !isGenerating && 'glass'
            )}
          >
            {/* Animated gradient background */}
            {!disabled && !isGenerating && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient-x opacity-90" />
            )}

            <span className="relative z-10 flex items-center">
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2 ai-sparkle ai-glow" />
                  Generate Image
                </>
              )}
            </span>
          </Button>
        </motion.div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-3">
        {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} - {platform}
      </p>
    </motion.div>
  );
});

// Main toolbar props
interface StudioToolbarProps {
  // Generate button props
  selectedProductsCount: number;
  tempUploadsCount: number;
  selectedProducts: Product[];
  platform: string;
  resolution: string;
  hasPrompt: boolean;
  onGenerate: () => void;
  // Result header props
  showResultHeader: boolean;
  generationId: string | null;
  isDownloading: boolean;
  onReset: () => void;
  onDownload: () => void;
  // Action buttons props
  showActionButtons: boolean;
  activeActionButton: 'edit' | 'copy' | 'preview' | 'save' | null;
  generatedCopy: string;
  justCopied: boolean;
  onEditClick: () => void;
  onCopyClick: () => void;
  onPreviewClick: () => void;
  onSaveClick: () => void;
  onCopyText: () => void;
  // Sticky bar props
  showStickyGenerate: boolean;
  prompt: string;
  isGenerating: boolean;
}

/**
 * StudioToolbar - Generate button and action buttons
 *
 * Contains:
 * - Generate button with status
 * - Result header (download, view details)
 * - Action buttons (edit, copy, preview, save)
 * - Sticky generate bar
 *
 * Memoized to prevent re-renders when:
 * - Products/templates in sidebar change
 * - History panel state changes
 * - Prompt section editing (only prompt length matters)
 */
function StudioToolbarComponent({
  selectedProductsCount,
  tempUploadsCount,
  selectedProducts,
  platform,
  resolution,
  hasPrompt,
  onGenerate,
  showResultHeader,
  generationId,
  isDownloading,
  onReset,
  onDownload,
  showActionButtons,
  activeActionButton,
  generatedCopy,
  justCopied,
  onEditClick,
  onCopyClick,
  onPreviewClick,
  onSaveClick,
  onCopyText,
  showStickyGenerate,
  prompt,
  isGenerating,
}: StudioToolbarProps) {
  const disabled = (selectedProductsCount === 0 && tempUploadsCount === 0) || !prompt.trim();

  return (
    <>
      {/* Result Header */}
      {showResultHeader && (
        <ResultHeader
          generationId={generationId}
          isDownloading={isDownloading}
          onReset={onReset}
          onDownload={onDownload}
        />
      )}

      {/* Action Buttons */}
      {showActionButtons && (
        <ActionButtons
          activeActionButton={activeActionButton}
          generatedCopy={generatedCopy}
          justCopied={justCopied}
          onEditClick={onEditClick}
          onCopyClick={onCopyClick}
          onPreviewClick={onPreviewClick}
          onSaveClick={onSaveClick}
          onCopyText={onCopyText}
        />
      )}

      {/* Generate Button (idle state) */}
      {!showResultHeader && !showActionButtons && (
        <GenerateButton
          selectedProductsCount={selectedProductsCount}
          tempUploadsCount={tempUploadsCount}
          platform={platform}
          resolution={resolution}
          hasPrompt={hasPrompt}
          onGenerate={onGenerate}
        />
      )}

      {/* Sticky Generate Bar */}
      <AnimatePresence>
        <StickyGenerateBar
          visible={showStickyGenerate}
          selectedProducts={selectedProducts}
          platform={platform}
          onGenerate={onGenerate}
          disabled={disabled}
          isGenerating={isGenerating}
        />
      </AnimatePresence>
    </>
  );
}

export const StudioToolbar = memo(StudioToolbarComponent);

StudioToolbar.displayName = 'StudioToolbar';

// Export sub-components for direct use if needed
export { GenerateButton, ActionButtons, ResultHeader, StickyGenerateBar };
