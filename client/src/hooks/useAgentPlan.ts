/**
 * useAgentPlan — State machine hook for Agent Mode flow.
 *
 * States: idle -> suggestions -> questions -> preview -> executing -> complete
 *
 * Manages the full lifecycle: fetch suggestions, answer clarifying questions,
 * preview the plan brief, execute it, and handle revisions.
 *
 * Execution uses a 2-second polling interval against GET /api/agent/execution/:executionId
 * to track step-by-step progress.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';
import type { AgentSuggestion, ClarifyingQuestion, PlanBrief, ExecutionStep } from '@shared/types/agentPlan';

export type AgentPlanStage = 'idle' | 'suggestions' | 'questions' | 'preview' | 'executing' | 'complete';

interface AgentPlanDraft {
  stage: AgentPlanStage;
  suggestions: AgentSuggestion[];
  selectedSuggestion: AgentSuggestion | null;
  questions: ClarifyingQuestion[];
  answers: Record<string, string>;
  planBrief: PlanBrief | null;
  executionSteps: ExecutionStep[];
}

const DRAFT_KEY = 'agent-plan-draft';

function loadDraft(): AgentPlanDraft | null {
  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Don't restore if was in executing state — that's not resumable
      if (parsed.stage === 'executing') {
        return { ...parsed, stage: 'preview' };
      }
      return parsed;
    }
  } catch {
    // Corrupted draft, ignore
  }
  return null;
}

function saveDraft(draft: AgentPlanDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // localStorage full or unavailable, ignore
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export interface UseAgentPlanReturn {
  stage: AgentPlanStage;
  suggestions: AgentSuggestion[];
  selectedSuggestion: AgentSuggestion | null;
  questions: ClarifyingQuestion[];
  answers: Record<string, string>;
  planBrief: PlanBrief | null;
  executionSteps: ExecutionStep[];
  error: string | null;
  isLoading: boolean;

  // Actions
  fetchSuggestions: (productIds?: number[]) => Promise<void>;
  selectSuggestion: (suggestion: AgentSuggestion) => void;
  answerQuestion: (questionId: string, answer: string) => void;
  submitAnswers: () => Promise<void>;
  approvePlan: () => Promise<void>;
  revisePlan: (feedback: string) => Promise<void>;
  reset: () => void;
}

// Polling constants
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60; // 2 minutes max

export function useAgentPlan(): UseAgentPlanReturn {
  const draft = useRef(loadDraft());

  const [stage, setStage] = useState<AgentPlanStage>(draft.current?.stage ?? 'idle');
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>(draft.current?.suggestions ?? []);
  const [selectedSuggestion, setSelectedSuggestionState] = useState<AgentSuggestion | null>(
    draft.current?.selectedSuggestion ?? null,
  );
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>(draft.current?.questions ?? []);
  const [answers, setAnswers] = useState<Record<string, string>>(draft.current?.answers ?? {});
  const [planBrief, setPlanBrief] = useState<PlanBrief | null>(draft.current?.planBrief ?? null);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>(draft.current?.executionSteps ?? []);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Ref for polling interval cleanup
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Persist draft on every state change
  useEffect(() => {
    if (stage === 'idle') {
      clearDraft();
      return;
    }
    saveDraft({
      stage,
      suggestions,
      selectedSuggestion,
      questions,
      answers,
      planBrief,
      executionSteps,
    });
  }, [stage, suggestions, selectedSuggestion, questions, answers, planBrief, executionSteps]);

  // ── Fetch Suggestions ────────────────────────────────────
  const fetchSuggestions = useCallback(async (productIds?: number[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (productIds && productIds.length > 0) {
        params.set('products', productIds.join(','));
      }
      params.set('limit', '6');
      const url = `/api/agent/suggestions?${params.toString()}`;
      const res = await apiRequest('GET', url);
      const data = (await res.json()) as { suggestions?: AgentSuggestion[] } | AgentSuggestion[];
      const items: AgentSuggestion[] = (Array.isArray(data) ? data : data.suggestions) ?? [];
      setSuggestions(items);
      setStage('suggestions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Select Suggestion ────────────────────────────────────
  const selectSuggestion = useCallback((suggestion: AgentSuggestion) => {
    setSelectedSuggestionState(suggestion);
    setAnswers({});
    // Move to questions — the preview endpoint will return clarifying questions
    // For now we transition and let the parent call submitAnswers which hits preview
    setStage('questions');
  }, []);

  // ── Answer Question ──────────────────────────────────────
  const answerQuestion = useCallback((questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  // ── Submit Answers → Preview ─────────────────────────────
  const submitAnswers = useCallback(async () => {
    if (!selectedSuggestion) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest('POST', '/api/agent/plan/preview', {
        suggestionId: selectedSuggestion.id,
        answers,
      });
      const data = (await res.json()) as { questions?: ClarifyingQuestion[]; plan?: PlanBrief };
      // The response includes both questions and plan
      if (data.questions && data.questions.length > 0 && !data.plan) {
        setQuestions(data.questions);
        setStage('questions');
      } else {
        setPlanBrief(data.plan ?? null);
        setQuestions(data.questions ?? []);
        setStage('preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan preview');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSuggestion, answers]);

  // ── Approve & Execute ────────────────────────────────────
  const approvePlan = useCallback(async () => {
    if (!planBrief) return;
    setIsLoading(true);
    setError(null);
    setStage('executing');

    // Generate idempotency key
    const idempotencyKey = `exec_${planBrief.id}_${Date.now()}`;

    try {
      const res = await apiRequest('POST', '/api/agent/plan/execute', {
        planId: planBrief.id,
        idempotencyKey,
      });
      const data = (await res.json()) as { executionId: string; steps?: ExecutionStep[] };
      const executionId = data.executionId;
      const steps: ExecutionStep[] = data.steps ?? [];
      setExecutionSteps(steps);
      setIsLoading(false);

      // Start polling for execution progress
      pollCountRef.current = 0;

      // Clear any existing polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      pollingIntervalRef.current = setInterval(async () => {
        pollCountRef.current += 1;

        // Timeout after MAX_POLLS
        if (pollCountRef.current >= MAX_POLLS) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setError('Execution timed out. Please check back later.');
          return;
        }

        try {
          const pollRes = await apiRequest('GET', `/api/agent/execution/${executionId}`);
          const pollData = (await pollRes.json()) as {
            steps?: ExecutionStep[];
            status?: string;
            errorMessage?: string;
          };
          const polledSteps: ExecutionStep[] = pollData.steps ?? [];
          setExecutionSteps(polledSteps);

          if (pollData.status === 'complete') {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setStage('complete');
          } else if (pollData.status === 'failed') {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setError(pollData.errorMessage || 'Execution failed');
          }
        } catch (_pollErr) {
          // Silently ignore individual poll failures — will retry next interval
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute plan');
      setIsLoading(false);
      // Stay on executing so user can see which step failed
    }
  }, [planBrief]);

  // ── Revise Plan ──────────────────────────────────────────
  const revisePlan = useCallback(
    async (feedback: string) => {
      if (!planBrief) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiRequest('POST', '/api/agent/plan/revise', {
          planId: planBrief.id,
          feedback,
        });
        const data = (await res.json()) as { plan?: PlanBrief };
        setPlanBrief(data.plan ?? null);
        setStage('preview');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to revise plan');
      } finally {
        setIsLoading(false);
      }
    },
    [planBrief],
  );

  // ── Reset ────────────────────────────────────────────────
  const reset = useCallback(() => {
    // Clear any active polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    pollCountRef.current = 0;

    setStage('idle');
    setSuggestions([]);
    setSelectedSuggestionState(null);
    setQuestions([]);
    setAnswers({});
    setPlanBrief(null);
    setExecutionSteps([]);
    setError(null);
    setIsLoading(false);
    clearDraft();
  }, []);

  return {
    stage,
    suggestions,
    selectedSuggestion,
    questions,
    answers,
    planBrief,
    executionSteps,
    error,
    isLoading,
    fetchSuggestions,
    selectSuggestion,
    answerQuestion,
    submitAnswers,
    approvePlan,
    revisePlan,
    reset,
  };
}
