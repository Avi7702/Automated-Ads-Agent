import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Layers, Check, Play } from 'lucide-react';
import { useState } from 'react';

interface InstallationScenario {
  id: string;
  title: string;
  description: string;
  steps: string[];
  scenarioType: string;
  isActive: boolean;
  createdAt: string;
}

export function ScenariosTab() {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  // Fetch scenarios
  const { data: scenarios = [], isLoading } = useQuery<InstallationScenario[]>({
    queryKey: ['installationScenarios'],
    queryFn: async () => {
      const res = await fetch('/api/installation-scenarios', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch scenarios');
      return res.json();
    },
  });

  // Filter to active scenarios
  const activeScenarios = scenarios.filter((s) => s.isActive);

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
        Select installation scenarios to guide generation.
      </p>

      {/* Scenario List */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
        {activeScenarios.length > 0 ? (
          activeScenarios.map((scenario) => {
            const isSelected = selectedScenario === scenario.id;
            return (
              <button
                key={scenario.id}
                onClick={() =>
                  setSelectedScenario(isSelected ? null : scenario.id)
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
                      <Play className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{scenario.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                      {scenario.description}
                    </p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4">
                        {scenario.scenarioType}
                      </Badge>
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
                        {scenario.steps?.length || 0} steps
                      </Badge>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No active scenarios</p>
            <p className="text-[10px] mt-1">Create scenarios in Library</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
        {activeScenarios.length} active scenario{activeScenarios.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
