// @ts-nocheck
/**
 * useCarouselBuilder — Business logic for CarouselBuilder.
 * Handles outline generation, slide image generation, downloads, and clipboard.
 */
import { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// ── Types ────────────────────────────────────────────────

export interface CarouselSlide {
  slideNumber: number;
  purpose: 'hook' | 'problem' | 'point' | 'solution' | 'proof' | 'cta';
  headline: string;
  body: string;
  imagePrompt: string;
  imageUrl?: string;
  isGenerating?: boolean;
  error?: string;
}

export interface CarouselOutline {
  title: string;
  description: string;
  slideCount: number;
  slides: CarouselSlide[];
  captionCopy: string;
  hashtags: string[];
}

interface UseCarouselBuilderOptions {
  templateId: string;
  topic: string;
  platform: string;
  productImageUrls?: string[];
  productNames?: string[];
  aspectRatio?: string;
}

// ── Hook ─────────────────────────────────────────────────

export function useCarouselBuilder({
  templateId,
  topic,
  platform,
  productImageUrls = [],
  productNames = [],
  aspectRatio = '1080x1350',
}: UseCarouselBuilderOptions) {
  const [outline, setOutline] = useState<CarouselOutline | null>(null);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // Generate carousel outline
  const generateOutlineMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/content-planner/carousel-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          templateId,
          topic,
          slideCount: 7, // 2026 sweet spot
          platform,
          productNames,
        }),
      });
      if (!response.ok) throw new Error('Failed to generate carousel outline');
      return response.json();
    },
    onSuccess: (data) => {
      setOutline(data.outline);
      setSlides(
        data.outline.slides.map((s: CarouselSlide) => ({
          ...s,
          imageUrl: undefined,
          isGenerating: false,
        })),
      );
    },
  });

  // Generate image for a specific slide
  const generateSlideImage = async (slideIndex: number) => {
    const slide = slides[slideIndex];
    if (!slide) return;

    setSlides((prev) => prev.map((s, i) => (i === slideIndex ? { ...s, isGenerating: true, error: undefined } : s)));

    try {
      const imagePrompt = `${slide.imagePrompt}.
        Slide ${slideIndex + 1} of carousel about "${topic}".
        Purpose: ${slide.purpose}.
        Headline: "${slide.headline}".
        Design: Clean, professional, minimal text overlay ready.
        Aspect ratio: Portrait (4:5) for Instagram/LinkedIn carousel.`;

      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: imagePrompt,
          resolution: '2K',
          aspectRatio,
          mode: productImageUrls.length > 0 ? 'inspiration' : 'standard',
          productImageUrls: productImageUrls.slice(0, 2),
        }),
      });

      if (!response.ok) throw new Error('Failed to generate image');

      const data = await response.json();
      const imageUrl = data.imageUrl || data.url;

      setSlides((prev) => prev.map((s, i) => (i === slideIndex ? { ...s, isGenerating: false, imageUrl } : s)));
    } catch {
      setSlides((prev) =>
        prev.map((s, i) => (i === slideIndex ? { ...s, isGenerating: false, error: 'Failed to generate image' } : s)),
      );
    }
  };

  // Generate all slide images sequentially
  const generateAllImages = async () => {
    for (let i = 0; i < slides.length; i++) {
      await generateSlideImage(i);
    }
  };

  // Update a single slide's field
  const updateSlide = (index: number, field: keyof CarouselSlide, value: string) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  // Download single slide
  const downloadSlide = async (slideIndex: number) => {
    const slide = slides[slideIndex];
    if (!slide?.imageUrl) return;
    try {
      const response = await fetch(slide.imageUrl);
      const blob = await response.blob();
      saveAs(blob, `slide-${slideIndex + 1}-${slide.purpose}.png`);
    } catch (error) {
      console.error('Failed to download slide:', error);
    }
  };

  // Download all as ZIP
  const downloadAllAsZip = async () => {
    const zip = new JSZip();
    const slidesWithImages = slides.filter((s) => s.imageUrl);
    if (slidesWithImages.length === 0) return;

    for (const slide of slidesWithImages) {
      try {
        const response = await fetch(slide.imageUrl!);
        const blob = await response.blob();
        zip.file(`slide-${slide.slideNumber}-${slide.purpose}.png`, blob);
      } catch (error) {
        console.error(`Failed to add slide ${slide.slideNumber} to ZIP:`, error);
      }
    }

    if (outline?.captionCopy) {
      const captionText = `${outline.captionCopy}\n\n${outline.hashtags.map((h) => `#${h}`).join(' ')}`;
      zip.file('caption.txt', captionText);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `carousel-${topic.slice(0, 30).replace(/\s+/g, '-')}.zip`);
  };

  // Copy caption to clipboard
  const copyCaption = () => {
    if (!outline) return;
    const fullCaption = `${outline.captionCopy}\n\n${outline.hashtags.map((h) => `#${h}`).join(' ')}`;
    navigator.clipboard.writeText(fullCaption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  // Initial outline generation
  useEffect(() => {
    generateOutlineMutation.mutate();
  }, [templateId, topic]);

  // Derived state
  const slidesWithImagesCount = slides.filter((s) => s.imageUrl).length;
  const allSlidesGenerated = slidesWithImagesCount === slides.length && slides.length > 0;
  const isAnyGenerating = slides.some((s) => s.isGenerating);

  return {
    // Data
    outline,
    slides,
    activeSlide,
    isPreviewMode,
    copiedCaption,
    slidesWithImagesCount,
    allSlidesGenerated,
    isAnyGenerating,

    // Mutation state
    isOutlinePending: generateOutlineMutation.isPending,
    isOutlineError: generateOutlineMutation.isError,
    retryOutline: () => generateOutlineMutation.mutate(),

    // Setters
    setActiveSlide,
    setIsPreviewMode,

    // Handlers
    generateSlideImage,
    generateAllImages,
    updateSlide,
    downloadSlide,
    downloadAllAsZip,
    copyCaption,
  };
}
