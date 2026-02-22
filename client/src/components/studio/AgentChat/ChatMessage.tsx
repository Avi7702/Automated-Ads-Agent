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
  generate_post_image: 'Generating image',
  generate_image: 'Generating image',
  generate_post_copy: 'Writing ad copy',
  generate_ad_copy: 'Writing ad copy',
  suggest_ideas: 'Getting ideas',
  get_idea_suggestions: 'Getting ideas',
  vault_search: 'Searching knowledge base',
  search_knowledge_base: 'Searching knowledge base',
};

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/20',
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col gap-1.5 max-w-[85%]', isUser ? 'items-end' : 'items-start')}>
        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.toolCalls.map((tc, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium"
              >
                <Wrench className="w-3 h-3" />
                {TOOL_LABELS[tc.name] ?? tc.name}
              </span>
            ))}
          </div>
        )}

        {/* Message bubble */}
        {message.content && (
          <div
            className={cn(
              'rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap',
              isUser ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted/80 text-foreground rounded-bl-md',
            )}
          >
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}
