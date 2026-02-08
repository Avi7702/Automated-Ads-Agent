// @ts-nocheck
/**
 * InspectorPanel — 4-tab right panel for the Studio workspace
 *
 * Tabs: Edit | Copy | Ask AI | Details
 * Each tab is a standalone component receiving the orchestrator state.
 * Designed to sit inside StudioLayout's right panel slot.
 */

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { Pencil, MessageCircle, Sparkles, Info } from "lucide-react";
import { EditTab } from "./tabs/EditTab";
import { CopyTab } from "./tabs/CopyTab";
import { AskAITab } from "./tabs/AskAITab";
import { DetailsTab } from "./tabs/DetailsTab";
import type { StudioOrchestrator } from "@/hooks/useStudioOrchestrator";

type InspectorTab = "edit" | "copy" | "ask-ai" | "details";

const TABS: { id: InspectorTab; label: string; icon: typeof Pencil }[] = [
  { id: "edit", label: "Edit", icon: Pencil },
  { id: "copy", label: "Copy", icon: MessageCircle },
  { id: "ask-ai", label: "Ask AI", icon: Sparkles },
  { id: "details", label: "Details", icon: Info },
];

interface InspectorPanelProps {
  orch: StudioOrchestrator;
  className?: string;
}

export const InspectorPanel = memo(function InspectorPanel({
  orch,
  className,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("edit");

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Tab bar */}
      <div className="flex border-b border-border bg-background/50 shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors relative",
              activeTab === id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{label}</span>
            {activeTab === id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "edit" && <EditTab orch={orch} />}
        {activeTab === "copy" && <CopyTab orch={orch} />}
        {activeTab === "ask-ai" && <AskAITab orch={orch} />}
        {activeTab === "details" && <DetailsTab orch={orch} />}
      </div>
    </div>
  );
});
