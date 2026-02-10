// @ts-nocheck
/**
 * useScheduledPosts — React Query hook for calendar data
 *
 * Provides:
 * - posts for a visible date range
 * - day counts for dot indicators
 * - schedule / reschedule / cancel mutations (with optimistic updates)
 * - retry mutation for failed posts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ScheduledPost {
  id: string;
  userId: string;
  connectionId: string;
  caption: string;
  hashtags: string[] | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  scheduledFor: string;
  timezone: string;
  status: string;
  publishedAt: string | null;
  platformPostId: string | null;
  platformPostUrl: string | null;
  errorMessage: string | null;
  retryCount: number;
  generationId: string | null;
  templateId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DayCount {
  date: string;
  total: number;
  scheduled: number;
  published: number;
  failed: number;
}

export interface SchedulePostInput {
  connectionId: string;
  caption: string;
  hashtags?: string[];
  imageUrl?: string;
  imagePublicId?: string;
  scheduledFor: string; // ISO 8601
  timezone?: string;
  generationId?: string;
  templateId?: string;
}

/** Typed error returned by calendar API mutations */
export interface CalendarApiError {
  message: string;
  status: number;
  code?: string;
}

/* ------------------------------------------------------------------ */
/*  Fetch helpers                                                      */
/* ------------------------------------------------------------------ */

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch('/api/csrf-token', { credentials: 'include' });
  const data = await res.json();
  return data.csrfToken;
}

/** Parse an API error response into a typed CalendarApiError */
async function parseApiError(res: Response, fallbackMsg: string): Promise<CalendarApiError> {
  const data = await res.json().catch(() => ({}));
  return {
    message: data.error || fallbackMsg,
    status: res.status,
    code: data.code,
  };
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Fetch scheduled posts for a date range (calendar grid).
 * Refetches every 30 seconds to catch n8n status changes.
 */
export function useCalendarPosts(startDate: string, endDate: string) {
  return useQuery<ScheduledPost[]>({
    queryKey: ['calendar-posts', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ start: startDate, end: endDate });
      const res = await fetch(`/api/calendar/posts?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch calendar posts');
      return res.json();
    },
    enabled: !!startDate && !!endDate,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

/**
 * Fetch post counts per day for a given month (dot indicators).
 * Refetches every 30 seconds to stay in sync.
 */
export function useCalendarCounts(year: number, month: number) {
  return useQuery<DayCount[]>({
    queryKey: ['calendar-counts', year, month],
    queryFn: async () => {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
      });
      const res = await fetch(`/api/calendar/counts?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch calendar counts');
      return res.json();
    },
    enabled: year > 0 && month > 0,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

/**
 * Schedule a new post.
 */
export function useSchedulePost() {
  const queryClient = useQueryClient();

  return useMutation<ScheduledPost, CalendarApiError, SchedulePostInput>({
    mutationFn: async (input) => {
      const csrfToken = await fetchCsrfToken();
      const res = await fetch('/api/calendar/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        throw await parseApiError(res, 'Failed to schedule post');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-posts'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-counts'] });
    },
  });
}

/**
 * Reschedule an existing post to a new date.
 * Applies optimistic update: immediately moves the post to the new date in cache,
 * and rolls back on error.
 */
export function useReschedulePost() {
  const queryClient = useQueryClient();

  return useMutation<ScheduledPost, CalendarApiError, { postId: string; scheduledFor: string }>({
    mutationFn: async ({ postId, scheduledFor }) => {
      const csrfToken = await fetchCsrfToken();
      const res = await fetch(`/api/calendar/posts/${postId}/reschedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ scheduledFor }),
      });
      if (!res.ok) {
        throw await parseApiError(res, 'Failed to reschedule post');
      }
      return res.json();
    },
    onMutate: async ({ postId, scheduledFor }) => {
      // Cancel in-flight queries so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['calendar-posts'] });

      // Snapshot every calendar-posts cache entry for rollback
      const previousEntries = queryClient.getQueriesData<ScheduledPost[]>({
        queryKey: ['calendar-posts'],
      });

      // Optimistically update cached posts: move the post to the new date
      queryClient.setQueriesData<ScheduledPost[]>({ queryKey: ['calendar-posts'] }, (old) => {
        if (!old) return old;
        return old.map((post) =>
          post.id === postId ? { ...post, scheduledFor, updatedAt: new Date().toISOString() } : post,
        );
      });

      return { previousEntries };
    },
    onError: (_err, _vars, context) => {
      // Roll back all calendar-posts caches to their pre-mutation state
      if (context?.previousEntries) {
        for (const [queryKey, data] of context.previousEntries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-posts'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-counts'] });
    },
  });
}

/**
 * Cancel a scheduled post.
 * Applies optimistic update: immediately marks the post as 'cancelled' in cache,
 * and rolls back on error.
 */
export function useCancelPost() {
  const queryClient = useQueryClient();

  return useMutation<ScheduledPost, CalendarApiError, string>({
    mutationFn: async (postId) => {
      const csrfToken = await fetchCsrfToken();
      const res = await fetch(`/api/calendar/posts/${postId}/cancel`, {
        method: 'PATCH',
        headers: { 'x-csrf-token': csrfToken },
        credentials: 'include',
      });
      if (!res.ok) {
        throw await parseApiError(res, 'Failed to cancel post');
      }
      return res.json();
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['calendar-posts'] });

      const previousEntries = queryClient.getQueriesData<ScheduledPost[]>({
        queryKey: ['calendar-posts'],
      });

      // Optimistically mark the post as cancelled
      queryClient.setQueriesData<ScheduledPost[]>({ queryKey: ['calendar-posts'] }, (old) => {
        if (!old) return old;
        return old.map((post) =>
          post.id === postId ? { ...post, status: 'cancelled', updatedAt: new Date().toISOString() } : post,
        );
      });

      return { previousEntries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousEntries) {
        for (const [queryKey, data] of context.previousEntries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-posts'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-counts'] });
    },
  });
}

/**
 * Retry a failed post by re-scheduling it via POST /api/calendar/schedule.
 * Resets the post status and optionally allows a new scheduledFor date.
 */
export function useRetryPost() {
  const queryClient = useQueryClient();

  return useMutation<ScheduledPost, CalendarApiError, { postId: string; scheduledFor?: string }>({
    mutationFn: async ({ postId, scheduledFor }) => {
      const csrfToken = await fetchCsrfToken();
      const res = await fetch('/api/calendar/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ retryPostId: postId, scheduledFor }),
      });
      if (!res.ok) {
        throw await parseApiError(res, 'Failed to retry post');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-posts'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-counts'] });
    },
  });
}
