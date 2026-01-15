import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useStudioState } from '@/hooks/useStudioState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layout, Check } from 'lucide-react';
import type { AdSceneTemplate } from '@shared/schema';

export function TemplatesTab() {
  const {
    state: { selectedTemplate },
    selectTemplate,
    clearTemplate,
  } = useStudioState();

  const [categoryFilter, setCategoryFilter] = useState('all');

  // Fetch templates
  const { data: templates = [] } = useQuery<AdSceneTemplate[]>({
    queryKey: ['adSceneTemplates'],
    queryFn: async () => {
      const res = await fetch('/api/ad-scene-templates', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category).filter(Boolean));
    return ['all', ...Array.from(cats)] as string[];
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    if (categoryFilter === 'all') return templates;
    return templates.filter((t) => t.category === categoryFilter);
  }, [templates, categoryFilter]);

  // Toggle template selection
  const toggleTemplate = (template: AdSceneTemplate) => {
    if (selectedTemplate?.id === template.id) {
      clearTemplate();
    } else {
      selectTemplate(template);
    }
  };

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Selected Template Preview */}
      {selectedTemplate && (
        <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2">
            <img
              src={selectedTemplate.previewImageUrl}
              alt={selectedTemplate.title}
              className="w-12 h-12 rounded-md object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{selectedTemplate.title}</p>
              <p className="text-[10px] text-muted-foreground">{selectedTemplate.category}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearTemplate}
              className="h-6 text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={categoryFilter === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter(cat)}
            className="h-6 text-[10px] px-2"
          >
            {cat === 'all' ? 'All' : cat.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <div className="grid grid-cols-2 gap-2">
          {filteredTemplates.map((template) => {
            const isSelected = selectedTemplate?.id === template.id;
            return (
              <button
                key={template.id}
                onClick={() => toggleTemplate(template)}
                className={cn(
                  'relative rounded-lg overflow-hidden border-2 transition-all text-left',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="aspect-video">
                  <img
                    src={template.previewImageUrl}
                    alt={template.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                <div className="p-1.5 space-y-1">
                  <p className="text-[10px] font-medium truncate">{template.title}</p>
                  <div className="flex flex-wrap gap-0.5">
                    {template.mood && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4">
                        {template.mood}
                      </Badge>
                    )}
                    {template.environment && (
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
                        {template.environment}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Layout className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No templates found</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
        {templates.length} templates available
      </div>
    </div>
  );
}
