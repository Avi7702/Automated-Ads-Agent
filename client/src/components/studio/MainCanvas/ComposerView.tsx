// @ts-nocheck
/**
 * ComposerView — Studio idle state center panel
 *
 * Contains: Quick start, path selection, uploads, products, templates,
 * prompt/IdeaBank, output settings, price estimate, and generate button.
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, getProductImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IdeaBankPanel } from '@/components/IdeaBankPanel';
import { TemplateLibrary } from '@/components/TemplateLibrary';
import { UploadZone } from '@/components/UploadZone';
import { ContentPlannerGuidance } from '@/components/ContentPlannerGuidance';
import { CarouselBuilder } from '@/components/CarouselBuilder';
import { BeforeAfterBuilder } from '@/components/BeforeAfterBuilder';
import { TextOnlyMode } from '@/components/TextOnlyMode';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StyleReferenceSelector } from '@/components/studio/StyleReferenceSelector';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Search,
  Package,
  Zap,
  TrendingUp,
  Wand2,
  FileImage,
  Palette,
} from 'lucide-react';
import { useRipple } from '@/hooks/useRipple';
import type { StudioOrchestrator } from '@/hooks/useStudioOrchestrator';

/** Collapsible section wrapper */
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
  icon?: any;
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
  orch: StudioOrchestrator;
}

