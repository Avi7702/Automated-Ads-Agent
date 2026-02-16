import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  IdeaBankSuggestResponse,
  TemplateSlotSuggestion,
  TemplateContext,
  GenerationMode,
  GenerationRecipe,
  IdeaBankMode,
} from './types';
import type { IdeaBankTemplateResponse } from '@shared/types/ideaBank';
import type { Product } from '@shared/schema';
import type { AnalyzedUpload } from '@/types/analyzedUpload';
import { getCsrfToken } from '@/lib/queryClient';
import { IdeaBankSuggestResponseDTO } from '@shared/contracts/ideaBank.contract';

interface UseIdeaBankFetchProps {
  selectedProducts: Product[];
  tempUploads: AnalyzedUpload[];
  mode: IdeaBankMode;
  templateId?: string;
  onRecipeAvailable?: (recipe: GenerationRecipe | undefined) => void;
}

interface UseIdeaBankFetchResult {
  loading: boolean;
  error: string | null;
  response: IdeaBankSuggestResponse | null;
  legacyMode: boolean;
  slotSuggestions: TemplateSlotSuggestion[];
  mergedPrompt: string;
  templateContext: TemplateContext | null;
  selectedUploads: AnalyzedUpload[];
  analyzingCount: number;
  fetchSuggestions: () => Promise<void>;
}

