/**
 * Agent Runner
 * Wraps ADK InMemoryRunner for Express SSE streaming
 */

import { InMemoryRunner } from '@google/adk';
import type { IStorage } from '../../storage';
import { createStudioAgent } from './agentDefinition';
import { logger } from '../../lib/logger';

/** SSE event protocol sent to the client */
export type AgentSSEEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'ui_action'; action: string; payload: Record<string, unknown> }
  | { type: 'error'; content: string }
  | { type: 'done' };

let runner: InMemoryRunner | null = null;
let runnerInitError: Error | null = null;

/** Lazily initialize the runner on first use */
function getRunner(storage: IStorage): InMemoryRunner {
  if (runnerInitError) {
    throw runnerInitError;
  }
  if (!runner) {
    try {
      const agent = createStudioAgent(storage);
      runner = new InMemoryRunner({
        agent,
        appName: 'studio',
      });
      logger.info({ module: 'AgentRunner' }, 'ADK InMemoryRunner initialized');
    } catch (err: unknown) {
      runnerInitError = err instanceof Error ? err : new Error(String(err));
      logger.error({ module: 'AgentRunner', err }, 'Failed to initialize ADK InMemoryRunner');
      throw runnerInitError;
    }
  }
  return runner;
}

/**
 * Stream an agent conversation turn as SSE events.
 *
 * Yields events as the agent thinks, calls tools, and responds.
 * The caller writes each event to the HTTP response as `data: JSON\n\n`.
 */
export async function* streamAgentResponse(
  storage: IStorage,
  userId: string,
  sessionId: string,
  userMessage: string,
): AsyncGenerator<AgentSSEEvent> {
  const r = getRunner(storage);

  // Ensure session exists
  let session = await r.sessionService.getSession({
    appName: 'studio',
    userId,
    sessionId,
  });
  if (!session) {
    session = await r.sessionService.createSession({
      appName: 'studio',
      userId,
      sessionId,
      state: { authenticatedUserId: userId },
    });
    logger.info({ module: 'AgentRunner', userId, sessionId }, 'New agent session created');
  } else if (!session.state['authenticatedUserId']) {
    // Backfill userId for sessions created before this fix
    session.state['authenticatedUserId'] = userId;
  }

  // MAX_EVENTS counts individual ADK events (not turns).
  // A single turn can emit multiple events (text chunks, function calls, etc.)
  // so we use a generous limit to avoid cutting off mid-conversation.
  let eventCount = 0;
  const MAX_EVENTS = 200;

  try {
    for await (const event of r.runAsync({
      userId,
      sessionId: session.id,
      newMessage: { role: 'user', parts: [{ text: userMessage }] },
    })) {
      eventCount++;
      if (eventCount > MAX_EVENTS) {
        yield { type: 'error', content: 'Agent reached maximum iteration limit.' };
        break;
      }

      if (!event.content?.parts) continue;

      for (const part of event.content.parts) {
        // Text response from the model
        if ('text' in part && part.text) {
          yield { type: 'text_delta', content: part.text };
        }

        // Function call (tool invocation)
        if ('functionCall' in part && part.functionCall) {
          const fc = part.functionCall as { name: string; args: Record<string, unknown> };
          yield { type: 'tool_call', name: fc.name, args: fc.args ?? {} };
        }

        // Function response (tool result) — extract UI actions
        if ('functionResponse' in part && part.functionResponse) {
          const fr = part.functionResponse as { response: Record<string, unknown> };
          const resp = fr.response;
          if (resp && Array.isArray(resp['uiActions'])) {
            for (const action of resp['uiActions']) {
              yield {
                type: 'ui_action',
                action: (action as { type: string }).type,
                payload: (action as { payload: Record<string, unknown> }).payload ?? {},
              };
            }
          }
        }
      }
    }
  } catch (err: unknown) {
    logger.error({ module: 'AgentRunner', err, userId, sessionId }, 'Agent run error');
    yield { type: 'error', content: 'Something went wrong. Please try again.' };
  }

  yield { type: 'done' };
}

/**
 * Delete a user's agent session
 */
export async function deleteAgentSession(storage: IStorage, userId: string, sessionId: string): Promise<boolean> {
  const r = getRunner(storage);
  try {
    await r.sessionService.deleteSession({ appName: 'studio', userId, sessionId });
    logger.info({ module: 'AgentRunner', userId, sessionId }, 'Agent session deleted');
    return true;
  } catch (err: unknown) {
    logger.warn({ module: 'AgentRunner', err, userId, sessionId }, 'Failed to delete agent session');
    return false;
  }
}
