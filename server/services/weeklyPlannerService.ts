// @ts-nocheck
/**
 * Weekly Planner Service — WS-C1
 *
 * Generates a strategy-driven weekly content plan:
 * - Distributes posts across categories by percentage targets
 * - Assigns products evenly, avoiding recent repeats
 * - Rule-based platform + time-slot assignment
 * - Template-based briefings (no AI call needed)
 */

import { db } from '../db';
import { weeklyPlans, scheduledPosts } from '@shared/schema';
import type { WeeklyPlanPost, WeeklyPlan, Product } from '@shared/schema';
import { eq, and, gte } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { storage } from '../storage';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_POSTS_PER_WEEK = 5;

/** Category targets as percentages (must sum to 100) */
const DEFAULT_CATEGORY_TARGETS: Record<string, number> = {
  product_showcase: 30,
  educational: 25,
  industry_insights: 20,
  company_updates: 15,
  engagement: 10,
};

/** Default time slots per day-of-week (HH:mm) */
const DEFAULT_TIME_SLOTS: Record<string, string> = {
  monday: '09:00',
  tuesday: '10:00',
  wednesday: '09:00',
  thursday: '10:00',
  friday: '11:00',
  saturday: '10:00',
  sunday: '12:00',
};

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

/** Category → default platform mapping */
const CATEGORY_PLATFORM_MAP: Record<string, 'linkedin' | 'instagram' | 'facebook' | 'twitter'> = {
  product_showcase: 'instagram',
  educational: 'linkedin',
  industry_insights: 'linkedin',
  company_updates: 'linkedin',
  engagement: 'instagram',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Ensure a date falls on a Monday. If not, rewind to the previous Monday.
 */
function toMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // How many days back to Monday
  d.setDate(d.getDate() - diff);
  return d;
}

/**
 * Get ISO date string (YYYY-MM-DD) for a day offset from Monday.
 */
function dateForDay(monday: Date, dayIndex: number): string {
  const d = new Date(monday);
  d.setDate(d.getDate() + dayIndex);
  return d.toISOString().split('T')[0];
}

/**
 * Distribute N posts across categories by percentage targets.
 * Returns { category: count } that sums to exactly N.
 */
function distributePosts(postsPerWeek: number, targets: Record<string, number>): Record<string, number> {
  const categories = Object.keys(targets);
  const result: Record<string, number> = {};
  let totalAssigned = 0;

  // First pass: floor of proportional allocation
  for (const cat of categories) {
    const pct = targets[cat] ?? 0;
    const exact = (pct / 100) * postsPerWeek;
    result[cat] = Math.floor(exact);
    totalAssigned += result[cat];
  }

  // Second pass: distribute remaining posts to categories with highest fractional parts
  let remaining = postsPerWeek - totalAssigned;
  if (remaining > 0) {
    const fractionals = categories
      .map((cat) => ({
        cat,
        fractional: ((targets[cat] ?? 0) / 100) * postsPerWeek - (result[cat] ?? 0),
      }))
      .sort((a, b) => b.fractional - a.fractional);

    for (const { cat } of fractionals) {
      if (remaining <= 0) break;
      result[cat] = (result[cat] ?? 0) + 1;
      remaining--;
    }
  }

  return result;
}

/**
 * Fetch product IDs that were scheduled in the last N days.
 * Used to deprioritize recently-posted products.
 */
async function getRecentlyPostedProductIds(userId: string, days: number): Promise<Set<string>> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const _recentPosts = await db
      .select({ generationId: scheduledPosts.generationId })
      .from(scheduledPosts)
      .where(and(eq(scheduledPosts.userId, userId), gte(scheduledPosts.scheduledFor, since)));

    // We don't have a direct product link on scheduledPosts, so return empty
    // In the future, WS-C5 product intelligence will enrich this
    return new Set<string>();
  } catch {
    return new Set<string>();
  }
}

/* ------------------------------------------------------------------ */
/*  Core Service                                                       */
/* ------------------------------------------------------------------ */

/**
 * Generate a weekly content plan for a user.
 */
