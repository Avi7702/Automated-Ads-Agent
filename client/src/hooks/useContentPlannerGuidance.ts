// @ts-nocheck
/**
 * useContentPlannerGuidance — Mutations, utility functions, and state
 * for the ContentPlannerGuidance component.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { typedPost } from '@/lib/typedFetch';
import { GenerateCopyResponse } from '@shared/contracts/copywriting.contract';
import type { ContentTemplate } from '@shared/contentTemplates';

// ── Types ────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description?: string;
}

export interface GenerateCompletePostResult {
  success: boolean;
  copy?: {
    headline: string;
    hook: string;
    bodyText: string;
    cta: string;
    caption: string;
    hashtags: string[];
    framework: string;
  };
  image?: {
    imageUrl: string;
    prompt: string;
  };
  copyError?: string;
  imageError?: string;
  template: {
    id: string;
    title: string;
    category: string;
  };
}

export interface VisualFormat {
  type: 'carousel' | 'reel' | 'story' | 'post' | 'video';
  aspectRatio: string;
  aspectRatioLabel: string;
  slideCount?: string;
  description: string;
}

// ── Constants ────────────────────────────────────────────

export const CATEGORY_NAMES: Record<string, string> = {
  product_showcase: 'Product Showcase',
  educational: 'Educational',
  industry_insights: 'Industry Insights',
  customer_success: 'Customer Success',
  company_updates: 'Company Updates',
  engagement: 'Engagement',
};

// ── Utility Functions ────────────────────────────────────

/** Map template category to copywriting campaign objective. */
export function getCampaignObjective(category: string): string {
  const mapping: Record<string, string> = {
    product_showcase: 'conversion',
    educational: 'awareness',
    industry_insights: 'awareness',
    customer_success: 'consideration',
    company_updates: 'engagement',
    engagement: 'engagement',
  };
  return mapping[category] || 'awareness';
}

/** Infer copywriting framework from post structure. */
export function inferFramework(postStructure: string): string {
  const lower = postStructure.toLowerCase();
  if (lower.includes('problem') && lower.includes('agitate')) return 'PAS';
  if (lower.includes('attention') && lower.includes('interest') && lower.includes('desire')) return 'AIDA';
  if (lower.includes('before') && lower.includes('after')) return 'BAB';
  if (lower.includes('feature') && lower.includes('advantage') && lower.includes('benefit')) return 'FAB';
  return 'Auto';
}

/** Detect visual format from template format string. */
export function detectVisualFormat(format: string): VisualFormat {
  const lower = format.toLowerCase();

  if (lower.includes('carousel')) {
    const slideMatch = format.match(/(\d+)-?(\d+)?\s*slides?/i);
    const slideCount = slideMatch ? `${slideMatch[1]}${slideMatch[2] ? `-${slideMatch[2]}` : ''}` : '6-10';
    return {
      type: 'carousel',
      aspectRatio: '1080x1350',
      aspectRatioLabel: '1080x1350 (Portrait)',
      slideCount,
      description: `Carousel with ${slideCount} slides - Portrait format recommended`,
    };
  }

  if (lower.includes('reel') || lower.includes('story') || lower.includes('stories')) {
    return {
      type: 'reel',
      aspectRatio: '1080x1920',
      aspectRatioLabel: '1080x1920 (Story/Reel)',
      description: 'Vertical video format (9:16)',
    };
  }

  if (lower.includes('video')) {
    return {
      type: 'video',
      aspectRatio: '1920x1080',
      aspectRatioLabel: '1920x1080 (Landscape HD)',
      description: 'Landscape video format (16:9)',
    };
  }

  return {
    type: 'post',
    aspectRatio: '1200x627',
    aspectRatioLabel: '1200x627 (LinkedIn Post)',
    description: 'Standard post format',
  };
}

// ── Hook ─────────────────────────────────────────────────

