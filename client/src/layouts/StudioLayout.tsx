import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, ChevronDown, ChevronUp } from "lucide-react";
import { usePanelCollapse } from "@/hooks/usePanelCollapse";

interface StudioLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
  bottomBar?: ReactNode;
}

/**
 * 3-panel + bottom bar layout for the Studio workspace.
 * CSS Grid with collapsible left/right panels and bottom bar.
 * Responsive: 3 panels on desktop, single panel on mobile.
 */
export function StudioLayout({ leftPanel, centerPanel, rightPanel, bottomBar }: StudioLayoutProps) {
  const { panels, togglePanel } = usePanelCollapse();

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] overflow-hidden">
      {/* Main 3-panel grid */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel */}
        <div
          className={cn(
            "hidden md:flex flex-col border-r border-border bg-background transition-all duration-200",
            panels.left ? "w-12" : "w-80"
          )}
        >
          <div className="flex items-center justify-between p-2 border-b border-border">
            {!panels.left && (
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
                Assets
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 ml-auto"
              onClick={() => togglePanel("left")}
              aria-label={panels.left ? "Expand left panel" : "Collapse left panel"}
            >
              {panels.left ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
          {!panels.left && (
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {leftPanel}
            </div>
          )}
        </div>

        {/* Center Panel — always visible */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {centerPanel}
        </div>

        {/* Right Panel */}
        <div
          className={cn(
            "hidden lg:flex flex-col border-l border-border bg-background transition-all duration-200",
            panels.right ? "w-0 border-l-0" : "w-96"
          )}
        >
          {!panels.right && (
            <>
              <div className="flex items-center justify-between p-2 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
                  Inspector
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => togglePanel("right")}
                  aria-label="Collapse right panel"
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {rightPanel}
              </div>
            </>
          )}
          {panels.right && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 m-1"
              onClick={() => togglePanel("right")}
              aria-label="Expand right panel"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      {bottomBar && (
        <div
          className={cn(
            "border-t border-border bg-background/95 backdrop-blur-sm transition-all duration-200",
            panels.bottom ? "h-10" : "h-28"
          )}
        >
          <div className="flex items-center justify-between px-3 h-8">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Idea Bank
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => togglePanel("bottom")}
              aria-label={panels.bottom ? "Expand bottom bar" : "Collapse bottom bar"}
            >
              {panels.bottom ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
          {!panels.bottom && (
            <div className="px-3 pb-2 overflow-x-auto">
              {bottomBar}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
