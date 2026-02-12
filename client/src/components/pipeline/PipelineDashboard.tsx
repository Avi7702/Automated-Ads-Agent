// @ts-nocheck
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarClock,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Calendar,
  Send,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PostStatusBadge } from '@/components/calendar/PostStatusBadge';
import { PostDetailSheet } from './PostDetailSheet';
import { cn } from '@/lib/utils';
import { useDashboardData, type DashboardActivity } from '@/hooks/useScheduledPosts';
import type { ScheduledPost } from '@/hooks/useScheduledPosts';

/* ------------------------------------------------------------------ */
/*  Stats config                                                        */
/* ------------------------------------------------------------------ */

const STATS_CONFIG = [
  {
    key: 'upcoming' as const,
    label: 'Upcoming',
    icon: CalendarClock,
    border: 'border-l-blue-500',
    bg: 'bg-blue-50/60 dark:bg-blue-950/30',
    iconColor: 'text-blue-500',
  },
  {
    key: 'publishing' as const,
    label: 'Publishing',
    icon: Loader2,
    border: 'border-l-amber-500',
    bg: 'bg-amber-50/60 dark:bg-amber-950/30',
    iconColor: 'text-amber-500',
    spin: true,
  },
  {
    key: 'published' as const,
    label: 'Published',
    icon: CheckCircle,
    border: 'border-l-green-500',
    bg: 'bg-green-50/60 dark:bg-green-950/30',
    iconColor: 'text-green-500',
  },
  {
    key: 'failed' as const,
    label: 'Failed',
    icon: AlertTriangle,
    border: 'border-l-red-500',
    bg: 'bg-red-50/60 dark:bg-red-950/30',
    iconColor: 'text-red-500',
  },
];

/* ------------------------------------------------------------------ */
/*  Platform helpers                                                    */
/* ------------------------------------------------------------------ */

const PLATFORM_CONFIG: Record<string, { label: string; gradient: string }> = {
  linkedin: {
    label: 'LI',
    gradient: 'bg-gradient-to-br from-blue-600 to-blue-800',
  },
  instagram: {
    label: 'IG',
    gradient: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
  },
  facebook: {
    label: 'FB',
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-700',
  },
  twitter: {
    label: 'X',
    gradient: 'bg-gradient-to-br from-gray-800 to-black dark:from-gray-200 dark:to-white',
  },
  tiktok: {
    label: 'TT',
    gradient: 'bg-gradient-to-br from-gray-900 via-pink-500 to-cyan-400',
  },
};

const STATUS_DOT_COLOR: Record<string, string> = {
  scheduled: 'bg-blue-500',
  publishing: 'bg-amber-500',
  published: 'bg-green-500',
  failed: 'bg-red-500',
  draft: 'bg-gray-400',
  cancelled: 'bg-gray-400',
};

const PLATFORM_NAMES: Record<string, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'X',
  tiktok: 'TikTok',
};

/* ------------------------------------------------------------------ */
/*  Time formatting helper                                              */
/* ------------------------------------------------------------------ */

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function formatScheduledTime(isoString: string): string {
  const date = new Date(isoString);
  return (
    date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }) +
    ' at ' +
    date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
  );
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                  */
/* ------------------------------------------------------------------ */

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: 'easeOut' },
  }),
};

const activityVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.2 + i * 0.06, duration: 0.3, ease: 'easeOut' },
  }),
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function PlatformBadge({ platform }: { platform: string }) {
  const config = PLATFORM_CONFIG[platform] ?? PLATFORM_CONFIG.linkedin;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center h-7 w-7 rounded-full text-[10px] font-bold text-white shrink-0',
        config.gradient,
      )}
    >
      {config.label}
    </span>
  );
}

function ActivityItem({
  item,
  index,
  totalItems,
  onClick,
}: {
  item: DashboardActivity;
  index: number;
  totalItems: number;
  onClick?: () => void;
}) {
  const dotColor = STATUS_DOT_COLOR[item.status] ?? 'bg-gray-400';
  const isPublishing = item.status === 'publishing';
  const isLast = index === totalItems - 1;

  return (
    <motion.div
      custom={index}
      variants={activityVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'relative flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50',
        index % 2 === 0 && 'bg-muted/30',
      )}
      onClick={onClick}
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center pt-1.5">
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-background',
            dotColor,
            isPublishing && 'animate-pulse',
          )}
        />
        {!isLast && <span className="w-px flex-1 bg-border mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {item.platform && <PlatformBadge platform={item.platform} />}
          <p className="text-sm font-medium truncate max-w-xs sm:max-w-md">{item.caption}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <PostStatusBadge status={item.status} />

          {item.status === 'published' && item.publishedAt && (
            <span className="text-xs text-muted-foreground">{formatRelativeTime(item.publishedAt)}</span>
          )}

          {item.status === 'scheduled' && item.scheduledFor && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatScheduledTime(item.scheduledFor)}
            </span>
          )}

          {item.status === 'published' && item.platformPostUrl && (
            <a
              href={item.platformPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View on {PLATFORM_NAMES[item.platform ?? ''] ?? item.platform}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {item.status === 'failed' && item.errorMessage && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-red-600 dark:text-red-400">{item.errorMessage}</span>
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs gap-1" onClick={(e) => e.stopPropagation()}>
              <RotateCcw className="h-3 w-3" />
              Retry
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function PipelineDashboard() {
  const { data, isLoading } = useDashboardData();
  const stats = data?.stats ?? { upcoming: 0, publishing: 0, published: 0, failed: 0 };
  const activity = data?.recentActivity ?? [];

  const [selectedPost, setSelectedPost] = useState<(ScheduledPost & { platform?: string }) | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openPostDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/calendar/posts/${id}`, { credentials: 'include' });
      if (res.ok) {
        const post = await res.json();
        setSelectedPost(post);
        setDetailOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch post details:', err);
    }
  };

  return (
    <div className="space-y-6">
      <PostDetailSheet open={detailOpen} onOpenChange={setDetailOpen} post={selectedPost} />

      {/* ---- Stats Cards ---- */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS_CONFIG.map((config, i) => {
            const Icon = config.icon;
            return (
              <motion.div key={config.key} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                <Card className={cn('border-l-4 shadow-sm', config.border, config.bg)}>
                  <CardContent className="p-4 relative">
                    <Icon
                      className={cn(
                        'absolute top-3 right-3 h-5 w-5 opacity-60',
                        config.iconColor,
                        config.spin && 'animate-spin',
                      )}
                    />
                    <p className="text-3xl font-bold tracking-tight">{stats[config.key]}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{config.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ---- Body: Activity Feed + Quick Actions ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Activity Feed */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Publishing Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-0">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 px-4 py-3 animate-pulse">
                    <div className="h-2.5 w-2.5 rounded-full bg-muted mt-1.5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No publishing activity yet</p>
                <p className="text-sm mt-1">Schedule your first post to see it here</p>
              </div>
            ) : (
              activity.map((item, i) => (
                <ActivityItem
                  key={item.id}
                  item={item}
                  index={i}
                  totalItems={activity.length}
                  onClick={() => openPostDetail(item.id)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
        >
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full gap-2" size="sm">
                <Calendar className="h-4 w-4" />
                Schedule Post
              </Button>
              <Button variant="outline" className="w-full gap-2" size="sm">
                <Send className="h-4 w-4" />
                Publish Now
              </Button>
              <Button
                variant="link"
                className="w-full text-xs text-muted-foreground"
                size="sm"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'calendar');
                  window.history.replaceState(null, '', url.toString());
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
              >
                View Calendar
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
