// @ts-nocheck
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Upload,
  Tag,
  Filter,
  X,
  Loader2,
  Eye,
  Package,
  ImageOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrandImage, Product } from "@shared/schema";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/layout/Header";

// Image categories
const IMAGE_CATEGORIES = [
  { value: "historical_ad", label: "Historical Ad" },
  { value: "product_hero", label: "Product Hero" },
  { value: "installation", label: "Installation" },
  { value: "detail", label: "Detail Shot" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "comparison", label: "Comparison" },
];

// Suggested uses
const SUGGESTED_USES = [
  "hero",
  "detail",
  "comparison",
  "installation",
  "social_media",
  "banner",
  "thumbnail",
];

// Aspect ratios
const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (Square)" },
  { value: "16:9", label: "16:9 (Widescreen)" },
  { value: "4:5", label: "4:5 (Portrait)" },
  { value: "9:16", label: "9:16 (Story)" },
  { value: "4:3", label: "4:3 (Standard)" },
];

// Category badge component
function CategoryBadge({ category }: { category: string }) {
  const info = IMAGE_CATEGORIES.find(c => c.value === category);
  const colors: Record<string, string> = {
    historical_ad: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    product_hero: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    installation: "bg-green-500/20 text-green-400 border-green-500/30",
    detail: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    lifestyle: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    comparison: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  };

  return (
    <Badge className={cn("text-xs", colors[category] || "bg-muted")}>
      {info?.label || category}
    </Badge>
  );
}

// Empty state component
function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
      <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
        <ImageIcon className="w-10 h-10 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-2xl font-display font-medium mb-2">No brand images yet</h2>
        <p className="text-muted-foreground max-w-md">
          Upload brand images to help AI understand your visual style and create better ads.
        </p>
      </div>
      <Button onClick={onUpload}>
        <Upload className="w-4 h-4 mr-2" />
        Upload First Image
      </Button>
    </div>
  );
}

// Loading skeleton
function ImageSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <CardContent className="p-3">
        <Skeleton className="h-4 w-2/3 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </CardContent>
    </Card>
  );
}

