import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Clock, List, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { useHistoryPanelUrl } from '@/hooks/useUrlState';
import { typedGet } from '@/lib/typedFetch';
import { ListGenerationsResponse } from '@shared/contracts/generations.contract';

interface HistoryPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelectGeneration?: ((id: string) => void) | undefined;
  className?: string | undefined;
}

interface Generation {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
  platform: string;
  status?: string | undefined;
}

const tabs = [
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'all', label: 'All', icon: List },
] as const;

type TabId = (typeof tabs)[number]['id'];

/**
 * HistoryPanel - Right collapsible panel for generation history
 *
 * Replaces Gallery and GenerationDetail pages with inline panel.
 * URL state: /?view=history&generation=:id
 */
export function HistoryPanel({ isOpen, onToggle, onSelectGeneration, className }: HistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const { selectedGenerationId, selectGeneration } = useHistoryPanelUrl();

  // Fetch generations (typed with Zod contract)
  const { data: generations = [], isLoading } = useQuery<Generation[]>({
    queryKey: ['generations'],
    queryFn: async () => {
      const all = await typedGet('/api/generations', ListGenerationsResponse);
      return (all as unknown as Generation[]).filter((g) => !g.status || g.status === 'completed');
    },
  });

  // Filter by tab
  const filteredGenerations = (() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    switch (activeTab) {
      case 'recent':
        return generations.filter((g) => new Date(g.createdAt) > oneDayAgo);
      case 'all':
      default:
        return generations;
    }
  })();

  const handleSelect = (id: string) => {
    selectGeneration(id);
    onSelectGeneration?.(id);
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-card border-l border-border transition-all duration-300',
        isOpen ? 'w-80' : 'w-12',
        className,
      )}
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onToggle} className={cn('h-8 w-8', !isOpen && 'mx-auto')}>
          {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        {isOpen && <h2 className="text-sm font-medium text-foreground">History</h2>}
      </div>

      {/* Collapsed state - just icon */}
      {!isOpen && (
        <div className="flex flex-col items-center gap-2 py-4">
          <Button variant="ghost" size="icon" onClick={onToggle} title="Open History" className="h-8 w-8">
            <History className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Expanded state */}
      {isOpen && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabId)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="w-full justify-start px-3 pt-3 bg-transparent gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex-1 gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <ScrollArea className="flex-1 p-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredGenerations.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {filteredGenerations.map((gen) => (
                  <button
                    key={gen.id}
                    onClick={() => handleSelect(gen.id)}
                    className={cn(
                      'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                      selectedGenerationId === gen.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50',
                    )}
                  >
                    <img
                      src={gen.imageUrl}
                      alt={gen.prompt?.slice(0, 50) || 'Generated image'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                      <p className="text-white text-[10px] truncate">{new Date(gen.createdAt).toLocaleDateString()}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">{activeTab === 'recent' ? 'No recent generations' : 'No generations yet'}</p>
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="text-xs text-muted-foreground text-center p-2 border-t">
            {filteredGenerations.length} generation
            {filteredGenerations.length !== 1 ? 's' : ''}
          </div>
        </Tabs>
      )}
    </div>
  );
}
