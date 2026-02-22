import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Home, Layers, X, Save, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { InstallationScenario, Product } from '@shared/schema';

// Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Header } from '@/components/layout/Header';

interface InstallationScenariosProps {
  embedded?: boolean;
  selectedId?: string | null;
}

// Scenario types
const SCENARIO_TYPES = [
  { value: 'room_type', label: 'Room Type' },
  { value: 'application', label: 'Application' },
  { value: 'before_after', label: 'Before/After' },
];

const ROOM_TYPES = [
  'living_room',
  'bedroom',
  'kitchen',
  'bathroom',
  'office',
  'commercial',
  'outdoor',
  'basement',
  'garage',
];

const STYLE_TAGS = [
  'modern',
  'rustic',
  'traditional',
  'industrial',
  'minimalist',
  'contemporary',
  'farmhouse',
  'coastal',
];

// Empty state component
function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
      <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
        <Layers className="w-10 h-10 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-2xl font-display font-medium mb-2">No scenarios yet</h2>
        <p className="text-muted-foreground max-w-md">
          Installation scenarios help AI understand how your products are used in real-world settings.
        </p>
      </div>
      <Button onClick={onCreateNew}>
        <Plus className="w-4 h-4 mr-2" />
        Create First Scenario
      </Button>
    </div>
  );
}

