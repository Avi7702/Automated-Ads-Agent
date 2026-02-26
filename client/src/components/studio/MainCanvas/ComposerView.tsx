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
import { Sparkles, ChevronDown, ChevronUp, Check, X, Search, Package, Mic, MicOff, Bot, Loader2 } from 'lucide-react';
import { useRipple } from '@/hooks/useRipple';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useStudioState } from '@/hooks/useStudioState';
import type { IdeaBankContextSnapshot } from '@/components/ideabank/types';
import type { Product } from '@shared/schema';

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
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-colors"
      >
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
  ideaBankContext?: IdeaBankContextSnapshot | null;
  ideaBankBridgeState?: 'idle' | 'waiting' | 'ready' | 'error' | 'sent';
  onIdeaBankContextChange?: (context: IdeaBankContextSnapshot) => void;
  onSendIdeasToAgent?: () => void;
  handlePromptChange: (value: string) => void;
  handleSelectSuggestion: (prompt: string, id: string, reasoning?: string) => void;
  handleGenerate: () => void;
  toggleProductSelection: (product: Product) => void;
  filteredProducts: Product[];
  categories: string[];
  generateButtonRef: React.RefObject<HTMLDivElement | null>;
}

export const ComposerView = memo(function ComposerView({
  ideaBankContext = null,
  ideaBankBridgeState = 'idle',
  onIdeaBankContextChange,
  onSendIdeasToAgent,
  handlePromptChange,
  handleSelectSuggestion,
  handleGenerate,
  toggleProductSelection,
  filteredProducts,
  categories,
  generateButtonRef,
}: ComposerViewProps) {
  const {
    state,
    setIdeaBankMode,
    setTemplateForMode,
    setPrompt,
    clearPlanContext,
    toggleSection,
    setProducts,
    setSearchQuery,
    setCategoryFilter,
    setSuggestion,
    setCarouselTopic,
    setShowCarouselBuilder,
    setBeforeAfterTopic,
    setShowBeforeAfterBuilder,
    setTextOnlyTopic,
    setShowTextOnlyMode,
    setPlatform,
    setAspectRatio,
    setResolution,
    setRecipe,
    canGenerate,
  } = useStudioState();
  const { createRipple } = useRipple();

  useEffect(() => {
    if (state.ideaBankMode !== 'freestyle') {
      setIdeaBankMode('freestyle');
    }

    if (state.selectedTemplateForMode) {
      setTemplateForMode(null);
    }
  }, [state.ideaBankMode, state.selectedTemplateForMode, setIdeaBankMode, setTemplateForMode]);

  const mainPromptVoice = useVoiceInput({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        handlePromptChange(state.prompt ? state.prompt + ' ' + text : text);
      }
    },
  });

  return (
    <div className="space-y-6">
      {state.planContext && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Creating from Weekly Plan - {state.planContext.dayOfWeek} {state.planContext.category.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 line-clamp-2">{state.planContext.briefing}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => clearPlanContext()}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      <Section
        id="products"
        title="Your Products"
        icon={Package}
        isOpen={!state.collapsedSections.products}
        onToggle={() => toggleSection('products')}
        badge={state.selectedProducts.length > 0 ? `${state.selectedProducts.length} selected` : undefined}
      >
        <div className="space-y-4">
          {state.selectedProducts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {state.selectedProducts.map((p) => (
                <div
                  key={p.id}
                  className="w-16 h-16 relative group rounded-lg overflow-hidden border border-primary/30"
                >
                  <img src={getProductImageUrl(p.cloudinaryUrl)} alt={p.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => toggleProductSelection(p)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setProducts([])}
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
                value={state.searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={state.categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {filteredProducts.map((product) => {
                const isSelected = state.selectedProducts.some((p) => p.id === product.id);

                return (
                  <button
                    key={product.id}
                    onClick={(e) => {
                      createRipple(e);
                      toggleProductSelection(product);
                    }}
                    className={cn(
                      'relative rounded-xl overflow-hidden border-2 aspect-square transition-all',
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 scale-105'
                        : 'border-border hover:border-primary/50',
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
          {state.selectedSuggestion && (
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
                    setSuggestion(null);
                    setPrompt('');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {state.selectedSuggestion.reasoning && (
                <p className="text-xs text-muted-foreground mt-2">{state.selectedSuggestion.reasoning}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {state.cpTemplate && !state.showCarouselBuilder && !state.showBeforeAfterBuilder && !state.showTextOnlyMode && (
          <ContentPlannerGuidance
            template={state.cpTemplate}
            onStartCarousel={(topic) => {
              setCarouselTopic(topic);
              setShowCarouselBuilder(true);
            }}
            onStartBeforeAfter={(topic) => {
              setBeforeAfterTopic(topic);
              setShowBeforeAfterBuilder(true);
            }}
            onStartTextOnly={(topic) => {
              setTextOnlyTopic(topic);
              setShowTextOnlyMode(true);
            }}
          />
        )}

        {state.showCarouselBuilder && state.cpTemplate && (
          <CarouselBuilder
            topic={state.carouselTopic}
            template={state.cpTemplate}
            onClose={() => setShowCarouselBuilder(false)}
          />
        )}

        {state.showBeforeAfterBuilder && state.cpTemplate && (
          <BeforeAfterBuilder
            topic={state.beforeAfterTopic}
            template={state.cpTemplate}
            onClose={() => setShowBeforeAfterBuilder(false)}
          />
        )}

        {state.showTextOnlyMode && state.cpTemplate && (
          <TextOnlyMode
            topic={state.textOnlyTopic}
            template={state.cpTemplate}
            onClose={() => setShowTextOnlyMode(false)}
          />
        )}

        <div className="space-y-2">
          <div className="relative">
            <Textarea
              id="prompt-textarea"
              value={state.prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="Describe your ideal ad creative... What mood? What style? What should the image convey?"
              rows={5}
              className={cn(
                'resize-none text-base pr-12',
                state.selectedSuggestion && 'border-primary/50 ring-2 ring-primary/20',
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
            {state.prompt && !mainPromptVoice.isListening && (
              <span className="text-xs text-muted-foreground">{state.prompt.length} characters</span>
            )}
            <span />
          </div>
        </div>

        <ErrorBoundary>
          <IdeaBankPanel
            selectedProducts={state.selectedProducts}
            tempUploads={state.tempUploads}
            onSelectPrompt={handleSelectSuggestion}
            onContextChange={onIdeaBankContextChange}
            onRecipeAvailable={(recipe) => setRecipe(recipe)}
            onSetPlatform={setPlatform}
            onSetAspectRatio={setAspectRatio}
            onQuickGenerate={(promptText) => {
              setPrompt(promptText);
              setTimeout(handleGenerate, 100);
            }}
            selectedPromptId={state.selectedSuggestion?.id}
            isGenerating={state.generationState === 'generating'}
            mode="freestyle"
          />
        </ErrorBoundary>

        {(ideaBankContext || onSendIdeasToAgent) && (
          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  Agent + Idea Bank sync
                </p>
                {ideaBankBridgeState === 'waiting' && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Waiting for Idea Bank suggestions. They will be sent to the agent when ready.
                  </p>
                )}
                {ideaBankBridgeState !== 'waiting' && ideaBankContext?.status === 'ready' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {ideaBankContext.suggestionCount} idea
                    {ideaBankContext.suggestionCount === 1 ? '' : 's'} ready. Send them to the agent for planning.
                  </p>
                )}
                {ideaBankBridgeState === 'sent' && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">Ideas sent to agent chat.</p>
                )}
                {(ideaBankBridgeState === 'error' || ideaBankContext?.status === 'error') && (
                  <p className="text-xs text-red-500 mt-1">{ideaBankContext?.error || 'Failed to load ideas.'}</p>
                )}
                {ideaBankBridgeState === 'idle' &&
                  (!ideaBankContext || ideaBankContext.status === 'idle' || ideaBankContext.suggestionCount === 0) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Select products or uploads to generate ideas first.
                    </p>
                  )}
              </div>

              {onSendIdeasToAgent && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onSendIdeasToAgent}
                  disabled={ideaBankBridgeState === 'waiting'}
                  className="sm:shrink-0"
                >
                  {ideaBankBridgeState === 'waiting' ? 'Waiting for ideas...' : 'Send Ideas To Agent'}
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Platform:</span>
            <Select value={state.platform} onValueChange={setPlatform}>
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
            <Select value={state.aspectRatio} onValueChange={setAspectRatio}>
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
            <Select value={state.resolution} onValueChange={setResolution}>
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

      {state.priceEstimate && (
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
                <span className="text-green-600 dark:text-green-400">
                  ${state.priceEstimate.estimatedCost.toFixed(3)}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {state.priceEstimate.usedFallback
                  ? 'Based on default rates'
                  : `Based on ${state.priceEstimate.sampleCount} similar generations`}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div ref={generateButtonRef} id="generate" className="py-4">
        <Button size="lg" onClick={handleGenerate} disabled={!canGenerate} className="w-full h-16 text-lg">
          <Sparkles className="w-5 h-5 mr-2" />
          Generate Image
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-3">
          {state.selectedProducts.length + state.tempUploads.length} image
          {state.selectedProducts.length + state.tempUploads.length !== 1 ? 's' : ''} - {state.platform} -{' '}
          {state.resolution}
        </p>
      </motion.div>
    </div>
  );
});
