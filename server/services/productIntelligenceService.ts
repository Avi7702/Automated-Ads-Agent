/**
 * Product Intelligence Service (WS-C5)
 *
 * Provides product priority management, smart product selection for weekly plans,
 * business intelligence tracking, and posting stats.
 *
 * Core algorithm: selectProductsForWeek() scores products by revenue weight,
 * tier multiplier, recency penalty, monthly gap boost, and seasonal relevance
 * to pick the optimal mix for a given week.
 */

import { storage } from '../storage';
import { logger } from '../lib/logger';
import * as intelligenceRepo from '../repositories/intelligenceRepository';
import type { ProductPriority, BusinessIntelligence } from '@shared/schema';

// ============================================
// TYPES
// ============================================

interface ProductSelection {
  productId: string;
  productName: string;
  reason: string;
  score: number;
}

interface PostingStats {
  productId: string;
  productName: string;
  totalPosts: number;
  lastPosted: Date | null;
  monthlyActual: number;
  monthlyTarget: number;
}

// Tier multipliers for scoring
const TIER_MULTIPLIERS: Record<string, number> = {
  flagship: 4,
  core: 2,
  supporting: 1,
  new: 1.5,
};

// ============================================
// PRODUCT PRIORITY MANAGEMENT
// ============================================

export async function getProductPriorities(userId: string): Promise<ProductPriority[]> {
  return intelligenceRepo.getProductPriorities(userId);
}

export async function setProductPriority(
  userId: string,
  productId: string,
  data: Partial<ProductPriority>,
): Promise<ProductPriority> {
  return intelligenceRepo.upsertProductPriority({
    userId,
    productId,
    revenueTier: (data.revenueTier ?? 'core') as 'flagship' | 'core' | 'supporting' | 'new',
    revenueWeight: data.revenueWeight ?? 5,
    competitiveAngle: data.competitiveAngle ?? null,
    keySellingPoints: data.keySellingPoints ?? [],
    monthlyTarget: data.monthlyTarget ?? 2,
    seasonalRelevance: data.seasonalRelevance ?? null,
  });
}

export async function bulkSetPriorities(
  userId: string,
  priorities: Array<{ productId: string; revenueTier: string; revenueWeight: number }>,
): Promise<void> {
  return intelligenceRepo.bulkUpsertPriorities(userId, priorities);
}

// ============================================
// PRODUCT SELECTION FOR WEEKLY PLAN
// ============================================

