import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Wifi, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      totalConnections: number;
      idleConnections: number;
      activeConnections: number;
      waitingClients: number;
      maxConnections: number;
      averageQueryTime?: number;
    };
    redis?: {
      status: 'healthy' | 'unhealthy';
      connected: boolean;
      latency?: number;
    };
  };
}

async function fetchSystemHealth(): Promise<SystemHealth> {
  const res = await fetch('/api/monitoring/health');
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

const statusConfig = {
  healthy: { icon: CheckCircle2, color: 'bg-green-500/10 text-green-500 border-green-500/50', label: 'Healthy' },
  degraded: { icon: AlertTriangle, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50', label: 'Degraded' },
  unhealthy: { icon: XCircle, color: 'bg-red-500/10 text-red-500 border-red-500/50', label: 'Unhealthy' },
};

export function SystemHealthTab() {
  const { data: health, isLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: fetchSystemHealth,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (!health) return null;

  const OverallIcon = statusConfig[health.overall].icon;

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card className={cn("border-2", statusConfig[health.overall].color)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <OverallIcon className="w-5 h-5" />
              Overall System Health
            </CardTitle>
            <Badge variant="outline" className={cn("px-3 py-1", statusConfig[health.overall].color)}>
              {statusConfig[health.overall].label}
            </Badge>
          </div>
          <CardDescription>
            Last checked: {new Date(health.timestamp).toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Database */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="w-4 h-4" />
              Database (PostgreSQL)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="outline" className={cn("text-xs", statusConfig[health.services.database.status].color)}>
                {statusConfig[health.services.database.status].label}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Connections</span>
                <span className="font-medium">{health.services.database.activeConnections} / {health.services.database.maxConnections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Idle Connections</span>
                <span className="font-medium">{health.services.database.idleConnections}</span>
              </div>
              {health.services.database.averageQueryTime !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Query Time</span>
                  <span className="font-medium">{health.services.database.averageQueryTime}ms</span>
                </div>
              )}
              {health.services.database.waitingClients > 0 && (
                <div className="flex justify-between text-yellow-500">
                  <span>Waiting Clients</span>
                  <span className="font-medium">{health.services.database.waitingClients}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Redis */}
        {health.services.redis ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wifi className="w-4 h-4" />
                Redis (Session Store)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="outline" className={cn("text-xs", health.services.redis.connected ? statusConfig.healthy.color : statusConfig.unhealthy.color)}>
                  {health.services.redis.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              {health.services.redis.latency !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Latency</span>
                  <span className="font-medium">{health.services.redis.latency}ms</span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wifi className="w-4 h-4" />
                Redis (Session Store)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-500">
                Not Configured
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
