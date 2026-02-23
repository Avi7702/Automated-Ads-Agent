// @ts-nocheck
/**
 * SchedulePostDialog — Premium form dialog to schedule a new post
 *
 * Full validation, character counters with platform-specific limits,
 * live image preview, timezone display, dark mode, and mobile responsive.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar,
  Image as ImageIcon,
  Send,
  Globe,
  AlertCircle,
  Loader2,
  Link2,
  ImageOff,
  Hash,
  ExternalLink,
  GalleryHorizontal,
  CheckCircle2,
} from 'lucide-react';
import { useSchedulePost } from '@/hooks/useScheduledPosts';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Platform character limits                                          */
/* ------------------------------------------------------------------ */

const PLATFORM_LIMITS: Record<string, { name: string; limit: number; icon: string }> = {
  twitter: { name: 'X / Twitter', limit: 280, icon: 'X' },
  x: { name: 'X', limit: 280, icon: 'X' },
  instagram: { name: 'Instagram', limit: 2200, icon: 'IG' },
  facebook: { name: 'Facebook', limit: 63206, icon: 'FB' },
  linkedin: { name: 'LinkedIn', limit: 3000, icon: 'LI' },
  tiktok: { name: 'TikTok', limit: 2200, icon: 'TT' },
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SocialAccount {
  id: string;
  platform: string;
  accountName: string;
  isActive: boolean;
}

interface SchedulePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date | null;
  prefill?: {
    caption?: string;
    imageUrl?: string;
    imagePublicId?: string;
    generationId?: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Validation errors                                                  */
/* ------------------------------------------------------------------ */

interface FormErrors {
  connection?: string;
  caption?: string;
  date?: string;
  imageUrl?: string;
}

/* ------------------------------------------------------------------ */
/*  Helper: simple URL validation                                      */
/* ------------------------------------------------------------------ */

function isValidUrl(str: string): boolean {
  if (!str) return true; // empty is OK — image is optional
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function SchedulePostDialog({ open, onOpenChange, defaultDate, prefill }: SchedulePostDialogProps) {
  const schedulePost = useSchedulePost();

  // Form state
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [connectionId, setConnectionId] = useState('');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePublicId, setImagePublicId] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [imageError, setImageError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Fetch social accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery<SocialAccount[]>({
    queryKey: ['social-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/social/accounts', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

  const activeAccounts = useMemo(() => accounts.filter((a) => a.isActive), [accounts]);

  // Gallery query — fetched lazily when the popover opens
  const { data: galleryImages = [], isFetching: galleryLoading } = useQuery<
    { id: string; generatedImagePath: string; imagePublicId?: string; prompt?: string }[]
  >({
    queryKey: ['gallery-recent'],
    queryFn: async () => {
      const res = await fetch('/api/generations?limit=12&status=completed', { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      return data.generations ?? data.data ?? data ?? [];
    },
    enabled: galleryOpen,
    staleTime: 30_000,
  });

  // Selected account's platform (for character limit)
  const selectedAccount = useMemo(
    () => activeAccounts.find((a) => a.id === connectionId),
    [activeAccounts, connectionId],
  );

  const platformKey = selectedAccount?.platform?.toLowerCase() || '';
  const platformConfig = PLATFORM_LIMITS[platformKey];
  const charLimit = platformConfig?.limit || 0;
  const isOverLimit = charLimit > 0 && caption.length > charLimit;

  // Character counter color
  const charCountColor = useMemo(() => {
    if (!charLimit) return 'text-muted-foreground';
    const ratio = caption.length / charLimit;
    if (ratio > 1) return 'text-red-500 dark:text-red-400 font-semibold';
    if (ratio > 0.9) return 'text-amber-500 dark:text-amber-400';
    if (ratio > 0.75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-muted-foreground';
  }, [caption.length, charLimit]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setDate(defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setTime('10:00');
      setCaption(prefill?.caption ?? '');
      setImageUrl(prefill?.imageUrl ?? '');
      setImagePublicId(prefill?.imagePublicId ?? '');
      setHashtags('');
      setConnectionId('');
      setErrors({});
      setImageError(false);
      setSubmitted(false);
      setGalleryOpen(false);
    }
  }, [open, defaultDate, prefill]);

  // Validate form
  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {};

    if (!connectionId) {
      errs.connection = 'Please select a social account.';
    }

    if (!caption.trim()) {
      errs.caption = 'Caption is required.';
    } else if (isOverLimit) {
      errs.caption = `Caption exceeds ${charLimit} character limit for ${platformConfig?.name || 'this platform'}.`;
    }

    // Date must be in the future
    if (date && time) {
      const scheduled = new Date(`${date}T${time}:00`);
      if (scheduled <= new Date()) {
        errs.date = 'Scheduled time must be in the future.';
      }
    } else if (!date) {
      errs.date = 'Date is required.';
    }

    if (imageUrl && !isValidUrl(imageUrl)) {
      errs.imageUrl = 'Please enter a valid URL (https://...).';
    }

    return errs;
  }, [connectionId, caption, date, time, imageUrl, isOverLimit, charLimit, platformConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const formErrors = validate();
    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) return;

    const scheduledFor = new Date(`${date}T${time}:00`).toISOString();

    // Parse hashtags
    const hashtagList = hashtags
      .split(/[,\s#]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await schedulePost.mutateAsync({
        connectionId,
        caption: caption.trim(),
        hashtags: hashtagList.length > 0 ? hashtagList : undefined,
        imageUrl: imageUrl || undefined,
        imagePublicId: imagePublicId || undefined,
        scheduledFor,
        timezone,
        generationId: prefill?.generationId,
      });

      toast.success('Post scheduled', {
        description: `Scheduled for ${format(new Date(scheduledFor), 'MMM d, yyyy')} at ${format(new Date(scheduledFor), 'h:mm a')}.`,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error('Failed to schedule', {
        description: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      });
    }
  };

  // Re-validate on field changes after first submit attempt
  useEffect(() => {
    if (submitted) {
      setErrors(validate());
    }
  }, [connectionId, caption, date, time, imageUrl, submitted, validate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* ---- Header ---- */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-muted/30 dark:bg-muted/10">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <Send className="h-4 w-4 text-primary" />
            </div>
            Schedule Post
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">Choose when and where to publish your content.</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[60vh]">
            {/* ---- Date & Time Section ---- */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date & Time
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="schedule-date" className="text-xs text-muted-foreground">
                    Date
                  </Label>
                  <Input
                    id="schedule-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    required
                    className={errors.date ? 'border-red-300 dark:border-red-700 focus-visible:ring-red-500' : ''}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="schedule-time" className="text-xs text-muted-foreground">
                    Time
                  </Label>
                  <Input
                    id="schedule-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className={errors.date ? 'border-red-300 dark:border-red-700 focus-visible:ring-red-500' : ''}
                  />
                </div>
              </div>

              {errors.date && (
                <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  {errors.date}
                </div>
              )}

              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Globe className="h-3 w-3" />
                {timezone}
              </div>
            </div>

            {/* ---- Divider ---- */}
            <div className="border-t border-border/40" />

            {/* ---- Social Account Section ---- */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                Social Account
              </div>

              {accountsLoading ? (
                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading accounts...
                </div>
              ) : activeAccounts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">No connected social accounts found.</p>
                  <a
                    href="/pipeline?tab=social"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Connect an account in Pipeline
                  </a>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Select value={connectionId} onValueChange={setConnectionId}>
                    <SelectTrigger
                      className={errors.connection ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : ''}
                    >
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {PLATFORM_LIMITS[acc.platform?.toLowerCase()]?.icon ||
                                acc.platform?.slice(0, 2).toUpperCase()}
                            </span>
                            <span>{acc.accountName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {errors.connection && (
                    <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      {errors.connection}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ---- Divider ---- */}
            <div className="border-t border-border/40" />

            {/* ---- Caption Section ---- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  Caption
                </div>
                {platformConfig && (
                  <span className="text-[11px] text-muted-foreground">
                    {platformConfig.name} limit: {platformConfig.limit.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Textarea
                  id="schedule-caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write your post caption..."
                  rows={5}
                  className={`resize-none ${errors.caption ? 'border-red-300 dark:border-red-700 focus-visible:ring-red-500' : ''}`}
                />

                <div className="flex items-center justify-between">
                  {errors.caption ? (
                    <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      {errors.caption}
                    </div>
                  ) : (
                    <span />
                  )}

                  <span className={`text-xs tabular-nums ${charCountColor}`}>
                    {caption.length.toLocaleString()}
                    {charLimit > 0 && <> / {charLimit.toLocaleString()}</>}
                  </span>
                </div>

                {/* Progress bar for character usage */}
                {charLimit > 0 && caption.length > 0 && (
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOverLimit ? 'bg-red-500' : caption.length / charLimit > 0.9 ? 'bg-amber-500' : 'bg-primary/60'
                      }`}
                      style={{ width: `${Math.min((caption.length / charLimit) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ---- Hashtags Section ---- */}
            <div className="space-y-1.5">
              <Label htmlFor="schedule-hashtags" className="text-xs text-muted-foreground">
                Hashtags (optional, comma or space separated)
              </Label>
              <Input
                id="schedule-hashtags"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#marketing, #brand, #growth"
              />
            </div>

            {/* ---- Divider ---- */}
            <div className="border-t border-border/40" />

            {/* ---- Image Section ---- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  Image (optional)
                </div>
                <Popover open={galleryOpen} onOpenChange={setGalleryOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                      <GalleryHorizontal className="h-3.5 w-3.5" />
                      Pick from Gallery
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="end">
                    {galleryLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : galleryImages.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No gallery images found.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        {galleryImages.map((img) => (
                          <button
                            key={img.id}
                            type="button"
                            className="relative rounded-md overflow-hidden aspect-square focus:outline-none focus:ring-2 focus:ring-primary group"
                            onClick={() => {
                              setImageUrl(img.generatedImagePath);
                              setImagePublicId(img.imagePublicId ?? '');
                              setImageError(false);
                              setGalleryOpen(false);
                            }}
                          >
                            <img
                              src={img.generatedImagePath}
                              alt={img.prompt ?? 'Gallery image'}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                            {imageUrl === img.generatedImagePath && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Input
                  id="schedule-image"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImagePublicId('');
                    setImageError(false);
                  }}
                  placeholder="https://example.com/image.jpg"
                  className={errors.imageUrl ? 'border-red-300 dark:border-red-700 focus-visible:ring-red-500' : ''}
                />

                {errors.imageUrl && (
                  <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {errors.imageUrl}
                  </div>
                )}
              </div>

              {/* Live preview */}
              {imageUrl && isValidUrl(imageUrl) && (
                <div className="rounded-lg border border-border/60 overflow-hidden bg-muted/20">
                  {imageError ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <ImageOff className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground">Could not load image preview</p>
                    </div>
                  ) : (
                    <img
                      src={imageUrl}
                      alt="Post preview"
                      className="w-full max-h-48 object-contain"
                      onError={() => setImageError(true)}
                      loading="lazy"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ---- Footer ---- */}
          <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20 dark:bg-muted/5 gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={schedulePost.isPending || activeAccounts.length === 0}
              className="flex-1 sm:flex-none gap-2"
            >
              {schedulePost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              {schedulePost.isPending ? 'Scheduling...' : 'Schedule Post'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
