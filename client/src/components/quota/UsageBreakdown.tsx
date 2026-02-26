import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface UsageBreakdownProps {
  data: {
    byOperation: { generate: number; edit: number; analyze: number };
    byModel: Record<string, number>;
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
  };
  period: 'today' | 'week' | 'month';
  onPeriodChange: (period: 'today' | 'week' | 'month') => void;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

export function UsageBreakdown({ data, period, onPeriodChange }: UsageBreakdownProps) {
  const operationData = [
    { name: 'Generate', value: data.byOperation.generate },
    { name: 'Edit', value: data.byOperation.edit },
    { name: 'Analyze', value: data.byOperation.analyze },
  ].filter(d => d.value > 0);

  const modelData = Object.entries(data.byModel).map(([name, value]) => ({
    name: name.replace('gemini-', '').replace('-preview', ''),
    value,
  }));

  const chartData = operationData.length > 0 ? operationData : modelData;

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Usage Breakdown</CardTitle>
          <Select value={period} onValueChange={(v) => onPeriodChange(v as typeof period)}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No usage data yet
          </div>
        ) : (
          <div className="flex items-center">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-1/2 space-y-3 pl-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Total Requests</div>
                <div className="text-xl font-bold">{data.totalRequests.toLocaleString()}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Total Tokens</div>
                <div className="text-xl font-bold">
                  {data.totalTokens >= 1000000
                    ? `${(data.totalTokens / 1000000).toFixed(2)}M`
                    : data.totalTokens >= 1000
                    ? `${(data.totalTokens / 1000).toFixed(1)}K`
                    : data.totalTokens.toLocaleString()}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Total Cost</div>
                <div className="text-xl font-bold">${data.totalCost.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
