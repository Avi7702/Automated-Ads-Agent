// @ts-nocheck
/**
 * AgentChatPanel — Collapsible chat panel at top of Studio page
 *
 * Renders a conversational interface with the Studio Agent.
 * Dispatches ui_action events to the orchestrator to drive the UI.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Bot, ChevronUp, ChevronDown, Send, Square, Trash2, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from './ChatMessage';
import { useAgentChat } from './useAgentChat';
import type { Product } from '@shared/schema';
import type { CopyResult, StudioOrchestrator } from '@/hooks/useStudioOrchestrator';

type AgentChatOrchestrator = Pick<
  StudioOrchestrator,
  | 'setSelectedProducts'
  | 'setPrompt'
  | 'setPlatform'
  | 'setAspectRatio'
  | 'setResolution'
  | 'setGeneratedImage'
  | 'setState'
  | 'setGeneratedCopy'
  | 'setGeneratedCopyFull'
>;

interface SpeechRecognitionResultLike {
  0?: { transcript?: string };
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultLike[];
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

interface AgentChatPanelProps {
  orch: AgentChatOrchestrator;
}

export function AgentChatPanel({ orch }: AgentChatPanelProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem('agent-chat-open') === 'true';
    } catch {
      return false;
    }
  });
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Handle UI actions from the agent
  const handleUiAction = useCallback(
    (action: string, payload: Record<string, unknown>) => {
      try {
        switch (action) {
          case 'select_products': {
            const products = Array.isArray(payload.products) ? (payload.products as Product[]) : [];
            if (products && orch.setSelectedProducts) {
              orch.setSelectedProducts(products);
              toast({
                title: 'Products selected',
                description: `${products.length} product(s) selected by the assistant.`,
              });
            }
            break;
          }
          case 'set_prompt': {
            const prompt = payload.prompt as string;
            if (prompt && orch.setPrompt) {
              orch.setPrompt(prompt);
              toast({ title: 'Prompt updated', description: 'The assistant set your generation prompt.' });
            }
            break;
          }
          case 'set_platform': {
            const platform = payload.platform as string;
            if (platform && orch.setPlatform) {
              orch.setPlatform(platform);
              toast({ title: 'Platform set', description: `Target platform: ${platform}` });
            }
            break;
          }
          case 'set_aspect_ratio': {
            const aspectRatio = payload.aspectRatio as string;
            if (aspectRatio && orch.setAspectRatio) {
              orch.setAspectRatio(aspectRatio);
            }
            break;
          }
          case 'set_resolution': {
            const resolution = payload.resolution as string;
            if (resolution && orch.setResolution) {
              orch.setResolution(resolution);
            }
            break;
          }
          case 'generation_complete': {
            const imageUrl = payload.imageUrl as string;
            if (imageUrl && orch.setGeneratedImage) {
              orch.setGeneratedImage(imageUrl);
              if (orch.setState) orch.setState('result');
              toast({ title: 'Image generated!', description: 'Check the result in the canvas.' });
            }
            break;
          }
          case 'copy_generated': {
            const copies = Array.isArray(payload.copies) ? (payload.copies as CopyResult[]) : [];
            if (copies?.length > 0) {
              // setGeneratedCopy expects a string — use the first copy's caption
              const firstCopy = copies[0];
              if (orch.setGeneratedCopyFull) {
                orch.setGeneratedCopyFull(firstCopy);
              } else if (orch.setGeneratedCopy) {
                orch.setGeneratedCopy(firstCopy?.caption ?? firstCopy?.bodyText ?? '');
              }
              toast({
                title: 'Ad copy generated',
                description: `${copies.length} variation(s) ready in the Inspector.`,
              });
            }
            break;
          }
        }
      } catch {
        // UI action dispatch should never crash the chat panel
      }
    },
    [orch, toast],
  );

  const { messages, isStreaming, error, sendMessage, stopStreaming, clearMessages } = useAgentChat({
    onUiAction: handleUiAction,
  });

  // Persist collapse state
  useEffect(() => {
    try {
      localStorage.setItem('agent-chat-open', String(isOpen));
    } catch {
      // ignore
    }
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput('');
  };

  // Clean up voice recognition on unmount
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

  // Voice input via Web Speech API
  const toggleVoice = useCallback(() => {
    const speechWindow = window as SpeechRecognitionWindow;
    const speechRecognitionCtor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!speechRecognitionCtor) {
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new speechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setInput(transcript);
        setIsListening(false);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const hasSpeech =
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  return (
    <div className="w-full mb-6">
      {/* Header — always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 rounded-xl',
          'bg-card/50 border border-border hover:bg-card/80 transition-colors',
          isOpen && 'rounded-b-none border-b-0',
        )}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium">Studio Assistant</span>
          {messages.length > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {messages.length} msg{messages.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Chat Body — collapsible */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border border-t-0 border-border rounded-b-xl bg-card/30 backdrop-blur-sm">
              {/* Messages */}
              <div className="max-h-[350px] overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-6">
                    Ask me to generate ads, find products, write copy, or set up your campaign.
                  </p>
                )}
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
                {isStreaming && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Thinking...
                  </div>
                )}
                {error && (
                  <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-border">
                {hasSpeech && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleVoice}
                    className={cn('h-8 w-8 p-0', isListening && 'text-red-500')}
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
                />

                {messages.length > 0 && !isStreaming && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearMessages}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    title="Clear chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}

                {isStreaming ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={stopStreaming}
                    className="h-8 w-8 p-0 text-destructive"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button type="submit" variant="ghost" size="sm" disabled={!input.trim()} className="h-8 w-8 p-0">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                )}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
