/**
 * TemplateForm — Template create/edit form for TemplateAdmin
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { X, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  CATEGORIES,
  LIGHTING_STYLES,
  INTENTS,
  ENVIRONMENTS,
  MOODS,
  type TemplateFormData,
} from '@/hooks/useTemplateAdmin';

interface TemplateFormProps {
  editingId: string | null;
  formData: TemplateFormData;
  tagInput: string;
  productTypeInput: string;
  isSaving: boolean;
  onFormDataChange: (data: TemplateFormData) => void;
  onTagInputChange: (value: string) => void;
  onProductTypeInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onAddProductType: () => void;
  onRemoveProductType: (type: string) => void;
  onToggleArrayItem: (field: 'platformHints' | 'aspectRatioHints', value: string) => void;
}

export function TemplateForm({
  editingId,
  formData,
  tagInput,
  productTypeInput,
  isSaving,
  onFormDataChange,
  onTagInputChange,
  onProductTypeInputChange,
  onSubmit,
  onCancel,
  onAddTag,
  onRemoveTag,
  onAddProductType,
  onRemoveProductType,
  onToggleArrayItem,
}: TemplateFormProps) {
  const setField = <K extends keyof TemplateFormData>(key: K, value: TemplateFormData[K]) => {
    onFormDataChange({ ...formData, [key]: value });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{editingId ? 'Edit Template' : 'Create New Template'}</h2>
        <Button variant="ghost" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="p-6 rounded-xl border border-border bg-card/30 space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Basic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="Modern Living Room Showcase"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Brief description of the template..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setField('category', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                required
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Preview Image URL</label>
              <Input
                value={formData.previewImageUrl}
                onChange={(e) => setField('previewImageUrl', e.target.value)}
                placeholder="https://res.cloudinary.com/..."
              />
            </div>
          </div>
        </div>

        {/* Prompt Blueprint */}
        <div className="p-6 rounded-xl border border-border bg-card/30 space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Prompt Blueprint</h3>
          <div>
            <label className="block text-sm font-medium mb-2">
              Blueprint *{' '}
              <span className="text-muted-foreground font-normal">(use {'{{product}}'} as placeholder)</span>
            </label>
            <textarea
              value={formData.promptBlueprint}
              onChange={(e) => setField('promptBlueprint', e.target.value)}
              placeholder="Professional interior photograph of {{product}} installed in a modern minimalist living room..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none font-mono"
              rows={4}
              required
            />
            {formData.promptBlueprint && !formData.promptBlueprint.includes('{{product}}') && (
              <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Blueprint should contain {'{{product}}'} placeholder
              </p>
            )}
          </div>
        </div>

        {/* Platform & Aspect Ratio */}
        <div className="p-6 rounded-xl border border-border bg-card/30 space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Platform Targeting</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Platforms</label>
              <div className="flex flex-wrap gap-2">
                {['instagram', 'linkedin', 'facebook', 'pinterest', 'tiktok'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onToggleArrayItem('platformHints', p)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                      formData.platformHints.includes(p)
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'border-border hover:border-primary/50',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Aspect Ratios</label>
              <div className="flex flex-wrap gap-2">
                {['1:1', '4:5', '9:16', '16:9'].map((ar) => (
                  <button
                    key={ar}
                    type="button"
                    onClick={() => onToggleArrayItem('aspectRatioHints', ar)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                      formData.aspectRatioHints.includes(ar)
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'border-border hover:border-primary/50',
                    )}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Style & Mood */}
        <div className="p-6 rounded-xl border border-border bg-card/30 space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Style & Mood</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              label="Lighting Style"
              value={formData.lightingStyle}
              options={LIGHTING_STYLES}
              onChange={(v) => setField('lightingStyle', v)}
            />
            <SelectField
              label="Intent"
              value={formData.intent}
              options={INTENTS}
              onChange={(v) => setField('intent', v)}
            />
            <SelectField
              label="Environment"
              value={formData.environment}
              options={ENVIRONMENTS}
              onChange={(v) => setField('environment', v)}
            />
            <SelectField label="Mood" value={formData.mood} options={MOODS} onChange={(v) => setField('mood', v)} />
          </div>
        </div>

        {/* Placement */}
        <div className="p-6 rounded-xl border border-border bg-card/30 space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Placement Hints</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              label="Position"
              value={formData.placementHints.position}
              options={['center', 'center-left', 'center-right', 'foreground', 'top', 'bottom']}
              onChange={(v) => setField('placementHints', { ...formData.placementHints, position: v })}
            />
            <SelectField
              label="Scale"
              value={formData.placementHints.scale}
              options={['small', 'medium', 'large', 'fill']}
              onChange={(v) => setField('placementHints', { ...formData.placementHints, scale: v })}
            />
          </div>
        </div>

        {/* Tags & Product Types */}
        <div className="p-6 rounded-xl border border-border bg-card/30 space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Tags & Product Types</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TagList
              label="Tags"
              items={formData.tags}
              inputValue={tagInput}
              onInputChange={onTagInputChange}
              onAdd={onAddTag}
              onRemove={onRemoveTag}
              placeholder="Add tag..."
            />
            <TagList
              label="Best For Product Types"
              items={formData.bestForProductTypes}
              inputValue={productTypeInput}
              onInputChange={onProductTypeInputChange}
              onAdd={onAddProductType}
              onRemove={onRemoveProductType}
              placeholder="Add product type..."
            />
          </div>
        </div>

        {/* Global Toggle */}
        <div className="p-6 rounded-xl border border-border bg-card/30">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isGlobal}
              onChange={(e) => setField('isGlobal', e.target.checked)}
              className="w-5 h-5 rounded border-border"
            />
            <div>
              <span className="font-medium">Make Global</span>
              <p className="text-sm text-muted-foreground">Available to all users</p>
            </div>
          </label>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {editingId ? 'Update Template' : 'Create Template'}
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Helper Components ───────────────────────────────────

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function TagList({
  label,
  items,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  items: string[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (item: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="flex gap-2 mb-2">
        <Input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
        />
        <Button type="button" variant="outline" onClick={onAdd}>
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span key={item} className="px-2 py-1 text-xs rounded-md bg-muted/30 flex items-center gap-1">
            {item}
            <button type="button" onClick={() => onRemove(item)}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
