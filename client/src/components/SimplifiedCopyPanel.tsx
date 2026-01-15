import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, RefreshCw, Copy, Check } from 'lucide-react';

interface SimplifiedCopyPanelProps {
  generationId: string;
  platform?: 'linkedin' | 'instagram' | 'facebook' | 'twitter' | 'tiktok';
  productName?: string;
  productDescription?: string;
  onCopyGenerated?: (copy: string) => void;
  className?: string;
}

export function SimplifiedCopyPanel({
  generationId,
  platform = 'linkedin',
  productName = 'Product',
  productDescription = 'Professional product for marketing',
  onCopyGenerated,
  className = '',
}: SimplifiedCopyPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copy, setCopy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/copy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate copy');
      }

      if (data.variations && data.variations.length > 0) {
        const generatedCopy = data.variations[0].copy || data.variations[0].caption || '';
        setCopy(generatedCopy);
        onCopyGenerated?.(generatedCopy);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate copy');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!copy) return;
    try {
      await navigator.clipboard.writeText(copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in some browsers/contexts
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        data-testid="generate-copy-button-simplified"
        className="w-full"
        variant={copy ? 'outline' : 'default'}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : copy ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate Copy
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Copy
          </>
        )}
      </Button>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      {copy && (
        <div className="p-3 bg-muted rounded-md text-sm space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium">Generated Ad Copy:</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyToClipboard}
              className="h-8 px-2"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="whitespace-pre-wrap text-muted-foreground">{copy}</p>
        </div>
      )}
    </div>
  );
}
