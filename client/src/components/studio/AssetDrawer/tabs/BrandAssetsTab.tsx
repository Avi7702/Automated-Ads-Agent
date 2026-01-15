import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { ImageIcon, Check } from 'lucide-react';
import { useState } from 'react';

interface BrandImage {
  id: string;
  imageUrl: string;
  publicId: string;
  category: string;
  tags: string[];
  createdAt: string;
}

export function BrandAssetsTab() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Fetch brand images
  const { data: brandImages = [], isLoading } = useQuery<BrandImage[]>({
    queryKey: ['brandImages'],
    queryFn: async () => {
      const res = await fetch('/api/brand-images', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch brand images');
      return res.json();
    },
  });

  // Toggle image selection
  const toggleImage = (id: string) => {
    setSelectedImages((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Info */}
      <p className="text-xs text-muted-foreground">
        Select brand images to include as style reference.
      </p>

      {/* Image Grid */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {brandImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {brandImages.map((image) => {
              const isSelected = selectedImages.includes(image.id);
              return (
                <button
                  key={image.id}
                  onClick={() => toggleImage(image.id)}
                  className={cn(
                    'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <img
                    src={image.imageUrl}
                    alt={image.category}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                    <p className="text-white text-[10px] truncate">{image.category}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No brand images</p>
            <p className="text-[10px] mt-1">Upload brand assets in Library</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
        {selectedImages.length > 0
          ? `${selectedImages.length} selected`
          : `${brandImages.length} brand images`}
      </div>
    </div>
  );
}
