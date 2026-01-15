import { useStudioState } from '@/hooks/useStudioState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Linkedin, Instagram, Facebook, Twitter, Monitor } from 'lucide-react';

const platforms = [
  { value: 'LinkedIn', icon: Linkedin, label: 'LinkedIn' },
  { value: 'Instagram', icon: Instagram, label: 'Instagram' },
  { value: 'Facebook', icon: Facebook, label: 'Facebook' },
  { value: 'Twitter', icon: Twitter, label: 'Twitter/X' },
  { value: 'TikTok', icon: Monitor, label: 'TikTok' },
];

const aspectRatios = [
  { value: '1200x627', label: 'LinkedIn (1200x627)', platform: 'LinkedIn' },
  { value: '1080x1080', label: 'Square (1080x1080)', platform: 'Instagram' },
  { value: '1080x1920', label: 'Story (1080x1920)', platform: 'Instagram' },
  { value: '1200x630', label: 'Facebook (1200x630)', platform: 'Facebook' },
  { value: '1200x675', label: 'Twitter (1200x675)', platform: 'Twitter' },
  { value: '1080x1920', label: 'TikTok (1080x1920)', platform: 'TikTok' },
];

const resolutions = [
  { value: '1K', label: '1K (Draft)', description: 'Fast, lower quality' },
  { value: '2K', label: '2K (Standard)', description: 'Recommended' },
  { value: '4K', label: '4K (Premium)', description: 'Highest quality' },
];

/**
 * OutputSettings - Platform, aspect ratio, and resolution selection
 */
export function OutputSettings() {
  const {
    state: { platform, aspectRatio, resolution },
    setPlatform,
    setAspectRatio,
    setResolution,
  } = useStudioState();

  // Get relevant aspect ratios for selected platform
  const relevantRatios = aspectRatios.filter(
    (r) => r.platform === platform || !r.platform
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Platform */}
      <div className="space-y-2">
        <Label className="text-xs">Platform</Label>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {platforms.map((p) => {
              const Icon = p.icon;
              return (
                <SelectItem key={p.value} value={p.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {p.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label className="text-xs">Size / Aspect Ratio</Label>
        <Select value={aspectRatio} onValueChange={setAspectRatio}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {relevantRatios.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resolution */}
      <div className="space-y-2">
        <Label className="text-xs">Quality</Label>
        <Select
          value={resolution}
          onValueChange={(v) => setResolution(v as '1K' | '2K' | '4K')}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {resolutions.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                <div>
                  <span>{r.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {r.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
