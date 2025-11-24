import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  className?: string;
}

export function PromptInput({ value, onChange, onSubmit, isGenerating, className }: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={cn("relative group", className)}>
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/5 focus-within:ring-primary/50 transition-all duration-300">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want (e.g., 'Make this look like a premium lifestyle shot in a misty forest...')"
          className="w-full border-0 px-6 py-5 text-lg placeholder:text-muted-foreground/50 focus:ring-0 resize-none min-h-[80px] outline-none bg-[#23252f]"
          rows={1}
          disabled={isGenerating}
        />
        
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="text-xs text-muted-foreground font-mono px-2">
            {value.length > 0 ? "Analyzing intent..." : "Waiting for input..."}
          </div>
          
          <button
            onClick={onSubmit}
            disabled={!value.trim() || isGenerating}
            className={cn(
              "h-10 px-6 rounded-xl font-medium flex items-center gap-2 transition-all duration-300",
              value.trim() && !isGenerating
                ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 hover:scale-105"
                : "bg-secondary text-muted-foreground cursor-not-allowed opacity-50"
            )}
          >
            {isGenerating ? (
              <>
                <span className="animate-spin">✨</span>
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
