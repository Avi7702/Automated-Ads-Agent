import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GenerateForm } from '../components/GenerateForm';
import './Dashboard.css';

interface Generation {
  id: string;
  prompt: string;
  imageUrl: string;
  model: string;
  aspectRatio: string;
  createdAt: string;
}

export function Dashboard() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGenerations = async () => {
    try {
      const response = await fetch('/api/generations', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch generations');
      }

      const data = await response.json();
      setGenerations(data.generations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load generations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGenerations();
  }, []);

  const handleGenerationComplete = (newGeneration: { id: string; imageUrl: string }) => {
    // Refetch to get the full generation data
    fetchGenerations();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Your Generations</h1>
      </div>

      <div className="dashboard-content">
        <aside className="generate-sidebar">
          <h2>Generate New Image</h2>
          <GenerateForm onComplete={handleGenerationComplete} />
        </aside>

        <section className="generations-section">
          {isLoading ? (
            <div className="generations-loading">Loading generations...</div>
          ) : error ? (
            <div className="generations-error">{error}</div>
          ) : generations.length === 0 ? (
            <div className="generations-empty">
              <p>No generations yet. Create your first image!</p>
            </div>
          ) : (
            <div className="generations-grid">
              {generations.map((gen) => (
                <Link
                  key={gen.id}
                  to={`/generation/${gen.id}`}
                  className="generation-card"
                >
                  <img src={gen.imageUrl} alt={gen.prompt} loading="lazy" />
                  <div className="generation-info">
                    <p className="generation-prompt">{gen.prompt}</p>
                    <span className="generation-date">
                      {new Date(gen.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
