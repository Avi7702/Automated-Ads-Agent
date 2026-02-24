/**
 * useWeeklyPlan — React Query hooks for weekly content planner
 *
 * Provides:
 * - useWeeklyPlan(weekStart?) — Fetch/generate plan for a week
 * - useUpdatePlanPost(planId)  — Mutation to update a post's status
 * - useRegeneratePlan()        — Mutation to regenerate a plan
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { WeeklyPlan, WeeklyPlanPost } from '@shared/schema';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UpdatePlanPostInput {
  planId: string;
  index: number;
  status: WeeklyPlanPost['status'];
  generationId?: string;
  scheduledPostId?: string;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Fetch or generate the weekly plan.
 * - No weekStart → GET /api/planner/weekly/current
 * - With weekStart → GET /api/planner/weekly?weekStart=ISO
 */
export function useWeeklyPlan(weekStart?: string) {
  return useQuery<WeeklyPlan>({
    queryKey: ['weekly-plan', weekStart ?? 'current'],
    queryFn: async () => {
      const url = weekStart
        ? `/api/planner/weekly?weekStart=${encodeURIComponent(weekStart)}`
        : '/api/planner/weekly/current';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Failed to fetch weekly plan');
      }
      return res.json() as Promise<WeeklyPlan>;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Update a single post's status within a plan.
 * PATCH /api/planner/weekly/:planId/posts/:index
 */
export function useUpdatePlanPost() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, UpdatePlanPostInput>({
    mutationFn: async ({ planId, index, status, generationId, scheduledPostId }) => {
      const res = await apiRequest('PATCH', `/api/planner/weekly/${planId}/posts/${index}`, {
        status,
        generationId,
        scheduledPostId,
      });
      return res.json() as Promise<{ message: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan'] });
    },
  });
}

/**
 * Regenerate a weekly plan with fresh data.
 * POST /api/planner/weekly/:planId/regenerate
 */
export function useRegeneratePlan() {
  const queryClient = useQueryClient();

  return useMutation<WeeklyPlan, Error, string>({
    mutationFn: async (planId) => {
      const res = await apiRequest('POST', `/api/planner/weekly/${planId}/regenerate`);
      return res.json() as Promise<WeeklyPlan>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan'] });
    },
  });
}
