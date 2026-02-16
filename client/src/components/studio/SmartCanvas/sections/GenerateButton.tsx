import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStudioState } from '@/hooks/useStudioState';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { getProductImageUrl } from '@/lib/utils';

interface PriceEstimate {
  estimatedCost: number;
  p90: number;
  sampleCount: number;
  usedFallback: boolean;
}

/**
 * GenerateButton - Main generation trigger with price estimate
 */
export function GenerateButton() {
  const queryClient = useQueryClient();
  const {
    state: {
      selectedProducts,
      tempUploads,
      prompt,
      platform,
      aspectRatio,
      resolution,
      generationMode,
      generationRecipe,
      selectedTemplate,
    },
    canGenerate,
    isGenerating,
    setGenerating,
    setResult,
  } = useStudioState();

  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);

  // Fetch price estimate
  useEffect(() => {
    const fetchEstimate = async () => {
      try {
        const res = await fetch('/api/estimate-cost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            imageCount: selectedProducts.length + tempUploads.filter(u => u.status === 'confirmed').length,
            resolution,
          }),
        });
        if (res.ok) {
          setPriceEstimate(await res.json());
        }
      } catch {
        // Ignore estimate errors
      }
    };

    if (canGenerate) {
      fetchEstimate();
    }
  }, [selectedProducts.length, tempUploads.length, resolution, canGenerate]);

  // Generation mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      // Collect all image URLs
      const productUrls = selectedProducts
        .map((p) => getProductImageUrl(p.cloudinaryUrl))
        .filter(Boolean);

      const uploadUrls = tempUploads
        .filter((u) => u.status === 'confirmed')
        .map((u) => u.previewUrl);

      const allImageUrls = [...productUrls, ...uploadUrls];

      if (allImageUrls.length === 0) {
        throw new Error('No images selected');
      }

      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          imageUrls: allImageUrls,
          prompt,
          platform,
          outputSize: aspectRatio,
          quality: resolution,
          mode: generationMode,
          templateId: selectedTemplate?.id,
          recipe: generationRecipe,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      return response.json();
    },
    onMutate: () => {
      setGenerating();
    },
    onSuccess: (data) => {
      setResult(data.imageUrl, data.generationId);
      queryClient.invalidateQueries({ queryKey: ['generations'] });
    },
    onError: (_error) => {
      // Reset to idle on error - error handling could be enhanced
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
        className="w-full h-12 text-lg"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Image
          </>
        )}
      </Button>

      {/* Price estimate and info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          {selectedProducts.length + tempUploads.filter(u => u.status === 'confirmed').length} image
          {selectedProducts.length + tempUploads.filter(u => u.status === 'confirmed').length !== 1 ? 's' : ''} selected
        </span>
        {priceEstimate && (
          <span>
            Est. ${priceEstimate.estimatedCost.toFixed(3)}
          </span>
        )}
      </div>
    </div>
  );
}
