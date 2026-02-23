/**
 * useContentPlanner — Data fetching, mutations, and state management
 * for the Content Planner page.
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Types from backend
export interface ContentTemplate {
  id: string;
  category: string;
  categoryPercentage: number;
  subType: string;
  title: string;
  description: string;
  hookFormulas: string[];
  postStructure: string;
  bestPlatforms: { platform: string; format: string }[];
  exampleTopics: string[];
  whatToAvoid: string[];
}

export interface ContentCategory {
  id: string;
  name: string;
  percentage: number;
  description: string;
  weeklyTarget: number;
  bestPractices: string[];
  templates: ContentTemplate[];
}

export interface BalanceData {
  balance: Record<string, { current: number; target: number; percentage: number }>;
  suggested: { categoryId: string; categoryName: string; reason: string };
  totalPosts: number;
}

export interface SuggestionData {
  category: {
    id: string;
    name: string;
    percentage: number;
    weeklyTarget: number;
    currentCount: number;
    bestPractices: string[];
  };
  suggestedTemplate: {
    id: string;
    title: string;
    subType: string;
    description: string;
    hookFormulas: string[];
  } | null;
  reason: string;
}

export interface ContentPlannerPost {
  id: string;
  userId: string;
  category: string;
  subType: string;
  platform: string | null;
  notes: string | null;
  postedAt: string;
  createdAt: string;
}

export function useContentPlanner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // State for modals
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [markAsPostedCategory, setMarkAsPostedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // State for Start Fresh warning modal
  const [showStartFreshModal, setShowStartFreshModal] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [pendingTemplateName, setPendingTemplateName] = useState<string>('');

  // Fetch templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery<{
    categories: ContentCategory[];
    templates: ContentTemplate[];
  }>({
    queryKey: ['/api/content-planner/templates'],
    staleTime: 1000 * 60 * 60,
  });

  // Fetch balance
  const { data: balanceData, isLoading: balanceLoading } = useQuery<BalanceData>({
    queryKey: ['/api/content-planner/balance'],
    staleTime: 1000 * 60,
  });

  // Fetch suggestion
  const { data: suggestionData, isLoading: suggestionLoading } = useQuery<SuggestionData>({
    queryKey: ['/api/content-planner/suggestion'],
    staleTime: 1000 * 60,
  });

  // Fetch recent posts (last 7 days)
  const { data: recentPosts = [], refetch: refetchPosts } = useQuery<ContentPlannerPost[]>({
    queryKey: ['/api/content-planner/posts'],
    queryFn: async () => {
      const res = await fetch('/api/content-planner/posts', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/content-planner/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      refetchPosts();
      queryClient.invalidateQueries({ queryKey: ['/api/content-planner/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/content-planner/suggestion'] });
      toast({ title: 'Post removed', description: 'Your weekly balance has been updated.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to remove post. Please try again.', variant: 'destructive' });
    },
  });

  // Mark as posted mutation
  const markAsPostedMutation = useMutation({
    mutationFn: async (data: {
      category: string;
      subType: string;
      platform?: string | undefined;
      notes?: string | undefined;
    }) => {
      const response = await fetch('/api/content-planner/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to mark as posted');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-planner/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/content-planner/suggestion'] });
      refetchPosts();
      toast({ title: 'Post recorded', description: 'Your weekly balance has been updated.' });
      setMarkAsPostedCategory(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to record post. Please try again.', variant: 'destructive' });
    },
  });

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Hook formula copied to clipboard.' });
  };

  const handleCreateInStudio = (templateId: string, templateName: string) => {
    setPendingTemplateId(templateId);
    setPendingTemplateName(templateName);
    setShowStartFreshModal(true);
  };

  const handleConfirmStartFresh = () => {
    if (pendingTemplateId) {
      setLocation(`/?cpTemplateId=${pendingTemplateId}&fresh=true`);
    }
    setShowStartFreshModal(false);
    setPendingTemplateId(null);
    setPendingTemplateName('');
    setSelectedTemplate(null);
  };

  const handleCancelStartFresh = () => {
    setShowStartFreshModal(false);
    setPendingTemplateId(null);
    setPendingTemplateName('');
  };

  const categories = templatesData?.categories || [];
  const isLoading = templatesLoading || balanceLoading;

  return {
    // Data
    categories,
    balanceData,
    suggestionData,
    suggestionLoading,
    recentPosts,
    isLoading,

    // State
    selectedTemplate,
    markAsPostedCategory,
    expandedCategories,
    showStartFreshModal,
    pendingTemplateName,

    // Setters
    setSelectedTemplate,
    setMarkAsPostedCategory,
    setShowStartFreshModal,

    // Mutations
    deletePostMutation,
    markAsPostedMutation,

    // Handlers
    toggleCategory,
    copyToClipboard,
    handleCreateInStudio,
    handleConfirmStartFresh,
    handleCancelStartFresh,
  };
}
