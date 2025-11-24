import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PromptSuggestionsProps {
  productName?: string;
  category?: string;
  onSelect: (suggestion: string) => void;
  className?: string;
}

export function PromptSuggestions({ productName, category, onSelect, className }: PromptSuggestionsProps) {
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/prompt-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          productName: productName || "product",
          category 
        }),
      });
      
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      const data = await res.json();
      setSuggestions(data);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  if (suggestions.length === 0 && !loadingSuggestions) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Need inspiration?</p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={fetchSuggestions}
          data-testid="button-get-suggestions"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Get AI Prompt Ideas
        </Button>
      </div>
    );
  }

  if (loadingSuggestions) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-sm text-muted-foreground">Generating creative ideas...</p>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI-Generated Ideas
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchSuggestions}
          data-testid="button-refresh-suggestions"
        >
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(suggestion)}
            className="text-left p-3 rounded-lg bg-card border border-border hover:border-primary hover:bg-card/80 transition-all text-sm"
            data-testid={`suggestion-${index}`}
          >
            {suggestion}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
