// @ts-nocheck
import { useState, useEffect } from 'react';
import { Building2, Briefcase, Heart, Palette, MessageSquare, Users, Tag, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import type { BrandProfile, BrandVoice, TargetAudience } from '@shared/types/ideaBank';

interface BrandProfileFormProps {
  isOpen: boolean;
  onClose: () => void;
  existingProfile: BrandProfile | null;
  onSave?: () => void;
}

interface FormData {
  brandName: string;
  industry: string;
  brandValues: string[];
  preferredStyles: string[];
  colorPreferences: string[];
  voice: {
    summary: string;
    principles: string[];
    wordsToUse: string[];
    wordsToAvoid: string[];
  };
  targetAudience: {
    demographics: string;
    psychographics: string;
    painPoints: string[];
    personas: string[];
  };
  kbTags: string[];
}

const initialFormData: FormData = {
  brandName: '',
  industry: '',
  brandValues: [],
  preferredStyles: [],
  colorPreferences: [],
  voice: {
    summary: '',
    principles: [],
    wordsToUse: [],
    wordsToAvoid: [],
  },
  targetAudience: {
    demographics: '',
    psychographics: '',
    painPoints: [],
    personas: [],
  },
  kbTags: [],
};

// Reusable array field component
function ArrayField({
  label,
  icon: Icon,
  items,
  onAdd,
  onRemove,
  placeholder,
  badgeClassName = 'bg-primary/10 text-primary',
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
  badgeClassName?: string;
}) {
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    if (newValue.trim()) {
      onAdd(newValue.trim());
      setNewValue('');
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {label}
      </label>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, idx) => (
            <div key={idx} className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${badgeClassName}`}>
              {item}
              <button type="button" onClick={() => onRemove(idx)} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function BrandProfileForm({ isOpen, onClose, existingProfile, onSave }: BrandProfileFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when opening with existing profile
  useEffect(() => {
    if (isOpen) {
      if (existingProfile) {
        const voice = existingProfile.voice as BrandVoice | null;
        const audience = existingProfile.targetAudience as TargetAudience | null;

        setFormData({
          brandName: existingProfile.brandName || '',
          industry: existingProfile.industry || '',
          brandValues: existingProfile.brandValues || [],
          preferredStyles: existingProfile.preferredStyles || [],
          colorPreferences: existingProfile.colorPreferences || [],
          voice: {
            summary: voice?.summary || '',
            principles: voice?.principles || [],
            wordsToUse: voice?.wordsToUse || [],
            wordsToAvoid: voice?.wordsToAvoid || [],
          },
          targetAudience: {
            demographics: audience?.demographics || '',
            psychographics: audience?.psychographics || '',
            painPoints: audience?.painPoints || [],
            personas: audience?.personas || [],
          },
          kbTags: existingProfile.kbTags || [],
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [isOpen, existingProfile]);

  // Update simple field
  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Update nested voice field
  const updateVoiceField = (field: keyof FormData['voice'], value: string) => {
    setFormData((prev) => ({
      ...prev,
      voice: { ...prev.voice, [field]: value },
    }));
  };

  // Update nested audience field
  const updateAudienceField = (field: keyof FormData['targetAudience'], value: string) => {
    setFormData((prev) => ({
      ...prev,
      targetAudience: { ...prev.targetAudience, [field]: value },
    }));
  };

  // Add to array field
  const addToArray = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] as string[]), value],
    }));
  };

  // Remove from array field
  const removeFromArray = (field: keyof FormData, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index),
    }));
  };

  // Add to nested voice array
  const addToVoiceArray = (field: keyof FormData['voice'], value: string) => {
    setFormData((prev) => ({
      ...prev,
      voice: {
        ...prev.voice,
        [field]: [...(prev.voice[field] as string[]), value],
      },
    }));
  };

  // Remove from nested voice array
  const removeFromVoiceArray = (field: keyof FormData['voice'], index: number) => {
    setFormData((prev) => ({
      ...prev,
      voice: {
        ...prev.voice,
        [field]: (prev.voice[field] as string[]).filter((_, i) => i !== index),
      },
    }));
  };

  // Add to nested audience array
  const addToAudienceArray = (field: keyof FormData['targetAudience'], value: string) => {
    setFormData((prev) => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        [field]: [...(prev.targetAudience[field] as string[]), value],
      },
    }));
  };

  // Remove from nested audience array
  const removeFromAudienceArray = (field: keyof FormData['targetAudience'], index: number) => {
    setFormData((prev) => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        [field]: (prev.targetAudience[field] as string[]).filter((_, i) => i !== index),
      },
    }));
  };

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Build the request body, only including non-empty values
      const body: Record<string, unknown> = {};

      if (formData.brandName.trim()) body.brandName = formData.brandName.trim();
      if (formData.industry.trim()) body.industry = formData.industry.trim();
      if (formData.brandValues.length > 0) body.brandValues = formData.brandValues;
      if (formData.preferredStyles.length > 0) body.preferredStyles = formData.preferredStyles;
      if (formData.colorPreferences.length > 0) body.colorPreferences = formData.colorPreferences;
      if (formData.kbTags.length > 0) body.kbTags = formData.kbTags;

      // Voice object - only if has content
      const hasVoice =
        formData.voice.summary.trim() ||
        formData.voice.principles.length > 0 ||
        formData.voice.wordsToUse.length > 0 ||
        formData.voice.wordsToAvoid.length > 0;

      if (hasVoice) {
        body.voice = {
          ...(formData.voice.summary.trim() && { summary: formData.voice.summary.trim() }),
          ...(formData.voice.principles.length > 0 && { principles: formData.voice.principles }),
          ...(formData.voice.wordsToUse.length > 0 && { wordsToUse: formData.voice.wordsToUse }),
          ...(formData.voice.wordsToAvoid.length > 0 && { wordsToAvoid: formData.voice.wordsToAvoid }),
        };
      }

      // Target audience object - only if has content
      const hasAudience =
        formData.targetAudience.demographics.trim() ||
        formData.targetAudience.psychographics.trim() ||
        formData.targetAudience.painPoints.length > 0 ||
        formData.targetAudience.personas.length > 0;

      if (hasAudience) {
        body.targetAudience = {
          ...(formData.targetAudience.demographics.trim() && {
            demographics: formData.targetAudience.demographics.trim(),
          }),
          ...(formData.targetAudience.psychographics.trim() && {
            psychographics: formData.targetAudience.psychographics.trim(),
          }),
          ...(formData.targetAudience.painPoints.length > 0 && {
            painPoints: formData.targetAudience.painPoints,
          }),
          ...(formData.targetAudience.personas.length > 0 && {
            personas: formData.targetAudience.personas,
          }),
        };
      }

      const response = await fetch('/api/brand-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save brand profile');
      }

      toast.success('Brand profile saved', {
        description: 'Your brand profile has been updated successfully.',
      });

      onSave?.();
      onClose();
    } catch (err) {
      toast.error('Error saving profile', {
        description: err instanceof Error ? err.message : 'Unknown error occurred',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {existingProfile ? 'Edit Brand Profile' : 'Create Brand Profile'}
          </SheetTitle>
          <SheetDescription>Define your brand identity to personalize AI-generated content.</SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <Accordion type="multiple" defaultValue={['basic', 'identity', 'voice', 'audience']} className="space-y-4">
            {/* Basic Information */}
            <AccordionItem value="basic" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span>Basic Information</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brand Name</label>
                  <Input
                    value={formData.brandName}
                    onChange={(e) => updateField('brandName', e.target.value)}
                    placeholder="e.g., Next Day Steel"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Industry</label>
                  <Input
                    value={formData.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                    placeholder="e.g., Construction Materials"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Brand Identity */}
            <AccordionItem value="identity" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  <span>Brand Identity</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <ArrayField
                  label="Brand Values"
                  icon={Heart}
                  items={formData.brandValues}
                  onAdd={(v) => addToArray('brandValues', v)}
                  onRemove={(i) => removeFromArray('brandValues', i)}
                  placeholder="e.g., Reliability, Speed, Quality"
                  badgeClassName="bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300"
                />
              </AccordionContent>
            </AccordionItem>

            {/* Visual Style */}
            <AccordionItem value="visual" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  <span>Visual Style</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <ArrayField
                  label="Preferred Styles"
                  icon={Palette}
                  items={formData.preferredStyles}
                  onAdd={(v) => addToArray('preferredStyles', v)}
                  onRemove={(i) => removeFromArray('preferredStyles', i)}
                  placeholder="e.g., Industrial, Modern, Clean"
                  badgeClassName="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                />
                <ArrayField
                  label="Brand Colors"
                  icon={Palette}
                  items={formData.colorPreferences}
                  onAdd={(v) => addToArray('colorPreferences', v)}
                  onRemove={(i) => removeFromArray('colorPreferences', i)}
                  placeholder="e.g., Orange #FF6B35, Grey #7A7A7A"
                  badgeClassName="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300"
                />
              </AccordionContent>
            </AccordionItem>

            {/* Voice & Tone */}
            <AccordionItem value="voice" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span>Voice & Tone</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Voice Summary</label>
                  <Textarea
                    value={formData.voice.summary}
                    onChange={(e) => updateVoiceField('summary', e.target.value)}
                    placeholder="Describe your brand's voice in a few sentences..."
                    rows={3}
                  />
                </div>
                <ArrayField
                  label="Voice Principles"
                  icon={MessageSquare}
                  items={formData.voice.principles}
                  onAdd={(v) => addToVoiceArray('principles', v)}
                  onRemove={(i) => removeFromVoiceArray('principles', i)}
                  placeholder="e.g., Professional but friendly"
                  badgeClassName="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                />
                <ArrayField
                  label="Words to Use"
                  icon={MessageSquare}
                  items={formData.voice.wordsToUse}
                  onAdd={(v) => addToVoiceArray('wordsToUse', v)}
                  onRemove={(i) => removeFromVoiceArray('wordsToUse', i)}
                  placeholder="e.g., Guaranteed, Reliable, Expert"
                  badgeClassName="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                />
                <ArrayField
                  label="Words to Avoid"
                  icon={MessageSquare}
                  items={formData.voice.wordsToAvoid}
                  onAdd={(v) => addToVoiceArray('wordsToAvoid', v)}
                  onRemove={(i) => removeFromVoiceArray('wordsToAvoid', i)}
                  placeholder="e.g., Maybe, Hopefully, ASAP"
                  badgeClassName="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                />
              </AccordionContent>
            </AccordionItem>

            {/* Target Audience */}
            <AccordionItem value="audience" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Target Audience</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Demographics</label>
                  <Textarea
                    value={formData.targetAudience.demographics}
                    onChange={(e) => updateAudienceField('demographics', e.target.value)}
                    placeholder="e.g., SME Contractors, 35-55, business owners..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Psychographics</label>
                  <Textarea
                    value={formData.targetAudience.psychographics}
                    onChange={(e) => updateAudienceField('psychographics', e.target.value)}
                    placeholder="e.g., Values speed, practical-minded, time-poor..."
                    rows={2}
                  />
                </div>
                <ArrayField
                  label="Pain Points"
                  icon={Users}
                  items={formData.targetAudience.painPoints}
                  onAdd={(v) => addToAudienceArray('painPoints', v)}
                  onRemove={(i) => removeFromAudienceArray('painPoints', i)}
                  placeholder="e.g., Unreliable delivery times"
                  badgeClassName="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
                />
                <ArrayField
                  label="Personas"
                  icon={Users}
                  items={formData.targetAudience.personas}
                  onAdd={(v) => addToAudienceArray('personas', v)}
                  onRemove={(i) => removeFromAudienceArray('personas', i)}
                  placeholder="e.g., SME Contractor (Gary) - 35-55, values reliability"
                  badgeClassName="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300"
                />
              </AccordionContent>
            </AccordionItem>

            {/* Knowledge Base Tags */}
            <AccordionItem value="kb" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  <span>Knowledge Base Tags</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <ArrayField
                  label="KB Tags"
                  icon={Tag}
                  items={formData.kbTags}
                  onAdd={(v) => addToArray('kbTags', v)}
                  onRemove={(i) => removeFromArray('kbTags', i)}
                  placeholder="e.g., steel, construction, delivery"
                  badgeClassName="bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-300"
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <SheetFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Profile'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
