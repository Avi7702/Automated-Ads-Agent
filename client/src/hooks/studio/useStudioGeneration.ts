/**
 * useStudioGeneration — Image/video generation, editing, downloads
 */
import { useState, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { getCsrfToken } from '@/lib/queryClient';
import { typedPostFormData } from '@/lib/typedFetch';
import { TransformResponse } from '@shared/contracts/generations.contract';
import { toast } from 'sonner';
import { useHaptic } from '@/hooks/useHaptic';
import type {
  GenerationState,
  CopyResult,
  PlanContext,
  Product,
  AnalyzedUpload,
  GenerationRecipe,
  GenerationMode,
  IdeaBankMode,
  AdSceneTemplate,
} from './types';

interface UseStudioGenerationOptions {
  selectedProducts: Product[];
  tempUploads: AnalyzedUpload[];
  prompt: string;
  quickStartMode: boolean;
  quickStartPrompt: string;
  resolution: '1K' | '2K' | '4K';
  ideaBankMode: IdeaBankMode;
  selectedTemplateForMode: AdSceneTemplate | null;
  generationMode: GenerationMode;
  generationRecipe: GenerationRecipe | undefined;
  planContext: PlanContext | null;
  platform: string;
  aspectRatio: string;
  videoDuration: '4' | '6' | '8';
}

export function useStudioGeneration(options: UseStudioGenerationOptions) {
  const [, setLocation] = useLocation();
  const { haptic } = useHaptic();

  // ── Generation State ──────────────────────────────────
  const [state, setState] = useState<GenerationState>('idle');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Edit / Ask AI ─────────────────────────────────────
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [askAIQuestion, setAskAIQuestion] = useState('');
  const [askAIResponse, setAskAIResponse] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);

  // ── Ad Copy ───────────────────────────────────────────
  const [generatedCopy, setGeneratedCopy] = useState('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const generatedImageUrl = generatedImage;
  const [generatedCopyFull, setGeneratedCopyFull] = useState<CopyResult | null>(null);

  // ── Video Mode ──────────────────────────────────────
  const [videoJobId, setVideoJobId] = useState<string | null>(null);
  const [generatedMediaType, setGeneratedMediaType] = useState<'image' | 'video'>('image');
  const videoPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── UX Feedback ───────────────────────────────────────
  const [justCopied, setJustCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ── Handlers ──────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    const {
      selectedProducts,
      tempUploads,
      quickStartMode,
      quickStartPrompt,
      prompt,
      resolution,
      ideaBankMode,
      selectedTemplateForMode,
      generationMode,
      generationRecipe,
      planContext,
    } = options;

    const hasImages = selectedProducts.length > 0 || tempUploads.length > 0;
    const isQuickStart = quickStartMode || (quickStartPrompt.trim().length > 0 && !hasImages);
    if (!hasImages && !isQuickStart) return;
    const finalPrompt = isQuickStart ? quickStartPrompt : prompt;
    if (!finalPrompt.trim()) return;

    setState('generating');
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const formData = new FormData();
      if (!isQuickStart) {
        if (selectedProducts.length > 0) {
          formData.append('productIds', JSON.stringify(selectedProducts.map((p) => p.id)));
        }
        tempUploads.forEach((upload) => formData.append('images', upload.file));
      }

      formData.append('prompt', finalPrompt);
      formData.append('resolution', resolution);

      if (ideaBankMode === 'template' && selectedTemplateForMode) {
        formData.append('mode', generationMode);
        formData.append('templateId', selectedTemplateForMode.id);
      }

      if (generationRecipe) {
        formData.append('recipe', JSON.stringify(generationRecipe));
      }

      const data = await typedPostFormData('/api/transform', formData, TransformResponse, {
        signal: controller.signal,
      });
      setGeneratedImage(data.imageUrl ?? null);
      setGenerationId(data.generationId ?? null);
      setState('result');
      localStorage.removeItem('studio-prompt-draft');

      if (planContext && data.generationId) {
        const csrfToken = await getCsrfToken().catch(() => '');
        fetch(`/api/planner/weekly/${planContext.planId}/posts/${planContext.postIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
          credentials: 'include',
          body: JSON.stringify({ status: 'generated', generationId: data.generationId }),
        }).catch(console.error);
      }

      setTimeout(() => {
        document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.info('Generation cancelled');
        setState('idle');
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to generate image: ${message}`);
      setState('idle');
    } finally {
      abortControllerRef.current = null;
    }
  }, [options]);

  const handleCancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState('idle');
  }, []);

  const handleGenerateVideo = useCallback(async () => {
    const { quickStartPrompt, prompt, videoDuration, aspectRatio, resolution } = options;
    const finalPrompt = quickStartPrompt.trim() || prompt.trim();
    if (!finalPrompt) return;

    setState('generating');
    setGeneratedMediaType('video');

    try {
      const token = await getCsrfToken().catch(() => '');
      const response = await fetch('/api/generations/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        credentials: 'include',
        body: JSON.stringify({
          prompt: finalPrompt,
          duration: videoDuration,
          aspectRatio: aspectRatio === '1080x1920' || aspectRatio === '1080x1350' ? '9:16' : '16:9',
          videoResolution: resolution === '4K' ? '4k' : resolution === '1K' ? '720p' : '1080p',
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to start video generation');
      }

      const data = await response.json();
      setGenerationId(data.generationId);
      setVideoJobId(data.jobId);

      if (videoPollIntervalRef.current) {
        clearInterval(videoPollIntervalRef.current);
        videoPollIntervalRef.current = null;
      }
      if (videoPollTimeoutRef.current) {
        clearTimeout(videoPollTimeoutRef.current);
        videoPollTimeoutRef.current = null;
      }

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/jobs/${data.jobId}`, { credentials: 'include' });
          if (!statusRes.ok) return;
          const statusData = await statusRes.json();

          if (statusData.state === 'completed' && statusData.generation?.generatedImagePath) {
            clearInterval(pollInterval);
            videoPollIntervalRef.current = null;
            if (videoPollTimeoutRef.current) {
              clearTimeout(videoPollTimeoutRef.current);
              videoPollTimeoutRef.current = null;
            }
            setGeneratedImage(statusData.generation.generatedImagePath);
            setState('result');
            setVideoJobId(null);
            toast.success('Video generated!');
          } else if (statusData.state === 'failed') {
            clearInterval(pollInterval);
            videoPollIntervalRef.current = null;
            if (videoPollTimeoutRef.current) {
              clearTimeout(videoPollTimeoutRef.current);
              videoPollTimeoutRef.current = null;
            }
            toast.error(`Video generation failed: ${statusData.failedReason || 'Unknown error'}`);
            setState('idle');
            setVideoJobId(null);
          }
        } catch {
          // silently retry on network blips
        }
      }, 5000);
      videoPollIntervalRef.current = pollInterval;

      const safetyTimeout = setTimeout(() => {
        clearInterval(pollInterval);
        videoPollIntervalRef.current = null;
        videoPollTimeoutRef.current = null;
        toast.error('Video generation timed out. Check Gallery for results.');
        setState('idle');
        setVideoJobId(null);
      }, 720_000);
      videoPollTimeoutRef.current = safetyTimeout;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Video generation failed: ${message}`);
      setState('idle');
      setGeneratedMediaType('image');
    }
  }, [options]);

  const handleDownload = useCallback(() => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `product-${generationId || Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedImage, generationId]);

  const handleDownloadWithFeedback = useCallback(async () => {
    if (!generatedImage) return;
    haptic('light');
    setIsDownloading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      handleDownload();
      haptic('medium');
      toast.success('Image downloaded!', { duration: 2000 });
    } catch {
      haptic('heavy');
      toast.error('Download failed');
    } finally {
      setTimeout(() => setIsDownloading(false), 500);
    }
  }, [generatedImage, handleDownload, haptic]);

  const handleReset = useCallback(() => {
    setState('idle');
    setGeneratedImage(null);
    setGenerationId(null);
    setGeneratedCopy('');
    setGeneratedMediaType('image');
    setVideoJobId(null);
  }, []);

  const handleApplyEdit = useCallback(async () => {
    if (!editPrompt.trim() || !generationId) return;
    haptic('light');
    setIsEditing(true);
    try {
      const editToken = await getCsrfToken().catch(() => '');
      const response = await fetch(`/api/generations/${generationId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': editToken },
        credentials: 'include',
        body: JSON.stringify({ editPrompt: editPrompt.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Edit failed');
      haptic('medium');
      toast.success('Changes applied!', { duration: 2000 });
      setLocation(`/generation/${data.generationId}`);
    } catch (error: unknown) {
      haptic('heavy');
      toast.error(error instanceof Error ? error.message : 'Edit failed');
    } finally {
      setIsEditing(false);
    }
  }, [editPrompt, generationId, haptic, setLocation]);

  const handleAskAI = useCallback(async () => {
    if (!askAIQuestion.trim() || !generationId) return;
    setIsAskingAI(true);
    setAskAIResponse(null);
    try {
      const analyzeToken = await getCsrfToken().catch(() => '');
      const response = await fetch(`/api/generations/${generationId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': analyzeToken },
        credentials: 'include',
        body: JSON.stringify({ question: askAIQuestion.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to get response');
      setAskAIResponse(data.answer);
      setAskAIQuestion('');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to get response');
    } finally {
      setIsAskingAI(false);
    }
  }, [askAIQuestion, generationId]);

  const handleGenerateCopy = useCallback(async () => {
    if (!generationId) return;
    haptic('light');
    setIsGeneratingCopy(true);
    try {
      const { selectedProducts, prompt, quickStartPrompt, platform } = options;
      const productName = selectedProducts.length > 0 ? selectedProducts.map((p) => p.name).join(', ') : 'Product';
      const productDescription =
        selectedProducts.length > 0
          ? selectedProducts.map((p) => p.description || p.name).join('. ')
          : prompt || quickStartPrompt || 'Professional product for marketing';

      const copyToken = await getCsrfToken().catch(() => '');
      const response = await fetch('/api/copy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': copyToken },
        credentials: 'include',
        body: JSON.stringify({
          generationId,
          platform: platform.toLowerCase(),
          tone: 'professional',
          productName: productName.slice(0, 100),
          productDescription: productDescription.slice(0, 500),
          industry: 'Building Products',
          framework: 'auto',
          variations: 1,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to generate copy');
      if (data.variations && data.variations.length > 0) {
        setGeneratedCopy(data.variations[0].copy);
        haptic('medium');
        toast.success('Copy generated!', { duration: 2000 });
      }
    } catch (error: unknown) {
      haptic('heavy');
      toast.error(error instanceof Error ? error.message : 'Failed to generate copy');
    } finally {
      setIsGeneratingCopy(false);
    }
  }, [generationId, haptic, options]);

  const handleCopyText = useCallback(() => {
    if (!generatedCopy) return;
    haptic('light');
    navigator.clipboard.writeText(generatedCopy);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
    toast.success('Copied to clipboard!', { duration: 2000 });
  }, [generatedCopy, haptic]);

  return {
    // State
    state,
    generatedImage,
    generationId,
    editPrompt,
    isEditing,
    askAIQuestion,
    askAIResponse,
    isAskingAI,
    generatedCopy,
    isGeneratingCopy,
    generatedImageUrl,
    generatedCopyFull,
    videoJobId,
    generatedMediaType,
    justCopied,
    isDownloading,

    // Setters
    setState,
    setGeneratedImage,
    setGenerationId,
    setEditPrompt,
    setAskAIQuestion,
    setGeneratedCopy,
    setIsGeneratingCopy,
    setGeneratedCopyFull,
    setVideoJobId,
    setGeneratedMediaType,

    // Handlers
    handleGenerate,
    handleCancelGeneration,
    handleGenerateVideo,
    handleDownload,
    handleDownloadWithFeedback,
    handleReset,
    handleApplyEdit,
    handleAskAI,
    handleGenerateCopy,
    handleCopyText,

    // Refs
    videoPollIntervalRef,
    videoPollTimeoutRef,

    // Utilities
    haptic,
  };
}
