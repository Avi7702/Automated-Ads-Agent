import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface LearnedPattern {
  id: string;
  title: string;
  description: string;
  source: string;
  platform: string;
  patternType: string;
  confidence: number;
  createdAt: string;
}

export function PatternsTab() {
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

  // Fetch learned patterns
  const { data: patterns = [], isLoading } = useQuery<LearnedPattern[]>({
    queryKey: ['learnedPatterns'],
    queryFn: async () => {
      const res = await fetch('/api/learned-patterns', { credentials: 'include' });
      if (!res.ok) {
        // Endpoint might not exist yet
        return [];
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Info */}
      <p className="text-xs text-muted-foreground">
        Apply patterns learned from high-performing ads.
      </p>

      {/* Pattern List */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
        {patterns.length > 0 ? (
          patterns.map((pattern) => {
            const isSelected = selectedPattern === pattern.id;
            return (
              <button
                key={pattern.id}
                onClick={() =>
                  setSelectedPattern(isSelected ? null : pattern.id)
                }
                className={cn(
                  'w-full text-left p-2 rounded-lg border-2 transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                      isSelected ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    {isSelected ? (
                      <Check className="w-3 h-3 text-white" />
                    ) : (
                      <TrendingUp className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{pattern.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                      {pattern.description}
                    </p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4">
                        {pattern.platform}
                      </Badge>
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
                        {Math.round(pattern.confidence * 100)}% conf
                      </Badge>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No learned patterns</p>
            <p className="text-[10px] mt-1">Analyze winning ads to learn patterns</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
        {patterns.length} pattern{patterns.length !== 1 ? 's' : ''} available
      </div>
    </div>
  );
}
