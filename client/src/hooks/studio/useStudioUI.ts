/**
 * useStudioUI — UI state: collapsed sections, scroll tracking, zoom, dialogs
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { CollapsedSections, GenerationState, PriceEstimate, AnalyzedUpload } from './types';

const COLLAPSED_SECTIONS_KEY = 'studio-collapsed-sections';

function getStoredCollapsedSections(): CollapsedSections {
  try {
    const stored = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    upload: false,
    products: false,
    templates: false,
    refine: false,
    copy: true,
    preview: true,
    styleRefs: false,
  };
}

function storeCollapsedSections(sections: CollapsedSections) {
  try {
    localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(sections));
  } catch {}
}

export function useStudioUI(deps: {
  state: GenerationState;
  selectedProductsCount: number;
  tempUploadsCount: number;
  prompt: string;
  resolution: string;
}) {
  const { state, selectedProductsCount, tempUploadsCount, prompt, resolution } = deps;

  // ── Section State ─────────────────────────────────────
  const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>(getStoredCollapsedSections);
  const [currentSection, setCurrentSection] = useState('products');
  const [showContextBar, setShowContextBar] = useState(false);
  const [showStickyGenerate, setShowStickyGenerate] = useState(false);

  // ── Quick Start ───────────────────────────────────────
  const [quickStartMode, setQuickStartMode] = useState(false);
  const [quickStartPrompt, setQuickStartPrompt] = useState('');

  // ── Temporary Uploads ─────────────────────────────────
  const [tempUploads, setTempUploads] = useState<AnalyzedUpload[]>([]);

  // ── Price Estimate ────────────────────────────────────
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);

  // ── Action Buttons ────────────────────────────────────
  const [activeActionButton, setActiveActionButton] = useState<'edit' | 'copy' | 'preview' | 'save' | null>(null);

  // ── Dialogs ───────────────────────────────────────────
  const [showSaveToCatalog, setShowSaveToCatalog] = useState(false);
  const [showCanvasEditor, setShowCanvasEditor] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // ── Zoom / Pan ────────────────────────────────────────
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  // ── Media Mode ────────────────────────────────────────
  const [mediaMode, setMediaMode] = useState<'image' | 'video'>('image');
  const [videoDuration, setVideoDuration] = useState<'4' | '6' | '8'>('8');

  // ── Refs ──────────────────────────────────────────────
  const generateButtonRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);

  // ── Derived State ─────────────────────────────────────
  const progressSections = useMemo(
    () => [
      { id: 'products', label: 'Products', completed: selectedProductsCount > 0 },
      { id: 'prompt', label: 'Prompt', completed: !!prompt.trim() },
      { id: 'generate', label: 'Generate', completed: state === 'result' },
      { id: 'result', label: 'Result', completed: state === 'result' },
    ],
    [selectedProductsCount, prompt, state],
  );

  const canGenerate = useMemo(
    () => (selectedProductsCount > 0 || tempUploadsCount > 0) && prompt.trim().length > 0,
    [selectedProductsCount, tempUploadsCount, prompt],
  );

  // ── Effects ───────────────────────────────────────────

  // Persist collapsed sections
  useEffect(() => {
    storeCollapsedSections(collapsedSections);
  }, [collapsedSections]);

  // Auto-save draft prompt
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (prompt) localStorage.setItem('studio-prompt-draft', prompt);
    }, 500);
    return () => clearTimeout(timeout);
  }, [prompt]);

  // Zoom wheel handler
  useEffect(() => {
    const container = zoomContainerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      setImageScale((prev) => Math.max(0.5, Math.min(3, prev + delta)));
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Price estimate
  useEffect(() => {
    const inputImagesCount = selectedProductsCount + tempUploadsCount;
    const promptChars = prompt.length;
    if (inputImagesCount === 0 && promptChars === 0) {
      setPriceEstimate(null);
      return;
    }
    const debounceTimer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          resolution,
          operation: 'generate',
          inputImagesCount: String(inputImagesCount),
          promptChars: String(promptChars),
        });
        const res = await fetch(`/api/pricing/estimate?${params}`);
        if (res.ok) setPriceEstimate(await res.json());
      } catch {}
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [selectedProductsCount, tempUploadsCount, prompt.length, resolution]);

  // Scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowContextBar(scrollY > 200 && state === 'idle');
      if (generateButtonRef.current) {
        const rect = generateButtonRef.current.getBoundingClientRect();
        setShowStickyGenerate(rect.bottom < 0 && state === 'idle');
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [state]);

  // ── Handlers ──────────────────────────────────────────
  const toggleSection = useCallback((section: keyof CollapsedSections) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const navigateToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentSection(id);
    }
  }, []);

  return {
    // State
    collapsedSections,
    currentSection,
    showContextBar,
    showStickyGenerate,
    quickStartMode,
    quickStartPrompt,
    tempUploads,
    priceEstimate,
    activeActionButton,
    showSaveToCatalog,
    showCanvasEditor,
    showKeyboardShortcuts,
    imageScale,
    imagePosition,
    mediaMode,
    videoDuration,
    canGenerate,
    progressSections,

    // Setters
    setQuickStartMode,
    setQuickStartPrompt,
    setTempUploads,
    setActiveActionButton,
    setShowSaveToCatalog,
    setShowCanvasEditor,
    setShowKeyboardShortcuts,
    setImageScale,
    setImagePosition,
    setMediaMode,
    setVideoDuration,

    // Handlers
    toggleSection,
    navigateToSection,

    // Refs
    generateButtonRef,
    heroRef,
    zoomContainerRef,
  };
}
