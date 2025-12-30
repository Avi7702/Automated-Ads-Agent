// @ts-nocheck
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface UsageChartProps {
  data: Array<{
    timestamp: string;
    requests: number;
    tokens: number;
    cost: number;
    successRate: number;
  }>;
  windowType: 'minute' | 'hour' | 'day';
  onWindowChange: (type: 'minute' | 'hour' | 'day') => void;
}

type MetricType = 'requests' | 'tokens' | 'cost';

const metricConfig: Record<MetricType, { label: string; color: string; format: (v: number) => string }> = {
  requests: { label: "Requests", color: "#8b5cf6", format: (v) => v.toString() },
  tokens: { label: "Tokens", color: "#06b6d4", format: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toString() },
  cost: { label: "Cost (USD)", color: "#22c55e", format: (v) => `$${v.toFixed(4)}` },
};

export function UsageChart({ data, windowType, onWindowChange }: UsageChartProps) {
  const [metric, setMetric] = useState<MetricType>('requests');

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    switch (windowType) {
      case 'minute':
        return format(date, 'HH:mm');
      case 'hour':
        return format(date, 'HH:00');
      case 'day':
        return format(date, 'MMM d');
    }
  };

  const config = metricConfig[metric];

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Usage Over Time</CardTitle>
          <div className="flex gap-2">
            <Select value={windowType} onValueChange={(v) => onWindowChange(v as typeof windowType)}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minute">Minute</SelectItem>
                <SelectItem value="hour">Hour</SelectItem>
                <SelectItem value="day">Day</SelectItem>
              </SelectContent>
            </Select>
            <Select value={metric} onValueChange={(v) => setMetric(v as MetricType)}>
              <SelectTrigger className="w-28 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requests">Requests</SelectItem>
                <SelectItem value="tokens">Tokens</SelectItem>
                <SelectItem value="cost">Cost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No usage data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={[...data].reverse()}>
              <defs>
                <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={config.color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTimestamp}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tickFormatter={config.format}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(label) => formatTimestamp(label as string)}
                formatter={(value: number) => [config.format(value), config.label]}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={config.color}
                fill={`url(#gradient-${metric})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