export async function generateWeeklyPlan(userId: string, weekStartDate: Date): Promise<WeeklyPlan> {
  const monday = toMonday(weekStartDate);

  // 1. Check if plan already exists
  const existing = await getWeeklyPlan(userId, monday);
  if (existing) {
    logger.info({ userId, weekStart: monday.toISOString() }, 'Returning existing weekly plan');
    return existing;
  }

  logger.info({ userId, weekStart: monday.toISOString() }, 'Generating new weekly plan');

  // 2. Defaults (future: pull from user content strategy settings)
  const postsPerWeek = DEFAULT_POSTS_PER_WEEK;
  const categoryTargets = { ...DEFAULT_CATEGORY_TARGETS };

  // 3. Fetch user's products
  let userProducts: Product[] = [];
  try {
    userProducts = await storage.getProducts();
  } catch {
    logger.warn({ userId }, 'No products found, will generate plan without product assignments');
  }

  // 4. Calculate category distribution
  const categoryDistribution = distributePosts(postsPerWeek, categoryTargets);

  // 5. Get recently posted product IDs to deprioritize
  const recentProductIds = await getRecentlyPostedProductIds(userId, 30);

  // 6. Sort products: unposted first, then recently posted
  const sortedProducts = [...userProducts].sort((a, b) => {
    const aRecent = recentProductIds.has(a.id) ? 1 : 0;
    const bRecent = recentProductIds.has(b.id) ? 1 : 0;
    return aRecent - bRecent;
  });

  // 7. Build post slots
  const posts: WeeklyPlanPost[] = [];
  let productIndex = 0;
  let dayIndex = 0;

  // Flatten categories into a slot list: e.g. [product_showcase, product_showcase, educational, ...]
  const categorySlots: string[] = [];
  for (const [cat, count] of Object.entries(categoryDistribution)) {
    for (let i = 0; i < count; i++) {
      categorySlots.push(cat);
    }
  }

  // Interleave categories for variety (don't cluster same category)
  categorySlots.sort((a, b) => {
    const aIdx = Object.keys(categoryTargets).indexOf(a);
    const bIdx = Object.keys(categoryTargets).indexOf(b);
    return aIdx - bIdx;
  });

  for (const category of categorySlots) {
    const dayName = DAYS_OF_WEEK[dayIndex % DAYS_OF_WEEK.length];
    const scheduledDate = dateForDay(monday, dayIndex % 7);
    const suggestedTime = DEFAULT_TIME_SLOTS[dayName] ?? '09:00';
    const platform = CATEGORY_PLATFORM_MAP[category] ?? 'linkedin';

    // Assign a product (round-robin through sorted products)
    const assignedProductIds: string[] = [];
    if (sortedProducts.length > 0) {
      const product = sortedProducts[productIndex % sortedProducts.length];
      assignedProductIds.push(product.id);
      productIndex++;
    }

    // Build briefing
    const productName =
      assignedProductIds.length > 0
        ? (sortedProducts.find((p) => p.id === assignedProductIds[0])?.name ?? 'Product')
        : 'your brand';
    const briefing = buildBriefing(category, productName, platform);

    posts.push({
      dayOfWeek: dayName,
      scheduledDate,
      suggestedTime,
      category,
      productIds: assignedProductIds,
      platform,
      briefing,
      status: 'planned',
    });

    dayIndex++;
  }

  // 8. Save to DB
  const [saved] = await db
    .insert(weeklyPlans)
    .values({
      userId,
      weekStart: monday,
      status: 'draft',
      posts,
      metadata: {
        postsPerWeek,
        categoryTargets,
        generatedAt: new Date().toISOString(),
      },
    })
    .returning();

  logger.info({ planId: saved.id, postCount: posts.length }, 'Weekly plan generated');
  return saved;
}

/**
 * Get an existing weekly plan for a user and week.
 */
export async function getWeeklyPlan(userId: string, weekStart: Date): Promise<WeeklyPlan | null> {
  const monday = toMonday(weekStart);

  const rows = await db
    .select()
    .from(weeklyPlans)
    .where(and(eq(weeklyPlans.userId, userId), eq(weeklyPlans.weekStart, monday)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Update a single post's status within a plan.
 */
export async function updatePlanPostStatus(
  planId: string,
  postIndex: number,
  status: string,
  linkIds?: { generationId?: string; scheduledPostId?: string },
): Promise<void> {
  const rows = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, planId)).limit(1);

  const plan = rows[0];
  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }

  const posts = plan.posts as WeeklyPlanPost[];
  if (postIndex < 0 || postIndex >= posts.length) {
    throw new Error(`Invalid post index: ${postIndex}`);
  }

  posts[postIndex] = {
    ...posts[postIndex],
    status: status as WeeklyPlanPost['status'],
    ...(linkIds?.generationId && { generationId: linkIds.generationId }),
    ...(linkIds?.scheduledPostId && { scheduledPostId: linkIds.scheduledPostId }),
  };

  await db.update(weeklyPlans).set({ posts, updatedAt: new Date() }).where(eq(weeklyPlans.id, planId));
}

/**
 * Delete and recreate a plan for a week.
 */
export async function regeneratePlan(planId: string): Promise<WeeklyPlan> {
  const rows = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, planId)).limit(1);

  const plan = rows[0];
  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }

  // Delete the old plan
  await db.delete(weeklyPlans).where(eq(weeklyPlans.id, planId));

  // Generate a fresh one
  return generateWeeklyPlan(plan.userId, plan.weekStart);
}

/**
 * Build a briefing string for a post slot.
 */
function buildBriefing(category: string, productName: string, platform: string): string {
  const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);

  switch (category) {
    case 'product_showcase':
      return `Showcase ${productName} features on ${platformLabel}. Focus on visual appeal and key selling points. Use high-quality product imagery.`;
    case 'educational':
      return `Create educational content about ${productName} on ${platformLabel}. Share tips, how-tos, or industry knowledge that positions your brand as an expert.`;
    case 'industry_insights':
      return `Share industry insights related to ${productName} on ${platformLabel}. Discuss trends, market analysis, or thought leadership content.`;
    case 'company_updates':
      return `Post a company update on ${platformLabel}. Share news, milestones, team highlights, or behind-the-scenes content featuring ${productName}.`;
    case 'engagement':
      return `Create engaging content on ${platformLabel} featuring ${productName}. Ask questions, run polls, or share interactive content to boost audience participation.`;
    default:
      return `Create a ${category} post on ${platformLabel} featuring ${productName}. Keep it authentic and on-brand.`;
  }
}

// Export as a service object
export const weeklyPlannerService = {
  generateWeeklyPlan,
  getWeeklyPlan,
  updatePlanPostStatus,
  regeneratePlan,
};
