import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type {
  IdeaBankSuggestResponse,
  TemplateSlotSuggestion,
  TemplateContext,
  GenerationMode,
  GenerationRecipe,
  IdeaBankMode,
} from "./types";
import type { IdeaBankTemplateResponse } from "@shared/types/ideaBank";
import type { Product } from "@shared/schema";
import type { AnalyzedUpload } from "@/types/analyzedUpload";
import { getCsrfToken } from "@/lib/queryClient";

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
  const [mergedPrompt, setMergedPrompt] = useState<string>("");
  const [templateContext, setTemplateContext] = useState<TemplateContext | null>(null);

  // Memoize filtered uploads
  const selectedUploads = useMemo(
    () => tempUploads.filter((u) => u.selected && u.status === "confirmed" && u.description),
    [tempUploads]
  );

  const analyzingCount = useMemo(
    () => tempUploads.filter((u) => u.status === "analyzing").length,
    [tempUploads]
  );

  // Memoize dependency keys for effect
  const productIdsKey = useMemo(
    () => selectedProducts.map((p) => p.id).join(","),
    [selectedProducts]
  );

  const uploadDescriptionsKey = useMemo(
    () => selectedUploads.map((u) => u.description).join(","),
    [selectedUploads]
  );

  // Process API response
  const processResponse = useCallback(
    (data: unknown) => {
      const typedData = data as Record<string, unknown>;

      if (mode === "template" && typedData.slotSuggestions) {
        const templateResponse = typedData as unknown as IdeaBankTemplateResponse;
        setSlotSuggestions(templateResponse.slotSuggestions);
        setMergedPrompt(templateResponse.mergedPrompt);
        setTemplateContext(templateResponse.template);
        setResponse(null);
        setLegacyMode(false);
        if (onRecipeAvailable && templateResponse.recipe) {
          onRecipeAvailable(templateResponse.recipe);
        }
      } else if (typedData.suggestions && typedData.analysisStatus) {
        setResponse(typedData as unknown as IdeaBankSuggestResponse);
        setSlotSuggestions([]);
        setMergedPrompt("");
        setTemplateContext(null);
        setLegacyMode(false);
      } else if (Array.isArray(typedData)) {
        setResponse({
          suggestions: (typedData as string[]).map((prompt: string, idx: number) => ({
            id: `legacy-${idx}`,
            summary: `Legacy suggestion ${idx + 1}`,
            prompt,
            mode: "standard" as GenerationMode,
            reasoning: "Generated from legacy endpoint",
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
        setMergedPrompt("");
        setTemplateContext(null);
        setLegacyMode(true);
      }
    },
    [mode, onRecipeAvailable]
  );

  // Retry protection: track consecutive failures to prevent endless loops
  const failCountRef = useRef(0);
  const MAX_CONSECUTIVE_FAILURES = 3;

  // Fetch suggestions handler
  const fetchSuggestions = useCallback(async () => {
    // Stop if we've failed too many times in a row
    if (failCountRef.current >= MAX_CONSECUTIVE_FAILURES) {
      setError("Too many failed attempts. Click refresh to try again.");
      return;
    }

    setLoading(true);
    setError(null);

    const uploadDescriptions = selectedUploads
      .map((u) => u.description)
      .filter((d): d is string => !!d);

    const requestBody = {
      productIds: selectedProducts.map((p) => p.id),
      uploadDescriptions: uploadDescriptions.length > 0 ? uploadDescriptions : undefined,
      maxSuggestions: 6,
      mode: mode || "freestyle",
      templateId: mode === "template" ? templateId : undefined,
    };

    try {
      const csrfToken = await getCsrfToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      };

      const res = await fetch("/api/idea-bank/suggest", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        failCountRef.current = 0; // Reset on success
        processResponse(await res.json());
      } else {
        failCountRef.current++;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Refresh CSRF token for retry
        const freshToken = await getCsrfToken();
        const retryRes = await fetch("/api/idea-bank/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": freshToken },
          credentials: "include",
          body: JSON.stringify(requestBody),
        });

        if (!retryRes.ok) {
          throw new Error("Retry failed - unable to generate suggestions");
        }
        failCountRef.current = 0; // Reset on success
        processResponse(await retryRes.json());
      }
    } catch (err: unknown) {
      failCountRef.current++;
      setError(err instanceof Error ? err.message : "Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  }, [selectedProducts, selectedUploads, mode, templateId, processResponse]);

  // Clear state helper
  const clearState = useCallback(() => {
    setResponse(null);
    setSlotSuggestions([]);
    setMergedPrompt("");
    setTemplateContext(null);
    setError(null);
  }, []);

  // Fetch suggestions when dependencies change
  useEffect(() => {
    const hasProducts = selectedProducts.length > 0;
    const hasSelectedUploads = selectedUploads.length > 0;

    if (mode === "template" && !templateId) {
      setSlotSuggestions([]);
      setMergedPrompt("");
      setTemplateContext(null);
      return;
    }

    if (hasProducts || hasSelectedUploads) {
      fetchSuggestions();
    } else {
      clearState();
    }
  }, [productIdsKey, uploadDescriptionsKey, mode, templateId, fetchSuggestions, clearState]);

  // Manual refresh resets fail counter so user can retry
  const manualRefresh = useCallback(() => {
    failCountRef.current = 0;
    return fetchSuggestions();
  }, [fetchSuggestions]);

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