export const ComposerView = memo(function ComposerView({ orch }: ComposerViewProps) {
  const { createRipple } = useRipple();

  return (
    <div className="space-y-6">
      {/* Quick Start */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Quick Start</h3>
          <span className="text-xs text-muted-foreground">Skip the setup</span>
        </div>
        <div className="flex flex-col gap-3">
          <Textarea
            id="prompt-textarea"
            value={orch.quickStartPrompt}
            onChange={(e) => orch.setQuickStartPrompt(e.target.value)}
            placeholder="Describe what you want to create..."
            className="flex-1 min-h-[100px] resize-none text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (orch.quickStartPrompt.trim()) orch.handleGenerate();
              }
            }}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Press Enter to generate, Shift+Enter for new line</span>
            <Button onClick={orch.handleGenerate} disabled={!orch.quickStartPrompt.trim()}>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Now
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Path Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-4"
      >
        <h3 className="text-sm font-medium text-muted-foreground">Choose Your Path</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => orch.setIdeaBankMode('freestyle')}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition-all',
              orch.ideaBankMode === 'freestyle'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50',
            )}
          >
            <Wand2 className="w-5 h-5 text-primary mb-2" />
            <p className="font-medium text-sm">Freestyle</p>
            <p className="text-xs text-muted-foreground mt-1">Describe freely, AI interprets</p>
          </button>
          <button
            onClick={() => orch.setIdeaBankMode('template')}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition-all',
              orch.ideaBankMode === 'template'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50',
            )}
          >
            <FileImage className="w-5 h-5 text-primary mb-2" />
            <p className="font-medium text-sm">Use Template</p>
            <p className="text-xs text-muted-foreground mt-1">Pick a proven ad format</p>
          </button>
        </div>

        {orch.ideaBankMode === 'template' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4 rounded-xl border border-border"
          >
            <TemplateLibrary onSelectTemplate={(template) => orch.setSelectedTemplateForMode(template)} />
          </motion.div>
        )}
      </motion.div>

      {/* Upload Section */}
      <Section
        id="upload"
        title="Upload Images"
        icon={Package}
        isOpen={!orch.collapsedSections.upload}
        onToggle={() => orch.toggleSection('upload')}
        badge={
          orch.tempUploads.length > 0
            ? `${orch.tempUploads.length} file${orch.tempUploads.length > 1 ? 's' : ''}`
            : undefined
        }
      >
        <UploadZone
          uploads={orch.tempUploads}
          onUploadsChange={orch.setTempUploads}
          maxFiles={6 - orch.selectedProducts.length}
        />
      </Section>

      {/* Products Section */}
      <Section
        id="products"
        title="Your Products"
        icon={Package}
        isOpen={!orch.collapsedSections.products}
        onToggle={() => orch.toggleSection('products')}
        badge={orch.selectedProducts.length > 0 ? `${orch.selectedProducts.length} selected` : undefined}
      >
        <div className="space-y-4">
          {/* Selected Products Preview */}
          {orch.selectedProducts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {orch.selectedProducts.map((p) => (
                <div
                  key={p.id}
                  className="w-16 h-16 relative group rounded-lg overflow-hidden border border-primary/30"
                >
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

          {/* Search & Filter */}
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

          {/* Product Grid */}
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

      {/* Templates Section */}
      <Section
        id="templates"
        title="Style & Template"
        isOpen={!orch.collapsedSections.templates}
        onToggle={() => orch.toggleSection('templates')}
        badge={orch.selectedTemplate ? '1 selected' : undefined}
      >
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {['all', ...Array.from(new Set(orch.templates.map((t) => t.category).filter(Boolean)))].map((cat) => (
              <Button
                key={cat}
                variant={orch.templateCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => orch.setTemplateCategory(cat)}
              >
                {cat === 'all' ? 'All' : cat}
              </Button>
            ))}
          </div>

          {/* Template Scroll */}
          <div className="flex gap-4 overflow-x-auto pb-2">
            {orch.templates
              .filter((t) => orch.templateCategory === 'all' || t.category === orch.templateCategory)
              .map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    if (orch.selectedTemplate?.id === template.id) {
                      orch.setSelectedTemplate(null);
                    } else {
                      orch.setSelectedTemplate(template);
                      orch.setPrompt(template.promptBlueprint);
                    }
                  }}
                  className={cn(
                    'flex-shrink-0 p-4 rounded-xl border-2 min-w-[200px] text-left transition-all',
                    orch.selectedTemplate?.id === template.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-primary">{template.category}</span>
                    {orch.selectedTemplate?.id === template.id && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-sm font-medium">{template.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{template.description}</p>
                </button>
              ))}
          </div>

          {/* Selected Template Badge */}
          {orch.selectedTemplate && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm">
                Using: <strong>{orch.selectedTemplate.title}</strong>
              </span>
              <Button variant="ghost" size="sm" onClick={() => orch.setSelectedTemplate(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Template Inspiration */}
          <div className="pt-4 border-t border-border/50">
            <button
              onClick={() => orch.setShowTemplateInspiration(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Template Inspiration
              {orch.featuredAdTemplates.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {orch.featuredAdTemplates.length} featured
                </Badge>
              )}
            </button>
          </div>
        </div>
      </Section>

      {/* Prompt Section */}
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

        {/* Selected Suggestion Card */}
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

        {/* Content Planner Guidance */}
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

        {/* Builders */}
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

        {/* Main Prompt Textarea */}
        <div className="space-y-2">
          <Textarea
            id="prompt-textarea"
            value={orch.prompt}
            onChange={(e) => orch.handlePromptChange(e.target.value)}
            placeholder="Describe your ideal ad creative... What mood? What style? What should the image convey?"
            rows={5}
            className={cn(
              'resize-none text-base',
              orch.selectedSuggestion && 'border-primary/50 ring-2 ring-primary/20',
            )}
          />
          {orch.prompt && <p className="text-xs text-muted-foreground text-right">{orch.prompt.length} characters</p>}
        </div>

        {/* Idea Bank */}
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
            mode={orch.ideaBankMode}
            templateId={orch.selectedTemplateForMode?.id}
          />
        </ErrorBoundary>

        {/* Platform, Size, Quality */}
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

      {/* Style References */}
      <Section
        id="style-refs"
        title="Style Reference"
        icon={Palette}
        isOpen={!orch.collapsedSections.includes('style-refs')}
        onToggle={() => orch.toggleSection('style-refs')}
        badge={orch.selectedStyleRefIds.length > 0 ? `${orch.selectedStyleRefIds.length}` : undefined}
      >
        <StyleReferenceSelector
          selectedIds={orch.selectedStyleRefIds}
          onSelectionChange={orch.setSelectedStyleRefIds}
        />
      </Section>

      {/* Price Estimate */}
      {orch.priceEstimate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">💲</span>
            <div>
              <p className="text-sm font-medium">
                Estimated cost:{' '}
                <span className="text-green-600 dark:text-green-400">
                  ${orch.priceEstimate.estimatedCost.toFixed(3)}
                </span>
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

      {/* Generate Button */}
      <motion.div ref={orch.generateButtonRef} id="generate" className="py-4">
        <Button size="lg" onClick={orch.handleGenerate} disabled={!orch.canGenerate} className="w-full h-16 text-lg">
          <Sparkles className="w-5 h-5 mr-2" />
          Generate Image
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-3">
          {orch.selectedProducts.length + orch.tempUploads.length} image
          {orch.selectedProducts.length + orch.tempUploads.length !== 1 ? 's' : ''} • {orch.platform} •{' '}
          {orch.resolution}
        </p>
      </motion.div>
    </div>
  );
});
