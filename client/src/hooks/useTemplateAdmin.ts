/**
 * useTemplateAdmin — CRUD logic for template administration
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { AdSceneTemplate } from '@shared/schema';

export interface TemplateFormData {
  title: string;
  description: string;
  category: string;
  promptBlueprint: string;
  tags: string[];
  platformHints: string[];
  aspectRatioHints: string[];
  placementHints: { position: string; scale: string };
  lightingStyle: string;
  intent: string;
  environment: string;
  mood: string;
  bestForProductTypes: string[];
  isGlobal: boolean;
  previewImageUrl: string;
  previewPublicId: string;
}

export const emptyFormData: TemplateFormData = {
  title: '',
  description: '',
  category: 'product_showcase',
  promptBlueprint: '',
  tags: [],
  platformHints: [],
  aspectRatioHints: [],
  placementHints: { position: 'center', scale: 'medium' },
  lightingStyle: 'natural',
  intent: 'showcase',
  environment: 'indoor',
  mood: 'minimal',
  bestForProductTypes: [],
  isGlobal: true,
  previewImageUrl: '',
  previewPublicId: '',
};

export const CATEGORIES = [
  { value: 'product_showcase', label: 'Product Showcase' },
  { value: 'installation', label: 'Installation' },
  { value: 'worksite', label: 'Worksite' },
  { value: 'professional', label: 'Professional' },
  { value: 'outdoor', label: 'Outdoor' },
];

export const LIGHTING_STYLES = ['natural', 'studio', 'dramatic', 'soft', 'golden-hour', 'warm'];
export const INTENTS = ['showcase', 'installation', 'before-after', 'scale-demo', 'product-focus', 'worksite'];
export const ENVIRONMENTS = ['indoor', 'outdoor', 'studio', 'worksite'];
export const MOODS = ['industrial', 'professional', 'bold', 'minimal', 'urgent', 'technical', 'reliable'];

export function useTemplateAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(emptyFormData);
  const [tagInput, setTagInput] = useState('');
  const [productTypeInput, setProductTypeInput] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch templates
  const {
    data: templates = [],
    isLoading,
    refetch,
  } = useQuery<AdSceneTemplate[]>({
    queryKey: ['admin-templates'],
    queryFn: async () => {
      const res = await fetch('/api/ad-templates', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const res = await fetch('/api/ad-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create template');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
      setShowForm(false);
      setFormData(emptyFormData);
      toast({ title: 'Template created', description: 'The template has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create template', description: error.message, variant: 'destructive' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TemplateFormData> }) => {
      const res = await fetch(`/api/ad-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update template');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyFormData);
      toast({ title: 'Template updated', description: 'The template has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update template', description: error.message, variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ad-templates/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete template');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
      setDeleteConfirmId(null);
      toast({ title: 'Template deleted', description: 'The template has been deleted successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete template', description: error.message, variant: 'destructive' });
      setDeleteConfirmId(null);
    },
  });

  const handleEdit = (template: AdSceneTemplate) => {
    setEditingId(template.id);
    setFormData({
      title: template.title,
      description: template.description || '',
      category: template.category,
      promptBlueprint: template.promptBlueprint,
      tags: template.tags || [],
      platformHints: template.platformHints || [],
      aspectRatioHints: template.aspectRatioHints || [],
      placementHints: (template.placementHints as { position: string; scale: string }) || {
        position: 'center',
        scale: 'medium',
      },
      lightingStyle: template.lightingStyle || 'natural',
      intent: template.intent || 'showcase',
      environment: template.environment || 'indoor',
      mood: template.mood || 'minimal',
      bestForProductTypes: template.bestForProductTypes || [],
      isGlobal: template.isGlobal ?? true,
      previewImageUrl: template.previewImageUrl || '',
      previewPublicId: template.previewPublicId || '',
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.promptBlueprint.includes('{{product}}')) {
      alert('Prompt blueprint must contain {{product}} placeholder');
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const addProductType = () => {
    if (productTypeInput.trim() && !formData.bestForProductTypes.includes(productTypeInput.trim())) {
      setFormData({ ...formData, bestForProductTypes: [...formData.bestForProductTypes, productTypeInput.trim()] });
      setProductTypeInput('');
    }
  };

  const removeProductType = (type: string) => {
    setFormData({ ...formData, bestForProductTypes: formData.bestForProductTypes.filter((t) => t !== type) });
  };

  const toggleArrayItem = (field: 'platformHints' | 'aspectRatioHints', value: string) => {
    const current = formData[field];
    if (current.includes(value)) {
      setFormData({ ...formData, [field]: current.filter((v) => v !== value) });
    } else {
      setFormData({ ...formData, [field]: [...current, value] });
    }
  };

  const openNewForm = () => {
    setEditingId(null);
    setFormData(emptyFormData);
    setShowForm(true);
  };

  return {
    // State
    showForm,
    editingId,
    formData,
    tagInput,
    productTypeInput,
    deleteConfirmId,
    templates,
    isLoading,

    // Mutation state
    isSaving: createMutation.isPending || updateMutation.isPending,

    // Setters
    setShowForm,
    setFormData,
    setTagInput,
    setProductTypeInput,
    setDeleteConfirmId,

    // Handlers
    refetch,
    handleEdit,
    handleSubmit,
    addTag,
    removeTag,
    addProductType,
    removeProductType,
    toggleArrayItem,
    openNewForm,
    deleteMutation,
  };
}
