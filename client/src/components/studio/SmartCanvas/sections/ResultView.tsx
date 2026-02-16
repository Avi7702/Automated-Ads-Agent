import { useState } from 'react';
import { useStudioState } from '@/hooks/useStudioState';
import { Button } from '@/components/ui/button';
import { SimplifiedCopyPanel } from '@/components/SimplifiedCopyPanel';
import { LinkedInPostPreview } from '@/components/LinkedInPostPreview';
import { Download, RefreshCw, Eye } from 'lucide-react';

/**
 * ResultView - Generated image display with actions
 *
 * Features:
 * - Generated image display
 * - Action buttons (download, regenerate)
 * - LinkedIn preview
 * - Copy generation
 */
export function ResultView() {
  const {
    state: { generatedImage, generationId, platform, generatedCopy },
    clearGeneration,
    setGeneratedCopy,
  } = useStudioState();

  const [showPreview, setShowPreview] = useState(false);

  const copyPlatform: 'linkedin' | 'instagram' | 'facebook' | 'twitter' | 'tiktok' = (() => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return 'instagram';
      case 'facebook':
        return 'facebook';
      case 'twitter':
        return 'twitter';
      case 'tiktok':
        return 'tiktok';
      default:
        return 'linkedin';
    }
  })();

  // Download handler
  const handleDownload = async () => {
    if (!generatedImage) return;

    const response = await fetch(generatedImage);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-ad-${generationId}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!generatedImage) return null;

  return (
    <div className="space-y-6">
      {/* Generated Image */}
      <div className="relative rounded-xl overflow-hidden border border-border bg-card">
        <img src={generatedImage} alt="Generated ad" className="w-full h-auto" />

        {/* Action overlay */}
        <div className="absolute top-3 right-3 flex gap-2">
          <Button size="icon" variant="secondary" onClick={handleDownload}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={clearGeneration} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          New Generation
        </Button>

        {platform === 'LinkedIn' && (
          <Button
            variant={showPreview ? 'default' : 'outline'}
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview
          </Button>
        )}
      </div>

      {/* LinkedIn Preview */}
      {showPreview && platform === 'LinkedIn' && (
        <div className="p-4 rounded-lg border border-border bg-card space-y-3">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Eye className="w-4 h-4" />
            LinkedIn Post Preview
          </h3>
          <LinkedInPostPreview authorName="Your Brand" postText={generatedCopy} imageUrl={generatedImage} />
        </div>
      )}

      {/* Copy Generation */}
      {generationId && (
        <div className="p-4 rounded-lg border border-border bg-card space-y-3">
          <h3 className="font-medium text-sm">Ad Copy</h3>
          <SimplifiedCopyPanel generationId={generationId} platform={copyPlatform} onCopyGenerated={setGeneratedCopy} />
        </div>
      )}
    </div>
  );
}
