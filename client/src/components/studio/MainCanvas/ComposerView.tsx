// @ts-nocheck
/**
 * ComposerView - Studio idle state center panel
 *
 * Chat-first composer with products, prompt/IdeaBank, output settings,
 * price estimate, and generate button.
 */

import { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, getProductImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IdeaBankPanel } from '@/components/IdeaBankPanel';
import { ContentPlannerGuidance } from '@/components/ContentPlannerGuidance';
import { CarouselBuilder } from '@/components/CarouselBuilder';
import { BeforeAfterBuilder } from '@/components/BeforeAfterBuilder';
import { TextOnlyMode } from '@/components/TextOnlyMode';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Search,
  Package,
  Mic,
  MicOff,
} from 'lucide-react';
import { useRipple } from '@/hooks/useRipple';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import type { StudioOrchestrator } from '@/hooks/useStudioOrchestrator';

function Section({
  id,
  title,
  icon: Icon,
  isOpen,
  onToggle,
  badge,
  children,
}: {
  id: string;
  title: string;
  icon?: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card/50 overflow-hidden"
    >
      <button onClick={onToggle} className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-primary" />}
          <h3 className="font-medium text-sm">{title}</h3>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isOpen && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </motion.section>
  );
}

interface ComposerViewProps {
  orch: StudioOrchestrator;
}

