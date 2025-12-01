import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { History, ChevronRight, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Generation {
  id: string;
  prompt: string;
  generatedImagePath: string;
  editPrompt?: string | null;
  parentGenerationId?: string | null;
  createdAt: string;
}

interface HistoryData {
  current: Generation;
  history: Generation[];
  totalEdits: number;
}

interface EditHistoryProps {
  generationId: string;
  onSelectGeneration?: (id: string) => void;
}

export function EditHistory({ generationId, onSelectGeneration }: EditHistoryProps) {
  const { data, isLoading, error } = useQuery<HistoryData>({
    queryKey: ["generation-history", generationId],
    queryFn: async () => {
      const response = await fetch(`/api/generations/${generationId}/history`);
      if (!response.ok) throw new Error("Failed to fetch history");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground" data-testid="history-loading">
        Loading history...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-muted-foreground" data-testid="history-error">
        Could not load edit history
      </div>
    );
  }

  const { history, totalEdits } = data;

  if (history.length <= 1) {
    return (
      <div className="p-6 text-center text-muted-foreground" data-testid="history-empty">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No edit history</p>
        <p className="text-xs mt-1">This is the original generation</p>
      </div>
    );
  }

  return (
    <div className="border rounded-2xl bg-card/50 backdrop-blur-sm overflow-hidden" data-testid="edit-history">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Edit History</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {totalEdits} edit{totalEdits !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <ScrollArea className="max-h-80">
        <div className="p-2 space-y-1">
          {history.map((gen, index) => {
            const isCurrent = gen.id === generationId;
            const isOriginal = index === 0;

            return (
              <div key={gen.id} className="relative">
                {index > 0 && (
                  <div className="absolute left-6 -top-1 w-px h-3 bg-border" />
                )}
                
                <button
                  onClick={() => onSelectGeneration?.(gen.id)}
                  className={`
                    w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors
                    ${isCurrent 
                      ? "bg-primary/10 border border-primary/30" 
                      : "hover:bg-muted"
                    }
                  `}
                  data-testid={`history-item-${gen.id}`}
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={`/${gen.generatedImagePath}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {isOriginal && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <ImageIcon className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isCurrent ? "text-primary" : ""}`}>
                        {isOriginal ? "Original" : `Edit ${index}`}
                      </span>
                      {isCurrent && (
                        <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {gen.editPrompt || gen.prompt.slice(0, 60) + (gen.prompt.length > 60 ? "..." : "")}
                    </p>
                    
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {format(new Date(gen.createdAt), "MMM d 'at' h:mm a")}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                </button>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-3 border-t bg-muted/20">
        <Link href={`/generation/${history[0].id}`}>
          <Button variant="ghost" size="sm" className="w-full" data-testid="button-view-original">
            View Original Generation
          </Button>
        </Link>
      </div>
    </div>
  );
}
