import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function AddProductModal({ isOpen, onClose }: AddProductModalProps) {
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Reset form
  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setName('');
    setCategory('');
    setDescription('');
    setUploadError(null);
  };

  // Handle close
  const handleClose = () => {
    if (!isUploading) {
      resetForm();
      onClose();
    }
  };

  // Dropzone configuration
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setUploadError(null);

      if (rejectedFiles.length > 0) {
        const firstRejection = rejectedFiles[0];
        const error = firstRejection?.errors[0];
        if (!error) {
          setUploadError('File rejected.');
          return;
        }
        if (error.code === 'file-too-large') {
          setUploadError('File is too large. Maximum size is 10MB.');
        } else if (error.code === 'file-invalid-type') {
          setUploadError('Invalid file type. Please upload JPG, PNG, WebP, or GIF.');
        } else {
          setUploadError(error.message);
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const selectedFile = acceptedFiles[0];
        if (!selectedFile) return;

        setFile(selectedFile);

        // Create preview
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreview(objectUrl);

        // Auto-fill name from filename if empty
        if (!name) {
          const fileName = selectedFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
          const formattedName = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          setName(formattedName);
        }
      }
    },
    [name],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  // Clear selected file
  const clearFile = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setUploadError(null);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setUploadError('Please select an image to upload.');
      return;
    }

    if (!name.trim()) {
      setUploadError('Please enter a product name.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('name', name.trim());
      if (category.trim()) {
        formData.append('category', category.trim());
      }
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(error.message || 'Failed to create product');
      }

      const product = await response.json();

      // Invalidate products query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['products'] });

      toast.success('Product created', {
        description: `${product.name} has been added to your library.`,
      });

      handleClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload product';
      setUploadError(message);
      toast.error('Upload failed', {
        description: message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>Upload a product image to add it to your library.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dropzone */}
          <div className="space-y-2">
            <Label>Product Image</Label>
            <AnimatePresence mode="wait">
              {!preview ? (
                <motion.div key="dropzone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div
                    {...getRootProps()}
                    className={`
                      relative border-2 border-dashed rounded-xl p-8
                      transition-colors cursor-pointer
                      ${
                        isDragActive
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }
                    `}
                  >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {isDragActive ? 'Drop the image here' : 'Drag & drop an image'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          or click to browse (JPG, PNG, WebP, GIF up to 10MB)
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative"
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                    <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={clearFile}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Image className="w-4 h-4" />
                    <span className="truncate">{file?.name}</span>
                    <span className="text-xs">({(file?.size ? file.size / 1024 : 0).toFixed(1)} KB)</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Steel Mesh, Rebar, Accessories"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief product description (optional)"
              rows={3}
            />
          </div>

          {/* Error Message */}
          {uploadError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </motion.div>
          )}

          {/* Footer */}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || !file}>
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Add Product
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