export async function selectProductsForWeek(userId: string, numPosts: number): Promise<ProductSelection[]> {
  // 1. Fetch all user's products
  const allProducts = await storage.getProducts();
  if (allProducts.length === 0) {
    return [];
  }

  // 2. Fetch priorities
  const priorities = await intelligenceRepo.getProductPriorities(userId);
  const priorityMap = new Map(priorities.map((p) => [p.productId, p]));

  // 3. Score each product
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12

  const scored = allProducts.map((product) => {
    const priority = priorityMap.get(product.id);

    // Default values for products without priorities
    const tier = priority?.revenueTier ?? 'core';
    const weight = priority?.revenueWeight ?? 5;
    const monthlyTarget = priority?.monthlyTarget ?? 2;
    const lastPostedDate = priority?.lastPostedDate ?? null;
    const seasonal = priority?.seasonalRelevance as { months?: number[]; boost?: number } | null;

    // Base score
    const tierMultiplier = TIER_MULTIPLIERS[tier] ?? 2;
    let score = weight * tierMultiplier;

    // Recency penalty: reduce score if posted recently
    const reasons: string[] = [];
    if (lastPostedDate) {
      const daysSincePost = Math.floor((now.getTime() - new Date(lastPostedDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSincePost < 7) {
        score *= 0.3;
        reasons.push(`posted ${daysSincePost}d ago (penalized)`);
      } else if (daysSincePost < 14) {
        score *= 0.6;
        reasons.push(`posted ${daysSincePost}d ago (mild penalty)`);
      } else {
        reasons.push(`not posted in ${daysSincePost}d`);
      }
    } else {
      reasons.push('never posted');
      score *= 1.2; // Small boost for never-posted products
    }

    // Monthly gap boost: if below target, boost
    // We don't have per-month granularity here, so use a simpler check:
    // If lastPostedDate is not in current month, they're behind
    const lastPostedInCurrentMonth =
      lastPostedDate &&
      new Date(lastPostedDate).getMonth() === now.getMonth() &&
      new Date(lastPostedDate).getFullYear() === now.getFullYear();

    if (!lastPostedInCurrentMonth && monthlyTarget > 0) {
      score *= 1.5;
      reasons.push(`below monthly target of ${monthlyTarget}`);
    }

    // Seasonal boost
    if (seasonal && seasonal.months && seasonal.months.includes(currentMonth)) {
      const boost = seasonal.boost ?? 1.3;
      score *= boost;
      reasons.push(`seasonal boost (x${boost})`);
    }

    // Add tier and weight to reasons
    reasons.unshift(`${tier} tier (weight ${weight})`);

    return {
      productId: product.id,
      productName: product.name,
      score,
      reasons,
    };
  });

  // 4. Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // 5. Pick top N, ensuring diversity
  const selected: ProductSelection[] = [];
  const selectedIds = new Set<string>();

  for (const item of scored) {
    if (selected.length >= numPosts) break;
    if (selectedIds.has(item.productId)) continue;

    selectedIds.add(item.productId);
    selected.push({
      productId: item.productId,
      productName: item.productName,
      score: Math.round(item.score * 100) / 100,
      reason: item.reasons.join('; '),
    });
  }

  // If we need more posts than unique products, allow repeats
  if (selected.length < numPosts && allProducts.length > 0) {
    let idx = 0;
    while (selected.length < numPosts) {
      const item = scored[idx % scored.length]!;
      selected.push({
        productId: item.productId,
        productName: item.productName,
        score: Math.round(item.score * 100) / 100,
        reason: `${item.reasons.join('; ')} (repeated — fewer products than post slots)`,
      });
      idx++;
    }
  }

  logger.info(
    { module: 'ProductIntelligence', userId, numPosts, selected: selected.length },
    'Selected products for weekly plan',
  );

  return selected;
}

// ============================================
// BUSINESS INTELLIGENCE
// ============================================

export async function getBusinessIntelligence(userId: string): Promise<BusinessIntelligence | null> {
  const result = await intelligenceRepo.getBusinessIntelligence(userId);
  return result ?? null;
}

export async function saveBusinessIntelligence(
  userId: string,
  data: Partial<BusinessIntelligence>,
): Promise<BusinessIntelligence> {
  return intelligenceRepo.upsertBusinessIntelligence(userId, data);
}

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const bi = await intelligenceRepo.getBusinessIntelligence(userId);
  return bi?.onboardingComplete ?? false;
}

// ============================================
// STATS & TRACKING
// ============================================

export async function trackPostCreated(userId: string, productId: string): Promise<void> {
  // Ensure a priority row exists before tracking
  const existing = await intelligenceRepo.getProductPriority(userId, productId);
  if (!existing) {
    await intelligenceRepo.upsertProductPriority({
      userId,
      productId,
      revenueTier: 'core',
      revenueWeight: 5,
    });
  }
  await intelligenceRepo.trackPostCreated(userId, productId);
}

export async function getProductPostingStats(userId: string): Promise<PostingStats[]> {
  const allProducts = await storage.getProducts();
  const priorities = await intelligenceRepo.getProductPriorities(userId);
  const priorityMap = new Map(priorities.map((p) => [p.productId, p]));

  // Calculate current month posts (approximate from totalPosts and lastPostedDate)
  const now = new Date();

  return allProducts.map((product) => {
    const priority = priorityMap.get(product.id);
    const lastPosted = priority?.lastPostedDate ? new Date(priority.lastPostedDate) : null;

    // Simple monthly actual: count if lastPosted is in current month
    // (For accurate monthly counts, we'd need a separate monthly tracking table)
    let monthlyActual = 0;
    if (lastPosted && lastPosted.getMonth() === now.getMonth() && lastPosted.getFullYear() === now.getFullYear()) {
      // At least 1 post this month; use min(totalPosts, monthlyTarget) as rough estimate
      monthlyActual = Math.min(priority?.totalPosts ?? 1, priority?.monthlyTarget ?? 2);
    }

    return {
      productId: product.id,
      productName: product.name,
      totalPosts: priority?.totalPosts ?? 0,
      lastPosted,
      monthlyActual,
      monthlyTarget: priority?.monthlyTarget ?? 2,
    };
  });
}

// Export as a service object for consistency with other services
export const productIntelligenceService = {
  getProductPriorities,
  setProductPriority,
  bulkSetPriorities,
  selectProductsForWeek,
  getBusinessIntelligence,
  saveBusinessIntelligence,
  isOnboardingComplete,
  trackPostCreated,
  getProductPostingStats,
};
