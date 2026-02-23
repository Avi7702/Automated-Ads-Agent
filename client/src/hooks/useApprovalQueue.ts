/**
 * useApprovalQueue — Data fetching, mutations, and state for the Approval Queue page.
 */
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export interface ApprovalQueueItem {
  id: string;
  userId: string;
  adCopyId?: string;
  generationId?: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'needs_revision' | 'scheduled' | 'published' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  aiConfidenceScore?: number;
  aiRecommendation?: 'auto_approve' | 'manual_review' | 'auto_reject';
  aiReasoning?: string;
  safetyChecksPassed?: unknown;
  complianceFlags?: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
  adCopy?: {
    caption: string;
    headline?: string;
    hook?: string;
    cta?: string;
    platform: string;
    framework?: string;
    qualityScore?: unknown;
  };
  generation?: {
    generatedImagePath: string;
    prompt?: string;
    aspectRatio?: string;
  };
}

export interface QueueStats {
  totalPending: number;
  avgConfidenceScore: number;
  urgentCount: number;
  highPriorityCount: number;
}

export function useApprovalQueue() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    totalPending: 0,
    avgConfidenceScore: 0,
    urgentCount: 0,
    highPriorityCount: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('pending_review');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Review modal
  const [reviewingItem, setReviewingItem] = useState<ApprovalQueueItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Approve & Schedule dialog
  const [scheduleDialogItemId, setScheduleDialogItemId] = useState<string | null>(null);
  const [scheduleConnectionId, setScheduleConnectionId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [scheduleTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [isScheduling, setIsScheduling] = useState(false);

  // Fetch social accounts
  const { data: socialAccounts = [] } = useQuery<
    { id: string; platform: string; accountName: string; isActive: boolean }[]
  >({
    queryKey: ['social-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/social/accounts', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });
  const activeAccounts = socialAccounts.filter((a) => a.isActive);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (platformFilter !== 'all') params.append('platform', platformFilter);

      const response = await fetch(`/api/approval-queue?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch approval queue');

      const data = await response.json();
      const fetchedItems = data.data?.items || data.items || [];
      setItems(fetchedItems);

      const pending = fetchedItems.filter((item: ApprovalQueueItem) => item.status === 'pending_review');
      const avgScore =
        pending.reduce((sum: number, item: ApprovalQueueItem) => sum + (item.aiConfidenceScore || 0), 0) /
        (pending.length || 1);

      setStats({
        totalPending: pending.length,
        avgConfidenceScore: Math.round(avgScore),
        urgentCount: pending.filter((item: ApprovalQueueItem) => item.priority === 'urgent').length,
        highPriorityCount: pending.filter((item: ApprovalQueueItem) => item.priority === 'high').length,
      });
      setSelectedIds(new Set());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load approval queue';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, platformFilter, toast]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleQuickApprove = async (itemId: string) => {
    try {
      setIsProcessing(true);
      const response = await fetch(`/api/approval-queue/${itemId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: 'Quick approved' }),
      });
      if (!response.ok) throw new Error('Failed to approve content');
      toast({ title: 'Success', description: 'Content approved successfully' });
      fetchQueue();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve content',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (itemId: string, notes?: string) => {
    try {
      setIsProcessing(true);
      const response = await fetch(`/api/approval-queue/${itemId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) throw new Error('Failed to approve content');
      toast({ title: 'Success', description: 'Content approved' });
      setReviewingItem(null);
      fetchQueue();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve content',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openScheduleDialog = useCallback((itemId: string) => {
    setScheduleDialogItemId(itemId);
    setScheduleConnectionId('');
    setScheduleDate(format(new Date(), 'yyyy-MM-dd'));
    setScheduleTime('10:00');
  }, []);

  const handleApproveAndSchedule = async () => {
    if (!scheduleDialogItemId || !scheduleConnectionId || !scheduleDate) return;
    setIsScheduling(true);
    try {
      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      const response = await fetch(`/api/approval-queue/${scheduleDialogItemId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          schedule: { connectionId: scheduleConnectionId, scheduledFor, timezone: scheduleTimezone },
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to approve and schedule');
      }
      const formatted =
        format(new Date(scheduledFor), 'MMM d, yyyy') + ' at ' + format(new Date(scheduledFor), 'h:mm a');
      toast({ title: 'Approved & scheduled', description: `Content approved and scheduled for ${formatted}.` });
      setScheduleDialogItemId(null);
      setReviewingItem(null);
      fetchQueue();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve and schedule',
        variant: 'destructive',
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleReject = async (itemId: string, notes?: string) => {
    try {
      setIsProcessing(true);
      const response = await fetch(`/api/approval-queue/${itemId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: notes || 'Rejected' }),
      });
      if (!response.ok) throw new Error('Failed to reject content');
      toast({ title: 'Success', description: 'Content rejected' });
      setReviewingItem(null);
      fetchQueue();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject content',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestRevision = async (itemId: string, notes?: string) => {
    try {
      setIsProcessing(true);
      const response = await fetch(`/api/approval-queue/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'needs_revision', reviewNotes: notes }),
      });
      if (!response.ok) throw new Error('Failed to request revision');
      toast({ title: 'Success', description: 'Revision requested' });
      setReviewingItem(null);
      fetchQueue();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to request revision',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const response = await fetch(`/api/approval-queue/${itemId}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) throw new Error('Failed to delete item');
      toast({ title: 'Success', description: 'Item deleted' });
      fetchQueue();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete item',
        variant: 'destructive',
      });
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    try {
      setIsProcessing(true);
      const response = await fetch('/api/approval-queue/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: Array.from(selectedIds), notes: 'Bulk approved' }),
      });
      if (!response.ok) throw new Error('Failed to bulk approve');
      const result = await response.json();
      toast({ title: 'Success', description: `${result.approved} items approved successfully` });
      fetchQueue();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to bulk approve',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Reject ${selectedIds.size} items?`)) return;
    try {
      setIsProcessing(true);
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/approval-queue/${id}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason: 'Bulk rejected' }),
        }),
      );
      await Promise.all(promises);
      toast({ title: 'Success', description: `${selectedIds.size} items rejected` });
      fetchQueue();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to bulk reject',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelection = (itemId: string, selected: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (selected) newSelectedIds.add(itemId);
    else newSelectedIds.delete(itemId);
    setSelectedIds(newSelectedIds);
  };

  const selectAll = () => setSelectedIds(new Set(items.map((item) => item.id)));
  const deselectAll = () => setSelectedIds(new Set());

  // Group items by priority
  const urgentItems = items.filter((item) => item.priority === 'urgent');
  const highPriorityItems = items.filter((item) => item.priority === 'high');
  const standardItems = items.filter((item) => item.priority === 'medium' || item.priority === 'low');

  return {
    // State
    loading,
    items,
    stats,
    statusFilter,
    priorityFilter,
    platformFilter,
    selectedIds,
    reviewingItem,
    isProcessing,
    scheduleDialogItemId,
    scheduleConnectionId,
    scheduleDate,
    scheduleTime,
    scheduleTimezone,
    isScheduling,
    activeAccounts,
    urgentItems,
    highPriorityItems,
    standardItems,

    // Setters
    setStatusFilter,
    setPriorityFilter,
    setPlatformFilter,
    setReviewingItem,
    setScheduleDialogItemId,
    setScheduleConnectionId,
    setScheduleDate,
    setScheduleTime,

    // Handlers
    fetchQueue,
    handleQuickApprove,
    handleApprove,
    handleReject,
    handleRequestRevision,
    handleDelete,
    handleApproveAndSchedule,
    openScheduleDialog,
    handleBulkApprove,
    handleBulkReject,
    toggleSelection,
    selectAll,
    deselectAll,
  };
}
