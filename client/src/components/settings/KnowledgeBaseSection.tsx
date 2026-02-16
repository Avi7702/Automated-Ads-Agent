// @ts-nocheck
/**
 * KnowledgeBaseSection — Knowledge Base overview for Settings page
 *
 * Shows the status of the product knowledge base:
 * - Products count + recent additions
 * - Relationships between products
 * - Installation scenarios
 * - Brand images
 * - Templates & patterns
 *
 * Provides links to manage each data source.
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

import {
  Package,
  MapPin,
  ImageIcon,
  Layout,
  Loader2,
  ExternalLink,
  Database,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface KBStat {
  label: string;
  count: number;
  icon: typeof Package;
  href: string;
  color: string;
}

export function KnowledgeBaseSection() {
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.products || [];
    },
  });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/templates');
      if (!res.ok) return [];
      const data = await res.json();
      return data.templates || [];
    },
  });

  const { data: brandImages = [], isLoading: loadingBrandImages } = useQuery({
    queryKey: ['brand-images'],
    queryFn: async () => {
      const res = await fetch('/api/brand-images');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: scenarios = [], isLoading: loadingScenarios } = useQuery({
    queryKey: ['installation-scenarios'],
    queryFn: async () => {
      const res = await fetch('/api/installation-scenarios');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const isLoading = loadingProducts || loadingTemplates || loadingBrandImages || loadingScenarios;

  const stats: KBStat[] = [
    {
      label: 'Products',
      count: products.length,
      icon: Package,
      href: '/library?tab=products',
      color: 'text-blue-500',
    },
    {
      label: 'Brand Images',
      count: brandImages.length,
      icon: ImageIcon,
      href: '/library?tab=brand-images',
      color: 'text-purple-500',
    },
    {
      label: 'Installation Scenarios',
      count: scenarios.length,
      icon: MapPin,
      href: '/library?tab=scenarios',
      color: 'text-green-500',
    },
    {
      label: 'Gen Templates',
      count: templates.length,
      icon: Layout,
      href: '/library?tab=scene-templates',
      color: 'text-amber-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Knowledge Base
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          The AI uses this data to generate better, more relevant content for your products.
        </p>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading knowledge base status...</span>
          </>
        ) : products.length > 0 ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm">
              Knowledge base active with <strong>{products.length}</strong> products
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-muted-foreground">
              No products added yet. Add products to improve AI output.
            </span>
          </>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <div className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer">
                <div className={`p-2.5 rounded-lg bg-muted/50 ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : stat.count}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Link href="/library?tab=products">
            <Button variant="outline" size="sm" className="gap-2">
              <Package className="w-4 h-4" />
              Add Products
            </Button>
          </Link>
          <Link href="/library?tab=brand-images">
            <Button variant="outline" size="sm" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Upload Brand Images
            </Button>
          </Link>
          <Link href="/library?tab=scenarios">
            <Button variant="outline" size="sm" className="gap-2">
              <MapPin className="w-4 h-4" />
              Create Scenario
            </Button>
          </Link>
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
        <p>
          The knowledge base powers the Idea Bank, copy generation, and template matching. More data = better AI
          suggestions.
        </p>
      </div>
    </div>
  );
}
