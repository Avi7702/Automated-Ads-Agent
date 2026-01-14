import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface EndpointMetric {
  endpoint: string;
  method: string;
  requests: number;
  errors: number;
  errorRate: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  lastReset: string;
}

async function fetchPerformanceMetrics(): Promise<EndpointMetric[]> {
  const res = await fetch('/api/monitoring/performance');
  if (!res.ok) throw new Error('Failed to fetch performance metrics');
  return res.json();
}

export function PerformanceTab() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: fetchPerformanceMetrics,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (!metrics || metrics.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          No performance data yet. Metrics will appear after API requests are made.
        </CardContent>
      </Card>
    );
  }

  // Take top 20 endpoints by request count
  const topMetrics = metrics.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.reduce((sum, m) => sum + m.requests, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(metrics.reduce((sum, m) => sum + m.avgLatency, 0) / metrics.length)}ms
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Endpoints Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Top Endpoints by Request Count
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Endpoint</th>
                  <th className="text-left py-2 px-2 font-medium">Method</th>
                  <th className="text-right py-2 px-2 font-medium">Requests</th>
                  <th className="text-right py-2 px-2 font-medium">Error Rate</th>
                  <th className="text-right py-2 px-2 font-medium">Avg Latency</th>
                  <th className="text-right py-2 px-2 font-medium">Max Latency</th>
                </tr>
              </thead>
              <tbody>
                {topMetrics.map((metric, i) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 font-mono text-xs">{metric.endpoint}</td>
                    <td className="py-2 px-2">
                      <Badge variant="outline" className="text-xs">
                        {metric.method}
                      </Badge>
                    </td>
                    <td className="text-right py-2 px-2">{metric.requests.toLocaleString()}</td>
                    <td className="text-right py-2 px-2">
                      <span className={cn(
                        "font-medium",
                        metric.errorRate > 5 ? "text-red-600 dark:text-red-400" : metric.errorRate > 1 ? "text-yellow-700 dark:text-yellow-400" : "text-green-600 dark:text-green-400"
                      )}>
                        {metric.errorRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right py-2 px-2">
                      <span className={cn(
                        "font-medium",
                        metric.avgLatency > 1000 ? "text-red-600 dark:text-red-400" : metric.avgLatency > 500 ? "text-yellow-700 dark:text-yellow-400" : "text-green-600 dark:text-green-400"
                      )}>
                        {Math.round(metric.avgLatency)}ms
                      </span>
                    </td>
                    <td className="text-right py-2 px-2 text-muted-foreground">
                      {Math.round(metric.maxLatency)}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
