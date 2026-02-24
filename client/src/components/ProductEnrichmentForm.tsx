import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Check,
  AlertCircle,
  Eye,
  Globe,
  Database,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  Tag,
  FileText,
  Wrench,
  List,
  Link2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn, getProductImageUrl } from '@/lib/utils';
import type { Product } from '@shared/schema';

interface EnrichmentDraft {
  description: string;
  features: Record<string, string | string[]>;
  benefits: string[];
  specifications: Record<string, string>;
  tags: string[];
  installation?: {
    methods: string[];
    difficulty: string;
    requiredAccessories: string[];
    tips: string[];
  };
  relatedProductTypes?: string[];
  confidence: number;
  sources: Array<{
    type: 'vision' | 'web_search' | 'kb' | 'url';
    detail: string;
  }>;
  generatedAt: string;
}

interface EnrichmentStatus {
  productId: string;
  status: 'pending' | 'draft' | 'verified' | 'complete';
  draft: EnrichmentDraft | null;
  verifiedAt: string | null;
  source: string | null;
  completeness: {
    percentage: number;
    missing: string[];
  };
  isReady: boolean;
}

interface ProductEnrichmentFormProps {
  product: Product;
  onComplete?: () => void;
  className?: string;
}

// Source badge component
function SourceBadge({ source }: { source: EnrichmentDraft['sources'][0] }) {
  const iconMap: Record<string, typeof Eye> = {
    vision: Eye,
    web_search: Globe,
    kb: Database,
    url: Link2,
  };
  const Icon = iconMap[source.type] || Globe;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-full text-xs">
      <Icon className="w-3 h-3" />
      <span className="capitalize">{source.type.replace('_', ' ')}</span>
    </div>
  );
}

