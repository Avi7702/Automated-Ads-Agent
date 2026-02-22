// @ts-nocheck
/**
 * useAgentChat — SSE consumer for Studio Agent
 *
 * Sends messages to POST /api/agent/chat and reads the SSE stream.
 * Dispatches ui_action events to the orchestrator.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { getCsrfToken } from '@/lib/queryClient';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: { name: string; args: Record<string, unknown> }[];
  timestamp: number;
}

interface UseAgentChatOptions {
  onUiAction?: (action: string, payload: Record<string, unknown>) => void;
}

export function useAgentChat(options: UseAgentChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Store onUiAction in a ref to avoid recreating sendMessage when callback changes
  const onUiActionRef = useRef(options.onUiAction);
  onUiActionRef.current = options.onUiAction;

  // Pre-fetch CSRF token on mount to avoid latency on first message
  useEffect(() => {
    getCsrfToken().catch(() => {});
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      setError(null);

      // Add user message
      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Prepare assistant message placeholder
      const assistantId = `assistant_${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        toolCalls: [],
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      setIsStreaming(true);
      abortRef.current = new AbortController();

      try {
        let sawAssistantOutput = false;

        // Get CSRF token for state-changing request
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        try {
          const csrfToken = await getCsrfToken();
          headers['x-csrf-token'] = csrfToken;
        } catch {
          // Non-fatal — server may still accept if CSRF is disabled in dev
        }

        const response = await fetch('/api/agent/chat', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            message: text.trim(),
            sessionId: sessionIdRef.current,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(errBody.error || `HTTP ${response.status}`);
        }

        // Extract session ID from first response if not set
        if (!sessionIdRef.current) {
          const sid = response.headers.get('x-session-id');
          if (sid) sessionIdRef.current = sid;
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
              const event = JSON.parse(jsonStr);

              switch (event.type) {
                case 'text_delta':
                  sawAssistantOutput = true;
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + event.content } : m)),
                  );
                  break;

                case 'tool_call':
                  sawAssistantOutput = true;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            toolCalls: [...(m.toolCalls ?? []), { name: event.name, args: event.args }],
                          }
                        : m,
                    ),
                  );
                  break;

                case 'ui_action':
                  sawAssistantOutput = true;
                  onUiActionRef.current?.(event.action, event.payload);
                  break;

                case 'error':
                  setError(event.content);
                  break;

                case 'done':
                  break;
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        if (!sawAssistantOutput) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || "I couldn't generate a response. Please try again." }
                : m,
            ),
          );
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // User cancelled — do nothing
        } else {
          // Sanitize error messages — don't expose raw JS errors to users
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

  const clearMessages = useCallback(async () => {
    // Delete server-side session if one exists
    const sid = sessionIdRef.current;
    if (sid) {
      try {
        const headers: Record<string, string> = {};
        try {
          const csrfToken = await getCsrfToken();
          headers['x-csrf-token'] = csrfToken;
        } catch {
          // Non-fatal
        }
        await fetch(`/api/agent/session/${encodeURIComponent(sid)}`, {
          method: 'DELETE',
          headers,
          credentials: 'include',
        });
      } catch {
        // Best effort — don't block UI cleanup
      }
    }
    setMessages([]);
    sessionIdRef.current = null;
    setError(null);
  }, []);

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}
