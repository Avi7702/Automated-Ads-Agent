/**
 * useStudioProducts — Product selection, filtering, and queries
 */
import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { typedGet } from '@/lib/typedFetch';
import { ListProductsResponse } from '@shared/contracts/products.contract';
import type { Product, AdSceneTemplate, PerformingAdTemplate } from './types';

function normalizeProduct(product: ListProductsResponse[number]): Product {
  return {
    ...product,
    cloudinaryUrl: product.cloudinaryUrl ?? '',
    cloudinaryPublicId: product.cloudinaryPublicId ?? '',
    category: product.category ?? null,
    description: product.description ?? null,
    features: product.features ?? null,
    benefits: product.benefits ?? null,
    specifications: product.specifications ?? null,
    tags: product.tags ?? [],
    sku: product.sku ?? null,
    enrichmentStatus: product.enrichmentStatus ?? null,
    enrichmentDraft: product.enrichmentDraft ?? null,
    enrichmentVerifiedAt:
      product.enrichmentVerifiedAt == null
        ? null
        : product.enrichmentVerifiedAt instanceof Date
          ? product.enrichmentVerifiedAt
          : new Date(product.enrichmentVerifiedAt),
    enrichmentSource: product.enrichmentSource ?? null,
    createdAt: product.createdAt instanceof Date ? product.createdAt : new Date(product.createdAt),
  };
}

export function useStudioProducts() {
  // ── Selection State ───────────────────────────────────
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AdSceneTemplate | null>(null);
  const [templateCategory, setTemplateCategory] = useState('all');

  // ── Filter State ──────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // ── Template Inspiration ──────────────────────────────
  const [showTemplateInspiration, setShowTemplateInspiration] = useState(false);
  const [selectedPerformingTemplate, setSelectedPerformingTemplate] = useState<PerformingAdTemplate | null>(null);

  // ── Queries ───────────────────────────────────────────
  const { data: authUser } = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      const data = await typedGet('/api/products', ListProductsResponse);
      return (Array.isArray(data) ? data : []).map(normalizeProduct);
    },
  });

  const { data: templates = [] } = useQuery<AdSceneTemplate[]>({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/templates');
      if (!res.ok) return [];
      const data = await res.json();
      return data.templates || [];
    },
  });

  const { data: featuredAdTemplates = [], isLoading: isLoadingFeatured } = useQuery<PerformingAdTemplate[]>({
    queryKey: ['performing-ad-templates-featured'],
    queryFn: async () => {
      const res = await fetch('/api/performing-ad-templates/featured', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showTemplateInspiration,
  });

  // ── Derived State ─────────────────────────────────────
  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch = (product.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
        return matchesSearch && matchesCategory;
      }),
    [products, searchQuery, categoryFilter],
  );

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(products.map((p) => p.category).filter((c): c is string => !!c)))],
    [products],
  );

  // ── Handlers ──────────────────────────────────────────
  const toggleProductSelection = useCallback((product: Product) => {
    setSelectedProducts((prev) => {
      const isSelected = prev.some((p) => p.id === product.id);
      if (isSelected) return prev.filter((p) => p.id !== product.id);
      if (prev.length >= 6) return prev;
      return [...prev, product];
    });
  }, []);

  return {
    // State
    selectedProducts,
    selectedTemplate,
    templateCategory,
    searchQuery,
    categoryFilter,
    showTemplateInspiration,
    selectedPerformingTemplate,

    // Data
    authUser,
    products,
    templates,
    featuredAdTemplates,
    isLoadingFeatured,
    filteredProducts,
    categories,

    // Setters
    setSelectedProducts,
    setSelectedTemplate,
    setTemplateCategory,
    setSearchQuery,
    setCategoryFilter,
    setShowTemplateInspiration,
    setSelectedPerformingTemplate,

    // Handlers
    toggleProductSelection,
  };
}
