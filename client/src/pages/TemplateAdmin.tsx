import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Image as ImageIcon,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import type { AdSceneTemplate } from "@shared/schema";
import { Header } from "@/components/layout/Header";

const categories = [
  { value: "product_showcase", label: "Product Showcase" },
  { value: "installation", label: "Installation" },
  { value: "worksite", label: "Worksite" },
  { value: "professional", label: "Professional" },
  { value: "outdoor", label: "Outdoor" },
];

const lightingStyles = ["natural", "studio", "dramatic", "soft", "golden-hour", "warm"];
const intents = ["showcase", "installation", "before-after", "scale-demo", "product-focus", "worksite"];
const environments = ["indoor", "outdoor", "studio", "worksite"];
const moods = ["industrial", "professional", "bold", "minimal", "urgent", "technical", "reliable"];

interface TemplateFormData {
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

const emptyFormData: TemplateFormData = {
  title: "",
  description: "",
  category: "product_showcase",
  promptBlueprint: "",
  tags: [],
  platformHints: [],
  aspectRatioHints: [],
  placementHints: { position: "center", scale: "medium" },
  lightingStyle: "natural",
  intent: "showcase",
  environment: "indoor",
  mood: "minimal",
  bestForProductTypes: [],
  isGlobal: true,
  previewImageUrl: "",
  previewPublicId: "",
};

export default function TemplateAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(emptyFormData);
  const [tagInput, setTagInput] = useState("");
  const [productTypeInput, setProductTypeInput] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch templates
  const { data: templates = [], isLoading, refetch } = useQuery<AdSceneTemplate[]>({
    queryKey: ["admin-templates"],
    queryFn: async () => {
      const res = await fetch("/api/ad-templates", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const res = await fetch("/api/ad-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create template");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      setShowForm(false);
      setFormData(emptyFormData);
      toast({
        title: "Template created",
        description: "The template has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TemplateFormData> }) => {
      const res = await fetch(`/api/ad-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update template");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyFormData);
      toast({
        title: "Template updated",
        description: "The template has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ad-templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete template");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      setDeleteConfirmId(null);
      toast({
        title: "Template deleted",
        description: "The template has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete template",
        description: error.message,
        variant: "destructive",
      });
      setDeleteConfirmId(null);
    },
  });

  const handleEdit = (template: AdSceneTemplate) => {
    setEditingId(template.id);
    setFormData({
      title: template.title,
      description: template.description || "",
      category: template.category,
      promptBlueprint: template.promptBlueprint,
      tags: template.tags || [],
      platformHints: template.platformHints || [],
      aspectRatioHints: template.aspectRatioHints || [],
      placementHints: (template.placementHints as any) || { position: "center", scale: "medium" },
      lightingStyle: template.lightingStyle || "natural",
      intent: template.intent || "showcase",
      environment: template.environment || "indoor",
      mood: template.mood || "minimal",
      bestForProductTypes: template.bestForProductTypes || [],
      isGlobal: template.isGlobal ?? true,
      previewImageUrl: template.previewImageUrl || "",
      previewPublicId: template.previewPublicId || "",
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.promptBlueprint.includes("{{product}}")) {
      alert("Prompt blueprint must contain {{product}} placeholder");
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
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const addProductType = () => {
    if (productTypeInput.trim() && !formData.bestForProductTypes.includes(productTypeInput.trim())) {
      setFormData({ ...formData, bestForProductTypes: [...formData.bestForProductTypes, productTypeInput.trim()] });
      setProductTypeInput("");
    }
  };

  const removeProductType = (type: string) => {
    setFormData({ ...formData, bestForProductTypes: formData.bestForProductTypes.filter(t => t !== type) });
  };

  const toggleArrayItem = (field: "platformHints" | "aspectRatioHints", value: string) => {
    const current = formData[field];
    if (current.includes(value)) {
      setFormData({ ...formData, [field]: current.filter(v => v !== value) });
    } else {
      setFormData({ ...formData, [field]: [...current, value] });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header currentPage="templates" />

      <main className="container max-w-7xl mx-auto px-6 pt-24 pb-20">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/templates">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Templates
              </Button>
            </Link>
            <div className="h-6 w-px bg-muted/50" />
            <h1 className="font-semibold">Template Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => {
                setEditingId(null);
                setFormData(emptyFormData);
                setShowForm(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </div>

        {/* Templates Table */}
        {!showForm && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-card/50">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3">Preview</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Platforms</th>
                  <th className="px-4 py-3">Global</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Loading templates...
                    </td>
                  </tr>
                ) : templates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No templates found. Click "New Template" to create one.
                    </td>
                  </tr>
                ) : (
                  templates.map(template => (
                    <tr key={template.id} className="hover:bg-card/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="w-16 h-16 rounded-lg border border-border bg-card overflow-hidden relative">
                          {template.previewImageUrl ? (
                            <img
                              src={template.previewImageUrl}
                              alt={template.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="w-full h-full items-center justify-center absolute inset-0"
                            style={{ display: template.previewImageUrl ? "none" : "flex" }}
                          >
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{template.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {template.description}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary border border-primary/20">
                          {template.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {template.platformHints?.slice(0, 2).map(p => (
                            <span key={p} className="px-1.5 py-0.5 text-xs rounded bg-muted/30 text-muted-foreground">
                              {p}
                            </span>
                          ))}
                          {(template.platformHints?.length || 0) > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{template.platformHints!.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {template.isGlobal ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {deleteConfirmId === template.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteMutation.mutate(template.id)}
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirmId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(template.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Template Form */}
        {showForm && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {editingId ? "Edit Template" : "Create New Template"}
              </h2>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="p-6 rounded-xl border border-border bg-card/30 space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Title *</label>
                    <Input
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Modern Living Room Showcase"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the template..."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Category *</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                      required
                    >
                      {categories.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Preview Image URL</label>
                    <Input
                      value={formData.previewImageUrl}
                      onChange={e => setFormData({ ...formData, previewImageUrl: e.target.value })}
                      placeholder="https://res.cloudinary.com/..."
                    />
                  </div>
                </div>
              </div>

              {/* Prompt Blueprint */}
              <div className="p-6 rounded-xl border border-border bg-card/30 space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Prompt Blueprint
                </h3>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Blueprint * <span className="text-muted-foreground font-normal">(use {"{{product}}"} as placeholder)</span>
                  </label>
                  <textarea
                    value={formData.promptBlueprint}
                    onChange={e => setFormData({ ...formData, promptBlueprint: e.target.value })}
                    placeholder="Professional interior photograph of {{product}} installed in a modern minimalist living room..."
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none font-mono"
                    rows={4}
                    required
                  />
                  {formData.promptBlueprint && !formData.promptBlueprint.includes("{{product}}") && (
                    <p className="mt-2 text-xs text-yellow-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Blueprint should contain {"{{product}}"} placeholder
                    </p>
                  )}
                </div>
              </div>

              {/* Platform & Aspect Ratio */}
              <div className="p-6 rounded-xl border border-border bg-card/30 space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Platform Targeting
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Platforms</label>
                    <div className="flex flex-wrap gap-2">
                      {["instagram", "linkedin", "facebook", "pinterest", "tiktok"].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => toggleArrayItem("platformHints", p)}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                            formData.platformHints.includes(p)
                              ? "bg-primary/20 border-primary/50 text-primary"
                              : "border-border hover:border-primary/50"
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
                      {["1:1", "4:5", "9:16", "16:9"].map(ar => (
                        <button
                          key={ar}
                          type="button"
                          onClick={() => toggleArrayItem("aspectRatioHints", ar)}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                            formData.aspectRatioHints.includes(ar)
                              ? "bg-primary/20 border-primary/50 text-primary"
                              : "border-border hover:border-primary/50"
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
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Style & Mood
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Lighting Style</label>
                    <select
                      value={formData.lightingStyle}
                      onChange={e => setFormData({ ...formData, lightingStyle: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    >
                      {lightingStyles.map(ls => (
                        <option key={ls} value={ls}>{ls}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Intent</label>
                    <select
                      value={formData.intent}
                      onChange={e => setFormData({ ...formData, intent: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    >
                      {intents.map(i => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Environment</label>
                    <select
                      value={formData.environment}
                      onChange={e => setFormData({ ...formData, environment: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    >
                      {environments.map(env => (
                        <option key={env} value={env}>{env}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Mood</label>
                    <select
                      value={formData.mood}
                      onChange={e => setFormData({ ...formData, mood: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    >
                      {moods.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Placement */}
              <div className="p-6 rounded-xl border border-border bg-card/30 space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Placement Hints
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Position</label>
                    <select
                      value={formData.placementHints.position}
                      onChange={e => setFormData({
                        ...formData,
                        placementHints: { ...formData.placementHints, position: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    >
                      {["center", "center-left", "center-right", "foreground", "top", "bottom"].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Scale</label>
                    <select
                      value={formData.placementHints.scale}
                      onChange={e => setFormData({
                        ...formData,
                        placementHints: { ...formData.placementHints, scale: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    >
                      {["small", "medium", "large", "fill"].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="p-6 rounded-xl border border-border bg-card/30 space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Tags & Product Types
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tags</label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        placeholder="Add tag..."
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" variant="outline" onClick={addTag}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formData.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 text-xs rounded-md bg-muted/30 flex items-center gap-1">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Best For Product Types</label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={productTypeInput}
                        onChange={e => setProductTypeInput(e.target.value)}
                        placeholder="Add product type..."
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addProductType())}
                      />
                      <Button type="button" variant="outline" onClick={addProductType}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formData.bestForProductTypes.map(type => (
                        <span key={type} className="px-2 py-1 text-xs rounded-md bg-muted/30 flex items-center gap-1">
                          {type}
                          <button type="button" onClick={() => removeProductType(type)}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Global Toggle */}
              <div className="p-6 rounded-xl border border-border bg-card/30">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isGlobal}
                    onChange={e => setFormData({ ...formData, isGlobal: e.target.checked })}
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
                <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {editingId ? "Update Template" : "Create Template"}
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
