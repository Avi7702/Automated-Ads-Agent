import React, { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Check,
  X,
  Wand2,
  FileImage,
  Layout,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { IdeaBankPanel } from '@/components/IdeaBankPanel';
import { ContentPlannerGuidance } from '@/components/ContentPlannerGuidance';
import { CarouselBuilder } from '@/components/CarouselBuilder';
import { BeforeAfterBuilder } from '@/components/BeforeAfterBuilder';
import { TextOnlyMode } from '@/components/TextOnlyMode';
import { TemplateLibrary } from '@/components/TemplateLibrary';
import type { Product, AdSceneTemplate } from '@shared/schema';
import type { AnalyzedUpload } from '@/types/analyzedUpload';
import type { GenerationRecipe, GenerationMode, IdeaBankMode, TemplateSlotSuggestion } from '@shared/types/ideaBank';
import type { ContentTemplate } from '@shared/contentTemplates';

interface SelectedSuggestion {
  id: string;
  prompt: string;
  reasoning?: string;
}

interface CopyResult {
  headline: string;
  hook: string;
  bodyText: string;
  cta: string;
  caption: string;
  hashtags: string[];
  framework: string;
}

// Generation path selection component - memoized
interface GenerationPathSelectorProps {
  ideaBankMode: IdeaBankMode;
  onSelectFreestyle: () => void;
  onSelectTemplate: () => void;
  selectedTemplateForMode: AdSceneTemplate | null;
  onClearTemplate: () => void;
  onTemplateSelect: (template: AdSceneTemplate) => void;
}

const GenerationPathSelector = memo(function GenerationPathSelectorComponent({
  ideaBankMode,
  onSelectFreestyle,
  onSelectTemplate,
  selectedTemplateForMode,
  onClearTemplate,
  onTemplateSelect,
}: GenerationPathSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-primary ai-sparkle ai-glow" />
        <h3 className="font-medium">Choose Your Path</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Freestyle Mode */}
        <button
          onClick={onSelectFreestyle}
          className={cn(
            'p-6 rounded-xl border-2 transition-all text-left group',
            ideaBankMode === 'freestyle'
              ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
              : 'border-border hover:border-primary/50 bg-card/50'
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                ideaBankMode === 'freestyle'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
              )}
            >
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium">Freestyle</h4>
              {ideaBankMode === 'freestyle' && (
                <Check className="w-4 h-4 text-primary inline ml-2" />
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            AI suggests complete scene ideas based on your products. Full creative freedom.
          </p>
        </button>

        {/* Template Mode */}
        <button
          onClick={onSelectTemplate}
          className={cn(
            'p-6 rounded-xl border-2 transition-all text-left group',
            ideaBankMode === 'template'
              ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
              : 'border-border hover:border-primary/50 bg-card/50'
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                ideaBankMode === 'template'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
              )}
            >
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium">Use Template</h4>
              {ideaBankMode === 'template' && (
                <Check className="w-4 h-4 text-primary inline ml-2" />
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Pick a proven scene template, AI fills in the details with your products.
          </p>
        </button>
      </div>

      {/* Template Picker - shown when template mode is selected */}
      {ideaBankMode === 'template' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="p-4 rounded-xl border border-border bg-card/30 mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-primary" />
                <span className="font-medium">Select a Template</span>
              </div>
              {selectedTemplateForMode?.id && (
                <Button variant="ghost" size="sm" onClick={onClearTemplate}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <TemplateLibrary
              onSelectTemplate={onTemplateSelect}
              selectedTemplateId={selectedTemplateForMode?.id || undefined}
              className="max-h-[400px] overflow-y-auto"
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
});

// Prompt section component - memoized
interface PromptSectionProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  selectedSuggestion: SelectedSuggestion | null;
  onClearSuggestion: () => void;
  platform: string;
  onPlatformChange: (value: string) => void;
  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;
  resolution: '1K' | '2K' | '4K';
  onResolutionChange: (value: '1K' | '2K' | '4K') => void;
  // Idea Bank props
  selectedProducts: Product[];
  tempUploads: AnalyzedUpload[];
  onSelectPrompt: (prompt: string, id?: string, reasoning?: string) => void;
  onRecipeAvailable: (recipe: GenerationRecipe | undefined) => void;
  onQuickGenerate: (prompt: string) => void;
  selectedPromptId?: string;
  isGenerating: boolean;
  ideaBankMode: IdeaBankMode;
  templateId?: string;
  onSlotSuggestionSelect: (suggestion: TemplateSlotSuggestion, mergedPrompt: string) => void;
  // Content Planner
  cpTemplate: ContentTemplate | null;
  onDismissCpTemplate: () => void;
  onGenerateCopy: (copy: string) => void;
  onGenerateComplete: (result: { copy?: CopyResult; image?: { imageUrl?: string; prompt?: string } }) => void;
  products: Product[];
  onProductSelectionChange: (productIds: string[]) => void;
  onGenerate: () => void;
  // Builders state
  showCarouselBuilder: boolean;
  carouselTopic: string;
  onCloseCarouselBuilder: () => void;
  onCarouselComplete: () => void;
  showBeforeAfterBuilder: boolean;
  beforeAfterTopic: string;
  onCloseBeforeAfterBuilder: () => void;
  onBeforeAfterComplete: () => void;
  showTextOnlyMode: boolean;
  textOnlyTopic: string;
  onCloseTextOnlyMode: () => void;
  onTextOnlyComplete: (result: { copy: string }) => void;
}

const PromptSection = memo(function PromptSectionComponent({
  prompt,
  onPromptChange,
  selectedSuggestion,
  onClearSuggestion,
  platform,
  onPlatformChange,
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
  selectedProducts,
  tempUploads,
  onSelectPrompt,
  onRecipeAvailable,
  onQuickGenerate,
  selectedPromptId,
  isGenerating,
  ideaBankMode,
  templateId,
  onSlotSuggestionSelect,
  cpTemplate,
  onDismissCpTemplate,
  onGenerateCopy,
  onGenerateComplete,
  products,
  onProductSelectionChange,
  onGenerate,
  showCarouselBuilder,
  carouselTopic,
  onCloseCarouselBuilder,
  onCarouselComplete,
  showBeforeAfterBuilder,
  beforeAfterTopic,
  onCloseBeforeAfterBuilder,
  onBeforeAfterComplete,
  showTextOnlyMode,
  textOnlyTopic,
  onCloseTextOnlyMode,
  onTextOnlyComplete,
}: PromptSectionProps) {
  // Memoize product-related props
  const productNames = useMemo(
    () => selectedProducts.map((p) => p.name),
    [selectedProducts]
  );

  const productImageUrls = useMemo(
    () => selectedProducts.map((p) => p.cloudinaryUrl).filter(Boolean) as string[],
    [selectedProducts]
  );

  const selectedProductIds = useMemo(
    () => selectedProducts.map((p) => p.id),
    [selectedProducts]
  );

  return (
    <motion.section
      id="prompt"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl border border-border bg-card/30 backdrop-blur-sm space-y-6"
    >
      <h2 className="text-lg font-medium">Describe Your Vision</h2>

      {/* Selected Suggestion Card */}
      <AnimatePresence>
        {selectedSuggestion && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="p-4 rounded-xl bg-primary/10 border-2 border-primary/30 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-primary">Selected Suggestion</span>
              </div>
              <button
                onClick={onClearSuggestion}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {selectedSuggestion.reasoning && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                {selectedSuggestion.reasoning}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Planner Guidance */}
      {cpTemplate && !showCarouselBuilder && !showBeforeAfterBuilder && !showTextOnlyMode && (
        <ContentPlannerGuidance
          template={cpTemplate}
          platform={platform}
          onDismiss={onDismissCpTemplate}
          onSelectHook={(hook) => onPromptChange(hook)}
          onGenerateCopy={onGenerateCopy}
          onSetAspectRatio={onAspectRatioChange}
          onGenerateImage={onGenerate}
          productNames={productNames}
          hasProductsSelected={selectedProducts.length > 0 || tempUploads.length > 0}
          availableProducts={products}
          selectedProductIds={selectedProductIds}
          onProductSelectionChange={onProductSelectionChange}
          onGenerateComplete={onGenerateComplete}
        />
      )}

      {/* Carousel Builder */}
      {showCarouselBuilder && cpTemplate && (
        <CarouselBuilder
          templateId={cpTemplate.id}
          topic={carouselTopic}
          platform={platform}
          productNames={productNames}
          productImageUrls={productImageUrls}
          aspectRatio={aspectRatio}
          onClose={onCloseCarouselBuilder}
          onComplete={onCarouselComplete}
        />
      )}

      {/* Before/After Builder */}
      {showBeforeAfterBuilder && cpTemplate && (
        <BeforeAfterBuilder
          templateId={cpTemplate.id}
          topic={beforeAfterTopic}
          platform={platform}
          productNames={productNames}
          productImageUrls={productImageUrls}
          aspectRatio={aspectRatio}
          onClose={onCloseBeforeAfterBuilder}
          onComplete={onBeforeAfterComplete}
        />
      )}

      {/* Text-Only Mode */}
      {showTextOnlyMode && cpTemplate && (
        <TextOnlyMode
          templateId={cpTemplate.id}
          topic={textOnlyTopic}
          platform={platform}
          onClose={onCloseTextOnlyMode}
          onComplete={onTextOnlyComplete}
        />
      )}

      {/* Main Prompt Textarea */}
      <div className="space-y-2">
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Professional construction site product shot, NDS drainage solutions installed in active trench work..."
          rows={5}
          className={cn(
            'resize-none text-lg transition-all',
            selectedSuggestion && 'border-primary/50 ring-2 ring-primary/20'
          )}
        />
        {prompt && (
          <p className="text-xs text-muted-foreground text-right">{prompt.length} characters</p>
        )}
      </div>

      {/* Idea Bank */}
      <ErrorBoundary>
        <IdeaBankPanel
          selectedProducts={selectedProducts}
          tempUploads={tempUploads}
          onSelectPrompt={onSelectPrompt}
          onRecipeAvailable={onRecipeAvailable}
          onSetPlatform={onPlatformChange}
          onSetAspectRatio={onAspectRatioChange}
          onQuickGenerate={onQuickGenerate}
          selectedPromptId={selectedPromptId}
          isGenerating={isGenerating}
          mode={ideaBankMode}
          templateId={templateId}
          onSlotSuggestionSelect={onSlotSuggestionSelect}
        />
      </ErrorBoundary>

      {/* Platform & Aspect Ratio */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Platform:</span>
          <Select value={platform} onValueChange={onPlatformChange}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LinkedIn">LinkedIn</SelectItem>
              <SelectItem value="Instagram">Instagram</SelectItem>
              <SelectItem value="Facebook">Facebook</SelectItem>
              <SelectItem value="Twitter">Twitter/X</SelectItem>
              <SelectItem value="TikTok">TikTok</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Size:</span>
          <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1200x627">1200x627 (LinkedIn Post)</SelectItem>
              <SelectItem value="1200x1200">1200x1200 (Square)</SelectItem>
              <SelectItem value="1080x1350">1080x1350 (Portrait)</SelectItem>
              <SelectItem value="1920x1080">1920x1080 (Landscape HD)</SelectItem>
              <SelectItem value="1080x1920">1080x1920 (Story/Reel)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Quality:</span>
          <Select value={resolution} onValueChange={onResolutionChange}>
            <SelectTrigger className="w-full sm:w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1K">1K</SelectItem>
              <SelectItem value="2K">2K (HD)</SelectItem>
              <SelectItem value="4K">4K</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.section>
  );
});

// Price estimate component - memoized
interface PriceEstimateProps {
  estimatedCost: number;
  p90: number;
  sampleCount: number;
  usedFallback: boolean;
}

const PriceEstimate = memo(function PriceEstimateComponent({
  estimatedCost,
  p90,
  sampleCount,
  usedFallback,
}: PriceEstimateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 dark:from-green-500/20 to-emerald-500/10 dark:to-emerald-500/20 border border-green-500/20 dark:border-green-500/30"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">$</span>
          <div>
            <p className="text-sm font-medium">
              Estimated cost:{' '}
              <span className="text-green-700 dark:text-green-400">
                ${estimatedCost.toFixed(3)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {usedFallback
                ? 'Based on default rates'
                : `Based on ${sampleCount} similar generations`}
              {p90 > estimatedCost && <span> - 90th percentile: ${p90.toFixed(3)}</span>}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// Main StudioCanvas props
interface StudioCanvasProps {
  // State
  isIdle: boolean;
  ideaBankMode: IdeaBankMode;
  generationMode: GenerationMode;
  selectedTemplateForMode: AdSceneTemplate | null;
  prompt: string;
  selectedSuggestion: SelectedSuggestion | null;
  platform: string;
  aspectRatio: string;
  resolution: '1K' | '2K' | '4K';
  selectedProducts: Product[];
  tempUploads: AnalyzedUpload[];
  isGenerating: boolean;
  generationRecipe: GenerationRecipe | undefined;
  priceEstimate: PriceEstimateProps | null;
  // Content Planner
  cpTemplate: ContentTemplate | null;
  products: Product[];
  // Builders
  showCarouselBuilder: boolean;
  carouselTopic: string;
  showBeforeAfterBuilder: boolean;
  beforeAfterTopic: string;
  showTextOnlyMode: boolean;
  textOnlyTopic: string;
  // Callbacks
  onSelectFreestyle: () => void;
  onSelectTemplate: () => void;
  onClearTemplateForMode: () => void;
  onTemplateForModeSelect: (template: AdSceneTemplate) => void;
  onPromptChange: (value: string) => void;
  onClearSuggestion: () => void;
  onPlatformChange: (value: string) => void;
  onAspectRatioChange: (value: string) => void;
  onResolutionChange: (value: '1K' | '2K' | '4K') => void;
  onSelectPrompt: (prompt: string, id?: string, reasoning?: string) => void;
  onRecipeAvailable: (recipe: GenerationRecipe | undefined) => void;
  onQuickGenerate: (prompt: string) => void;
  onSlotSuggestionSelect: (suggestion: TemplateSlotSuggestion, mergedPrompt: string) => void;
  onDismissCpTemplate: () => void;
  onGenerateCopy: (copy: string) => void;
  onGenerateComplete: (result: { copy?: CopyResult; image?: { imageUrl?: string; prompt?: string } }) => void;
  onProductSelectionChange: (productIds: string[]) => void;
  onGenerate: () => void;
  onCloseCarouselBuilder: () => void;
  onCarouselComplete: () => void;
  onCloseBeforeAfterBuilder: () => void;
  onBeforeAfterComplete: () => void;
  onCloseTextOnlyMode: () => void;
  onTextOnlyComplete: (result: { copy: string }) => void;
}

/**
 * StudioCanvas - Main generation workspace
 *
 * Handles the idle state workflow:
 * - Generation path selection (freestyle vs template)
 * - Prompt section with IdeaBank
 * - Platform and output settings
 * - Price estimate display
 *
 * Memoized to prevent re-renders when:
 * - Products/templates change (handled by sidebar)
 * - History panel state changes
 */
function StudioCanvasComponent({
  isIdle,
  ideaBankMode,
  generationMode,
  selectedTemplateForMode,
  prompt,
  selectedSuggestion,
  platform,
  aspectRatio,
  resolution,
  selectedProducts,
  tempUploads,
  isGenerating,
  generationRecipe,
  priceEstimate,
  cpTemplate,
  products,
  showCarouselBuilder,
  carouselTopic,
  showBeforeAfterBuilder,
  beforeAfterTopic,
  showTextOnlyMode,
  textOnlyTopic,
  onSelectFreestyle,
  onSelectTemplate,
  onClearTemplateForMode,
  onTemplateForModeSelect,
  onPromptChange,
  onClearSuggestion,
  onPlatformChange,
  onAspectRatioChange,
  onResolutionChange,
  onSelectPrompt,
  onRecipeAvailable,
  onQuickGenerate,
  onSlotSuggestionSelect,
  onDismissCpTemplate,
  onGenerateCopy,
  onGenerateComplete,
  onProductSelectionChange,
  onGenerate,
  onCloseCarouselBuilder,
  onCarouselComplete,
  onCloseBeforeAfterBuilder,
  onBeforeAfterComplete,
  onCloseTextOnlyMode,
  onTextOnlyComplete,
}: StudioCanvasProps) {
  if (!isIdle) return null;

  return (
    <>
      {/* Generation Path Selection */}
      <GenerationPathSelector
        ideaBankMode={ideaBankMode}
        onSelectFreestyle={onSelectFreestyle}
        onSelectTemplate={onSelectTemplate}
        selectedTemplateForMode={selectedTemplateForMode}
        onClearTemplate={onClearTemplateForMode}
        onTemplateSelect={onTemplateForModeSelect}
      />

      {/* Prompt Section */}
      <PromptSection
        prompt={prompt}
        onPromptChange={onPromptChange}
        selectedSuggestion={selectedSuggestion}
        onClearSuggestion={onClearSuggestion}
        platform={platform}
        onPlatformChange={onPlatformChange}
        aspectRatio={aspectRatio}
        onAspectRatioChange={onAspectRatioChange}
        resolution={resolution}
        onResolutionChange={onResolutionChange}
        selectedProducts={selectedProducts}
        tempUploads={tempUploads}
        onSelectPrompt={onSelectPrompt}
        onRecipeAvailable={onRecipeAvailable}
        onQuickGenerate={onQuickGenerate}
        selectedPromptId={selectedSuggestion?.id}
        isGenerating={isGenerating}
        ideaBankMode={ideaBankMode}
        templateId={selectedTemplateForMode?.id}
        onSlotSuggestionSelect={onSlotSuggestionSelect}
        cpTemplate={cpTemplate}
        onDismissCpTemplate={onDismissCpTemplate}
        onGenerateCopy={onGenerateCopy}
        onGenerateComplete={onGenerateComplete}
        products={products}
        onProductSelectionChange={onProductSelectionChange}
        onGenerate={onGenerate}
        showCarouselBuilder={showCarouselBuilder}
        carouselTopic={carouselTopic}
        onCloseCarouselBuilder={onCloseCarouselBuilder}
        onCarouselComplete={onCarouselComplete}
        showBeforeAfterBuilder={showBeforeAfterBuilder}
        beforeAfterTopic={beforeAfterTopic}
        onCloseBeforeAfterBuilder={onCloseBeforeAfterBuilder}
        onBeforeAfterComplete={onBeforeAfterComplete}
        showTextOnlyMode={showTextOnlyMode}
        textOnlyTopic={textOnlyTopic}
        onCloseTextOnlyMode={onCloseTextOnlyMode}
        onTextOnlyComplete={onTextOnlyComplete}
      />

      {/* Price Estimate */}
      {priceEstimate && <PriceEstimate {...priceEstimate} />}
    </>
  );
}

export const StudioCanvas = memo(StudioCanvasComponent);

StudioCanvas.displayName = 'StudioCanvas';
