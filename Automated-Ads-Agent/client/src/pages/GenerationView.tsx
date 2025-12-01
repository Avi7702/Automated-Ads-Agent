import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EditPanel } from '../components/EditPanel';
import { EditHistory } from '../components/EditHistory';
import './GenerationView.css';

interface Generation {
  id: string;
  prompt: string;
  imageUrl: string;
  model: string;
  aspectRatio: string;
  createdAt: string;
}

export function GenerationView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [currentId, setCurrentId] = useState<string>(id || '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchGeneration = async (genId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/generations/${genId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Generation not found');
        }
        throw new Error('Failed to fetch generation');
      }

      const data = await response.json();
      setGeneration(data);
      setCurrentId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load generation');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchGeneration(id);
    }
  }, [id]);

  const handleEditComplete = (newGenerationId: string, newImageUrl: string) => {
    // Update the URL to the new generation
    navigate(`/generation/${newGenerationId}`, { replace: true });
    setCurrentId(newGenerationId);
    fetchGeneration(newGenerationId);
    setIsEditing(false);
  };

  const handleSelectVersion = (versionId: string) => {
    navigate(`/generation/${versionId}`, { replace: true });
    setCurrentId(versionId);
    fetchGeneration(versionId);
  };

  const handleDelete = async () => {
    if (!generation) return;

    if (!confirm('Are you sure you want to delete this generation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/generations/${generation.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete generation');
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (isLoading) {
    return (
      <div className="generation-view">
        <div className="loading">Loading generation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="generation-view">
        <div className="error">
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="back-button">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!generation) {
    return null;
  }

  return (
    <div className="generation-view">
      <div className="generation-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          &larr; Back to Dashboard
        </button>
        <div className="generation-actions">
          <button onClick={() => setIsEditing(!isEditing)} className="edit-toggle-button">
            {isEditing ? 'Cancel Edit' : 'Edit Image'}
          </button>
          <button onClick={handleDelete} className="delete-button">
            Delete
          </button>
        </div>
      </div>

      <div className="generation-content">
        <div className="image-container">
          <img src={generation.imageUrl} alt={generation.prompt} />
        </div>

        <div className="details-panel">
          <div className="generation-details">
            <h1>Generation Details</h1>

            <div className="detail-item">
              <label>Prompt</label>
              <p>{generation.prompt}</p>
            </div>

            <div className="detail-row">
              <div className="detail-item">
                <label>Model</label>
                <p>{generation.model}</p>
              </div>
              <div className="detail-item">
                <label>Aspect Ratio</label>
                <p>{generation.aspectRatio}</p>
              </div>
            </div>

            <div className="detail-item">
              <label>Created</label>
              <p>{new Date(generation.createdAt).toLocaleString()}</p>
            </div>

            <div className="download-section">
              <a
                href={generation.imageUrl}
                download={`generation-${generation.id}.png`}
                className="download-button"
              >
                Download Image
              </a>
            </div>
          </div>

          {isEditing && (
            <EditPanel
              generationId={currentId}
              onEditComplete={handleEditComplete}
              onCancel={() => setIsEditing(false)}
            />
          )}

          <EditHistory
            generationId={currentId}
            currentId={currentId}
            onSelectVersion={handleSelectVersion}
          />
        </div>
      </div>
    </div>
  );
}
