// @ts-nocheck
/**
 * PostDetailSheet — Slide-over panel showing full post lifecycle details
 *
 * Features:
 *   - Platform-branded header with status badge
 *   - Image preview or gradient placeholder
 *   - Full caption with hashtags + character count
 *   - Status timeline showing the complete lifecycle
 *   - Context-sensitive action buttons (View/Retry/Reschedule/Cancel)
 *   - Metadata footer with post ID, dates, retry count
 *
 * Dark-mode aware. Fully responsive.
 */

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ExternalLink,
  RotateCcw,
  Calendar,
  Copy,
  XCircle,
  Image as ImageIcon,
  Hash,
  Clock,
  Send,
  Check,
  AlertTriangle,
  Loader2,
  FileText,
  Globe,
  Info,
} from 'lucide-react';
import { PostStatusBadge } from '@/components/calendar/PostStatusBadge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ScheduledPost } from '@/hooks/useScheduledPosts';
import { useRetryPost, useCancelPost } from '@/hooks/useScheduledPosts';
import { SchedulePostDialog } from '@/components/calendar/SchedulePostDialog';

/* ------------------------------------------------------------------ */
/*  Platform styling                                                    */
/* ------------------------------------------------------------------ */

const PLATFORM_GRADIENTS: Record<string, string> = {
  instagram: 'from-pink-500 via-purple-500 to-indigo-500',
  linkedin: 'from-blue-600 to-blue-800',
  facebook: 'from-blue-500 to-blue-700',
  twitter: 'from-sky-400 to-sky-600',
  x: 'from-zinc-700 to-zinc-900',
  tiktok: 'from-pink-500 via-red-500 to-yellow-500',
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  twitter: 'X (Twitter)',
  x: 'X (Twitter)',
  tiktok: 'TikTok',
};

const PLATFORM_PILL_STYLES: Record<string, string> = {
  instagram: 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white',
  linkedin: 'bg-blue-600 text-white',
  facebook: 'bg-blue-500 text-white',
  twitter: 'bg-sky-500 text-white',
  x: 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900',
  tiktok: 'bg-black text-white dark:bg-white dark:text-black',
};

const CHAR_LIMITS: Record<string, number> = {
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
  twitter: 280,
  x: 280,
  tiktok: 2200,
};

/* ------------------------------------------------------------------ */
/*  Timeline step config                                                */
/* ------------------------------------------------------------------ */

interface TimelineStep {
  label: string;
  icon: React.ElementType;
  timestamp: string | null;
  state: 'done' | 'current' | 'future' | 'error';
  detail?: string;
}

function buildTimeline(post: ScheduledPost): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const s = post.status;

  // 1. Created
  steps.push({
    label: 'Created',
    icon: FileText,
    timestamp: post.createdAt,
    state: 'done',
  });

  // 2. Scheduled
  if (s === 'draft') {
    steps.push({
      label: 'Scheduled',
      icon: Clock,
      timestamp: null,
      state: 'future',
    });
    return steps;
  }

  steps.push({
    label: 'Scheduled',
    icon: Clock,
    timestamp: post.scheduledFor,
    state: 'done',
  });

  // 3. Publishing
  if (s === 'scheduled') {
    steps.push({
      label: 'Publishing',
      icon: Send,
      timestamp: null,
      state: 'future',
      detail: 'Waiting for scheduled time',
    });
    return steps;
  }

  if (s === 'publishing') {
    steps.push({
      label: 'Publishing',
      icon: Loader2,
      timestamp: null,
      state: 'current',
      detail: 'In progress via n8n...',
    });
    return steps;
  }

  if (s === 'cancelled') {
    steps.push({
      label: 'Cancelled',
      icon: XCircle,
      timestamp: post.updatedAt,
      state: 'error',
    });
    return steps;
  }

  // For published or failed, publishing step is done
  steps.push({
    label: 'Publishing',
    icon: Send,
    timestamp: null,
    state: 'done',
  });

  // 4. Published or Failed
  if (s === 'published') {
    steps.push({
      label: 'Published',
      icon: Check,
      timestamp: post.publishedAt,
      state: 'done',
      detail: post.platformPostUrl || undefined,
    });
  } else if (s === 'failed') {
    steps.push({
      label: 'Failed',
      icon: AlertTriangle,
      timestamp: post.updatedAt,
      state: 'error',
      detail: post.errorMessage || 'Unknown error',
    });
  }

  return steps;
}

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