export function useIdeaBankFetch({
  selectedProducts,
  tempUploads,
  mode,
  templateId,
  onRecipeAvailable,
}: UseIdeaBankFetchProps): UseIdeaBankFetchResult {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<IdeaBankSuggestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [legacyMode, setLegacyMode] = useState(false);
  const [slotSuggestions, setSlotSuggestions] = useState<TemplateSlotSuggestion[]>([]);
  const [mergedPrompt, setMergedPrompt] = useState<string>('');
  const [templateContext, setTemplateContext] = useState<TemplateContext | null>(null);

  // Memoize filtered uploads
  const selectedUploads = useMemo(
    () => tempUploads.filter((u) => u.selected && u.status === 'confirmed' && u.description),
    [tempUploads],
  );

  const analyzingCount = useMemo(() => tempUploads.filter((u) => u.status === 'analyzing').length, [tempUploads]);

  // Stable dependency keys — only these trigger re-fetches
  const productIdsKey = useMemo(() => selectedProducts.map((p) => p.id).join(','), [selectedProducts]);

  const uploadDescriptionsKey = useMemo(() => selectedUploads.map((u) => u.description).join(','), [selectedUploads]);

  // Refs to break the dependency cycle and prevent concurrent/infinite fetches
  const fetchInProgressRef = useRef(false);
  const failCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const MAX_CONSECUTIVE_FAILURES = 3;

  // Use refs for latest values so the fetch function doesn't need them as deps
  const latestPropsRef = useRef({ selectedProducts, selectedUploads, mode, templateId, onRecipeAvailable });
  latestPropsRef.current = { selectedProducts, selectedUploads, mode, templateId, onRecipeAvailable };

  // Process API response — reads mode/onRecipeAvailable from ref
  const processResponse = useCallback((data: unknown) => {
    // Runtime schema validation (warns on mismatch, never breaks)
    const validationResult = IdeaBankSuggestResponseDTO.safeParse(data);
    if (!validationResult.success) {
      console.warn('[useIdeaBankFetch] Schema validation warning:', validationResult.error.issues);
    }

    const typedData = data as Record<string, unknown>;
    const { mode: currentMode, onRecipeAvailable: onRecipe } = latestPropsRef.current;

    if (currentMode === 'template' && typedData.slotSuggestions) {
      const templateResponse = typedData as unknown as IdeaBankTemplateResponse;
      setSlotSuggestions(templateResponse.slotSuggestions);
      setMergedPrompt(templateResponse.mergedPrompt);
      setTemplateContext(templateResponse.template);
      setResponse(null);
      setLegacyMode(false);
      if (onRecipe && templateResponse.recipe) {
        onRecipe(templateResponse.recipe);
      }
    } else if (typedData.suggestions && typedData.analysisStatus) {
      setResponse(typedData as unknown as IdeaBankSuggestResponse);
      setSlotSuggestions([]);
      setMergedPrompt('');
      setTemplateContext(null);
      setLegacyMode(false);
    } else if (Array.isArray(typedData)) {
      setResponse({
        suggestions: (typedData as string[]).map((prompt: string, idx: number) => ({
          id: `legacy-${idx}`,
          summary: `Legacy suggestion ${idx + 1}`,
          prompt,
          mode: 'standard' as GenerationMode,
          reasoning: 'Generated from legacy endpoint',
          confidence: 0.7,
          sourcesUsed: {
            visionAnalysis: false,
            kbRetrieval: false,
            webSearch: false,
            templateMatching: true,
          },
        })),
        analysisStatus: {
          visionComplete: false,
          kbQueried: false,
          templatesMatched: (typedData as string[]).length,
          webSearchUsed: false,
        },
      });
      setSlotSuggestions([]);
      setMergedPrompt('');
      setTemplateContext(null);
      setLegacyMode(true);
    }
  }, []); // Stable — reads from ref

  // Core fetch function — stable reference, reads latest props from ref
  const doFetch = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) return;

    // Stop after too many consecutive failures
    if (failCountRef.current >= MAX_CONSECUTIVE_FAILURES) {
      setError('Too many failed attempts. Click refresh to try again.');
      return;
    }

    const { selectedProducts: prods, selectedUploads: uploads, mode: m, templateId: tId } = latestPropsRef.current;

    fetchInProgressRef.current = true;
    setLoading(true);
    setError(null);

    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const uploadDescriptions = uploads.map((u) => u.description).filter((d): d is string => !!d);

    const requestBody = {
      productIds: prods.map((p) => p.id),
      uploadDescriptions: uploadDescriptions.length > 0 ? uploadDescriptions : undefined,
      maxSuggestions: 6,
      mode: m || 'freestyle',
      templateId: m === 'template' ? tId : undefined,
    };

    try {
      const csrfToken = await getCsrfToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      };

      const res = await fetch('/api/idea-bank/suggest', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (res.ok) {
        failCountRef.current = 0;
        processResponse(await res.json());
      } else {
        failCountRef.current++;
        // Single retry with backoff — don't retry on 429
        if (res.status !== 429 && failCountRef.current < MAX_CONSECUTIVE_FAILURES) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const freshToken = await getCsrfToken();
          const retryRes = await fetch('/api/idea-bank/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-csrf-token': freshToken },
            credentials: 'include',
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          if (retryRes.ok) {
            failCountRef.current = 0;
            processResponse(await retryRes.json());
          } else {
            const errorText =
              res.status === 429
                ? 'Rate limited — please wait a moment and try again'
                : 'Retry failed - unable to generate suggestions';
            throw new Error(errorText);
          }
        } else {
          const errorText =
            res.status === 429 ? 'Rate limited — please wait a moment and try again' : `Server error (${res.status})`;
          throw new Error(errorText);
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // Cancelled, not a failure
      failCountRef.current++;
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      fetchInProgressRef.current = false;
      setLoading(false);
    }
  }, [processResponse]); // Stable — processResponse is stable

  // Auto-fetch when REAL data dependencies change (not function references)
  useEffect(() => {
    const hasProducts = selectedProducts.length > 0;
    const hasSelectedUploads = selectedUploads.length > 0;

    if (mode === 'template' && !templateId) {
      setSlotSuggestions([]);
      setMergedPrompt('');
      setTemplateContext(null);
      return;
    }

    if (hasProducts || hasSelectedUploads) {
      doFetch();
    } else {
      setResponse(null);
      setSlotSuggestions([]);
      setMergedPrompt('');
      setTemplateContext(null);
      setError(null);
    }

    return () => {
      abortControllerRef.current?.abort();
    };
    // Only re-fetch when actual DATA changes — NOT function references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdsKey, uploadDescriptionsKey, mode, templateId]);

  // Manual refresh resets fail counter
  const manualRefresh = useCallback(async () => {
    failCountRef.current = 0;
    fetchInProgressRef.current = false; // Allow fetch after manual reset
    return doFetch();
  }, [doFetch]);

  return {
    loading,
    error,
    response,
    legacyMode,
    slotSuggestions,
    mergedPrompt,
    templateContext,
    selectedUploads,
    analyzingCount,
    fetchSuggestions: manualRefresh,
  };
}
