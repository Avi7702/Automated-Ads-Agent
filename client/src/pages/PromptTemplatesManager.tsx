import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowLeft, Edit2, Save, X } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { PromptTemplate } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PromptTemplatesManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    prompt: "",
    category: "lifestyle",
  });

  const { data: templates = [], isLoading } = useQuery<PromptTemplate[]>({
    queryKey: ["prompt-templates"],
    queryFn: async () => {
      const res = await fetch("/api/prompt-templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const addTemplate = useMutation({
    mutationFn: async (template: { prompt: string; category: string }) => {
      const res = await fetch("/api/prompt-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (!res.ok) throw new Error("Failed to add template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
      setIsAdding(false);
      setNewTemplate({ prompt: "", category: "lifestyle" });
      toast({
        title: "Template Added",
        description: "Prompt template added successfully",
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/prompt-templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete template");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
      toast({
        title: "Template Deleted",
        description: "Prompt template deleted successfully",
      });
    },
  });

  const handleAddTemplate = () => {
    if (!newTemplate.prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Prompt cannot be empty",
      });
      return;
    }
    addTemplate.mutate(newTemplate);
  };

  const categories = ["lifestyle", "professional", "outdoor", "urban", "nature", "luxury"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/">
              <Button variant="ghost" className="mb-4" data-testid="button-back-home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Studio
              </Button>
            </Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Prompt Templates Manager
            </h1>
            <p className="text-slate-400 mt-2">
              Manage your curated prompt ideas for AI suggestions
            </p>
          </div>

          <Button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            data-testid="button-add-template"
          >
            {isAdding ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {isAdding ? "Cancel" : "Add Template"}
          </Button>
        </div>

        {/* Add New Template Form */}
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-6 mb-6"
          >
            <h3 className="text-lg font-semibold mb-4">New Prompt Template</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Category
                </label>
                <Select
                  value={newTemplate.category}
                  onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Prompt Text
                </label>
                <Textarea
                  value={newTemplate.prompt}
                  onChange={(e) => setNewTemplate({ ...newTemplate, prompt: e.target.value })}
                  placeholder="e.g., modern workspace with laptop and coffee cup"
                  className="min-h-24"
                  data-testid="input-prompt"
                />
              </div>

              <Button
                onClick={handleAddTemplate}
                disabled={addTemplate.isPending}
                data-testid="button-save-template"
              >
                <Save className="mr-2 h-4 w-4" />
                {addTemplate.isPending ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Templates List */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
            <p className="mt-4 text-slate-400">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20">
            <Plus className="mx-auto h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              No templates yet
            </h3>
            <p className="text-slate-400 mb-6">
              Add your first prompt template to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-6 hover:border-purple-500/50 transition-all group"
                data-testid={`template-card-${template.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
                        {template.category}
                      </span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{template.prompt}</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Delete this template?")) {
                        deleteTemplate.mutate(template.id);
                      }
                    }}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    data-testid={`button-delete-template-${template.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="mt-8 text-center text-sm text-slate-400">
          {templates.length} total template{templates.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
