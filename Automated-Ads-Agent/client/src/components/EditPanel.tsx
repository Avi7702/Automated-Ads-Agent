import React, { useState } from 'react';
import './EditPanel.css';

interface EditPanelProps {
  generationId: string;
  onEditComplete: (newGenerationId: string, imageUrl: string) => void;
  onCancel: () => void;
}

const QUICK_PRESETS = [
  { label: 'Warmer lighting', prompt: 'Make the lighting warmer and more inviting' },
  { label: 'Cooler tones', prompt: 'Adjust to cooler, more professional tones' },
  { label: 'More contrast', prompt: 'Increase the contrast for more dramatic effect' },
  { label: 'Softer look', prompt: 'Make the image softer and more gentle' },
  { label: 'Crop tighter', prompt: 'Crop the image tighter on the main subject' },
  { label: 'Add depth', prompt: 'Add more depth and dimension to the scene' },
];

export function EditPanel({ generationId, onEditComplete, onCancel }: EditPanelProps) {
  const [editPrompt, setEditPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (prompt: string) => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/generations/${generationId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Edit failed');
      }

      const data = await response.json();
      onEditComplete(data.generationId, data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Edit failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(editPrompt);
  };

  return (
    <div className="edit-panel">
      <h3>Edit Image</h3>

      {error && <div className="edit-error">{error}</div>}

      <div className="quick-presets">
        <h4>Quick Edits</h4>
        <div className="preset-buttons">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleSubmit(preset.prompt)}
              disabled={isLoading}
              className="preset-button"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="custom-edit">
        <h4>Custom Edit</h4>
        <textarea
          value={editPrompt}
          onChange={(e) => setEditPrompt(e.target.value)}
          placeholder="Describe how you want to modify the image..."
          disabled={isLoading}
          rows={3}
          maxLength={1000}
        />
        <div className="char-count">{editPrompt.length}/1000</div>
        <div className="button-row">
          <button
            type="submit"
            disabled={isLoading || !editPrompt.trim()}
            className="submit-button"
          >
            {isLoading ? 'Editing...' : 'Apply Edit'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="cancel-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
