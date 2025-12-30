// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

interface GoogleSyncStatusData {
  isConfigured: boolean;
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
  syncIntervalMs: number;
  status: 'success' | 'partial' | 'failed' | 'never_synced';
  errorMessage?: string;
  lastSnapshot?: {
    quotas: Array<{
      metricName: string;
      displayName: string;
      usage: number;
      limit: number;
      percentage: number;
      unit: string;
    }>;
    projectId: string;
    service: string;
  };
}

interface SyncHistoryEntry {
  id: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  status: string;
  errorMessage: string | null;
  metricsRequested: number;
  metricsFetched: number;
  triggerType: string;
}

async function fetchGoogleSyncStatus(): Promise<GoogleSyncStatusData> {
  const res = await fetch('/api/quota/google/status');
  if (!res.ok) throw new Error('Failed to fetch Google sync status');
  return res.json();
}

async function fetchSyncHistory(): Promise<{ history: SyncHistoryEntry[] }> {
  const res = await fetch('/api/quota/google/history?limit=5');
  if (!res.ok) throw new Error('Failed to fetch sync history');
  return res.json();
}

async function triggerManualSync(): Promise<{ success: boolean; snapshot: any }> {
  const res = await fetch('/api/quota/google/sync', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger sync');
  return res.json();
}

const statusConfig = {
  success: { icon: CheckCircle2, color: 'bg-green-500/10 text-green-500 border-green-500/30', label: 'Synced' },
  partial: { icon: AlertTriangle, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30', label: 'Partial' },
  failed: { icon: XCircle, color: 'bg-red-500/10 text-red-500 border-red-500/30', label: 'Failed' },
  never_synced: { icon: Clock, color: 'bg-gray-500/10 text-gray-500 border-gray-500/30', label: 'Never Synced' },
};

export function GoogleSyncStatus() {
  const [showHistory, setShowHistory] = useState(false);
  const queryClient = useQueryClient();

  const { data: syncStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['google-sync-status'],
    queryFn: fetchGoogleSyncStatus,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['google-sync-history'],
    queryFn: fetchSyncHistory,
    enabled: showHistory,
  });

  const syncMutation = useMutation({
    mutationFn: triggerManualSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['google-sync-history'] });
      queryClient.invalidateQueries({ queryKey: ['quota-status'] });
    },
  });

  if (statusLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!syncStatus) return null;

  const StatusIcon = statusConfig[syncStatus.status].icon;
  const timeToNextSync = syncStatus.nextSyncAt
    ? Math.max(0, Math.round((new Date(syncStatus.nextSyncAt).getTime() - Date.now()) / 1000 / 60))
    : null;

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {syncStatus.isConfigured ? (
              <Cloud className="w-5 h-5 text-blue-500" />
            ) : (
              <CloudOff className="w-5 h-5 text-muted-foreground" />
            )}
            Google Cloud Sync
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("px-2 py-0.5", statusConfig[syncStatus.status].color)}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig[syncStatus.status].label}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!syncStatus.isConfigured ? (
          <Alert variant="default" className="bg-yellow-500/10 border-yellow-500/30">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle>Not Configured</AlertTitle>
            <AlertDescription className="text-sm">
              Google Cloud Monitoring is not configured. Set the following environment variables:
              <ul className="list-disc list-inside mt-2 text-xs">
                <li>GOOGLE_CLOUD_PROJECT - Your GCP project ID</li>
                <li>GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON</li>
                <li>Or GOOGLE_CLOUD_CREDENTIALS_JSON - Inline JSON credentials</li>
              </ul>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Sync Timing */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Last Synced</div>
                <div className="font-medium">
                  {syncStatus.lastSyncedAt
                    ? formatDistanceToNow(new Date(syncStatus.lastSyncedAt), { addSuffix: true })
                    : 'Never'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Next Sync</div>
                <div className="font-medium">
                  {timeToNextSync !== null
                    ? `in ${timeToNextSync} min`
                    : 'Not scheduled'}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {syncStatus.errorMessage && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {syncStatus.errorMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Google Quota Metrics */}
            {syncStatus.lastSnapshot?.quotas && syncStatus.lastSnapshot.quotas.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Google Cloud Metrics</div>
                {syncStatus.lastSnapshot.quotas.map((quota, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{quota.displayName}</span>
                    <span className="font-medium">
                      {quota.usage.toLocaleString()} / {quota.limit.toLocaleString()} {quota.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Manual Sync Button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          </>
        )}

        {/* Sync History */}
        {showHistory && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-xs text-muted-foreground font-medium">Sync History</div>
            {historyLoading ? (
              <div className="text-xs text-muted-foreground">Loading...</div>
            ) : historyData?.history && historyData.history.length > 0 ? (
              <div className="space-y-1">
                {historyData.history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1 py-0",
                          entry.status === 'success' ? 'bg-green-500/10 text-green-500' :
                          entry.status === 'partial' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-red-500/10 text-red-500'
                        )}
                      >
                        {entry.status}
                      </Badge>
                      <span className="text-muted-foreground">
                        {format(new Date(entry.startedAt), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {entry.metricsFetched}/{entry.metricsRequested} metrics
                      {entry.durationMs && ` • ${entry.durationMs}ms`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No sync history yet</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
