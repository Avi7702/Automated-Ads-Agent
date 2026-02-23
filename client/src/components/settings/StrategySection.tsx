// @ts-nocheck
/**
 * StrategySection — Content Strategy configuration for Settings page
 *
 * Manages:
 * - Posting frequency (posts per week)
 * - Category targets (must total 100%)
 * - Preferred platforms
 * - Posting times per day
 * - Product priorities (tier + weight table)
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useBusinessIntelligence,
  useSaveBusinessIntelligence,
  useProductPriorities,
  useBulkSetPriorities,
} from '@/hooks/useBusinessIntelligence';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Target, Loader2, Save, Clock, BarChart3, Layers, Globe, CheckCircle } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const FREQUENCY_OPTIONS = [3, 5, 7];

const CATEGORY_LABELS: Record<string, string> = {
  product_showcase: 'Product Showcase',
  educational: 'Educational',
  industry_insights: 'Industry Insights',
  company_updates: 'Company Updates',
  engagement: 'Engagement',
};

const DEFAULT_CATEGORY_TARGETS: Record<string, number> = {
  product_showcase: 30,
  educational: 25,
  industry_insights: 20,
  company_updates: 15,
  engagement: 10,
};

const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitter', label: 'Twitter/X' },
  { id: 'tiktok', label: 'TikTok' },
];

const DAYS = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const hour = h.toString().padStart(2, '0');
  return [`${hour}:00`, `${hour}:30`];
}).flat();

const TIER_OPTIONS = ['flagship', 'core', 'supporting', 'new'] as const;

const TIER_COLORS: Record<string, string> = {
  flagship: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  core: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  supporting: 'bg-green-500/10 text-green-500 border-green-500/30',
  new: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function StrategySection() {
  // Data hooks
  const { data: bizData, isLoading: loadingBiz } = useBusinessIntelligence();
  const { data: priorities = [], isLoading: loadingPriorities } = useProductPriorities();
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products', { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.products || [];
    },
  });

  // Mutations
  const saveBiz = useSaveBusinessIntelligence();
  const savePriorities = useBulkSetPriorities();

  // Local state
  const [postsPerWeek, setPostsPerWeek] = useState(5);
  const [categoryTargets, setCategoryTargets] = useState<Record<string, number>>(DEFAULT_CATEGORY_TARGETS);
  const [preferredPlatforms, setPreferredPlatforms] = useState<string[]>(['linkedin']);
  const [postingTimes, setPostingTimes] = useState<Record<string, string>>({
    monday: '09:00',
    tuesday: '10:00',
    wednesday: '09:00',
    thursday: '10:00',
    friday: '11:00',
  });
  const [productTiers, setProductTiers] = useState<Record<string, { tier: string; weight: number }>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Sync from server data
  useEffect(() => {
    if (bizData) {
      setPostsPerWeek(bizData.postsPerWeek || 5);
      setCategoryTargets(bizData.categoryTargets || DEFAULT_CATEGORY_TARGETS);
      setPreferredPlatforms(bizData.preferredPlatforms || ['linkedin']);
      setPostingTimes(
        bizData.postingTimes || {
          monday: '09:00',
          tuesday: '10:00',
          wednesday: '09:00',
          thursday: '10:00',
          friday: '11:00',
        },
      );
    }
  }, [bizData]);

  useEffect(() => {
    if (priorities.length > 0) {
      const tiers: Record<string, { tier: string; weight: number }> = {};
      for (const p of priorities) {
        tiers[p.productId] = { tier: p.revenueTier, weight: p.revenueWeight };
      }
      setProductTiers(tiers);
    }
  }, [priorities]);

  // Category target redistribution
  const handleCategoryChange = useCallback((category: string, newValue: number) => {
    setCategoryTargets((prev) => {
      const oldValue = prev[category] || 0;
      const diff = newValue - oldValue;
      const otherCategories = Object.keys(prev).filter((k) => k !== category);
      const otherTotal = otherCategories.reduce((sum, k) => sum + (prev[k] || 0), 0);

      if (otherTotal === 0) return prev;

      const updated = { ...prev, [category]: newValue };

      // Redistribute the difference proportionally among other categories
      let remaining = -diff;
      for (let i = 0; i < otherCategories.length; i++) {
        const key = otherCategories[i];
        const ratio = (prev[key] || 0) / otherTotal;
        const adjustment = i === otherCategories.length - 1 ? remaining : Math.round(ratio * -diff);
        updated[key] = Math.max(0, Math.min(100, (prev[key] || 0) + adjustment));
        remaining -= adjustment;
      }

      return updated;
    });
    setIsDirty(true);
  }, []);

  const togglePlatform = useCallback((platformId: string) => {
    setPreferredPlatforms((prev) =>
      prev.includes(platformId) ? prev.filter((p) => p !== platformId) : [...prev, platformId],
    );
    setIsDirty(true);
  }, []);

  const handleTimeChange = useCallback((day: string, time: string) => {
    setPostingTimes((prev) => ({ ...prev, [day]: time }));
    setIsDirty(true);
  }, []);

  const handleTierChange = useCallback((productId: string, tier: string) => {
    setProductTiers((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || { weight: 5 }), tier },
    }));
    setIsDirty(true);
  }, []);

  const handleWeightChange = useCallback((productId: string, weight: number) => {
    setProductTiers((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || { tier: 'core' }), weight },
    }));
    setIsDirty(true);
  }, []);

  // Save
  const handleSave = async () => {
    try {
      // Save business intelligence
      await saveBiz.mutateAsync({
        postsPerWeek,
        categoryTargets,
        preferredPlatforms,
        postingTimes,
      });

      // Save product priorities if there are products
      if (products.length > 0 && Object.keys(productTiers).length > 0) {
        const bulkData = Object.entries(productTiers).map(([productId, { tier, weight }]) => ({
          productId,
          revenueTier: tier,
          revenueWeight: weight,
        }));
        await savePriorities.mutateAsync(bulkData);
      }

      setIsDirty(false);
      toast.success('Strategy saved', {
        description: 'Your content strategy has been updated.',
      });
    } catch (err) {
      toast.error('Failed to save', {
        description: err instanceof Error ? err.message : 'Something went wrong',
      });
    }
  };

  const isLoading = loadingBiz || loadingPriorities || loadingProducts;
  const isSaving = saveBiz.isPending || savePriorities.isPending;
  const categoryTotal = Object.values(categoryTargets).reduce((a, b) => a + b, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Content Strategy
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your posting frequency, category mix, platforms, and product priorities.
        </p>
      </div>

      {/* Posting Frequency */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          Posting Frequency
        </h3>
        <div className="flex gap-2">
          {FREQUENCY_OPTIONS.map((n) => (
            <Button
              key={n}
              variant={postsPerWeek === n ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setPostsPerWeek(n);
                setIsDirty(true);
              }}
            >
              {n} posts/week
            </Button>
          ))}
        </div>
      </section>

      {/* Category Targets */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            Category Targets
          </h3>
          <Badge variant={categoryTotal === 100 ? 'default' : 'destructive'}>Total: {categoryTotal}%</Badge>
        </div>
        <div className="space-y-4">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span>{label}</span>
                <span className="font-mono text-muted-foreground">{categoryTargets[key] || 0}%</span>
              </div>
              <Slider
                value={[categoryTargets[key] || 0]}
                min={0}
                max={100}
                step={5}
                onValueChange={([val]) => handleCategoryChange(key, val)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Preferred Platforms */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          Preferred Platforms
        </h3>
        <div className="flex flex-wrap gap-4">
          {PLATFORMS.map((platform) => (
            <label key={platform.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={preferredPlatforms.includes(platform.id)}
                onCheckedChange={() => togglePlatform(platform.id)}
              />
              <span className="text-sm">{platform.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Posting Times */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Posting Times
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {DAYS.map((day) => (
            <div key={day.id} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{day.label}</Label>
              <Select value={postingTimes[day.id] || '09:00'} onValueChange={(val) => handleTimeChange(day.id, val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </section>

      {/* Product Priorities */}
      {products.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            Product Priorities
          </h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2 font-medium">Product</th>
                  <th className="text-left px-4 py-2 font-medium">Tier</th>
                  <th className="text-left px-4 py-2 font-medium w-40">Weight</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const tier = productTiers[product.id]?.tier || 'core';
                  const weight = productTiers[product.id]?.weight || 5;
                  return (
                    <tr key={product.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium">{product.name}</td>
                      <td className="px-4 py-2.5">
                        <Select value={tier} onValueChange={(val) => handleTierChange(product.id, val)}>
                          <SelectTrigger className="h-7 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIER_OPTIONS.map((t) => (
                              <SelectItem key={t} value={t}>
                                <Badge variant="outline" className={`text-xs ${TIER_COLORS[t]}`}>
                                  {t.charAt(0).toUpperCase() + t.slice(1)}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Slider
                            value={[weight]}
                            min={1}
                            max={10}
                            step={1}
                            onValueChange={([val]) => handleWeightChange(product.id, val)}
                            className="flex-1"
                          />
                          <span className="font-mono text-xs text-muted-foreground w-4 text-right">{weight}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Save */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <Button onClick={handleSave} disabled={isSaving || !isDirty}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Strategy
        </Button>
        {!isDirty && bizData && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            All changes saved
          </span>
        )}
      </div>
    </div>
  );
}