// Image card component
function BrandImageCard({
  image,
  onView,
  onDelete,
}: {
  image: BrandImage;
  onView: () => void;
  onDelete: () => void;
}) {
  const [hasError, setHasError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className="group overflow-hidden cursor-pointer hover:border-primary/50 transition-colors">
        {/* Image */}
        <div className="aspect-square relative overflow-hidden bg-muted" onClick={onView}>
          {hasError ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <ImageOff className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-xs">Image unavailable</span>
            </div>
          ) : (
            <img
              src={image.cloudinaryUrl}
              alt={image.description || "Brand image"}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setHasError(true)}
            />
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button variant="secondary" size="icon" onClick={onView}>
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Category badge */}
          <div className="absolute top-2 left-2">
            <CategoryBadge category={image.category} />
          </div>
        </div>

        {/* Info */}
        <CardContent className="p-3">
          {image.description ? (
            <p className="text-sm line-clamp-1">{image.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description</p>
          )}

          {/* Tags */}
          {image.tags && image.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {image.tags.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {image.tags.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{image.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Upload modal
function UploadModal({
  isOpen,
  onClose,
  products,
  onUpload,
  isUploading,
}: {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onUpload: (formData: FormData) => void;
  isUploading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState("product_hero");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [suggestedUses, setSuggestedUses] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSuggestedUse = (use: string) => {
    setSuggestedUses(prev =>
      prev.includes(use)
        ? prev.filter(u => u !== use)
        : [...prev, use]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("category", category);
    formData.append("description", description);
    formData.append("tags", JSON.stringify(tags));
    formData.append("productIds", JSON.stringify(selectedProducts));
    formData.append("suggestedUse", JSON.stringify(suggestedUses));
    if (aspectRatio) formData.append("aspectRatio", aspectRatio);

    onUpload(formData);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreview(null);
    setCategory("product_hero");
    setDescription("");
    setTags([]);
    setSelectedProducts([]);
    setSuggestedUses([]);
    setAspectRatio("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { onClose(); resetForm(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Brand Image</DialogTitle>
          <DialogDescription>
            Add images to help AI understand your brand's visual style.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Image File</label>
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                preview ? "border-primary" : "border-muted-foreground/25 hover:border-primary/50"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreview(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this image..."
              rows={2}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="pr-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="secondary" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Suggested Uses */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Suggested Uses</label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_USES.map(use => (
                <Badge
                  key={use}
                  variant={suggestedUses.includes(use) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleSuggestedUse(use)}
                >
                  {use.replace("_", " ")}
                </Badge>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Aspect Ratio (Optional)</label>
            <Select value={aspectRatio || "none"} onValueChange={(v) => setAspectRatio(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select aspect ratio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {ASPECT_RATIOS.map(ar => (
                  <SelectItem key={ar.value} value={ar.value}>
                    {ar.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Associated Products */}
          {products.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Associated Products</label>
              <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-muted/30 rounded-lg">
                {products.map(product => (
                  <label
                    key={product.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="rounded"
                    />
                    <span className="text-sm truncate">{product.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => { onClose(); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || !selectedFile}>
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Upload Image
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Image detail modal
function ImageDetailModal({
  image,
  isOpen,
  onClose,
  onDelete,
}: {
  image: BrandImage | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  if (!image) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CategoryBadge category={image.category} />
            {image.description || "Brand Image"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Image */}
          <div className="aspect-video rounded-xl overflow-hidden bg-muted">
            <img
              src={image.cloudinaryUrl}
              alt={image.description || "Brand image"}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            {/* Tags */}
            {image.tags && image.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1">
                  {image.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Uses */}
            {image.suggestedUse && image.suggestedUse.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Suggested Uses</h4>
                <div className="flex flex-wrap gap-1">
                  {image.suggestedUse.map((use, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {use.replace("_", " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Aspect Ratio */}
            {image.aspectRatio && (
              <div>
                <h4 className="text-sm font-medium mb-2">Aspect Ratio</h4>
                <Badge variant="outline">{image.aspectRatio}</Badge>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BrandImageLibrary() {
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<BrandImage | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch brand images
  const { data: images, isLoading } = useQuery<BrandImage[]>({
    queryKey: ["brand-images"],
    queryFn: async () => {
      const response = await fetch("/api/brand-images");
      if (!response.ok) throw new Error("Failed to fetch brand images");
      return response.json();
    },
  });

  // Fetch products for the upload form
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/brand-images", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload image");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-images"] });
      setIsUploadOpen(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/brand-images/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete image");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-images"] });
      setDeleteConfirmId(null);
      setIsDetailOpen(false);
      setSelectedImage(null);
    },
  });

  // Filter images by category
  const filteredImages = images?.filter(img =>
    categoryFilter === "all" || img.category === categoryFilter
  ) || [];

  // Get unique categories from images
  const usedCategories = [...new Set(images?.map(img => img.category) || [])];

  const handleViewImage = (image: BrandImage) => {
    setSelectedImage(image);
    setIsDetailOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <Header currentPage="settings" />

      {/* Content */}
      <main className="container max-w-6xl mx-auto px-6 pt-24 pb-20 relative z-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Brand Image Library</h1>
            <p className="text-muted-foreground mt-1">
              Manage your brand's visual assets for AI-powered ad generation
            </p>
          </div>
          <Button onClick={() => setIsUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Image
          </Button>
        </div>

        {/* Filters */}
        {images && images.length > 0 && (
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter:</span>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {IMAGE_CATEGORIES.filter(cat => usedCategories.includes(cat.value)).map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCategoryFilter("all")}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <ImageSkeleton key={i} />
            ))}
          </div>
        ) : /* Empty State */ !images || images.length === 0 ? (
          <EmptyState onUpload={() => setIsUploadOpen(true)} />
        ) : /* No Results */ filteredImages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No images in this category</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCategoryFilter("all")}
            >
              Show All Images
            </Button>
          </div>
        ) : (
          /* Image Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <AnimatePresence>
              {filteredImages.map(image => (
                <BrandImageCard
                  key={image.id}
                  image={image}
                  onView={() => handleViewImage(image)}
                  onDelete={() => setDeleteConfirmId(image.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        products={products}
        onUpload={(formData) => uploadMutation.mutate(formData)}
        isUploading={uploadMutation.isPending}
      />

      {/* Image Detail Modal */}
      <ImageDetailModal
        image={selectedImage}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedImage(null);
        }}
        onDelete={() => selectedImage && setDeleteConfirmId(selectedImage.id)}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Image</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
