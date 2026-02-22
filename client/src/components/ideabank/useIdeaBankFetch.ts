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
  templateId?: string | undefined;
  onRecipeAvailable?: ((recipe: GenerationRecipe | undefined) => void) | undefined;
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

interface IdeaBankCacheEntry {
  savedAt: number;
  response: IdeaBankSuggestResponse | null;
  legacyMode: boolean;
  slotSuggestions: TemplateSlotSuggestion[];
  mergedPrompt: string;
  templateContext: TemplateContext | null;
}

type IdeaBankCacheStore = Record<string, IdeaBankCacheEntry>;

const IDEA_BANK_CACHE_KEY = 'idea-bank-cache-v1';
const IDEA_BANK_CACHE_TTL_MS = 30 * 60 * 1000;
const IDEA_BANK_CACHE_MAX_ENTRIES = 12;

function readIdeaBankCacheStore(): IdeaBankCacheStore {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.sessionStorage.getItem(IDEA_BANK_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as IdeaBankCacheStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeIdeaBankCacheStore(store: IdeaBankCacheStore): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(IDEA_BANK_CACHE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage failures (private mode / quota)
  }
}

function getFreshIdeaBankCacheEntry(cacheContextKey: string): IdeaBankCacheEntry | null {
  const store = readIdeaBankCacheStore();
  const entry = store[cacheContextKey];

  if (!entry) return null;

  if (Date.now() - entry.savedAt > IDEA_BANK_CACHE_TTL_MS) {
    delete store[cacheContextKey];
    writeIdeaBankCacheStore(store);
    return null;
  }

  return entry;
}

function saveIdeaBankCacheEntry(cacheContextKey: string, entry: IdeaBankCacheEntry): void {
  const store = readIdeaBankCacheStore();
  store[cacheContextKey] = entry;

  const entries = Object.entries(store).sort((a, b) => b[1].savedAt - a[1].savedAt);
  const trimmed = entries.slice(0, IDEA_BANK_CACHE_MAX_ENTRIES);
  const nextStore: IdeaBankCacheStore = Object.fromEntries(trimmed);

  writeIdeaBankCacheStore(nextStore);
}

async function readErrorMessageFromResponse(res: Response): Promise<string> {
  const retryAfter = res.headers?.get?.('retry-after') ?? null;

  try {
    const body = (await res.json()) as { error?: unknown; message?: unknown };
    const apiError =
      typeof body['error'] === 'string' ? body['error'] : typeof body['message'] === 'string' ? body['message'] : '';

    if (res.status === 429) {
      return apiError || (retryAfter ? `Rate limited. Retry in ${retryAfter}s.` : 'Rate limited - please try again.');
    }

    return apiError || `Server error (${res.status})`;
  } catch {
    if (res.status === 429) {
      return retryAfter ? `Rate limited. Retry in ${retryAfter}s.` : 'Rate limited - please try again.';
    }
    return `Server error (${res.status})`;
  }
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

  // Stable dependency keys - only these trigger re-fetches
  const productIdsKey = useMemo(() => selectedProducts.map((p) => p.id).join(','), [selectedProducts]);

  const uploadDescriptionsKey = useMemo(() => selectedUploads.map((u) => u.description).join(','), [selectedUploads]);

  const cacheContextKey = useMemo(
    () => `${mode}|${templateId || ''}|${productIdsKey}|${uploadDescriptionsKey}`,
    [mode, templateId, productIdsKey, uploadDescriptionsKey],
  );

  // Refs to break the dependency cycle and prevent concurrent/infinite fetches
  const fetchInProgressRef = useRef(false);
  const failCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const MAX_CONSECUTIVE_FAILURES = 3;

  // Use refs for latest values so the fetch function doesn't need them as deps
  const latestPropsRef = useRef({ selectedProducts, selectedUploads, mode, templateId, onRecipeAvailable });
  latestPropsRef.current = { selectedProducts, selectedUploads, mode, templateId, onRecipeAvailable };

  // Restore cached suggestions for this context so ideas survive tab/page navigation.
  useEffect(() => {
    const cached = getFreshIdeaBankCacheEntry(cacheContextKey);
    if (!cached) return;

    setResponse(cached.response);
    setLegacyMode(cached.legacyMode);
    setSlotSuggestions(cached.slotSuggestions);
    setMergedPrompt(cached.mergedPrompt);
    setTemplateContext(cached.templateContext);
    setError(null);
  }, [cacheContextKey]);

  // Persist latest successful state in session storage for quick restore.
  useEffect(() => {
    const hasState =
      response !== null || slotSuggestions.length > 0 || mergedPrompt.length > 0 || templateContext !== null;
    if (!hasState) return;

    saveIdeaBankCacheEntry(cacheContextKey, {
      savedAt: Date.now(),
      response,
      legacyMode,
      slotSuggestions,
      mergedPrompt,
      templateContext,
    });
  }, [cacheContextKey, response, legacyMode, slotSuggestions, mergedPrompt, templateContext]);

  // Process API response - reads mode/onRecipeAvailable from ref
  const processResponse = useCallback((data: unknown) => {
    // Runtime schema validation (warns on mismatch, never breaks)
    const validationResult = IdeaBankSuggestResponseDTO.safeParse(data);
    if (!validationResult.success) {
      console.warn('[useIdeaBankFetch] Schema validation warning:', validationResult.error.issues);
    }

    const typedData = data as Record<string, unknown>;
    const { mode: currentMode, onRecipeAvailable: onRecipe } = latestPropsRef.current;

    if (currentMode === 'template' && typedData['slotSuggestions']) {
      const templateResponse = typedData as unknown as IdeaBankTemplateResponse;
      setSlotSuggestions(templateResponse.slotSuggestions);
      setMergedPrompt(templateResponse.mergedPrompt);
      setTemplateContext(templateResponse.template);
      setResponse(null);
      setLegacyMode(false);
      if (onRecipe && templateResponse.recipe) {
        onRecipe(templateResponse.recipe);
      }
    } else if (typedData['suggestions'] && typedData['analysisStatus']) {
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
  }, []); // Stable - reads from ref

  // Core fetch function - stable reference, reads latest props from ref
  const doFetch = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current && !abortControllerRef.current?.signal.aborted) return;

    // Stop after too many consecutive failures
    if (failCountRef.current >= MAX_CONSECUTIVE_FAILURES) {
      setError('Too many failed attempts. Click refresh to try again.');
      return;
    }

    const { selectedProducts: prods, selectedUploads: uploads, mode: m, templateId: tId } = latestPropsRef.current;
    let failureCounted = false;

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
        failureCounted = true;
        // Single retry with backoff - don't retry on 429
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
            const retryErrorText = await readErrorMessageFromResponse(retryRes);
            throw new Error(retryErrorText);
          }
        } else {
          const errorText = await readErrorMessageFromResponse(res);
          throw new Error(errorText);
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // Cancelled, not a failure
      if (!failureCounted) {
        failCountRef.current++;
      }
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      fetchInProgressRef.current = false;
      setLoading(false);
    }
  }, [processResponse]); // Stable - processResponse is stable

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
    // Only re-fetch when actual DATA changes - NOT function references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdsKey, uploadDescriptionsKey, mode, templateId, cacheContextKey]);

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
