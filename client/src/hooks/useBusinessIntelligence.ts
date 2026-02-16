// @ts-nocheck
/**
 * useBusinessIntelligence — React Query hooks for business intelligence APIs
 *
 * Provides:
 * - Business intelligence CRUD (industry, niche, strategy, etc.)
 * - Product priority management (tiers, weights, targets)
 * - Onboarding status tracking
 * - Product posting stats
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TargetCustomer {
  type: 'B2B' | 'B2C' | 'both';
  demographics: string;
  painPoints: string[];
  decisionFactors: string[];
}

export interface BusinessIntelligenceData {
  id: string;
  userId: string;
  industry: string | null;
  niche: string | null;
  differentiator: string | null;
  targetCustomer: TargetCustomer | null;
  contentThemes: string[];
  postsPerWeek: number;
  categoryTargets: Record<string, number>;
  preferredPlatforms: string[];
  postingTimes: Record<string, string>;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPriorityData {
  id: string;
  userId: string;
  productId: string;
  revenueTier: 'flagship' | 'core' | 'supporting' | 'new';
  revenueWeight: number;
  competitiveAngle: string | null;
  keySellingPoints: string[];
  monthlyTarget: number;
  lastPostedDate: string | null;
  totalPosts: number;
  seasonalRelevance: { months: number[]; boost: number } | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields from product
  productName?: string;
}

export interface OnboardingStatus {
  onboardingComplete: boolean;
  hasBusinessData: boolean;
  hasPriorities: boolean;
}

export interface ProductStats {
  productId: string;
  productName: string;
  totalPosts: number;
  lastPostedDate: string | null;
  revenueTier: string;
  revenueWeight: number;
  monthlyTarget: number;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Fetch business intelligence data for the current user.
 */
export function useBusinessIntelligence() {
  return useQuery<BusinessIntelligenceData | null>({
    queryKey: ['intelligence', 'business'],
    queryFn: async () => {
      const res = await fetch('/api/intelligence/business', { credentials: 'include' });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch business intelligence');
      const data = await res.json();
      return data.businessIntelligence ?? data;
    },
    staleTime: 60_000,
  });
}

/**
 * Save/update business intelligence data.
 */
export function useSaveBusinessIntelligence() {
  const queryClient = useQueryClient();

  return useMutation<BusinessIntelligenceData, Error, Partial<BusinessIntelligenceData>>({
    mutationFn: async (data) => {
      const res = await apiRequest('PUT', '/api/intelligence/business', data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['intelligence', 'business'], data);
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'onboarding-status'] });
    },
  });
}

/**
 * Fetch product priorities for the current user.
 */
export function useProductPriorities() {
  return useQuery<ProductPriorityData[]>({
    queryKey: ['intelligence', 'priorities'],
    queryFn: async () => {
      const res = await fetch('/api/intelligence/priorities', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch product priorities');
      const data = await res.json();
      return data.priorities ?? data;
    },
    staleTime: 60_000,
  });
}

/**
 * Save/update a single product priority.
 */
export function useSaveProductPriority() {
  const queryClient = useQueryClient();

  return useMutation<ProductPriorityData, Error, { productId: string; data: Partial<ProductPriorityData> }>({
    mutationFn: async ({ productId, data }) => {
      const res = await apiRequest('PUT', `/api/intelligence/priorities/${productId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'priorities'] });
    },
  });
}

/**
 * Batch set priorities for multiple products.
 */
export function useBulkSetPriorities() {
  const queryClient = useQueryClient();

  return useMutation<
    ProductPriorityData[],
    Error,
    Array<{ productId: string; revenueTier: string; revenueWeight: number; monthlyTarget?: number }>
  >({
    mutationFn: async (priorities) => {
      const res = await apiRequest('POST', '/api/intelligence/priorities/bulk', { priorities });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'priorities'] });
    },
  });
}

/**
 * Check if the user has completed onboarding.
 */
export function useOnboardingStatus() {
  return useQuery<OnboardingStatus>({
    queryKey: ['intelligence', 'onboarding-status'],
    queryFn: async () => {
      const res = await fetch('/api/intelligence/onboarding-status', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch onboarding status');
      return res.json();
    },
    staleTime: 30_000,
  });
}

/**
 * Fetch posting stats per product.
 */
export function useProductStats() {
  return useQuery<ProductStats[]>({
    queryKey: ['intelligence', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/intelligence/stats', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch product stats');
      const data = await res.json();
      return data.stats ?? data;
    },
    staleTime: 60_000,
  });
}
