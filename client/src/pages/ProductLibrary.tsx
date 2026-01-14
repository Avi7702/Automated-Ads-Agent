// @ts-nocheck
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Package,
  ImageOff,
  Tag,
  X,
  Trash2
} from "lucide-react";
import { cn, getProductImageUrl } from "@/lib/utils";
import type { Product } from "@shared/schema";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Header } from "@/components/layout/Header";
import { ProductEnrichmentForm } from "@/components/ProductEnrichmentForm";
import { AddProductModal } from "@/components/AddProductModal";
import { ProductRelationships } from "@/components/ProductRelationships";
import { useToast } from "@/hooks/use-toast";

// Enrichment status badge styling (light mode readable + dark mode optimized)
function getEnrichmentStatusBadge(status: string | null | undefined) {
  switch (status) {
    case "complete":
      return { variant: "default" as const, label: "Complete", className: "bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 dark:border-green-500/20" };
    case "verified":
      return { variant: "default" as const, label: "Verified", className: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 dark:border-blue-500/20" };
    case "draft":
      return { variant: "secondary" as const, label: "Draft", className: "bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 dark:border-yellow-500/20" };
    case "pending":
    default:
      return { variant: "outline" as const, label: "Pending", className: "bg-muted/50 text-muted-foreground" };
  }
}

// Product image component with error handling and URL normalization
function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);
  const normalizedSrc = getProductImageUrl(src);

  if (hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 text-muted-foreground">
        <ImageOff className="w-12 h-12 mb-2 opacity-50" />
        <span className="text-xs">Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setHasError(true)}
    />
  );
}

// Loading skeleton for products
function ProductSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// Product detail modal
function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onEnrichComplete,
}: {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEnrichComplete?: () => void;
}) {
  if (!product) return null;

  const statusBadge = getEnrichmentStatusBadge(product.enrichmentStatus);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
          <DialogDescription>
            {product.category && (
              <span className="text-muted-foreground">{product.category}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="enrich">Enrich</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6 mt-4">
            {/* Product Image */}
            <div className="aspect-video rounded-xl overflow-hidden bg-muted">
              <ProductImage src={product.cloudinaryUrl} alt={product.name} />
            </div>

            {/* Status and Category */}
            <div className="flex flex-wrap gap-2">
              <Badge className={statusBadge.className}>
                {statusBadge.label}
              </Badge>
              {product.category && (
                <Badge variant="outline">{product.category}</Badge>
              )}
              {product.sku && (
                <Badge variant="secondary">SKU: {product.sku}</Badge>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </div>
            )}

            {/* Benefits */}
            {product.benefits && product.benefits.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Benefits</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {product.benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1">
                  {product.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Link href="/" className="flex-1">
                <Button className="w-full">
                  Use in Studio
                </Button>
              </Link>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </TabsContent>

          {/* Relationships Tab */}
          <TabsContent value="relationships" className="mt-4">
            <ProductRelationships productId={product.id} />
          </TabsContent>

          {/* Enrich Tab */}
          <TabsContent value="enrich" className="mt-4">
            <ProductEnrichmentForm
              product={product}
              onComplete={() => {
                onEnrichComplete?.();
                onClose();
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function ProductLibrary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch products
  const { data: products, isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Filter products by search query
  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  ) ?? [];

  // Handle product click
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  // Handle modal close
  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedProduct(null);
  };

  // Handle product deletion
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      // Invalidate and refetch products
      queryClient.invalidateQueries({ queryKey: ["products"] });

      toast({
        title: "Product deleted",
        description: `${productToDelete.name} has been removed from your library.`,
      });

      // Close detail modal if this product was open
      if (selectedProduct?.id === productToDelete.id) {
        handleCloseDetail();
      }
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete product",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
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
      <main className="container max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-20 relative z-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Product Library</h1>
            <p className="text-muted-foreground mt-1">
              Manage and organize your product catalog
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name, category, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing {filteredProducts.length} result{filteredProducts.length !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductSkeleton key={index} />
            ))}
          </div>
        ) : /* Empty State */ !products || products.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-medium mb-2">No products yet</h2>
              <p className="text-muted-foreground">
                Add your first product to start creating stunning visuals
              </p>
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Product
            </Button>
          </div>
        ) : /* No Search Results */ filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-display font-medium mb-2">No results found</h2>
              <p className="text-muted-foreground">
                Try adjusting your search terms
              </p>
            </div>
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          </div>
        ) : (
          /* Product Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product, index) => {
              const statusBadge = getEnrichmentStatusBadge(product.enrichmentStatus);

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={cn(
                      "group relative overflow-hidden cursor-pointer transition-all",
                      "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                    )}
                    onClick={() => handleProductClick(product)}
                  >
                    {/* Product Image */}
                    <div className="aspect-square overflow-hidden bg-muted">
                      <ProductImage
                        src={product.cloudinaryUrl}
                        alt={product.name}
                      />
                    </div>

                    {/* Enrichment Status Badge - Positioned on image */}
                    <div className="absolute top-3 right-3">
                      <Badge className={cn("text-xs", statusBadge.className)}>
                        {statusBadge.label}
                      </Badge>
                    </div>

                    {/* Delete Button - Shows on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductToDelete(product);
                      }}
                      className="absolute top-3 left-3 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Product Info */}
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-medium text-sm line-clamp-1" title={product.name}>
                        {product.name}
                      </h3>

                      {product.category && (
                        <p className="text-xs text-muted-foreground">
                          {product.category}
                        </p>
                      )}

                      {/* Tags */}
                      {product.tags && product.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {product.tags.slice(0, 3).map((tag, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-5"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {product.tags.length > 3 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-5"
                            >
                              +{product.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onEnrichComplete={() => refetch()}
      />

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
