import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trash2, Edit, Calendar, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";

interface Generation {
  id: string;
  prompt: string;
  originalImagePaths: string[];
  generatedImagePath: string;
  resolution: string;
  createdAt: string;
}

function GalleryImage({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);

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
      src={src}
      alt={alt}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setHasError(true)}
    />
  );
}

export default function Gallery() {
  const queryClient = useQueryClient();

  const { data: generations, isLoading } = useQuery<Generation[]>({
    queryKey: ["generations"],
    queryFn: async () => {
      const response = await fetch("/api/generations");
      if (!response.ok) throw new Error("Failed to fetch generations");
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/generations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete generation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generations"] });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Delete this generation? This cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <Header currentPage="gallery" />

      {/* Content */}
      <main className="container max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-20 relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-muted-foreground">Loading gallery...</div>
          </div>
        ) : !generations || generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
              <Calendar className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-medium mb-2">No generations yet</h2>
              <p className="text-muted-foreground">Start creating product transformations to see them here</p>
            </div>
            <Link href="/">
              <Button>Create First Generation</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {generations.map((gen, index) => (
              <motion.div
                key={gen.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all"
                data-testid={`card-generation-${gen.id}`}
              >
                {/* Image */}
                <Link href={`/generation/${gen.id}`} className="block">
                  <div className="aspect-square overflow-hidden bg-muted" data-testid={`img-generation-${gen.id}`}>
                    <GalleryImage
                      src={gen.generatedImagePath.startsWith("http") ? gen.generatedImagePath : `/${gen.generatedImagePath}`}
                      alt={gen.prompt}
                    />
                  </div>
                </Link>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <p className="text-sm line-clamp-2 text-foreground" data-testid={`text-prompt-${gen.id}`}>
                    {gen.prompt}
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{format(new Date(gen.createdAt), "MMM d, yyyy")}</span>
                    <span className="px-2 py-0.5 rounded bg-secondary">{gen.resolution}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/generation/${gen.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-${gen.id}`}>
                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(gen.id)}
                      className="text-destructive hover:bg-destructive/10"
                      data-testid={`button-delete-${gen.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
