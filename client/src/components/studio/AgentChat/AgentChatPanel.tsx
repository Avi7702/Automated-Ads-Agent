// @ts-nocheck
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
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from './ChatMessage';
import { useAgentChat, type AgentChatMessageContext } from './useAgentChat';
import type { StudioOrchestrator } from '@/hooks/useStudioOrchestrator';
import type { AnalyzedUpload, ImageAnalysisResponse } from '@/types/analyzedUpload';
import type { IdeaBankContextSnapshot } from '@/components/ideabank/types';

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
  const { toast } = useToast();
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
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
        toast({
          title: 'No images found',
          description: 'Please choose image files to upload.',
          variant: 'destructive',
        });
        return;
      }

      if (remainingUploadSlots <= 0) {
        toast({
          title: 'Image limit reached',
          description: `You can use up to ${maxImageInputs} total images (products + uploads).`,
          variant: 'destructive',
        });
        return;
      }

      const filesToAdd = imageFiles.slice(0, remainingUploadSlots);
      if (filesToAdd.length < imageFiles.length) {
        toast({
          title: 'Some files skipped',
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

        toast({
          title: 'Images uploaded',
          description: `${filesToAdd.length} image(s) added to your generation context.`,
        });
      } catch {
        toast({
          title: 'Upload failed',
          description: 'Could not process the uploaded images.',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [analyzeUpload, isUploading, maxImageInputs, orch, remainingUploadSlots, toast],
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
            const products = payload.products as Record<string, unknown>[];
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
            const copies = payload.copies as Record<string, unknown>[];
            if (copies?.length > 0) {
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
        status: ideaBankContext?.status,
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

    const SpeechRecognitionCtor =
      window.SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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
    <div className={cn('w-full mb-6', className)}>
      <button
        onClick={() => {
          if (isCollapseEnabled) {
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 rounded-xl',
          'bg-card/50 border border-border hover:bg-card/80 transition-colors',
          isOpen && 'rounded-b-none border-b-0',
          !isCollapseEnabled && 'cursor-default',
        )}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium">{title}</span>
          {messages.length > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {messages.length} msg{messages.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {isCollapseEnabled &&
          (isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
            <div className="border border-t-0 border-border rounded-b-xl bg-card/30 backdrop-blur-sm">
              <div className={cn(bodyMaxHeightClassName, 'overflow-y-auto p-4 space-y-3 scrollbar-hide')}>
                {(ideaBankBridgeState === 'waiting' || ideaBankBridgeState === 'sent' || ideaBankContext?.status) && (
                  <div className="text-xs rounded-lg border border-border bg-muted/40 px-3 py-2 text-muted-foreground">
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
                  <div className="text-xs rounded-lg border border-border bg-muted/40 px-3 py-2 text-muted-foreground">
                    {orch.tempUploads.length} uploaded reference image
                    {orch.tempUploads.length !== 1 ? 's' : ''} ready for generation.
                  </div>
                )}

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

              <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-border">
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadInputChange}
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={isStreaming || isUploading || remainingUploadSlots <= 0}
                  className="h-8 w-8 p-0"
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
                  placeholder={isListening ? 'Listening...' : isUploading ? 'Uploading images...' : 'Type a message...'}
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
