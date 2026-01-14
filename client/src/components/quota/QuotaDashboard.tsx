// @ts-nocheck
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuotaDashboardContent } from "./QuotaDashboardContent";
import { SystemHealthTab } from "../monitoring/SystemHealthTab";
import { PerformanceTab } from "../monitoring/PerformanceTab";
import { ErrorTrackingTab } from "../monitoring/ErrorTrackingTab";
import { Activity, Server, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuotaDashboard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Monitoring Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor API usage, system health, performance metrics, and errors
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="quota" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="quota" className="gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">API Quota</span>
            <span className="sm:hidden">Quota</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <Server className="w-4 h-4" />
            <span className="hidden sm:inline">System Health</span>
            <span className="sm:hidden">Health</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Performance</span>
            <span className="sm:hidden">Perf</span>
          </TabsTrigger>
          <TabsTrigger value="errors" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Errors</span>
            <span className="sm:hidden">Errors</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quota" className="space-y-4">
          <QuotaDashboardContent />
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <SystemHealthTab />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceTab />
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <ErrorTrackingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
