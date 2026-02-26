import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface QuotaStatusCardProps {
  title: string;
  current: number;
  limit: number;
  percentage: number;
  resetAt: Date;
  formatValue?: (value: number) => string;
}

export function QuotaStatusCard({
  title,
  current,
  limit,
  percentage,
  resetAt,
  formatValue = (v) => v.toLocaleString(),
}: QuotaStatusCardProps) {
  const statusColor = percentage >= 90 ? 'destructive' :
                     percentage >= 75 ? 'warning' :
                     'default';

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-bold">{formatValue(current)}</span>
          <span className="text-sm text-muted-foreground">/ {formatValue(limit)}</span>
        </div>
        <Progress
          value={Math.min(percentage, 100)}
          className={cn(
            "h-2",
            statusColor === 'destructive' && "[&>div]:bg-red-500",
            statusColor === 'warning' && "[&>div]:bg-yellow-500",
          )}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Resets {formatDistanceToNow(new Date(resetAt), { addSuffix: true })}
        </p>
      </CardContent>
    </Card>
  );
}