interface PostDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: ScheduledPost | null;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

export function PostDetailSheet({ open, onOpenChange, post }: PostDetailSheetProps) {
  const { toast } = useToast();
  const retryPost = useRetryPost();
  const cancelPost = useCancelPost();
  const [showReschedule, setShowReschedule] = useState(false);

  const timeline = useMemo(() => (post ? buildTimeline(post) : []), [post]);

  if (!post) return null;

  const platform = (post as any).platform || 'linkedin';
  const platformLabel = PLATFORM_LABELS[platform.toLowerCase()] || platform;
  const pillStyle = PLATFORM_PILL_STYLES[platform.toLowerCase()] || 'bg-muted text-muted-foreground';
  const gradient = PLATFORM_GRADIENTS[platform.toLowerCase()] || 'from-gray-400 to-gray-600';
  const charLimit = CHAR_LIMITS[platform.toLowerCase()] || 3000;
  const captionLength = post.caption?.length || 0;

  const isPublished = post.status === 'published';
  const isFailed = post.status === 'failed';
  const isScheduled = post.status === 'scheduled';
  const isPublishing = post.status === 'publishing';
  const isDraft = post.status === 'draft';

  const handleCopyUrl = () => {
    if (post.platformPostUrl) {
      navigator.clipboard.writeText(post.platformPostUrl);
      toast({ title: 'Copied', description: 'Post URL copied to clipboard.' });
    }
  };

  const handleRetry = async () => {
    if (!post) return;
    try {
      await retryPost.mutateAsync({ postId: post.id });
      toast({ title: 'Post re-queued', description: 'The post has been scheduled for retry.' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Retry failed', description: err.message || 'Could not retry post.', variant: 'destructive' });
    }
  };

  const handleReschedule = () => {
    setShowReschedule(true);
  };

  const handleCancelPost = async () => {
    if (!post) return;
    try {
      await cancelPost.mutateAsync(post.id);
      toast({ title: 'Post cancelled', description: 'The scheduled post has been cancelled.' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Cancel failed', description: err.message || 'Could not cancel post.', variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col overflow-hidden">
        {/* ---- Header ---- */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-muted/30 dark:bg-muted/10 flex-shrink-0">
          <SheetTitle className="sr-only">Post Details</SheetTitle>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Platform pill */}
              <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', pillStyle)}>{platformLabel}</span>
              <PostStatusBadge status={post.status} />
            </div>
          </div>
        </SheetHeader>

        {/* ---- Scrollable body ---- */}
        <div className="flex-1 overflow-y-auto">
          {/* Image preview */}
          <div className="px-6 pt-5">
            {post.imageUrl ? (
              <img
                src={post.imageUrl}
                alt=""
                className="w-full rounded-xl object-cover max-h-56 ring-1 ring-black/5 dark:ring-white/10"
                loading="lazy"
              />
            ) : (
              <div
                className={cn(
                  'w-full h-32 rounded-xl flex items-center justify-center bg-gradient-to-br',
                  gradient,
                  'opacity-60',
                )}
              >
                <ImageIcon className="h-8 w-8 text-white/60" />
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="px-6 pt-4 pb-2">
            {post.caption ? (
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{post.caption}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No caption</p>
            )}

            {/* Hashtags */}
            {post.hashtags && post.hashtags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <Hash className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                {post.hashtags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Character count */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    captionLength / charLimit > 0.9
                      ? 'bg-red-500'
                      : captionLength / charLimit > 0.7
                        ? 'bg-amber-500'
                        : 'bg-green-500',
                  )}
                  style={{ width: `${Math.min((captionLength / charLimit) * 100, 100)}%` }}
                />
              </div>
              <span
                className={cn(
                  'text-[11px] tabular-nums font-medium',
                  captionLength > charLimit ? 'text-red-500' : 'text-muted-foreground',
                )}
              >
                {captionLength.toLocaleString()}/{charLimit.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="px-6">
            <Separator className="my-4" />
          </div>

          {/* Status Timeline */}
          <div className="px-6 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Post Lifecycle</p>

            <div className="relative">
              {timeline.map((step, idx) => {
                const isLast = idx === timeline.length - 1;
                const Icon = step.icon;

                return (
                  <div key={idx} className="relative flex gap-3 pb-5 last:pb-0">
                    {/* Connecting line */}
                    {!isLast && (
                      <div
                        className={cn(
                          'absolute left-[11px] top-7 w-0.5 bottom-0',
                          step.state === 'done'
                            ? 'bg-green-300 dark:bg-green-700'
                            : step.state === 'current'
                              ? 'bg-amber-300 dark:bg-amber-700'
                              : step.state === 'error'
                                ? 'bg-red-300 dark:bg-red-700'
                                : 'bg-border/50',
                        )}
                      />
                    )}

                    {/* Dot */}
                    <div
                      className={cn(
                        'relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 border-background',
                        step.state === 'done' && 'bg-green-500',
                        step.state === 'current' && 'bg-amber-500 animate-pulse',
                        step.state === 'error' && 'bg-red-500',
                        step.state === 'future' && 'bg-muted-foreground/20 dark:bg-muted-foreground/30',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-3 w-3',
                          step.state === 'future' ? 'text-muted-foreground/50' : 'text-white',
                          step.state === 'current' && step.icon === Loader2 && 'animate-spin',
                        )}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            step.state === 'future'
                              ? 'text-muted-foreground/60'
                              : step.state === 'error'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-foreground',
                          )}
                        >
                          {step.label}
                        </span>
                        {step.timestamp && (
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(step.timestamp), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </div>

                      {/* Detail line */}
                      {step.detail && step.state === 'error' && (
                        <div className="mt-1.5 flex items-start gap-1.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
                          <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">{step.detail}</p>
                        </div>
                      )}

                      {step.detail && step.state === 'done' && step.label === 'Published' && (
                        <a
                          href={step.detail}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View on {platformLabel}
                        </a>
                      )}

                      {step.detail && step.state === 'current' && (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{step.detail}</p>
                      )}

                      {step.detail && step.state === 'future' && (
                        <p className="mt-1 text-xs text-muted-foreground/50">{step.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-6">
            <Separator className="my-2" />
          </div>

          {/* Actions */}
          <div className="px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {isPublished && post.platformPostUrl && (
                <>
                  <Button size="sm" className="gap-1.5" asChild>
                    <a href={post.platformPostUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      View on {platformLabel}
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyUrl}>
                    <Copy className="h-3.5 w-3.5" />
                    Copy URL
                  </Button>
                </>
              )}

              {isFailed && (
                <>
                  <Button size="sm" className="gap-1.5" onClick={handleRetry} disabled={retryPost.isPending}>
                    {retryPost.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    {retryPost.isPending ? 'Retrying...' : 'Retry'}
                  </Button>
                </>
              )}

              {isScheduled && (
                <>
                  <Button size="sm" className="gap-1.5" onClick={handleReschedule}>
                    <Calendar className="h-3.5 w-3.5" />
                    Reschedule
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    onClick={handleCancelPost}
                    disabled={cancelPost.isPending}
                  >
                    {cancelPost.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {cancelPost.isPending ? 'Cancelling...' : 'Cancel'}
                  </Button>
                </>
              )}

              {isDraft && (
                <Button size="sm" className="gap-1.5" onClick={handleReschedule}>
                  <Calendar className="h-3.5 w-3.5" />
                  Schedule
                </Button>
              )}

              {isPublishing && (
                <Button variant="outline" size="sm" className="gap-1.5" disabled title="Cannot cancel while publishing">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Publishing...
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ---- Metadata Footer ---- */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-border/50 bg-muted/20 dark:bg-muted/5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Info className="h-3 w-3" />
              {post.id.length > 12 ? `${post.id.slice(0, 12)}...` : post.id}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Created {format(parseISO(post.createdAt), 'MMM d, yyyy')}
            </span>
            {post.retryCount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <RotateCcw className="h-3 w-3" />
                {post.retryCount} {post.retryCount === 1 ? 'retry' : 'retries'}
              </span>
            )}
            {post.generationId && (
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Studio: {post.generationId.slice(0, 8)}...
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </span>
          </div>
        </div>
      </SheetContent>

      {post && (
        <SchedulePostDialog
          open={showReschedule}
          onOpenChange={setShowReschedule}
          prefill={{
            caption: post.caption,
            imageUrl: post.imageUrl ?? undefined,
            generationId: post.generationId ?? undefined,
          }}
        />
      )}
    </Sheet>
  );
}
