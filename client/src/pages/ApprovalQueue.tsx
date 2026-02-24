/**
 * ApprovalQueue — Content approval queue page.
 *
 * Business logic extracted to useApprovalQueue hook.
 * Sub-components QueueCard, ReviewModal, BulkActions already existed.
 */
import { Header } from '@/components/layout/Header';
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
import { useApprovalQueue } from '@/hooks/useApprovalQueue';

interface ApprovalQueueProps {
  embedded?: boolean;
}

export default function ApprovalQueue({ embedded = false }: ApprovalQueueProps) {
  const q = useApprovalQueue();

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
            <Button onClick={q.fetchQueue} variant="outline" size="sm" disabled={q.loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${q.loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Clock} color="blue" value={q.stats.totalPending} label="Pending Review" />
          <StatCard icon={TrendingUp} color="green" value={`${q.stats.avgConfidenceScore}%`} label="Avg Confidence" />
          <StatCard icon={Flame} color="red" value={q.stats.urgentCount} label="Urgent Items" />
          <StatCard icon={AlertCircle} color="orange" value={q.stats.highPriorityCount} label="High Priority" />
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
              <FilterSelect
                label="Status"
                value={q.statusFilter}
                onChange={q.setStatusFilter}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'pending_review', label: 'Pending Review' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'needs_revision', label: 'Needs Revision' },
                  { value: 'scheduled', label: 'Scheduled' },
                ]}
              />
              <FilterSelect
                label="Priority"
                value={q.priorityFilter}
                onChange={q.setPriorityFilter}
                options={[
                  { value: 'all', label: 'All Priorities' },
                  { value: 'urgent', label: 'Urgent' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
              />
              <FilterSelect
                label="Platform"
                value={q.platformFilter}
                onChange={q.setPlatformFilter}
                options={[
                  { value: 'all', label: 'All Platforms' },
                  { value: 'linkedin', label: 'LinkedIn' },
                  { value: 'instagram', label: 'Instagram' },
                  { value: 'facebook', label: 'Facebook' },
                  { value: 'twitter', label: 'Twitter' },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        <BulkActions
          selectedCount={q.selectedIds.size}
          totalCount={q.items.length}
          onSelectAll={q.selectAll}
          onDeselectAll={q.deselectAll}
          onBulkApprove={q.handleBulkApprove}
          onBulkReject={q.handleBulkReject}
          isProcessing={q.isProcessing}
        />

        {/* Loading State */}
        {q.loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!q.loading && q.items.length === 0 && (
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

        {/* Priority Groups */}
        <QueueSection icon={Flame} iconColor="text-red-600" title="URGENT REVIEW" items={q.urgentItems} queue={q} />
        <QueueSection
          icon={AlertCircle}
          iconColor="text-orange-600"
          title="HIGH PRIORITY"
          items={q.highPriorityItems}
          queue={q}
        />
        <QueueSection
          icon={BarChart3}
          iconColor="text-blue-600"
          title="STANDARD QUEUE"
          items={q.standardItems}
          queue={q}
        />

        {/* Review Modal */}
        {q.reviewingItem && (
          <ReviewModal
            isOpen={true}
            onClose={() => q.setReviewingItem(null)}
            item={q.reviewingItem}
            onApprove={(notes) => q.handleApprove(q.reviewingItem!.id, notes)}
            onReject={(notes) => q.handleReject(q.reviewingItem!.id, notes)}
            onRequestRevision={(notes) => q.handleRequestRevision(q.reviewingItem!.id, notes)}
            isProcessing={q.isProcessing}
          />
        )}
      </div>

      {/* Approve & Schedule Dialog */}
      <Dialog
        open={q.scheduleDialogItemId !== null}
        onOpenChange={(open) => {
          if (!open) q.setScheduleDialogItemId(null);
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
            <div className="space-y-1.5">
              <Label htmlFor="aps-account">Social Account</Label>
              {q.activeAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No connected accounts found.</p>
              ) : (
                <Select value={q.scheduleConnectionId} onValueChange={q.setScheduleConnectionId}>
                  <SelectTrigger id="aps-account">
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {q.activeAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.platform} — {acc.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aps-date">Date</Label>
              <Input
                id="aps-date"
                type="date"
                value={q.scheduleDate}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => q.setScheduleDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aps-time">Time ({q.scheduleTimezone})</Label>
              <Input
                id="aps-time"
                type="time"
                value={q.scheduleTime}
                onChange={(e) => q.setScheduleTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => q.setScheduleDialogItemId(null)} disabled={q.isScheduling}>
              Cancel
            </Button>
            <Button
              onClick={q.handleApproveAndSchedule}
              disabled={q.isScheduling || !q.scheduleConnectionId || !q.scheduleDate}
              className="gap-2"
            >
              {q.isScheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
              {q.isScheduling ? 'Scheduling...' : 'Approve & Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────

function StatCard({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: React.ElementType;
  color: string;
  value: string | number;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/20`}>
            <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
          </div>
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function QueueSection({
  icon: Icon,
  iconColor,
  title,
  items,
  queue,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  items: ReturnType<typeof useApprovalQueue>['items'];
  queue: ReturnType<typeof useApprovalQueue>;
}) {
  if (queue.loading || items.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <h2 className="text-xl font-bold">
          {title} ({items.length} items)
        </h2>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <QueueCard
            key={item.id}
            item={item}
            onReview={() => queue.setReviewingItem(item)}
            onQuickApprove={() => queue.handleQuickApprove(item.id)}
            onApproveAndSchedule={() => queue.openScheduleDialog(item.id)}
            onDelete={() => queue.handleDelete(item.id)}
            isSelected={queue.selectedIds.has(item.id)}
            onSelect={(selected) => queue.toggleSelection(item.id, selected)}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
