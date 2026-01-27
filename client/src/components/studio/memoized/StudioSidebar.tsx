import React, { memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  Package,
  Check,
  X,
  TrendingUp,
  Star,
  Layout,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { UploadZone } from '@/components/UploadZone';
import { getProductImageUrl } from '@/lib/utils';
import type { Product, AdSceneTemplate, PerformingAdTemplate } from '@shared/schema';
import type { AnalyzedUpload } from '@/types/analyzedUpload';
import { useHaptic } from '@/hooks/useHaptic';
import { useRipple } from '@/hooks/useRipple';

// Collapsed sections state interface
interface CollapsedSections {
  upload: boolean;
  products: boolean;
  templates: boolean;
  refine: boolean;
  copy: boolean;
  preview: boolean;
}

// Section wrapper component - memoized separately
interface SectionProps {
  id: string;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

const Section = memo(function SectionComponent({
  id,
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
  className,
}: SectionProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <motion.section
        id={id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-2xl overflow-hidden transition-all duration-300',
          isOpen ? 'neomorph shadow-layered' : 'border border-border/50 shadow-sm',
          'bg-gradient-to-br from-card via-card to-card/50',
          'hover:shadow-xl hover:border-primary/20',
          className
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="text-left">
              <h2 className="text-lg font-medium">{title}</h2>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-6 pb-6">{children}</div>
        </CollapsibleContent>
      </motion.section>
    </Collapsible>
  );
});

// Product grid item - memoized for individual items
interface ProductGridItemProps {
  product: Product;
  isSelected: boolean;
  isFeatured: boolean;
  isWide: boolean;
  maxReached: boolean;
  onToggle: (product: Product) => void;
}

const ProductGridItem = memo(function ProductGridItemComponent({
  product,
  isSelected,
  isFeatured,
  isWide,
  maxReached,
  onToggle,
}: ProductGridItemProps) {
  const { haptic } = useHaptic();
  const { createRipple } = useRipple();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      createRipple(e);
      haptic('light');
      onToggle(product);
    },
    [createRipple, haptic, onToggle, product]
  );

  return (
    <button
      onClick={handleClick}
      disabled={!isSelected && maxReached}
      className={cn(
        'card-interactive relative rounded-xl overflow-hidden border-2 transition-all group',
        // Bento grid sizing
        isFeatured && 'col-span-2 row-span-2',
        isWide && !isFeatured && 'col-span-3',
        !isFeatured && !isWide && 'col-span-1',
        // Selection states
        isSelected
          ? 'border-primary ring-2 ring-primary/20 scale-105'
          : 'border-border hover:border-primary/50 hover:scale-102',
        !isSelected && maxReached && 'opacity-50'
      )}
    >
      <img
        src={getProductImageUrl(product.cloudinaryUrl)}
        alt={product.name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        loading="lazy"
      />

      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium truncate">
          {product.name}
        </p>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary shadow-lg flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}
    </button>
  );
});

// Selected products preview - memoized
interface SelectedProductsPreviewProps {
  selectedProducts: Product[];
  onRemove: (product: Product) => void;
  onClearAll: () => void;
}

