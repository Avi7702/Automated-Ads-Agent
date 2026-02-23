/**
 * WeeklyPlanView — Dashboard component for the weekly content plan.
 *
 * Shows a week-at-a-glance with post cards, status badges,
 * action buttons, week navigation, and strategy balance bars.
 */

import { useMemo, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useWeeklyPlan, useRegeneratePlan } from '@/hooks/useWeeklyPlan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SchedulePostDialog } from '@/components/calendar/SchedulePostDialog';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar,
  ArrowRight,
  CheckCircle,
  Clock,
  Lightbulb,
  Package,
  Eye,
} from 'lucide-react';
import type { WeeklyPlanPost } from '@shared/schema';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DAY_LABELS: Record<string, string> = {
  monday: 'MON',
  tuesday: 'TUE',
  wednesday: 'WED',
  thursday: 'THU',
  friday: 'FRI',
  saturday: 'SAT',
  sunday: 'SUN',
};

const CATEGORY_COLORS: Record<string, string> = {
  product_showcase: 'bg-blue-100 text-blue-800 border-blue-200',
  educational: 'bg-green-100 text-green-800 border-green-200',
  industry_insights: 'bg-purple-100 text-purple-800 border-purple-200',
  company_updates: 'bg-orange-100 text-orange-800 border-orange-200',
  engagement: 'bg-pink-100 text-pink-800 border-pink-200',
  promotional: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  behind_the_scenes: 'bg-teal-100 text-teal-800 border-teal-200',
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  planned: { label: 'Planned', className: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
  in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: RefreshCw },
  generated: { label: 'Generated', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  scheduled: { label: 'Scheduled', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Calendar },
};

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'X (Twitter)',
};

/** Get the Monday of the week containing `date`. */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Sunday = 0, Monday = 1, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Shift a date by N weeks. */
function shiftWeek(isoDate: string, weeks: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString();
}

/** Format a date as "Feb 16, 2026". */
function formatWeekLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Format a date as "16" for the card day number. */
function formatDayNum(isoDate: string): string {
  return new Date(isoDate).getDate().toString();
}

