/**
 * Agent Runner
 * Streaming runner with manual tool loop using @google/genai SDK directly.
 * Replaces the ADK InMemoryRunner with a lightweight Chat-based approach.
 */

import { GoogleGenAI, FunctionCallingConfigMode } from '@google/genai';
import type { Chat } from '@google/genai';
import type { IStorage } from '../../storage';
import { getSystemInstruction, getToolDeclarations, getToolExecutors } from './agentDefinition';
import type { ToolExecutor } from './agentDefinition';
import { logger } from '../../lib/logger';

/** SSE event protocol sent to the client — identical to previous version */
export type AgentSSEEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'ui_action'; action: string; payload: Record<string, unknown> }
  | { type: 'error'; content: string }
  | { type: 'done' };

/** In-memory chat session with TTL */
interface AgentSession {
  chat: Chat;
  userId: string;
  createdAt: number;
}

const sessions = new Map<string, AgentSession>();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_TOOL_LOOPS = 10;

/** Lazy-initialised GenAI client (singleton) */
let genai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!genai) {
    const apiKey =
      process.env['GOOGLE_API_KEY'] || process.env['GEMINI_API_KEY'] || process.env['GOOGLE_GENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('Missing Google API key. Set GOOGLE_API_KEY, GEMINI_API_KEY, or GOOGLE_GENAI_API_KEY.');
    }
    genai = new GoogleGenAI({ apiKey });
  }
  return genai;
}

/** Periodically prune expired sessions */
function cleanupSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}
setInterval(cleanupSessions, 15 * 60 * 1000);

/**
 * Stream an agent conversation turn as SSE events.
 *
 * Implements a manual tool loop:
 *  1. Send user message, stream text + collect function calls
 *  2. Execute each function call, emit tool_call + ui_action SSE events
 *  3. Send function responses back to the model
 *  4. Repeat until the model returns pure text (no function calls) or we hit MAX_TOOL_LOOPS
 */
export async function* streamAgentResponse(
  storage: IStorage,
  userId: string,
  sessionId: string,
  userMessage: string,
): AsyncGenerator<AgentSSEEvent> {
  const client = getClient();
  const systemInstruction = getSystemInstruction();
  const toolDeclarations = getToolDeclarations();
  const toolExecutors = getToolExecutors(storage);

  // Get or create chat session
  let session = sessions.get(sessionId);
  if (!session || session.userId !== userId) {
    const chat = client.chats.create({
      model: 'gemini-3.1-pro-preview',
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: toolDeclarations }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.AUTO,
          },
        },
        temperature: 1.0,
      },
    });
    session = { chat, userId, createdAt: Date.now() };
    sessions.set(sessionId, session);
    logger.info({ module: 'AgentRunner', userId, sessionId }, 'New chat session created');
  }

  let toolLoopCount = 0;

  try {
    // Initial message to the model
    let streamInput: string | object = userMessage;

    while (true) {
      // Stream the response
      const response = await session.chat.sendMessageStream({ message: streamInput });

      // Collect text and function calls from the stream
      let functionCalls: Array<{ name: string; args: Record<string, unknown>; id?: string }> = [];

      for await (const chunk of response) {
        // Emit text deltas
        if (chunk.text) {
          yield { type: 'text_delta', content: chunk.text };
        }

        // Collect function calls from the chunk
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          for (const fc of chunk.functionCalls) {
            if (fc.name) {
              functionCalls.push({
                name: fc.name,
                args: (fc.args as Record<string, unknown>) ?? {},
                ...(fc.id != null && { id: fc.id }),
              });
            }
          }
        }
      }

      // If no function calls, the model is done responding
      if (functionCalls.length === 0) break;

      // Safety: prevent infinite tool loops
      toolLoopCount++;
      if (toolLoopCount > MAX_TOOL_LOOPS) {
        yield { type: 'error', content: 'Agent reached maximum tool call limit.' };
        break;
      }

      // Execute each function call and build responses
      const functionResponseParts: Array<{ functionResponse: { name: string; response: Record<string, unknown> } }> =
        [];

      for (const fc of functionCalls) {
        // Emit tool_call SSE event so the frontend knows what's happening
        yield { type: 'tool_call', name: fc.name, args: fc.args };

        const executor: ToolExecutor | undefined = toolExecutors.get(fc.name);
        if (!executor) {
          logger.warn({ module: 'AgentRunner', tool: fc.name }, 'Unknown tool called');
          functionResponseParts.push({
            functionResponse: {
              name: fc.name,
              response: { status: 'error', message: `Unknown tool: ${fc.name}` },
            },
          });
          continue;
        }

        try {
          const result = await executor(fc.args, userId);

          functionResponseParts.push({
            functionResponse: {
              name: fc.name,
              response: result,
            },
          });

          // Extract and emit UI actions from tool results
          if (Array.isArray(result['uiActions'])) {
            for (const action of result['uiActions']) {
              const typed = action as { type: string; payload?: Record<string, unknown> };
              yield {
                type: 'ui_action',
                action: typed.type,
                payload: typed.payload ?? {},
              };
            }
          }
        } catch (err: unknown) {
          logger.error({ module: 'AgentRunner', err, tool: fc.name }, 'Tool execution error');
          functionResponseParts.push({
            functionResponse: {
              name: fc.name,
              response: { status: 'error', message: 'Tool execution failed.' },
            },
          });
        }
      }

      // Send all function responses back to the model and continue the loop.
      // The Chat API accepts an array of Part objects as the message.
      streamInput = functionResponseParts;
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    logger.error(
      { module: 'AgentRunner', error: errMsg, stack: errStack, userId, sessionId },
      `Agent run error: ${errMsg}`,
    );
    yield { type: 'error', content: 'Something went wrong. Please try again.' };
  }

  yield { type: 'done' };
}

/**
 * Delete a user's agent session.
 */
export async function deleteAgentSession(_storage: IStorage, userId: string, sessionId: string): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (session && session.userId === userId) {
    sessions.delete(sessionId);
    logger.info({ module: 'AgentRunner', userId, sessionId }, 'Agent session deleted');
    return true;
  }
  return false;
}
