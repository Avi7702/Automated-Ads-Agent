import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QuotaStatusCard } from "./QuotaStatusCard";
import { CostCard } from "./CostCard";
import { RateLimitCountdown } from "./RateLimitCountdown";
import { UsageChart } from "./UsageChart";
import { UsageBreakdown } from "./UsageBreakdown";
import { GoogleSyncStatus } from "./GoogleSyncStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, AlertCircle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuotaStatus {
  rpm: { current: number; limit: number; percentage: number; resetAt: string };
  rpd: { current: number; limit: number; percentage: number; resetAt: string };
  tokens: { current: number; limit: number; percentage: number; resetAt: string };
  cost: { today: number; thisMonth: number; estimatedMonthly: number };
  status: 'healthy' | 'warning' | 'critical' | 'rate_limited';
  warnings: string[];
  retryAfter?: number;
}

interface UsageHistory {
  history: Array<{
    timestamp: string;
    requests: number;
    tokens: number;
    cost: number;
    successRate: number;
  }>;
}

interface UsageBreakdownData {
  byOperation: { generate: number; edit: number; analyze: number };
  byModel: Record<string, number>;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
}

async function fetchQuotaStatus(): Promise<QuotaStatus> {
  const res = await fetch('/api/quota/status');
  if (!res.ok) throw new Error('Failed to fetch quota status');
  return res.json();
}

async function fetchHistory(windowType: string): Promise<UsageHistory> {
  const res = await fetch(`/api/quota/history?windowType=${windowType}`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

async function fetchBreakdown(period: string): Promise<UsageBreakdownData> {
  const res = await fetch(`/api/quota/breakdown?period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch breakdown');
  return res.json();
}

const statusConfig = {
  healthy: { icon: CheckCircle2, color: 'bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400', label: 'Healthy' },
  warning: { icon: AlertTriangle, color: 'bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400', label: 'Warning' },
  critical: { icon: AlertCircle, color: 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400', label: 'Critical' },
  rate_limited: { icon: AlertTriangle, color: 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400', label: 'Rate Limited' },
};

export function QuotaDashboardContent({ className }: { className?: string }) {
  const [windowType, setWindowType] = useState<'minute' | 'hour' | 'day'>('hour');
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  const { data: quotaStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['quota-status'],
    queryFn: fetchQuotaStatus,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: history } = useQuery({
    queryKey: ['quota-history', windowType],
    queryFn: () => fetchHistory(windowType),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: breakdown } = useQuery({
    queryKey: ['quota-breakdown', period],
    queryFn: () => fetchBreakdown(period),
    refetchInterval: 60000, // Refresh every minute
  });

  if (statusLoading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <Activity className="w-8 h-8 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  const StatusIcon = quotaStatus ? statusConfig[quotaStatus.status].icon : Activity;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">API Quota</h2>
          <p className="text-muted-foreground">Monitor your Gemini API quota and usage</p>
        </div>
        {quotaStatus && (
          <Badge
            variant="outline"
            className={cn("px-3 py-1", statusConfig[quotaStatus.status].color)}
          >
            <StatusIcon className="w-4 h-4 mr-2" />
            {statusConfig[quotaStatus.status].label}
          </Badge>
        )}
      </div>

      {/* Rate Limit Banner */}
      {quotaStatus?.status === 'rate_limited' && quotaStatus.retryAfter && (
        <RateLimitCountdown
          retryAfter={quotaStatus.retryAfter}
          onComplete={() => refetchStatus()}
        />
      )}

      {/* Warnings */}
      {quotaStatus?.warnings && quotaStatus.warnings.length > 0 && (
        <Alert variant="default" className="bg-yellow-500/10 dark:bg-yellow-500/20 border-yellow-500/30 dark:border-yellow-500/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription>
            {quotaStatus.warnings.map((warning, i) => (
              <span key={i} className="block">{warning}</span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Status Cards Grid */}
      {quotaStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuotaStatusCard
            title="Requests / Minute"
            current={quotaStatus.rpm.current}
            limit={quotaStatus.rpm.limit}
            percentage={quotaStatus.rpm.percentage}
            resetAt={new Date(quotaStatus.rpm.resetAt)}
          />
          <QuotaStatusCard
            title="Requests / Day"
            current={quotaStatus.rpd.current}
            limit={quotaStatus.rpd.limit}
            percentage={quotaStatus.rpd.percentage}
            resetAt={new Date(quotaStatus.rpd.resetAt)}
          />
          <QuotaStatusCard
            title="Tokens / Day"
            current={quotaStatus.tokens.current}
            limit={quotaStatus.tokens.limit}
            percentage={quotaStatus.tokens.percentage}
            resetAt={new Date(quotaStatus.tokens.resetAt)}
            formatValue={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()}
          />
          <CostCard
            today={quotaStatus.cost.today}
            thisMonth={quotaStatus.cost.thisMonth}
            estimatedMonthly={quotaStatus.cost.estimatedMonthly}
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UsageChart
          data={history?.history || []}
          windowType={windowType}
          onWindowChange={setWindowType}
        />
        {breakdown && (
          <UsageBreakdown
            data={breakdown}
            period={period}
            onPeriodChange={setPeriod}
          />
        )}
      </div>

      {/* Google Cloud Sync Status */}
      <div className="pt-4 border-t">
        <h3 className="text-lg font-semibold mb-4">Data Sources</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Local Tracking Info */}
          <div className="bg-card/50 backdrop-blur rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium">Local Tracking</span>
              <Badge variant="outline" className="ml-auto text-xs bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400">
                Real-time
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Tracks all API calls made through this application. Updates instantly.
              The quota cards above show data from local tracking.
            </p>
          </div>

          {/* Google Cloud Sync */}
          <GoogleSyncStatus />
        </div>
      </div>
    </div>
  );
}
