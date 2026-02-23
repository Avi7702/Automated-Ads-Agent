/**
 * useLearnFromWinners — Data fetching, mutations, and state management
 * for the Learn from Winners (Pattern Library) page.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useUploadStatus } from '@/hooks/useUploadStatus';
import type { LearnedAdPattern } from '@shared/schema';

// ── Types ────────────────────────────────────────────────
export interface UploadMetadata {
  name: string;
  category: string;
  platform: string;
  industry?: string;
  engagementTier?: string;
}

interface PatternsResponse {
  patterns: LearnedAdPattern[];
  count: number;
  filters?: { category?: string; platform?: string; industry?: string };
}

// ── Constants ────────────────────────────────────────────
export const PATTERN_CATEGORIES = [
  { value: 'product_showcase', label: 'Product Showcase', icon: 'ImageIcon' as const, color: 'blue' },
  { value: 'testimonial', label: 'Testimonial', icon: 'Star' as const, color: 'yellow' },
  { value: 'comparison', label: 'Comparison', icon: 'BarChart3' as const, color: 'green' },
  { value: 'educational', label: 'Educational', icon: 'Brain' as const, color: 'purple' },
  { value: 'promotional', label: 'Promotional', icon: 'Zap' as const, color: 'orange' },
  { value: 'brand_awareness', label: 'Brand Awareness', icon: 'Target' as const, color: 'pink' },
];

export const PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'general', label: 'General' },
];

export const ENGAGEMENT_TIERS = [
  { value: 'top-1', label: 'Top 1%', color: 'text-yellow-900 dark:text-yellow-400' },
  { value: 'top-5', label: 'Top 5%', color: 'text-orange-900 dark:text-orange-400' },
  { value: 'top-10', label: 'Top 10%', color: 'text-blue-900 dark:text-blue-400' },
  { value: 'top-25', label: 'Top 25%', color: 'text-green-900 dark:text-green-400' },
  { value: 'unverified', label: 'Unverified', color: 'text-muted-foreground' },
];

// ── Hook ─────────────────────────────────────────────────
export function useLearnFromWinners() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // View & filter state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // Upload state
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const uploadStatusData = useUploadStatus(currentUploadId);
  const { isPolling } = uploadStatusData;

  // Detail dialog state
  const [selectedPattern, setSelectedPattern] = useState<LearnedAdPattern | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Fetch patterns
  const {
    data: patternsResponse,
    isLoading,
    error,
  } = useQuery<PatternsResponse>({
    queryKey: ['learned-patterns', categoryFilter, platformFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (platformFilter !== 'all') params.set('platform', platformFilter);

      const res = await fetch(`/api/learned-patterns?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch patterns');
      return res.json();
    },
  });

  // Extract patterns array with defensive check
  const patterns = Array.isArray(patternsResponse?.patterns) ? patternsResponse.patterns : [];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, metadata }: { file: File; metadata: UploadMetadata }) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('name', metadata.name);
      formData.append('category', metadata.category);
      formData.append('platform', metadata.platform);
      if (metadata.industry) formData.append('industry', metadata.industry);
      if (metadata.engagementTier) formData.append('engagementTier', metadata.engagementTier);

      const res = await fetch('/api/learned-patterns/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      return res.json();
    },
    onSuccess: (data) => {
      setCurrentUploadId(data.uploadId);
      toast({
        title: 'Upload accepted',
        description: 'Processing your ad pattern...',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Upload failed',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (patternId: string) => {
      const res = await fetch(`/api/learned-patterns/${patternId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete pattern');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learned-patterns'] });
      toast({
        title: 'Pattern deleted',
        description: 'The pattern has been removed from your library.',
      });
    },
    onError: () => {
      toast({
        title: 'Delete failed',
        description: 'Could not delete the pattern. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Completion watcher effect
  useEffect(() => {
    if (uploadStatusData?.isComplete) {
      if (uploadStatusData.status === 'completed') {
        queryClient.invalidateQueries({ queryKey: ['learned-patterns'] });
        toast({ title: 'Pattern extracted successfully' });
        setCurrentUploadId(null);
      } else if (uploadStatusData.status === 'failed') {
        toast({ title: 'Extraction failed', description: uploadStatusData.error, variant: 'destructive' });
        setCurrentUploadId(null);
      }
    }
  }, [uploadStatusData, queryClient, toast]);

  // Filter patterns client-side (search is local on top of server-filtered results)
  const filteredPatterns = patterns.filter((p) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (p.name || '').toLowerCase().includes(query) ||
        (p.category || '').toLowerCase().includes(query) ||
        (p.platform || '').toLowerCase().includes(query) ||
        (p.industry || '').toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Handlers
  const handleUpload = (file: File, metadata: UploadMetadata) => {
    uploadMutation.mutate({ file, metadata });
  };

  const handleViewPattern = (pattern: LearnedAdPattern) => {
    setSelectedPattern(pattern);
    setShowDetailDialog(true);
  };

  const handleDeletePattern = (patternId: string) => {
    if (confirm('Are you sure you want to delete this pattern?')) {
      deleteMutation.mutate(patternId);
    }
  };

  const handleApplyPattern = (pattern: LearnedAdPattern) => {
    window.location.href = `/?patternId=${pattern.id}`;
  };

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['learned-patterns'] });
  };

  return {
    // Data
    patterns,
    filteredPatterns,
    isLoading,
    error,

    // View state
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    platformFilter,
    setPlatformFilter,

    // Upload state
    isPolling,
    uploadStatusData,

    // Detail dialog
    selectedPattern,
    showDetailDialog,
    setShowDetailDialog,

    // Handlers
    handleUpload,
    handleViewPattern,
    handleDeletePattern,
    handleApplyPattern,
    handleRetry,
  };
}
