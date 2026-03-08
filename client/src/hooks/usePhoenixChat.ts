/**
 * usePhoenixChat — SSE consumer for the Phoenix Orchestrator
 *
 * Similar to useAgentChat but connects to POST /api/phoenix/orchestrate (SSE)
 * and handles Phoenix-specific progress events (phase, step, result).
 *
 * The hook maintains a conversation-like UI while the orchestrator runs
 * playbook-driven workflows underneath.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { getCsrfToken } from '@/lib/queryClient';

// ── Types ─────────────────────────────────────────────────

export interface PhoenixMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    playbook?: string;
    phase?: string;
    step?: string;
    progress?: number; // 0-100
    artifacts?: PhoenixArtifact[];
  };
  timestamp: number;
}

export interface PhoenixArtifact {
  type: 'image' | 'video' | 'copy' | 'plan' | 'carousel';
  url?: string;
  content?: string;
  label: string;
  generationId?: number;
}

export interface PhoenixChatContext {
  selectedProductIds?: string[];
  platform?: string;
  aspectRatio?: string;
  uploadedReferences?: string[];
  ideaBankSuggestions?: string[];
}

interface UsePhoenixChatOptions {
  /** Called when the orchestrator emits a ui_action event */
  onUiAction?: (action: string, payload: Record<string, unknown>) => void;
  /** Called when the orchestrator completes with a result */
  onResult?: (result: PhoenixOrchestratorResult) => void;
}

interface PhoenixOrchestratorResult {
  playbook: string;
  summary: string;
  artifacts: PhoenixArtifact[];
  durationMs: number;
}

// ── Hook ──────────────────────────────────────────────────

export function usePhoenixChat(options: UsePhoenixChatOptions = {}) {
  const [messages, setMessages] = useState<PhoenixMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const onUiActionRef = useRef(options.onUiAction);
  const onResultRef = useRef(options.onResult);
  onUiActionRef.current = options.onUiAction;
  onResultRef.current = options.onResult;

  // Pre-fetch CSRF token on mount
  useEffect(() => {
    getCsrfToken().catch(() => {});
  }, []);

  const sendMessage = useCallback(
    async (text: string, context?: PhoenixChatContext, playbook?: string) => {
      if (!text.trim() || isStreaming) return;

      setError(null);
      setCurrentPhase(null);
      setProgress(0);

      // Add user message
      const userMsg: PhoenixMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Prepare assistant message placeholder
      const assistantId = `phoenix_${Date.now()}`;
      const assistantMsg: PhoenixMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        metadata: { playbook: playbook ?? undefined, artifacts: [] },
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      setIsStreaming(true);
      abortRef.current = new AbortController();

      try {
        // Get CSRF token
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        try {
          const csrfToken = await getCsrfToken();
          headers['x-csrf-token'] = csrfToken;
        } catch {
          // Non-fatal
        }

        const body: Record<string, unknown> = {
          message: text.trim(),
          productIds: context?.selectedProductIds ?? [],
          platform: context?.platform,
        };
        if (playbook) body['playbook'] = playbook;
        if (context?.uploadedReferences) {
          body['uiContext'] = { uploadedReferences: context.uploadedReferences };
        }

        const response = await fetch('/api/phoenix/orchestrate', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({ error: 'Request failed' }));
          throw new Error((errBody as { error?: string }).error ?? `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr) as Record<string, unknown>;
              const eventType = event['type'] as string;

              switch (eventType) {
                case 'phase': {
                  const phaseName = (event['phase'] as string) ?? '';
                  const phaseProgress = (event['progress'] as number) ?? 0;
                  setCurrentPhase(phaseName);
                  setProgress(phaseProgress);

                  // Add a system message for the phase change
                  const phaseMsg: PhoenixMessage = {
                    id: `phase_${Date.now()}_${Math.random()}`,
                    role: 'system',
                    content: phaseName,
                    metadata: { phase: phaseName, progress: phaseProgress },
                    timestamp: Date.now(),
                  };
                  setMessages((prev) => [...prev, phaseMsg]);
                  break;
                }

                case 'step': {
                  const stepName = (event['step'] as string) ?? '';
                  const stepProgress = (event['progress'] as number) ?? 0;
                  setProgress(stepProgress);

                  // Update the assistant message with step info
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            content: m.content + (m.content ? '\n' : '') + `> ${stepName}`,
                            metadata: { ...m.metadata, step: stepName, progress: stepProgress },
                          }
                        : m,
                    ),
                  );
                  break;
                }

                case 'text_delta': {
                  const content = (event['content'] as string) ?? '';
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + content } : m)),
                  );
                  break;
                }

                case 'artifact': {
                  const artifact: PhoenixArtifact = {
                    type: (event['artifactType'] as PhoenixArtifact['type']) ?? 'image',
                    url: event['url'] as string | undefined,
                    content: event['content'] as string | undefined,
                    label: (event['label'] as string) ?? 'Generated content',
                    generationId: event['generationId'] as number | undefined,
                  };
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            metadata: {
                              ...m.metadata,
                              artifacts: [...(m.metadata?.artifacts ?? []), artifact],
                            },
                          }
                        : m,
                    ),
                  );
                  break;
                }

                case 'ui_action': {
                  const action = event['action'] as string;
                  const payload = (event['payload'] as Record<string, unknown>) ?? {};
                  if (action) {
                    onUiActionRef.current?.(action, payload);
                  }
                  break;
                }

                case 'result': {
                  const result: PhoenixOrchestratorResult = {
                    playbook: (event['playbook'] as string) ?? '',
                    summary: (event['summary'] as string) ?? '',
                    artifacts: (event['artifacts'] as PhoenixArtifact[]) ?? [],
                    durationMs: (event['durationMs'] as number) ?? 0,
                  };
                  setProgress(100);
                  setCurrentPhase('Complete');

                  // Update the assistant message with the final summary
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            content: result.summary || m.content,
                            metadata: {
                              ...m.metadata,
                              artifacts: [...(m.metadata?.artifacts ?? []), ...result.artifacts],
                              progress: 100,
                            },
                          }
                        : m,
                    ),
                  );

                  onResultRef.current?.(result);
                  break;
                }

                case 'error': {
                  const errMsg = (event['message'] as string) ?? 'Unknown error';
                  setError(errMsg);
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, content: m.content || `Error: ${errMsg}` } : m)),
                  );
                  break;
                }
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // User cancelled
        } else {
          const raw = err instanceof Error ? err.message : '';
          const isSafe = raw.startsWith('HTTP ') || raw === 'Request failed' || raw === 'No response stream';
          const msg = isSafe ? raw : 'Something went wrong. Please try again.';
          setError(msg);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content || `Error: ${msg}` } : m)),
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setCurrentPhase(null);
    setProgress(0);
  }, []);

  return {
    messages,
    isStreaming,
    error,
    currentPhase,
    progress,
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}
