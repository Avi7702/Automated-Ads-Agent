/**
 * ChatSlideOver -- Full-height slide-over chat panel (Sheet-based).
 *
 * Reuses the existing useAgentChat hook and ChatMessage component from
 * the Studio AgentChat module. Designed to be opened from any page via
 * the GlobalChatButton FAB.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Bot, Send, Square, Mic, MicOff, RefreshCw, Wrench, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useAgentChat, type ChatMessage as ChatMessageType } from '@/components/studio/AgentChat/useAgentChat';

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
};

/* ------------------------------------------------------------------ */
/*  Tool labels -- same map used by the Studio ChatMessage              */
/* ------------------------------------------------------------------ */
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
  schedule_post: 'Scheduling post',
  search_knowledge_base: 'Searching knowledge base',
  list_templates: 'Browsing templates',
  get_brand_profile: 'Loading brand profile',
  analyze_image: 'Analyzing image',
  get_campaign_stats: 'Fetching stats',
};

/* ------------------------------------------------------------------ */
/*  Inline ChatBubble (self-contained -- no import from Studio)         */
/* ------------------------------------------------------------------ */
function ChatBubble({ message }: { message: ChatMessageType }) {
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
              'rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap',
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

/* ------------------------------------------------------------------ */
/*  ChatSlideOver                                                      */
/* ------------------------------------------------------------------ */
interface ChatSlideOverProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatSlideOver({ isOpen, onOpenChange }: ChatSlideOverProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const { messages, isStreaming, error, sendMessage, stopStreaming, clearMessages } = useAgentChat();

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when sheet opens
  useEffect(() => {
    if (isOpen) {
      // Small delay so Sheet animation finishes first
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isOpen]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* already stopped */
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput('');
  };

  const handleNewChat = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  // Voice input (Web Speech API)
  const toggleVoice = useCallback(() => {
    const speechWindow = window as SpeechRecognitionWindow;
    if (!speechWindow.webkitSpeechRecognition && !speechWindow.SpeechRecognition) {
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setInput(transcript);
        setIsListening(false);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition as { stop: () => void };
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const hasSpeech =
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[400px] p-0 flex flex-col gap-0 [&>button]:z-20">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold">Ad Assistant</SheetTitle>
                <SheetDescription className="text-[11px] text-muted-foreground">
                  Ask anything about your ads
                </SheetDescription>
              </div>
            </div>

            {messages.length > 0 && !isStreaming && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                New chat
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bot className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">How can I help?</p>
              <p className="text-xs text-muted-foreground max-w-[240px]">
                Generate ads, write copy, schedule posts, search your knowledge base, and more.
              </p>

              {/* Quick-start suggestions */}
              <div className="flex flex-wrap gap-1.5 mt-4 justify-center max-w-[300px]">
                {[
                  'Generate an ad for my top product',
                  'Write LinkedIn copy',
                  'Show me my recent campaigns',
                  'Schedule a post for tomorrow',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      // Auto-send after a tick so the user sees the input first
                      setTimeout(() => {
                        sendMessage(q);
                        setInput('');
                      }, 100);
                    }}
                    className="text-[11px] px-2.5 py-1.5 rounded-full border border-border hover:bg-muted/80 hover:border-primary/30 transition-colors text-muted-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {isStreaming && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-9">
              <div className="flex gap-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
              </div>
              Thinking...
            </div>
          )}

          {error && <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 p-3 border-t border-border flex-shrink-0 bg-background"
        >
          {hasSpeech && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleVoice}
              className={cn('h-8 w-8 p-0 flex-shrink-0', isListening && 'text-red-500')}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? 'Listening...' : 'Type a message...'}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          {isStreaming ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={stopStreaming}
              className="h-8 w-8 p-0 text-destructive flex-shrink-0"
            >
              <Square className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={!input.trim()}
              className="h-8 w-8 p-0 flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
