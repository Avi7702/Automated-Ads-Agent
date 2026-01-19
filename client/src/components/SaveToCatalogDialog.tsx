// Note: @ts-nocheck is needed because the Select UI component uses @ts-nocheck
// and its types don't propagate correctly
// @ts-nocheck
import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  FolderPlus,
  Loader2,
  Check,
  Image as ImageIcon,
  Tag,
} from "lucide-react";
import type { Product } from "@shared/schema";

interface SaveToCatalogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  defaultName?: string;
}

export function SaveToCatalogDialog({
  isOpen,
  onClose,
  imageUrl,
  defaultName = "Generated Image",
}: SaveToCatalogDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(defaultName);
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Fetch existing products to get categories
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Get unique categories
  const existingCategories = Array.from(
    new Set(products.map((p) => p.category).filter((c): c is string => !!c))
  );

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // First, fetch the image and convert to blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `${name}.jpg`, { type: blob.type });

      // Create form data
      const formData = new FormData();
      formData.append("image", file);
      formData.append("name", name);
      formData.append("category", showNewCategory ? newCategory : category);

      // Upload to products endpoint
      const res = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save to catalog");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
  });

  // Add tag
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags((prev) => [...prev, tagInput.trim()]);
      setTagInput("");
    }
  };

  // Remove tag
  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-primary" />
                  <h2 className="font-medium">Save to Product Catalog</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Image Preview */}
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-border flex-shrink-0">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-3">
                    {/* Name Input */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Product Name
                      </label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Drainage Grate Hero Shot"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Category
                  </label>
                  {!showNewCategory ? (
                    <div className="flex gap-2">
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="flex-1 h-9">
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {existingCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNewCategory(true)}
                        className="h-9"
                      >
                        + New
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="New category name..."
                        className="flex-1 h-9"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowNewCategory(false);
                          setNewCategory("");
                        }}
                        className="h-9"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tags (Optional) */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Tags (optional)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add tags..."
                      className="flex-1 h-9"
                      onKeyDown={(e) => e.key === "Enter" && addTag()}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addTag}
                      disabled={!tagInput.trim()}
                      className="h-9"
                    >
                      <Tag className="w-4 h-4" />
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 dark:border-blue-500/20">
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    <ImageIcon className="w-3 h-3 inline mr-1" />
                    This image will be saved to your product catalog and can be
                    used in future generations.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2 p-4 border-t border-border bg-muted/30">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={saveMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={!name.trim() || saveMutation.isPending}
                  className="flex-1"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : saveMutation.isSuccess ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Save to Catalog
                    </>
                  )}
                </Button>
              </div>

              {/* Error Message */}
              {saveMutation.isError && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {saveMutation.error?.message || "Failed to save"}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
