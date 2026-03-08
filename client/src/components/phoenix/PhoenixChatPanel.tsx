/**
 * PhoenixChatPanel — Chat panel for the Phoenix Studio workspace
 *
 * A streamlined chat panel that connects to the Phoenix Orchestrator
 * via the usePhoenixChat hook. Displays messages, progress phases,
 * artifacts, and supports voice input.
 *
 * Unlike the original AgentChatPanel, this panel is always visible
 * (no collapse toggle) and shows orchestrator progress inline.
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Bot,
  Send,
  Square,
  Trash2,
  Mic,
  MicOff,
  Paperclip,
  Loader2,
  Image as ImageIcon,
  Video,
  FileText,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  usePhoenixChat,
  type PhoenixMessage,
  type PhoenixChatContext,
  type PhoenixArtifact,
} from '@/hooks/usePhoenixChat';

// ── Speech Recognition types ──────────────────────────────
interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript?: string }>>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtorLike = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtorLike;
  webkitSpeechRecognition?: SpeechRecognitionCtorLike;
};

// ── Props ─────────────────────────────────────────────────
interface PhoenixChatPanelProps {
  selectedProductIds: string[];
  platform?: string;
  className?: string;
  onUiAction?: (action: string, payload: Record<string, unknown>) => void;
  onArtifactClick?: (artifact: PhoenixArtifact) => void;
}

// ── Artifact Card ─────────────────────────────────────────
function ArtifactCard({ artifact, onClick }: { artifact: PhoenixArtifact; onClick?: () => void }) {
  const iconMap = {
    image: ImageIcon,
    video: Video,
    copy: FileText,
    plan: FileText,
    carousel: ImageIcon,
  };
  const Icon = iconMap[artifact.type] || FileText;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 p-2',
        'hover:bg-card/80 transition-colors text-left w-full',
        onClick && 'cursor-pointer',
      )}
    >
      {artifact.type === 'image' && artifact.url ? (
        <img src={artifact.url} alt={artifact.label} className="w-12 h-12 rounded object-cover flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{artifact.label}</p>
        <p className="text-[10px] text-muted-foreground capitalize">{artifact.type}</p>
      </div>
      <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

// ── Message Bubble ────────────────────────────────────────
function MessageBubble({
  message,
  onArtifactClick,
}: {
  message: PhoenixMessage;
  onArtifactClick?: (artifact: PhoenixArtifact) => void;
}) {
  if (message.role === 'system') {
    return (
      <div className="flex items-center gap-2 py-1 px-3">
        <div className="h-px flex-1 bg-border/30" />
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          {message.content}
        </span>
        {message.metadata?.progress !== undefined && (
          <span className="text-[10px] text-primary font-mono">{message.metadata.progress}%</span>
        )}
        <div className="h-px flex-1 bg-border/30" />
      </div>
    );
  }

  const isUser = message.role === 'user';
  const artifacts = message.metadata?.artifacts ?? [];

  return (
    <div className={cn('flex gap-2 px-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3 py-2 text-sm',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground',
        )}
      >
        {message.content && <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>}
        {artifacts.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {artifacts.map((a, i) => (
              <ArtifactCard
                key={`${a.type}-${i}`}
                artifact={a}
                onClick={onArtifactClick ? () => onArtifactClick(a) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────
function ProgressIndicator({
  phase,
  progress,
  isStreaming,
}: {
  phase: string | null;
  progress: number;
  isStreaming: boolean;
}) {
  if (!isStreaming || !phase) return null;

  return (
    <div className="px-3 py-2 border-t border-border/30 bg-card/30">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
        <span className="text-[11px] text-muted-foreground font-medium truncate">{phase}</span>
        <span className="text-[10px] text-primary font-mono ml-auto">{progress}%</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────
export function PhoenixChatPanel({
  selectedProductIds,
  platform,
  className,
  onUiAction,
  onArtifactClick,
}: PhoenixChatPanelProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const { messages, isStreaming, error, currentPhase, progress, sendMessage, stopStreaming, clearMessages } =
    usePhoenixChat({
      onUiAction,
      onResult: (result) => {
        if (result.summary) {
          toast.success(`Completed: ${result.playbook}`, {
            description: result.summary.slice(0, 100),
          });
        }
      },
    });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Build context from selected products
  const chatContext = useMemo<PhoenixChatContext>(
    () => ({
      selectedProductIds,
      platform,
    }),
    [selectedProductIds, platform],
  );

  // ── Send handler ──────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    sendMessage(text, chatContext);
  }, [input, isStreaming, sendMessage, chatContext]);

  // ── Keyboard handler ──────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ── Voice input ───────────────────────────────────────
  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const win = window as SpeechRecognitionWindow;
    const SpeechRecognition = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-GB';

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Voice recognition error');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // ── Quick actions ─────────────────────────────────────
  const quickActions = useMemo(() => {
    const actions: { label: string; prompt: string }[] = [];
    if (selectedProductIds.length > 0) {
      actions.push(
        { label: 'Generate post', prompt: 'Generate a social media post for the selected products' },
        { label: 'Create carousel', prompt: 'Create a carousel ad for the selected products' },
        { label: 'Write ad copy', prompt: 'Write compelling ad copy for the selected products' },
      );
    } else {
      actions.push(
        { label: 'Plan this week', prompt: 'Generate a content plan for this week' },
        { label: 'Best performers', prompt: 'Show me the best performing post patterns' },
        { label: 'Suggest products', prompt: 'Which products should I feature next?' },
      );
    }
    return actions;
  }, [selectedProductIds.length]);

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold">Phoenix</span>
          {isStreaming && <span className="text-[10px] text-primary animate-pulse">thinking...</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={clearMessages}
          disabled={isStreaming || messages.length === 0}
          title="Clear chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
            <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {selectedProductIds.length > 0
                  ? `${selectedProductIds.length} product${selectedProductIds.length > 1 ? 's' : ''} selected`
                  : 'Select products or ask me anything'}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                I can generate posts, plan content, or create campaigns
              </p>
            </div>
            {/* Quick actions */}
            <div className="flex flex-wrap gap-1.5 justify-center max-w-[280px]">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    setInput(action.prompt);
                    inputRef.current?.focus();
                  }}
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-full border border-border/50',
                    'bg-card/50 hover:bg-card text-muted-foreground hover:text-foreground',
                    'transition-colors',
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} onArtifactClick={onArtifactClick} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-3 py-1.5 bg-destructive/10 border-t border-destructive/20">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Progress indicator */}
      <ProgressIndicator phase={currentPhase} progress={progress} isStreaming={isStreaming} />

      {/* Input area */}
      <div className="border-t border-border/50 p-2">
        <div className="flex items-end gap-1.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedProductIds.length > 0
                ? 'What should I create with these products?'
                : 'Ask me to generate posts, plan content...'
            }
            className={cn(
              'flex-1 resize-none rounded-lg border border-border/50 bg-muted/30',
              'px-3 py-2 text-sm placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-1 focus:ring-primary/30',
              'min-h-[36px] max-h-[120px]',
            )}
            rows={1}
            disabled={isStreaming}
          />
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7', isListening && 'text-red-500')}
              onClick={toggleVoice}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </Button>
            {isStreaming ? (
              <Button variant="destructive" size="icon" className="h-7 w-7" onClick={stopStreaming} title="Stop">
                <Square className="w-3 h-3" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="icon"
                className="h-7 w-7"
                onClick={handleSend}
                disabled={!input.trim()}
                title="Send"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhoenixChatPanel;
