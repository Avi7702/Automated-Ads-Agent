import React, { useEffect, useState } from 'react';
import './EditPanel.css';

interface HistoryItem {
  id: string;
  editPrompt: string | null;
  imageUrl: string;
  createdAt: string;
}

interface EditHistoryProps {
  generationId: string;
  currentId: string;
  onSelectVersion: (id: string) => void;
}

export function EditHistory({ generationId, currentId, onSelectVersion }: EditHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/generations/${generationId}/history`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load history');
        }

        const data = await response.json();
        setHistory(data.history);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [generationId]);

  if (isLoading) {
    return <div className="edit-history loading">Loading history...</div>;
  }

  if (error) {
    return <div className="edit-history error">{error}</div>;
  }

  if (history.length <= 1) {
    return null; // Don't show history for unedited images
  }

  return (
    <div className="edit-history">
      <h4>Edit History ({history.length} versions)</h4>
      <div className="history-timeline">
        {history.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`history-item ${item.id === currentId ? 'current' : ''}`}
            onClick={() => onSelectVersion(item.id)}
            title={item.editPrompt || 'Original'}
          >
            <img src={item.imageUrl} alt={`Version ${index + 1}`} loading="lazy" />
            <div className="history-info">
              <span className="version">v{index + 1}</span>
              {item.editPrompt ? (
                <span className="edit-prompt">{item.editPrompt}</span>
              ) : (
                <span className="original">Original</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
