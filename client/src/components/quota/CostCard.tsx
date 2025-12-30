import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

interface CostCardProps {
  today: number;
  thisMonth: number;
  estimatedMonthly: number;
}

export function CostCard({ today, thisMonth, estimatedMonthly }: CostCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Cost
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-muted-foreground">Today</span>
            <span className="text-lg font-bold">${today.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-muted-foreground">This Month</span>
            <span className="text-sm font-medium">${thisMonth.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Est. Monthly</span>
              <span className="text-sm text-muted-foreground">${estimatedMonthly.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