// Loading skeleton
function ScenarioSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// Scenario card component
function ScenarioCard({
  scenario,
  onEdit,
  onDelete,
}: {
  scenario: InstallationScenario;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <Card className="group hover:border-primary/50 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{scenario.title}</CardTitle>
              <Badge variant="outline" className="mt-1">
                {SCENARIO_TYPES.find((t) => t.value === scenario.scenarioType)?.label || scenario.scenarioType}
              </Badge>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">{scenario.description}</p>

          {/* Room types */}
          {scenario.roomTypes && scenario.roomTypes.length > 0 && (
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {scenario.roomTypes.map((room, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {room.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Style tags */}
          {scenario.styleTags && scenario.styleTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {scenario.styleTags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Installation steps count */}
          {scenario.installationSteps && scenario.installationSteps.length > 0 && (
            <p className="text-xs text-muted-foreground">{scenario.installationSteps.length} installation steps</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Scenario form modal
function ScenarioFormModal({
  isOpen,
  onClose,
  scenario,
  products,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  scenario: InstallationScenario | null;
  products: Product[];
  onSubmit: (data: Partial<InstallationScenario>) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState({
    title: scenario?.title || '',
    description: scenario?.description || '',
    scenarioType: scenario?.scenarioType || 'room_type',
    primaryProductId: scenario?.primaryProductId || '',
    roomTypes: scenario?.roomTypes || [],
    styleTags: scenario?.styleTags || [],
    installationSteps: scenario?.installationSteps || [],
    requiredAccessories: scenario?.requiredAccessories || [],
  });

  const [newStep, setNewStep] = useState('');
  const [newAccessory, setNewAccessory] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addStep = () => {
    if (newStep.trim()) {
      setFormData((prev) => ({
        ...prev,
        installationSteps: [...prev.installationSteps, newStep.trim()],
      }));
      setNewStep('');
    }
  };

  const removeStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      installationSteps: prev.installationSteps.filter((_, i) => i !== index),
    }));
  };

  const addAccessory = () => {
    if (newAccessory.trim()) {
      setFormData((prev) => ({
        ...prev,
        requiredAccessories: [...prev.requiredAccessories, newAccessory.trim()],
      }));
      setNewAccessory('');
    }
  };

  const removeAccessory = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      requiredAccessories: prev.requiredAccessories.filter((_, i) => i !== index),
    }));
  };

  const toggleRoomType = (room: string) => {
    setFormData((prev) => ({
      ...prev,
      roomTypes: prev.roomTypes.includes(room) ? prev.roomTypes.filter((r) => r !== room) : [...prev.roomTypes, room],
    }));
  };

  const toggleStyleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      styleTags: prev.styleTags.includes(tag) ? prev.styleTags.filter((t) => t !== tag) : [...prev.styleTags, tag],
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{scenario ? 'Edit Scenario' : 'Create Installation Scenario'}</DialogTitle>
          <DialogDescription>Define how your products are installed and used in real-world settings.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Modern Living Room Flooring"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe this installation scenario..."
              rows={3}
              required
            />
          </div>

          {/* Scenario Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Scenario Type</label>
            <Select
              value={formData.scenarioType}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, scenarioType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCENARIO_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Primary Product */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Primary Product (Optional)</label>
            <Select
              value={formData.primaryProductId || 'none'}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  primaryProductId: value === 'none' ? '' : value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No product selected</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Room Types */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Room Types</label>
            <div className="flex flex-wrap gap-2">
              {ROOM_TYPES.map((room) => (
                <Badge
                  key={room}
                  variant={formData.roomTypes.includes(room) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleRoomType(room)}
                >
                  {room.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>

          {/* Style Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Style Tags</label>
            <div className="flex flex-wrap gap-2">
              {STYLE_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={formData.styleTags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleStyleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Installation Steps */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Installation Steps</label>
            <div className="space-y-2">
              {formData.installationSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                  <span className="flex-1 text-sm">{step}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(idx)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  placeholder="Add installation step..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStep())}
                />
                <Button type="button" variant="secondary" onClick={addStep}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Required Accessories */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Required Accessories</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.requiredAccessories.map((acc, idx) => (
                <Badge key={idx} variant="secondary" className="pr-1">
                  {acc}
                  <button type="button" onClick={() => removeAccessory(idx)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAccessory}
                onChange={(e) => setNewAccessory(e.target.value)}
                placeholder="e.g., underlayment, trim, adhesive..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAccessory())}
              />
              <Button type="button" variant="secondary" onClick={addAccessory}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {scenario ? 'Update' : 'Create'} Scenario
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function InstallationScenarios({
  embedded = false,
  selectedId: _selectedId,
}: InstallationScenariosProps) {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<InstallationScenario | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch scenarios
  const { data: scenarios, isLoading } = useQuery<InstallationScenario[]>({
    queryKey: ['installation-scenarios'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/installation-scenarios');
      return response.json();
    },
  });

  // Fetch products for the form
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/products');
      return response.json();
    },
  });

  // Create scenario mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<InstallationScenario>) => {
      const response = await apiRequest('POST', '/api/installation-scenarios', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installation-scenarios'] });
      setIsFormOpen(false);
    },
  });

  // Update scenario mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InstallationScenario> }) => {
      const response = await apiRequest('PUT', `/api/installation-scenarios/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installation-scenarios'] });
      setEditingScenario(null);
      setIsFormOpen(false);
    },
  });

  // Delete scenario mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/installation-scenarios/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installation-scenarios'] });
      setDeleteConfirmId(null);
    },
  });

  const handleOpenCreate = () => {
    setEditingScenario(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (scenario: InstallationScenario) => {
    setEditingScenario(scenario);
    setIsFormOpen(true);
  };

  const handleSubmit = (data: Partial<InstallationScenario>) => {
    if (editingScenario) {
      updateMutation.mutate({ id: editingScenario.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const mainContent = (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Installation Scenarios</h1>
          <p className="text-muted-foreground mt-1">Define real-world usage contexts for your products</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Scenario
        </Button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Loading scenarios"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <ScenarioSkeleton key={i} />
          ))}
        </div>
      ) : /* Empty State */ !scenarios || scenarios.length === 0 ? (
        <EmptyState onCreateNew={handleOpenCreate} />
      ) : (
        /* Scenario Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onEdit={() => handleOpenEdit(scenario)}
                onDelete={() => setDeleteConfirmId(scenario.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Form Modal */}
      <ScenarioFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingScenario(null);
        }}
        scenario={editingScenario}
        products={products}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Scenario</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this installation scenario? This action cannot be undone.
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
    </>
  );

  if (embedded) {
    return mainContent;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <Header currentPage="settings" />

      {/* Content */}
      <main className="container max-w-6xl mx-auto px-6 pt-24 pb-20 relative z-10">{mainContent}</main>
    </div>
  );
}
