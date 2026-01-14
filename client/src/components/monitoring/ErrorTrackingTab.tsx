import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorEvent {
  id: string;
  timestamp: string;
  statusCode: number;
  message: string;
  endpoint: string;
  method: string;
  userAgent?: string;
  stack?: string;
  fingerprint: string;
}

interface ErrorStats {
  total: number;
  last5min: number;
  last1hour: number;
  byStatusCode: Record<string, number>;
  byEndpoint: Record<string, number>;
  byFingerprint: Record<string, number>;
}

interface ErrorsResponse {
  errors: ErrorEvent[];
  stats: ErrorStats;
}

async function fetchErrors(): Promise<ErrorsResponse> {
  const res = await fetch('/api/monitoring/errors');
  if (!res.ok) throw new Error('Failed to fetch errors');
  return res.json();
}

export function ErrorTrackingTab() {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['error-tracking'],
    queryFn: fetchErrors,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const toggleExpanded = (id: string) => {
    setExpandedErrors(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const { errors, stats } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last 5 Minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.last5min}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.last1hour}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.byFingerprint).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      {errors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mb-4 text-green-500" />
            <p className="text-lg font-medium">No Errors!</p>
            <p className="text-sm">Your application is running smoothly.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Recent Errors ({errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {errors.map((error) => {
              const isExpanded = expandedErrors.has(error.id);
              return (
                <div key={error.id} className="border rounded-lg p-4 hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500">
                          {error.statusCode}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {error.method}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(error.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium break-words">{error.message}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1 break-words">{error.endpoint}</p>
                    </div>
                    {error.stack && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(error.id)}
                        className="flex-shrink-0"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                  {isExpanded && error.stack && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Stack Trace:</p>
                      <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
