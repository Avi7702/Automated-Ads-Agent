import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, Sparkles, ArrowLeft, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function ProductLibrary() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const uploadProduct = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setUploading(false);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const productName = prompt("Enter product name:");
    if (!productName) return;

    const category = prompt("Enter category (optional):");

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("name", productName);
    if (category) formData.append("category", category);

    uploadProduct.mutate(formData);
  };

  const handleProductSelect = (product: Product) => {
    localStorage.setItem("selectedProductId", product.id);
    localStorage.setItem("selectedProductUrl", product.cloudinaryUrl);
    localStorage.setItem("selectedProductName", product.name);
    setLocation("/");
  };

  const handleSyncFromCloudinary = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/products/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to sync");
      }

      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["products"] });

      toast({
        title: "Sync Complete!",
        description: `Imported ${result.imported} products. Skipped ${result.skipped} duplicates.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || "Failed to sync from Cloudinary",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
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
              Product Library
            </h1>
            <p className="text-slate-400 mt-2">
              Upload and manage your product images stored in Cloudinary
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSyncFromCloudinary}
              disabled={syncing}
              data-testid="button-sync-cloudinary"
              className="border-purple-500/50 hover:bg-purple-500/10"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
              {syncing ? "Syncing..." : "Sync from Cloudinary"}
            </Button>

            <Input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="product-upload"
              data-testid="input-product-upload"
            />
            <label htmlFor="product-upload">
              <Button
                asChild
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={uploading}
                data-testid="button-upload-product"
              >
                <span className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload Product"}
                </span>
              </Button>
            </label>
          </div>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
            <p className="mt-4 text-slate-400">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Upload className="mx-auto h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              No products yet
            </h3>
            <p className="text-slate-400 mb-6">
              Upload your first product to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "group relative bg-slate-900/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-800 hover:border-purple-500 transition-all cursor-pointer",
                  selectedProduct?.id === product.id && "ring-2 ring-purple-500"
                )}
                data-testid={`product-card-${product.id}`}
              >
                {/* Product Image */}
                <div
                  className="aspect-square bg-slate-800 relative overflow-hidden"
                  onClick={() => setSelectedProduct(product)}
                >
                  <img
                    src={product.cloudinaryUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductSelect(product);
                      }}
                      data-testid={`button-use-product-${product.id}`}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Use
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this product?")) {
                          deleteProduct.mutate(product.id);
                        }
                      }}
                      data-testid={`button-delete-product-${product.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white truncate" data-testid={`text-product-name-${product.id}`}>
                    {product.name}
                  </h3>
                  {product.category && (
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {product.category}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
