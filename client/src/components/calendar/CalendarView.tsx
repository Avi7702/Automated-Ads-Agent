// @ts-nocheck
/**
 * CalendarView -- Premium monthly content calendar.
 *
 * Custom 7-column CSS grid (no react-day-picker).
 * Features:
 *   - Month navigation with smooth transition
 *   - Stats bar summarising scheduled / published / failed counts
 *   - Mini post cards per day cell (image thumbnail + 1-line caption)
 *   - "+N more" overflow badge
 *   - Today cell highlight + "Today" label
 *   - Past days dimmed, outside-month days ultra-faded
 *   - Empty state illustration when zero posts in month
 *   - Skeleton loading state
 *   - Click day -> DayPostsSheet
 *   - "Schedule Post" FAB button
 *   - Mobile responsive: compact dot-only cells on small screens
 *   - Dark mode aware
 */

import { useState, useMemo, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isPast,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCalendarPosts, useCalendarCounts } from '@/hooks/useScheduledPosts';
import type { ScheduledPost, DayCount } from '@/hooks/useScheduledPosts';
import { PostStatusBadge } from './PostStatusBadge';
import { DayPostsSheet } from './DayPostsSheet';
import { SchedulePostDialog } from './SchedulePostDialog';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_POSTS = 2;

/* ------------------------------------------------------------------ */
/*  Status color helpers                                               */
/* ------------------------------------------------------------------ */

const STATUS_BAR_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500 dark:bg-blue-400',
  published: 'bg-green-500 dark:bg-green-400',
  publishing: 'bg-amber-500 dark:bg-amber-400',
  failed: 'bg-red-500 dark:bg-red-400',
  cancelled: 'bg-gray-400 dark:bg-gray-500',
  draft: 'bg-gray-300 dark:bg-gray-600',
};

/* ------------------------------------------------------------------ */
/*  MiniPostCard -- compact card inside a day cell                     */
/* ------------------------------------------------------------------ */

