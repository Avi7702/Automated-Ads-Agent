/**
 * AgentChatPanel - Chat panel for Studio workspace
 *
 * Supports:
 * - Collapsible or forced-open variants
 * - Uploading reference images
 * - Optional external message injection (Idea Bank -> Agent)
 * - Passing hidden workspace context with each chat turn
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Bot, ChevronUp, ChevronDown, Send, Square, Trash2, Mic, MicOff, Paperclip, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ChatMessage } from './ChatMessage';
import { useAgentChat, type AgentChatMessageContext } from './useAgentChat';
import type { StudioOrchestrator } from '@/hooks/useStudioOrchestrator';
import type { AnalyzedUpload, ImageAnalysisResponse } from '@/types/analyzedUpload';
import type { IdeaBankContextSnapshot } from '@/components/ideabank/types';
import type { CopyResult, Product } from '@/hooks/studio/types';

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

interface AgentChatPanelProps {
  orch: StudioOrchestrator;
  title?: string;
  className?: string;
  bodyMaxHeightClassName?: string;
  forceExpanded?: boolean;
  showCollapseToggle?: boolean;
  ideaBankContext?: IdeaBankContextSnapshot | null;
  ideaBankBridgeState?: 'idle' | 'waiting' | 'ready' | 'error' | 'sent';
  externalMessage?: { id: string; text: string } | null;
  onExternalMessageConsumed?: (id: string) => void;
}

const RESOLUTION_VALUES = ['1K', '2K', '4K'] as const;

function isResolution(value: string): value is (typeof RESOLUTION_VALUES)[number] {
  return (RESOLUTION_VALUES as readonly string[]).includes(value);
}

function isCopyResult(value: unknown): value is CopyResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CopyResult>;
  return (
    typeof candidate.headline === 'string' &&
    typeof candidate.hook === 'string' &&
    typeof candidate.bodyText === 'string' &&
    typeof candidate.cta === 'string' &&
    typeof candidate.caption === 'string' &&
    Array.isArray(candidate.hashtags) &&
    typeof candidate.framework === 'string'
  );
}

function extractProductIds(items: unknown[]): string[] {
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const id = (item as { id?: unknown })['id'];
      return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
    })
    .filter((id): id is string => Boolean(id));
}

export function AgentChatPanel({
  orch,
  title = 'Studio Assistant',
  className,
  bodyMaxHeightClassName = 'max-h-[350px]',
  forceExpanded = false,
  showCollapseToggle,
  ideaBankContext = null,
  ideaBankBridgeState = 'idle',
  externalMessage = null,
  onExternalMessageConsumed,
}: AgentChatPanelProps) {
  const maxImageInputs = 6;
  const isCollapseEnabled = showCollapseToggle ?? !forceExpanded;

  const [isOpen, setIsOpen] = useState(() => {
    if (forceExpanded) return true;
    try {
      const stored = localStorage.getItem('agent-chat-open');
      return stored ? stored === 'true' : true;
    } catch {
      return true;
    }
  });
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const consumedExternalMessageRef = useRef<string | null>(null);

  const remainingUploadSlots = Math.max(0, maxImageInputs - orch.selectedProducts.length - orch.tempUploads.length);

  const analyzeUpload = useCallback(async (upload: AnalyzedUpload): Promise<AnalyzedUpload> => {
    try {
      const formData = new FormData();
      formData.append('image', upload.file);

      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data: ImageAnalysisResponse = await response.json();

      return {
        ...upload,
        description: data.description,
        confidence: data.confidence,
        status: 'confirmed',
      };
    } catch {
      return {
        ...upload,
        description: 'Unable to analyze image',
        confidence: 0,
        status: 'confirmed',
      };
    }
  }, []);

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      if (isUploading) return;
      const imageFiles = files.filter((file) => file.type.startsWith('image/'));

      if (imageFiles.length === 0) {
        toast.error('No images found', {
          description: 'Please choose image files to upload.',
        });
        return;
      }

      if (remainingUploadSlots <= 0) {
        toast.error('Image limit reached', {
          description: `You can use up to ${maxImageInputs} total images (products + uploads).`,
        });
        return;
      }

      const filesToAdd = imageFiles.slice(0, remainingUploadSlots);
      if (filesToAdd.length < imageFiles.length) {
        toast.success('Some files skipped', {
          description: `Added ${filesToAdd.length} image(s). ${imageFiles.length - filesToAdd.length} skipped due to limit.`,
        });
      }

      const newUploads: AnalyzedUpload[] = filesToAdd.map((file) => ({
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        description: null,
        confidence: 0,
        status: 'analyzing',
        selected: true,
      }));

      setIsUploading(true);
      orch.setTempUploads((prev) => [...prev, ...newUploads]);
      try {
        const analyzedUploads = await Promise.all(newUploads.map((upload) => analyzeUpload(upload)));
        const analyzedById = new Map(analyzedUploads.map((upload) => [upload.id, upload]));

        orch.setTempUploads((prev) => prev.map((upload) => analyzedById.get(upload.id) ?? upload));

        toast.success('Images uploaded', {
          description: `${filesToAdd.length} image(s) added to your generation context.`,
        });
      } catch {
        toast.error('Upload failed', {
          description: 'Could not process the uploaded images.',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [analyzeUpload, isUploading, maxImageInputs, orch, remainingUploadSlots],
  );

  const handleUploadInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files ? Array.from(event.target.files) : [];
      event.target.value = '';
      if (files.length === 0) return;
      await handleUploadFiles(files);
    },
    [handleUploadFiles],
  );

  const handleUiAction = useCallback(
    (action: string, payload: Record<string, unknown>) => {
      try {
        switch (action) {
          case 'select_products': {
            const incoming = Array.isArray(payload['products']) ? payload['products'] : [];
            const selectedIds = extractProductIds(incoming);
            if (selectedIds.length > 0 && orch.setSelectedProducts) {
              const selectedProducts: Product[] = orch.products.filter((product) =>
                selectedIds.includes(String(product.id)),
              );
              orch.setSelectedProducts(selectedProducts);
              toast.success('Products selected', {
                description: `${selectedProducts.length} product(s) selected by the assistant.`,
              });
            }
            break;
          }
          case 'set_prompt': {
            const prompt = payload['prompt'];
            if (typeof prompt === 'string' && prompt.trim().length > 0 && orch.setPrompt) {
              orch.setPrompt(prompt);
              toast.success('Prompt updated', {
                description: 'The assistant set your generation prompt.',
              });
            }
            break;
          }
          case 'set_platform': {
            const platform = payload['platform'];
            if (typeof platform === 'string' && platform.trim().length > 0 && orch.setPlatform) {
              orch.setPlatform(platform);
              toast.success('Platform set', {
                description: `Target platform: ${platform}`,
              });
            }
            break;
          }
          case 'set_aspect_ratio': {
            const aspectRatio = payload['aspectRatio'];
            if (typeof aspectRatio === 'string' && aspectRatio.trim().length > 0 && orch.setAspectRatio) {
              orch.setAspectRatio(aspectRatio);
            }
            break;
          }
          case 'set_resolution': {
            const resolution = payload['resolution'];
            if (typeof resolution === 'string' && isResolution(resolution) && orch.setResolution) {
              orch.setResolution(resolution);
            }
            break;
          }
          case 'generation_complete': {
            const imageUrl = payload['imageUrl'];
            if (typeof imageUrl === 'string' && imageUrl.trim().length > 0 && orch.setGeneratedImage) {
              orch.setGeneratedImage(imageUrl);
              if (orch.setState) orch.setState('result');
              toast.success('Image generated!', {
                description: 'Check the result in the canvas.',
              });
            }
            break;
          }
          case 'copy_generated': {
            const copies = Array.isArray(payload['copies']) ? payload['copies'] : [];
            if (copies.length > 0) {
              const firstCopy = copies[0];
              if (orch.setGeneratedCopyFull && isCopyResult(firstCopy)) {
                orch.setGeneratedCopyFull(firstCopy);
              } else if (orch.setGeneratedCopy) {
                const caption =
                  firstCopy && typeof firstCopy === 'object'
                    ? (firstCopy as { caption?: unknown })['caption']
                    : undefined;
                const bodyText =
                  firstCopy && typeof firstCopy === 'object'
                    ? (firstCopy as { bodyText?: unknown })['bodyText']
                    : undefined;
                orch.setGeneratedCopy(
                  typeof caption === 'string' ? caption : typeof bodyText === 'string' ? bodyText : '',
                );
              }
              toast.success('Ad copy generated', {
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
    [orch],
  );

  const { messages, isStreaming, error, sendMessage, stopStreaming, clearMessages } = useAgentChat({
    onUiAction: handleUiAction,
  });

  const buildMessageContext = useCallback((): AgentChatMessageContext => {
    const selectedProducts = orch.selectedProducts
      .map((product) => product.name)
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
      .slice(0, 6);

    const uploadedReferences = orch.tempUploads
      .filter((upload) => upload.selected !== false)
      .map((upload) => upload.description || upload.file?.name || 'Uploaded image')
      .filter((label): label is string => typeof label === 'string' && label.trim().length > 0)
      .slice(0, 6);

    const topIdeas =
      ideaBankContext?.suggestions
        ?.slice(0, 3)
        .map((idea) => idea.summary || idea.prompt)
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? [];

    return {
      selectedProducts,
      uploadedReferences,
      ideaBank: {
        ...(ideaBankContext?.status ? { status: ideaBankContext.status } : {}),
        suggestionCount: ideaBankContext?.suggestionCount ?? 0,
        topIdeas,
      },
    };
  }, [ideaBankContext, orch.selectedProducts, orch.tempUploads]);

  useEffect(() => {
    if (!isCollapseEnabled || forceExpanded) return;
    try {
      localStorage.setItem('agent-chat-open', String(isOpen));
    } catch {
      // ignore
    }
  }, [forceExpanded, isCollapseEnabled, isOpen]);

  useEffect(() => {
    if (forceExpanded && !isOpen) {
      setIsOpen(true);
    }
  }, [forceExpanded, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!externalMessage || !externalMessage.text?.trim()) return;
    if (consumedExternalMessageRef.current === externalMessage.id) return;
    if (isStreaming) return;

    consumedExternalMessageRef.current = externalMessage.id;
    setIsOpen(true);
    sendMessage(externalMessage.text, buildMessageContext());
    onExternalMessageConsumed?.(externalMessage.id);
  }, [buildMessageContext, externalMessage, isStreaming, onExternalMessageConsumed, sendMessage]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input, buildMessageContext());
    setInput('');
  };

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

  const toggleVoice = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    const recognition = new SpeechRecognitionCtor();
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn('w-full mb-6', className)}>
      <button
        onClick={() => {
          if (isCollapseEnabled) {
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          'w-full flex items-center justify-between px-5 py-4 rounded-2xl',
          'bg-card/60 border border-border/60 hover:bg-card/80 transition-all',
          isOpen && 'rounded-b-none border-b-0',
          !isCollapseEnabled && 'cursor-default',
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <span className="text-base font-semibold block leading-tight">{title}</span>
            <span className="text-xs text-muted-foreground">
              {messages.length > 0
                ? `${messages.length} message${messages.length !== 1 ? 's' : ''}`
                : 'Ask anything about your ads'}
            </span>
          </div>
        </div>
        {isCollapseEnabled &&
          (isOpen ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ))}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border border-t-0 border-border/60 rounded-b-2xl bg-card/40 backdrop-blur-md">
              <div className={cn(bodyMaxHeightClassName, 'overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide')}>
                {(ideaBankBridgeState === 'waiting' || ideaBankBridgeState === 'sent' || ideaBankContext?.status) && (
                  <div className="text-sm rounded-xl border border-border bg-muted/40 px-4 py-3 text-muted-foreground">
                    {ideaBankBridgeState === 'waiting' && 'Idea Bank is running. I will use the results when ready.'}
                    {ideaBankBridgeState === 'sent' && 'Idea Bank results were sent to this chat.'}
                    {ideaBankBridgeState !== 'waiting' &&
                      ideaBankBridgeState !== 'sent' &&
                      ideaBankContext?.status === 'ready' &&
                      `${ideaBankContext.suggestionCount} idea bank result(s) ready for planning.`}
                    {(ideaBankBridgeState === 'error' || ideaBankContext?.status === 'error') &&
                      (ideaBankContext?.error || 'Idea Bank failed to load.')}
                  </div>
                )}

                {orch.tempUploads.length > 0 && (
                  <div className="text-sm rounded-xl border border-border bg-muted/40 px-4 py-3 text-muted-foreground">
                    {orch.tempUploads.length} uploaded reference image
                    {orch.tempUploads.length !== 1 ? 's' : ''} ready for generation.
                  </div>
                )}

                {messages.length === 0 && (
                  <div className="text-center py-10 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mx-auto">
                      <Bot className="w-6 h-6 text-violet-400" />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Ask me to generate ads, find products, write copy, or set up your campaign.
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}

                {isStreaming && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <div
                        className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <div
                        className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                    Thinking...
                  </div>
                )}

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">{error}</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSubmit} className="p-4 border-t border-border/60">
                <div className="flex items-end gap-3 rounded-xl bg-muted/50 border border-border/40 px-4 py-3 focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/20 transition-all">
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleUploadInputChange}
                    className="hidden"
                  />

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => uploadInputRef.current?.click()}
                      disabled={isStreaming || isUploading || remainingUploadSlots <= 0}
                      className="h-9 w-9 p-0 rounded-lg hover:bg-background/60"
                      title={
                        remainingUploadSlots > 0
                          ? `Upload images (${remainingUploadSlots} slot${remainingUploadSlots === 1 ? '' : 's'} left)`
                          : 'Image upload limit reached'
                      }
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                    </Button>

                    {hasSpeech && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleVoice}
                        className={cn('h-9 w-9 p-0 rounded-lg hover:bg-background/60', isListening && 'text-red-500')}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>

                  <textarea
                    ref={inputRef as unknown as React.RefObject<HTMLTextAreaElement>}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isListening
                        ? 'Listening...'
                        : isUploading
                          ? 'Uploading images...'
                          : 'Type a message... (Enter to send, Shift+Enter for new line)'
                    }
                    disabled={isStreaming}
                    rows={2}
                    className="flex-1 bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground resize-none min-h-[52px] max-h-[120px] py-1"
                  />

                  <div className="flex items-center gap-1 shrink-0">
                    {messages.length > 0 && !isStreaming && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearMessages}
                        className="h-9 w-9 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/60"
                        title="Clear chat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}

                    {isStreaming ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={stopStreaming}
                        className="h-9 w-9 p-0 rounded-lg text-destructive hover:bg-destructive/10"
                      >
                        <Square className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!input.trim()}
                        className="h-9 w-9 p-0 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-30"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
