/**
 * DayPostsSheet -- Premium slide-over panel showing all posts for a selected day
 *
 * Timeline layout with rich post cards, micro-animations, full mobile support,
 * dark mode, and proper empty/loading/error states.
 */

import { useState, useCallback } from 'react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  XCircle,
  Image as ImageIcon,
  ExternalLink,
  RotateCcw,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Hash,
  Globe,
} from 'lucide-react';
import { PostStatusBadge } from './PostStatusBadge';
import { useCancelPost, useRetryPost } from '@/hooks/useScheduledPosts';
import type { ScheduledPost } from '@/hooks/useScheduledPosts';
import { useToast } from '@/hooks/use-toast';

/* ------------------------------------------------------------------ */
/*  Platform colors for gradient placeholders                          */
/* ------------------------------------------------------------------ */

const PLATFORM_GRADIENTS: Record<string, string> = {
  instagram: 'from-pink-500 via-purple-500 to-indigo-500',
  linkedin: 'from-blue-600 to-blue-800',
  facebook: 'from-blue-500 to-blue-700',
  twitter: 'from-sky-400 to-sky-600',
  x: 'from-zinc-700 to-zinc-900',
  tiktok: 'from-pink-500 via-red-500 to-yellow-500',
};

const PLATFORM_ICONS: Record<string, string> = {
  instagram: 'IG',
  linkedin: 'LI',
  facebook: 'FB',
  twitter: 'X',
  x: 'X',
  tiktok: 'TT',
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface DayPostsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: Date | null;
  posts: ScheduledPost[];
}

/* ------------------------------------------------------------------ */
/*  Helper: day label                                                  */
/* ------------------------------------------------------------------ */

function getDayLabel(day: Date): string {
  if (isToday(day)) return 'Today';
  if (isTomorrow(day)) return 'Tomorrow';
  return format(day, 'EEEE');
}

