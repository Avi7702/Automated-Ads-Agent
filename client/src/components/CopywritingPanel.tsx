// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, Check, Sparkles, ChevronDown, ChevronUp, Trash2, RefreshCw } from "lucide-react";

const PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: "📸" },
  { value: "linkedin", label: "LinkedIn", icon: "💼" },
  { value: "twitter", label: "Twitter/X", icon: "🐦" },
  { value: "facebook", label: "Facebook", icon: "📘" },
  { value: "tiktok", label: "TikTok", icon: "🎵" },
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "fun", label: "Fun & Playful" },
  { value: "luxury", label: "Luxury" },
  { value: "minimal", label: "Minimal" },
  { value: "authentic", label: "Authentic" },
];

const FRAMEWORKS = [
  { value: "auto", label: "Auto (AI Chooses)" },
  { value: "aida", label: "AIDA (Attention-Interest-Desire-Action)" },
  { value: "pas", label: "PAS (Problem-Agitate-Solution)" },
  { value: "bab", label: "BAB (Before-After-Bridge)" },
  { value: "fab", label: "FAB (Features-Advantages-Benefits)" },
];

interface AdCopy {
  id: string;
  headline: string;
  hook: string;
  bodyText: string;
  cta: string;
  caption: string;
  hashtags: string[];
  platform: string;
  tone: string;
  qualityScore: { overall: number; relevance: number; engagement: number; clarity: number; reasoning: string } | null;
  createdAt: string;
  variationNumber: number;
}

interface CopywritingPanelProps {
  generationId: string;
  prompt: string;
}

export function CopywritingPanel({ generationId, prompt }: CopywritingPanelProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [platform, setPlatform] = useState("instagram");
  const [tone, setTone] = useState("professional");
  const [framework, setFramework] = useState("auto");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState(prompt || "");
  const [industry, setIndustry] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: existingCopies = [], isLoading: isLoadingCopies } = useQuery<AdCopy[]>({
    queryKey: ["adCopy", generationId],
    queryFn: async () => {
      const res = await fetch(`/api/copy/generation/${generationId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/copy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId,
          platform,
          tone,
          framework: framework === "auto" ? undefined : framework,
          productName: productName || "Product",
          productDescription: productDescription || prompt,
          industry: industry || "General",
          variations: 3,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate copy");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adCopy", generationId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (copyId: string) => {
      const res = await fetch(`/api/copy/${copyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adCopy", generationId] });
    },
  });

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const platformIcon = PLATFORMS.find(p => p.value === platform)?.icon || "📱";

  return (
    <div className="border rounded-2xl bg-card/50 backdrop-blur-sm overflow-hidden" data-testid="copywriting-panel">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
        data-testid="button-toggle-copywriting"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-semibold">Generate Ad Copy</span>
          {existingCopies.length > 0 && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              {existingCopies.length} saved
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-border/50">
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Platform</label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger data-testid="select-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.icon} {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Tone</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger data-testid="select-tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Copywriting Framework</label>
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger data-testid="select-framework">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FRAMEWORKS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Industry</label>
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., Fashion, Tech, Food"
                data-testid="input-industry"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Product Name</label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter your product name"
                data-testid="input-product-name"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Product Description</label>
              <Textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Describe your product and key features"
                rows={3}
                data-testid="input-product-description"
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full"
            data-testid="button-generate-copy"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating 3 variations...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate {platformIcon} Ad Copy
              </>
            )}
          </Button>

          {generateMutation.isError && (
            <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg" data-testid="text-copy-error">
              {generateMutation.error?.message?.includes("429") || generateMutation.error?.message?.includes("quota") 
                ? "AI service is temporarily busy. Please try again in a few minutes."
                : generateMutation.error?.message || "Failed to generate copy"}
            </div>
          )}

          {isLoadingCopies && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading saved copies...
            </div>
          )}

          {existingCopies.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Generated Copies ({existingCopies.length})</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  data-testid="button-regenerate-copy"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
                  Generate More
                </Button>
              </div>

              <div className="space-y-4">
                {existingCopies.map((copy) => (
                  <div
                    key={copy.id}
                    className="border rounded-xl p-4 space-y-4 bg-background/50"
                    data-testid={`copy-card-${copy.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{PLATFORMS.find(p => p.value === copy.platform)?.icon}</span>
                        <span className="text-sm font-medium capitalize">{copy.platform}</span>
                        <span className="text-xs text-muted-foreground">• {copy.tone}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">V{copy.variationNumber}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(copy.id)}
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        data-testid={`button-delete-copy-${copy.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <CopyBlock label="Headline" text={copy.headline} id={`${copy.id}-headline`} copiedId={copiedId} onCopy={handleCopy} />
                      <CopyBlock label="Hook" text={copy.hook} id={`${copy.id}-hook`} copiedId={copiedId} onCopy={handleCopy} />
                      <CopyBlock label="Caption" text={copy.caption} id={`${copy.id}-caption`} copiedId={copiedId} onCopy={handleCopy} isLarge />
                      <CopyBlock label="CTA" text={copy.cta} id={`${copy.id}-cta`} copiedId={copiedId} onCopy={handleCopy} />
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">Hashtags</span>
                          <button
                            onClick={() => handleCopy(copy.hashtags.join(" "), `${copy.id}-hashtags`)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                            data-testid={`button-copy-hashtags-${copy.id}`}
                          >
                            {copiedId === `${copy.id}-hashtags` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            Copy all
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {copy.hashtags.map((tag, i) => (
                            <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              {tag.startsWith("#") ? tag : `#${tag}`}
                            </span>
                          ))}
                        </div>
                      </div>

                      {copy.qualityScore && (
                        <div className="pt-3 border-t border-border/50">
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-muted-foreground">Quality Score:</span>
                            <span className={`font-medium ${copy.qualityScore.overall >= 80 ? 'text-green-700 dark:text-green-400' : copy.qualityScore.overall >= 60 ? 'text-yellow-700 dark:text-yellow-400' : 'text-red-700 dark:text-red-400'}`}>
                              {copy.qualityScore.overall}/100
                            </span>
                            <span className="text-muted-foreground">Relevance: {copy.qualityScore.relevance}</span>
                            <span className="text-muted-foreground">Engagement: {copy.qualityScore.engagement}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CopyBlock({ 
  label, 
  text, 
  id, 
  copiedId, 
  onCopy, 
  isLarge = false 
}: { 
  label: string; 
  text: string; 
  id: string; 
  copiedId: string | null; 
  onCopy: (text: string, id: string) => void;
  isLarge?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <button
          onClick={() => onCopy(text, id)}
          className="text-xs text-primary hover:underline flex items-center gap-1"
          data-testid={`button-copy-${id}`}
        >
          {copiedId === id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          Copy
        </button>
      </div>
      <p className={`text-sm ${isLarge ? 'whitespace-pre-wrap' : ''}`} data-testid={`text-${id}`}>
        {text}
      </p>
    </div>
  );
}
