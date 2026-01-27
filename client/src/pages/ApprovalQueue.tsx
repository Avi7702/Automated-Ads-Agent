import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { QueueCard } from "@/components/approval/QueueCard";
import { ReviewModal } from "@/components/approval/ReviewModal";
import { BulkActions } from "@/components/approval/BulkActions";
import { motion } from "framer-motion";
import {
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  BarChart3,
  TrendingUp,
  Flame,
  AlertCircle
} from "lucide-react";

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

export default function ApprovalQueue() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    totalPending: 0,
    avgConfidenceScore: 0,
    urgentCount: 0,
    highPriorityCount: 0
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
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch approval queue');
      }

      const data = await response.json();
      setItems(data.items || []);

      // Calculate stats
      const pending = data.items.filter((item: ApprovalQueueItem) => item.status === 'pending_review');
      const avgScore = pending.reduce((sum: number, item: ApprovalQueueItem) =>
        sum + (item.aiConfidenceScore || 0), 0) / (pending.length || 1);

      setStats({
        totalPending: pending.length,
        avgConfidenceScore: Math.round(avgScore),
        urgentCount: pending.filter((item: ApprovalQueueItem) => item.priority === 'urgent').length,
        highPriorityCount: pending.filter((item: ApprovalQueueItem) => item.priority === 'high').length
      });

      setSelectedIds(new Set());
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load approval queue",
        variant: "destructive"
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
        body: JSON.stringify({ notes: 'Quick approved' })
      });

      if (!response.ok) {
        throw new Error('Failed to approve content');
      }

      toast({
        title: "Success",
        description: "Content approved successfully",
        variant: "default"
      });

      fetchQueue();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve content",
        variant: "destructive"
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
        body: JSON.stringify({ notes })
      });

      if (!response.ok) {
        throw new Error('Failed to approve content');
      }

      toast({
        title: "Success",
        description: "Content approved and scheduled",
        variant: "default"
      });

      setReviewingItem(null);
      fetchQueue();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve content",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (itemId: string, notes?: string) => {
    try {
      setIsProcessing(true);

      const response = await fetch(`/api/approval-queue/${itemId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: notes || 'Rejected' })
      });

      if (!response.ok) {
        throw new Error('Failed to reject content');
      }

      toast({
        title: "Success",
        description: "Content rejected",
        variant: "default"
      });

      setReviewingItem(null);
      fetchQueue();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject content",
        variant: "destructive"
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
          reviewNotes: notes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to request revision');
      }

      toast({
        title: "Success",
        description: "Revision requested",
        variant: "default"
      });

      setReviewingItem(null);
      fetchQueue();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to request revision",
        variant: "destructive"
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
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      toast({
        title: "Success",
        description: "Item deleted",
        variant: "default"
      });

      fetchQueue();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive"
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
          notes: 'Bulk approved'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to bulk approve');
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: `${result.approved} items approved successfully`,
        variant: "default"
      });

      fetchQueue();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to bulk approve",
        variant: "destructive"
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

      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/approval-queue/${id}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason: 'Bulk rejected' })
        })
      );

      await Promise.all(promises);

      toast({
        title: "Success",
        description: `${selectedIds.size} items rejected`,
        variant: "default"
      });

      fetchQueue();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to bulk reject",
        variant: "destructive"
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
    setSelectedIds(new Set(items.map(item => item.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Group items by priority
  const urgentItems = items.filter(item => item.priority === 'urgent');
  const highPriorityItems = items.filter(item => item.priority === 'high');
  const standardItems = items.filter(item => item.priority === 'medium' || item.priority === 'low');

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Content Approval Queue</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve AI-generated content
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchQueue}
            variant="outline"
            size="sm"
            disabled={loading}
          >
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
          {[1, 2, 3].map(i => (
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
  );
}