/* ------------------------------------------------------------------ */
/*  Extended post type for platform/account fields                     */
/* ------------------------------------------------------------------ */
interface ExtendedPost extends ScheduledPost {
  platform?: string;
  accountName?: string;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function DayPostsSheet({ open, onOpenChange, day, posts }: DayPostsSheetProps) {
  const cancelPost = useCancelPost();
  const retryPost = useRetryPost();
  const { toast } = useToast();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleCancel = useCallback(
    async (postId: string) => {
      setCancellingId(postId);
      try {
        await cancelPost.mutateAsync(postId);
        toast({ title: 'Post cancelled', description: 'The scheduled post has been cancelled.' });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        toast({
          title: 'Failed to cancel',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setCancellingId(null);
      }
    },
    [cancelPost, toast],
  );

  const handleRetry = useCallback(
    async (postId: string) => {
      setRetryingId(postId);
      try {
        await retryPost.mutateAsync({ postId });
        toast({ title: 'Post rescheduled for retry', description: 'The post has been queued for retry.' });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        toast({
          title: 'Failed to retry',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setRetryingId(null);
      }
    },
    [retryPost, toast],
  );

  if (!day) return null;

  // Sort posts by scheduled time
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
  );

  const dayLabel = getDayLabel(day);
  const formattedDate = format(day, 'MMMM d, yyyy');

  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;
  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const failedCount = posts.filter((p) => p.status === 'failed').length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col overflow-hidden">
        {/* ---- Header ---- */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-muted/30 dark:bg-muted/10 flex-shrink-0">
          <SheetTitle className="sr-only">
            {dayLabel} — {formattedDate}
          </SheetTitle>

          <div className="space-y-3">
            {/* Day name + date */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-semibold tracking-tight text-foreground">{dayLabel}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{formattedDate}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground/60" />
                <span className="text-sm font-medium text-muted-foreground">
                  {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                </span>
              </div>
            </div>

            {/* Stats pills */}
            {posts.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {scheduledCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {scheduledCount} scheduled
                  </span>
                )}
                {publishedCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {publishedCount} published
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {failedCount} failed
                  </span>
                )}
              </div>
            )}
          </div>
        </SheetHeader>

        {/* ---- Post List ---- */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {sortedPosts.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/60 dark:bg-muted/20 flex items-center justify-center mb-4">
                <Calendar className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground/80 mb-1">No posts for this day</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Schedule a post from the Studio or click the + button on the calendar.
              </p>
            </div>
          ) : (
            /* Timeline */
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border/60 dark:bg-border/30" />

              <div className="space-y-1">
                {sortedPosts.map((post, index) => (
                  <TimelinePostCard
                    key={post.id}
                    post={post as ExtendedPost}
                    index={index}
                    onCancel={handleCancel}
                    onRetry={handleRetry}
                    isCancelling={cancellingId === post.id}
                    isRetrying={retryingId === post.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---- Timezone footer ---- */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-border/50 bg-muted/20 dark:bg-muted/5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Globe className="h-3 w-3" />
            {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeline Post Card                                                 */
/* ------------------------------------------------------------------ */

function TimelinePostCard({
  post,
  index,
  onCancel,
  onRetry,
  isCancelling,
  isRetrying,
}: {
  post: ExtendedPost;
  index: number;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  isCancelling: boolean;
  isRetrying: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const time = format(parseISO(post.scheduledFor), 'h:mm a');
  const canCancel = post.status === 'scheduled' || post.status === 'draft';
  const isCancelled = post.status === 'cancelled';
  const isFailed = post.status === 'failed';
  const isPublishing = post.status === 'publishing';
  const isPublished = post.status === 'published';

  const platform = post.platform ?? '';
  const accountName = post.accountName ?? '';
  const gradient = PLATFORM_GRADIENTS[platform.toLowerCase()] ?? 'from-gray-400 to-gray-600';
  const platformLabel = PLATFORM_ICONS[platform.toLowerCase()] ?? '';

  // Caption truncation
  const isLongCaption = post.caption && post.caption.length > 180;

  return (
    <div className="relative pl-10 pb-4 group" style={{ animationDelay: `${index * 40}ms` }}>
      {/* Timeline dot */}
      <div
        className={`
          absolute left-2.5 top-3 w-4 h-4 rounded-full border-2 border-background z-10
          transition-transform duration-200 group-hover:scale-110
          ${isFailed ? 'bg-red-500' : ''}
          ${isPublished ? 'bg-green-500' : ''}
          ${isPublishing ? 'bg-yellow-500 animate-pulse' : ''}
          ${isCancelled ? 'bg-muted-foreground/30' : ''}
          ${post.status === 'scheduled' ? 'bg-blue-500' : ''}
          ${post.status === 'draft' ? 'bg-gray-400 dark:bg-gray-600' : ''}
        `}
      />

      {/* Card */}
      <div
        className={`
          rounded-xl border transition-all duration-200
          hover:shadow-md hover:border-border
          ${
            isCancelled
              ? 'bg-muted/40 dark:bg-muted/10 border-border/40 opacity-60'
              : 'bg-card border-border/60 shadow-sm'
          }
          ${isFailed ? 'border-red-200 dark:border-red-800/40' : ''}
        `}
      >
        {/* Card header: time + status */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span
              className={`text-sm font-medium ${isCancelled ? 'line-through text-muted-foreground' : 'text-foreground'}`}
            >
              {time}
            </span>
            {platformLabel && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {platformLabel}
              </span>
            )}
            {accountName && <span className="text-xs text-muted-foreground hidden sm:inline">{accountName}</span>}
          </div>
          <PostStatusBadge status={post.status} />
        </div>

        {/* Image + Caption */}
        <div className="flex gap-3 px-4 pb-3">
          {/* Thumbnail */}
          {post.imageUrl ? (
            <img
              src={post.imageUrl}
              alt=""
              className={`
                w-16 h-16 rounded-lg object-cover flex-shrink-0
                ring-1 ring-black/5 dark:ring-white/10
                transition-transform duration-200 group-hover:scale-[1.02]
                ${isCancelled ? 'grayscale' : ''}
              `}
              loading="lazy"
            />
          ) : (
            <div
              className={`
                w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center
                bg-gradient-to-br ${gradient} opacity-80
              `}
            >
              <ImageIcon className="h-5 w-5 text-white/70" />
            </div>
          )}

          {/* Caption */}
          <div className="flex-1 min-w-0">
            {post.caption ? (
              <div>
                <p
                  className={`
                    text-sm leading-relaxed text-foreground/90
                    ${isCancelled ? 'line-through text-muted-foreground' : ''}
                    ${!expanded ? 'line-clamp-3' : ''}
                  `}
                >
                  {post.caption}
                </p>
                {isLongCaption && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="inline-flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 mt-1 transition-colors"
                  >
                    {expanded ? (
                      <>
                        Show less <ChevronUp className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        Show more <ChevronDown className="h-3 w-3" />
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No caption</p>
            )}
          </div>
        </div>

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3">
            <Hash className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
            {post.hashtags.slice(0, 5).map((tag, i) => (
              <span
                key={i}
                className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
            {post.hashtags.length > 5 && (
              <span className="text-[11px] text-muted-foreground">+{post.hashtags.length - 5} more</span>
            )}
          </div>
        )}

        {/* Published link */}
        {post.platformPostUrl && isPublished && (
          <div className="px-4 pb-3">
            <a
              href={post.platformPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors group/link"
            >
              <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5" />
              View on platform
            </a>
          </div>
        )}

        {/* Error message for failed posts */}
        {isFailed && post.errorMessage && (
          <div className="mx-4 mb-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">{post.errorMessage}</p>
          </div>
        )}

        {/* Publishing spinner */}
        {isPublishing && (
          <div className="mx-4 mb-3 flex items-center gap-2 p-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30">
            <Loader2 className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 animate-spin" />
            <p className="text-xs text-yellow-700 dark:text-yellow-300">Publishing to platform...</p>
          </div>
        )}

        {/* Actions */}
        {(canCancel || isFailed) && (
          <div className="flex items-center justify-end gap-2 px-4 pb-3 pt-1 border-t border-border/30 mt-1">
            {isFailed && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 gap-1.5"
                onClick={() => onRetry(post.id)}
                disabled={isRetrying}
              >
                {isRetrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                {isRetrying ? 'Retrying...' : 'Retry'}
              </Button>
            )}
            {canCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1.5"
                onClick={() => onCancel(post.id)}
                disabled={isCancelling}
              >
                {isCancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
