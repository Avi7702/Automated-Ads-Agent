// @ts-nocheck
/**
 * StyleReferenceSelector — Select style references for generation consistency
 *
 * Displays user's uploaded style references as selectable chips.
 * Selected refs are passed to the generation API as styleReferenceIds.
 */

import { memo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  useStyleReferences,
  useUploadStyleReference,
  useDeleteStyleReference,

} from '@/hooks/useStyleReferences';
import { Palette, User, Mountain, Plus, X, Check, Loader2, Image } from 'lucide-react';

const CATEGORY_ICONS = {
  character: User,
  style: Palette,
  scene: Mountain,
};

const CATEGORY_COLORS = {
  character: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  style: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  scene: 'bg-green-500/10 text-green-600 border-green-500/30',
};

interface StyleReferenceSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export const StyleReferenceSelector = memo(function StyleReferenceSelector({
  selectedIds,
  onSelectionChange,
}: StyleReferenceSelectorProps) {
  const { data: refs, isLoading } = useStyleReferences();
  const uploadMutation = useUploadStyleReference();
  const deleteMutation = useDeleteStyleReference();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState<'character' | 'style' | 'scene'>('style');
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const toggleRef = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter((r) => r !== id));
      } else if (selectedIds.length < 3) {
        onSelectionChange([...selectedIds, id]);
      }
    },
    [selectedIds, onSelectionChange],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !uploadName.trim()) return;
    await uploadMutation.mutateAsync({
      file: selectedFile,
      name: uploadName.trim(),
      category: uploadCategory,
    });
    setShowUpload(false);
    setUploadName('');
    setSelectedFile(null);
  }, [selectedFile, uploadName, uploadCategory, uploadMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading style references...
      </div>
    );
  }

  const hasRefs = refs && refs.length > 0;

  return (
    <div className="space-y-3">
      {/* Reference chips */}
      {hasRefs && (
        <div className="flex flex-wrap gap-2">
          {refs.map((ref) => {
            const isSelected = selectedIds.includes(ref.id);
            const Icon = CATEGORY_ICONS[ref.category] || Palette;
            return (
              <button
                key={ref.id}
                onClick={() => toggleRef(ref.id)}
                className={cn(
                  'group relative flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background hover:bg-muted border-border',
                )}
                aria-label={`${isSelected ? 'Deselect' : 'Select'} style reference: ${ref.name}`}
                aria-pressed={isSelected}
              >
                {/* Thumbnail */}
                <img src={ref.cloudinaryUrl} alt="" className="w-5 h-5 rounded-full object-cover" loading="lazy" />
                <Icon className="w-3.5 h-3.5" />
                <span className="max-w-[120px] truncate">{ref.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5" />}
                {ref.confidence > 0 && ref.confidence < 60 && (
                  <Badge variant="outline" className="text-[10px] px-1">
                    analyzing
                  </Badge>
                )}
                {/* Delete button on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(ref.id);
                  }}
                  className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-4 h-4 rounded-full bg-destructive text-destructive-foreground items-center justify-center"
                  aria-label={`Delete style reference: ${ref.name}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </button>
            );
          })}

          {/* Add button */}
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed text-sm text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Add style reference"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      )}

      {/* Empty state */}
      {!hasRefs && !showUpload && (
        <button
          onClick={() => setShowUpload(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          aria-label="Upload your first style reference"
        >
          <Image className="w-4 h-4" />
          Upload a style reference for consistent visuals
        </button>
      )}

      {/* Selection hint */}
      {selectedIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedIds.length}/3 references selected — style will be applied to generation
        </p>
      )}

      {/* Upload form */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Add Style Reference</span>
                <button
                  onClick={() => {
                    setShowUpload(false);
                    setSelectedFile(null);
                    setUploadName('');
                  }}
                  aria-label="Cancel upload"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* File picker */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-6 rounded-lg border-2 border-dashed text-sm transition-colors',
                  selectedFile
                    ? 'border-primary/50 bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {selectedFile ? (
                  <>
                    <Check className="w-4 h-4" />
                    {selectedFile.name}
                  </>
                ) : (
                  <>
                    <Image className="w-4 h-4" />
                    Click to select an image
                  </>
                )}
              </button>

              {/* Name */}
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Reference name (e.g., 'Industrial Style')"
                className="text-sm"
              />

              {/* Category */}
              <div className="flex gap-2">
                {(['character', 'style', 'scene'] as const).map((cat) => {
                  const Icon = CATEGORY_ICONS[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setUploadCategory(cat)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm capitalize transition-all',
                        uploadCategory === cat ? CATEGORY_COLORS[cat] : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Submit */}
              <Button
                size="sm"
                disabled={!selectedFile || !uploadName.trim() || uploadMutation.isPending}
                onClick={handleUpload}
                className="w-full"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Upload & Analyze
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