interface UseContentPlannerGuidanceOptions {
  template: ContentTemplate;
  platform: string;
  onGenerateCopy: (copy: string) => void;
  onGenerateComplete?: (result: GenerateCompletePostResult) => void;
  selectedProductIds?: string[];
  onProductSelectionChange?: (productIds: string[]) => void;
}

export function useContentPlannerGuidance({
  template,
  platform,
  onGenerateCopy,
  onGenerateComplete,
  selectedProductIds = [],
  onProductSelectionChange,
}: UseContentPlannerGuidanceOptions) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedHookIndex, setCopiedHookIndex] = useState<number | null>(null);
  const [showAllHooks, setShowAllHooks] = useState(false);
  const [topicInput, setTopicInput] = useState('');

  // Detect visual format from the first platform's format
  const visualFormat = detectVisualFormat(template.bestPlatforms[0]?.format || '');

  // Check product requirements
  const productRequirement = template.productRequirement || 'optional';
  const minProducts = template.minProducts || 1;
  const meetsProductRequirement =
    productRequirement === 'none' ||
    productRequirement === 'optional' ||
    (productRequirement === 'recommended' && true) ||
    (productRequirement === 'required' && selectedProductIds.length >= minProducts);

  // Handle product selection toggle
  const handleProductToggle = (productId: string) => {
    if (!onProductSelectionChange) return;
    const newSelection = selectedProductIds.includes(productId)
      ? selectedProductIds.filter((id) => id !== productId)
      : [...selectedProductIds, productId];
    onProductSelectionChange(newSelection);
  };

  // Unified generation mutation
  const generateCompleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/content-planner/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          templateId: template.id,
          productIds: selectedProductIds,
          topic: topicInput.trim() || undefined,
          platform: platform.toLowerCase(),
        }),
      });
      if (!response.ok) throw new Error('Failed to generate post');
      return response.json() as Promise<GenerateCompletePostResult>;
    },
    onSuccess: (result) => {
      if (onGenerateComplete) onGenerateComplete(result);
      if (result.copy?.caption) onGenerateCopy(result.copy.caption);
    },
  });

  // Copy-only mutation
  const generateCopyMutation = useMutation({
    mutationFn: async () => {
      const data = await typedPost(
        '/api/copywriting/generate',
        {
          platform: platform.toLowerCase(),
          tone: 'professional',
          framework: inferFramework(template.postStructure),
          campaignObjective: getCampaignObjective(template.category),
          productBenefits: template.exampleTopics.slice(0, 3).join('. '),
          targetAudience: {
            demographics: 'Construction professionals, contractors, engineers',
            interests: 'Steel construction, building materials, industry best practices',
            painPoints: 'Finding reliable suppliers, meeting specifications, managing timelines',
          },
          context: `Content Type: ${template.title}. Hook style: ${template.hookFormulas[0]}. Post structure: ${template.postStructure}`,
          numVariations: 1,
        },
        GenerateCopyResponse,
      );
      const firstCopy = data.copies?.[0];
      const fallbackCopy = data as { variations?: Array<{ copy?: string }>; copy?: string };
      return (
        firstCopy?.caption || fallbackCopy.variations?.[0]?.copy || fallbackCopy.copy || 'Copy generation failed'
      );
    },
    onSuccess: (copy) => {
      onGenerateCopy(copy);
    },
  });

  const handleCopyHook = (hook: string, index: number) => {
    navigator.clipboard.writeText(hook);
    setCopiedHookIndex(index);
    setTimeout(() => setCopiedHookIndex(null), 2000);
  };

  const displayedHooks = showAllHooks ? template.hookFormulas : template.hookFormulas.slice(0, 2);

  return {
    // State
    isExpanded,
    setIsExpanded,
    copiedHookIndex,
    showAllHooks,
    setShowAllHooks,
    topicInput,
    setTopicInput,

    // Derived
    visualFormat,
    productRequirement,
    minProducts,
    meetsProductRequirement,
    displayedHooks,

    // Mutations
    generateCompleteMutation,
    generateCopyMutation,

    // Handlers
    handleProductToggle,
    handleCopyHook,
  };
}