// Completeness indicator
function CompletenessIndicator({ completeness }: { completeness: EnrichmentStatus['completeness'] }) {
  const getColor = (pct: number) => {
    if (pct >= 75) return 'bg-green-500 dark:bg-green-600';
    if (pct >= 50) return 'bg-yellow-500 dark:bg-yellow-600';
    return 'bg-red-500 dark:bg-red-600';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Profile Completeness</span>
        <span className="font-medium">{completeness.percentage}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', getColor(completeness.percentage))}
          initial={{ width: 0 }}
          animate={{ width: `${completeness.percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      {completeness.missing.length > 0 && (
        <p className="text-xs text-muted-foreground">Missing: {completeness.missing.join(', ')}</p>
      )}
    </div>
  );
}

export function ProductEnrichmentForm({ product, onComplete, className }: ProductEnrichmentFormProps) {
  const [enrichmentStatus, setEnrichmentStatus] = useState<EnrichmentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // URL enrichment state
  const [productUrl, setProductUrl] = useState('');

  // Editable form state
  const [formData, setFormData] = useState({
    description: '',
    features: {} as Record<string, string>,
    benefits: [] as string[],
    tags: [] as string[],
    sku: '',
  });
  const [newBenefit, setNewBenefit] = useState('');
  const [newTag, setNewTag] = useState('');

  // Fetch current enrichment status
  useEffect(() => {
    fetchEnrichmentStatus();
  }, [fetchEnrichmentStatus]);

  const fetchEnrichmentStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${product.id}/enrichment`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch enrichment status');
      const data = await response.json();
      setEnrichmentStatus(data);

      // Populate form with draft or existing data
      if (data.draft) {
        setFormData({
          description: data.draft.description || '',
          features: flattenFeatures(data.draft.features || {}),
          benefits: data.draft.benefits || [],
          tags: data.draft.tags || [],
          sku: product.sku || '',
        });
      } else if (product.description) {
        setFormData({
          description: product.description || '',
          features: flattenFeatures((product.features as Record<string, unknown>) || {}),
          benefits: (product.benefits as string[]) || [],
          tags: (product.tags as string[]) || [],
          sku: product.sku || '',
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [product.id, product.description, product.features, product.benefits, product.tags, product.sku]);

  // Flatten features object to string values for editing
  function flattenFeatures(features: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(features)) {
      result[key] = Array.isArray(value) ? value.join(', ') : String(value || '');
    }
    return result;
  }

  // Generate AI draft
  async function generateDraft() {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${product.id}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate draft');
      }
      await fetchEnrichmentStatus();
      setIsExpanded(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  }

  // Fetch from URL
  async function fetchFromUrl() {
    if (!productUrl.trim()) {
      setError('Please enter a product URL');
      return;
    }

    // Validate URL
    try {
      new URL(productUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsFetchingUrl(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${product.id}/enrich-from-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUrl: productUrl.trim() }),
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch from URL');
      }
      const result = await response.json();

      // Update form with fetched data
      if (result.draft) {
        setFormData({
          description: result.draft.description || '',
          features: flattenFeatures(result.draft.features || {}),
          benefits: result.draft.benefits || [],
          tags: result.draft.tags || [],
          sku: product.sku || '',
        });
      }

      await fetchEnrichmentStatus();
      setIsExpanded(true);
      setProductUrl(''); // Clear the input after success
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsFetchingUrl(false);
    }
  }

  // Save verified data
  async function saveEnrichment(approvedAsIs = false) {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${product.id}/enrichment/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approvedAsIs ? { approvedAsIs: true } : formData),
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save enrichment');
      }
      await fetchEnrichmentStatus();
      onComplete?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  }

  // Add/remove benefits
  function addBenefit() {
    if (newBenefit.trim()) {
      setFormData((prev) => ({
        ...prev,
        benefits: [...prev.benefits, newBenefit.trim()],
      }));
      setNewBenefit('');
    }
  }

  function removeBenefit(index: number) {
    setFormData((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }));
  }

  // Add/remove tags
  function addTag() {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim().toLowerCase()],
      }));
      setNewTag('');
    }
  }

  function removeTag(tag: string) {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  }

  if (isLoading) {
    return (
      <div className={cn('p-6 flex items-center justify-center', className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const status = enrichmentStatus?.status || 'pending';
  const draft = enrichmentStatus?.draft;
  const completeness = enrichmentStatus?.completeness;

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
            <img
              src={getProductImageUrl(product.cloudinaryUrl)}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-medium">{product.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={status} />
              {completeness && (
                <span className="text-xs text-muted-foreground">{completeness.percentage}% complete</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'pending' && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                generateDraft();
              }}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
              Generate Draft
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-6">
              {/* Completeness bar */}
              {completeness && <CompletenessIndicator completeness={completeness} />}

              {/* URL Enrichment */}
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-dashed">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Link2 className="w-4 h-4" />
                  Enrich from Product URL
                </label>
                <p className="text-xs text-muted-foreground">
                  Paste a link to the manufacturer's product page to automatically extract product details.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://example.com/product-page"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), fetchFromUrl())}
                  />
                  <Button variant="secondary" onClick={fetchFromUrl} disabled={isFetchingUrl || !productUrl.trim()}>
                    {isFetchingUrl ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-1" />
                    )}
                    Fetch
                  </Button>
                </div>
              </div>

              {/* Sources used */}
              {draft?.sources && draft.sources.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Sources:</span>
                  {draft.sources.map((source, idx) => (
                    <SourceBadge key={idx} source={source} />
                  ))}
                  {draft.confidence && (
                    <span className="text-xs text-muted-foreground ml-2">Confidence: {draft.confidence}%</span>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="w-4 h-4" />
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the product, its use case, and key selling points..."
                  rows={3}
                />
              </div>

              {/* Features */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Package className="w-4 h-4" />
                  Features
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(formData.features).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <Input
                        value={key}
                        placeholder="Feature name"
                        className="flex-1"
                        onChange={(e) => {
                          const newFeatures = { ...formData.features };
                          delete newFeatures[key];
                          newFeatures[e.target.value] = value;
                          setFormData((prev) => ({ ...prev, features: newFeatures }));
                        }}
                      />
                      <Input
                        value={value}
                        placeholder="Value"
                        className="flex-1"
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            features: { ...prev.features, [key]: e.target.value },
                          }));
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="col-span-2"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        features: { ...prev.features, '': '' },
                      }));
                    }}
                  >
                    + Add Feature
                  </Button>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <List className="w-4 h-4" />
                  Benefits
                </label>
                <div className="flex flex-wrap gap-2">
                  {formData.benefits.map((benefit, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm"
                    >
                      {benefit}
                      <button
                        onClick={() => removeBenefit(idx)}
                        className="ml-1 hover:text-red-600 dark:hover:text-red-400"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    placeholder="Add a benefit..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                  />
                  <Button variant="outline" size="sm" onClick={addBenefit}>
                    Add
                  </Button>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Tag className="w-4 h-4" />
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs"
                    >
                      #{tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-600 dark:hover:text-red-400"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button variant="outline" size="sm" onClick={addTag}>
                    Add
                  </Button>
                </div>
              </div>

              {/* SKU */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Wrench className="w-4 h-4" />
                  SKU (optional)
                </label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                  placeholder="Product SKU or model number"
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                {status === 'draft' && draft && (
                  <Button variant="outline" onClick={() => saveEnrichment(true)} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                    Approve As-Is
                  </Button>
                )}
                <Button onClick={() => saveEnrichment(false)} disabled={isSaving || !formData.description}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                  Save & Verify
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Needs Enrichment',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    draft: {
      label: 'Draft Ready',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    },
    verified: {
      label: 'Verified',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    },
    complete: {
      label: 'Complete',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    },
  };

  const c = config[status] ?? config['pending'] ?? { label: 'Unknown', className: '' };

  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', c.className)}>{c.label}</span>;
}

export default ProductEnrichmentForm;
