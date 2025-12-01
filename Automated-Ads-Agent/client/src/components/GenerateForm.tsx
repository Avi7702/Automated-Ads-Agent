import { useState } from 'react';
import './GenerateForm.css';

interface GenerateFormProps {
  onComplete: (generation: { id: string; imageUrl: string }) => void;
}

const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square (1:1)' },
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '9:16', label: 'Portrait (9:16)' },
  { value: '4:3', label: 'Classic (4:3)' },
];

export function GenerateForm({ onComplete }: GenerateFormProps) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt, aspectRatio }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data = await response.json();
      onComplete({ id: data.generationId, imageUrl: data.imageUrl });
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="generate-form">
      {error && <div className="generate-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="prompt">Describe your image</label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A professional product photo of..."
          disabled={isLoading}
          rows={4}
          maxLength={2000}
        />
        <div className="char-count">{prompt.length}/2000</div>
      </div>

      <div className="form-group">
        <label htmlFor="aspectRatio">Aspect Ratio</label>
        <select
          id="aspectRatio"
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value)}
          disabled={isLoading}
        >
          {ASPECT_RATIOS.map((ratio) => (
            <option key={ratio.value} value={ratio.value}>
              {ratio.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading || !prompt.trim()}
        className="generate-button"
      >
        {isLoading ? 'Generating...' : 'Generate Image'}
      </button>
    </form>
  );
}
