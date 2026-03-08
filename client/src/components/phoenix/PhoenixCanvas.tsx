/**
 * PhoenixCanvas — Main canvas area for the Phoenix Studio
 *
 * Wraps the existing ComposerView, GeneratingView, and ResultViewEnhanced
 * into a single component that responds to the Phoenix orchestrator state.
 *
 * The canvas shows:
 * - Product selection grid (when no generation is active)
 * - Generating animation (when orchestrator is running)
 * - Result gallery (when artifacts are available)
 */
import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Package,
  Check,
  Search,
  Loader2,
  ImageIcon,
  Video,
  Sparkles,
  Grid,
  LayoutGrid,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PhoenixArtifact } from '@/hooks/usePhoenixChat';

// ── Types ─────────────────────────────────────────────────

interface ProductItem {
  id: number;
  name: string;
  category?: string;
  primaryImageUrl?: string | null;
  description?: string | null;
}

interface PhoenixCanvasProps {
  products: ProductItem[];
  selectedProductIds: string[];
  onToggleProduct: (id: string) => void;
  artifacts: PhoenixArtifact[];
  isGenerating: boolean;
  currentPhase?: string | null;
  progress?: number;
  className?: string;
  onArtifactClick?: (artifact: PhoenixArtifact) => void;
}

type CanvasView = 'products' | 'results';

// ── Product Card ──────────────────────────────────────────

function ProductCard({
  product,
  isSelected,
  onToggle,
}: {
  product: ProductItem;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'group relative rounded-xl border-2 overflow-hidden transition-all duration-200',
        'hover:shadow-md hover:scale-[1.02]',
        isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/50 bg-card hover:border-border',
      )}
    >
      {/* Image */}
      <div className="aspect-square bg-muted/30 relative overflow-hidden">
        {product.primaryImageUrl ? (
          <img src={product.primaryImageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}

        {/* Selection indicator */}
        <div
          className={cn(
            'absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all',
            isSelected
              ? 'bg-primary text-primary-foreground scale-100'
              : 'bg-background/80 text-muted-foreground scale-90 opacity-0 group-hover:opacity-100',
          )}
        >
          <Check className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Info */}
      <div className="p-2 text-left">
        <p className="text-xs font-medium truncate">{product.name}</p>
        {product.category && <p className="text-[10px] text-muted-foreground truncate">{product.category}</p>}
      </div>
    </button>
  );
}

// ── Artifact Result Card ──────────────────────────────────

function ArtifactResultCard({ artifact, onClick }: { artifact: PhoenixArtifact; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative rounded-xl border border-border/50 overflow-hidden',
        'bg-card hover:shadow-lg hover:scale-[1.01] transition-all duration-200',
        onClick && 'cursor-pointer',
      )}
    >
      {artifact.type === 'image' && artifact.url ? (
        <div className="aspect-square bg-muted/30">
          <img src={artifact.url} alt={artifact.label} className="w-full h-full object-cover" />
        </div>
      ) : artifact.type === 'video' && artifact.url ? (
        <div className="aspect-video bg-black/90 flex items-center justify-center">
          <Video className="w-10 h-10 text-white/60" />
        </div>
      ) : (
        <div className="aspect-square bg-muted/10 flex items-center justify-center p-4">
          <div className="text-center">
            <Sparkles className="w-8 h-8 text-primary/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground line-clamp-4">
              {artifact.content?.slice(0, 200) ?? artifact.label}
            </p>
          </div>
        </div>
      )}

      {/* Label overlay */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <p className="text-[11px] text-white font-medium truncate">{artifact.label}</p>
        <p className="text-[9px] text-white/60 capitalize">{artifact.type}</p>
      </div>
    </button>
  );
}

// ── Generating Overlay ────────────────────────────────────

function GeneratingOverlay({ phase, progress }: { phase?: string | null; progress?: number }) {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div
            className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
            style={{ animationDuration: '1.5s' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
        </div>
        {phase && <p className="text-sm font-medium text-muted-foreground">{phase}</p>}
        {progress !== undefined && progress > 0 && (
          <div className="w-48 mx-auto">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{progress}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Canvas ───────────────────────────────────────────

export function PhoenixCanvas({
  products,
  selectedProductIds,
  onToggleProduct,
  artifacts,
  isGenerating,
  currentPhase,
  progress,
  className,
  onArtifactClick,
}: PhoenixCanvasProps) {
  const [view, setView] = useState<CanvasView>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Auto-switch to results when artifacts arrive
  const effectiveView = artifacts.length > 0 && !isGenerating ? 'results' : view;

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }
    if (categoryFilter) {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }
    return filtered;
  }, [products, searchQuery, categoryFilter]);

  const selectedCount = selectedProductIds.length;

  return (
    <div className={cn('relative flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
          <button
            onClick={() => setView('products')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors',
              effectiveView === 'products'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Grid className="w-3 h-3" />
            Products
            {selectedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                {selectedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setView('results')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors',
              effectiveView === 'results'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutGrid className="w-3 h-3" />
            Results
            {artifacts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                {artifacts.length}
              </span>
            )}
          </button>
        </div>

        {/* Search (products view only) */}
        {effectiveView === 'products' && (
          <>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="h-7 pl-7 text-xs"
              />
            </div>

            {/* Category filter */}
            {categories.length > 1 && (
              <div className="relative">
                <select
                  value={categoryFilter ?? ''}
                  onChange={(e) => setCategoryFilter(e.target.value || null)}
                  className={cn(
                    'h-7 px-2 pr-6 rounded-md border border-border/50 bg-background',
                    'text-xs appearance-none cursor-pointer',
                  )}
                >
                  <option value="">All categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4 relative">
        {/* Generating overlay */}
        {isGenerating && <GeneratingOverlay phase={currentPhase} progress={progress} />}

        {effectiveView === 'products' ? (
          /* Product grid */
          filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSelected={selectedProductIds.includes(String(product.id))}
                  onToggle={() => onToggleProduct(String(product.id))}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Package className="w-12 h-12 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No products match your search' : 'No products available'}
              </p>
            </div>
          )
        ) : /* Results grid */
        artifacts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {artifacts.map((artifact, i) => (
              <ArtifactResultCard
                key={`${artifact.type}-${i}`}
                artifact={artifact}
                onClick={onArtifactClick ? () => onArtifactClick(artifact) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">
              No results yet. Select products and ask Phoenix to generate content.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PhoenixCanvas;
