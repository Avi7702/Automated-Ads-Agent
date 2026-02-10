// @ts-nocheck
/**
 * ChatMessage — Single message bubble with tool call badges
 */

import { cn } from '@/lib/utils';
import { Bot, User, Wrench } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from './useAgentChat';

const TOOL_LABELS: Record<string, string> = {
  list_products: 'Searching products',
  get_product_details: 'Getting product info',
  select_products: 'Selecting products',
  set_prompt: 'Setting prompt',
  set_output_settings: 'Configuring output',
  generate_image: 'Generating image',
  generate_ad_copy: 'Writing ad copy',
  get_idea_suggestions: 'Getting ideas',
};

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col gap-1 max-w-[85%]', isUser ? 'items-end' : 'items-start')}>
        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.toolCalls.map((tc, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-medium"
              >
                <Wrench className="w-2.5 h-2.5" />
                {TOOL_LABELS[tc.name] ?? tc.name}
              </span>
            ))}
          </div>
        )}

        {/* Message bubble */}
        {message.content && (
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
              isUser ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md',
            )}
          >
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}
