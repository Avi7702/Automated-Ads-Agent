// @ts-nocheck
import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, Loader2, ImagePlus, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// Options
const CATEGORIES = ['product_showcase', 'installation', 'worksite', 'professional', 'educational'];
const ENGAGEMENT_TIERS = ['top-5', 'top-10', 'top-25', 'unranked'];
const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'twitter', 'tiktok'];
const ASPECT_RATIOS = ['1:1', '4:5', '9:16', '16:9', '4:3'];
const OBJECTIVES = ['awareness', 'consideration', 'conversion', 'engagement'];
const BACKGROUND_TYPES = ['solid', 'gradient', 'image', 'video'];
const MOODS = ['professional', 'playful', 'bold', 'minimal', 'luxurious', 'energetic'];
const STYLES = ['modern', 'classic', 'retro', 'corporate', 'creative', 'elegant'];

interface AddTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddTemplateModal({ isOpen, onClose }: AddTemplateModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'product_showcase',
    sourceUrl: '',
    sourcePlatform: '',
    advertiserName: '',
    engagementTier: 'unranked',
    estimatedEngagementRate: '',
    runningDays: '',
    mood: '',
    style: '',
    backgroundType: '',
    isFeatured: false,
  });

  const [targetPlatforms, setTargetPlatforms] = useState<string[]>([]);
  const [targetAspectRatios, setTargetAspectRatios] = useState<string[]>([]);
  const [bestForObjectives, setBestForObjectives] = useState<string[]>([]);
  const [industriesInput, setIndustriesInput] = useState('');
  const [bestForIndustries, setBestForIndustries] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'product_showcase',
      sourceUrl: '',
      sourcePlatform: '',
      advertiserName: '',
      engagementTier: 'unranked',
      estimatedEngagementRate: '',
      runningDays: '',
      mood: '',
      style: '',
      backgroundType: '',
      isFeatured: false,
    });
    setTargetPlatforms([]);
    setTargetAspectRatios([]);
    setBestForObjectives([]);
    setBestForIndustries([]);
    setIndustriesInput('');
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // Toggle multi-select options
  const toggleOption = (value: string, current: string[], setter: (val: string[]) => void) => {
    if (current.includes(value)) {
      setter(current.filter((v) => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  // Add industry tag
  const addIndustry = () => {
    const trimmed = industriesInput.trim().toLowerCase();
    if (trimmed && !bestForIndustries.includes(trimmed)) {
      setBestForIndustries([...bestForIndustries, trimmed]);
      setIndustriesInput('');
    }
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const formDataToSend = new FormData();

      // Basic fields
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('engagementTier', formData.engagementTier);
      formDataToSend.append('isFeatured', String(formData.isFeatured));

      // Optional fields
      if (formData.sourceUrl) formDataToSend.append('sourceUrl', formData.sourceUrl);
      if (formData.sourcePlatform) formDataToSend.append('sourcePlatform', formData.sourcePlatform);
      if (formData.advertiserName) formDataToSend.append('advertiserName', formData.advertiserName);
      if (formData.estimatedEngagementRate) {
        formDataToSend.append('estimatedEngagementRate', formData.estimatedEngagementRate);
      }
      if (formData.runningDays) formDataToSend.append('runningDays', formData.runningDays);
      if (formData.mood) formDataToSend.append('mood', formData.mood);
      if (formData.style) formDataToSend.append('style', formData.style);
      if (formData.backgroundType) formDataToSend.append('backgroundType', formData.backgroundType);

      // JSON arrays
      if (targetPlatforms.length > 0) {
        formDataToSend.append('targetPlatforms', JSON.stringify(targetPlatforms));
      }
      if (targetAspectRatios.length > 0) {
        formDataToSend.append('targetAspectRatios', JSON.stringify(targetAspectRatios));
      }
      if (bestForObjectives.length > 0) {
        formDataToSend.append('bestForObjectives', JSON.stringify(bestForObjectives));
      }
      if (bestForIndustries.length > 0) {
        formDataToSend.append('bestForIndustries', JSON.stringify(bestForIndustries));
      }

      // Preview image
      if (previewFile) {
        formDataToSend.append('preview', previewFile);
      }

      const response = await fetch('/api/performing-ad-templates', {
        method: 'POST',
        body: formDataToSend,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create template');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Template created',
        description: 'Your template has been added to the library.',
      });
      queryClient.invalidateQueries({ queryKey: ['performing-ad-templates'] });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a template name.',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Ad Reference</DialogTitle>
          <DialogDescription>Add a high-performing ad reference to your library for inspiration.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preview Image */}
          <div className="space-y-2">
            <Label>Preview Image</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors',
                'hover:border-primary/50 hover:bg-muted/50',
                previewUrl ? 'border-primary/30' : 'border-border',
              )}
            >
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewFile(null);
                      setPreviewUrl(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImagePlus className="w-10 h-10" />
                  <span>Click to upload preview image</span>
                  <span className="text-xs">PNG, JPG up to 5MB</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Product Hero Spotlight"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what makes this template effective..."
                rows={2}
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <span className="capitalize">{cat}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Engagement Tier</Label>
              <Select
                value={formData.engagementTier}
                onValueChange={(v) => setFormData({ ...formData, engagementTier: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENGAGEMENT_TIERS.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      <span className="capitalize">{tier.replace('-', ' ')}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="engagementRate">Est. Engagement Rate (%)</Label>
              <Input
                id="engagementRate"
                type="number"
                min="0"
                max="100"
                value={formData.estimatedEngagementRate}
                onChange={(e) => setFormData({ ...formData, estimatedEngagementRate: e.target.value })}
                placeholder="e.g., 85"
              />
            </div>

            <div>
              <Label htmlFor="runningDays">Running Days</Label>
              <Input
                id="runningDays"
                type="number"
                min="0"
                value={formData.runningDays}
                onChange={(e) => setFormData({ ...formData, runningDays: e.target.value })}
                placeholder="e.g., 30"
              />
            </div>
          </div>

          {/* Source Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="sourceUrl">Source URL</Label>
              <Input
                id="sourceUrl"
                type="url"
                value={formData.sourceUrl}
                onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="sourcePlatform">Source Platform</Label>
              <Input
                id="sourcePlatform"
                value={formData.sourcePlatform}
                onChange={(e) => setFormData({ ...formData, sourcePlatform: e.target.value })}
                placeholder="e.g., AdSpy, BigSpy"
              />
            </div>

            <div>
              <Label htmlFor="advertiserName">Advertiser Name</Label>
              <Input
                id="advertiserName"
                value={formData.advertiserName}
                onChange={(e) => setFormData({ ...formData, advertiserName: e.target.value })}
                placeholder="e.g., Nike, Apple"
              />
            </div>
          </div>

          {/* Design Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Mood</Label>
              <Select value={formData.mood} onValueChange={(v) => setFormData({ ...formData, mood: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {MOODS.map((mood) => (
                    <SelectItem key={mood} value={mood}>
                      <span className="capitalize">{mood}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Style</Label>
              <Select value={formData.style} onValueChange={(v) => setFormData({ ...formData, style: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {STYLES.map((style) => (
                    <SelectItem key={style} value={style}>
                      <span className="capitalize">{style}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Background</Label>
              <Select
                value={formData.backgroundType}
                onValueChange={(v) => setFormData({ ...formData, backgroundType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {BACKGROUND_TYPES.map((bg) => (
                    <SelectItem key={bg} value={bg}>
                      <span className="capitalize">{bg}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target Platforms */}
          <div className="space-y-2">
            <Label>Target Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => (
                <Badge
                  key={platform}
                  variant={targetPlatforms.includes(platform) ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleOption(platform, targetPlatforms, setTargetPlatforms)}
                >
                  {platform}
                </Badge>
              ))}
            </div>
          </div>

          {/* Aspect Ratios */}
          <div className="space-y-2">
            <Label>Target Aspect Ratios</Label>
            <div className="flex flex-wrap gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <Badge
                  key={ratio}
                  variant={targetAspectRatios.includes(ratio) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleOption(ratio, targetAspectRatios, setTargetAspectRatios)}
                >
                  {ratio}
                </Badge>
              ))}
            </div>
          </div>

          {/* Best For Objectives */}
          <div className="space-y-2">
            <Label>Best For Objectives</Label>
            <div className="flex flex-wrap gap-2">
              {OBJECTIVES.map((obj) => (
                <Badge
                  key={obj}
                  variant={bestForObjectives.includes(obj) ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleOption(obj, bestForObjectives, setBestForObjectives)}
                >
                  {obj}
                </Badge>
              ))}
            </div>
          </div>

          {/* Industries */}
          <div className="space-y-2">
            <Label>Best For Industries</Label>
            <div className="flex gap-2">
              <Input
                value={industriesInput}
                onChange={(e) => setIndustriesInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIndustry())}
                placeholder="Add industry and press Enter"
              />
              <Button type="button" variant="outline" onClick={addIndustry}>
                Add
              </Button>
            </div>
            {bestForIndustries.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {bestForIndustries.map((ind) => (
                  <Badge key={ind} variant="secondary" className="gap-1">
                    {ind}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => setBestForIndustries(bestForIndustries.filter((i) => i !== ind))}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Featured */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="featured"
              checked={formData.isFeatured}
              onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked === true })}
            />
            <Label htmlFor="featured" className="flex items-center gap-1 cursor-pointer">
              <Star className="w-4 h-4 text-yellow-500" />
              Mark as Featured
            </Label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Add Template
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddTemplateModal;
