/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';

interface ApprovalQueueProps {
  embedded?: boolean;
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { QueueCard } from '@/components/approval/QueueCard';
import { ReviewModal } from '@/components/approval/ReviewModal';
import { BulkActions } from '@/components/approval/BulkActions';
import {
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  BarChart3,
  TrendingUp,
  Flame,
  AlertCircle,
  CalendarClock,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

interface ApprovalQueueItem {
  id: string;
  userId: string;
  adCopyId?: string;
  generationId?: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'needs_revision' | 'scheduled' | 'published' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  aiConfidenceScore?: number;
  aiRecommendation?: 'auto_approve' | 'manual_review' | 'auto_reject';
  aiReasoning?: string;
  safetyChecksPassed?: any;
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
    qualityScore?: any;
  };
  generation?: {
    generatedImagePath: string;
    prompt?: string;
    aspectRatio?: string;
  };
}

interface QueueStats {
  totalPending: number;
  avgConfidenceScore: number;
  urgentCount: number;
  highPriorityCount: number;
}

export default function ApprovalQueue({ embedded = false }: ApprovalQueueProps) {
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

  // Fetch social accounts for the schedule dialog
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

  useEffect(() => {
    fetchQueue();
  }, [statusFilter, priorityFilter, platformFilter]);

  const fetchQueue = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (platformFilter !== 'all') params.append('platform', platformFilter);

      const response = await fetch(`/api/approval-queue?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch approval queue');
      }

      const data = await response.json();
      // Handle both response formats: {items:[]} or {data:{items:[]}}
      const items = data.data?.items || data.items || [];
      setItems(items);

      // Calculate stats
      const pending = items.filter((item: ApprovalQueueItem) => item.status === 'pending_review');
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
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Failed to load approval queue',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApprove = async (itemId: string) => {
    try {
      setIsProcessing(true);

      const response = await fetch(`/api/approval-queue/${itemId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: 'Quick approved' }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve content');
      }

      toast.success('Success', {
        description: 'Content approved successfully',
      });

      fetchQueue();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Failed to approve content',
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

      if (!response.ok) {
        throw new Error('Failed to approve content');
      }

      toast.success('Success', {
        description: 'Content approved',
      });

      setReviewingItem(null);
      fetchQueue();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Failed to approve content',
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
      toast.success('Approved & scheduled', {
        description: `Content approved and scheduled for ${formatted}`,
      });
      setScheduleDialogItemId(null);
      setReviewingItem(null);
      fetchQueue();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Failed to approve and schedule',
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

      if (!response.ok) {
        throw new Error('Failed to reject content');
      }

      toast.success('Success', {
        description: 'Content rejected',
      });

      setReviewingItem(null);
      fetchQueue();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Failed to reject content',
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
        body: JSON.stringify({
          status: 'needs_revision',
          reviewNotes: notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to request revision');
      }

      toast.success('Success', {
        description: 'Revision requested',
      });

      setReviewingItem(null);
      fetchQueue();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Failed to request revision',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`/api/approval-queue/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      toast.success('Success', {
        description: 'Item deleted',
      });