const SelectedProductsPreview = memo(function SelectedProductsPreviewComponent({
  selectedProducts,
  onRemove,
  onClearAll,
}: SelectedProductsPreviewProps) {
  if (selectedProducts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
      {selectedProducts.map((product) => (
        <div
          key={product.id}
          className="relative group w-16 h-16 rounded-lg overflow-hidden border-2 border-primary"
        >
          <img
            src={getProductImageUrl(product.cloudinaryUrl)}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <button
            onClick={() => onRemove(product)}
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ))}
      <button
        onClick={onClearAll}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
});

// Template item - memoized
interface TemplateItemProps {
  template: AdSceneTemplate;
  isSelected: boolean;
  onSelect: (template: AdSceneTemplate | null) => void;
  onPromptFill: (prompt: string) => void;
}

const TemplateItem = memo(function TemplateItemComponent({
  template,
  isSelected,
  onSelect,
  onPromptFill,
}: TemplateItemProps) {
  const handleClick = useCallback(() => {
    if (isSelected) {
      onSelect(null);
    } else {
      onSelect(template);
      onPromptFill(template.promptBlueprint);
    }
  }, [isSelected, onSelect, template, onPromptFill]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex-shrink-0 p-4 rounded-xl border-2 transition-all text-left min-w-[200px] max-w-[220px] snap-start touch-manipulation',
        isSelected
          ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50 bg-card/50 active:scale-[0.98]'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-primary truncate">
          {template.category || 'General'}
        </span>
        {isSelected && <Check className="w-4 h-4 text-primary" />}
      </div>
      <p className="text-sm font-medium truncate">{template.title}</p>
      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
        {template.description || template.promptBlueprint}
      </p>
      {template.tags && template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {template.tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
});

// Main StudioSidebar props
interface StudioSidebarProps {
  // Products
  products: Product[];
  selectedProducts: Product[];
  onProductToggle: (product: Product) => void;
  onProductsClear: () => void;

  // Filters
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  categories: string[];

  // Uploads
  tempUploads: AnalyzedUpload[];
  onUploadsChange: (uploads: AnalyzedUpload[]) => void;

  // Templates
  templates: AdSceneTemplate[];
  selectedTemplate: AdSceneTemplate | null;
  onTemplateSelect: (template: AdSceneTemplate | null) => void;
  templateCategory: string;
  onTemplateCategoryChange: (category: string) => void;
  onPromptFill: (prompt: string) => void;

  // Template Inspiration
  featuredAdTemplates: PerformingAdTemplate[];
  selectedPerformingTemplate: PerformingAdTemplate | null;
  onShowTemplateInspiration: () => void;
  onClearPerformingTemplate: () => void;

  // Collapsed sections
  collapsedSections: CollapsedSections;
  onToggleSection: (section: keyof CollapsedSections) => void;
}

/**
 * StudioSidebar - Left column with upload, products, and templates sections
 *
 * Memoized to prevent re-renders when:
 * - Generation state changes (idle/generating/result)
 * - Prompt changes
 * - Preview panel state changes
 *
 * Uses individual memoized sub-components for:
 * - Section wrappers
 * - Product grid items
 * - Template items
 */
function StudioSidebarComponent({
  products,
  selectedProducts,
  onProductToggle,
  onProductsClear,
  searchQuery,
  onSearchQueryChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  tempUploads,
  onUploadsChange,
  templates,
  selectedTemplate,
  onTemplateSelect,
  templateCategory,
  onTemplateCategoryChange,
  onPromptFill,
  featuredAdTemplates,
  selectedPerformingTemplate,
  onShowTemplateInspiration,
  onClearPerformingTemplate,
  collapsedSections,
  onToggleSection,
}: StudioSidebarProps) {
  // Memoize filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === 'all' || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  // Memoize filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(
      (t) => templateCategory === 'all' || t.category === templateCategory
    );
  }, [templates, templateCategory]);

  // Memoize template categories
  const templateCategories = useMemo(() => {
    return ['all', ...Array.from(new Set(templates.map((t) => t.category).filter(Boolean)))];
  }, [templates]);

  // Memoize selected product IDs for quick lookup
  const selectedProductIds = useMemo(
    () => new Set(selectedProducts.map((p) => p.id)),
    [selectedProducts]
  );

  const maxProductsReached = selectedProducts.length >= 6;

  // Toggle section callbacks
  const handleToggleUpload = useCallback(() => onToggleSection('upload'), [onToggleSection]);
  const handleToggleProducts = useCallback(() => onToggleSection('products'), [onToggleSection]);
  const handleToggleTemplates = useCallback(() => onToggleSection('templates'), [onToggleSection]);

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <Section
        id="upload"
        title="Upload Images"
        subtitle="One-time use (not saved to catalog)"
        isOpen={!collapsedSections.upload}
        onToggle={handleToggleUpload}
      >
        <UploadZone
          uploads={tempUploads}
          onUploadsChange={onUploadsChange}
          maxFiles={6 - selectedProducts.length}
          disabled={selectedProducts.length + tempUploads.length >= 6}
        />
      </Section>

      {/* Products Section */}
      <Section
        id="products"
        title="Your Products"
        subtitle={`Select up to 6 products (${selectedProducts.length} selected)`}
        isOpen={!collapsedSections.products}
        onToggle={handleToggleProducts}
      >
        <div className="space-y-4">
          {/* Selected Products Preview */}
          <SelectedProductsPreview
            selectedProducts={selectedProducts}
            onRemove={onProductToggle}
            onClearAll={onProductsClear}
          />

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
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

          {/* Product Grid */}
          <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border/50 p-2">
            <div className="grid grid-cols-6 gap-2 sm:gap-3 auto-rows-[80px]">
              {filteredProducts.map((product, index) => (
                <ProductGridItem
                  key={product.id}
                  product={product}
                  isSelected={selectedProductIds.has(product.id)}
                  isFeatured={index === 0}
                  isWide={(index + 1) % 7 === 0}
                  maxReached={maxProductsReached}
                  onToggle={onProductToggle}
                />
              ))}
            </div>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No products found</p>
            </div>
          )}
        </div>
      </Section>

      {/* Templates Section */}
      <Section
        id="templates"
        title="Style & Template"
        subtitle={
          selectedTemplate
            ? `Selected: ${selectedTemplate.title}`
            : 'Choose a starting point (optional)'
        }
        isOpen={!collapsedSections.templates}
        onToggle={handleToggleTemplates}
      >
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {templateCategories.map((cat) => (
              <Button
                key={cat}
                variant={templateCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => onTemplateCategoryChange(cat)}
              >
                {cat === 'all' ? 'All' : cat}
              </Button>
            ))}
          </div>

          {/* Templates Horizontal Scroll */}
          {templates.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-3 px-1 -mx-1 snap-x snap-mandatory scroll-smooth touch-pan-x">
              {filteredTemplates.map((template) => (
                <TemplateItem
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplate?.id === template.id}
                  onSelect={onTemplateSelect}
                  onPromptFill={onPromptFill}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No templates available. Add templates in the admin section.
            </p>
          )}

          {selectedTemplate && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm">
                  Using template: <strong>{selectedTemplate.title}</strong>
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onTemplateSelect(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Template Inspiration */}
          <div className="pt-4 border-t border-border/50">
            <button
              onClick={onShowTemplateInspiration}
              className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/20 dark:from-yellow-500/30 to-orange-500/20 dark:to-orange-500/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium flex items-center gap-2">
                    Template Inspiration
                    {featuredAdTemplates.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {featuredAdTemplates.length} featured
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Browse high-performing ad templates for style ideas
                  </p>
                </div>
                <Star className="w-5 h-5 text-muted-foreground group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors" />
              </div>
            </button>

            {/* Show selected performing template */}
            {selectedPerformingTemplate && (
              <div className="mt-3 flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 dark:bg-yellow-500/20 border border-yellow-500/20 dark:border-yellow-500/30">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm">
                    Inspired by: <strong>{selectedPerformingTemplate.name}</strong>
                  </span>
                  {selectedPerformingTemplate.engagementTier &&
                    selectedPerformingTemplate.engagementTier !== 'unranked' && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 dark:border-yellow-500/20"
                      >
                        {selectedPerformingTemplate.engagementTier.replace('-', ' ')}
                      </Badge>
                    )}
                </div>
                <Button variant="ghost" size="sm" onClick={onClearPerformingTemplate}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Select a template to pre-fill your prompt, or skip and describe your vision below.
          </p>
        </div>
      </Section>
    </div>
  );
}

export const StudioSidebar = memo(StudioSidebarComponent);

StudioSidebar.displayName = 'StudioSidebar';
