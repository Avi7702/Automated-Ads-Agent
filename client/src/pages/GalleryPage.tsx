import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Search, SortDesc, Trash2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { GenerationDTO } from '@shared/types/api';

type SortOption = 'newest' | 'oldest';

export default function GalleryPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: generations, isLoading } = useQuery<GenerationDTO[]>({
    queryKey: ['generations'],
    queryFn: async () => {
      const res = await fetch('/api/generations');
      if (!res.ok) throw new Error('Failed to fetch generations');
      return res.json();
    },
  });

  const filteredGenerations = useMemo(() => {
    if (!generations) return [];
    let result = [...generations];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((g) => (g.prompt || '').toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [generations, searchQuery, sortBy]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/generations/${id}`, {
            method: 'DELETE',
            credentials: 'include',
          }).then((res) => {
            if (!res.ok) throw new Error(`Failed to delete generation ${id}`);
            return res.json();
          }),
        ),
      );

      const failed = results.filter((r) => r.status === 'rejected').length;
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;

      if (failed > 0) {
        toast.error('Partial delete', {
          description: `Deleted ${succeeded} of ${ids.length} generations. ${failed} failed.`,
        });
      } else {
        toast.success('Deleted', {
          description: `${succeeded} generation${succeeded !== 1 ? 's' : ''} deleted.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['generations'] });
      setSelectedIds(new Set());
    } catch (error: unknown) {
      toast.error('Delete failed', {
        description: error instanceof Error ? error.message : 'Failed to delete generations',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="gallery" />

      <div className="container px-4 md:px-6 py-6 md:py-8 stagger-container">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Studio
            </Button>
            <h1 className="text-2xl font-bold">Gallery</h1>
            {generations && (
              <span className="text-sm text-muted-foreground">
                {filteredGenerations.length} generation{filteredGenerations.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-40">
              <SortDesc className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading gallery"
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : filteredGenerations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No generations yet</p>
            <p className="text-sm mt-1">Create your first image in the Studio</p>
            <Button className="mt-4" onClick={() => navigate('/')}>
              Go to Studio
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {filteredGenerations.map((gen) => (
              <div
                key={gen.id}
                className={cn(
                  'group relative aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all card-hover-lift',
                  selectedIds.has(gen.id)
                    ? 'ring-2 ring-primary border-primary'
                    : 'border-border hover:border-primary/50',
                )}
                onClick={() => navigate(`/?generation=${gen.id}`)}
              >
                <img
                  src={gen.imageUrl}
                  alt={gen.prompt.slice(0, 80)}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                  <div className="w-full p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-white text-xs line-clamp-2">{gen.prompt}</p>
                    <p className="text-white/70 text-[10px] mt-1">{new Date(gen.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Select checkbox */}
                <button
                  className={cn(
                    'absolute top-2 left-2 w-5 h-5 rounded-full border-2 transition-all',
                    selectedIds.has(gen.id)
                      ? 'bg-primary border-primary'
                      : 'border-white/70 opacity-0 group-hover:opacity-100',
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(gen.id);
                  }}
                  aria-label={`Select generation ${gen.id}`}
                />

                {/* Edit badge */}
                {gen.editCount && gen.editCount > 0 && (
                  <span className="absolute top-2 right-2 bg-primary/90 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    v{(gen.editCount ?? 0) + 1}
                  </span>
                )}

                {/* Wave 3: Mode badge + product count */}
                <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {gen.generationMode && (
                    <span className="bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">
                      {gen.generationMode === 'exact_insert'
                        ? 'Exact'
                        : gen.generationMode === 'inspiration'
                          ? 'Inspiration'
                          : 'Standard'}
                    </span>
                  )}
                  {gen.productIds && gen.productIds.length > 0 && (
                    <span className="bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">
                      {gen.productIds.length} product{gen.productIds.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Generations</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} generation{selectedIds.size !== 1 ? 's' : ''}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
