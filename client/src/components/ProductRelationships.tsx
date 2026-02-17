import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Plus, Trash2, ArrowRight, Package, Loader2 } from 'lucide-react';
import { cn, getProductImageUrl } from '@/lib/utils';
import type { ProductRelationship, Product } from '@shared/schema';

// Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Relationship types with descriptions
const RELATIONSHIP_TYPES = [
  { value: 'pairs_with', label: 'Pairs With', description: 'Products that complement each other' },
  { value: 'requires', label: 'Requires', description: 'Products that are required for installation' },
  { value: 'replaces', label: 'Replaces', description: 'Products that can substitute each other' },
  { value: 'matches', label: 'Matches', description: 'Products with similar style/color' },
  { value: 'completes', label: 'Completes', description: 'Products that complete a set' },
  { value: 'upgrades', label: 'Upgrades', description: 'Products that are premium alternatives' },
];

// Get relationship type info
function getRelationshipInfo(type: string) {
  return RELATIONSHIP_TYPES.find((t) => t.value === type) || { value: type, label: type, description: '' };
}

// Relationship badge component (light mode readable + dark mode optimized)
function RelationshipTypeBadge({ type }: { type: string }) {
  const info = getRelationshipInfo(type);
  const colors: Record<string, string> = {
    pairs_with: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30',
    requires: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30',
    replaces: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
    matches: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30',
    completes: 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30',
    upgrades: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30',
  };

  return <Badge className={cn('text-xs', colors[type] || 'bg-muted')}>{info.label}</Badge>;
}

// Relationship card
function RelationshipCard({
  relationship,
  products,
  currentProductId,
  onDelete,
}: {
  relationship: ProductRelationship;
  products: Product[];
  currentProductId: string;
  onDelete: () => void;
}) {
  const isSource = relationship.sourceProductId === currentProductId;
  const relatedProductId = isSource ? relationship.targetProductId : relationship.sourceProductId;
  const relatedProduct = products.find((p) => p.id === relatedProductId);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="group"
    >
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
        {/* Related product image or placeholder */}
        <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex-shrink-0">
          {relatedProduct?.cloudinaryUrl ? (
            <img
              src={getProductImageUrl(relatedProduct.cloudinaryUrl)}
              alt={relatedProduct.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Relationship info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <RelationshipTypeBadge type={relationship.relationshipType} />
            {relationship.isRequired && (
              <Badge variant="destructive" className="text-xs">
                Required
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium truncate mt-1">{relatedProduct?.name || 'Unknown Product'}</p>
          {relationship.description && (
            <p className="text-xs text-muted-foreground truncate">{relationship.description}</p>
          )}
        </div>

        {/* Direction indicator */}
        <ArrowRight className={cn('w-4 h-4 text-muted-foreground', !isSource && 'rotate-180')} />

        {/* Delete button */}
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </motion.div>
  );
}

// Add relationship modal
function AddRelationshipModal({
  isOpen,
  onClose,
  sourceProductId,
  products,
  existingRelationships,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  sourceProductId: string;
  products: Product[];
  existingRelationships: ProductRelationship[];
  onSubmit: (data: {
    targetProductId: string;
    relationshipType: string;
    description?: string | undefined;
    isRequired?: boolean | undefined;
  }) => void;
  isSubmitting: boolean;
}) {
  const [targetProductId, setTargetProductId] = useState('');
  const [relationshipType, setRelationshipType] = useState('pairs_with');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  // Filter out products that already have a relationship of the same type
  const availableProducts = products.filter((p) => {
    if (p.id === sourceProductId) return false;

    // Check if relationship already exists
    const existingRel = existingRelationships.find(
      (r) =>
        (r.sourceProductId === sourceProductId &&
          r.targetProductId === p.id &&
          r.relationshipType === relationshipType) ||
        (r.targetProductId === sourceProductId &&
          r.sourceProductId === p.id &&
          r.relationshipType === relationshipType),
    );
    return !existingRel;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProductId) return;

    onSubmit({
      targetProductId,
      relationshipType,
      description: description.trim() || undefined,
      isRequired,
    });

    // Reset form
    setTargetProductId('');
    setDescription('');
    setIsRequired(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Product Relationship</DialogTitle>
          <DialogDescription>Define how this product relates to other products in your catalog.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Relationship Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Relationship Type</label>
            <Select value={relationshipType} onValueChange={setRelationshipType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <span className="font-medium">{type.label}</span>
                      <span className="text-muted-foreground ml-2">- {type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Product */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Related Product</label>
            {availableProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                No available products for this relationship type.
              </p>
            ) : (
              <Select value={targetProductId} onValueChange={setTargetProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this relationship..."
              rows={2}
            />
          </div>

          {/* Is Required */}
          {relationshipType === 'requires' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="rounded border-muted-foreground"
              />
              <span className="text-sm">This product is required for installation</span>
            </label>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !targetProductId}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Relationship
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Main component props
interface ProductRelationshipsProps {
  productId: string;
  className?: string;
}

export function ProductRelationships({ productId, className }: ProductRelationshipsProps) {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch relationships for this product
  const { data: relationships = [], isLoading: isLoadingRelationships } = useQuery<ProductRelationship[]>({
    queryKey: ['product-relationships', productId],
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}/relationships`);
      if (!response.ok) throw new Error('Failed to fetch relationships');
      return response.json();
    },
  });

  // Fetch all products for the dropdown
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  // Create relationship mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      targetProductId: string;
      relationshipType: string;
      description?: string | undefined;
      isRequired?: boolean | undefined;
    }) => {
      const response = await fetch('/api/product-relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceProductId: productId,
          ...data,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create relationship');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-relationships', productId] });
      setIsAddModalOpen(false);
    },
  });

  // Delete relationship mutation
  const deleteMutation = useMutation({
    mutationFn: async (relationshipId: string) => {
      const response = await fetch(`/api/product-relationships/${relationshipId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete relationship');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-relationships', productId] });
    },
  });

  // Group relationships by type
  const groupedRelationships = relationships.reduce<Record<string, ProductRelationship[]>>((acc, rel) => {
    const type = rel.relationshipType;
    const existingArray = acc[type];
    if (!existingArray) {
      acc[type] = [rel];
    } else {
      existingArray.push(rel);
    }
    return acc;
  }, {});

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">Product Relationships</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingRelationships ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : relationships.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No relationships defined</p>
            <p className="text-xs mt-1">Add relationships to help AI understand product connections</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedRelationships).map(([type, rels]) => (
              <div key={type}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {getRelationshipInfo(type).label} ({rels.length})
                </h4>
                <div className="space-y-2">
                  <AnimatePresence>
                    {rels.map((rel) => (
                      <RelationshipCard
                        key={rel.id}
                        relationship={rel}
                        products={products}
                        currentProductId={productId}
                        onDelete={() => deleteMutation.mutate(rel.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Relationship Modal */}
      <AddRelationshipModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        sourceProductId={productId}
        products={products}
        existingRelationships={relationships}
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />
    </Card>
  );
}

export default ProductRelationships;