/** Pretty-print a category slug. */
function formatCategory(slug: string): string {
  return slug
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function WeeklyPlanView() {
  const [, navigate] = useLocation();

  // Week navigation state — undefined = current week
  const [weekStart, setWeekStart] = useState<string | undefined>(undefined);

  // Schedule dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [schedulePrefill, setSchedulePrefill] = useState<{
    caption?: string;
    generationId?: string;
    defaultDate?: Date;
  } | null>(null);

  const { data: plan, isLoading, error } = useWeeklyPlan(weekStart);
  const regenerate = useRegeneratePlan();

  // Compute the display week label from plan or fallback
  const displayWeekStart = useMemo(() => {
    if (plan?.weekStart) return new Date(plan.weekStart).toISOString();
    if (weekStart) return weekStart;
    return getMonday(new Date()).toISOString();
  }, [plan, weekStart]);

  // Get typed posts array
  const typedPosts = useMemo((): WeeklyPlanPost[] => {
    if (!plan?.posts) return [];
    return plan.posts as WeeklyPlanPost[];
  }, [plan]);

  // Progress counts
  const counts = useMemo(() => {
    const posts = typedPosts;
    return {
      total: posts.length,
      planned: posts.filter((p) => p.status === 'planned').length,
      inProgress: posts.filter((p) => p.status === 'in_progress').length,
      generated: posts.filter((p) => p.status === 'generated').length,
      approved: posts.filter((p) => p.status === 'approved').length,
      scheduled: posts.filter((p) => p.status === 'scheduled').length,
    };
  }, [typedPosts]);

  // Strategy balance (actual vs target from metadata)
  const strategyBalance = useMemo(() => {
    const posts = typedPosts;
    if (posts.length === 0) return [];
    const total = posts.length || 1;

    const metadata = plan?.metadata as { categoryTargets?: Record<string, number> } | null | undefined;
    const categoryTargets = metadata?.categoryTargets ?? {};

    // Compute actual percentages
    const actual: Record<string, number> = {};
    for (const p of posts) {
      actual[p.category] = (actual[p.category] ?? 0) + 1;
    }

    // Merge all categories from actual + targets
    const allCategories = new Set([...Object.keys(actual), ...Object.keys(categoryTargets)]);

    return Array.from(allCategories).map((cat) => ({
      category: cat,
      actualPercent: Math.round(((actual[cat] ?? 0) / total) * 100),
      targetPercent: categoryTargets[cat] != null ? Math.round(categoryTargets[cat]! * 100) : undefined,
    }));
  }, [plan, typedPosts]);

  // Handlers
  const handlePrevWeek = useCallback(() => {
    setWeekStart(shiftWeek(displayWeekStart, -1));
  }, [displayWeekStart]);

  const handleNextWeek = useCallback(() => {
    setWeekStart(shiftWeek(displayWeekStart, 1));
  }, [displayWeekStart]);

  const handleRegenerate = useCallback(() => {
    if (plan?.id) {
      regenerate.mutate(plan.id);
    }
  }, [plan, regenerate]);

  const handleCreateNow = useCallback(
    (postIndex: number) => {
      if (!plan) return;
      const post = typedPosts[postIndex];
      const params = new URLSearchParams({
        planId: plan.id,
        postIndex: String(postIndex),
      });
      if (post?.productIds?.length) {
        const firstProductId = post.productIds[0];
        if (firstProductId) {
          params.set('productId', firstProductId);
        }
      }
      navigate(`/?${params.toString()}`);
    },
    [plan, typedPosts, navigate],
  );

  const handleSchedule = useCallback(
    (postIndex: number) => {
      if (!plan) return;
      const post = typedPosts[postIndex];
      if (!post) return;
      const defaultDate = post.scheduledDate ? new Date(post.scheduledDate) : undefined;
      setSchedulePrefill({
        caption: post.briefing ?? undefined,
        generationId: post.generationId ?? undefined,
        defaultDate,
      });
      setScheduleDialogOpen(true);
    },
    [plan, typedPosts],
  );

  /* ---------------------------------------------------------------- */
  /*  Render — Loading                                                 */
  /* ---------------------------------------------------------------- */

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-64" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render — Error                                                   */
  /* ---------------------------------------------------------------- */

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-2">Failed to load weekly plan</p>
          <p className="text-sm text-destructive">{(error as Error).message}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setWeekStart(undefined)}>
            Try current week
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render — Empty                                                   */
  /* ---------------------------------------------------------------- */

  if (!plan || typedPosts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium mb-1">No weekly plan yet</p>
          <p className="text-sm text-muted-foreground">Set up your content strategy to generate weekly plans.</p>
        </CardContent>
      </Card>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render — Plan                                                    */
  /* ---------------------------------------------------------------- */

  const posts = typedPosts;

  return (
    <Card>
      {/* Header — week label + navigation */}
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg">
            <Calendar className="inline-block h-5 w-5 mr-2 -mt-0.5" />
            Week of {formatWeekLabel(displayWeekStart)}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.total} posts planned
            {counts.generated > 0 && <> &middot; {counts.generated} generated</>}
            {counts.scheduled > 0 && <> &middot; {counts.scheduled} scheduled</>}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevWeek} title="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextWeek} title="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleRegenerate}
            disabled={regenerate.isPending}
            title="Regenerate plan"
          >
            <RefreshCw className={`h-4 w-4 ${regenerate.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Post cards */}
        {posts.map((post, idx) => {
          const statusCfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG['planned']!;
          const StatusIcon = statusCfg.icon;
          const catColor = CATEGORY_COLORS[post.category] ?? 'bg-gray-100 text-gray-700 border-gray-200';

          return (
            <div key={idx} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
              {/* Top row — day + category + platform */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    {DAY_LABELS[post.dayOfWeek] ?? post.dayOfWeek?.toUpperCase()} {formatDayNum(post.scheduledDate)}
                  </span>
                  <Badge variant="outline" className={catColor}>
                    {formatCategory(post.category)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {PLATFORM_LABELS[post.platform] ?? post.platform}
                  </Badge>
                </div>
                <Badge variant="outline" className={statusCfg.className}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusCfg.label}
                </Badge>
              </div>

              {/* Briefing + product */}
              {post.productIds?.length > 0 && (
                <p className="text-sm flex items-center gap-1 mb-1">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {post.productIds.length} product{post.productIds.length > 1 ? 's' : ''}
                  </span>
                </p>
              )}
              {post.briefing && (
                <p className="text-sm text-muted-foreground flex items-start gap-1">
                  <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{post.briefing}</span>
                </p>
              )}

              {/* Suggested time */}
              {post.suggestedTime && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Suggested time: {post.suggestedTime}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3">
                {post.status === 'planned' && (
                  <Button size="sm" onClick={() => handleCreateNow(idx)}>
                    Create Now <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
                {post.status === 'in_progress' && (
                  <Button size="sm" variant="outline" onClick={() => handleCreateNow(idx)}>
                    Continue in Studio <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
                {post.status === 'generated' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleCreateNow(idx)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Review
                    </Button>
                    <Button size="sm" onClick={() => handleSchedule(idx)}>
                      Schedule <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </>
                )}
                {post.status === 'approved' && (
                  <Button size="sm" onClick={() => handleSchedule(idx)}>
                    Schedule <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
                {post.status === 'scheduled' && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Scheduled
                  </Badge>
                )}
              </div>
            </div>
          );
        })}

        {/* Strategy balance section */}
        {strategyBalance.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium mb-3">Strategy Balance</h4>
            <div className="space-y-2">
              {strategyBalance.map(({ category, actualPercent, targetPercent }) => {
                const overTarget = targetPercent != null && actualPercent > targetPercent + 10;

                return (
                  <div key={category} className="flex items-center gap-3 text-sm">
                    <span className="w-32 truncate text-muted-foreground">{formatCategory(category)}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${overTarget ? 'bg-amber-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(actualPercent, 100)}%` }}
                      />
                    </div>
                    <span className="w-20 text-xs text-right text-muted-foreground">
                      {actualPercent}%
                      {targetPercent != null && (
                        <span className={overTarget ? ' text-amber-600' : ''}> (target {targetPercent}%)</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      <SchedulePostDialog
        open={scheduleDialogOpen}
        onOpenChange={(open) => {
          setScheduleDialogOpen(open);
          if (!open) setSchedulePrefill(null);
        }}
        defaultDate={schedulePrefill?.defaultDate ?? null}
        prefill={schedulePrefill ?? undefined}
      />
    </Card>
  );
}