function MiniPostCard({ post }: { post: ScheduledPost }) {
  return (
    <div
      className={cn(
        'hidden md:flex items-center gap-1.5 rounded px-1.5 py-0.5',
        'bg-muted/60 dark:bg-muted/40 hover:bg-muted transition-colors duration-100',
        'group/card cursor-default max-w-full',
      )}
    >
      {/* Thumbnail or colored status bar */}
      {post.imageUrl ? (
        <img src={post.imageUrl} alt="" className="w-5 h-5 rounded-sm object-cover shrink-0" />
      ) : (
        <span
          className={cn('w-1 h-4 rounded-full shrink-0', STATUS_BAR_COLORS[post.status] ?? STATUS_BAR_COLORS.draft)}
        />
      )}
      {/* Caption snippet */}
      <span className="text-[10px] leading-tight truncate flex-1 text-foreground/80">{post.caption || 'Untitled'}</span>
      {/* Tiny status icon */}
      <PostStatusBadge status={post.status} size="tiny" className="shrink-0" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatusDot -- used on mobile instead of mini cards                   */
/* ------------------------------------------------------------------ */

function StatusDots({ posts }: { posts: ScheduledPost[] }) {
  if (posts.length === 0) return null;

  // Deduplicate statuses and show one dot per unique status
  const statuses = [...new Set(posts.map((p) => p.status))];

  return (
    <div className="flex md:hidden items-center justify-center gap-0.5 mt-0.5">
      {statuses.slice(0, 3).map((s, i) => (
        <span key={i} className={cn('w-1.5 h-1.5 rounded-full', STATUS_BAR_COLORS[s] ?? STATUS_BAR_COLORS.draft)} />
      ))}
      {posts.length > 3 && <span className="text-[8px] text-muted-foreground leading-none">+{posts.length - 3}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DayCell -- single cell in the calendar grid                        */
/* ------------------------------------------------------------------ */

interface DayCellProps {
  day: Date;
  currentMonth: Date;
  isSelected: boolean;
  posts: ScheduledPost[];
  onClick: (day: Date) => void;
}

function DayCell({ day, currentMonth, isSelected, posts, onClick }: DayCellProps) {
  const inMonth = isSameMonth(day, currentMonth);
  const today = isToday(day);
  const past = isPast(day) && !today;
  const overflow = posts.length - MAX_VISIBLE_POSTS;

  return (
    <button
      type="button"
      onClick={() => onClick(day)}
      className={cn(
        // Base cell
        'relative flex flex-col p-1.5 md:p-2 min-h-[3rem] md:min-h-[5.5rem] rounded-lg',
        'text-left transition-all duration-150 outline-none',
        'border border-transparent',
        'focus-visible:ring-2 focus-visible:ring-primary/40',
        // In-month vs outside
        inMonth ? 'bg-card dark:bg-card' : 'bg-muted/30 dark:bg-muted/10 opacity-40 pointer-events-none',
        // Past day dimming
        past && inMonth && 'opacity-60',
        // Today highlight
        today && 'ring-2 ring-primary/50 dark:ring-primary/40 bg-primary/[0.04] dark:bg-primary/[0.08]',
        // Selected state
        isSelected && inMonth && 'border-primary/60 bg-primary/[0.06] dark:bg-primary/[0.12]',
        // Hover
        inMonth && !isSelected && 'hover:bg-accent/50 dark:hover:bg-accent/30',
      )}
    >
      {/* Day number + Today label */}
      <div className="flex items-center justify-between mb-0.5 md:mb-1">
        <span
          className={cn(
            'text-xs md:text-sm font-medium tabular-nums',
            today && 'text-primary font-bold',
            !inMonth && 'text-muted-foreground/50',
          )}
        >
          {format(day, 'd')}
        </span>
        {today && (
          <span className="hidden md:inline text-[9px] font-semibold uppercase tracking-wider text-primary/80">
            Today
          </span>
        )}
      </div>

      {/* Mini post cards -- desktop */}
      <div className="flex-1 space-y-0.5 overflow-hidden">
        {posts.slice(0, MAX_VISIBLE_POSTS).map((post) => (
          <MiniPostCard key={post.id} post={post} />
        ))}
        {overflow > 0 && (
          <span className="hidden md:block text-[9px] text-muted-foreground pl-1 font-medium">+{overflow} more</span>
        )}
      </div>

      {/* Status dots -- mobile */}
      <StatusDots posts={posts} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  SkeletonGrid -- loading placeholder                                */
/* ------------------------------------------------------------------ */

function SkeletonGrid() {
  return (
    <div className="space-y-3">
      {/* Weekday header skeleton */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <Skeleton key={d} className="h-4 rounded" />
        ))}
      </div>
      {/* 5 rows of 7 cells */}
      {Array.from({ length: 5 }).map((_, row) => (
        <div key={row} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, col) => (
            <Skeleton key={col} className="h-14 md:h-24 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EmptyMonth -- shown when zero posts exist for the visible month    */
/* ------------------------------------------------------------------ */

function EmptyMonth({ onSchedule }: { onSchedule: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted/60 dark:bg-muted/30 flex items-center justify-center mb-4">
        <CalendarDays className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h3 className="text-sm font-semibold text-foreground/80 mb-1">No posts this month</h3>
      <p className="text-xs text-muted-foreground max-w-[240px] mb-4">
        Start planning your content by scheduling your first post.
      </p>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={onSchedule}>
        <Plus className="h-3.5 w-3.5" />
        Schedule a post
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatsBar -- month summary counts                                   */
/* ------------------------------------------------------------------ */

function StatsBar({ counts }: { counts: DayCount[] }) {
  const totals = useMemo(() => {
    const out = { scheduled: 0, published: 0, failed: 0 };
    for (const dc of counts) {
      out.scheduled += dc.scheduled;
      out.published += dc.published;
      out.failed += dc.failed;
    }
    return out;
  }, [counts]);

  const hasAny = totals.scheduled + totals.published + totals.failed > 0;
  if (!hasAny) return null;

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      {totals.scheduled > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
          <span>
            <span className="font-semibold text-foreground/80">{totals.scheduled}</span> scheduled
          </span>
        </div>
      )}
      {totals.published > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400" />
          <span>
            <span className="font-semibold text-foreground/80">{totals.published}</span> published
          </span>
        </div>
      )}
      {totals.failed > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400" />
          <span>
            <span className="font-semibold text-foreground/80">{totals.failed}</span> failed
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CalendarView (default export, lazy-loaded)                         */
/* ------------------------------------------------------------------ */

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  // Date range for post fetching (full visible grid, including edge days)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart); // Sunday
  const gridEnd = endOfWeek(monthEnd); // Saturday

  const rangeStart = format(gridStart, 'yyyy-MM-dd');
  const rangeEnd = format(gridEnd, 'yyyy-MM-dd');

  const { data: posts = [], isLoading: postsLoading } = useCalendarPosts(
    `${rangeStart}T00:00:00Z`,
    `${rangeEnd}T23:59:59Z`,
  );

  const { data: dayCounts = [] } = useCalendarCounts(year, month);

  // All days that appear in the grid (6 weeks max, always fills 7-col rows)
  const gridDays = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart.getTime(), gridEnd.getTime()],
  );

  // Map posts by YYYY-MM-DD for quick lookup
  const postsMap = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const p of posts) {
      const key = format(parseISO(p.scheduledFor), 'yyyy-MM-dd');
      const arr = map.get(key);
      if (arr) {
        arr.push(p);
      } else {
        map.set(key, [p]);
      }
    }
    return map;
  }, [posts]);

  // Posts for the selected day (for DayPostsSheet)
  const selectedDayPosts = useMemo(() => {
    if (!selectedDay) return [];
    return posts.filter((p) => isSameDay(parseISO(p.scheduledFor), selectedDay));
  }, [posts, selectedDay]);

  // Navigation
  const handlePrevMonth = useCallback(() => setCurrentMonth((m) => subMonths(m, 1)), []);
  const handleNextMonth = useCallback(() => setCurrentMonth((m) => addMonths(m, 1)), []);
  const handleToday = useCallback(() => setCurrentMonth(new Date()), []);

  const handleDayClick = useCallback((day: Date) => {
    setSelectedDay(day);
  }, []);

  const totalPostsInMonth = posts.filter((p) => isSameMonth(parseISO(p.scheduledFor), currentMonth)).length;

  return (
    <div className="space-y-5">
      {/* ---- Header row ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/20">
            <CalendarIcon className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Content Calendar</h2>
            <p className="text-xs text-muted-foreground hidden sm:block">Plan and track your social media posts</p>
          </div>
        </div>
        <Button size="sm" className="gap-2 shadow-sm" onClick={() => setShowScheduleDialog(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Schedule Post</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {/* ---- Month navigation + stats ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card dark:bg-card rounded-xl border p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={handleToday}
            className="text-sm sm:text-base font-semibold tracking-tight min-w-[160px] text-center hover:text-primary transition-colors duration-150"
            title="Go to today"
          >
            {format(currentMonth, 'MMMM yyyy')}
          </button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <StatsBar counts={dayCounts} />
      </div>

      {/* ---- Calendar grid ---- */}
      <div className="bg-card dark:bg-card rounded-xl border overflow-hidden">
        {postsLoading ? (
          <div className="p-3 sm:p-4">
            <SkeletonGrid />
          </div>
        ) : totalPostsInMonth === 0 && dayCounts.length === 0 ? (
          <EmptyMonth onSchedule={() => setShowScheduleDialog(true)} />
        ) : (
          <div className="p-2 sm:p-3">
            {/* Weekday header */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-2">
                  <span className="hidden sm:inline">{d}</span>
                  <span className="sm:hidden">{d.charAt(0)}</span>
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {gridDays.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const dayPosts = postsMap.get(key) ?? [];
                const selected = selectedDay ? isSameDay(day, selectedDay) : false;
                return (
                  <DayCell
                    key={key}
                    day={day}
                    currentMonth={currentMonth}
                    isSelected={selected}
                    posts={dayPosts}
                    onClick={handleDayClick}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ---- Legend (below grid) ---- */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
          Scheduled
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400" />
          Published
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
          Publishing
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400" />
          Failed
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
          Cancelled
        </div>
      </div>

      {/* ---- Day detail sheet ---- */}
      <DayPostsSheet
        open={!!selectedDay}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null);
        }}
        day={selectedDay}
        posts={selectedDayPosts}
      />

      {/* ---- Schedule dialog ---- */}
      <SchedulePostDialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog} defaultDate={selectedDay} />
    </div>
  );
}
