import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn, getProductImageUrl } from '@/lib/utils';
import { useStudioState } from '@/hooks/useStudioState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Package, Check, X } from 'lucide-react';
import type { Product } from '@shared/schema';
import { typedGet } from '@/lib/typedFetch';
import { ListProductsResponse } from '@shared/contracts/products.contract';

export function ProductsTab() {
  const {
    state: { selectedProducts },
    selectProduct,
    deselectProduct,
    clearProducts,
  } = useStudioState();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Fetch products (typed with Zod contract)
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => typedGet('/api/products', ListProductsResponse) as Promise<Product[]>,
  });

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return ['all', ...Array.from(cats)] as string[];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  // Toggle product selection
  const toggleProduct = (product: Product) => {
    const isSelected = selectedProducts.some((p) => p.id === product.id);
    if (isSelected) {
      deselectProduct(product.id);
    } else if (selectedProducts.length < 6) {
      selectProduct(product);
    }
  };

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Selected Products Preview */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-primary/5 border border-primary/20">
          {selectedProducts.map((product) => (
            <div
              key={product.id}
              className="relative group w-10 h-10 rounded-md overflow-hidden border-2 border-primary"
            >
              <img
                src={getProductImageUrl(product.cloudinaryUrl)}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => deselectProduct(product.id)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={clearProducts} className="h-10 text-xs text-muted-foreground">
            Clear
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-24 h-8 text-xs">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-xs">
                {cat === 'all' ? 'All' : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <div className="grid grid-cols-3 gap-2">
          {filteredProducts.map((product) => {
            const isSelected = selectedProducts.some((p) => p.id === product.id);
            return (
              <button
                key={product.id}
                onClick={() => toggleProduct(product)}
                disabled={!isSelected && selectedProducts.length >= 6}
                className={cn(
                  'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                  isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50',
                  !isSelected && selectedProducts.length >= 6 && 'opacity-50',
                )}
              >
                <img
                  src={getProductImageUrl(product.cloudinaryUrl)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                  <p className="text-white text-[10px] truncate">{product.name}</p>
                </div>
              </button>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No products found</p>
          </div>
        )}
      </div>

      {/* Selection count */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
        {selectedProducts.length}/6 products selected
      </div>
    </div>
  );
}
