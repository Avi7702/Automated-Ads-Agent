/**
 * PhoenixContentCalendar — Compact content calendar for the Phoenix Studio
 *
 * Shows a week-at-a-glance view of scheduled/planned posts,
 * integrated into the Studio as a collapsible panel.
 * The agent can populate this calendar via the weekly planner playbook.
 */
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Calendar, ChevronLeft, ChevronRight, Plus, ImageIcon, Video, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWeeklyPlan } from '@/hooks/useWeeklyPlan';

// ── Types ─────────────────────────────────────────────────

interface CalendarPost {
  id: number;
  title: string;
  platform?: string;
  mediaType?: 'image' | 'video' | 'carousel' | 'text';
  status: 'draft' | 'pending' | 'approved' | 'published';
  scheduledTime?: string;
  thumbnailUrl?: string | null;
}

interface CalendarDay {
  date: Date;
  isToday: boolean;
  isWeekend: boolean;
  posts: CalendarPost[];
}

interface PhoenixContentCalendarProps {
  className?: string;
  onRequestGenerate?: (date: Date) => void;
}

// ── Helpers ───────────────────────────────────────────────

function getWeekDays(weekOffset: number): Date[] {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7); // Monday

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Post Chip ─────────────────────────────────────────────

function PostChip({ post }: { post: CalendarPost }) {
  const statusColors = {
    draft: 'bg-gray-500/10 border-gray-500/20',
    pending: 'bg-yellow-500/10 border-yellow-500/20',
    approved: 'bg-green-500/10 border-green-500/20',
    published: 'bg-blue-500/10 border-blue-500/20',
  };

  const mediaIcons = {
    image: ImageIcon,
    video: Video,
    carousel: ImageIcon,
    text: FileText,
  };
  const Icon = mediaIcons[post.mediaType ?? 'image'] ?? ImageIcon;

  return (
    <div
      className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px]', statusColors[post.status])}
      title={`${post.title} (${post.status})`}
    >
      <Icon className="w-2.5 h-2.5 flex-shrink-0" />
      <span className="truncate max-w-[80px]">{post.title}</span>
    </div>
  );
}

// ── Day Cell ──────────────────────────────────────────────

function DayCell({ day, onAddPost }: { day: CalendarDay; onAddPost?: () => void }) {
  return (
    <div
      className={cn(
        'flex flex-col min-h-[80px] p-1.5 border-r border-b border-border/30 last:border-r-0',
        day.isToday && 'bg-primary/5',
        day.isWeekend && 'bg-muted/20',
      )}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-1">
        <span className={cn('text-[10px] font-medium', day.isToday ? 'text-primary' : 'text-muted-foreground')}>
          {day.date.getDate()}
        </span>
        {onAddPost && (
          <button
            onClick={onAddPost}
            className="w-4 h-4 rounded flex items-center justify-center hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Plus className="w-2.5 h-2.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Posts */}
      <div className="space-y-0.5 flex-1">
        {day.posts.slice(0, 3).map((post) => (
          <PostChip key={post.id} post={post} />
        ))}
        {day.posts.length > 3 && (
          <span className="text-[9px] text-muted-foreground pl-1">+{day.posts.length - 3} more</span>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────

export function PhoenixContentCalendar({ className, onRequestGenerate }: PhoenixContentCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const { data: weeklyPlanData, isLoading } = useWeeklyPlan();

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const today = useMemo(() => new Date(), []);

  // Map weekly plan data to calendar days
  const calendarDays: CalendarDay[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posts: CalendarPost[] = ((weeklyPlanData as any)?.posts ?? []).map((p: any) => ({
      id: p.id,
      title: p.title ?? p.topic ?? `Post #${p.id}`,
      platform: p.platform,
      mediaType: p.mediaType ?? 'image',
      status: p.status ?? 'draft',
      scheduledTime: p.scheduledFor ?? p.scheduledDate,
      thumbnailUrl: p.thumbnailUrl ?? p.imageUrl,
    }));

    return weekDays.map((date) => ({
      date,
      isToday: isSameDay(date, today),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      posts: posts.filter((p: CalendarPost) => {
        if (!p.scheduledTime) return false;
        return isSameDay(new Date(p.scheduledTime), date);
      }),
    }));
  }, [weekDays, weeklyPlanData, today]);

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    if (!start || !end) return '';
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${fmt(start)} - ${fmt(end)}`;
  }, [weekDays]);

  const totalPosts = calendarDays.reduce((sum, d) => sum + d.posts.length, 0);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Content Calendar</span>
          {totalPosts > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {totalPosts} posts
            </Badge>
          )}
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{weekLabel}</span>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-[10px] text-primary hover:underline">
              Today
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setWeekOffset((w) => w + 1)}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border/30">
            {DAY_NAMES.map((name, i) => (
              <div
                key={name}
                className={cn(
                  'text-center text-[10px] font-medium py-1 text-muted-foreground',
                  (i === 5 || i === 6) && 'text-muted-foreground/50',
                )}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 group">
            {calendarDays.map((day) => (
              <DayCell
                key={day.date.toISOString()}
                day={day}
                onAddPost={onRequestGenerate ? () => onRequestGenerate(day.date) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PhoenixContentCalendar;
