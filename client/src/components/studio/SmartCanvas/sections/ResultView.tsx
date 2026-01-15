import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStudioState } from '@/hooks/useStudioState';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SimplifiedCopyPanel } from '@/components/SimplifiedCopyPanel';
import { LinkedInPostPreview } from '@/components/LinkedInPostPreview';
import {
  Download,
  RefreshCw,
  Pencil,
  MessageCircle,
  Send,
  Loader2,
  Eye,
  FolderPlus,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ResultView - Generated image display with actions
 *
 * Features:
 * - Generated image display
 * - Action buttons (download, regenerate, edit, save)
 * - Refine panel for editing
 * - Ask AI panel for suggestions
 * - LinkedIn preview
 * - Copy generation
 */
export function ResultView() {
  const queryClient = useQueryClient();
  const {
    state: { generatedImage, generationId, prompt, platform, generatedCopy },
    clearGeneration,
    setGeneratedCopy,
  } = useStudioState();

  const [showRefine, setShowRefine] = useState(false);
  const [showAskAI, setShowAskAI] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Edit states
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Ask AI states
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          generationId,
          editPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Edit failed');
      }

      return response.json();
    },
    onMutate: () => {
      setIsEditing(true);
    },
    onSuccess: () => {
      setEditPrompt('');
      queryClient.invalidateQueries({ queryKey: ['generations'] });
    },
    onSettled: () => {
      setIsEditing(false);
    },
  });

  // Ask AI mutation
  const askAIMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          generationId,
          question: aiQuestion,
        }),
      });

      if (!response.ok) {
        throw new Error('Ask AI failed');
      }

      return response.json();
    },
    onMutate: () => {
      setIsAskingAI(true);
    },
    onSuccess: (data) => {
      setAiResponse(data.response);
      setAiQuestion('');
    },
    onSettled: () => {
      setIsAskingAI(false);
    },
  });

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
        <img
          src={generatedImage}
          alt="Generated ad"
          className="w-full h-auto"
        />

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

        <Button
          variant={showRefine ? 'default' : 'outline'}
          onClick={() => setShowRefine(!showRefine)}
          className="gap-2"
        >
          <Pencil className="w-4 h-4" />
          Refine
        </Button>

        <Button
          variant={showAskAI ? 'default' : 'outline'}
          onClick={() => setShowAskAI(!showAskAI)}
          className="gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Ask AI
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

      {/* Refine Panel */}
      {showRefine && (
        <div className="p-4 rounded-lg border border-border bg-card space-y-3">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Refine Image
          </h3>
          <Textarea
            placeholder="Describe the changes you want to make..."
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            className="min-h-[80px]"
          />
          <Button
            onClick={() => editMutation.mutate()}
            disabled={!editPrompt.trim() || isEditing}
            className="gap-2"
          >
            {isEditing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Apply Edit
              </>
            )}
          </Button>
        </div>
      )}

      {/* Ask AI Panel */}
      {showAskAI && (
        <div className="p-4 rounded-lg border border-border bg-card space-y-3">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Ask AI About This Image
          </h3>

          {aiResponse && (
            <div className="p-3 rounded-lg bg-muted text-sm">
              {aiResponse}
            </div>
          )}

          <div className="flex gap-2">
            <Textarea
              placeholder="Ask a question about the generated image..."
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              className="min-h-[60px] flex-1"
            />
            <Button
              onClick={() => askAIMutation.mutate()}
              disabled={!aiQuestion.trim() || isAskingAI}
              size="icon"
              className="shrink-0"
            >
              {isAskingAI ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* LinkedIn Preview */}
      {showPreview && platform === 'LinkedIn' && (
        <div className="p-4 rounded-lg border border-border bg-card space-y-3">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Eye className="w-4 h-4" />
            LinkedIn Post Preview
          </h3>
          <LinkedInPostPreview
            imageUrl={generatedImage}
            caption={generatedCopy}
          />
        </div>
      )}

      {/* Copy Generation */}
      {generationId && (
        <div className="p-4 rounded-lg border border-border bg-card space-y-3">
          <h3 className="font-medium text-sm">Ad Copy</h3>
          <SimplifiedCopyPanel
            generationId={generationId}
            platform={platform.toLowerCase() as any}
            onCopyGenerated={setGeneratedCopy}
          />
        </div>
      )}
    </div>
  );
}