      fetchQueue();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Failed to delete item',
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
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          notes: 'Bulk approved',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to bulk approve');
      }

      const result = await response.json();

      toast.success('Success', {
        description: `${result.approved} items approved successfully`,
      });

      fetchQueue();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Failed to bulk approve',
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

      toast.success('Success', {
        description: `${selectedIds.size} items rejected`,
      });

      fetchQueue();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Failed to bulk reject',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelection = (itemId: string, selected: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (selected) {
      newSelectedIds.add(itemId);
    } else {
      newSelectedIds.delete(itemId);
    }
    setSelectedIds(newSelectedIds);
  };

  const selectAll = () => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Group items by priority
  const urgentItems = items.filter((item) => item.priority === 'urgent');
  const highPriorityItems = items.filter((item) => item.priority === 'high');
  const standardItems = items.filter((item) => item.priority === 'medium' || item.priority === 'low');

  return (
    <>
      {!embedded && <Header currentPage="approval-queue" />}
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Content Approval Queue</h1>
            <p className="text-muted-foreground mt-1">Review and approve AI-generated content</p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={fetchQueue} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.totalPending}</div>
                  <div className="text-xs text-muted-foreground">Pending Review</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.avgConfidenceScore}%</div>
                  <div className="text-xs text-muted-foreground">Avg Confidence</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                  <Flame className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.urgentCount}</div>
                  <div className="text-xs text-muted-foreground">Urgent Items</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.highPriorityCount}</div>
                  <div className="text-xs text-muted-foreground">High Priority</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="needs_revision">Needs Revision</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Platform</label>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        <BulkActions
          selectedCount={selectedIds.size}
          totalCount={items.length}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
          isProcessing={isProcessing}
        />

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No items in queue</h3>
              <p className="text-muted-foreground">
                All content has been reviewed or there are no items matching your filters.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Urgent Items */}
        {!loading && urgentItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-600" />
              <h2 className="text-xl font-bold">URGENT REVIEW ({urgentItems.length} items)</h2>
            </div>
            <div className="space-y-3">
              {urgentItems.map((item, index) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  onReview={() => setReviewingItem(item)}
                  onQuickApprove={() => handleQuickApprove(item.id)}
                  onApproveAndSchedule={() => openScheduleDialog(item.id)}
                  onDelete={() => handleDelete(item.id)}
                  isSelected={selectedIds.has(item.id)}
                  onSelect={(selected) => toggleSelection(item.id, selected)}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}

        {/* High Priority Items */}
        {!loading && highPriorityItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-bold">HIGH PRIORITY ({highPriorityItems.length} items)</h2>
            </div>
            <div className="space-y-3">
              {highPriorityItems.map((item, index) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  onReview={() => setReviewingItem(item)}
                  onQuickApprove={() => handleQuickApprove(item.id)}
                  onApproveAndSchedule={() => openScheduleDialog(item.id)}
                  onDelete={() => handleDelete(item.id)}
                  isSelected={selectedIds.has(item.id)}
                  onSelect={(selected) => toggleSelection(item.id, selected)}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}

        {/* Standard Queue */}
        {!loading && standardItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold">STANDARD QUEUE ({standardItems.length} items)</h2>
            </div>
            <div className="space-y-3">
              {standardItems.map((item, index) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  onReview={() => setReviewingItem(item)}
                  onQuickApprove={() => handleQuickApprove(item.id)}
                  onApproveAndSchedule={() => openScheduleDialog(item.id)}
                  onDelete={() => handleDelete(item.id)}
                  isSelected={selectedIds.has(item.id)}
                  onSelect={(selected) => toggleSelection(item.id, selected)}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}

        {/* Review Modal */}
        {reviewingItem && (
          <ReviewModal
            isOpen={true}
            onClose={() => setReviewingItem(null)}
            item={reviewingItem}
            onApprove={(notes) => handleApprove(reviewingItem.id, notes)}
            onReject={(notes) => handleReject(reviewingItem.id, notes)}
            onRequestRevision={(notes) => handleRequestRevision(reviewingItem.id, notes)}
            isProcessing={isProcessing}
          />
        )}
      </div>

      {/* Approve & Schedule Dialog */}
      <Dialog
        open={scheduleDialogItemId !== null}
        onOpenChange={(open) => {
          if (!open) setScheduleDialogItemId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Approve &amp; Schedule
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Social account */}
            <div className="space-y-1.5">
              <Label htmlFor="aps-account">Social Account</Label>
              {activeAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No connected accounts found.</p>
              ) : (
                <Select value={scheduleConnectionId} onValueChange={setScheduleConnectionId}>
                  <SelectTrigger id="aps-account">
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.platform} — {acc.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="aps-date">Date</Label>
              <Input
                id="aps-date"
                type="date"
                value={scheduleDate}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>

            {/* Time */}
            <div className="space-y-1.5">
              <Label htmlFor="aps-time">Time ({scheduleTimezone})</Label>
              <Input id="aps-time" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setScheduleDialogItemId(null)} disabled={isScheduling}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveAndSchedule}
              disabled={isScheduling || !scheduleConnectionId || !scheduleDate}
              className="gap-2"
            >
              {isScheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
              {isScheduling ? 'Scheduling...' : 'Approve & Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