export const ComposerView = memo(function ComposerView({ orch }: ComposerViewProps) {
  const { createRipple } = useRipple();

  useEffect(() => {
    if (orch.ideaBankMode !== 'freestyle') {
      orch.setIdeaBankMode('freestyle');
    }

    if (orch.selectedTemplateForMode) {
      orch.setSelectedTemplateForMode(null);
    }
  }, [orch.ideaBankMode, orch.selectedTemplateForMode, orch.setIdeaBankMode, orch.setSelectedTemplateForMode]);

  const mainPromptVoice = useVoiceInput({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        orch.handlePromptChange(orch.prompt ? orch.prompt + ' ' + text : text);
      }
    },
  });

  return (
    <div className="space-y-6">
      {orch.planContext && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Creating from Weekly Plan - {orch.planContext.dayOfWeek} {orch.planContext.category.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 line-clamp-2">{orch.planContext.briefing}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => orch.clearPlanContext()}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      <Section
        id="products"
        title="Your Products"
        icon={Package}
        isOpen={!orch.collapsedSections.products}
        onToggle={() => orch.toggleSection('products')}
        badge={orch.selectedProducts.length > 0 ? `${orch.selectedProducts.length} selected` : undefined}
      >
        <div className="space-y-4">
          {orch.selectedProducts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {orch.selectedProducts.map((p) => (
                <div key={p.id} className="w-16 h-16 relative group rounded-lg overflow-hidden border border-primary/30">
                  <img src={getProductImageUrl(p.cloudinaryUrl)} alt={p.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => orch.toggleProductSelection(p)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => orch.setSelectedProducts([])}
                className="text-xs text-muted-foreground hover:text-foreground px-2"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={orch.searchQuery}
                onChange={(e) => orch.setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={orch.categoryFilter} onValueChange={orch.setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {orch.categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {orch.filteredProducts.map((product) => {
                const isSelected = orch.selectedProducts.some((p) => p.id === product.id);

                return (
                  <button
                    key={product.id}
                    onClick={(e) => {
                      createRipple(e);
                      orch.toggleProductSelection(product);
                    }}
                    className={cn(
                      'relative rounded-xl overflow-hidden border-2 aspect-square transition-all',
                      isSelected ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-border hover:border-primary/50',
                    )}
                  >
                    <img
                      src={getProductImageUrl(product.cloudinaryUrl)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                      <p className="text-[9px] text-white font-medium truncate">{product.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      <motion.section
        id="prompt"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl border border-border bg-card/50 space-y-6"
      >
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Describe Your Vision
        </h2>

        <AnimatePresence>
          {orch.selectedSuggestion && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-xl bg-primary/10 border-2 border-primary/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Check className="w-4 h-4" />
                  Selected Suggestion
                </div>
                <button
                  onClick={() => {
                    orch.setSelectedSuggestion(null);
                    orch.setPrompt('');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {orch.selectedSuggestion.reasoning && (
                <p className="text-xs text-muted-foreground mt-2">{orch.selectedSuggestion.reasoning}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {orch.cpTemplate && !orch.showCarouselBuilder && !orch.showBeforeAfterBuilder && !orch.showTextOnlyMode && (
          <ContentPlannerGuidance
            template={orch.cpTemplate}
            onStartCarousel={(topic) => {
              orch.setCarouselTopic(topic);
              orch.setShowCarouselBuilder(true);
            }}
            onStartBeforeAfter={(topic) => {
              orch.setBeforeAfterTopic(topic);
              orch.setShowBeforeAfterBuilder(true);
            }}
            onStartTextOnly={(topic) => {
              orch.setTextOnlyTopic(topic);
              orch.setShowTextOnlyMode(true);
            }}
          />
        )}

        {orch.showCarouselBuilder && orch.cpTemplate && (
          <CarouselBuilder
            topic={orch.carouselTopic}
            template={orch.cpTemplate}
            onClose={() => orch.setShowCarouselBuilder(false)}
          />
        )}

        {orch.showBeforeAfterBuilder && orch.cpTemplate && (
          <BeforeAfterBuilder
            topic={orch.beforeAfterTopic}
            template={orch.cpTemplate}
            onClose={() => orch.setShowBeforeAfterBuilder(false)}
          />
        )}

        {orch.showTextOnlyMode && orch.cpTemplate && (
          <TextOnlyMode
            topic={orch.textOnlyTopic}
            template={orch.cpTemplate}
            onClose={() => orch.setShowTextOnlyMode(false)}
          />
        )}

        <div className="space-y-2">
          <div className="relative">
            <Textarea
              id="prompt-textarea"
              value={orch.prompt}
              onChange={(e) => orch.handlePromptChange(e.target.value)}
              placeholder="Describe your ideal ad creative... What mood? What style? What should the image convey?"
              rows={5}
              className={cn(
                'resize-none text-base pr-12',
                orch.selectedSuggestion && 'border-primary/50 ring-2 ring-primary/20',
                mainPromptVoice.isListening && 'border-red-500/50 ring-2 ring-red-500/20',
              )}
            />
            {mainPromptVoice.isSupported && (
              <Button
                variant="ghost"
                size="sm"
                onClick={mainPromptVoice.toggleListening}
                className={cn(
                  'absolute right-2 top-2 h-8 w-8 p-0 rounded-full',
                  mainPromptVoice.isListening && 'bg-red-500/20 text-red-500 animate-pulse',
                )}
                aria-label={mainPromptVoice.isListening ? 'Stop listening' : 'Voice input'}
              >
                {mainPromptVoice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between">
            {mainPromptVoice.isListening && (
              <span className="text-xs text-red-500 animate-pulse">Listening... speak your prompt</span>
            )}
            {orch.prompt && !mainPromptVoice.isListening && (
              <span className="text-xs text-muted-foreground">{orch.prompt.length} characters</span>
            )}
            <span />
          </div>
        </div>

        <ErrorBoundary>
          <IdeaBankPanel
            selectedProducts={orch.selectedProducts}
            tempUploads={orch.tempUploads}
            onSelectPrompt={orch.handleSelectSuggestion}
            onRecipeAvailable={(recipe) => orch.setGenerationRecipe(recipe)}
            onSetPlatform={orch.setPlatform}
            onSetAspectRatio={orch.setAspectRatio}
            onQuickGenerate={(promptText) => {
              orch.setPrompt(promptText);
              setTimeout(orch.handleGenerate, 100);
            }}
            selectedPromptId={orch.selectedSuggestion?.id}
            isGenerating={orch.state === 'generating'}
            mode="freestyle"
          />
        </ErrorBoundary>

        <div className="flex flex-col sm:flex-row flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Platform:</span>
            <Select value={orch.platform} onValueChange={orch.setPlatform}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['LinkedIn', 'Instagram', 'Facebook', 'Twitter', 'TikTok'].map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Size:</span>
            <Select value={orch.aspectRatio} onValueChange={orch.setAspectRatio}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['1200x627', '1200x1200', '1080x1350', '1920x1080', '1080x1920'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Quality:</span>
            <Select value={orch.resolution} onValueChange={orch.setResolution}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['1K', '2K', '4K'].map((q) => (
                  <SelectItem key={q} value={q}>
                    {q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.section>

      {orch.priceEstimate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">$</span>
            <div>
              <p className="text-sm font-medium">
                Estimated cost:{' '}
                <span className="text-green-600 dark:text-green-400">${orch.priceEstimate.estimatedCost.toFixed(3)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {orch.priceEstimate.usedFallback
                  ? 'Based on default rates'
                  : `Based on ${orch.priceEstimate.sampleCount} similar generations`}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div ref={orch.generateButtonRef} id="generate" className="py-4">
        <Button size="lg" onClick={orch.handleGenerate} disabled={!orch.canGenerate} className="w-full h-16 text-lg">
          <Sparkles className="w-5 h-5 mr-2" />
          Generate Image
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-3">
          {orch.selectedProducts.length + orch.tempUploads.length} image
          {orch.selectedProducts.length + orch.tempUploads.length !== 1 ? 's' : ''} - {orch.platform} - {orch.resolution}
        </p>
      </motion.div>
    </div>
  );
});
